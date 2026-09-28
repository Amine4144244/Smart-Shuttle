import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';
import prisma from '../config/database';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];

    const { data: { user: authUser }, error } = await supabase.auth.getUser(token);
    if (error || !authUser) {
      return res.status(401).json({ message: error?.message || 'Invalid or expired token.' });
    }

    const user = await prisma.user.findUnique({ where: { authId: authUser.id } });
    if (!user || user.status !== 'ACTIVE') {
      return res.status(401).json({ message: 'User not found or inactive.' });
    }

    req.user = { userId: user.id, email: user.email, role: user.role };
    next();
  } catch (error) {
    return res.status(500).json({ message: 'Authentication failed.' });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden. Insufficient permissions.' });
    }
    next();
  };
};
