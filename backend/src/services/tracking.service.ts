import prisma from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { emitToTrip, emitToUser } from './socket.service';

const PROXIMITY_500M = 0.5;
const PROXIMITY_200M = 0.2;
const PROXIMITY_ARRIVED = 0.05;
const PROXIMITY_KM = 0.3;
const STATUS_TRANSITIONS: Record<string, string[]> = {
  SCHEDULED: ['IN_PROGRESS'],
  IN_PROGRESS: ['COMPLETED', 'DELAYED'],
  DELAYED: ['IN_PROGRESS', 'COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

export class TrackingService {
  async updateLocation(tripId: string, driverId: string, data: { lat: number; lng: number; speed?: number; heading?: number }) {
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: { route: true, vehicle: true },
    });
    if (!trip) throw new AppError('Trip not found', 404);
    if (trip.driverId !== driverId) throw new AppError('Not your trip', 403);

    await prisma.trackingLog.create({
      data: { latitude: data.lat, longitude: data.lng, speed: data.speed, heading: data.heading, tripId },
    });

    await prisma.vehicle.update({
      where: { id: trip.vehicleId },
      data: { currentLat: data.lat, currentLng: data.lng, lastLocationAt: new Date() },
    });

    await prisma.trip.update({
      where: { id: tripId },
      data: { currentLat: data.lat, currentLng: data.lng, currentSpeed: data.speed },
    });

    const eta = this.calculateETA(trip, data.lat, data.lng, data.speed);
    const distance = this.calculateRemainingDistance(trip, data.lat, data.lng);
    const progress = this.calculateProgress(trip, data.lat, data.lng);

    if (eta) {
      await prisma.trip.update({ where: { id: tripId }, data: { estimatedArrival: eta, tripProgress: progress } });
    }

    emitToTrip(tripId, 'location-update', {
      tripId, lat: data.lat, lng: data.lng, speed: data.speed, heading: data.heading,
      estimatedArrival: eta, remainingDistance: distance, progress,
      timestamp: new Date(),
    });

    await this.checkProximityToPickups(tripId, data.lat, data.lng);

    return { eta, distance, progress };
  }

  async changeTripStatus(tripId: string, driverId: string, newStatus: string) {
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: { reservations: { include: { participant: true } } },
    });
    if (!trip) throw new AppError('Trip not found', 404);
    if (trip.driverId !== driverId) throw new AppError('Not your trip', 403);

    const allowed = STATUS_TRANSITIONS[trip.status] || [];
    if (!allowed.includes(newStatus)) {
      throw new AppError(`Cannot transition from ${trip.status} to ${newStatus}`, 400);
    }

    const updateData: any = { status: newStatus };
    if (newStatus === 'COMPLETED') {
      updateData.arrivalTime = new Date();
      updateData.tripProgress = 100;
    }

    await prisma.trip.update({ where: { id: tripId }, data: updateData });

    if (newStatus === 'IN_PROGRESS') {
      await prisma.trip.update({ where: { id: tripId }, data: { tripProgress: 0 } });
    }

    const statusLabels: Record<string, string> = {
      IN_PROGRESS: 'In Transit',
      COMPLETED: 'Arrived',
      DELAYED: 'Delayed',
      SCHEDULED: 'Waiting',
    };

    const statusLabel = statusLabels[newStatus] || newStatus;

    if (newStatus === 'IN_PROGRESS') {
      for (const res of trip.reservations) {
        await prisma.notification.create({
          data: { type: 'TRIP_STARTED', title: 'Trip Started', message: 'Your shuttle is now in transit.', userId: res.participantId },
        });
        emitToUser(res.participantId, 'notification', { type: 'TRIP_STARTED', title: 'Trip Started', message: 'Your shuttle is now in transit.', tripId });
      }
    }

    if (newStatus === 'COMPLETED') {
      for (const res of trip.reservations) {
        await prisma.reservation.updateMany({ where: { tripId, participantId: res.participantId }, data: { status: 'COMPLETED' } });
        await prisma.notification.create({
          data: { type: 'TRIP_ARRIVED', title: 'Trip Completed', message: 'Your shuttle has arrived at the destination.', userId: res.participantId },
        });
        emitToUser(res.participantId, 'notification', { type: 'TRIP_ARRIVED', title: 'Trip Completed', message: 'Your shuttle has arrived at the destination.', tripId });
      }
    }

    emitToTrip(tripId, 'trip-status-changed', { tripId, status: newStatus, label: statusLabel });

    return { tripId, status: newStatus, label: statusLabel };
  }

  async getActiveShuttles() {
    const trips = await prisma.trip.findMany({
      where: { status: { in: ['IN_PROGRESS', 'SCHEDULED'] }, date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      include: {
        vehicle: { select: { id: true, busNumber: true, plateNumber: true, capacity: true, currentLat: true, currentLng: true } },
        driver: { include: { user: { select: { id: true, firstName: true, lastName: true, phone: true } } } },
        route: {
          select: {
            id: true,
            name: true,
            origin: true,
            destination: true,
            originLat: true,
            originLng: true,
            destinationLat: true,
            destinationLng: true,
            eventId: true,
            event: { select: { id: true, name: true, date: true } },
          },
        },
        _count: { select: { reservations: true } },
      },
      orderBy: { departureTime: 'asc' },
    });
    return trips;
  }

  async getTripHistory(tripId: string) {
    const logs = await prisma.trackingLog.findMany({
      where: { tripId },
      orderBy: { timestamp: 'asc' },
      take: 5000,
    });
    return logs;
  }

  async replayTrip(tripId: string) {
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: { trackingLogs: { orderBy: { timestamp: 'asc' } }, route: { include: { stops: true } }, driver: { include: { user: true } }, vehicle: true },
    });
    if (!trip) throw new AppError('Trip not found', 404);
    return trip;
  }

  private calculateETA(trip: any, currentLat: number, currentLng: number, speed?: number): Date | null {
    if (!trip.route?.distance || !speed || speed < 1) return null;
    const remainingKm = trip.route.distance * ((100 - (trip.tripProgress || 0)) / 100);
    const avgSpeed = speed || 30;
    const etaMinutes = (remainingKm / avgSpeed) * 60;
    return new Date(Date.now() + etaMinutes * 60000);
  }

  private calculateRemainingDistance(trip: any, currentLat: number, currentLng: number): number {
    if (!trip.route) return 0;
    const destLat = trip.route.destinationLat;
    const destLng = trip.route.destinationLng;
    if (!destLat || !destLng) return 0;
    return this.haversineDistance(currentLat, currentLng, destLat, destLng);
  }

  private calculateProgress(trip: any, currentLat: number, currentLng: number): number {
    if (!trip.route?.originLat || !trip.route?.originLng || !trip.route?.destinationLat || !trip.route?.destinationLng) {
      return trip.tripProgress || 0;
    }
    const totalDist = this.haversineDistance(trip.route.originLat, trip.route.originLng, trip.route.destinationLat, trip.route.destinationLng);
    if (totalDist === 0) return 100;
    const remaining = this.haversineDistance(currentLat, currentLng, trip.route.destinationLat, trip.route.destinationLng);
    return Math.min(100, Math.max(0, Math.round(((totalDist - remaining) / totalDist) * 100)));
  }

  private async checkProximityToPickups(tripId: string, currentLat: number, currentLng: number) {
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: { reservations: { include: { participant: true } }, route: { include: { stops: true } } },
    });
    if (!trip?.route) return;

    const notifiedKey = (resId: string, dist: number) => `${tripId}-${resId}-${Math.round(dist * 10)}`;
    const notified = new Set<string>();

    for (const res of trip.reservations) {
      const rLat = res.pickupLatitude;
      const rLng = res.pickupLongitude;
      if (rLat == null || rLng == null) continue;

      const dist = this.haversineDistance(currentLat, currentLng, rLat, rLng);

      if (dist <= PROXIMITY_ARRIVED && !notified.has(notifiedKey(res.id, PROXIMITY_ARRIVED))) {
        const notif = await prisma.notification.create({
          data: { type: 'TRIP_ARRIVED', title: 'Shuttle Arrived', message: 'Your shuttle has arrived at the pickup point.', userId: res.participantId },
        });
        emitToUser(res.participantId, 'shuttle-near', { stage: 'arrived', distance: dist, tripId, reservationId: res.id });
        emitToUser(res.participantId, 'notification', { type: 'TRIP_ARRIVED', title: 'Shuttle Arrived', message: 'Your shuttle has arrived at the pickup point.' });
        notified.add(notifiedKey(res.id, PROXIMITY_ARRIVED));
      } else if (dist <= PROXIMITY_200M && !notified.has(notifiedKey(res.id, PROXIMITY_200M))) {
        await prisma.notification.create({
          data: { type: 'SHUTTLE_NEAR_200M', title: 'Shuttle Very Close', message: `Your shuttle is ${(dist * 1000).toFixed(0)}m away. Please get ready.`, userId: res.participantId },
        });
        emitToUser(res.participantId, 'shuttle-near', { stage: 'very-close', distance: dist, tripId, reservationId: res.id });
        notified.add(notifiedKey(res.id, PROXIMITY_200M));
      } else if (dist <= PROXIMITY_500M && !notified.has(notifiedKey(res.id, PROXIMITY_500M))) {
        await prisma.notification.create({
          data: { type: 'SHUTTLE_NEAR_500M', title: 'Shuttle Approaching', message: `Your shuttle is ${(dist * 1000).toFixed(0)}m away and approaching.`, userId: res.participantId },
        });
        emitToUser(res.participantId, 'shuttle-near', { stage: 'approaching', distance: dist, tripId, reservationId: res.id });
        notified.add(notifiedKey(res.id, PROXIMITY_500M));
      }
    }

    const stops = trip.route.stops || [];
    for (const stop of stops) {
      const dist = this.haversineDistance(currentLat, currentLng, stop.latitude, stop.longitude);
      if (dist <= PROXIMITY_KM) {
        const reservations = await prisma.reservation.findMany({
          where: { tripId, pickupPoint: { id: stop.id } },
          include: { participant: true },
        });
        for (const res of reservations) {
          const notification = await prisma.notification.create({
            data: {
              type: 'TRIP_ARRIVED',
              title: 'Shuttle Approaching',
              message: `Your shuttle is near ${stop.name} (${(dist * 1000).toFixed(0)}m away)`,
              userId: res.participantId,
            },
          });
          emitToUser(res.participantId, 'notification', notification);
        }
      }
    }

    const pickupPoints = await prisma.pickupPoint.findMany({
      where: { event: { routes: { some: { id: trip.routeId } } } },
    });
    for (const point of pickupPoints) {
      const dist = this.haversineDistance(currentLat, currentLng, point.latitude, point.longitude);
      if (dist <= PROXIMITY_KM) {
        const reservations = await prisma.reservation.findMany({
          where: { tripId, pickupPointId: point.id },
          include: { participant: true },
        });
        for (const res of reservations) {
          emitToUser(res.participantId, 'shuttle-near', { pickupPoint: point.name, distance: dist, tripId });
        }
      }
    }
  }

  private haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number { return (deg * Math.PI) / 180; }
}

export const trackingService = new TrackingService();
