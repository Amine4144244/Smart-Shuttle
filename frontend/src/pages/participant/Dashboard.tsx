import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { dashboardApi, eventsApi, reservationsApi } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { formatDate } from '@/lib/utils';
import SafeQRCode from '@/components/shared/SafeQRCode';
import {
  Ticket,
  Calendar,
  Bus,
  MapPin,
  Clock,
  Navigation,
  ArrowRight,
  ShieldCheck,
  Leaf,
  Sparkles,
  QrCode,
  Radio,
  ChevronRight,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function ParticipantDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedQrTicket, setSelectedQrTicket] = useState<any | null>(null);

  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ['participant-stats'],
    queryFn: () => dashboardApi.getParticipant().then((r) => r.data),
  });

  const { data: events, isLoading: isEventsLoading } = useQuery({
    queryKey: ['upcoming-events'],
    queryFn: () => eventsApi.getUpcoming().then((r) => r.data),
  });

  const { data: myReservations, isLoading: isReservationsLoading } = useQuery({
    queryKey: ['my-reservations'],
    queryFn: () => reservationsApi.getMyReservations().then((r) => r.data),
    refetchInterval: 15000,
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => reservationsApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-reservations'] });
      queryClient.invalidateQueries({ queryKey: ['participant-stats'] });
      toast.success('Reservation cancelled successfully');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to cancel reservation'),
  });

  const reservations = Array.isArray(myReservations) ? myReservations : [];
  const upcomingEvents = Array.isArray(events) ? events : [];

  // Find next active reservation (CONFIRMED, CHECKED_IN, BOARDED, PENDING)
  const nextReservation = reservations.find((r: any) =>
    ['CONFIRMED', 'CHECKED_IN', 'BOARDED', 'PENDING'].includes(r.status)
  );

  const completedCount = stats?.completedTrips || 0;
  const estimatedCarbonKg = (completedCount * 2.4).toFixed(1);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'BOARDED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ffac00]/20 px-3 py-1 text-xs font-bold text-neutral-900 dark:text-[#ffac00] border border-[#ffac00]/40">
            <span className="h-1.5 w-1.5 rounded-full bg-[#ffac00] animate-ping" />
            ONBOARD SHUTTLE
          </span>
        );
      case 'CHECKED_IN':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#629b5c]/20 px-3 py-1 text-xs font-bold text-[#629b5c] border border-[#629b5c]/40">
            <CheckCircle2 className="h-3.5 w-3.5" />
            CHECKED IN
          </span>
        );
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#629b5c]/15 px-3 py-1 text-xs font-bold text-[#629b5c] border border-[#629b5c]/30">
            <span className="h-1.5 w-1.5 rounded-full bg-[#629b5c]" />
            CONFIRMED
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-600 dark:text-amber-400 border border-amber-500/30">
            PENDING APPROVAL
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-neutral-200 dark:bg-neutral-800 px-3 py-1 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            COMPLETED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-3 py-1 text-xs font-bold text-rose-600 dark:text-rose-400">
            {status}
          </span>
        );
    }
  };

  if (isStatsLoading && isReservationsLoading && isEventsLoading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-3 border-[#ffac00] border-t-transparent" />
        <p className="text-xs font-mono font-bold uppercase tracking-widest text-[#ffac00]">
          Loading Passenger Transit Telemetry...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 font-sans selection:bg-[#ffac00] selection:text-black">
      {/* 1. Header & Live Telemetry Strip */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-neutral-200/80 dark:border-neutral-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold tracking-widest uppercase bg-[#629b5c]/15 text-[#629b5c] border border-[#629b5c]/30">
              <span className="w-1.5 h-1.5 rounded-full bg-[#629b5c] animate-pulse" />
              PASSENGER PORTAL • SYSTEM LIVE
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tighter text-neutral-950 dark:text-white">
            {getGreeting()}, {user?.firstName || 'Passenger'}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Real-time event transit dispatch, digital boarding passes, and live bus telemetry.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            className="rounded-full h-10 px-5 text-xs font-bold border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#14161c] hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 gap-2 shadow-sm transition-all flex items-center"
            onClick={() => navigate('/participant/tickets')}
          >
            <Ticket className="h-3.5 w-3.5 text-[#ffac00]" />
            My Boarding Passes
          </button>
          <button
            className="rounded-full h-10 px-6 text-xs font-extrabold bg-neutral-950 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200 shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2 active:scale-[0.99]"
            onClick={() => navigate('/participant/bookings')}
          >
            <Calendar className="h-3.5 w-3.5" />
            Book Shuttle Pass
          </button>
        </div>
      </div>

      {/* 2. Next Active Trip Hero Card (Rivian High-Impact Photography Card) */}
      {nextReservation && (
        <div className="relative overflow-hidden rounded-3xl border border-neutral-700/80 bg-neutral-950 text-white shadow-2xl p-6 sm:p-8 transition-all duration-300 group">
          {/* Real passenger transit photography background */}
          <div
            className="absolute inset-0 bg-cover bg-center opacity-70 group-hover:scale-105 transition-transform duration-700"
            style={{
              backgroundImage: `url('${nextReservation.event?.posterImage || 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1600&q=85'}')`,
            }}
          />
          {/* Balanced gradient overlay so the bus is vividly visible while text is 100% crisp & readable */}
          <div className="absolute inset-0 bg-gradient-to-r from-neutral-950/90 via-neutral-950/65 to-neutral-950/35" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-4 max-w-2xl">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="rounded-full bg-[#ffac00] px-3.5 py-1 text-xs font-extrabold text-neutral-950 uppercase tracking-wider shadow-sm">
                  NEXT DEPARTURE
                </span>
                <span className="text-xs font-mono font-bold text-neutral-200 bg-black/40 px-2.5 py-0.5 rounded-full border border-white/10">
                  PASS #{nextReservation.reservationCode}
                </span>
                {getStatusBadge(nextReservation.status)}
              </div>

              <div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#ffac00]">
                  Scheduled Event Transportation
                </span>
                <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tighter text-white mt-1 drop-shadow-sm">
                  {nextReservation.event?.name || 'Event Shuttle Express'}
                </h2>
              </div>

              {/* Trip Specs Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 pt-3 border-t border-white/15 text-xs">
                <div className="rounded-2xl border border-white/15 bg-black/50 p-3.5 backdrop-blur-md">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-300 block mb-0.5">
                    Date
                  </span>
                  <p className="font-extrabold text-white text-sm">
                    {formatDate(nextReservation.date)}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/15 bg-black/50 p-3.5 backdrop-blur-md">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-300 block mb-0.5">
                    Pickup Time
                  </span>
                  <p className="font-extrabold text-[#ffac00] text-sm font-mono">
                    {nextReservation.time
                      ? nextReservation.time.includes('T')
                        ? new Date(nextReservation.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : nextReservation.time
                      : '--:--'}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/15 bg-black/50 p-3.5 backdrop-blur-md col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-300 block mb-0.5">
                    Station / Stop
                  </span>
                  <p className="font-extrabold text-white truncate text-sm">
                    {nextReservation.pickupPoint?.name || nextReservation.event?.address || 'Terminal Hub'}
                  </p>
                </div>
              </div>

              {/* Vehicle & Driver pill */}
              {nextReservation.trip?.vehicle && (
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-neutral-900/80 border border-neutral-800 text-xs backdrop-blur-sm">
                  <div className="w-8 h-8 rounded-xl bg-[#ffac00]/20 text-[#ffac00] flex items-center justify-center font-bold">
                    <Bus className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">
                        Shuttle Bus {nextReservation.trip.vehicle.busNumber}
                      </span>
                      {nextReservation.trip.vehicle.plateNumber && (
                        <span className="text-neutral-400 font-mono text-[11px]">
                          [{nextReservation.trip.vehicle.plateNumber}]
                        </span>
                      )}
                    </div>
                    {nextReservation.trip.driver?.user && (
                      <p className="text-neutral-400 text-[11px] truncate">
                        Driver: {nextReservation.trip.driver.user.firstName} {nextReservation.trip.driver.user.lastName} • Verified
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons on Hero */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0 lg:w-52">
              {nextReservation.qrCode && (
                <button
                  className="w-full rounded-full bg-[#ffac00] hover:bg-[#e59b00] text-neutral-950 font-extrabold py-3 px-4 text-xs shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
                  onClick={() => setSelectedQrTicket(nextReservation)}
                >
                  <QrCode className="h-4 w-4" /> View Digital QR Pass
                </button>
              )}

              {nextReservation.trip?.id ? (
                <button
                  className="w-full rounded-full border border-neutral-700 bg-neutral-900/90 hover:bg-neutral-800 text-white font-bold py-3 px-4 text-xs shadow flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
                  onClick={() => navigate(`/participant/track/${nextReservation.trip.id}`)}
                >
                  <Navigation className="h-3.5 w-3.5 text-[#629b5c] animate-pulse" /> Track Live Shuttle
                </button>
              ) : (
                <button
                  className="w-full rounded-full border border-neutral-700 bg-neutral-900/90 hover:bg-neutral-800 text-white font-bold py-3 px-4 text-xs shadow flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
                  onClick={() => navigate('/participant/track')}
                >
                  <Radio className="h-3.5 w-3.5 text-[#ffac00]" /> Live Shuttle Radar
                </button>
              )}

              <button
                className="w-full rounded-full border border-transparent hover:border-neutral-800 text-neutral-400 hover:text-white text-xs py-2 flex items-center justify-center gap-1 transition-colors"
                onClick={() => navigate(`/ticket/${nextReservation.id}`)}
              >
                Pass Details & Station Map <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Metric Bento Grid (Rivian Architectural Design) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Active Passes */}
        <div className="rounded-3xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-[#14161c] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
              Active Passes
            </span>
            <div className="w-8 h-8 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Ticket className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold tracking-tighter text-neutral-950 dark:text-white mt-3 font-mono">
            {stats?.upcomingTrips ?? reservations.filter((r: any) => ['CONFIRMED', 'PENDING'].includes(r.status)).length}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 flex items-center gap-1">
            <Clock className="h-3 w-3 text-[#ffac00]" /> Ready for boarding
          </p>
        </div>

        {/* Trips Completed */}
        <div className="rounded-3xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-[#14161c] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
              Trips Completed
            </span>
            <div className="w-8 h-8 rounded-2xl bg-[#629b5c]/10 text-[#629b5c] flex items-center justify-center font-bold">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold tracking-tighter text-neutral-950 dark:text-white mt-3 font-mono">
            {stats?.completedTrips ?? reservations.filter((r: any) => r.status === 'COMPLETED').length}
          </p>
          <p className="text-xs text-[#629b5c] mt-1 font-bold">
            100% Verified safe arrivals
          </p>
        </div>

        {/* Total Reservations */}
        <div className="rounded-3xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-[#14161c] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
              Total Reservations
            </span>
            <div className="w-8 h-8 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold tracking-tighter text-neutral-950 dark:text-white mt-3 font-mono">
            {stats?.totalReservations ?? reservations.length}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Lifetime mobility bookings
          </p>
        </div>

        {/* Green Impact */}
        <div className="rounded-3xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-[#14161c] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
              Green Impact
            </span>
            <div className="w-8 h-8 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
              <Leaf className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold tracking-tighter text-neutral-950 dark:text-white mt-3 font-mono">
            {estimatedCarbonKg} <span className="text-xs font-normal text-neutral-400">kg CO₂</span>
          </p>
          <p className="text-xs text-teal-600 dark:text-teal-400 mt-1 font-bold">
            Emissions saved vs personal cars
          </p>
        </div>
      </div>

      {/* 4. Split Action Sections: Events Explorer vs Recent Passes */}
      <div className="grid gap-8 lg:grid-cols-12">
        {/* Left: Upcoming Events with Shuttle Service (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#ffac00]">
                  Scheduled Transit
                </span>
              </div>
              <h2 className="text-xl font-extrabold tracking-tight text-neutral-950 dark:text-white flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#ffac00]" /> Events with Shuttle Service
              </h2>
            </div>
            <Link
              to="/participant/bookings"
              className="inline-flex items-center gap-1 text-xs font-bold text-neutral-900 dark:text-white hover:text-[#ffac00] dark:hover:text-[#ffac00] transition-colors"
            >
              All Events <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {isEventsLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-24 rounded-3xl bg-neutral-200/60 dark:bg-neutral-800/60 animate-pulse" />
              ))}
            </div>
          ) : upcomingEvents.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-neutral-300 dark:border-neutral-800 p-8 text-center bg-white/50 dark:bg-[#14161c]/50">
              <Calendar className="h-8 w-8 text-neutral-400 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-bold text-neutral-700 dark:text-neutral-300">No scheduled events right now</p>
              <p className="text-xs text-neutral-400 mt-0.5">Check back soon for new event routes.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingEvents.slice(0, 4).map((event: any) => {
                const eventDate = new Date(event.date);
                const month = eventDate.toLocaleString('default', { month: 'short' }).toUpperCase();
                const day = eventDate.getDate();

                return (
                  <div
                    key={event.id}
                    className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#14161c] border border-neutral-200/80 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-700 hover:shadow-md transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-4 min-w-0">
                      {/* Date Badge Pill */}
                      <div className="flex flex-col items-center justify-center w-12 h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-950 dark:text-white shrink-0">
                        <span className="text-[10px] font-extrabold tracking-wider text-[#ffac00]">{month}</span>
                        <span className="text-base font-extrabold leading-none">{day}</span>
                      </div>

                      <div className="min-w-0 space-y-1">
                        <h3 className="font-extrabold text-neutral-950 dark:text-white text-sm sm:text-base truncate">
                          {event.name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
                          {event.startTime && (
                            <span className="flex items-center gap-1 font-mono text-[11px]">
                              <Clock className="h-3 w-3 text-[#ffac00]" /> {event.startTime} - {event.endTime || 'End'}
                            </span>
                          )}
                          {event.address && (
                            <span className="flex items-center gap-1 truncate max-w-[200px]">
                              <MapPin className="h-3 w-3 text-[#629b5c]" /> {event.address}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      className="shrink-0 rounded-full h-9 px-5 text-xs font-bold bg-neutral-950 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200 shadow transition-all flex items-center justify-center gap-1.5 active:scale-[0.99]"
                      onClick={() => navigate('/participant/bookings')}
                    >
                      Book Seat <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Recent Boarding Passes (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#ffac00]">
                  Your Tickets
                </span>
              </div>
              <h2 className="text-xl font-extrabold tracking-tight text-neutral-950 dark:text-white flex items-center gap-2">
                <Ticket className="h-4 w-4 text-[#ffac00]" /> Recent Passes
              </h2>
            </div>
            <Link
              to="/participant/tickets"
              className="inline-flex items-center gap-1 text-xs font-bold text-neutral-900 dark:text-white hover:text-[#ffac00] dark:hover:text-[#ffac00] transition-colors"
            >
              Manage <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {isReservationsLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-20 rounded-3xl bg-neutral-200/60 dark:bg-neutral-800/60 animate-pulse" />
              ))}
            </div>
          ) : reservations.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-neutral-300 dark:border-neutral-800 p-8 text-center bg-white/50 dark:bg-[#14161c]/50">
              <Ticket className="h-8 w-8 text-neutral-400 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-bold text-neutral-700 dark:text-neutral-300">No active passes</p>
              <p className="text-xs text-neutral-400 mt-0.5">Book an event shuttle to generate your first QR pass.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reservations.slice(0, 4).map((r: any) => (
                <div
                  key={r.id}
                  className="p-4 rounded-3xl bg-white dark:bg-[#14161c] border border-neutral-200/80 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all space-y-2.5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-extrabold text-sm text-neutral-950 dark:text-white truncate">
                        {r.event?.name || 'Event Shuttle'}
                      </p>
                      <p className="text-[11px] font-mono text-neutral-400">
                        {formatDate(r.date)} • #{r.reservationCode}
                      </p>
                    </div>
                    {getStatusBadge(r.status)}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800/80 text-xs">
                    <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400 truncate">
                      <MapPin className="h-3 w-3 text-[#ffac00]" />
                      <span className="truncate">{r.pickupPoint?.name || 'Assigned Station'}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {r.qrCode && r.status !== 'CANCELLED' && (
                        <button
                          className="h-7 px-2.5 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white text-[11px] font-bold flex items-center gap-1 transition-all"
                          onClick={() => setSelectedQrTicket(r)}
                        >
                          <QrCode className="h-3 w-3 text-[#ffac00]" /> QR
                        </button>
                      )}
                      {r.trip?.id && r.status !== 'CANCELLED' && (
                        <button
                          className="h-7 px-2.5 rounded-full bg-[#629b5c]/15 hover:bg-[#629b5c]/25 text-[#629b5c] text-[11px] font-bold flex items-center gap-1 transition-all"
                          onClick={() => navigate(`/participant/track/${r.trip.id}`)}
                        >
                          <Navigation className="h-3 w-3" /> Track
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 5. Boarding Pass QR Modal (Rivian Design) */}
      {selectedQrTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#14161c] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl space-y-4 text-center">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
              <div className="text-left">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#ffac00] block">
                  DIGITAL PASS
                </span>
                <h3 className="font-extrabold text-base text-neutral-950 dark:text-white truncate max-w-[180px]">
                  {selectedQrTicket.event?.name}
                </h3>
              </div>
              {getStatusBadge(selectedQrTicket.status)}
            </div>

            {/* QR Container */}
            <div className="flex flex-col items-center justify-center p-5 bg-white rounded-2xl border border-neutral-200 shadow-inner">
              <SafeQRCode value={selectedQrTicket.qrCode || selectedQrTicket.reservationCode} size={180} />
              <p className="font-mono text-xs font-extrabold text-neutral-950 mt-2.5 tracking-widest">
                #{selectedQrTicket.reservationCode}
              </p>
            </div>

            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Hold this digital barcode under the driver scanner when entering the shuttle bus.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                className="w-full rounded-full border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white font-bold py-2.5 text-xs transition-all"
                onClick={() => setSelectedQrTicket(null)}
              >
                Close
              </button>
              <button
                className="w-full rounded-full bg-neutral-950 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-950 font-extrabold py-2.5 text-xs transition-all"
                onClick={() => {
                  const id = selectedQrTicket.id;
                  setSelectedQrTicket(null);
                  navigate(`/tickets/${id}`);
                }}
              >
                Full Ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
