import prisma from '../config/database';
import { supabase } from '../config/supabase';
import { AppError } from '../middleware/error.middleware';

class AuthService {
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { driverProfile: { include: { vehicle: true } } },
    });
    if (!user) throw new AppError('User not found', 404);
    return user;
  }

  async updateProfile(userId: string, data: { firstName?: string; lastName?: string; phone?: string; avatar?: string }) {
    const user = await prisma.user.update({
      where: { id: userId },
      data,
    });
    return user;
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('User not found', 404);
    const authId = user.authId;
    if (!authId) throw new AppError('No linked auth account', 400);
    const { data: { user: authUser }, error: signInError } = await supabase.auth.admin.getUserById(authId);
    if (signInError || !authUser) throw new AppError('Authentication failed', 401);
    const { error } = await supabase.auth.admin.updateUserById(authId, { password: newPassword });
    if (error) throw new AppError(error.message, 400);
  }

  async register(data: { email: string; password: string; firstName: string; lastName: string; phone?: string; role?: string }) {
    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) throw new AppError('An account with this email already exists', 400);

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role || 'EMPLOYEE',
      },
    });

    if (authError) {
      throw new AppError(authError.message, 400);
    }

    const user = await prisma.user.create({
      data: {
        authId: authData.user.id,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || null,
        role: (data.role as any) || 'EMPLOYEE',
      },
    });

    return user;
  }

  async syncUser(authId: string, email: string, userMeta?: { firstName?: string; lastName?: string; role?: string }) {
    let user = await prisma.user.findUnique({ where: { authId } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          authId,
          email,
          firstName: userMeta?.firstName || email.split('@')[0],
          lastName: userMeta?.lastName || '',
          role: (userMeta?.role as any) || 'EMPLOYEE',
        },
      });
    } else if (user.email !== email) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { email },
      });
    }

    // Auto-confirm email in Supabase Auth (dev mode)
    await supabase.auth.admin.updateUserById(authId, { email_confirm: true }).catch(() => {});

    return user;
  }

  async listUsers(page = 1, limit = 10, search = '') {
    const where: any = {};
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async deleteUser(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('User not found', 404);

    if (user.authId) {
      await supabase.auth.admin.deleteUser(user.authId).catch(() => {});
    }

    await prisma.user.delete({ where: { id: userId } });
  }

  async getStats() {
    const [totalUsers, activeUsers, drivers, admins, organizers, employees] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: 'ACTIVE' } }),
      prisma.user.count({ where: { role: 'DRIVER' } }),
      prisma.user.count({ where: { role: 'SUPER_ADMIN' } }),
      prisma.user.count({ where: { role: 'ORGANIZER' } }),
      prisma.user.count({ where: { role: 'EMPLOYEE' } }),
    ]);

    return { totalUsers, activeUsers, drivers, admins, organizers, employees };
  }
}

export const authService = new AuthService();
