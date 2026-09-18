import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { tripsApi, trackingApi } from '@/services/api';
import { useSocket } from '@/hooks/useSocket';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getStatusColor, formatTime } from '@/lib/utils';
import TrackingMap from '@/components/maps/TrackingMap';
import { MapPoint } from '@/services/googleMaps';
import { Play, Square, Navigation, Gauge, Timer, Users, MapPin, AlertTriangle, CheckCircle2, QrCode, Bus } from 'lucide-react';
import toast from 'react-hot-toast';

type TripStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED' | 'CANCELLED';

export default function DriverTracking() {
  const navigate = useNavigate();
  const { subscribe, joinTrip, leaveTrip } = useSocket();
  const [gpsStatus, setGpsStatus] = useState<'inactive' | 'active' | 'error'>('inactive');
  const [currentPos, setCurrentPos] = useState<[number, number] | undefined>();
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [currentHeading, setCurrentHeading] = useState(0);
  const [eta, setEta] = useState<string | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const watchIdRef = useRef<number | null>(null);
  const gpsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: trip, refetch } = useQuery({
    queryKey: ['driver-current-trip'],
    queryFn: () => trackingApi.getDriverCurrentTrip().then(r => r.data),
    refetchInterval: 10000,
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TripStatus }) => {
      await trackingApi.changeTripStatus(id, status);
    },
    onSuccess: () => { refetch(); toast.success('Status updated'); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to update status'),
  });

  const sendLocation = useCallback(async (lat: number, lng: number, speed: number, heading: number) => {
    if (!trip?.id) return;
    try {
      const res = await trackingApi.updateLocation(trip.id, { lat, lng, speed: Math.round(speed * 3.6), heading });
      if (res.data?.eta) setEta(formatTime(res.data.eta));
      if (res.data?.distance !== undefined) setDistance(res.data.distance);
      if (res.data?.progress !== undefined) setProgress(res.data.progress);
    } catch {}
  }, [trip?.id]);

  const startGps = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const speed = position.coords.speed || 0;
        const heading = position.coords.heading || 0;

        setCurrentPos([lat, lng]);
        setCurrentSpeed(speed);
        setCurrentHeading(heading);
        setGpsStatus('active');

        await sendLocation(lat, lng, speed, heading);
      },
      () => { setGpsStatus('error'); toast.error('GPS signal lost'); },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );

    gpsIntervalRef.current = setInterval(() => {
      refetch();
    }, 30000);
  }, [sendLocation, refetch]);

  const stopGps = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (gpsIntervalRef.current) {
      clearInterval(gpsIntervalRef.current);
      gpsIntervalRef.current = null;
    }
    setGpsStatus('inactive');
    setCurrentPos(undefined);
    setCurrentSpeed(0);
  };

  const stopGpsRef = useRef(stopGps);
  stopGpsRef.current = stopGps;

  useEffect(() => {
    if (!trip?.id) return;
    joinTrip(trip.id);
    const unsub = subscribe(`trip:${trip.id}`, 'location-update', (payload: any) => {
      if (payload.estimatedArrival) setEta(formatTime(payload.estimatedArrival));
      if (payload.remainingDistance !== undefined) setDistance(payload.remainingDistance);
      if (payload.progress !== undefined) setProgress(payload.progress);
    });
    return () => { leaveTrip(trip.id); unsub(); };
  }, [trip?.id, subscribe, joinTrip, leaveTrip]);

  useEffect(() => {
    return () => { stopGpsRef.current(); };
  }, []);

  const getStatusOptions = (currentStatus: string) => {
    const transitions: Record<string, { label: string; status: TripStatus; icon: any }[]> = {
      SCHEDULED: [{ label: 'Start Trip', status: 'IN_PROGRESS', icon: Play }],
      IN_PROGRESS: [
        { label: 'Mark Delayed', status: 'DELAYED', icon: AlertTriangle },
        { label: 'Complete Trip', status: 'COMPLETED', icon: CheckCircle2 },
      ],
      DELAYED: [
        { label: 'Resume Trip', status: 'IN_PROGRESS', icon: Play },
        { label: 'Complete Trip', status: 'COMPLETED', icon: CheckCircle2 },
      ],
    };
    return transitions[currentStatus] || [];
  };

  const routePoints: [number, number][] = [];
  if (trip?.route?.originLat && trip?.route?.originLng) routePoints.push([trip.route.originLat, trip.route.originLng]);
  trip?.route?.stops?.forEach((s: any) => routePoints.push([s.latitude, s.longitude]));
  if (trip?.route?.destinationLat && trip?.route?.destinationLng) routePoints.push([trip.route.destinationLat, trip.route.destinationLng]);

  const stopPoints: MapPoint[] = trip?.route?.stops?.map((s: any) => ({ lat: s.latitude, lng: s.longitude, name: s.name })) || [];
  const originPoint = trip?.route ? { lat: trip.route.originLat || 0, lng: trip.route.originLng || 0, name: trip.route.origin } : undefined;
  const destPoint = trip?.route ? { lat: trip.route.destinationLat || 0, lng: trip.route.destinationLng || 0, name: trip.route.destination } : undefined;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-primary/10 text-primary border border-primary/20">
              <Navigation className="h-3 w-3" />
              TELEMETRY HUD
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-1.5 font-sans">
            GPS Tracking Console
          </h1>
          <p className="text-sm text-muted-foreground">
            Broadcast live shuttle coordinates and monitor passenger boarding
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            className="h-11 px-5 gap-2 font-semibold text-sm rounded-xl bg-primary hover:bg-primary/90 shadow-md shadow-primary/20 transition-all"
            onClick={() => navigate('/driver/scan-qr')}
          >
            <QrCode className="h-4 w-4" /> Scan QR
          </Button>

          {gpsStatus === 'inactive' ? (
            <Button
              onClick={startGps}
              className="h-11 px-5 gap-2 font-semibold text-sm rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/25 transition-all"
            >
              <Navigation className="h-4 w-4 animate-pulse" /> Start GPS
            </Button>
          ) : (
            <Button
              onClick={stopGps}
              variant="destructive"
              className="h-11 px-5 gap-2 font-semibold text-sm rounded-xl shadow-md shadow-destructive/25 transition-all"
            >
              <Square className="h-4 w-4" /> Stop GPS
            </Button>
          )}

          <Badge
            variant={gpsStatus === 'active' ? 'live' : gpsStatus === 'error' ? 'cancelled' : 'secondary'}
            className="h-11 px-4 font-mono text-xs rounded-xl font-bold border shadow-xs"
          >
            {gpsStatus === 'active' ? 'GPS Active' : gpsStatus === 'error' ? 'GPS Error' : 'GPS Off'}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="overflow-hidden border border-border/80 shadow-md rounded-2xl">
            <TrackingMap
              shuttlePosition={currentPos}
              shuttleHeading={currentHeading}
              origin={originPoint}
              destination={destPoint}
              stops={stopPoints}
              routePath={routePoints}
              height="520px"
            />
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border border-border/80 rounded-2xl shadow-sm">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Bus className="h-4 w-4 text-primary" /> Active Trip Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-mono uppercase tracking-wider text-[10px]">Status</span>
                <Badge className={getStatusColor(trip?.status || 'SCHEDULED')}>
                  {(trip?.status || 'SCHEDULED').replace('_', ' ')}
                </Badge>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-border/40">
                <span className="text-muted-foreground font-mono uppercase tracking-wider text-[10px]">Route</span>
                <span className="text-right font-bold text-foreground truncate max-w-[180px]">{trip?.route?.name || '-'}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-border/40">
                <span className="text-muted-foreground font-mono uppercase tracking-wider text-[10px]">Vehicle</span>
                <span className="font-mono font-bold text-foreground">{trip?.vehicle?.busNumber || '-'}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-border/40">
                <span className="text-muted-foreground font-mono uppercase tracking-wider text-[10px]">Passengers</span>
                <span className="font-mono font-bold text-primary">{trip?._count?.reservations || 0} Boarded</span>
              </div>
            </CardContent>
          </Card>

          {gpsStatus === 'active' && (
            <Card className="border border-blue-500/30 bg-gradient-to-br from-card via-card to-blue-500/[0.05] rounded-2xl shadow-md">
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-blue-600 dark:text-blue-400">
                  <Gauge className="h-4 w-4 animate-pulse" /> Live Telemetry Data
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/60 flex items-center gap-3">
                    <Gauge className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <p className="text-xl font-extrabold font-mono text-foreground">{(currentSpeed * 3.6).toFixed(0)}</p>
                      <p className="text-[10px] uppercase font-mono text-muted-foreground">km/h speed</p>
                    </div>
                  </div>

                  {distance !== null && (
                    <div className="p-3 rounded-xl bg-muted/40 border border-border/60 flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-emerald-500 shrink-0" />
                      <div>
                        <p className="text-xl font-extrabold font-mono text-foreground">{distance.toFixed(1)}</p>
                        <p className="text-[10px] uppercase font-mono text-muted-foreground">km remaining</p>
                      </div>
                    </div>
                  )}
                </div>

                {eta && (
                  <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 flex items-center gap-3">
                    <Timer className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <p className="text-lg font-bold font-mono text-foreground">{eta}</p>
                      <p className="text-[10px] uppercase font-mono text-primary font-semibold">Estimated Arrival Time</p>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-muted-foreground">Route Progress</span>
                    <span className="font-bold text-foreground">{progress}%</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
                  </div>
                </div>

                {currentPos && (
                  <div className="text-[11px] font-mono text-muted-foreground text-center pt-1">
                    GPS: {currentPos[0].toFixed(5)}, {currentPos[1].toFixed(5)}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="border border-border/80 rounded-2xl shadow-sm">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-base font-bold">Operational Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 pt-4">
              {getStatusOptions(trip?.status || 'SCHEDULED').map((action) => (
                <Button
                  key={action.label}
                  className="w-full h-11 rounded-xl font-semibold text-sm justify-center gap-2 shadow-xs"
                  variant={action.status === 'COMPLETED' ? 'default' : 'outline'}
                  onClick={() => trip?.id && statusMutation.mutate({ id: trip.id, status: action.status })}
                  disabled={statusMutation.isPending}
                >
                  <action.icon className="h-4 w-4" />
                  {action.label}
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
