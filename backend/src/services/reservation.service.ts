import prisma from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { v4 as uuid } from 'uuid';
import { generateQrToken, verifyQrToken } from '../utils/jwt';
import { matchingService } from './matching.service';
import { emitToUser, emitToRole, emitToTrip } from './socket.service';

export class ReservationService {
  private generateCode() {
    return 'SHR-' + uuid().slice(0, 8).toUpperCase();
  }

  generateQrToken(reservation: { id: string; reservationCode: string; eventId: string; participantId: string; date: Date }) {
    const payload = {
      sub: reservation.id,
      code: reservation.reservationCode,
      eventId: reservation.eventId,
      participantId: reservation.participantId,
      date: reservation.date.toISOString(),
      iat: Math.floor(Date.now() / 1000),
    };
    return generateQrToken(payload);
  }

  validateQrToken(token: string) {
    return verifyQrToken(token);
  }

  async validateScan(token: string, scanData?: { lat?: number; lng?: number; device?: string; driverId?: string; tripId?: string }) {
    const validation = this.validateQrToken(token);
    if (!validation.valid) return { status: validation.status, message: validation.status === 'EXPIRED' ? 'QR code has expired' : 'Invalid QR code' };

    const reservation = await prisma.reservation.findUnique({
      where: { id: validation.payload.sub },
      include: { event: true, trip: true },
    });
    if (!reservation) return { status: 'INVALID', message: 'Reservation not found' };

    if (reservation.status === 'CHECKED_IN' || reservation.status === 'COMPLETED') {
      return { status: 'ALREADY_USED', message: `Reservation already ${reservation.status.toLowerCase()}`, reservation };
    }

    if (reservation.status === 'CANCELLED' || reservation.status === 'REJECTED') {
      return { status: 'INVALID', message: `Reservation was ${reservation.status.toLowerCase()}`, reservation };
    }

    if (reservation.status !== 'CONFIRMED') {
      return { status: 'INVALID', message: 'Reservation is not yet confirmed. Please wait for admin approval.', reservation };
    }

    await prisma.reservation.update({ where: { id: reservation.id }, data: { status: 'CHECKED_IN' } });
    await this.logStatusChange(reservation.id, reservation.status, 'CHECKED_IN', validation.payload.participantId);

    const trip = reservation.tripId ? await prisma.trip.findUnique({
      where: { id: reservation.tripId },
      include: { vehicle: true, _count: { select: { reservations: true } } },
    }) : null;

    const checkedInCount = reservation.tripId ? await prisma.reservation.count({
      where: { tripId: reservation.tripId, status: 'CHECKED_IN' },
    }) : 0;

    const confirmedCount = reservation.tripId ? await prisma.reservation.count({
      where: { tripId: reservation.tripId, status: 'CONFIRMED' },
    }) : 0;

    emitToRole('SUPER_ADMIN', 'boarding-update', {
      tripId: reservation.tripId,
      reservationId: reservation.id,
      status: 'CHECKED_IN',
      checkedIn: checkedInCount,
      confirmed: confirmedCount + checkedInCount,
      remaining: trip ? (trip.vehicle?.capacity || 0) - checkedInCount : 0,
    });

    if (reservation.tripId) {
      emitToTrip(reservation.tripId, 'boarding-update', {
        reservationId: reservation.id,
        status: 'CHECKED_IN',
        checkedIn: checkedInCount,
        confirmed: confirmedCount + checkedInCount,
        remaining: trip ? (trip.vehicle?.capacity || 0) - checkedInCount : 0,
      });
    }

    await prisma.activityLog.create({
      data: {
        action: 'QR_SCANNED',
        entity: 'Reservation',
        entityId: reservation.id,
        details: JSON.stringify({ code: reservation.reservationCode, ...scanData }),
        userId: validation.payload.participantId,
      },
    });

    return {
      status: 'VALID',
      message: 'Check-in successful',
      reservation: {
        id: reservation.id,
        code: reservation.reservationCode,
        participant: reservation.participantId,
        event: reservation.event?.name,
        trip: reservation.tripId,
      },
    };
  }

