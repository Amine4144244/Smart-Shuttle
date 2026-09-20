import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Role } from '@/types';
import MainLayout from '@/components/layout/MainLayout';
import AuthLayout from '@/components/layout/AuthLayout';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import OfflineDetector from '@/components/shared/OfflineDetector';
import NotFound from '@/pages/errors/NotFound';
import Forbidden from '@/pages/errors/Forbidden';

import Login from '@/pages/auth/Login';
import Register from '@/pages/auth/Register';
import ForgotPassword from '@/pages/auth/ForgotPassword';
import ResetPassword from '@/pages/auth/ResetPassword';
import VerifyEmail from '@/pages/auth/VerifyEmail';

import AdminDashboard from '@/pages/admin/Dashboard';
import AdminUsers from '@/pages/admin/Users';
import AdminEvents from '@/pages/admin/Events';
import AdminDrivers from '@/pages/admin/Drivers';
import AdminVehicles from '@/pages/admin/Vehicles';
import AdminRoutes from '@/pages/admin/Routes';
import AdminPickupPoints from '@/pages/admin/PickupPoints';
import AdminReservations from '@/pages/admin/Reservations';
import AdminTrips from '@/pages/admin/Trips';
import AdminReports from '@/pages/admin/Reports';
import AdminActiveShuttles from '@/pages/admin/ActiveShuttles';
import AdminReplayTrip from '@/pages/admin/ReplayTrip';

import DriverDashboard from '@/pages/driver/Dashboard';
import DriverTrips from '@/pages/driver/Trips';
import DriverTracking from '@/pages/driver/Tracking';
import DriverScanQr from '@/pages/driver/ScanQr';
import TicketDetails from '@/pages/TicketDetails';

import ParticipantDashboard from '@/pages/participant/Dashboard';
import ParticipantBookings from '@/pages/participant/Bookings';
import ParticipantMyTickets from '@/pages/participant/MyTickets';
import ParticipantTrack from '@/pages/participant/Track';
import Profile from '@/pages/Profile';
import LandingPage from '@/pages/LandingPage';

function PrivateRoute({ children, roles }: { children: React.ReactNode; roles?: Role[] }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (roles && user && !roles.includes(user.role)) return <Navigate to="/403" />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) return <Navigate to="/dashboard" />;
  return <>{children}</>;
}

export default function App() {
  const initialize = useAuthStore((s) => s.initialize);
  const isLoading = useAuthStore((s) => s.isLoading);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => { initialize(); }, [initialize]);

  if (isLoading) {
    const isParticipantOrLanding =
      typeof window !== 'undefined' &&
      (window.location.pathname === '/' ||
        window.location.pathname.startsWith('/participant') ||
        window.location.pathname.startsWith('/login') ||
        window.location.pathname.startsWith('/register'));

    return (
      <div className="flex h-screen items-center justify-center">
        <div
          className={`h-8 w-8 animate-spin rounded-full border-4 ${
            isParticipantOrLanding ? 'border-[#ffac00]' : 'border-primary'
          } border-t-transparent`}
        />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
          <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />
          <Route path="/verify-email/:token" element={<VerifyEmail />} />
        </Route>

        <Route path="/dashboard" element={<PrivateRoute><MainLayout /></PrivateRoute>}>
          <Route index element={<RoleDashboard />} />
        </Route>

        <Route path="/admin" element={<PrivateRoute roles={['SUPER_ADMIN', 'ORGANIZER']}><MainLayout /></PrivateRoute>}>
          <Route index element={<Navigate to="/admin/dashboard" />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="events" element={<AdminEvents />} />
          <Route path="drivers" element={<AdminDrivers />} />
          <Route path="vehicles" element={<AdminVehicles />} />
          <Route path="routes" element={<AdminRoutes />} />
          <Route path="pickup-points" element={<AdminPickupPoints />} />
          <Route path="reservations" element={<AdminReservations />} />
          <Route path="trips" element={<AdminTrips />} />
          <Route path="trips/replay/:tripId" element={<AdminReplayTrip />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="active-shuttles" element={<AdminActiveShuttles />} />
        </Route>

        <Route path="/driver" element={<PrivateRoute roles={['DRIVER']}><MainLayout /></PrivateRoute>}>
          <Route index element={<Navigate to="/driver/dashboard" />} />
          <Route path="dashboard" element={<DriverDashboard />} />
          <Route path="trips" element={<DriverTrips />} />
          <Route path="tracking" element={<DriverTracking />} />
        </Route>

        <Route path="/driver/scan-qr" element={<PrivateRoute roles={['DRIVER', 'SUPER_ADMIN']}><DriverScanQr /></PrivateRoute>} />
        
        <Route element={<PrivateRoute><MainLayout /></PrivateRoute>}>
          <Route path="/ticket/:id" element={<TicketDetails />} />
          <Route path="/tickets/:id" element={<TicketDetails />} />
        </Route>

        <Route path="/participant" element={<PrivateRoute roles={['EMPLOYEE', 'PARTICIPANT', 'SUPER_ADMIN', 'ORGANIZER']}><MainLayout /></PrivateRoute>}>
          <Route index element={<Navigate to="/participant/dashboard" />} />
          <Route path="dashboard" element={<ParticipantDashboard />} />
          <Route path="bookings" element={<ParticipantBookings />} />
          <Route path="tickets" element={<ParticipantMyTickets />} />
          <Route path="track" element={<ParticipantTrack />} />
          <Route path="track/:tripId" element={<ParticipantTrack />} />
        </Route>

        <Route path="/profile" element={<PrivateRoute><MainLayout /></PrivateRoute>}>
          <Route index element={<Profile />} />
        </Route>

        <Route path="/403" element={<Forbidden />} />
        <Route path="/" element={<LandingPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <OfflineDetector />
    </ErrorBoundary>
  );
}

function RoleDashboard() {
  const { user, isAuthenticated, logout } = useAuthStore();
  if (!user || !isAuthenticated) return <Navigate to="/login" />;
  const roleRoutes: Record<string, string> = {
    SUPER_ADMIN: '/admin/dashboard',
    ORGANIZER: '/admin/dashboard',
    DRIVER: '/driver/dashboard',
    EMPLOYEE: '/participant/dashboard',
    PARTICIPANT: '/participant/dashboard',
  };
  const target = roleRoutes[user.role];
  if (!target) {
    console.error(`Unknown role: ${user.role}. Auto-clearing stale session.`);
    logout();
    return <Navigate to="/login" />;
  }
  return <Navigate to={target} />;
}
