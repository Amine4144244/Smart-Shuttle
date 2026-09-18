import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { dashboardApi, tripsApi, reservationsApi } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Skeleton, SkeletonCard } from '@/components/shared/Skeleton';
import { formatDate, formatTime, getInitials } from '@/lib/utils';
import {
  Bus,
  Route,
  Users,
  Timer,
  QrCode,
  Navigation,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Bell,
  Search,
  UserCheck,
  UserX,
  ChevronRight,
  Car,
  ArrowRight,
  Gauge,
  Target,
  ShieldCheck,
  Radio,
  Sparkles,
  ArrowUpRight,
  Play
} from 'lucide-react';
import toast from 'react-hot-toast';

const getBadgeVariant = (status: string): 'default' | 'secondary' | 'outline' | 'live' | 'scheduled' | 'delayed' | 'completed' | 'cancelled' => {
  switch (status) {
    case 'IN_PROGRESS':
    case 'CONFIRMED':
    case 'BOARDED':
    case 'CHECKED_IN':
      return 'live';
    case 'SCHEDULED':
    case 'PENDING':
      return 'scheduled';
    case 'COMPLETED':
      return 'completed';
    case 'DELAYED':
      return 'delayed';
    case 'CANCELLED':
      return 'cancelled';
    default:
      return 'secondary';
  }
};

