import request from 'supertest';
import app from '../app';
import { reservationService } from '../services/reservation.service';
import { authService } from '../services/auth.service';
import { generateQrToken } from '../utils/jwt';
import jwt from 'jsonwebtoken';
import { config } from '../config';

// Mock Supabase client
jest.mock('../config/supabase', () => ({
  supabase: {
    auth: {
      admin: {
        createUser: jest.fn().mockImplementation((params) => {
          return Promise.resolve({
            data: { user: { id: 'mock-auth-id-' + Math.random() } },
            error: null,
          });
        }),
        updateUserById: jest.fn().mockResolvedValue({ data: {}, error: null }),
        deleteUser: jest.fn().mockResolvedValue({ data: {}, error: null }),
      },
      getUser: jest.fn().mockImplementation((token) => {
        if (token === 'token-employee-a') return Promise.resolve({ data: { user: { id: 'auth-user-a' } }, error: null });
        if (token === 'token-employee-b') return Promise.resolve({ data: { user: { id: 'auth-user-b' } }, error: null });
        if (token === 'token-driver-a') return Promise.resolve({ data: { user: { id: 'auth-driver-a' } }, error: null });
        if (token === 'token-driver-b') return Promise.resolve({ data: { user: { id: 'auth-driver-b' } }, error: null });
        if (token === 'token-organizer-a') return Promise.resolve({ data: { user: { id: 'auth-organizer-a' } }, error: null });
        if (token === 'token-organizer-b') return Promise.resolve({ data: { user: { id: 'auth-organizer-b' } }, error: null });
        if (token === 'token-admin') return Promise.resolve({ data: { user: { id: 'auth-admin' } }, error: null });
        return Promise.resolve({ data: { user: null }, error: new Error('Invalid token') });
      }),
    },
    channel: jest.fn().mockReturnValue({
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
      send: jest.fn(),
    }),
  },
  getSupabaseClient: jest.fn(),
}));

// Mock Database State
const mockUsers: any[] = [
  { id: 'user-a', authId: 'auth-user-a', email: 'a@example.com', firstName: 'Alice', lastName: 'A', role: 'EMPLOYEE', status: 'ACTIVE' },
  { id: 'user-b', authId: 'auth-user-b', email: 'b@example.com', firstName: 'Bob', lastName: 'B', role: 'EMPLOYEE', status: 'ACTIVE' },
  { id: 'driver-a-user', authId: 'auth-driver-a', email: 'driverA@example.com', firstName: 'Driver', lastName: 'One', role: 'DRIVER', status: 'ACTIVE' },
  { id: 'driver-b-user', authId: 'auth-driver-b', email: 'driverB@example.com', firstName: 'Driver', lastName: 'Two', role: 'DRIVER', status: 'ACTIVE' },
  { id: 'organizer-a-user', authId: 'auth-organizer-a', email: 'orgA@example.com', firstName: 'Org', lastName: 'One', role: 'ORGANIZER', status: 'ACTIVE' },
  { id: 'organizer-b-user', authId: 'auth-organizer-b', email: 'orgB@example.com', firstName: 'Org', lastName: 'Two', role: 'ORGANIZER', status: 'ACTIVE' },
  { id: 'admin-user', authId: 'auth-admin', email: 'admin@example.com', firstName: 'Admin', lastName: 'Super', role: 'SUPER_ADMIN', status: 'ACTIVE' },
];

let mockEvents: any[] = [];
let mockTrips: any[] = [];
let mockReservations: any[] = [];

// Transaction Queue to simulate PostgreSQL row-level locks
let txQueue = Promise.resolve();

