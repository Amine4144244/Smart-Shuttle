import axios from 'axios';
import { supabase } from '@/lib/supabase';

const DEFAULT_API_URL = '/api';
const API_URL = import.meta.env.VITE_API_URL || DEFAULT_API_URL;

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.auth.refreshSession();
        const { data: { session: refreshed } } = await supabase.auth.getSession();
        if (refreshed?.access_token) {
          error.config.headers.Authorization = `Bearer ${refreshed.access_token}`;
          return api(error.config);
        }
      }
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

export const authApi = {
  register: (data: any) => api.post('/auth/register', data),
  syncUser: (data: any) => api.post('/auth/sync', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data: any) => api.put('/auth/profile', data),
  changePassword: (data: { currentPassword: string; newPassword: string; confirmPassword: string }) => api.put('/auth/change-password', data),
};

export const usersApi = {
  getAll: (params?: any) => api.get('/users', { params }),
  getById: (id: string) => api.get(`/users/${id}`),
  update: (id: string, data: any) => api.put(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
  getStats: () => api.get('/users/stats'),
};

export const eventsApi = {
  getAll: (params?: any) => api.get('/events', { params }),
  getById: (id: string) => api.get(`/events/${id}`),
  create: (data: any) => api.post('/events', data),
  update: (id: string, data: any) => api.put(`/events/${id}`, data),
  delete: (id: string) => api.delete(`/events/${id}`),
  getStats: () => api.get('/events/stats'),
  getUpcoming: () => api.get('/events/upcoming'),
};

export const driversApi = {
  getAll: (params?: any) => api.get('/drivers', { params }),
  getById: (id: string) => api.get(`/drivers/${id}`),
  create: (data: any) => api.post('/drivers', data),
  update: (id: string, data: any) => api.put(`/drivers/${id}`, data),
  delete: (id: string) => api.delete(`/drivers/${id}`),
  getTodayTrips: (id: string) => api.get(`/drivers/${id}/today-trips`),
};

export const vehiclesApi = {
  getAll: (params?: any) => api.get('/vehicles', { params }),
  getById: (id: string) => api.get(`/vehicles/${id}`),
  create: (data: any) => api.post('/vehicles', data),
  update: (id: string, data: any) => api.put(`/vehicles/${id}`, data),
  delete: (id: string) => api.delete(`/vehicles/${id}`),
  getAvailable: () => api.get('/vehicles/available'),
};

export const routesApi = {
  getAll: (params?: any) => api.get('/routes', { params }),
  getById: (id: string) => api.get(`/routes/${id}`),
  create: (data: any) => api.post('/routes', data),
  update: (id: string, data: any) => api.put(`/routes/${id}`, data),
  delete: (id: string) => api.delete(`/routes/${id}`),
};

export const pickupPointsApi = {
  getAll: (params?: any) => api.get('/pickup-points', { params }),
  getById: (id: string) => api.get(`/pickup-points/${id}`),
  create: (data: any) => api.post('/pickup-points', data),
  update: (id: string, data: any) => api.put(`/pickup-points/${id}`, data),
  delete: (id: string) => api.delete(`/pickup-points/${id}`),
};

export const reservationsApi = {
  getAll: (params?: any) => api.get('/reservations', { params }),
  getById: (id: string) => api.get(`/reservations/${id}`),
  create: (data: any) => api.post('/reservations', data),
  update: (id: string, data: any) => api.put(`/reservations/${id}`, data),
  cancel: (id: string) => api.put(`/reservations/${id}/cancel`),
  approve: (id: string) => api.post(`/reservations/${id}/approve`),
  reject: (id: string) => api.post(`/reservations/${id}/reject`),
  getMyReservations: () => api.get('/reservations/my-reservations'),
  getStats: () => api.get('/reservations/stats'),
  validateQR: (token: string, scanData?: any) => api.post('/reservations/validate-qr', { token, ...scanData }),
  findMatches: (data: any) => api.post('/reservations/find-matches', data),
  joinTrip: (reservationId: string, tripId: string) => api.post('/reservations/join-trip', { reservationId, tripId }),
  getWaitingList: (params?: any) => api.get('/reservations/waiting-list/list', { params }),
  getSharedPickups: (eventId: string) => api.get('/reservations/shared-pickups/list', { params: { eventId } }),
};

export const tripsApi = {
  getAll: (params?: any) => api.get('/trips', { params }),
  getById: (id: string) => api.get(`/trips/${id}`),
  create: (data: any) => api.post('/trips', data),
  update: (id: string, data: any) => api.put(`/trips/${id}`, data),
  delete: (id: string) => api.delete(`/trips/${id}`),
  startTrip: (id: string) => api.patch(`/trips/${id}/start`),
  completeTrip: (id: string) => api.patch(`/trips/${id}/complete`),
  delayTrip: (id: string, delayMinutes: number) => api.patch(`/trips/${id}/delay`, { delayMinutes }),
  getActive: () => api.get('/trips/active'),
};

export const notificationsApi = {
  getAll: (params?: any) => api.get('/notifications', { params }),
  markAsRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  delete: (id: string) => api.delete(`/notifications/${id}`),
};

export const dashboardApi = {
  getAdmin: () => api.get('/dashboard/admin'),
  getDriver: () => api.get('/dashboard/driver'),
  getParticipant: () => api.get('/dashboard/participant'),
};

export const reportsApi = {
  getDaily: (date?: string) => api.get('/reports/daily', { params: { date } }),
  getWeekly: () => api.get('/reports/weekly'),
  getMonthly: () => api.get('/reports/monthly'),
  getRouteAnalytics: () => api.get('/reports/routes'),
  getTripsPerDay: (days?: number) => api.get('/reports/trips-per-day', { params: { days } }),
  getDriverPerformance: () => api.get('/reports/driver-performance'),
  getVehicleUsage: () => api.get('/reports/vehicle-usage'),
  getOccupancyStats: () => api.get('/reports/occupancy'),
};

export const trackingApi = {
  getActiveShuttles: () => api.get('/tracking/active'),
  getDriverCurrentTrip: () => api.get('/tracking/driver/current'),
  getTripHistory: (tripId: string) => api.get(`/tracking/${tripId}/history`),
  replayTrip: (tripId: string) => api.get(`/tracking/${tripId}/replay`),
  updateLocation: (tripId: string, data: any) => api.post(`/tracking/${tripId}/location`, data),
  changeTripStatus: (tripId: string, status: string) => api.patch(`/tracking/${tripId}/status`, { status }),
};

export const ticketsApi = {
  getTicket: (id: string) => api.get(`/tickets/${id}`),
};

export const driverApi = {
  scanQR: (token: string) => api.post('/reservations/scan', { token }),
  validateBoarding: (reservationId: string) => api.post('/reservations/validate-boarding', { reservationId }),
};