export default function DriverDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['driver-dashboard'],
    queryFn: () => dashboardApi.getDriver().then((r) => r.data),
    refetchInterval: 15000,
  });

  const bs = data?.boardingStats;
  const activeTrip = data?.activeTrip;

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const reservations = useMemo(() => {
    if (!activeTrip?.reservations) return [];
    return activeTrip.reservations.filter((r: any) =>
      !searchQuery ||
      `${r.participant?.firstName} ${r.participant?.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.reservationCode?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [activeTrip?.reservations, searchQuery]);

  const startTripMutation = useMutation({
    mutationFn: (id: string) => tripsApi.startTrip(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-dashboard'] });
      toast.success('Trip started! GPS tracking active.');
      navigate('/driver/tracking');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to start trip'),
  });

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-10">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="h-72 rounded-3xl bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      {/* 1. Driver Cockpit Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              DRIVER COCKPIT • ON DUTY
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              {formatTime(currentTime)}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-2 font-sans">
            {getGreeting()}, {user?.firstName || 'Driver'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Operational mission console, live passenger boarding, and GPS telemetry
          </p>
        </div>

        {/* Quick Operational Cockpit Triggers */}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            className="h-11 px-4 gap-2 font-semibold text-sm rounded-xl border-border/80 hover:bg-muted/60 transition-all shadow-sm"
            onClick={() => navigate('/driver/tracking')}
          >
            <Navigation className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-pulse" />
            GPS Telemetry
          </Button>

          <Button
            className="h-11 px-5 gap-2 font-semibold text-sm rounded-xl bg-primary hover:bg-primary/90 shadow-md shadow-primary/25 transition-all"
            onClick={() => navigate('/driver/tracking')}
          >
            <QrCode className="h-4 w-4" />
            Scan QR Code
          </Button>
        </div>
      </div>

      {/* 2. Active Trip HUD / Cockpit Centerpiece */}
      {activeTrip && bs ? (
        <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-card via-card/90 to-primary/[0.08] dark:from-card dark:via-card/95 dark:to-primary/15 shadow-xl p-6 sm:p-8 hover:border-primary/40 transition-all duration-300">
          <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-l from-primary/10 via-transparent to-transparent pointer-events-none" />
          <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant={getBadgeVariant(activeTrip.status)} className="px-3 py-1 font-mono text-xs">
                  {activeTrip.status?.replace('_', ' ') || 'ACTIVE MISSION'}
                </Badge>
                <span className="text-xs font-mono text-muted-foreground">
                  Trip #{activeTrip.id.slice(0, 8).toUpperCase()}
                </span>
                {bs.eventName && (
                  <span className="text-xs font-semibold text-primary px-2.5 py-0.5 rounded-full bg-primary/10">
                    {bs.eventName}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5 text-primary" />
                <span>Scheduled: {activeTrip.departureTime ? formatTime(activeTrip.departureTime) : 'Ready'}</span>
              </div>
            </div>

            {/* Route origin to destination visualizer */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-border/50 text-xs">
              <div className="space-y-1">
                <span className="text-muted-foreground font-mono flex items-center gap-1 uppercase tracking-wider text-[10px]">
                  <MapPin className="h-3.5 w-3.5 text-blue-500" /> Origin Departure
                </span>
                <p className="text-base font-bold text-foreground">
                  {activeTrip.route?.origin || 'Assigned Origin'}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-muted-foreground font-mono flex items-center gap-1 uppercase tracking-wider text-[10px]">
                  <MapPin className="h-3.5 w-3.5 text-amber-500" /> Terminus Destination
                </span>
                <p className="text-base font-bold text-foreground">
                  {activeTrip.route?.destination || 'Destination Event'}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-muted-foreground font-mono flex items-center gap-1 uppercase tracking-wider text-[10px]">
                  <Bus className="h-3.5 w-3.5 text-primary" /> Assigned Vehicle
                </span>
                <p className="text-base font-bold text-foreground font-mono">
                  Bus {activeTrip.vehicle?.busNumber || '-'}
                  {activeTrip.vehicle?.plateNumber && (
                    <span className="text-muted-foreground font-normal text-xs ml-1.5">
                      [{activeTrip.vehicle.plateNumber}]
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Boarding Progress & Stats Strip */}
            <div className="p-4 sm:p-5 rounded-2xl bg-muted/40 border border-border/60 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="font-bold text-foreground text-sm font-sans">
                    Passenger Boarding Manifest
                  </span>
                </div>
                <div className="flex items-center gap-3 font-mono">
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    {bs.checkedIn} Checked In
                  </span>
                  <span className="text-muted-foreground">/</span>
                  <span className="text-foreground font-semibold">
                    {bs.capacity} Capacity
                  </span>
                  <span className="text-xs text-muted-foreground">({bs.progress}%)</span>
                </div>
              </div>

              <Progress value={bs.progress} className="h-3" />

              <div className="flex items-center justify-between text-xs text-muted-foreground font-mono pt-1">
                <span>{bs.totalConfirmed} Total Confirmed</span>
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  {bs.remaining} Awaiting Boarding
                </span>
              </div>
            </div>

            {/* Action Bar on Active Trip */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button
                className="h-10 px-5 gap-2 font-semibold text-sm rounded-xl bg-primary hover:bg-primary/90 shadow-md shadow-primary/20"
                onClick={() => navigate('/driver/tracking')}
              >
                <QrCode className="h-4 w-4" /> Open Fast Scanner
              </Button>
              <Button
                variant="outline"
                className="h-10 px-4 gap-2 font-semibold text-sm rounded-xl border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
                onClick={() => navigate('/driver/tracking')}
              >
                <Navigation className="h-4 w-4 animate-pulse" /> Launch GPS Map
              </Button>
              <Button
                variant="ghost"
                className="h-10 px-3 gap-1 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => navigate('/driver/trips')}
              >
                Full Route Details <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* Standby / No Active Trip Card */
        <div className="p-8 rounded-3xl border border-border/80 bg-gradient-to-br from-card via-card to-muted/20 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-sm">
            <Bus className="h-8 w-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-xl font-bold text-foreground">Cockpit in Standby Mode</h3>
            <p className="text-xs text-muted-foreground">
              You do not have a trip in progress right now. Check your schedule to start your next assigned route.
            </p>
          </div>
          <Button
            className="h-10 px-5 gap-2 font-semibold text-sm rounded-xl shadow-md"
            onClick={() => navigate('/driver/trips')}
          >
            <Route className="h-4 w-4" /> View Scheduled Trips
          </Button>
        </div>
      )}

      {/* 3. Shift Telemetry Bento Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="stats-card rounded-2xl p-5 border border-border/80 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">
              Today's Trips
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Bus className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold font-mono text-foreground mt-3 tracking-tight">
            {data?.todayTrips ?? 0}
          </p>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <Clock className="h-3 w-3" /> Scheduled today
          </p>
        </div>

        <div className="stats-card rounded-2xl p-5 border border-border/80 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">
              Total Passengers
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold font-mono text-foreground mt-3 tracking-tight">
            {data?.totalPassengers ?? 0}
          </p>
          <p className="text-xs text-purple-600 dark:text-purple-400 mt-1 font-medium">
            Passengers transported
          </p>
        </div>

        <div className="stats-card rounded-2xl p-5 border border-border/80 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">
              Total Completed
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold font-mono text-foreground mt-3 tracking-tight">
            {data?.totalTrips ?? 0}
          </p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
            Completed shuttle routes
          </p>
        </div>

        <div className="stats-card rounded-2xl p-5 border border-border/80 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">
              Assigned Vehicle
            </span>
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center">
              <Car className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold font-mono text-foreground mt-3 tracking-tight truncate">
            {activeTrip?.vehicle?.busNumber || 'Bus Ready'}
          </p>
          <p className="text-xs text-teal-600 dark:text-teal-400 mt-1 font-medium">
            {activeTrip?.vehicle?.plateNumber ? `Plate [${activeTrip.vehicle.plateNumber}]` : 'System Verified'}
          </p>
        </div>
      </div>

      {/* 4. Split Mission Console: Passenger Manifest & Operational Controls */}
      {activeTrip && (
        <div className="grid gap-8 lg:grid-cols-12">
          {/* Passenger Manifest (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" /> Real-Time Passenger Manifest
                </h2>
                <p className="text-xs text-muted-foreground">
                  Verify boarding passes, scan QR tokens, and manage passenger attendance
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search passenger name or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>
            </div>

            {reservations.length === 0 ? (
              <Card className="border-dashed bg-card/50">
                <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Users className="h-10 w-10 opacity-40 mb-2" />
                  <p className="text-sm font-medium">
                    {searchQuery ? 'No matching passenger found' : 'No reservations assigned to this trip'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                {reservations.map((r: any) => {
                  const isCheckedIn = r.status === 'CHECKED_IN' || r.status === 'BOARDED';
                  return (
                    <div
                      key={r.id}
                      className="p-3.5 rounded-2xl bg-card border border-border/80 hover:border-primary/40 transition-colors flex items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                          {getInitials(r.participant?.firstName || '', r.participant?.lastName || '')}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-foreground truncate">
                            {r.participant?.firstName} {r.participant?.lastName}
                          </p>
                          <p className="text-xs font-mono text-muted-foreground">
                            Pass #{r.reservationCode}
                            {r.pickupPoint?.name && (
                              <span className="font-sans ml-1 text-muted-foreground">
                                • {r.pickupPoint.name}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={getBadgeVariant(r.status)} className="text-[10px]">
                          {r.status?.replace('_', ' ')}
                        </Badge>
                        {isCheckedIn ? (
                          <div className="w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                            <UserCheck className="h-4 w-4" />
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs text-primary gap-1"
                            onClick={() => navigate('/driver/tracking')}
                          >
                            <QrCode className="h-3.5 w-3.5" /> Scan
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Operational Tools & Controls (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Gauge className="h-5 w-5 text-primary" /> Operational Controls
              </h2>
              <p className="text-xs text-muted-foreground">
                Driver actions and emergency controls
              </p>
            </div>

            <div className="space-y-3">
              <Button
                className="w-full h-14 rounded-2xl justify-between px-5 font-semibold text-sm bg-primary hover:bg-primary/90 shadow-md shadow-primary/20"
                onClick={() => navigate('/driver/tracking')}
              >
                <span className="flex items-center gap-3">
                  <QrCode className="h-5 w-5" /> Launch QR Scanner
                </span>
                <ChevronRight className="h-4 w-4 opacity-70" />
              </Button>

              <Button
                variant="outline"
                className="w-full h-14 rounded-2xl justify-between px-5 font-semibold text-sm border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 shadow-xs"
                onClick={() => navigate('/driver/tracking')}
              >
                <span className="flex items-center gap-3">
                  <Navigation className="h-5 w-5 animate-pulse" /> Live GPS Tracking
                </span>
                <ChevronRight className="h-4 w-4 opacity-70" />
              </Button>

              <div className="p-4 rounded-2xl bg-card border border-border/80 space-y-2.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-bold block">
                  Trip Dispatch Status
                </span>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Route Active</span>
                  <span className="font-mono font-bold text-foreground">
                    {activeTrip.route?.name || 'Assigned Shuttle Route'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40">
                  <span className="text-muted-foreground">Departure Time</span>
                  <span className="font-mono font-bold text-foreground">
                    {activeTrip.departureTime ? formatTime(activeTrip.departureTime) : 'Immediate'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}