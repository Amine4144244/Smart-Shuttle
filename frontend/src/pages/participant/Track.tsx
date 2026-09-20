import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { tripsApi, reservationsApi } from '@/services/api';
import { useSocket } from '@/hooks/useSocket';
import { formatTime } from '@/lib/utils';
import TrackingMap from '@/components/maps/TrackingMap';
import { MapPoint } from '@/services/googleMaps';
import { useEffect, useState } from 'react';
import {
  Navigation,
  Gauge,
  Timer,
  Bus,
  MapPin,
  Clock,
  CheckCircle2,
  Radio,
  Users,
  ChevronRight,
  Locate,
  Sparkles,
  Phone,
  ShieldCheck,
  Ticket,
  Milestone,
  Compass,
  AlertCircle,
} from 'lucide-react';

const STATUS_SEQUENCE = [
  { status: 'SCHEDULED', label: 'Scheduled', icon: Clock },
  { status: 'APPROACHING', label: 'Approaching', icon: Navigation },
  { status: 'NEAR_500M', label: '500m Away', icon: Radio },
  { status: 'NEAR_200M', label: '200m Away', icon: Radio },
  { status: 'ARRIVED', label: 'At Station', icon: MapPin },
  { status: 'BOARDING', label: 'Boarding', icon: Users },
  { status: 'IN_TRANSIT', label: 'In Transit', icon: Bus },
  { status: 'COMPLETED', label: 'Completed', icon: CheckCircle2 },
];

