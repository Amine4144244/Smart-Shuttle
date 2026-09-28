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
  });

  const { data: myReservations, isLoading: isReservationsLoading } = useQuery({
    queryKey: ['my-reservations-track'],
    queryFn: () => reservationsApi.getMyReservations().then((r) => r.data),
  });

  // Calculate active valid reservations and corresponding booked event/trip IDs
  const validReservations = (Array.isArray(myReservations) ? myReservations : []).filter(
    (r: any) => !['CANCELLED', 'REJECTED', 'NO_SHOW'].includes(r.status)
  );

  // Map each booked reservation to its corresponding active/scheduled trip (if available)
  const bookedEventCards = validReservations.map((res: any) => {
    const eventId = res.event?.id || res.eventId;
    const matchingTrip = (Array.isArray(activeTrips) ? activeTrips : []).find((t: any) => {
      const tripEventId = t.route?.eventId || t.route?.event?.id || t.eventId;
      return (t.id && (t.id === res.tripId || t.id === res.trip?.id)) || (tripEventId && tripEventId === eventId);
    }) || res.trip;

    return {
      reservation: res,
      event: res.event,
      pickupPoint: res.pickupPoint,
      trip: matchingTrip,
    };
  });

  const hasBookedEvents = bookedEventCards.length > 0;

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

  if (isLoading || ((isActiveTripsLoading || isReservationsLoading) && !tripId)) {
    return (
      <div className="flex h-[50vh] sm:h-[60vh] flex-col items-center justify-center gap-3 sm:gap-4 px-4 text-center">
        <div className="relative flex items-center justify-center">
          <div className="h-10 w-10 sm:h-12 sm:w-12 animate-spin rounded-full border-3 border-[#ffac00] border-t-transparent" />
          <Radio className="absolute h-4 w-4 sm:h-5 sm:w-5 text-[#ffac00] animate-pulse" />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-mono font-bold uppercase tracking-widest text-[#ffac00]">
            Syncing Live Shuttle Radar
          </p>
          <p className="text-[11px] sm:text-xs text-neutral-400 font-sans">
            Connecting to GPS telemetry stream...
          </p>
        </div>
      </div>
    );
  }

  // If no trip is loaded or selected: Display Participant's Booked Events & Shuttles
  if (!trip) {
    return (
      <div className="space-y-5 sm:space-y-6 max-w-5xl mx-auto pb-12 font-sans selection:bg-[#ffac00] selection:text-black">
        {/* Top Header Card */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 border-b border-neutral-200/80 dark:border-neutral-800 pb-4 sm:pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold tracking-widest uppercase bg-[#ffac00]/15 text-[#ffac00] border border-[#ffac00]/30 shadow-xs">
                <Radio className="h-3 w-3 animate-pulse" />
                LIVE RADAR RADIAL
              </span>
              <span className="text-[11px] sm:text-xs font-mono text-neutral-400">
                {bookedEventCards.length} Booked {bookedEventCards.length === 1 ? 'Event' : 'Events'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-neutral-950 dark:text-white">
              My Booked Shuttle Radar
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 max-w-xl">
              Real-time GPS radar and live telemetry for shuttles associated with your booked events.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => navigate('/participant/bookings')}
              className="rounded-full border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#14161c] hover:bg-neutral-100 dark:hover:bg-neutral-800 font-bold px-4 py-2 text-xs shadow-xs transition-all flex items-center gap-1.5 text-neutral-800 dark:text-neutral-200"
            >
              <Ticket className="h-3.5 w-3.5 text-[#ffac00]" />
              Book Shuttle Pass
            </button>
            <button
              onClick={() => navigate('/participant/tickets')}
              className="rounded-full bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-neutral-100 dark:text-neutral-900 font-bold px-4 py-2 text-xs shadow-xs transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-[#629b5c]" />
              My Passes
            </button>
          </div>
        </div>

        {/* Fleet Grid or Empty State */}
        {!hasBookedEvents ? (
          <div className="rounded-3xl border border-dashed border-neutral-300 dark:border-neutral-800 p-8 sm:p-12 text-center bg-white dark:bg-[#14161c] space-y-4 shadow-xs">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-3xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center mx-auto text-neutral-400">
              <Ticket className="h-7 w-7 sm:h-8 sm:w-8 opacity-60 text-[#ffac00]" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <p className="text-base font-bold text-neutral-900 dark:text-white">
                No Booked Events Found
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                Live Radar only tracks shuttles for events you have reserved passes for. Reserve a shuttle pass for an upcoming event to unlock live GPS telemetry.
              </p>
            </div>
            <div className="flex items-center justify-center pt-2">
              <button
                onClick={() => navigate('/participant/bookings')}
                className="rounded-full bg-[#ffac00] hover:bg-[#e59b00] text-neutral-950 font-black px-6 py-2.5 text-xs shadow-md transition-all flex items-center justify-center gap-2"
              >
                <Ticket className="h-3.5 w-3.5 text-neutral-950" />
                Book Shuttle Pass
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:gap-5 grid-cols-1 md:grid-cols-2">
            {bookedEventCards.map((card: any) => {
              const res = card.reservation;
              const ev = card.event || {};
              const tr = card.trip;
              const isTripActive = tr && tr.status === 'IN_PROGRESS';
              const isTripScheduled = tr && tr.status === 'SCHEDULED';

              return (
                <div
                  key={res.id}
                  className="group relative p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#14161c] border border-neutral-200/90 dark:border-neutral-800 hover:border-[#ffac00] dark:hover:border-[#ffac00] shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between space-y-4"
                >
                  {/* Top Status & Event Tag */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      {isTripActive ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-[#629b5c]/15 text-[#629b5c] border border-[#629b5c]/30 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#629b5c] animate-pulse" />
                          LIVE TELEMETRY ACTIVE
                        </span>
                      ) : isTripScheduled ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/15 text-amber-500 border border-amber-500/30 shrink-0">
                          <Clock className="h-3 w-3" />
                          SHUTTLE SCHEDULED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-blue-500/15 text-blue-500 border border-blue-500/30 shrink-0">
                          <CheckCircle2 className="h-3 w-3" />
                          BOOKED EVENT PASS
                        </span>
                      )}

                      <span className="text-[11px] font-mono font-bold text-neutral-400 bg-neutral-100 dark:bg-neutral-900 px-2.5 py-0.5 rounded-full">
                        Pass #{res.reservationCode || res.id.slice(0, 8)}
                      </span>
                    </div>

                    {/* Event Name & Date */}
                    <div>
                      <h3 className="font-black text-lg sm:text-xl text-neutral-950 dark:text-white group-hover:text-[#ffac00] transition-colors leading-tight">
                        {ev.name || 'Event Shuttle Transit'}
                      </h3>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium mt-0.5">
                        {res.date ? new Date(res.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'Scheduled Event'}
                      </p>
                    </div>

                    {/* Route / Pickup Locations */}
                    <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-100 dark:border-neutral-800/80 space-y-2 text-xs">
                      {res.pickupPoint?.name || res.pickupAddress ? (
                        <div className="flex items-start gap-2">
                          <MapPin className="h-3.5 w-3.5 text-[#629b5c] shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">Your Pickup Station</span>
                            <p className="font-bold text-neutral-900 dark:text-white truncate">
                              {res.pickupPoint?.name || res.pickupAddress}
                            </p>
                          </div>
                        </div>
                      ) : null}

                      {ev.address && (
                        <div className="flex items-start gap-2 pt-1.5 border-t border-neutral-200/50 dark:border-neutral-800/50">
                          <Milestone className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">Event Destination</span>
                            <p className="font-medium text-neutral-700 dark:text-neutral-300 truncate">
                              {ev.address}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Shuttle & Driver Details */}
                    {tr ? (
                      <div className="flex items-center justify-between gap-2 text-xs pt-1">
                        <div className="flex items-center gap-2 truncate">
                          <div className="w-7 h-7 rounded-xl bg-[#ffac00]/15 text-[#ffac00] flex items-center justify-center font-bold shrink-0">
                            <Bus className="h-3.5 w-3.5" />
                          </div>
                          <div className="truncate">
                            <span className="font-bold text-neutral-900 dark:text-white block truncate">
                              {tr.vehicle?.busNumber || 'Fleet Shuttle'}
                            </span>
                            <span className="text-[10px] text-neutral-400 block truncate">
                              Driver: {tr.driver?.user?.firstName || 'Assigned Driver'}
                            </span>
                          </div>
                        </div>

                        {tr.departureTime && (
                          <span className="text-[11px] font-mono font-bold text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full shrink-0">
                            {formatTime(tr.departureTime)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-neutral-400 pt-1">
                        <Users className="h-3.5 w-3.5 text-[#ffac00] shrink-0" />
                        <span className="text-[11px]">Pass Valid for {res.passengerCount || 1} Passenger(s) • Shuttle standing by</span>
                      </div>
                    )}
                  </div>

                  {/* Card Action CTA */}
                  <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between gap-2">
                    {tr?.id ? (
                      <button
                        onClick={() => navigate(`/participant/track/${tr.id}`)}
                        className="w-full rounded-2xl bg-[#ffac00] hover:bg-[#e59b00] text-neutral-950 font-black px-4 py-2.5 text-xs shadow-md transition-all flex items-center justify-center gap-2"
                      >
                        <Radio className="h-3.5 w-3.5 text-neutral-950 animate-pulse" />
                        Stream Live Radar
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => navigate('/participant/tickets')}
                        className="w-full rounded-2xl bg-neutral-950 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-950 font-bold px-4 py-2.5 text-xs shadow-xs transition-all flex items-center justify-center gap-2"
                      >
                        <Ticket className="h-3.5 w-3.5 text-[#ffac00]" />
                        View Boarding Pass
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Active Shuttle Live Cockpit View
  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto pb-12 font-sans selection:bg-[#ffac00] selection:text-black">
      {/* 1. Cockpit Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 border-b border-neutral-200/80 dark:border-neutral-800 pb-4 sm:pb-5">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-extrabold tracking-widest uppercase bg-[#629b5c]/15 text-[#629b5c] border border-[#629b5c]/30 shadow-xs shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-[#629b5c] animate-pulse" />
              LIVE RADAR ACTIVE
            </span>
            {trip?.route?.event?.name && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#ffac00]/15 text-[#ffac00] border border-[#ffac00]/30 shrink-0">
                <Ticket className="h-3 w-3" />
                {trip.route.event.name}
              </span>
            )}
            {trip?.vehicle?.busNumber && (
              <span className="text-[11px] sm:text-xs font-mono font-bold text-neutral-500 dark:text-neutral-400 truncate">
                Shuttle #{trip.vehicle.busNumber}
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-neutral-950 dark:text-white truncate">
            {trip?.route?.name || 'Live Event Transit'}
          </h1>
          <div className="flex items-center gap-1.5 text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 truncate">
            <span className="font-semibold text-neutral-800 dark:text-neutral-200 truncate">{trip?.route?.origin}</span>
            <ChevronRight className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
            <span className="font-semibold text-neutral-800 dark:text-neutral-200 truncate">{trip?.route?.destination}</span>
          </div>
        </div>

        {/* Right Actions & Status Pill */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            onClick={() => navigate('/participant/track')}
            className="rounded-full h-9 sm:h-10 px-3.5 sm:px-4 text-xs font-bold border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#14161c] hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5 shadow-xs transition-all"
          >
            <ChevronRight className="h-3.5 w-3.5 rotate-180" /> All Booked Shuttles
          </button>
          {userPos && (
            <button
              onClick={locateMe}
              className="rounded-full h-9 sm:h-10 px-3.5 sm:px-4 text-xs font-bold border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#14161c] hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5 shadow-xs transition-all"
            >
              <Locate className="h-3.5 w-3.5 text-blue-500" /> Center GPS
            </button>
          )}

          <div className="rounded-full bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 px-3.5 sm:px-4 py-1.5 sm:py-2 text-xs font-black flex items-center gap-2 shadow-xs border border-neutral-800 dark:border-neutral-200">
            <StatusIcon className="h-3.5 w-3.5 text-[#ffac00]" />
            <span className="uppercase tracking-wider text-[10px] sm:text-[11px]">{statusLabel || tripStatus.replace('_', ' ')}</span>
          </div>
        </div>
      </div>

      {/* 2. Proximity Radar Notification */}
      {lastNotif && (
        <div className="p-3.5 sm:p-4 rounded-3xl bg-[#ffac00] text-neutral-950 border border-[#e59b00] shadow-lg flex items-center gap-3 animate-in slide-in-from-top-2">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-black/10 flex items-center justify-center shrink-0">
            <Radio className="h-4 w-4 sm:h-5 sm:w-5 animate-ping" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest block opacity-75">
              PROXIMITY RADAR ALERT
            </span>
            <p className="text-xs sm:text-sm font-black truncate">{lastNotif}</p>
          </div>
        </div>
      )}

      {/* 3. Milestone Stepper (Touch scrollable) */}
      <div className="p-2.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-white dark:bg-[#14161c] border border-neutral-200/80 dark:border-neutral-800 shadow-xs overflow-x-auto no-scrollbar">
        <div className="flex items-center justify-between min-w-[620px] sm:min-w-[680px] gap-1.5 sm:gap-2">
          {STATUS_SEQUENCE.map((step, idx) => {
            const currentIdx = STATUS_SEQUENCE.findIndex((s) => s.status === tripStatus);
            const isCompleted = idx < currentIdx;
            const isCurrent = idx === currentIdx || (tripStatus === 'IN_PROGRESS' && step.status === 'IN_TRANSIT');
            const StepIcon = step.icon;

            return (
              <div key={step.status} className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <div
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs transition-all ${
                    isCurrent
                      ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 font-black shadow-md border border-[#ffac00]/50'
                      : isCompleted
                      ? 'bg-[#629b5c]/15 text-[#629b5c] font-bold border border-[#629b5c]/30'
                      : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-400 font-medium'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-[#629b5c]" />
                  ) : (
                    <StepIcon className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${isCurrent ? 'text-[#ffac00]' : 'text-neutral-400'}`} />
                  )}
                  <span className="text-[10px] sm:text-[11px] whitespace-nowrap">{step.label}</span>
                </div>
                {idx < STATUS_SEQUENCE.length - 1 && (
                  <ChevronRight
                    className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${
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
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-12">
        {/* Left: Map Container with Floating HUD Overlays */}
        <div className="lg:col-span-8 rounded-3xl overflow-hidden border border-neutral-200/90 dark:border-neutral-800 bg-white dark:bg-[#14161c] shadow-md relative group">
          {/* Floating Map HUD (Top Left) */}
          <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-[400] bg-white/95 dark:bg-neutral-950/95 backdrop-blur-md px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl sm:rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-md pointer-events-none flex items-center gap-1.5 sm:gap-2">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#629b5c] animate-pulse" />
            <span className="text-[10px] sm:text-[11px] font-mono font-bold text-neutral-800 dark:text-neutral-200">
              Live Shuttle Radar
            </span>
          </div>

          {/* Floating Speed Overlay (Top Right) */}
          {speed > 0 && (
            <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-[400] bg-neutral-950/95 text-white backdrop-blur-md px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl sm:rounded-2xl border border-neutral-800 shadow-md pointer-events-none flex items-center gap-1.5">
              <Gauge className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-[#ffac00]" />
              <span className="text-[10px] sm:text-xs font-mono font-black">{Math.round(speed)} km/h</span>
            </div>
          )}

          <TrackingMap
            shuttlePosition={livePos}
            userPosition={userPos}
            origin={originPoint}
            destination={destPoint}
            stops={stopPoints}
            routePath={routePoints}
            height="380px"
            zoom={13}
          />
        </div>

        {/* Right: Telemetry Readouts & Route Timeline */}
        <div className="lg:col-span-4 space-y-4">
          {/* Telemetry Numbers Bento */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#14161c] border border-neutral-200/80 dark:border-neutral-800 space-y-3.5 sm:space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#ffac00] flex items-center gap-1.5">
                <Compass className="h-3 w-3" />
                LIVE GAUGES
              </span>
              <span className="flex h-2 w-2 rounded-full bg-[#629b5c] animate-pulse" />
            </div>

            {/* Speed & ETA Gauge Duo */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 p-2.5 sm:p-3.5 text-center">
                <Gauge className="mx-auto mb-1 h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#ffac00]" />
                <p className="text-xl sm:text-2xl font-black font-mono text-neutral-950 dark:text-white">
                  {speed ? `${Math.round(speed)}` : '0'}
                </p>
                <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-neutral-400">km/h Speed</p>
              </div>

              <div className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 p-2.5 sm:p-3.5 text-center">
                <Timer className="mx-auto mb-1 h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#629b5c]" />
                <p className="text-xl sm:text-2xl font-black font-mono text-[#ffac00] truncate">
                  {eta || '--:--'}
                </p>
                <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-neutral-400">Estimated ETA</p>
              </div>
            </div>

            {/* Distance Remaining */}
            {distance !== null && (
              <div className="flex items-center justify-between text-xs pt-1 border-t border-neutral-100 dark:border-neutral-800/80">
                <span className="text-neutral-500 font-medium text-[11px] sm:text-xs">Remaining Distance</span>
                <span className="font-mono font-black text-neutral-950 dark:text-white text-[11px] sm:text-xs">
                  {distance.toFixed(1)} km
                </span>
              </div>
            )}

            {/* Progress Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-xs">
                <span className="text-neutral-500 font-medium text-[11px] sm:text-xs">Route Progress</span>
                <span className="font-mono font-black text-neutral-950 dark:text-white text-[11px] sm:text-xs">
                  {progress}%
                </span>
              </div>
              <div className="h-2 sm:h-2.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                <div
                  className="h-full rounded-full bg-[#ffac00] transition-all duration-700 ease-out"
                  style={{ width: `${Math.min(100, Math.max(5, progress))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Vehicle & Driver Details */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#14161c] border border-neutral-200/80 dark:border-neutral-800 space-y-3 sm:space-y-3.5 shadow-xs">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-[#ffac00]/20 text-[#ffac00] flex items-center justify-center font-bold shrink-0">
                  <Bus className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-xs sm:text-sm text-neutral-950 dark:text-white truncate">
                    Bus #{trip?.vehicle?.busNumber || 'Fleet Vehicle'}
                  </h3>
                  {trip?.vehicle?.plateNumber && (
                    <p className="text-[10px] sm:text-[11px] font-mono text-neutral-400 truncate">
                      Plate: {trip.vehicle.plateNumber}
                    </p>
                  )}
                </div>
              </div>

              {trip?.vehicle?.capacity && (
                <span className="text-[9px] sm:text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-900 text-neutral-500 font-bold shrink-0">
                  {trip.vehicle.capacity} Seats
                </span>
              )}
            </div>

            <div className="space-y-2 pt-2 border-t border-neutral-100 dark:border-neutral-800 text-xs">
              {trip?.driver?.user && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-neutral-500 font-medium text-[11px] sm:text-xs shrink-0">Driver</span>
                  <div className="flex items-center gap-1.5 font-bold text-neutral-900 dark:text-white min-w-0">
                    <span className="truncate text-[11px] sm:text-xs">{trip.driver.user.firstName} {trip.driver.user.lastName}</span>
                    {trip.driver.phone && (
                      <a
                        href={`tel:${trip.driver.phone}`}
                        className="p-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:text-[#ffac00] shrink-0"
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
                  <span className="text-neutral-500 font-medium text-[11px] sm:text-xs">Scheduled Departure</span>
                  <span className="font-mono font-bold text-neutral-900 dark:text-white text-[11px] sm:text-xs">
                    {formatTime(trip.departureTime)}
                  </span>
                </div>
              )}
              {trip?.reservations && (
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500 font-medium text-[11px] sm:text-xs">Passengers</span>
                  <span className="font-mono font-bold text-[#629b5c] text-[11px] sm:text-xs">
                    {trip.reservations.length} Onboard
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Route Station Stops Timeline */}
          {trip?.route?.stops && trip.route.stops.length > 0 && (
            <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#14161c] border border-neutral-200/80 dark:border-neutral-800 space-y-3 shadow-xs">
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 block">
                STATION STOPS & TIMELINE
              </span>
              <div className="space-y-2.5 text-xs relative pl-1 sm:pl-2">
                <div className="flex items-center gap-2.5">
                  <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-[#629b5c] ring-4 ring-[#629b5c]/20 shrink-0" />
                  <div className="truncate">
                    <p className="font-bold text-neutral-950 dark:text-white truncate text-[11px] sm:text-xs">
                      {trip.route.origin}
                    </p>
                    <span className="text-[9px] sm:text-[10px] text-neutral-400 uppercase tracking-wider font-mono">Origin Departure</span>
                  </div>
                </div>

                {trip.route.stops.map((stop: any, sIdx: number) => (
                  <div key={stop.id || sIdx} className="flex items-center gap-2.5 pl-0.5">
                    <div className="h-2 w-2 rounded-full border-2 border-neutral-400 shrink-0" />
                    <div className="truncate">
                      <p className="text-neutral-700 dark:text-neutral-300 truncate font-medium text-[11px] sm:text-xs">{stop.name}</p>
                      <span className="text-[9px] sm:text-[10px] text-neutral-400 font-mono">Stop #{sIdx + 1}</span>
                    </div>
                  </div>
                ))}

                <div className="flex items-center gap-2.5">
                  <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-rose-500 ring-4 ring-rose-500/20 shrink-0" />
                  <div className="truncate">
                    <p className="font-bold text-neutral-950 dark:text-white truncate text-[11px] sm:text-xs">
                      {trip.route.destination}
                    </p>
                    <span className="text-[9px] sm:text-[10px] text-neutral-400 uppercase tracking-wider font-mono">Event Destination</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Security & Reliability Footer Note */}
          <div className="flex items-center gap-2 px-2 py-1 text-[10px] sm:text-[11px] text-neutral-400 dark:text-neutral-500">
            <ShieldCheck className="h-3.5 w-3.5 text-[#629b5c] shrink-0" />
            <span className="truncate">Encrypted GPS Telemetry • Updates every 2s</span>
          </div>
        </div>
      </div>
    </div>
  );
}
