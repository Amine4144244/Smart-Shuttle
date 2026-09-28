import prisma from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { emitToTrip, emitToUser } from './socket.service';

export class TripService {
  async findAll(params: { page?: number; limit?: number; status?: string; driverId?: string; routeId?: string; date?: string }) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.status) where.status = params.status;
    if (params.driverId) where.driverId = params.driverId;
    if (params.routeId) where.routeId = params.routeId;
    if (params.date) where.date = { gte: new Date(params.date) };

    const [data, total] = await Promise.all([
      prisma.trip.findMany({
        where, skip, take: limit,
        orderBy: { date: 'desc' },
        include: {
          driver: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
          vehicle: true,
          route: { include: { stops: { orderBy: { order: 'asc' } }, event: { select: { id: true, name: true, date: true } } } },
          _count: { select: { reservations: true } },
        },
      }),
      prisma.trip.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string) {
    const trip = await prisma.trip.findUnique({
      where: { id },
      include: {
        driver: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } } } },
        vehicle: true,
        route: { include: { stops: { orderBy: { order: 'asc' } }, event: { select: { id: true, name: true, date: true } } } },
        reservations: { include: { participant: { select: { id: true, firstName: true, lastName: true, email: true } }, pickupPoint: true } },
        trackingLogs: { orderBy: { timestamp: 'desc' }, take: 50 },
      },
    });
    if (!trip) throw new AppError('Trip not found', 404);
    return trip;
  }

  async create(data: any) {
    return prisma.trip.create({
      data,
      include: { driver: true, vehicle: true, route: true },
    });
  }

  async update(id: string, data: any) {
    return prisma.trip.update({ where: { id }, data }).catch(() => { throw new AppError('Trip not found', 404); });
  }

  async delete(id: string) {
    const trip = await prisma.trip.findUnique({ where: { id } });
    if (!trip) throw new AppError('Trip not found', 404);

    await prisma.$transaction([
      prisma.trackingLog.deleteMany({ where: { tripId: id } }),
      prisma.reservation.updateMany({ where: { tripId: id }, data: { tripId: null } }),
      prisma.waitingList.deleteMany({ where: { tripId: id } }),
      prisma.sharedPickup.updateMany({ where: { tripId: id }, data: { tripId: null } }),
      prisma.trip.delete({ where: { id } }),
    ]);
  }

  async startTrip(id: string) {
    const trip = await prisma.trip.update({
      where: { id },
      data: { status: 'IN_PROGRESS', tripProgress: 0 },
      include: {
        driver: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } } } },
        vehicle: true,
        route: { include: { stops: { orderBy: { order: 'asc' } }, event: { select: { id: true, name: true, date: true } } } },
        reservations: { include: { participant: { select: { id: true, firstName: true, lastName: true, email: true } }, pickupPoint: true } },
      },
    });

    if (trip.vehicleId) {
      await prisma.vehicle.update({
        where: { id: trip.vehicleId },
        data: { status: 'IN_USE' },
      }).catch(() => {});
    }

    await this.notifyPassengers(id, 'TRIP_STARTED', 'Trip Started', 'Your shuttle is now in transit.');
    emitToTrip(id, 'trip-status-changed', { tripId: id, status: 'IN_PROGRESS', label: 'In Transit' });
    return trip;
  }

  async completeTrip(id: string) {
    const trip = await prisma.trip.update({
      where: { id },
      data: { status: 'COMPLETED', arrivalTime: new Date(), tripProgress: 100 },
      include: {
        driver: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } } } },
        vehicle: true,
        route: { include: { stops: { orderBy: { order: 'asc' } }, event: { select: { id: true, name: true, date: true } } } },
        reservations: { include: { participant: { select: { id: true, firstName: true, lastName: true, email: true } }, pickupPoint: true } },
      },
    });

    if (trip.vehicleId) {
      await prisma.vehicle.update({
        where: { id: trip.vehicleId },
        data: { status: 'AVAILABLE' },
      }).catch(() => {});
    }

    await prisma.reservation.updateMany({ where: { tripId: id }, data: { status: 'COMPLETED' } }).catch(() => {});
    await this.notifyPassengers(id, 'TRIP_ARRIVED', 'Trip Completed', 'Your shuttle has arrived at the destination.');
    emitToTrip(id, 'trip-status-changed', { tripId: id, status: 'COMPLETED', label: 'Arrived' });
    return trip;
  }

  async delayTrip(id: string, delayMinutes: number) {
    const trip = await prisma.trip.findUnique({ where: { id } });
    if (!trip) throw new AppError('Trip not found', 404);

    const newEstimatedArrival = trip.estimatedArrival
      ? new Date(trip.estimatedArrival.getTime() + delayMinutes * 60000)
      : new Date(Date.now() + delayMinutes * 60000);

    await prisma.trip.update({
      where: { id },
      data: { status: 'DELAYED', estimatedArrival: newEstimatedArrival },
    });

    await this.notifyPassengers(id, 'TRIP_DELAYED', 'Trip Delayed', `Your trip is delayed by approximately ${delayMinutes} minutes.`);
    emitToTrip(id, 'trip-status-changed', { tripId: id, status: 'DELAYED', label: 'Delayed' });
    return { id, newEstimatedArrival };
  }

  private async notifyPassengers(tripId: string, type: any, title: string, message: string) {
    try {
      const trip = await prisma.trip.findUnique({
        where: { id: tripId },
        include: { route: true },
      });
      const eventId = trip?.route?.eventId;

      const reservations = await prisma.reservation.findMany({
        where: {
          OR: [
            { tripId },
            ...(eventId ? [{ eventId, status: { in: ['CONFIRMED' as const, 'CHECKED_IN' as const, 'PENDING' as const] } }] : []),
          ],
        },
      });

      for (const r of reservations) {
        await prisma.notification.create({
          data: { type, title, message, userId: r.participantId },
        }).catch(() => {});
        emitToUser(r.participantId, 'notification', { type, title, message, tripId });
      }
    } catch {
      // non-critical failure
    }
  }

  async getActiveTrips() {
    return prisma.trip.findMany({
      where: { status: 'IN_PROGRESS' },
      include: {
        driver: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
        vehicle: true,
        route: true,
        _count: { select: { reservations: true } },
      },
    });
  }
}

export const tripService = new TripService();