export default function ParticipantTrack() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { subscribe, joinTrip, leaveTrip } = useSocket();
  const [livePos, setLivePos] = useState<[number, number] | undefined>();
  const [userPos, setUserPos] = useState<[number, number] | undefined>();
  const [gpsDenied, setGpsDenied] = useState(false);
  const [liveSpeed, setLiveSpeed] = useState(0);
  const [liveEta, setLiveEta] = useState<string | null>(null);
  const [liveDistance, setLiveDistance] = useState<number | null>(null);
  const [liveProgress, setLiveProgress] = useState(0);
  const [tripStatus, setTripStatus] = useState<string>('SCHEDULED');
  const [statusLabel, setStatusLabel] = useState('Waiting');
  const [proximityStage, setProximityStage] = useState<string | null>(null);
  const [lastNotif, setLastNotif] = useState<string | null>(null);

  const { data: trip, isLoading } = useQuery({
    queryKey: ['trip', tripId],
    queryFn: () => tripsApi.getById(tripId!).then((r) => r.data),
    enabled: !!tripId,
  });

  useEffect(() => {
    if (trip?.status) setTripStatus(trip.status);
    if (trip?.currentLat && trip?.currentLng) setLivePos([trip.currentLat, trip.currentLng]);
  }, [trip]);

  useEffect(() => {
    if (!tripId) return;
    joinTrip(tripId);

    const unsubLocation = subscribe(`trip:${tripId}`, 'location-update', (data: any) => {
      if (data.lat && data.lng) {
        setLivePos([data.lat, data.lng]);
        if (data.speed !== undefined) setLiveSpeed(data.speed);
        if (data.estimatedArrival) setLiveEta(formatTime(data.estimatedArrival));
        if (data.remainingDistance !== undefined) setLiveDistance(data.remainingDistance);
        if (data.progress !== undefined) setLiveProgress(data.progress);
      }
    });

    const unsubStatus = subscribe(`trip:${tripId}`, 'trip-status-changed', (data: any) => {
      setTripStatus(data.status);
      setStatusLabel(data.label || String(data.status).replace('_', ' '));
    });

    const unsubProximity = subscribe(`trip:${tripId}`, 'shuttle-near', (data: any) => {
      setProximityStage(data.stage);
      if (data.stage === 'approaching') {
        setLastNotif('Shuttle is 500m away — prepare for boarding');
        setTimeout(() => setLastNotif(null), 6000);
      } else if (data.stage === 'very-close') {
        setLastNotif('Shuttle is almost at your station (200m)!');
        setTimeout(() => setLastNotif(null), 6000);
      } else if (data.stage === 'arrived') {
        setLastNotif('Shuttle has arrived at pickup point!');
      }
    });

    return () => {
      leaveTrip(tripId);
      unsubLocation();
      unsubStatus();
      unsubProximity();
    };
  }, [subscribe, joinTrip, leaveTrip, tripId]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsDenied(true);
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserPos([pos.coords.latitude, pos.coords.longitude]);
        setGpsDenied(false);
      },
      () => setGpsDenied(true),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const locateMe = () => {
    if (!navigator.geolocation || !userPos) return;
    window.dispatchEvent(new CustomEvent('locate-user', { detail: userPos }));
  };

  const StatusIcon = STATUS_SEQUENCE.find((s) => s.status === tripStatus)?.icon || Clock;
  const progress = trip?.tripProgress !== undefined ? Math.round(trip.tripProgress) : liveProgress;
  const speed = trip?.currentSpeed || liveSpeed;
  const eta = liveEta || (trip?.estimatedArrival ? formatTime(trip.estimatedArrival) : null);
  const distance = liveDistance;

  const stopPoints: MapPoint[] =
    trip?.route?.stops?.map((s: any) => ({
      lat: s.latitude,
      lng: s.longitude,
      name: s.name,
    })) || [];

  // Fallback queries if no tripId is provided or if trip not found
  const { data: activeTrips, isLoading: isActiveTripsLoading } = useQuery({
    queryKey: ['active-trips-list'],
    queryFn: () => tripsApi.getActive().then((r) => r.data),
    enabled: !tripId || !trip,
  });

  const { data: myReservations } = useQuery({
    queryKey: ['my-reservations-track'],
    queryFn: () => reservationsApi.getMyReservations().then((r) => r.data),
    enabled: !tripId || !trip,
  });

  // If no tripId in URL, but user has an active reservation with a trip, auto-navigate to it
  useEffect(() => {
    if (!tripId && Array.isArray(myReservations)) {
      const activeRes = myReservations.find(
        (r: any) => r.trip?.id && ['CONFIRMED', 'CHECKED_IN', 'BOARDED'].includes(r.status)
      );
      if (activeRes?.trip?.id) {
        navigate(`/participant/track/${activeRes.trip.id}`, { replace: true });
      }
    }
  }, [tripId, myReservations, navigate]);

  const originPoint = trip?.route
    ? {
        lat: trip.route.originLat || 0,
        lng: trip.route.originLng || 0,
        name: trip.route.origin,
      }
    : undefined;

  const destPoint = trip?.route
    ? {
        lat: trip.route.destinationLat || 0,
        lng: trip.route.destinationLng || 0,
        name: trip.route.destination,
      }
    : undefined;

  const routePoints: [number, number][] = [];
  if (originPoint) routePoints.push([originPoint.lat, originPoint.lng]);
  stopPoints.forEach((s) => routePoints.push([s.lat, s.lng]));
  if (destPoint) routePoints.push([destPoint.lat, destPoint.lng]);

  if (isLoading || (isActiveTripsLoading && !tripId)) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <div className="relative flex items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-3 border-[#ffac00] border-t-transparent" />
          <Radio className="absolute h-5 w-5 text-[#ffac00] animate-pulse" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-xs font-mono font-bold uppercase tracking-widest text-[#ffac00]">
            Syncing Live Shuttle Radar
          </p>
          <p className="text-xs text-neutral-400 font-sans">
            Connecting to Moroccan GPS telemetry stream...
          </p>
        </div>
      </div>
    );
  }

  // If no trip is loaded or selected: Fleet Selection View
  if (!trip) {
    const activeList = Array.isArray(activeTrips) ? activeTrips : [];
    return (
      <div className="space-y-6 max-w-5xl mx-auto pb-12 font-sans selection:bg-[#ffac00] selection:text-black">
        {/* Top Header Card */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-200/80 dark:border-neutral-800 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold tracking-widest uppercase bg-[#ffac00]/15 text-[#ffac00] border border-[#ffac00]/30 shadow-sm">
                <Radio className="h-3 w-3 animate-pulse" />
                LIVE RADAR RADIAL
              </span>
              <span className="text-xs font-mono text-neutral-400">
                {activeList.length} Active {activeList.length === 1 ? 'Shuttle' : 'Shuttles'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-neutral-950 dark:text-white">
              Select Active Shuttle Fleet
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 max-w-xl">
              Select any live vehicle on the road to stream real-time GPS positioning, arrival estimates, and stop progression.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => navigate('/participant/tickets')}
              className="rounded-full bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-neutral-100 dark:text-neutral-900 font-bold px-4 py-2 text-xs shadow-sm transition-all flex items-center gap-1.5"
            >
              <Ticket className="h-3.5 w-3.5 text-[#ffac00]" />
              My Passes
            </button>
          </div>
        </div>

        {/* Fleet Grid or Empty State */}
        {activeList.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-neutral-300 dark:border-neutral-800 p-12 text-center bg-white dark:bg-[#14161c] space-y-4 shadow-sm">
            <div className="w-16 h-16 rounded-3xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center mx-auto text-neutral-400">
              <Bus className="h-8 w-8 opacity-60 text-[#ffac00]" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <p className="text-base font-bold text-neutral-900 dark:text-white">
                No Active Shuttles on the Road
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                There are currently no active shuttle runs broadcasting telemetry. Once a driver begins a scheduled trip, live GPS radar will appear here automatically.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => navigate('/participant/tickets')}
                className="rounded-full bg-[#ffac00] hover:bg-[#e59b00] text-neutral-950 font-extrabold px-6 py-2.5 text-xs shadow-md transition-all flex items-center gap-2"
              >
                <Ticket className="h-3.5 w-3.5 text-neutral-950" />
                View My Boarding Passes
              </button>
              <button
                onClick={() => navigate('/participant/bookings')}
                className="rounded-full border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#14161c] hover:bg-neutral-100 dark:hover:bg-neutral-800 font-bold px-5 py-2.5 text-xs transition-all text-neutral-800 dark:text-neutral-200"
              >
                Book Shuttle Pass
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {activeList.map((t: any) => (
              <div
                key={t.id}
                onClick={() => navigate(`/participant/track/${t.id}`)}
                className="group relative p-5 rounded-3xl bg-white dark:bg-[#14161c] border border-neutral-200/80 dark:border-neutral-800 hover:border-[#ffac00] dark:hover:border-[#ffac00] shadow-sm hover:shadow-lg cursor-pointer transition-all duration-300 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-[#629b5c]/15 text-[#629b5c] border border-[#629b5c]/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#629b5c] animate-pulse" />
                    LIVE TELEMETRY
                  </span>
                  <span className="text-xs font-mono font-bold text-neutral-400 bg-neutral-100 dark:bg-neutral-900 px-2.5 py-1 rounded-full">
                    {t.vehicle?.busNumber || 'Express Bus'}
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="font-black text-base text-neutral-950 dark:text-white group-hover:text-[#ffac00] transition-colors">
                    {t.route?.name || 'Event Shuttle Transit'}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                    <MapPin className="h-3.5 w-3.5 text-[#629b5c] shrink-0" />
                    <span className="truncate">{t.route?.origin || 'Start'}</span>
                    <ChevronRight className="h-3 w-3 text-neutral-400 shrink-0" />
                    <span className="truncate text-neutral-700 dark:text-neutral-300 font-bold">{t.route?.destination || 'End'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-neutral-100 dark:border-neutral-800/80 text-xs">
                  <div className="flex items-center gap-1.5 text-neutral-500">
                    <Users className="h-3.5 w-3.5 text-neutral-400" />
                    <span>Driver: <strong className="text-neutral-800 dark:text-neutral-200">{t.driver?.user?.firstName || 'Assigned'}</strong></span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[#ffac00] font-extrabold group-hover:translate-x-0.5 transition-transform">
                    Stream Radar <ChevronRight className="h-4 w-4" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Active Shuttle Live Cockpit View
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans selection:bg-[#ffac00] selection:text-black">
      {/* 1. Cockpit Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-200/80 dark:border-neutral-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold tracking-widest uppercase bg-[#629b5c]/15 text-[#629b5c] border border-[#629b5c]/30 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-[#629b5c] animate-pulse" />
              LIVE RADAR ACTIVE
            </span>
            {trip?.vehicle?.busNumber && (
              <span className="text-xs font-mono font-bold text-neutral-500 dark:text-neutral-400">
                Shuttle #{trip.vehicle.busNumber}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-neutral-950 dark:text-white">
            {trip?.route?.name || 'Live Event Transit'}
          </h1>
          <div className="flex items-center gap-1.5 text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
            <span className="font-semibold text-neutral-800 dark:text-neutral-200">{trip?.route?.origin}</span>
            <ChevronRight className="h-3.5 w-3.5 text-neutral-400" />
            <span className="font-semibold text-neutral-800 dark:text-neutral-200">{trip?.route?.destination}</span>
          </div>
        </div>

        {/* Right Actions & Status Pill */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {userPos && (
            <button
              onClick={locateMe}
              className="rounded-full h-10 px-4 text-xs font-bold border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#14161c] hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Locate className="h-3.5 w-3.5 text-blue-500" /> Center My GPS
            </button>
          )}

          <div className="rounded-full bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 px-4 py-2 text-xs font-black flex items-center gap-2 shadow-sm border border-neutral-800 dark:border-neutral-200">
            <StatusIcon className="h-3.5 w-3.5 text-[#ffac00]" />
            <span className="uppercase tracking-wider text-[11px]">{statusLabel || tripStatus.replace('_', ' ')}</span>
          </div>
        </div>
      </div>

      {/* 2. Proximity Radar Notification */}
      {lastNotif && (
        <div className="p-4 rounded-3xl bg-[#ffac00] text-neutral-950 border border-[#e59b00] shadow-lg flex items-center gap-3.5 animate-in slide-in-from-top-2">
          <div className="w-9 h-9 rounded-2xl bg-black/10 flex items-center justify-center shrink-0">
            <Radio className="h-5 w-5 animate-ping" />
          </div>
          <div className="flex-1">
            <span className="text-[10px] font-black uppercase tracking-widest block opacity-75">
              PROXIMITY RADAR ALERT
            </span>
            <p className="text-sm font-extrabold">{lastNotif}</p>
          </div>
        </div>
      )}

      {/* 3. Rivian Trip Status Milestone Stepper */}
      <div className="p-3 sm:p-4 rounded-3xl bg-white dark:bg-[#14161c] border border-neutral-200/80 dark:border-neutral-800 shadow-sm overflow-x-auto">
        <div className="flex items-center justify-between min-w-[680px] gap-2">
          {STATUS_SEQUENCE.map((step, idx) => {
            const currentIdx = STATUS_SEQUENCE.findIndex((s) => s.status === tripStatus);
            const isCompleted = idx < currentIdx;
            const isCurrent = idx === currentIdx || (tripStatus === 'IN_PROGRESS' && step.status === 'IN_TRANSIT');
            const StepIcon = step.icon;

            return (
              <div key={step.status} className="flex items-center gap-2 shrink-0">
                <div
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs transition-all ${
                    isCurrent
                      ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 font-black shadow-md border border-[#ffac00]/50'
                      : isCompleted
                      ? 'bg-[#629b5c]/15 text-[#629b5c] font-bold border border-[#629b5c]/30'
                      : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-400 font-medium'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#629b5c]" />
                  ) : (
                    <StepIcon className={`h-3.5 w-3.5 ${isCurrent ? 'text-[#ffac00]' : 'text-neutral-400'}`} />
                  )}
                  <span className="text-[11px] whitespace-nowrap">{step.label}</span>
                </div>
                {idx < STATUS_SEQUENCE.length - 1 && (
                  <ChevronRight
                    className={`h-3.5 w-3.5 ${
                      isCompleted || isCurrent ? 'text-[#ffac00]' : 'text-neutral-300 dark:text-neutral-800'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Live Telemetry Cockpit Grid */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left: Map Container with Floating HUD Overlays */}
        <div className="lg:col-span-8 rounded-3xl overflow-hidden border border-neutral-200/90 dark:border-neutral-800 bg-white dark:bg-[#14161c] shadow-md relative group">
          {/* Floating Map HUD (Top Left) */}
          <div className="absolute top-4 left-4 z-[400] bg-white/90 dark:bg-neutral-950/90 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-lg pointer-events-none flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#629b5c] animate-pulse" />
            <span className="text-[11px] font-mono font-bold text-neutral-800 dark:text-neutral-200">
              Live Shuttle Tracking
            </span>
          </div>

          {/* Floating Speed Overlay (Top Right) */}
          {speed > 0 && (
            <div className="absolute top-4 right-4 z-[400] bg-neutral-950/90 text-white backdrop-blur-md px-3.5 py-2 rounded-2xl border border-neutral-800 shadow-lg pointer-events-none flex items-center gap-1.5">
              <Gauge className="h-3.5 w-3.5 text-[#ffac00]" />
              <span className="text-xs font-mono font-black">{Math.round(speed)} km/h</span>
            </div>
          )}

          <TrackingMap
            shuttlePosition={livePos}
            userPosition={userPos}
            origin={originPoint}
            destination={destPoint}
            stops={stopPoints}
            routePath={routePoints}
            height="560px"
            zoom={13}
          />
        </div>

        {/* Right: Telemetry Readouts & Route Timeline */}
        <div className="lg:col-span-4 space-y-4">
          {/* Telemetry Numbers Bento */}
          <div className="p-5 rounded-3xl bg-white dark:bg-[#14161c] border border-neutral-200/80 dark:border-neutral-800 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#ffac00] flex items-center gap-1.5">
                <Compass className="h-3 w-3" />
                LIVE GAUGES
              </span>
              <span className="flex h-2 w-2 rounded-full bg-[#629b5c] animate-pulse" />
            </div>

            {/* Speed & ETA Gauge Duo */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 p-3.5 text-center">
                <Gauge className="mx-auto mb-1 h-4 w-4 text-[#ffac00]" />
                <p className="text-2xl font-black font-mono text-neutral-950 dark:text-white">
                  {speed ? `${Math.round(speed)}` : '0'}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">km/h Speed</p>
              </div>

              <div className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 p-3.5 text-center">
                <Timer className="mx-auto mb-1 h-4 w-4 text-[#629b5c]" />
                <p className="text-2xl font-black font-mono text-[#ffac00]">
                  {eta || '--:--'}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Estimated Arrival</p>
              </div>
            </div>

            {/* Distance Remaining */}
            {distance !== null && (
              <div className="flex items-center justify-between text-xs pt-1 border-t border-neutral-100 dark:border-neutral-800/80">
                <span className="text-neutral-500 font-medium">Remaining Distance</span>
                <span className="font-mono font-black text-neutral-950 dark:text-white">
                  {distance.toFixed(1)} km
                </span>
              </div>
            )}

            {/* Progress Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-xs">
                <span className="text-neutral-500 font-medium">Route Progress</span>
                <span className="font-mono font-black text-neutral-950 dark:text-white">
                  {progress}%
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                <div
                  className="h-full rounded-full bg-[#ffac00] transition-all duration-700 ease-out"
                  style={{ width: `${Math.min(100, Math.max(5, progress))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Vehicle & Driver Details */}
          <div className="p-5 rounded-3xl bg-white dark:bg-[#14161c] border border-neutral-200/80 dark:border-neutral-800 space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-[#ffac00]/20 text-[#ffac00] flex items-center justify-center font-bold">
                  <Bus className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-neutral-950 dark:text-white">
                    Bus #{trip?.vehicle?.busNumber || 'Fleet Vehicle'}
                  </h3>
                  {trip?.vehicle?.plateNumber && (
                    <p className="text-[11px] font-mono text-neutral-400">
                      Plate: {trip.vehicle.plateNumber}
                    </p>
                  )}
                </div>
              </div>

              {trip?.vehicle?.capacity && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-900 text-neutral-500 font-bold">
                  {trip.vehicle.capacity} Seats
                </span>
              )}
            </div>

            <div className="space-y-2 pt-2 border-t border-neutral-100 dark:border-neutral-800 text-xs">
              {trip?.driver?.user && (
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500 font-medium">Driver</span>
                  <div className="flex items-center gap-1.5 font-bold text-neutral-900 dark:text-white">
                    <span>{trip.driver.user.firstName} {trip.driver.user.lastName}</span>
                    {trip.driver.phone && (
                      <a
                        href={`tel:${trip.driver.phone}`}
                        className="p-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:text-[#ffac00]"
                        title="Call Driver"
                      >
                        <Phone className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              )}
              {trip?.departureTime && (
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500 font-medium">Scheduled Departure</span>
                  <span className="font-mono font-bold text-neutral-900 dark:text-white">
                    {formatTime(trip.departureTime)}
                  </span>
                </div>
              )}
              {trip?.reservations && (
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500 font-medium">Confirmed Passengers</span>
                  <span className="font-mono font-bold text-[#629b5c]">
                    {trip.reservations.length} Onboard
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Route Station Stops Timeline */}
          {trip?.route?.stops && trip.route.stops.length > 0 && (
            <div className="p-5 rounded-3xl bg-white dark:bg-[#14161c] border border-neutral-200/80 dark:border-neutral-800 space-y-3.5 shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 block">
                STATION STOPS & TIMELINE
              </span>
              <div className="space-y-3 text-xs relative pl-2">
                <div className="flex items-center gap-2.5">
                  <div className="h-3 w-3 rounded-full bg-[#629b5c] ring-4 ring-[#629b5c]/20 shrink-0" />
                  <div className="truncate">
                    <p className="font-bold text-neutral-900 dark:text-white truncate">
                      {trip.route.origin}
                    </p>
                    <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-mono">Origin Departure</span>
                  </div>
                </div>

                {trip.route.stops.map((stop: any, sIdx: number) => (
                  <div key={stop.id || sIdx} className="flex items-center gap-2.5 pl-0.5">
                    <div className="h-2 w-2 rounded-full border-2 border-neutral-400 shrink-0" />
                    <div className="truncate">
                      <p className="text-neutral-700 dark:text-neutral-300 truncate font-medium">{stop.name}</p>
                      <span className="text-[10px] text-neutral-400 font-mono">Stop #{sIdx + 1}</span>
                    </div>
                  </div>
                ))}

                <div className="flex items-center gap-2.5">
                  <div className="h-3 w-3 rounded-full bg-rose-500 ring-4 ring-rose-500/20 shrink-0" />
                  <div className="truncate">
                    <p className="font-bold text-neutral-900 dark:text-white truncate">
                      {trip.route.destination}
                    </p>
                    <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-mono">Event Destination</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Security & Reliability Footer Note */}
          <div className="flex items-center gap-2 px-3 py-2 text-[11px] text-neutral-400 dark:text-neutral-500">
            <ShieldCheck className="h-3.5 w-3.5 text-[#629b5c]" />
            <span>Encrypted Moroccan GPS Telemetry • Updates every 2s</span>
          </div>
        </div>
      </div>
    </div>
  );
}