jest.mock('../config/database', () => {
  const db = {
    user: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.id) return Promise.resolve(mockUsers.find(u => u.id === where.id) || null);
        if (where.authId) return Promise.resolve(mockUsers.find(u => u.authId === where.authId) || null);
        if (where.email) return Promise.resolve(mockUsers.find(u => u.email === where.email) || null);
        return Promise.resolve(null);
      }),
      findFirst: jest.fn().mockImplementation(({ where }) => {
        if (where.OR) {
          const ids = where.OR.map((o: any) => o.id || o.authId);
          return Promise.resolve(mockUsers.find(u => ids.includes(u.id) || ids.includes(u.authId)) || null);
        }
        return Promise.resolve(null);
      }),
      create: jest.fn().mockImplementation(({ data }) => {
        const newUser = { id: 'user-' + (mockUsers.length + 1), ...data };
        mockUsers.push(newUser);
        return Promise.resolve(newUser);
      }),
      update: jest.fn().mockImplementation(({ where, data }) => {
        const user = mockUsers.find(u => u.id === where.id);
        if (user) Object.assign(user, data);
        return Promise.resolve(user || null);
      }),
      count: jest.fn().mockImplementation(() => Promise.resolve(mockUsers.length)),
    },
    event: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        return Promise.resolve(mockEvents.find(e => e.id === where.id) || null);
      }),
    },
    trip: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        const trip = mockTrips.find(t => t.id === where.id);
        if (!trip) return Promise.resolve(null);
        const reservations = mockReservations.filter(r => r.tripId === trip.id && ['CONFIRMED', 'CHECKED_IN'].includes(r.status));
        return Promise.resolve({ ...trip, reservations });
      }),
      update: jest.fn().mockImplementation(({ where, data }) => {
        const trip = mockTrips.find(t => t.id === where.id);
        if (trip) Object.assign(trip, data);
        return Promise.resolve(trip);
      }),
    },
    reservation: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        const res = mockReservations.find(r => r.id === where.id);
        if (!res) return Promise.resolve(null);
        const event = mockEvents.find(e => e.id === res.eventId);
        const participant = mockUsers.find(u => u.id === res.participantId);
        const trip = mockTrips.find(t => t.id === res.tripId);
        return Promise.resolve({ ...res, event, participant, trip });
      }),
      findMany: jest.fn().mockImplementation(({ where }) => {
        let results = [...mockReservations];
        if (where?.participantId) results = results.filter(r => r.participantId === where.participantId);
        if (where?.tripId) results = results.filter(r => r.tripId === where.tripId);
        return Promise.resolve(results);
      }),
      count: jest.fn().mockImplementation(({ where }) => {
        let results = [...mockReservations];
        if (where?.eventId) results = results.filter(r => r.eventId === where.eventId);
        if (where?.participantId) results = results.filter(r => r.participantId === where.participantId);
        if (where?.status?.notIn) results = results.filter(r => !where.status.notIn.includes(r.status));
        return Promise.resolve(results.length);
      }),
      create: jest.fn().mockImplementation(({ data }) => {
        // Enforce partial unique index: (eventId, participantId) WHERE status NOT IN ('CANCELLED', 'REJECTED', 'NO_SHOW')
        const existingActive = mockReservations.find(
          r => r.eventId === data.eventId &&
               r.participantId === data.participantId &&
               !['CANCELLED', 'REJECTED', 'NO_SHOW'].includes(r.status)
        );
        if (existingActive) {
          const err: any = new Error('Unique constraint failed on the fields: (`eventId`,`participantId`)');
          err.code = 'P2002';
          throw err;
        }
        const newRes = { id: 'res-' + (mockReservations.length + 1), createdAt: new Date(), ...data };
        mockReservations.push(newRes);
        return Promise.resolve(newRes);
      }),
      update: jest.fn().mockImplementation(({ where, data }) => {
        const res = mockReservations.find(r => r.id === where.id);
        if (res) Object.assign(res, data);
        return Promise.resolve(res);
      }),
    },
    notification: {
      create: jest.fn().mockResolvedValue({ id: 'notif-1' }),
    },
    activityLog: {
      create: jest.fn().mockResolvedValue({ id: 'log-1' }),
    },
    reservationStatusHistory: {
      create: jest.fn().mockResolvedValue({ id: 'hist-1' }),
    },
    $queryRaw: jest.fn().mockResolvedValue([{ id: 'locked' }]),
    $transaction: jest.fn().mockImplementation(async (callback) => {
      // Simulate PostgreSQL row-level locking by serializing transactions targeting trips
      const runTx = async () => {
        if (typeof callback === 'function') {
          return callback(db);
        }
        return Promise.all(callback);
      };
      const res = txQueue.then(runTx);
      txQueue = res.catch(() => {});
      return res;
    }),
  };
  return { __esModule: true, default: db };
});

