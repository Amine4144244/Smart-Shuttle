import prisma from '../config/database';
import { AppError } from '../middleware/error.middleware';

export class RouteService {
  async findAll(params: { page?: number; limit?: number; eventId?: string; search?: string }) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.eventId) where.eventId = params.eventId;
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { origin: { contains: params.search, mode: 'insensitive' } },
        { destination: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [routes, total] = await Promise.all([
      prisma.route.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          stops: { orderBy: { order: 'asc' } },
          event: { select: { id: true, name: true } },
          _count: { select: { trips: true } },
        },
      }),
      prisma.route.count({ where }),
    ]);
    return { data: routes, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string) {
    const route = await prisma.route.findUnique({
      where: { id },
      include: { stops: { orderBy: { order: 'asc' } }, event: true, trips: { take: 5, orderBy: { date: 'desc' } } },
    });
    if (!route) throw new AppError('Route not found', 404);
    return route;
  }

  async create(data: any) {
    const { stops, ...routeData } = data;
    const route = await prisma.route.create({
      data: {
        ...routeData,
        stops: stops ? { create: stops } : undefined,
      },
      include: { stops: { orderBy: { order: 'asc' } } },
    });
    return route;
  }

  async update(id: string, data: any) {
    const { stops, ...routeData } = data;
    if (stops) {
      await prisma.routeStop.deleteMany({ where: { routeId: id } });
      await prisma.routeStop.createMany({
        data: stops.map((s: any) => ({ ...s, routeId: id })),
      });
    }
    const route = await prisma.route.update({ where: { id }, data: routeData, include: { stops: { orderBy: { order: 'asc' } } } }).catch(() => {
      throw new AppError('Route not found', 404);
    });
    return route;
  }

  async delete(id: string) {
    const route = await prisma.route.findUnique({ where: { id } });
    if (!route) throw new AppError('Route not found', 404);

    const trips = await prisma.trip.findMany({ where: { routeId: id }, select: { id: true } });
    const tripIds = trips.map((t) => t.id);

    await prisma.$transaction([
      prisma.trackingLog.deleteMany({ where: { tripId: { in: tripIds } } }),
      prisma.reservation.updateMany({ where: { tripId: { in: tripIds } }, data: { tripId: null } }),
      prisma.reservation.updateMany({ where: { routeId: id }, data: { routeId: null } }),
      prisma.trip.deleteMany({ where: { routeId: id } }),
      prisma.routeStop.deleteMany({ where: { routeId: id } }),
      prisma.route.delete({ where: { id } }),
    ]);
  }
}

export const routeService = new RouteService();
