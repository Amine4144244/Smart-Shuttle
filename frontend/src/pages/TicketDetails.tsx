import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ticketsApi } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { QrCode, Bus, MapPin, Clock, Calendar, User, Phone, FileText, ArrowLeft, ShieldCheck, CheckCircle2, Ticket } from 'lucide-react';
import SafeQRCode from '@/components/shared/SafeQRCode';

const getBadgeVariant = (status: string): 'default' | 'secondary' | 'outline' | 'live' | 'scheduled' | 'delayed' | 'completed' | 'cancelled' => {
  switch (status) {
    case 'CONFIRMED':
    case 'CHECKED_IN':
    case 'BOARDED':
      return 'live';
    case 'PENDING':
      return 'scheduled';
    case 'COMPLETED':
      return 'completed';
    case 'CANCELLED':
    case 'REJECTED':
    case 'NO_SHOW':
      return 'cancelled';
    default:
      return 'secondary';
  }
};

const statusLabels: Record<string, string> = {
  PENDING: 'Pending Confirmation',
  CONFIRMED: 'Confirmed & Ready',
  CHECKED_IN: 'Checked In / Boarded',
  BOARDED: 'Onboard Shuttle',
  COMPLETED: 'Trip Completed',
  CANCELLED: 'Cancelled',
  REJECTED: 'Rejected',
  NO_SHOW: 'No Show',
};

export default function TicketDetails() {
  const { id } = useParams<{ id: string }>();
  const [showQR, setShowQR] = useState(true);
  const { user } = useAuthStore();
  const isParticipant = user?.role === 'EMPLOYEE' || user?.role === 'PARTICIPANT';

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => ticketsApi.getTicket(id!).then(r => r.data),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] space-y-3">
        <div className={`animate-spin rounded-full h-10 w-10 border-2 ${isParticipant ? 'border-[#ffac00]' : 'border-primary'} border-t-transparent`} />
        <span className={`text-xs font-mono uppercase tracking-wider ${isParticipant ? 'text-[#ffac00]' : 'text-muted-foreground'}`}>Loading Boarding Pass...</span>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] text-muted-foreground max-w-md mx-auto text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
          <FileText className="h-8 w-8 text-muted-foreground/60" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Pass Not Found</h2>
          <p className="text-xs text-muted-foreground mt-1">
            The requested boarding pass could not be retrieved or has expired.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/participant/tickets" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Return to Passes
          </Link>
        </Button>
      </div>
    );
  }

  const t = ticket;

  return (
    <div className="space-y-6 max-w-2xl mx-auto py-2 font-sans selection:bg-[#ffac00] selection:text-black">
      <div className="flex items-center justify-between border-b border-neutral-200/80 dark:border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold tracking-widest uppercase bg-[#ffac00]/15 text-[#ffac00] border border-[#ffac00]/30 shadow-sm">
            <Ticket className="h-3 w-3" />
            DIGITAL BOARDING PASS
          </span>
        </div>
        <span className="text-xs font-mono font-bold text-neutral-500 dark:text-neutral-400 tracking-wider uppercase">
          E-Pass #{t.reservationCode}
        </span>
      </div>

      {/* Main Boarding Pass Card */}
      <div className="ticket-card rounded-3xl overflow-hidden shadow-xl border border-border/80 bg-card">
        {/* Ticket Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 border-b border-white/10 relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-48 bg-gradient-to-l from-primary/20 to-transparent pointer-events-none" />
          <div className="flex items-start justify-between relative z-10">
            <div>
              <span className="text-[10px] font-mono tracking-widest text-primary-foreground/70 uppercase">
                Official Transit Pass
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
                {t.event?.name || 'Event Shuttle Route'}
              </h1>
            </div>
            <Badge variant={getBadgeVariant(t.status)} className="shadow-lg">
              {statusLabels[t.status] || t.status}
            </Badge>
          </div>
        </div>

        {/* QR Code Section */}
        <div className="p-6 bg-muted/10 border-b border-border/40 flex flex-col items-center text-center">
          <div className="p-3 bg-white rounded-2xl shadow-md ring-1 ring-black/5 mb-3">
            <SafeQRCode value={t.qrCode || t.reservationCode} size={180} />
          </div>
          <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-foreground">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span>VERIFIED PASS: {t.reservationCode}</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Present this QR code to the driver upon boarding
          </p>
        </div>

        {/* Boarding Details */}
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <span className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Travel Date
              </span>
              <p className="text-sm font-semibold text-foreground font-mono mt-0.5">
                {new Date(t.date).toLocaleDateString()}
              </p>
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider flex items-center gap-1">
                <Clock className="h-3 w-3" /> Departure Time
              </span>
              <p className="text-sm font-semibold text-foreground font-mono mt-0.5">
                {new Date(t.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider flex items-center gap-1">
                <User className="h-3 w-3" /> Party Size
              </span>
              <p className="text-sm font-semibold text-foreground font-mono mt-0.5">
                {t.passengerCount || 1} {(t.passengerCount || 1) === 1 ? 'Passenger' : 'Passengers'}
              </p>
            </div>
          </div>

          {/* Passenger Info Card */}
          <div className="p-4 rounded-xl bg-muted/30 border border-border/50 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                {t.participant?.firstName?.[0] || 'U'}
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  {t.participant?.firstName} {t.participant?.lastName}
                </p>
                <p className="text-muted-foreground font-mono text-[11px]">
                  {t.participant?.email}
                </p>
              </div>
            </div>
            {t.participant?.phone && (
              <span className="font-mono text-muted-foreground">
                {t.participant.phone}
              </span>
            )}
          </div>

          {/* Pickup Point & Destination */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
              Route & Pickup Station
            </h3>
            <div className="p-4 rounded-xl bg-card border border-border/60 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1">
                  <span className="text-[10px] uppercase font-mono text-emerald-600 font-semibold block">
                    Designated Pickup Location
                  </span>
                  <p className="text-sm font-bold text-foreground">
                    {t.pickupPoint?.name || t.event?.address || 'Main Pickup Point'}
                  </p>
                  {t.pickupPoint?.address && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t.pickupPoint.address}
                    </p>
                  )}
                </div>
              </div>

              {t.event?.address && (
                <div className="flex items-start gap-3 pt-2 border-t border-border/40">
                  <div className="w-6 h-6 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1">
                    <span className="text-[10px] uppercase font-mono text-blue-600 font-semibold block">
                      Event Destination
                    </span>
                    <p className="text-sm font-bold text-foreground">
                      {t.event.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t.event.address}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Assigned Shuttle Telemetry */}
          {t.trip && (
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
                Assigned Shuttle
              </h3>
              <div className="p-4 rounded-xl bg-slate-950 text-white border border-slate-800 space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                      <Bus className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm">
                        Bus {t.trip.vehicle?.busNumber || t.trip.name || 'Assigned'}
                      </p>
                      {t.trip.vehicle?.plateNumber && (
                        <span className="font-mono text-[10px] text-slate-400">
                          {t.trip.vehicle.plateNumber}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge variant="live">
                    {t.trip.status}
                  </Badge>
                </div>

                {t.trip.driver?.user && (
                  <div className="flex items-center justify-between text-xs text-slate-300 pt-2 border-t border-slate-800 font-mono">
                    <span>Driver: {t.trip.driver.user.firstName} {t.trip.driver.user.lastName}</span>
                    {t.trip.driver.phone && <span>{t.trip.driver.phone}</span>}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}