describe('P0 Production Gate Verification Suite', () => {
  beforeEach(() => {
    txQueue = Promise.resolve();
    mockEvents = [
      { id: 'event-org-a', name: 'Organizer A Event', status: 'PUBLISHED', date: new Date(), createdById: 'organizer-a-user' },
      { id: 'event-org-b', name: 'Organizer B Event', status: 'PUBLISHED', date: new Date(), createdById: 'organizer-b-user' },
    ];
    mockTrips = [
      {
        id: 'trip-1',
        name: 'Single-Seat Shuttle',
        status: 'SCHEDULED',
        vehicle: { id: 'veh-1', capacity: 1 },
        driverId: 'driver-a-user',
        driver: { id: 'driver-a-id', userId: 'driver-a-user' },
      },
      {
        id: 'trip-50',
        name: '50-Seat Bus',
        status: 'SCHEDULED',
        vehicle: { id: 'veh-50', capacity: 50 },
        driverId: 'driver-b-user',
        driver: { id: 'driver-b-id', userId: 'driver-b-user' },
      },
    ];
    mockReservations = [];
    jest.clearAllMocks();
  });

  // =========================================================================
  // 1. High-Concurrency Stress Tests (10 Iterations x 50 Requests)
  // =========================================================================
  describe('BOOKING-P0-01: High-Concurrency Seat Test (10 Iterations x 50 Requests)', () => {
    for (let iter = 1; iter <= 10; iter++) {
      it(`Iteration ${iter}/10: 50 concurrent requests for 1 seat -> Exactly 1 success, 49 rejected`, async () => {
        // Reset single-seat trip and reservations
        mockTrips[0] = {
          id: `trip-iter-${iter}`,
          name: `Shuttle Iter ${iter}`,
          status: 'SCHEDULED',
          vehicle: { id: 'veh-1', capacity: 1 },
          driverId: 'driver-a-user',
        };

        const NUM_REQUESTS = 50;
        const testUserIds = Array.from({ length: NUM_REQUESTS }, (_, i) => `user-iter-${iter}-${i}`);
        const testResIds = Array.from({ length: NUM_REQUESTS }, (_, i) => `res-iter-${iter}-${i}`);

        // Seed 50 pending reservations
        for (let i = 0; i < NUM_REQUESTS; i++) {
          mockReservations.push({
            id: testResIds[i],
            participantId: testUserIds[i],
            eventId: 'event-org-a',
            status: 'PENDING',
            passengerCount: 1,
          });
        }

        // Fire 50 concurrent seat-allocation requests
        const promises = testUserIds.map((userId, i) =>
          reservationService.joinExistingTrip(testResIds[i], `trip-iter-${iter}`, userId)
        );

        const results = await Promise.allSettled(promises);

        const successes = results.filter(r => r.status === 'fulfilled');
        const failures = results.filter(r => r.status === 'rejected');

        expect(successes.length).toBe(1);
        expect(failures.length).toBe(49);

        // Verify final occupied seats in database
        const confirmedReservations = mockReservations.filter(
          r => r.tripId === `trip-iter-${iter}` && r.status === 'CONFIRMED'
        );
        const totalOccupiedSeats = confirmedReservations.reduce((sum, r) => sum + (r.passengerCount || 1), 0);

        expect(totalOccupiedSeats).toBe(1);
        expect(totalOccupiedSeats).toBeLessThanOrEqual(mockTrips[0].vehicle.capacity);
      });
    }
  });

  // =========================================================================
  // 2. Multi-Seat Concurrency Tests
  // =========================================================================
  describe('BOOKING-P0-03 & 04: Multi-Seat and Multi-Passenger Concurrency', () => {
    it('Multi-Seat (100 users for 50 seats) -> Exactly 50 succeed, 50 fail, occupiedSeats = 50', async () => {
      const NUM_REQUESTS = 100;
      const CAPACITY = 50;
      const testUserIds = Array.from({ length: NUM_REQUESTS }, (_, i) => `user-multi-${i}`);
      const testResIds = Array.from({ length: NUM_REQUESTS }, (_, i) => `res-multi-${i}`);

      for (let i = 0; i < NUM_REQUESTS; i++) {
        mockReservations.push({
          id: testResIds[i],
          participantId: testUserIds[i],
          eventId: 'event-org-a',
          status: 'PENDING',
          passengerCount: 1,
        });
      }

      const promises = testUserIds.map((userId, i) =>
        reservationService.joinExistingTrip(testResIds[i], 'trip-50', userId)
      );

      const results = await Promise.allSettled(promises);
      const successes = results.filter(r => r.status === 'fulfilled');
      const failures = results.filter(r => r.status === 'rejected');

      expect(successes.length).toBe(50);
      expect(failures.length).toBe(50);

      const confirmed = mockReservations.filter(r => r.tripId === 'trip-50' && r.status === 'CONFIRMED');
      const totalOccupied = confirmed.reduce((sum, r) => sum + (r.passengerCount || 1), 0);
      expect(totalOccupied).toBe(CAPACITY);
    });

    it('Multi-Passenger (10 requests x 6 passengers on capacity 50) -> Database never exceeds 50 seats', async () => {
      const NUM_REQUESTS = 10;
      const PASSENGERS_PER_REQ = 6; // 10 x 6 = 60 seats requested for capacity 50
      const testUserIds = Array.from({ length: NUM_REQUESTS }, (_, i) => `user-group-${i}`);
      const testResIds = Array.from({ length: NUM_REQUESTS }, (_, i) => `res-group-${i}`);

      for (let i = 0; i < NUM_REQUESTS; i++) {
        mockReservations.push({
          id: testResIds[i],
          participantId: testUserIds[i],
          eventId: 'event-org-a',
          status: 'PENDING',
          passengerCount: PASSENGERS_PER_REQ,
        });
      }

      const promises = testUserIds.map((userId, i) =>
        reservationService.joinExistingTrip(testResIds[i], 'trip-50', userId)
      );

      const results = await Promise.allSettled(promises);
      const successes = results.filter(r => r.status === 'fulfilled');
      const failures = results.filter(r => r.status === 'rejected');

      // 50 / 6 = 8 groups of 6 = 48 passengers (2 seats remaining, 9th group of 6 cannot fit)
      expect(successes.length).toBe(8);
      expect(failures.length).toBe(2);

      const confirmed = mockReservations.filter(r => r.tripId === 'trip-50' && r.status === 'CONFIRMED');
      const totalOccupied = confirmed.reduce((sum, r) => sum + (r.passengerCount || 1), 0);
      expect(totalOccupied).toBe(48);
      expect(totalOccupied).toBeLessThanOrEqual(50);
    });
  });

  // =========================================================================
  // 3. Duplicate Active Reservation Constraint Test
  // =========================================================================
  describe('BOOKING-P0-02: Duplicate Active Reservation Constraint', () => {
    it('50 simultaneous creation requests for same (eventId, participantId) -> Exactly 1 active reservation', async () => {
      const NUM_SIMULTANEOUS = 50;
      const promises = Array.from({ length: NUM_SIMULTANEOUS }, () =>
        reservationService.create({
          participantId: 'user-a',
          eventId: 'event-org-a',
          date: new Date(),
          time: new Date(),
          passengerCount: 1,
          skipMatching: true,
        })
      );

      const results = await Promise.allSettled(promises);
      const successes = results.filter(r => r.status === 'fulfilled');
      const failures = results.filter(r => r.status === 'rejected');

      expect(successes.length).toBe(1);
      expect(failures.length).toBe(49);

      // Verify active count in DB
      const active = mockReservations.filter(
        r => r.eventId === 'event-org-a' && r.participantId === 'user-a' && !['CANCELLED', 'REJECTED', 'NO_SHOW'].includes(r.status)
      );
      expect(active.length).toBe(1);
    });

    it('Cancelling active reservation allows creating a new reservation for same event', async () => {
      // 1. Create first reservation
      const res1 = await reservationService.create({
        participantId: 'user-b',
        eventId: 'event-org-a',
        date: new Date(),
        time: new Date(),
        passengerCount: 1,
        skipMatching: true,
      });
      expect(res1.status).toBe('PENDING');

      // 2. Cancel it
      await reservationService.cancel(res1.id, 'user-b');
      expect(mockReservations.find(r => r.id === res1.id)?.status).toBe('CANCELLED');

      // 3. Create second reservation for same event -> Succeeds!
      const res2 = await reservationService.create({
        participantId: 'user-b',
        eventId: 'event-org-a',
        date: new Date(),
        time: new Date(),
        passengerCount: 1,
        skipMatching: true,
      });
      expect(res2.id).toBeDefined();
      expect(res2.status).toBe('PENDING');
    });
  });

  // =========================================================================
  // 4. Authorization Matrix HTTP Tests
  // =========================================================================
  describe('IDOR & Authorization Matrix via HTTP', () => {
    beforeEach(() => {
      mockReservations = [
        {
          id: 'res-alice',
          participantId: 'user-a',
          eventId: 'event-org-a',
          tripId: 'trip-1',
          status: 'CONFIRMED',
          reservationCode: 'SHR-ALICE',
        },
        {
          id: 'res-bob',
          participantId: 'user-b',
          eventId: 'event-org-b',
          tripId: 'trip-50',
          status: 'CONFIRMED',
          reservationCode: 'SHR-BOB',
        },
      ];
    });

    it('Employee A requesting Employee B reservation -> 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/reservations/res-bob')
        .set('Authorization', 'Bearer token-employee-a');
      expect(res.status).toBe(403);
    });

    it('Employee A requesting own reservation -> 200 OK', async () => {
      const res = await request(app)
        .get('/api/reservations/res-alice')
        .set('Authorization', 'Bearer token-employee-a');
      expect(res.status).toBe(200);
      expect(res.body.id).toBe('res-alice');
    });

    it('Driver A requesting reservation on Driver A assigned trip -> 200 OK', async () => {
      const res = await request(app)
        .get('/api/reservations/res-alice')
        .set('Authorization', 'Bearer token-driver-a');
      expect(res.status).toBe(200);
    });

    it('Driver A requesting reservation on Driver B assigned trip -> 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/reservations/res-bob')
        .set('Authorization', 'Bearer token-driver-a');
      expect(res.status).toBe(403);
    });

    it('Organizer A requesting reservation on Organizer A event -> 200 OK', async () => {
      const res = await request(app)
        .get('/api/reservations/res-alice')
        .set('Authorization', 'Bearer token-organizer-a');
      expect(res.status).toBe(200);
    });

    it('Organizer A requesting reservation on Organizer B event -> 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/reservations/res-bob')
        .set('Authorization', 'Bearer token-organizer-a');
      expect(res.status).toBe(403);
    });

    it('Super Admin requesting any reservation -> 200 OK', async () => {
      const res = await request(app)
        .get('/api/reservations/res-bob')
        .set('Authorization', 'Bearer token-admin');
      expect(res.status).toBe(200);
    });
  });

  // =========================================================================
  // 5. Public Registration Role Tampering via HTTP
  // =========================================================================
  describe('AUTH-P0-01 & 04: Public Registration Role Immunity', () => {
    const prohibitedRoles = ['SUPER_ADMIN', 'ORGANIZER', 'DRIVER'];

    for (const role of prohibitedRoles) {
      it(`Registration with role="${role}" strictly assigns EMPLOYEE`, async () => {
        const res = await request(app)
          .post('/api/auth/register')
          .send({
            email: `test-${role.toLowerCase()}@example.com`,
            password: 'StrongPassword123!',
            firstName: 'Test',
            lastName: 'User',
            role,
            isAdmin: true,
            permissions: ['*'],
          });

        expect(res.status).toBe(201);
        expect(res.body.role).toBe('EMPLOYEE');
      });
    }
  });

  // =========================================================================
  // 6. QR Boarding Security Scenarios
  // =========================================================================
  describe('QR Security Verification', () => {
    it('Valid QR + CONFIRMED reservation -> Success', async () => {
      mockReservations.push({
        id: 'res-valid',
        participantId: 'user-a',
        eventId: 'event-org-a',
        status: 'CONFIRMED',
        reservationCode: 'SHR-VALID',
      });
      const token = generateQrToken({
        sub: 'res-valid',
        code: 'SHR-VALID',
        eventId: 'event-org-a',
        participantId: 'user-a',
        date: new Date(),
      });

      const res = await reservationService.validateScan(token);
      expect(res.status).toBe('VALID');
      expect(mockReservations.find(r => r.id === 'res-valid')?.status).toBe('CHECKED_IN');
    });

    it('Same QR second time -> ALREADY_USED', async () => {
      mockReservations.push({
        id: 'res-valid-used',
        participantId: 'user-a',
        eventId: 'event-org-a',
        status: 'CHECKED_IN',
        reservationCode: 'SHR-USED',
      });
      const token = generateQrToken({
        sub: 'res-valid-used',
        code: 'SHR-USED',
        eventId: 'event-org-a',
        participantId: 'user-a',
        date: new Date(),
      });

      const res = await reservationService.validateScan(token);
      expect(res.status).toBe('ALREADY_USED');
    });

    it('Valid QR + CANCELLED reservation -> Rejected INVALID', async () => {
      mockReservations.push({
        id: 'res-cancelled',
        participantId: 'user-a',
        eventId: 'event-org-a',
        status: 'CANCELLED',
        reservationCode: 'SHR-CAN',
      });
      const token = generateQrToken({
        sub: 'res-cancelled',
        code: 'SHR-CAN',
        eventId: 'event-org-a',
        participantId: 'user-a',
        date: new Date(),
      });

      const res = await reservationService.validateScan(token);
      expect(res.status).toBe('INVALID');
    });

    it('Forged QR token -> Rejected INVALID', async () => {
      const forgedToken = jwt.sign(
        { sub: 'res-fake', code: 'SHR-FAKE', eventId: 'event-1', participantId: 'user-a' },
        'wrong-signing-secret'
      );
      const res = await reservationService.validateScan(forgedToken);
      expect(res.status).toBe('INVALID');
    });
  });
});
