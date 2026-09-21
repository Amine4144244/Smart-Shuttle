import prisma from '../config/database';
import { AppError } from '../middleware/error.middleware';

export class EventService {
  async findAll(params: { page?: number; limit?: number; search?: string; status?: string; organizerId?: string }) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { address: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    if (params.status) where.status = params.status;
    if (params.organizerId) where.createdById = params.organizerId;

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
          _count: { select: { reservations: true, routes: true, pickupPoints: true } },
        },
      }),
      prisma.event.count({ where }),
    ]);

    return { data: events, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string) {
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        routes: { include: { stops: { orderBy: { order: 'asc' } }, _count: { select: { trips: true } } } },
        pickupPoints: true,
        _count: { select: { reservations: true } },
      },
    });
    if (!event) throw new AppError('Event not found', 404);
    return event;
  }

  async create(data: any) {
    const event = await prisma.event.create({
      data,
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        _count: { select: { reservations: true, routes: true, pickupPoints: true } },
      },
    });
    return event;
  }

  async update(id: string, data: any) {
    const event = await prisma.event.update({ where: { id }, data }).catch(() => {
      throw new AppError('Event not found', 404);
    });
    return event;
  }

  async delete(id: string) {
    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) throw new AppError('Event not found', 404);

    const routes = await prisma.route.findMany({ where: { eventId: id }, select: { id: true } });
    const routeIds = routes.map((r) => r.id);

    const trips = await prisma.trip.findMany({ where: { routeId: { in: routeIds } }, select: { id: true } });
    const tripIds = trips.map((t) => t.id);

    await prisma.$transaction([
      prisma.trackingLog.deleteMany({ where: { tripId: { in: tripIds } } }),
      prisma.reservationStatusHistory.deleteMany({ where: { reservation: { eventId: id } } }),
      prisma.waitingList.deleteMany({ where: { eventId: id } }),
      prisma.reservation.deleteMany({ where: { eventId: id } }),
      prisma.sharedPickup.deleteMany({ where: { eventId: id } }),
      prisma.trip.deleteMany({ where: { id: { in: tripIds } } }),
      prisma.routeStop.deleteMany({ where: { routeId: { in: routeIds } } }),
      prisma.route.deleteMany({ where: { eventId: id } }),
      prisma.pickupPoint.deleteMany({ where: { eventId: id } }),
      prisma.event.delete({ where: { id } }),
    ]);
  }

  async getStats() {
    const [total, draft, published, ongoing, completed, cancelled] = await Promise.all([
      prisma.event.count(),
      prisma.event.count({ where: { status: 'DRAFT' } }),
      prisma.event.count({ where: { status: 'PUBLISHED' } }),
      prisma.event.count({ where: { status: 'ONGOING' } }),
      prisma.event.count({ where: { status: 'COMPLETED' } }),
      prisma.event.count({ where: { status: 'CANCELLED' } }),
    ]);
    return { total, draft, published, ongoing, completed, cancelled };
  }

  async getUpcoming(limit = 5) {
    return prisma.event.findMany({
      where: { date: { gte: new Date() }, status: { in: ['PUBLISHED', 'ONGOING'] } },
      orderBy: { date: 'asc' },
      take: limit,
      include: { _count: { select: { reservations: true } } },
    });
  }
}

export const eventService = new EventService();
