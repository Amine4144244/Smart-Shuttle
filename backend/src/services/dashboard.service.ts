import prisma from '../config/database';

export class DashboardService {
  async getAdminStats() {
    const [
      totalEvents,
      totalParticipants,
      totalDrivers,
      totalVehicles,
      todayTrips,
      activeTrips,
      completedTrips,
      totalReservations,
      pendingReservations,
      confirmedReservations,
      checkedInReservations,
      rejectedReservations,
      cancelledReservations,
      recentReservations,
      upcomingEvents,
      recentActivity,
      activeTripBoarding,
    ] = await Promise.all([
      prisma.event.count(),
      prisma.user.count({ where: { role: 'EMPLOYEE' } }),
      prisma.driver.count(),
      prisma.vehicle.count(),
      prisma.trip.count({
        where: { date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      }),
      prisma.trip.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.trip.count({ where: { status: 'COMPLETED' } }),
      prisma.reservation.count(),
      prisma.reservation.count({ where: { status: 'PENDING' } }),
      prisma.reservation.count({ where: { status: 'CONFIRMED' } }),
      prisma.reservation.count({ where: { status: 'CHECKED_IN' } }),
      prisma.reservation.count({ where: { status: 'REJECTED' } }),
      prisma.reservation.count({ where: { status: 'CANCELLED' } }),
      prisma.reservation.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          participant: { select: { id: true, firstName: true, lastName: true, email: true } },
          event: { select: { id: true, name: true } },
        },
      }),
      prisma.event.findMany({
        where: { date: { gte: new Date() }, status: { in: ['PUBLISHED', 'ONGOING'] } },
        take: 5,
        orderBy: { date: 'asc' },
        include: { _count: { select: { reservations: true } } },
      }),
      prisma.activityLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
      }),
      prisma.trip.findFirst({
        where: { status: 'IN_PROGRESS' },
        include: {
          vehicle: true,
          route: { include: { event: true } },
          _count: { select: { reservations: true } },
        },
        orderBy: { departureTime: 'desc' },
      }),
    ]);

    let activeBoardingStats = null;
    if (activeTripBoarding) {
      const checkedIn = await prisma.reservation.count({
        where: { tripId: activeTripBoarding.id, status: 'CHECKED_IN' },
      });
      const confirmed = await prisma.reservation.count({
        where: { tripId: activeTripBoarding.id, status: 'CONFIRMED' },
      });
      const capacity = activeTripBoarding.vehicle?.capacity || 1;
      activeBoardingStats = {
        tripId: activeTripBoarding.id,
        eventName: activeTripBoarding.route?.event?.name || '',
        routeName: activeTripBoarding.route?.name || '',
        busNumber: activeTripBoarding.vehicle?.busNumber || '',
        capacity,
        confirmed,
        checkedIn,
        remaining: capacity - checkedIn,
        progress: Math.round((checkedIn / capacity) * 100),
      };
    }

    const reservationsByStatus = await prisma.reservation.groupBy({
      by: ['status'],
      _count: true,
    });

    const tripsByStatus = await prisma.trip.groupBy({
      by: ['status'],
      _count: true,
    });

    const reservationsByMonth = await prisma.$queryRaw`
      SELECT TO_CHAR("createdAt", 'Mon') as month, COUNT(*)::int as count
      FROM reservations
      WHERE "createdAt" >= NOW() - INTERVAL '12 months'
      GROUP BY month
      ORDER BY MIN("createdAt")
    `;

    return {
      overview: {
        totalEvents,
        totalParticipants,
        totalDrivers,
        totalVehicles,
        todayTrips,
        activeTrips,
        completedTrips,
        totalReservations,
        pendingReservations,
        confirmedReservations,
        checkedInReservations,
        rejectedReservations,
        cancelledReservations,
      },
      reservationStats: {
        pending: pendingReservations,
        confirmed: confirmedReservations,
        checkedIn: checkedInReservations,
        rejected: rejectedReservations,
        cancelled: cancelledReservations,
        total: totalReservations,
      },
      reservationsByStatus,
      tripsByStatus,
      reservationsByMonth,
      recentReservations,
      upcomingEvents,
      recentActivity,
      activeBoarding: activeBoardingStats,
    };
  }

  async getDriverStats(driverId: string) {
    const [todayTrips, totalTrips, totalPassengers, activeTrip] = await Promise.all([
      prisma.trip.count({
        where: { driverId, date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      }),
      prisma.trip.count({ where: { driverId } }),
      prisma.reservation.count({
        where: { trip: { driverId }, status: { in: ['CHECKED_IN', 'COMPLETED'] } },
      }),
      prisma.trip.findFirst({
        where: { driverId, status: { in: ['IN_PROGRESS', 'SCHEDULED', 'DELAYED'] } },
        orderBy: [{ status: 'asc' }, { departureTime: 'asc' }],
        include: { route: { include: { event: true, stops: { orderBy: { order: 'asc' } } } }, vehicle: true, reservations: { include: { participant: true, pickupPoint: true } } },
      }),
    ]);

    let boardingStats = null;
    if (activeTrip) {
      const checkedIn = await prisma.reservation.count({
        where: { tripId: activeTrip.id, status: 'CHECKED_IN' },
      });
      const confirmed = await prisma.reservation.count({
        where: { tripId: activeTrip.id, status: 'CONFIRMED' },
      });
      const capacity = activeTrip.vehicle?.capacity || 1;
      boardingStats = {
        checkedIn,
        confirmed,
        totalConfirmed: confirmed + checkedIn,
        capacity,
        remaining: capacity - checkedIn,
        progress: Math.round((checkedIn / capacity) * 100),
        eventName: activeTrip.route?.event?.name || '',
        busNumber: activeTrip.vehicle?.busNumber || '',
      };
    }

    return { todayTrips, totalTrips, totalPassengers, activeTrip, boardingStats };
  }

  async getParticipantStats(participantId: string) {
    const [totalReservations, upcomingTrips, completedTrips, cancelledTrips] = await Promise.all([
      prisma.reservation.count({ where: { participantId } }),
      prisma.reservation.count({
        where: { participantId, status: { in: ['PENDING', 'CONFIRMED'] } },
      }),
      prisma.reservation.count({ where: { participantId, status: 'COMPLETED' } }),
      prisma.reservation.count({ where: { participantId, status: 'CANCELLED' } }),
    ]);

    return { totalReservations, upcomingTrips, completedTrips, cancelledTrips };
  }
}

export const dashboardService = new DashboardService();
