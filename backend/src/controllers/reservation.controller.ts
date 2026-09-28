import { Request, Response, NextFunction } from 'express';
import { reservationService } from '../services/reservation.service';
import { matchingService } from '../services/matching.service';
import { AppError } from '../middleware/error.middleware';

function toValidDate(val: any, fallback?: Date): Date {
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val;
  }
  if (typeof val === 'string' && val.trim()) {
    const trimmed = val.trim();
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d;

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const d2 = new Date(`${trimmed}T00:00:00.000Z`);
      if (!isNaN(d2.getTime())) return d2;
    }

    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(trimmed)) {
      const today = new Date().toISOString().slice(0, 10);
      const timeClean = trimmed.length === 5 ? `${trimmed}:00` : trimmed;
      const d3 = new Date(`${today}T${timeClean}.000Z`);
      if (!isNaN(d3.getTime())) return d3;
    }
  }
  if (typeof val === 'number') {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  }
  return fallback ? toValidDate(fallback) : new Date();
}

export class ReservationController {
  async findAll(req: Request, res: Response, next: NextFunction) {
    try { const result = await reservationService.findAll(req.query as any); res.json(result); }
    catch (error) { next(error); }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const reservation = await reservationService.findById(req.params.id, req.user!);
      res.json(reservation);
    }
    catch (error) { next(error); }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = { ...req.body, participantId: req.user!.userId };

      // Normalize coordinates
      if (data.pickupLat !== undefined && data.pickupLatitude === undefined) {
        data.pickupLatitude = Number(data.pickupLat);
      }
      if (data.pickupLng !== undefined && data.pickupLongitude === undefined) {
        data.pickupLongitude = Number(data.pickupLng);
      }
      if (typeof data.passengerCount === 'string') {
        data.passengerCount = parseInt(data.passengerCount, 10);
      }

      // Convert date to valid Date object
      const validDate = toValidDate(data.date);
      const dateStr = validDate.toISOString().slice(0, 10);
      data.date = validDate;

      // Convert time to valid Date object
      let validTime: Date;
      if (typeof data.time === 'string' && /^\d{1,2}:\d{2}/.test(data.time.trim())) {
        const timePart = data.time.trim().slice(0, 5);
        validTime = new Date(`${dateStr}T${timePart}:00.000Z`);
        if (isNaN(validTime.getTime())) {
          validTime = toValidDate(data.time, validDate);
        }
      } else {
        validTime = toValidDate(data.time, validDate);
      }
      data.time = validTime;

      // Convert pickupTime to valid Date object
      if (data.pickupTime) {
        data.pickupTime = toValidDate(data.pickupTime, validTime);
      } else {
        data.pickupTime = validTime;
      }

      const reservation = await reservationService.create(data);
      res.status(201).json(reservation);
    } catch (error) { next(error); }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try { const reservation = await reservationService.update(req.params.id, req.body); res.json(reservation); }
    catch (error) { next(error); }
  }

  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const reservation = await reservationService.cancel(req.params.id, req.user!.userId);
      res.json(reservation);
    } catch (error) { next(error); }
  }

  async approve(req: Request, res: Response, next: NextFunction) {
    try {
      const reservation = await reservationService.approve(req.params.id, req.user!.userId);
      res.json(reservation);
    } catch (error) { next(error); }
  }

  async reject(req: Request, res: Response, next: NextFunction) {
    try {
      const reservation = await reservationService.reject(req.params.id, req.user!.userId);
      res.json(reservation);
    } catch (error) { next(error); }
  }

  async getMyReservations(req: Request, res: Response, next: NextFunction) {
    try {
      const reservations = await reservationService.getParticipantReservations(req.user!.userId);
      res.json(reservations);
    } catch (error) { next(error); }
  }

  async getStats(req: Request, res: Response, next: NextFunction) {
    try { const stats = await reservationService.getStats(); res.json(stats); }
    catch (error) { next(error); }
  }

  async validateQR(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, ...scanData } = req.body;
      if (!token) throw new AppError('QR token is required', 400);
      const result = await reservationService.validateScan(token, scanData);
      res.json(result);
    } catch (error) { next(error); }
  }

  async findMatches(req: Request, res: Response, next: NextFunction) {
    try {
      const { eventId, lat, lng, pickupTime, passengerCount, excludeReservationId } = req.body;
      if (!eventId || lat == null || lng == null || !pickupTime) {
        throw new AppError('eventId, lat, lng, and pickupTime are required', 400);
      }
      const matches = await matchingService.findMatches({
        eventId,
        pickupLatitude: lat,
        pickupLongitude: lng,
        pickupTime: new Date(pickupTime),
        passengerCount: passengerCount || 1,
        excludeReservationId,
      });
      res.json({ matches });
    } catch (error) { next(error); }
  }

  async joinTrip(req: Request, res: Response, next: NextFunction) {
    try {
      const { reservationId, tripId } = req.body;
      if (!reservationId || !tripId) throw new AppError('reservationId and tripId are required', 400);
      const result = await reservationService.joinExistingTrip(reservationId, tripId, req.user!.userId);
      res.json(result);
    } catch (error) { next(error); }
  }

  async getWaitingList(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await reservationService.getWaitingList(req.query as any);
      res.json(result);
    } catch (error) { next(error); }
  }

  async getSharedPickups(req: Request, res: Response, next: NextFunction) {
    try {
      const { eventId } = req.query;
      if (!eventId) throw new AppError('eventId is required', 400);
      const pickups = await matchingService.getSharedPickupsForEvent(eventId as string);
      res.json(pickups);
    } catch (error) { next(error); }
  }

  async scanQR(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.body;
      if (!token) throw new AppError('QR token is required', 400);
      const result = await reservationService.scanQR(token, req.user!.userId);
      res.json(result);
    } catch (error) { next(error); }
  }

  async validateBoarding(req: Request, res: Response, next: NextFunction) {
    try {
      const { reservationId } = req.body;
      if (!reservationId) throw new AppError('reservationId is required', 400);
      const result = await reservationService.validateBoarding(reservationId, req.user!.userId);
      res.json(result);
    } catch (error) { next(error); }
  }
}

export const reservationController = new ReservationController();
