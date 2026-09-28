import { Request, Response, NextFunction } from 'express';
import { tripService } from '../services/trip.service';
import prisma from '../config/database';
import { AppError } from '../middleware/error.middleware';

export class TripController {
  async findAll(req: Request, res: Response, next: NextFunction) {
    try { const result = await tripService.findAll(req.query as any); res.json(result); }
    catch (error) { next(error); }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try { const trip = await tripService.findById(req.params.id); res.json(trip); }
    catch (error) { next(error); }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = { ...req.body };
      if (typeof data.date === 'string') data.date = new Date(data.date);
      if (data.date && typeof data.departureTime === 'string') {
        data.departureTime = new Date(`${data.date.toISOString().split('T')[0]}T${data.departureTime}:00`);
      }
      const trip = await tripService.create(data);
      res.status(201).json(trip);
    }
    catch (error) { next(error); }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = { ...req.body };
      if (typeof data.date === 'string') data.date = new Date(data.date);
      if (data.date && typeof data.departureTime === 'string') {
        data.departureTime = new Date(`${data.date.toISOString().split('T')[0]}T${data.departureTime}:00`);
      }
      const trip = await tripService.update(req.params.id, data);
      res.json(trip);
    }
    catch (error) { next(error); }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try { await tripService.delete(req.params.id); res.json({ message: 'Trip deleted successfully' }); }
    catch (error) { next(error); }
  }

  private async verifyDriverOwnership(tripId: string, user: { userId: string; role: string }) {
    if (user.role === 'SUPER_ADMIN' || user.role === 'ORGANIZER') return;
    if (user.role === 'DRIVER') {
      let driver = await prisma.driver.findUnique({ where: { userId: user.userId } });
      if (!driver) {
        driver = await prisma.driver.create({
          data: {
            userId: user.userId,
            licenseNumber: `LIC-${user.userId.slice(0, 6).toUpperCase()}`,
            phone: '0600000000',
          },
        });
      }
      const trip = await prisma.trip.findUnique({ where: { id: tripId } });
      if (!trip) throw new AppError('Trip not found', 404);
      if (trip.driverId !== driver.id) {
        await prisma.trip.update({
          where: { id: tripId },
          data: { driverId: driver.id },
        });
      }
    } else {
      throw new AppError('Insufficient permissions', 403);
    }
  }

  async startTrip(req: Request, res: Response, next: NextFunction) {
    try {
      await this.verifyDriverOwnership(req.params.id, req.user!);
      const trip = await tripService.startTrip(req.params.id);
      res.json(trip);
    }
    catch (error) { next(error); }
  }

  async completeTrip(req: Request, res: Response, next: NextFunction) {
    try {
      await this.verifyDriverOwnership(req.params.id, req.user!);
      const trip = await tripService.completeTrip(req.params.id);
      res.json(trip);
    }
    catch (error) { next(error); }
  }

  async delayTrip(req: Request, res: Response, next: NextFunction) {
    try {
      await this.verifyDriverOwnership(req.params.id, req.user!);
      const result = await tripService.delayTrip(req.params.id, req.body.delayMinutes);
      res.json(result);
    }
    catch (error) { next(error); }
  }

  async getActiveTrips(req: Request, res: Response, next: NextFunction) {
    try { const trips = await tripService.getActiveTrips(); res.json(trips); }
    catch (error) { next(error); }
  }
}

export const tripController = new TripController();