  async findAll(params: { page?: number; limit?: number; status?: string; eventId?: string; participantId?: string; tripId?: string; search?: string }) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.status) where.status = params.status;
    if (params.eventId) where.eventId = params.eventId;
    if (params.participantId) where.participantId = params.participantId;
    if (params.tripId) where.tripId = params.tripId;
    if (params.search) {
      where.OR = [
        { reservationCode: { contains: params.search, mode: 'insensitive' } },
        { participant: { firstName: { contains: params.search, mode: 'insensitive' } } },
        { participant: { lastName: { contains: params.search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.reservation.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          participant: { select: { id: true, firstName: true, lastName: true, email: true } },
          event: { select: { id: true, name: true, date: true } },
          pickupPoint: { select: { id: true, name: true } },
          optimizedPickup: { select: { id: true, name: true, latitude: true, longitude: true } },
          trip: { select: { id: true, departureTime: true, status: true } },
        },
      }),
      prisma.reservation.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string, user?: { userId: string; role: string }) {
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: {
        participant: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        event: true,
        pickupPoint: true,
        optimizedPickup: true,
        trip: { include: { driver: { include: { user: true } }, vehicle: true, route: true } },
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!reservation) throw new AppError('Reservation not found', 404);

    if (user) {
      if (user.role === 'SUPER_ADMIN') {
        // Full administrative access
      } else if (user.role === 'ORGANIZER') {
        if (reservation.event?.createdById !== user.userId) {
          throw new AppError('Access denied', 403);
        }
      } else if (user.role === 'DRIVER') {
        if (reservation.trip?.driver?.userId !== user.userId) {
          throw new AppError('Access denied', 403);
        }
      } else if (user.role === 'EMPLOYEE') {
        if (reservation.participantId !== user.userId) {
          throw new AppError('Access denied', 403);
        }
      } else {
        throw new AppError('Access denied', 403);
      }
    }

    return reservation;
  }

  async create(data: {
    participantId: string;
    eventId: string;
    pickupPointId?: string;
    date: Date;
    time: Date;
    routeId?: string;
    notes?: string;
    passengerCount?: number;
    contactPhone?: string;
    pickupLatitude?: number;
    pickupLongitude?: number;
    pickupAddress?: string;
    pickupTime?: Date;
    skipMatching?: boolean;
  }) {
    const event = await prisma.event.findUnique({ where: { id: data.eventId } });
    if (!event) throw new AppError('Event not found', 404);
    if (event.status === 'CANCELLED') throw new AppError('Event is cancelled', 400);

    if (event.status === 'DRAFT') throw new AppError('Event is not published yet', 400);

    const existingCount = await prisma.reservation.count({
      where: { eventId: data.eventId, participantId: data.participantId, status: { notIn: ['CANCELLED', 'REJECTED', 'NO_SHOW'] } },
    });
    if (existingCount > 0) throw new AppError('You already have an active reservation for this event', 409);

    const passengerCount = data.passengerCount || 1;

    const code = this.generateCode();

    let reservation;
    try {
      reservation = await prisma.reservation.create({
        data: {
          participantId: data.participantId,
          eventId: data.eventId,
          pickupPointId: data.pickupPointId,
          routeId: data.routeId,
          date: data.date,
          time: data.time,
          notes: data.notes,
          passengerCount,
          contactPhone: data.contactPhone,
          pickupLatitude: data.pickupLatitude,
          pickupLongitude: data.pickupLongitude,
          pickupAddress: data.pickupAddress,
          pickupTime: data.pickupTime || data.time,
          reservationCode: code,
          qrCode: '',
          status: 'PENDING',
        },
        include: {
          participant: { select: { id: true, firstName: true, lastName: true, email: true } },
          event: { select: { id: true, name: true, date: true } },
        },
      });
    } catch (err: any) {
      if (err.code === 'P2002') {
        throw new AppError('You already have an active reservation for this event', 409);
      }
      throw err;
    }

    const qrToken = this.generateQrToken(reservation);
    const reservationWithQr = await prisma.reservation.update({
      where: { id: reservation.id },
      data: { qrCode: qrToken },
      include: {
        participant: { select: { id: true, firstName: true, lastName: true, email: true } },
        event: { select: { id: true, name: true, date: true } },
      },
    });

    await this.logStatusChange(reservation.id, 'NONE', 'PENDING', data.participantId);

    await prisma.notification.create({
      data: {
        type: 'RESERVATION_CONFIRMATION',
        title: 'Reservation Submitted',
        message: `Your reservation for ${event.name} has been submitted and is pending approval. Code: ${code}`,
        userId: data.participantId,
      },
    });

    if (!data.skipMatching && data.pickupLatitude && data.pickupLongitude) {
      const matches = await matchingService.findMatches({
        eventId: data.eventId,
        pickupLatitude: data.pickupLatitude,
        pickupLongitude: data.pickupLongitude,
        pickupTime: data.pickupTime || data.time,
        passengerCount,
        excludeReservationId: reservation.id,
      });

      if (matches.length > 0) {
        emitToUser(data.participantId, 'matching-suggestions', {
          reservationId: reservation.id,
          matches: matches.slice(0, 3),
        });
      }
    }

    return reservationWithQr;
  }

  async approve(id: string, adminUserId: string) {
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: { event: true },
    });
    if (!reservation) throw new AppError('Reservation not found', 404);
    if (reservation.status !== 'PENDING') throw new AppError('Only pending reservations can be approved', 400);

    const qrToken = this.generateQrToken(reservation);

    const updated = await prisma.reservation.update({
      where: { id },
      data: { status: 'CONFIRMED', qrCode: qrToken },
    });

    await this.logStatusChange(id, reservation.status, 'CONFIRMED', adminUserId);

    await prisma.notification.create({
      data: {
        type: 'RESERVATION_CONFIRMATION',
        title: 'Reservation Approved',
        message: `Your reservation for ${reservation.event?.name || 'event'} has been approved. Your QR code is now available. Code: ${reservation.reservationCode}`,
        userId: reservation.participantId,
      },
    });

    await prisma.activityLog.create({
      data: {
        action: 'RESERVATION_APPROVED',
        entity: 'Reservation',
        entityId: id,
        details: JSON.stringify({ code: reservation.reservationCode, eventId: reservation.eventId }),
        userId: adminUserId,
      },
    });

    return updated;
  }

  async reject(id: string, adminUserId: string) {
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: { event: true },
    });
    if (!reservation) throw new AppError('Reservation not found', 404);
    if (reservation.status !== 'PENDING') throw new AppError('Only pending reservations can be rejected', 400);

    const updated = await prisma.reservation.update({
      where: { id },
      data: { status: 'REJECTED' },
    });

    await this.logStatusChange(id, reservation.status, 'REJECTED', adminUserId);

    await prisma.notification.create({
      data: {
        type: 'TRIP_CANCELLED',
        title: 'Reservation Rejected',
        message: `Your reservation for ${reservation.event?.name || 'event'} has been rejected. Code: ${reservation.reservationCode}`,
        userId: reservation.participantId,
      },
    });

    await prisma.activityLog.create({
      data: {
        action: 'RESERVATION_REJECTED',
        entity: 'Reservation',
        entityId: id,
        details: JSON.stringify({ code: reservation.reservationCode, eventId: reservation.eventId }),
        userId: adminUserId,
      },
    });

    return updated;
  }

  async update(id: string, data: any) {
    const reservation = await prisma.reservation.findUnique({ where: { id } });
    if (!reservation) throw new AppError('Reservation not found', 404);

    const updated = await prisma.reservation.update({ where: { id }, data });

    if (data.status && data.status !== reservation.status) {
      await this.logStatusChange(id, reservation.status, data.status, updated.participantId);
    }

    return updated;
  }

  async joinExistingTrip(reservationId: string, tripId: string, userId: string) {
    return prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({
        where: { id: reservationId },
        include: { trip: { include: { vehicle: true, reservations: true } } },
      });
      if (!reservation) throw new AppError('Reservation not found', 404);
      if (reservation.participantId !== userId) throw new AppError('Not authorized', 403);
      if (reservation.status !== 'PENDING' && reservation.status !== 'CONFIRMED') {
        throw new AppError('Cannot join trip from current status', 400);
      }

      // Explicitly acquire row-level lock on the trip record in PostgreSQL
      try {
        await tx.$queryRaw`SELECT id FROM trips WHERE id = ${tripId}::text FOR UPDATE`;
      } catch {
        // Safe fallback for environments that do not support FOR UPDATE (e.g. SQLite test runners)
      }

      const trip = await tx.trip.findUnique({
        where: { id: tripId },
        include: { vehicle: true, reservations: { where: { status: { in: ['CONFIRMED', 'CHECKED_IN'] } } } },
      });
      if (!trip) throw new AppError('Trip not found', 404);

      // Exclude current reservation if it was already confirmed on this trip
      const otherReservations = trip.reservations.filter((r) => r.id !== reservationId);
      const occupiedSeats = otherReservations.reduce((sum, r) => sum + (r.passengerCount || 1), 0);
      const totalCapacity = trip.vehicle?.capacity || 0;
      const remainingSeats = totalCapacity - occupiedSeats;
      const requestedSeats = reservation.passengerCount || 1;

      if (remainingSeats < requestedSeats) {
        throw new AppError('Not enough available seats on this trip', 400);
      }

      await tx.reservation.update({
        where: { id: reservationId },
        data: { tripId, status: 'CONFIRMED' },
      });

      await this.logStatusChange(reservationId, reservation.status, 'CONFIRMED', userId);

      await tx.notification.create({
        data: {
          type: 'RESERVATION_CONFIRMATION',
          title: 'Trip Joined Successfully',
          message: `You've joined an existing shuttle. New remaining seats: ${remainingSeats - requestedSeats}`,
          userId,
        },
      });

      return { success: true, tripId, remainingSeats: remainingSeats - requestedSeats };
    });
  }

  async cancel(id: string, userId: string) {
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: { trip: { include: { vehicle: true } } },
    });
    if (!reservation) throw new AppError('Reservation not found', 404);
    if (reservation.participantId !== userId) throw new AppError('Not authorized', 403);
    if (reservation.status === 'COMPLETED' || reservation.status === 'CANCELLED') {
      throw new AppError('Cannot cancel this reservation', 400);
    }

    await prisma.reservation.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    await this.logStatusChange(id, reservation.status, 'CANCELLED', userId);

    await this.processWaitingListAfterCancellation(reservation.eventId, reservation.tripId);

    if (reservation.passengerCount && reservation.passengerCount > 1) {
      await prisma.reservation.update({
        where: { id },
        data: { passengerCount: 1 },
      });
    }

    const event = await prisma.event.findUnique({ where: { id: reservation.eventId } });

    await prisma.notification.create({
      data: {
        type: 'TRIP_CANCELLED',
        title: 'Reservation Cancelled',
        message: `Your reservation for ${event?.name || 'event'} has been cancelled.`,
        userId,
      },
    });

    return reservation;
  }

  async processWaitingListAfterCancellation(eventId: string, tripId: string | null) {
    if (!tripId) return;

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        vehicle: true,
        reservations: { where: { status: { in: ['CONFIRMED', 'CHECKED_IN'] } } },
      },
    });
    if (!trip) return;

    const occupiedSeats = trip.reservations.reduce((sum, r) => sum + (r.passengerCount || 1), 0);
    const availableSeats = (trip.vehicle?.capacity || 0) - occupiedSeats;

    if (availableSeats <= 0) return;

    const waitingEntries = await prisma.waitingList.findMany({
      where: {
        eventId,
        tripId,
        status: 'PENDING',
      },
      orderBy: { createdAt: 'asc' },
      include: { reservation: true },
    });

    let seatsToAssign = availableSeats;
    for (const entry of waitingEntries) {
      if (seatsToAssign <= 0) break;
      if (entry.passengerCount > seatsToAssign) continue;

      await prisma.waitingList.update({
        where: { id: entry.id },
        data: { status: 'ASSIGNED', assignedAt: new Date() },
      });

      await prisma.reservation.update({
        where: { id: entry.reservationId },
        data: { status: 'CONFIRMED', tripId },
      });

      await this.logStatusChange(entry.reservationId, entry.reservation.status, 'CONFIRMED', entry.participantId);

      await prisma.notification.create({
        data: {
          type: 'WAITING_LIST_ASSIGNED',
          title: 'Seat Available!',
          message: `A seat has opened up! Your reservation is now confirmed for trip ${tripId}.`,
          userId: entry.participantId,
        },
      });

      emitToUser(entry.participantId, 'waiting-list-assigned', {
        reservationId: entry.reservationId,
        tripId,
        message: 'Your seat is now confirmed!',
      });

      seatsToAssign -= entry.passengerCount;
    }
  }

  async getWaitingList(params: { eventId?: string; tripId?: string; page?: number; limit?: number }) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = { status: 'PENDING' as const };
    if (params.eventId) where.eventId = params.eventId;
    if (params.tripId) where.tripId = params.tripId;

    const [data, total] = await Promise.all([
      prisma.waitingList.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
        include: {
          reservation: {
            include: {
        participant: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatar: true } },
              event: { select: { id: true, name: true } },
            },
          },
        },
      }),
      prisma.waitingList.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async addToWaitingList(reservationId: string, tripId: string | null) {
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { trip: true },
    });
    if (!reservation) throw new AppError('Reservation not found', 404);
    if (reservation.status !== 'PENDING') throw new AppError('Can only add pending reservations to waiting list', 400);

    const existing = await prisma.waitingList.findUnique({
      where: { reservationId },
    });
    if (existing) return existing;

    const entry = await prisma.waitingList.create({
      data: {
        reservationId,
        eventId: reservation.eventId,
        tripId,
        participantId: reservation.participantId,
        passengerCount: reservation.passengerCount || 1,
      },
    });

    await prisma.notification.create({
      data: {
        type: 'GENERAL',
        title: 'Added to Waiting List',
        message: `You've been added to the waiting list. You'll be notified when a seat opens up.`,
        userId: reservation.participantId,
      },
    });

    emitToUser(reservation.participantId, 'waiting-list-update', {
      reservationId,
      position: 'pending',
      message: 'You are on the waiting list',
    });

    return entry;
  }

  async getParticipantReservations(participantId: string) {
    const reservations = await prisma.reservation.findMany({
      where: { participantId },
      orderBy: { date: 'desc' },
      include: {
        event: { select: { id: true, name: true, date: true, address: true, posterImage: true } },
        pickupPoint: true,
        optimizedPickup: true,
        waitingListEntry: { select: { status: true, createdAt: true } },
        trip: {
          include: {
            vehicle: true,
            driver: { include: { user: true } },
            _count: { select: { reservations: true } },
          },
        },
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
    });

    for (const reservation of reservations) {
      if (reservation.status === 'CANCELLED' || reservation.status === 'REJECTED') continue;
      const validation = reservation.qrCode ? verifyQrToken(reservation.qrCode) : { valid: false };
      if (!validation.valid) {
        const freshToken = this.generateQrToken(reservation);
        await prisma.reservation.update({
          where: { id: reservation.id },
          data: { qrCode: freshToken },
        });
        reservation.qrCode = freshToken;
      }
    }

    return reservations;
  }

  async getStats() {
    const [total, confirmed, checkedIn, completed, cancelled, pending, rejected] = await Promise.all([
      prisma.reservation.count(),
      prisma.reservation.count({ where: { status: 'CONFIRMED' } }),
      prisma.reservation.count({ where: { status: 'CHECKED_IN' } }),
      prisma.reservation.count({ where: { status: 'COMPLETED' } }),
      prisma.reservation.count({ where: { status: 'CANCELLED' } }),
      prisma.reservation.count({ where: { status: 'PENDING' } }),
      prisma.reservation.count({ where: { status: 'REJECTED' } }),
    ]);
    const totalPassengers = await prisma.reservation.aggregate({ _sum: { passengerCount: true } });
    const waitingListCount = await prisma.waitingList.count({ where: { status: 'PENDING' } });

    return { total, confirmed, checkedIn, completed, cancelled, pending, rejected, totalPassengers: totalPassengers._sum.passengerCount || 0, waitingListCount };
  }

  private async logStatusChange(reservationId: string, fromStatus: string, toStatus: string, changedById?: string) {
    try {
      await prisma.reservationStatusHistory.create({
        data: { reservationId, fromStatus, toStatus, changedById },
      });
    } catch {
      // non-critical, silently fail
    }
  }

  async scanQR(token: string, driverId: string) {
    const validation = verifyQrToken(token);
    if (!validation.valid) {
      return { success: false, message: validation.status === 'EXPIRED' ? 'QR code expired' : 'Invalid QR code' };
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id: validation.payload.sub },
      include: {
        participant: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatar: true } },
        event: { select: { id: true, name: true, date: true, startTime: true, endTime: true } },
        trip: { select: { id: true, name: true, driverId: true, vehicle: { select: { busNumber: true, plateNumber: true } }, route: { select: { name: true, origin: true, destination: true } } } },
        pickupPoint: { select: { id: true, name: true, address: true, latitude: true, longitude: true, maxCapacity: true } },
      },
    });

    if (!reservation) return { success: false, message: 'Reservation not found' };

    if (reservation.status === 'BOARDED') {
      return { success: false, message: 'Participant déjà embarqué.' };
    }

    if (reservation.status === 'CANCELLED' || reservation.status === 'REJECTED') {
      return { success: false, message: `Reservation was ${reservation.status.toLowerCase()}` };
    }

    if (reservation.status !== 'CONFIRMED' && reservation.status !== 'CHECKED_IN') {
      return { success: false, message: 'Réservation en attente de confirmation. Veuillez attendre l\'approbation de l\'organisateur.' };
    }

    return {
      success: true,
      reservation: {
        id: reservation.id,
        reservationCode: reservation.reservationCode,
        status: reservation.status,
        date: reservation.date,
        time: reservation.time,
        notes: reservation.notes,
        passengerCount: reservation.passengerCount,
        contactPhone: reservation.contactPhone,
        pickupAddress: reservation.pickupAddress,
        participant: reservation.participant,
        event: reservation.event,
        trip: reservation.trip,
        pickupPoint: reservation.pickupPoint,
      },
    };
  }

  async validateBoarding(reservationId: string, driverId: string) {
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { event: { select: { id: true, name: true } } },
    });

    if (!reservation) throw new AppError('Reservation not found', 404);
    if (reservation.status === 'BOARDED') throw new AppError('Participant déjà embarqué.', 400);
    if (reservation.status !== 'CONFIRMED' && reservation.status !== 'CHECKED_IN') {
      throw new AppError('Reservation is not eligible for boarding', 400);
    }

    const updated = await prisma.reservation.update({
      where: { id: reservationId },
      data: { status: 'BOARDED', boardedAt: new Date() },
      include: { participant: { select: { id: true, firstName: true, lastName: true } }, event: { select: { id: true, name: true } } },
    });

    await this.logStatusChange(reservationId, reservation.status, 'BOARDED', driverId);

    await prisma.notification.create({
      data: {
        type: 'TRIP_STARTED',
        title: 'Embarquement validé',
        message: `Le participant ${updated.participant?.firstName} ${updated.participant?.lastName} a été validé pour ${updated.event?.name}`,
        userId: reservation.participantId,
      },
    });

    await prisma.activityLog.create({
      data: {
        action: 'BOARDING_VALIDATED',
        entity: 'Reservation',
        entityId: reservationId,
        details: JSON.stringify({ driverId, reservationId: reservation.id }),
        userId: driverId,
      },
    });

    return { success: true, message: 'Embarquement validé.', reservation: updated };
  }
}

export const reservationService = new ReservationService();
