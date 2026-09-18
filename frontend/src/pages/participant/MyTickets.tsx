import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { reservationsApi } from '@/services/api';
import { formatDate } from '@/lib/utils';
import QRCode from 'qrcode';
import {
  Calendar,
  MapPin,
  Bus,
  XCircle,
  Ticket,
  Users,
  Clock,
  Navigation,
  ArrowUpRight,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';

function SafeQRCode({ value, size }: { value: string; size: number }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | undefined>(undefined);
  const [qrError, setQrError] = useState(false);

  useEffect(() => {
    let mounted = true;
    QRCode.toDataURL(value, { width: size, errorCorrectionLevel: 'M', margin: 2 })
      .then((url: string) => {
        if (mounted) setQrDataUrl(url);
      })
      .catch(() => {
        if (mounted) setQrError(true);
      });
    return () => {
      mounted = false;
    };
  }, [value, size]);

  if (!qrDataUrl && !qrError) return <div className="h-[95px] w-[95px] animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />;
  if (qrError)
    return (
      <div className="flex h-[95px] w-[95px] items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800 p-1">
        <span className="text-[10px] font-mono text-neutral-400">{value.slice(-8)}</span>
      </div>
    );
  return <img src={qrDataUrl} width={size} height={size} alt="QR Code" className="rounded-xl shadow-sm" />;
}

export default function MyTickets() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'>('ALL');

  const { data: myReservations, isLoading } = useQuery({
    queryKey: ['my-reservations'],
    queryFn: () => reservationsApi.getMyReservations().then((r) => r.data),
    refetchInterval: 15000,
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => reservationsApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-reservations'] });
      queryClient.invalidateQueries({ queryKey: ['participant-stats'] });
      toast.success('Boarding pass cancelled successfully');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to cancel pass'),
  });

  const rawReservations = Array.isArray(myReservations) ? myReservations : [];

  const filteredReservations = rawReservations.filter((r: any) => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'ACTIVE') return ['CONFIRMED', 'PENDING', 'CHECKED_IN', 'BOARDED'].includes(r.status);
    if (statusFilter === 'COMPLETED') return r.status === 'COMPLETED';
    if (statusFilter === 'CANCELLED') return ['CANCELLED', 'REJECTED', 'NO_SHOW'].includes(r.status);
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'BOARDED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ffac00]/20 px-3 py-0.5 text-xs font-bold text-neutral-950 dark:text-[#ffac00] border border-[#ffac00]/40">
            <span className="h-1.5 w-1.5 rounded-full bg-[#ffac00] animate-ping" />
            ONBOARD
          </span>
        );
      case 'CHECKED_IN':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#629b5c]/20 px-3 py-0.5 text-xs font-bold text-[#629b5c] border border-[#629b5c]/40">
            <CheckCircle2 className="h-3 w-3" />
            CHECKED IN
          </span>
        );
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#629b5c]/15 px-3 py-0.5 text-xs font-bold text-[#629b5c] border border-[#629b5c]/30">
            <span className="h-1.5 w-1.5 rounded-full bg-[#629b5c]" />
            CONFIRMED
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-400 border border-amber-500/30">
            PENDING
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-neutral-200 dark:bg-neutral-800 px-3 py-0.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            COMPLETED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-3 py-0.5 text-xs font-bold text-rose-600 dark:text-rose-400">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12 font-sans selection:bg-[#ffac00] selection:text-black">
      {/* 1. Header with Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-200/80 dark:border-neutral-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold tracking-widest uppercase bg-[#ffac00]/15 text-neutral-950 dark:text-[#ffac00] border border-[#ffac00]/30">
              <Ticket className="h-3 w-3" />
              DIGITAL WALLET
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tighter text-neutral-950 dark:text-white">
            My Boarding Passes
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Digital event transit credentials with real-time driver QR validation and GPS tracking.
          </p>
        </div>

        <button
          onClick={() => navigate('/participant/bookings')}
          className="rounded-full h-10 px-6 text-xs font-extrabold bg-neutral-950 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200 shadow-md transition-all self-start sm:self-auto flex items-center gap-2 active:scale-[0.99]"
        >
          <Calendar className="h-3.5 w-3.5" />
          Book New Shuttle
        </button>
      </div>

      {/* 2. Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'ALL', label: 'All Passes', count: rawReservations.length },
          {
            id: 'ACTIVE',
            label: 'Active & Upcoming',
            count: rawReservations.filter((r: any) => ['CONFIRMED', 'PENDING', 'CHECKED_IN', 'BOARDED'].includes(r.status)).length,
          },
          {
            id: 'COMPLETED',
            label: 'Completed',
            count: rawReservations.filter((r: any) => r.status === 'COMPLETED').length,
          },
          {
            id: 'CANCELLED',
            label: 'Cancelled',
            count: rawReservations.filter((r: any) => ['CANCELLED', 'REJECTED', 'NO_SHOW'].includes(r.status)).length,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id as any)}
            className={`rounded-full px-4 py-2 text-xs font-extrabold transition-all flex items-center gap-2 shrink-0 ${
              statusFilter === tab.id
                ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 shadow-sm'
                : 'bg-white dark:bg-[#14161c] border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:border-neutral-400'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`rounded-full px-2 py-0.2 text-[10px] font-mono ${
                statusFilter === tab.id
                  ? 'bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-950'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* 3. Ticket Cards List */}
      {isLoading ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-[#14161c]">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#ffac00] border-t-transparent" />
          <p className="text-xs font-mono font-bold uppercase tracking-widest text-[#ffac00]">
            Loading Boarding Passes...
          </p>
        </div>
      ) : filteredReservations.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-neutral-300 dark:border-neutral-800 p-12 text-center bg-white dark:bg-[#14161c]">
          <Ticket className="h-10 w-10 text-neutral-400 mx-auto mb-2 opacity-50" />
          <p className="text-base font-bold text-neutral-800 dark:text-neutral-200">No boarding passes found</p>
          <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
            {statusFilter === 'ALL'
              ? 'Reserve your seat on an upcoming event shuttle to generate your first digital QR pass.'
              : `No passes match the "${statusFilter}" filter.`}
          </p>
          <button
            onClick={() => navigate('/participant/bookings')}
            className="mt-5 rounded-full bg-neutral-950 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-950 font-bold px-6 py-2.5 text-xs shadow transition-all"
          >
            Browse Available Shuttles
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredReservations.map((r: any) => {
            const isCancelled = ['CANCELLED', 'REJECTED', 'NO_SHOW'].includes(r.status);
            const hasActiveTrip = !!r.trip?.id;

            return (
              <div
                key={r.id}
                className={`relative overflow-hidden rounded-3xl border transition-all duration-300 bg-white dark:bg-[#14161c] ${
                  isCancelled
                    ? 'opacity-60 grayscale-[40%] border-neutral-200 dark:border-neutral-800'
                    : 'border-neutral-200/90 dark:border-neutral-800 shadow-sm hover:shadow-xl hover:border-neutral-400 dark:hover:border-neutral-700'
                }`}
              >
                <div className="flex flex-col lg:flex-row items-stretch">
                  {/* Main Ticket Body */}
                  <div className="flex-1 p-6 sm:p-7 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#ffac00]">
                          OFFICIAL EVENT PASS
                        </span>
                        <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-neutral-950 dark:text-white mt-0.5">
                          {r.event?.name || 'Event Shuttle Transit'}
                        </h2>
                      </div>
                      {getStatusBadge(r.status)}
                    </div>

                    {/* Quick Specs Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-neutral-100 dark:border-neutral-800/80 text-xs">
                      <div className="rounded-2xl border border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-900/40 p-2.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-0.5">
                          Date
                        </span>
                        <p className="font-extrabold text-neutral-900 dark:text-white">
                          {formatDate(r.date)}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-900/40 p-2.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-0.5">
                          Pickup Time
                        </span>
                        <p className="font-extrabold text-[#ffac00] font-mono">
                          {r.pickupTime
                            ? new Date(r.pickupTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : new Date(r.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-900/40 p-2.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-0.5">
                          Passengers
                        </span>
                        <p className="font-extrabold text-neutral-900 dark:text-white">
                          {r.passengerCount || 1} {r.passengerCount === 1 ? 'Seat' : 'Seats'}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-900/40 p-2.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-0.5">
                          Pass Code
                        </span>
                        <p className="font-mono font-extrabold text-neutral-900 dark:text-white truncate">
                          #{r.reservationCode}
                        </p>
                      </div>
                    </div>

                    {/* Assigned Pickup Station */}
                    <div className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-300">
                      <MapPin className="h-3.5 w-3.5 text-[#ffac00] shrink-0" />
                      <span className="font-bold">Station:</span>
                      <span className="truncate">{r.pickupPoint?.name || r.pickupAddress || r.event?.address || 'Terminal A Station'}</span>
                    </div>

                    {/* Vehicle & Driver Card if assigned */}
                    {r.trip?.vehicle && (
                      <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-100/80 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800 text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-xl bg-[#ffac00]/20 text-[#ffac00] flex items-center justify-center font-bold shrink-0">
                            <Bus className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-neutral-950 dark:text-white truncate block">
                              Shuttle Bus {r.trip.vehicle.busNumber}{' '}
                              {r.trip.vehicle.plateNumber && (
                                <span className="font-mono text-neutral-400 font-normal">
                                  [{r.trip.vehicle.plateNumber}]
                                </span>
                              )}
                            </span>
                            {r.trip.driver?.user && (
                              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                                Driver: {r.trip.driver.user.firstName} {r.trip.driver.user.lastName}
                              </p>
                            )}
                          </div>
                        </div>

                        {hasActiveTrip && !isCancelled && (
                          <button
                            onClick={() => navigate(`/participant/track/${r.trip.id}`)}
                            className="rounded-full bg-[#629b5c]/15 hover:bg-[#629b5c]/25 text-[#629b5c] px-3 py-1.5 text-[11px] font-bold flex items-center gap-1.5 transition-all shrink-0"
                          >
                            <Navigation className="h-3 w-3 animate-pulse" />
                            Live GPS Map
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Perforated Tear Line & Scannable QR Stub */}
                  <div className="relative border-t lg:border-t-0 lg:border-l border-dashed border-neutral-300 dark:border-neutral-800 p-6 flex flex-col items-center justify-center gap-3 bg-neutral-50/60 dark:bg-neutral-900/40 lg:w-60 shrink-0">
                    {/* Top and Bottom Perforation Notches for Visual Polish */}
                    <div className="hidden lg:block absolute -top-3 -left-3 w-6 h-6 rounded-full bg-[#fafafa] dark:bg-[#0c0d10] border border-neutral-200 dark:border-neutral-800" />
                    <div className="hidden lg:block absolute -bottom-3 -left-3 w-6 h-6 rounded-full bg-[#fafafa] dark:bg-[#0c0d10] border border-neutral-200 dark:border-neutral-800" />

                    {r.qrCode && !isCancelled ? (
                      <div className="flex flex-col items-center gap-2 text-center">
                        <div className="p-2.5 bg-white rounded-2xl shadow-md border border-neutral-200">
                          <SafeQRCode value={r.qrCode} size={110} />
                        </div>
                        <span className="font-mono text-[11px] font-extrabold tracking-widest text-neutral-900 dark:text-white">
                          #{r.reservationCode}
                        </span>
                        <span className="text-[10px] text-neutral-400">Scan at Shuttle Entrance</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-4 text-center">
                        <Ticket className="h-8 w-8 text-neutral-400 mb-1 opacity-50" />
                        <span className="font-mono text-xs font-bold text-neutral-500">
                          #{r.reservationCode}
                        </span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col w-full gap-1.5 pt-2">
                      <button
                        onClick={() => navigate(`/tickets/${r.id}`)}
                        className="w-full rounded-full border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-bold py-1.5 flex items-center justify-center gap-1 transition-all"
                      >
                        Full Ticket <ChevronRight className="h-3 w-3" />
                      </button>

                      {['PENDING', 'CONFIRMED'].includes(r.status) && (
                        <button
                          onClick={() => {
                            if (confirm('Are you sure you want to cancel this shuttle reservation?')) {
                              cancelMutation.mutate(r.id);
                            }
                          }}
                          className="w-full text-xs text-rose-500 hover:text-rose-600 hover:underline py-1 font-semibold transition-colors"
                        >
                          Cancel Booking
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
