import { Request, Response, NextFunction } from 'express';
import { trackingService } from '../services/tracking.service';
import prisma from '../config/database';
import { AppError } from '../middleware/error.middleware';

export class TrackingController {
  async updateLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const driver = await prisma.driver.findUnique({ where: { userId: req.user!.userId } });
      if (!driver) throw new AppError('Driver profile not found', 404);
      const result = await trackingService.updateLocation(req.params.tripId, driver.id, req.body);
      res.json(result);
    } catch (error) { next(error); }
  }

  async changeTripStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const driver = await prisma.driver.findUnique({ where: { userId: req.user!.userId } });
      if (!driver) throw new AppError('Driver profile not found', 404);
      const result = await trackingService.changeTripStatus(req.params.tripId, driver.id, req.body.status);
      res.json(result);
    } catch (error) { next(error); }
  }

  async getActiveShuttles(req: Request, res: Response, next: NextFunction) {
    try { const shuttles = await trackingService.getActiveShuttles(); res.json(shuttles); }
    catch (error) { next(error); }
  }

  async getTripHistory(req: Request, res: Response, next: NextFunction) {
    try { const logs = await trackingService.getTripHistory(req.params.tripId); res.json(logs); }
    catch (error) { next(error); }
  }

  async replayTrip(req: Request, res: Response, next: NextFunction) {
    try { const data = await trackingService.replayTrip(req.params.tripId); res.json(data); }
    catch (error) { next(error); }
  }

  async getDriverCurrentTrip(req: Request, res: Response, next: NextFunction) {
    try {
      const driver = await prisma.driver.findUnique({ where: { userId: req.user!.userId } });
      if (!driver) throw new AppError('Driver profile not found', 404);
      const trip = await prisma.trip.findFirst({
        where: { driverId: driver.id, status: { in: ['IN_PROGRESS', 'SCHEDULED', 'DELAYED'] } },
        orderBy: [{ status: 'asc' }, { departureTime: 'asc' }],
        include: { route: { include: { event: true, stops: { orderBy: { order: 'asc' } } } }, vehicle: true, reservations: { include: { participant: true, pickupPoint: true } } },
      });
      res.json(trip);
    } catch (error) { next(error); }
  }

  async getOrganizerMonitoring(req: Request, res: Response, next: NextFunction) {
    try {
      const trips = await prisma.trip.findMany({
        where: { route: { event: { createdById: req.user!.userId } }, date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
        orderBy: { departureTime: 'asc' },
        include: {
          vehicle: { select: { id: true, busNumber: true, currentLat: true, currentLng: true } },
          driver: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
          route: { select: { id: true, name: true, origin: true, destination: true, originLat: true, originLng: true, destinationLat: true, destinationLng: true } },
          _count: { select: { reservations: true } },
        },
      });
      res.json(trips);
    } catch (error) { next(error); }
  }
}

export const trackingController = new TrackingController();
