import prisma from '../config/database';
import { AppError } from '../middleware/error.middleware';

export class VehicleService {
  async findAll(params: { page?: number; limit?: number; search?: string; status?: string }) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.search) {
      where.OR = [
        { busNumber: { contains: params.search, mode: 'insensitive' } },
        { plateNumber: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    if (params.status) where.status = params.status;

    const [vehicles, total] = await Promise.all([
      prisma.vehicle.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: { driver: { include: { user: { select: { id: true, firstName: true, lastName: true } } } } },
      }),
      prisma.vehicle.count({ where }),
    ]);
    return { data: vehicles, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string) {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: { driver: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } } } } },
    });
    if (!vehicle) throw new AppError('Vehicle not found', 404);
    return vehicle;
  }

  async create(data: any) {
    const cleanData = { ...data };
    if (typeof cleanData.capacity === 'string') cleanData.capacity = parseInt(cleanData.capacity, 10);
    if (typeof cleanData.year === 'string') cleanData.year = parseInt(cleanData.year, 10);
    const validStatuses = ['AVAILABLE', 'IN_USE', 'MAINTENANCE', 'OUT_OF_SERVICE'];
    if (!cleanData.status || !validStatuses.includes(cleanData.status)) {
      cleanData.status = 'AVAILABLE';
    }
    return prisma.vehicle.create({ data: cleanData });
  }

  async update(id: string, data: any) {
    const cleanData = { ...data };
    if (typeof cleanData.capacity === 'string') cleanData.capacity = parseInt(cleanData.capacity, 10);
    if (typeof cleanData.year === 'string') cleanData.year = parseInt(cleanData.year, 10);
    const validStatuses = ['AVAILABLE', 'IN_USE', 'MAINTENANCE', 'OUT_OF_SERVICE'];
    if (cleanData.status && !validStatuses.includes(cleanData.status)) {
      cleanData.status = 'AVAILABLE';
    }
    return prisma.vehicle.update({ where: { id }, data: cleanData }).catch(() => { throw new AppError('Vehicle not found', 404); });
  }

  async delete(id: string) {
    const vehicle = await prisma.vehicle.findUnique({ where: { id } });
    if (!vehicle) throw new AppError('Vehicle not found', 404);
    await prisma.$transaction([
      prisma.trip.deleteMany({ where: { vehicleId: id } }),
      prisma.vehicle.delete({ where: { id } }),
    ]);
  }

  async getAvailable() {
    return prisma.vehicle.findMany({ where: { status: 'AVAILABLE' }, include: { driver: true } });
  }
}

export const vehicleService = new VehicleService();
