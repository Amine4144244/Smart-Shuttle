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
  ArrowLeft,
  Ticket,
} from 'lucide-react';

const STATUS_SEQUENCE = [
  { status: 'SCHEDULED', label: 'Scheduled', icon: Clock },
  { status: 'APPROACHING', label: 'On the Way', icon: Navigation },
  { status: 'NEAR_500M', label: '500m Away', icon: Radio },
  { status: 'NEAR_200M', label: '200m Away', icon: Radio },
  { status: 'ARRIVED', label: 'Arrived', icon: MapPin },
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
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-3 border-[#ffac00] border-t-transparent" />
        <p className="text-xs font-mono font-bold uppercase tracking-widest text-[#ffac00]">
          Connecting to Live Shuttle Telemetry...
        </p>
      </div>
    );
  }

  // If no trip is loaded or selected
  if (!trip) {
    const activeList = Array.isArray(activeTrips) ? activeTrips : [];
    return (
      <div className="space-y-6 max-w-4xl mx-auto pb-12 font-sans selection:bg-[#ffac00] selection:text-black">
        <div className="border-b border-neutral-200/80 dark:border-neutral-800 pb-5">
          <div className="flex items-center gap-2 mb-1.5">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors mr-2"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold tracking-widest uppercase bg-[#ffac00]/15 text-[#ffac00] border border-[#ffac00]/30">
              <Radio className="h-3 w-3" />
              LIVE SHUTTLE RADAR
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tighter text-neutral-950 dark:text-white">
            Select Active Shuttle Fleet
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Choose an in-progress shuttle route to stream live GPS coordinates and telemetry.
          </p>
        </div>

        {activeList.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-neutral-300 dark:border-neutral-800 p-12 text-center bg-white dark:bg-[#14161c] space-y-4">
            <Bus className="h-12 w-12 text-neutral-400 mx-auto opacity-40" />
            <div>
              <p className="text-base font-bold text-neutral-800 dark:text-neutral-200">
                No Active Shuttles on the Road
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-md mx-auto">
                There are currently no active shuttle runs broadcasting telemetry. Once a driver starts a scheduled run, live GPS radar will appear here automatically.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => navigate('/participant/tickets')}
                className="rounded-full bg-neutral-950 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-950 font-bold px-6 py-2.5 text-xs shadow transition-all flex items-center gap-2"
              >
                <Ticket className="h-3.5 w-3.5 text-[#ffac00]" />
                My Boarding Passes
              </button>
              <button
                onClick={() => navigate('/participant/bookings')}
                className="rounded-full border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#14161c] hover:bg-neutral-100 dark:hover:bg-neutral-800 font-bold px-5 py-2.5 text-xs transition-all"
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
                className="p-5 rounded-3xl bg-white dark:bg-[#14161c] border border-neutral-200/80 dark:border-neutral-800 hover:border-[#ffac00] shadow-sm hover:shadow-md cursor-pointer transition-all space-y-3 group"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#629b5c]/15 text-[#629b5c] border border-[#629b5c]/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#629b5c] animate-pulse" />
                    LIVE ON ROAD
                  </span>
                  <span className="text-xs font-mono font-bold text-neutral-400">
                    {t.vehicle?.busNumber || 'Bus Transit'}
                  </span>
                </div>

                <div>
                  <h3 className="font-extrabold text-base text-neutral-950 dark:text-white group-hover:text-[#ffac00] transition-colors">
                    {t.route?.name || 'Event Shuttle Express'}
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">
                    {t.route?.origin} → {t.route?.destination}
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs text-neutral-500 pt-2 border-t border-neutral-100 dark:border-neutral-800 font-mono">
                  <span>Driver: {t.driver?.user?.firstName || 'Assigned Driver'}</span>
                  <span className="text-[#ffac00] font-bold flex items-center gap-1">
                    Track Live <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans selection:bg-[#ffac00] selection:text-black">
      {/* 1. Header & Live Telemetry Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-200/80 dark:border-neutral-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors mr-2"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold tracking-widest uppercase bg-[#629b5c]/15 text-[#629b5c] border border-[#629b5c]/30">
              <span className="w-1.5 h-1.5 rounded-full bg-[#629b5c] animate-pulse" />
              LIVE SHUTTLE TELEMETRY
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tighter text-neutral-950 dark:text-white">
            {trip?.route?.name || 'Live Event Transit'}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Sub-second GPS bus telemetry with real-time ETA and stop progression.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {userPos && (
            <button
              onClick={locateMe}
              className="rounded-full h-10 px-4 text-xs font-bold border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#14161c] hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Locate className="h-3.5 w-3.5 text-blue-500" /> My Location
            </button>
          )}

          <div className="rounded-full bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 px-4 py-2 text-xs font-extrabold flex items-center gap-2 shadow-sm">
            <StatusIcon className="h-3.5 w-3.5 text-[#ffac00]" />
            <span>{statusLabel || tripStatus.replace('_', ' ')}</span>
          </div>
        </div>
      </div>

      {/* 2. Proximity Alert Banner */}
      {lastNotif && (
        <div className="p-4 rounded-3xl bg-[#ffac00] text-neutral-950 border border-[#e59b00] shadow-lg flex items-center gap-3 animate-in slide-in-from-top-2">
          <div className="w-8 h-8 rounded-full bg-black/10 flex items-center justify-center shrink-0">
            <Radio className="h-4 w-4 animate-ping" />
          </div>
          <div className="flex-1">
            <span className="text-[10px] font-extrabold uppercase tracking-widest block opacity-70">
              PROXIMITY RADAR ALERT
            </span>
            <p className="text-sm font-extrabold">{lastNotif}</p>
          </div>
        </div>
      )}

      {/* 3. Rivian Trip Status Sequence Stepper */}
      <div className="p-3 sm:p-4 rounded-3xl bg-white dark:bg-[#14161c] border border-neutral-200/80 dark:border-neutral-800 shadow-sm overflow-x-auto">
        <div className="flex items-center justify-between min-w-[650px] gap-2">
          {STATUS_SEQUENCE.map((step, idx) => {
            const currentIdx = STATUS_SEQUENCE.findIndex((s) => s.status === tripStatus);
            const isActive =
              idx <= currentIdx ||
              (tripStatus === 'IN_PROGRESS' && idx <= STATUS_SEQUENCE.findIndex((s) => s.status === 'IN_TRANSIT'));
            const StepIcon = step.icon;

            return (
              <div key={step.status} className="flex items-center gap-2 shrink-0">
                <div
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all ${
                    isActive
                      ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 font-extrabold shadow-sm'
                      : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-400 font-medium'
                  }`}
                >
                  <StepIcon className={`h-3.5 w-3.5 ${isActive ? 'text-[#ffac00]' : 'text-neutral-400'}`} />
                  <span className="text-[11px] whitespace-nowrap">{step.label}</span>
                </div>
                {idx < STATUS_SEQUENCE.length - 1 && (
                  <ChevronRight className={`h-3.5 w-3.5 ${isActive ? 'text-[#ffac00]' : 'text-neutral-300 dark:text-neutral-800'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Main Cockpit: Map (8 cols) + Telemetry Readouts (4 cols) */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Map View */}
        <div className="lg:col-span-8 rounded-3xl overflow-hidden border border-neutral-200/90 dark:border-neutral-800 bg-white dark:bg-[#14161c] shadow-md relative">
          <TrackingMap
            shuttlePosition={livePos}
            userPosition={userPos}
            origin={originPoint}
            destination={destPoint}
            stops={stopPoints}
            routePath={routePoints}
            height="540px"
            zoom={13}
          />
        </div>

        {/* Right Telemetry Column */}
        <div className="lg:col-span-4 space-y-4">
          {/* Live Telemetry Gauges Card */}
          <div className="p-5 rounded-3xl bg-white dark:bg-[#14161c] border border-neutral-200/80 dark:border-neutral-800 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#ffac00]">
                TELEMETRY TELEMETRICS
              </span>
              <span className="flex h-2 w-2 rounded-full bg-[#629b5c] animate-pulse" />
            </div>

            {/* Speed & ETA Gauge Duo */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 p-3.5 text-center">
                <Gauge className="mx-auto mb-1 h-4 w-4 text-[#ffac00]" />
                <p className="text-2xl font-extrabold font-mono text-neutral-950 dark:text-white">
                  {speed ? `${Math.round(speed)}` : '0'}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">km/h Speed</p>
              </div>

              <div className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 p-3.5 text-center">
                <Timer className="mx-auto mb-1 h-4 w-4 text-[#629b5c]" />
                <p className="text-2xl font-extrabold font-mono text-[#ffac00]">
                  {eta || '--:--'}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Estimated ETA</p>
              </div>
            </div>

            {/* Distance Remaining */}
            {distance !== null && (
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-neutral-500 font-medium">Distance to Station</span>
                <span className="font-extrabold font-mono text-neutral-950 dark:text-white">
                  {distance.toFixed(1)} km
                </span>
              </div>
            )}

            {/* Progress Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-xs">
                <span className="text-neutral-500 font-medium">Trip Progress</span>
                <span className="font-extrabold font-mono text-neutral-950 dark:text-white">
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

          {/* Vehicle & Driver Card */}
          <div className="p-5 rounded-3xl bg-white dark:bg-[#14161c] border border-neutral-200/80 dark:border-neutral-800 space-y-3.5 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#ffac00]/20 text-[#ffac00] flex items-center justify-center font-bold">
                <Bus className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-neutral-950 dark:text-white">
                  Shuttle Bus {trip?.vehicle?.busNumber || 'Assigned'}
                </h3>
                {trip?.vehicle?.plateNumber && (
                  <p className="text-[11px] font-mono text-neutral-400">
                    Plate: {trip.vehicle.plateNumber}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-neutral-100 dark:border-neutral-800 text-xs">
              {trip?.driver?.user && (
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Driver</span>
                  <span className="font-bold text-neutral-900 dark:text-white">
                    {trip.driver.user.firstName} {trip.driver.user.lastName}
                  </span>
                </div>
              )}
              {trip?.departureTime && (
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Departure</span>
                  <span className="font-mono font-bold text-neutral-900 dark:text-white">
                    {formatTime(trip.departureTime)}
                  </span>
                </div>
              )}
              {trip?.reservations && (
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Passenger Load</span>
                  <span className="font-mono font-bold text-[#629b5c]">
                    {trip.reservations.length} Passengers Onboard
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Route Station Stops */}
          {trip?.route?.stops && trip.route.stops.length > 0 && (
            <div className="p-5 rounded-3xl bg-white dark:bg-[#14161c] border border-neutral-200/80 dark:border-neutral-800 space-y-3 shadow-sm">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-400 block">
                STATION STOPS
              </span>
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-[#629b5c] shrink-0" />
                  <span className="font-bold text-neutral-900 dark:text-white truncate">
                    {trip.route.origin}
                  </span>
                </div>
                {trip.route.stops.map((stop: any) => (
                  <div key={stop.id} className="ml-1 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full border border-neutral-400 shrink-0" />
                    <span className="text-neutral-500 dark:text-neutral-400 truncate">{stop.name}</span>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-rose-500 shrink-0" />
                  <span className="font-bold text-neutral-900 dark:text-white truncate">
                    {trip.route.destination}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
