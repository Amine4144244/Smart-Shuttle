import { authService } from '../services/auth.service';

jest.mock('../config/database', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn().mockResolvedValue(null),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      delete: jest.fn().mockResolvedValue({}),
    },
    activityLog: { create: jest.fn().mockResolvedValue({}) },
  },
}));

jest.mock('../config/supabase', () => ({
  supabase: {
    auth: {
      admin: {
        getUserById: jest.fn().mockResolvedValue({ data: { user: { id: 'auth-123' } }, error: null }),
        updateUserById: jest.fn().mockResolvedValue({ data: null, error: null }),
        deleteUser: jest.fn().mockResolvedValue({ data: null, error: null }),
      },
    },
  },
}));

import prisma from '../config/database';

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('syncUser', () => {
    it('should create a new user if not exists', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: '1', authId: 'auth-123', email: 'test@test.com',
        firstName: 'John', lastName: 'Doe', role: 'EMPLOYEE',
      });

      const result = await authService.syncUser('auth-123', 'test@test.com', {
        firstName: 'John', lastName: 'Doe',
      });

      expect(prisma.user.create).toHaveBeenCalled();
      expect(result.email).toBe('test@test.com');
    });

    it('should return existing user', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        id: '1', authId: 'auth-123', email: 'test@test.com',
        firstName: 'John', lastName: 'Doe', role: 'EMPLOYEE',
      });

      const result = await authService.syncUser('auth-123', 'test@test.com');
      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(result.email).toBe('test@test.com');
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: '1', email: 'test@test.com', firstName: 'John', lastName: 'Doe',
      });

      const result = await authService.getProfile('1');
      expect(result.email).toBe('test@test.com');
    });
  });
});
