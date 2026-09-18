import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { AppError } from '../middleware/error.middleware';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, firstName, lastName, phone, role } = req.body;
      if (!email || !password || !firstName || !lastName) {
        throw new AppError('Email, password, first name, and last name are required', 400);
      }
      const user = await authService.register({ email, password, firstName, lastName, phone, role });
      res.status(201).json(user);
    } catch (error) { next(error); }
  }

  async syncUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { authId, email, ...userMeta } = req.body;
      const user = await authService.syncUser(authId, email, userMeta);
      res.json(user);
    } catch (error) { next(error); }
  }

  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const profile = await authService.getProfile(req.user!.userId);
      res.json(profile);
    } catch (error) { next(error); }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const profile = await authService.updateProfile(req.user!.userId, req.body);
      res.json(profile);
    } catch (error) { next(error); }
  }

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) throw new AppError('Current and new password required', 400);
      await authService.changePassword(req.user!.userId, currentPassword, newPassword);
      res.json({ message: 'Password changed successfully' });
    } catch (error) { next(error); }
  }

  async listUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = (req.query.search as string) || '';
      const result = await authService.listUsers(page, limit, search);
      res.json(result);
    } catch (error) { next(error); }
  }

  async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      await authService.deleteUser(req.params.id);
      res.json({ message: 'User deleted' });
    } catch (error) { next(error); }
  }

  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await authService.getStats();
      res.json(stats);
    } catch (error) { next(error); }
  }
}

export const authController = new AuthController();
