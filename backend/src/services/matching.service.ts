import prisma from '../config/database';
import { emitToUser } from './socket.service';

const MATCHING_DISTANCE_KM = 0.5;
const MATCHING_TIME_WINDOW_MIN = 15;

export interface MatchingInput {
  eventId: string;
  pickupLatitude: number;
  pickupLongitude: number;
  pickupTime: Date;
  passengerCount: number;
  excludeReservationId?: string;
}

export interface MatchResult {
  matchId: string;
  tripId: string;
  existingReservationId: string;
  existingParticipant: { id: string; firstName: string; lastName: string };
  pickupPoint: { lat: number; lng: number; address?: string };
  departureTime: Date;
  occupiedSeats: number;
  totalCapacity: number;
  remainingSeats: number;
  distance: number;
  estimatedArrival?: Date;
}

export class MatchingService {
  private haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private minutesDiff(a: Date, b: Date): number {
    return Math.abs(a.getTime() - b.getTime()) / 60000;
  }

  async findMatches(input: MatchingInput): Promise<MatchResult[]> {
    const trips = await prisma.trip.findMany({
      where: {
        route: { eventId: input.eventId },
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
        date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
      include: {
        vehicle: { select: { id: true, capacity: true } },
        route: { select: { id: true, name: true } },
        reservations: {
          where: { status: { in: ['CONFIRMED', 'CHECKED_IN'] } },
          include: {
            participant: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    const matches: MatchResult[] = [];

    for (const trip of trips) {
      const occupiedSeats = trip.reservations.reduce((sum, r) => sum + (r.passengerCount || 1), 0);
      const totalCapacity = trip.vehicle?.capacity || 0;
      const remainingSeats = totalCapacity - occupiedSeats;

      if (remainingSeats < input.passengerCount) continue;

      let closestDistance = Infinity;
      let closestReservation: (typeof trip.reservations)[0] | null = null;

      for (const res of trip.reservations) {
        if (res.id === input.excludeReservationId) continue;
        const rLat = res.pickupLatitude;
        const rLng = res.pickupLongitude;
        if (rLat == null || rLng == null) continue;

        const dist = this.haversineDistance(input.pickupLatitude, input.pickupLongitude, rLat, rLng);
        if (dist <= MATCHING_DISTANCE_KM && dist < closestDistance) {
          closestDistance = dist;
          closestReservation = res;
        }
      }

      if (!closestReservation) continue;

      const timeDiff = this.minutesDiff(input.pickupTime, closestReservation.time);
      if (timeDiff > MATCHING_TIME_WINDOW_MIN) continue;

      const earliestDeparture = new Date(Math.max(
        trip.departureTime.getTime(),
        closestReservation.time.getTime()
      ));

      matches.push({
        matchId: `${trip.id}-${closestReservation.id}`,
        tripId: trip.id,
        existingReservationId: closestReservation.id,
        existingParticipant: {
          id: closestReservation.participant.id,
          firstName: closestReservation.participant.firstName,
          lastName: closestReservation.participant.lastName,
        },
        pickupPoint: {
          lat: closestReservation.pickupLatitude!,
          lng: closestReservation.pickupLongitude!,
          address: closestReservation.pickupAddress || undefined,
        },
        departureTime: earliestDeparture,
        occupiedSeats,
        totalCapacity,
        remainingSeats,
        distance: closestDistance,
        estimatedArrival: trip.estimatedArrival || undefined,
      });
    }

    return matches.sort((a, b) => b.remainingSeats - a.remainingSeats || a.distance - b.distance);
  }

  async createSharedPickup(eventId: string, reservationIds: string[]): Promise<{ id: string; name: string; latitude: number; longitude: number; address?: string }> {
    const reservations = await prisma.reservation.findMany({
      where: { id: { in: reservationIds } },
    });

    if (reservations.length < 2) throw new Error('Need at least 2 reservations to create a shared pickup');

    const avgLat = reservations.reduce((s, r) => s + (r.pickupLatitude || 0), 0) / reservations.length;
    const avgLng = reservations.reduce((s, r) => s + (r.pickupLongitude || 0), 0) / reservations.length;

    const pickup = await prisma.sharedPickup.create({
      data: {
        name: `Shared Pickup - ${new Date().toLocaleDateString()}`,
        latitude: avgLat,
        longitude: avgLng,
        address: `Optimized pickup (${reservations.length} passengers)`,
        eventId,
      },
    });

    await prisma.reservation.updateMany({
      where: { id: { in: reservationIds } },
      data: { optimizedPickupId: pickup.id },
    });

    for (const res of reservations) {
      await prisma.notification.create({
        data: {
          type: 'PICKUP_MODIFIED',
          title: 'Pickup Point Optimized',
          message: `A shared pickup point has been created near your location.`,
          userId: res.participantId,
        },
      });
      emitToUser(res.participantId, 'pickup-optimized', {
        sharedPickupId: pickup.id,
        latitude: avgLat,
        longitude: avgLng,
        name: pickup.name,
      });
    }

    if (reservations.length > 0) {
      await prisma.activityLog.create({
        data: {
          action: 'SHARED_PICKUP_CREATED',
          entity: 'SharedPickup',
          entityId: pickup.id,
          details: JSON.stringify({ reservationIds, avgLat, avgLng }),
          userId: reservations[0].participantId,
        },
      }).catch(() => {});
    }

    return {
      id: pickup.id,
      name: pickup.name,
      latitude: avgLat,
      longitude: avgLng,
      address: pickup.address || undefined,
    };
  }

  async getSharedPickupsForEvent(eventId: string) {
    return prisma.sharedPickup.findMany({
      where: { eventId },
      include: {
        _count: { select: { reservations: true } },
      },
    });
  }
}

export const matchingService = new MatchingService();
