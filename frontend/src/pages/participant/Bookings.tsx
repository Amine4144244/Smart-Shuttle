import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { eventsApi, reservationsApi, pickupPointsApi } from '@/services/api';
import { formatDate } from '@/lib/utils';
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  Navigation,
  CheckCircle2,
  UserPlus,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Phone,
  FileText,
  Bus,
  ShieldCheck,
  Check,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';

type Step = 'select-event' | 'select-pickup' | 'review-matches' | 'complete';

export default function ParticipantBookings() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>('select-event');
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [selectedPickupPointId, setSelectedPickupPointId] = useState<string | null>(null);
  const [passengerCount, setPassengerCount] = useState(1);
  const [contactPhone, setContactPhone] = useState(user?.phone || '');
  const [pickupLat, setPickupLat] = useState<number | null>(null);
  const [pickupLng, setPickupLng] = useState<number | null>(null);
  const [pickupAddress, setPickupAddress] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [matches, setMatches] = useState<any[]>([]);
  const [showMatches, setShowMatches] = useState(false);
  const [searching, setSearching] = useState('');
  const [notes, setNotes] = useState('');

  const { data: events, isLoading: isEventsLoading } = useQuery({
    queryKey: ['events-list'],
    queryFn: () => eventsApi.getAll({ limit: 50 }).then((r) => r.data),
  });

  const { data: myReservations } = useQuery({
    queryKey: ['my-reservations'],
    queryFn: () => reservationsApi.getMyReservations().then((r) => r.data),
    refetchInterval: 15000,
  });

  const { data: pickupPoints } = useQuery({
    queryKey: ['pickup-points', selectedEvent],
    queryFn: () => pickupPointsApi.getAll({ eventId: selectedEvent! }).then((r) => r.data),
    enabled: !!selectedEvent,
  });

  const bookedEventIds = new Set(
    (Array.isArray(myReservations) ? myReservations : [])
      .filter((r: any) => !['CANCELLED', 'NO_SHOW'].includes(r.status))
      .map((r: any) => r.event?.id)
  );

  const selectedEventObj = events?.data?.find((e: any) => e.id === selectedEvent);

  const bookMutation = useMutation({
    mutationFn: (data: any) => reservationsApi.create(data),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['my-reservations'] });
      queryClient.invalidateQueries({ queryKey: ['participant-stats'] });
      toast.success('Shuttle pass reserved successfully!');
      handleMatching(res.data);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Booking failed'),
  });

  const joinTripMutation = useMutation({
    mutationFn: ({ reservationId, tripId }: { reservationId: string; tripId: string }) =>
      reservationsApi.joinTrip(reservationId, tripId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-reservations'] });
      toast.success('Joined existing shuttle!');
      setShowMatches(false);
      setStep('select-event');
      resetForm();
      navigate('/participant/tickets');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to join trip'),
  });

  const handleMatching = useCallback(
    async (reservation: any) => {
      if (!pickupLat || !pickupLng || !pickupTime) {
        navigate('/participant/tickets');
        return;
      }
      try {
        setSearching('Searching for shared group shuttles near your pickup point...');
        const res = await reservationsApi.findMatches({
          eventId: selectedEvent,
          lat: pickupLat,
          lng: pickupLng,
          pickupTime,
          passengerCount,
          excludeReservationId: reservation?.id,
        });
        if (res.data?.matches?.length > 0) {
          setMatches(res.data.matches);
          setShowMatches(true);
          setSearching('');
          setStep('review-matches');
        } else {
          setSearching('Direct shuttle scheduled! Redirecting to boarding passes...');
          setTimeout(() => {
            setSearching('');
            navigate('/participant/tickets');
          }, 1500);
        }
      } catch {
        setSearching('');
        navigate('/participant/tickets');
      }
    },
    [pickupLat, pickupLng, pickupTime, passengerCount, selectedEvent, navigate]
  );

  const handleBook = async () => {
    if (!selectedEvent) {
      toast.error('Please select an event');
      return;
    }
    if (!pickupLat || !pickupLng) {
      toast.error('Please select an official station or detect your GPS location');
      return;
    }
    if (!pickupTime) {
      toast.error('Please select your preferred pickup time');
      return;
    }

    const pickupDateObj = new Date(pickupTime);
    const dateStr = pickupDateObj.toISOString().split('T')[0];
    const timeStr = pickupDateObj.toTimeString().slice(0, 5);

    bookMutation.mutate({
      eventId: selectedEvent,
      pickupPointId: selectedPickupPointId || undefined,
      pickupLat: Number(pickupLat),
      pickupLng: Number(pickupLng),
      pickupAddress: pickupAddress || 'Custom GPS Pickup Location',
      pickupTime,
      date: dateStr,
      time: timeStr,
      passengerCount: Number(passengerCount),
      contactPhone: contactPhone || undefined,
      notes: notes || undefined,
    });
  };

  const handleJoinTrip = (reservationId: string, tripId: string) => {
    joinTripMutation.mutate({ reservationId, tripId });
  };

  const resetForm = () => {
    setSelectedEvent(null);
    setSelectedPickupPointId(null);
    setPassengerCount(1);
    setContactPhone(user?.phone || '');
    setPickupLat(null);
    setPickupLng(null);
    setPickupAddress('');
    setPickupTime('');
    setNotes('');
    setMatches([]);
    setShowMatches(false);
  };

  const handleSelectEvent = (event: any) => {
    if (bookedEventIds.has(event.id)) {
      toast.error('You already have an active booking for this event');
      return;
    }
    setSelectedEvent(event.id);
    const eventDate = new Date(event.date);
    const timePart = event.startTime || '09:00';
    const combinedStr = `${eventDate.toISOString().split('T')[0]}T${timePart}`;
    setPickupTime(combinedStr);
    setStep('select-pickup');
  };

  const handleSelectPickupPoint = (point: any) => {
    setSelectedPickupPointId(point.id);
    setPickupLat(point.latitude);
    setPickupLng(point.longitude);
    setPickupAddress(point.address || point.name);
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setSelectedPickupPointId(null);
        setPickupLat(pos.coords.latitude);
        setPickupLng(pos.coords.longitude);
        setPickupAddress(`Current GPS (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`);
        toast.success('Current location detected!');
      },
      () => toast.error('Could not retrieve location. Please select an official station below.'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-6 sm:space-y-8 max-w-5xl mx-auto pb-12 font-sans selection:bg-[#ffac00] selection:text-black">
      {/* 1. Header & Stepper */}
      <div className="border-b border-neutral-200/80 dark:border-neutral-800 pb-5 sm:pb-6">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold tracking-widest uppercase bg-[#ffac00]/15 text-neutral-950 dark:text-[#ffac00] border border-[#ffac00]/30 shadow-xs">
            <Sparkles className="h-3 w-3" />
            INSTANT DISPATCH BOOKING
          </span>
        </div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-neutral-950 dark:text-white">
          Book Shuttle Pass
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
          Select your destination event, choose your station, and get instant digital QR credentials.
        </p>

        {/* Responsive Stepper Indicator */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-3 mt-4 sm:mt-6">
          {[
            { id: 'select-event', stepNum: '1', label: 'Select Event', desc: 'Destination' },
            { id: 'select-pickup', stepNum: '2', label: 'Station & Time', desc: 'Pickup Details' },
            { id: 'review-matches', stepNum: '3', label: 'Digital Pass', desc: 'Confirmation' },
          ].map((s) => {
            const isActive = step === s.id;
            const isPassed =
              (s.id === 'select-event' && step !== 'select-event') ||
              (s.id === 'select-pickup' && (step === 'review-matches' || step === 'complete'));

            return (
              <div
                key={s.id}
                className={`p-2.5 sm:p-3 rounded-2xl border transition-all text-left ${
                  isActive
                    ? 'border-[#ffac00] bg-[#ffac00]/10 text-neutral-950 dark:text-white font-bold shadow-xs'
                    : isPassed
                    ? 'border-[#629b5c]/40 bg-[#629b5c]/10 text-neutral-900 dark:text-neutral-200'
                    : 'border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-[#14161c]/50 text-neutral-400'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] sm:text-xs font-black truncate">
                    <span className="sm:hidden">{s.stepNum}. </span>
                    <span className="hidden sm:inline">{s.stepNum}. </span>
                    {s.label}
                  </span>
                  {isPassed && <Check className="h-3.5 w-3.5 text-[#629b5c] shrink-0" />}
                </div>
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400 hidden sm:block mt-0.5 truncate">
                  {s.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Step 1: Select Event */}
      {step === 'select-event' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-black tracking-tight text-neutral-950 dark:text-white">
              Choose an Event
            </h2>
            <span className="text-xs text-neutral-400 font-mono">
              {events?.data?.length || 0} active routes
            </span>
          </div>

          {isEventsLoading ? (
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-32 sm:h-36 rounded-3xl bg-neutral-200/60 dark:bg-neutral-800/60 animate-pulse" />
              ))}
            </div>
          ) : !events?.data || events.data.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-neutral-300 dark:border-neutral-800 p-8 sm:p-12 text-center bg-white dark:bg-[#14161c]">
              <Calendar className="h-10 w-10 text-neutral-400 mx-auto mb-2 opacity-50 text-[#ffac00]" />
              <p className="text-base font-bold text-neutral-800 dark:text-neutral-200">No events currently scheduled</p>
              <p className="text-xs text-neutral-400 mt-1">Check back soon for upcoming shuttle schedules.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
              {events.data
                .filter((e: any) => e.status === 'PUBLISHED' || e.status === 'ONGOING')
                .map((event: any) => {
                  const alreadyBooked = bookedEventIds.has(event.id);
                  const eventDate = new Date(event.date);
                  const month = eventDate.toLocaleString('default', { month: 'short' }).toUpperCase();
                  const day = eventDate.getDate();

                  return (
                    <div
                      key={event.id}
                      onClick={() => handleSelectEvent(event)}
                      className={`relative p-4 sm:p-5 rounded-3xl border transition-all duration-200 bg-white dark:bg-[#14161c] ${
                        alreadyBooked
                          ? 'opacity-60 cursor-not-allowed border-neutral-200 dark:border-neutral-800'
                          : 'cursor-pointer border-neutral-200/80 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 hover:shadow-lg'
                      }`}
                    >
                      <div className="flex items-start gap-3 sm:gap-4">
                        {/* Date Chip */}
                        <div className="flex flex-col items-center justify-center w-12 h-14 sm:w-14 sm:h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-950 dark:text-white shrink-0">
                          <span className="text-[9px] sm:text-[10px] font-extrabold text-[#ffac00]">{month}</span>
                          <span className="text-base sm:text-lg font-black leading-none">{day}</span>
                        </div>

                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="font-extrabold text-sm sm:text-base text-neutral-950 dark:text-white truncate">
                              {event.name}
                            </h3>
                            {alreadyBooked ? (
                              <span className="rounded-full bg-[#629b5c]/20 px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-[#629b5c] shrink-0">
                                Booked
                              </span>
                            ) : (
                              <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-neutral-600 dark:text-neutral-400 shrink-0">
                                {event.capacity} seats
                              </span>
                            )}
                          </div>

                          <div className="space-y-1 text-xs text-neutral-500 dark:text-neutral-400">
                            {event.address && (
                              <div className="flex items-center gap-1.5 truncate">
                                <MapPin className="h-3.5 w-3.5 text-[#ffac00] shrink-0" />
                                <span className="truncate text-[11px] sm:text-xs">{event.address}</span>
                              </div>
                            )}
                            {event.startTime && (
                              <div className="flex items-center gap-1.5 font-mono text-[10px] sm:text-[11px]">
                                <Clock className="h-3.5 w-3.5 text-[#629b5c] shrink-0" />
                                <span>{event.startTime} {event.endTime ? `— ${event.endTime}` : ''}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {!alreadyBooked && (
                        <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-300 font-bold">
                          <span className="text-[11px] sm:text-xs">Select Station & Pickup</span>
                          <ChevronRight className="h-4 w-4 text-[#ffac00]" />
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* 3. Step 2: Station & Pickup Preferences */}
      {step === 'select-pickup' && selectedEventObj && (
        <div className="space-y-5 sm:space-y-6 animate-in fade-in duration-200">
          {/* Selected Event Context Bar */}
          <div className="p-3.5 sm:p-5 rounded-3xl bg-neutral-950 text-white border border-neutral-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-[#ffac00] text-neutral-950 flex items-center justify-center font-extrabold shrink-0">
                <Bus className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-widest text-[#ffac00] block truncate">
                  Selected Event
                </span>
                <h3 className="font-extrabold text-sm sm:text-base text-white truncate">
                  {selectedEventObj.name}
                </h3>
              </div>
            </div>
            <button
              onClick={() => setStep('select-event')}
              className="text-xs font-bold text-neutral-400 hover:text-white underline underline-offset-4 shrink-0"
            >
              Change
            </button>
          </div>

          <div className="grid gap-5 sm:gap-6 grid-cols-1 md:grid-cols-2">
            {/* Pickup Location Card */}
            <div className="p-4 sm:p-6 rounded-3xl bg-white dark:bg-[#14161c] border border-neutral-200/80 dark:border-neutral-800 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-[#ffac00]/15 text-[#ffac00] flex items-center justify-center font-bold shrink-0">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-sm text-neutral-950 dark:text-white truncate">
                      Pickup Station
                    </h3>
                    <p className="text-[10px] sm:text-[11px] text-neutral-400 truncate">Choose station or GPS</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDetectLocation}
                  className="rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 transition-all shrink-0"
                >
                  <Navigation className="h-3.5 w-3.5 text-[#629b5c]" />
                  Use GPS
                </button>
              </div>

              {/* Official Pickup Points List */}
              <div className="space-y-2">
                <label className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 block">
                  Designated Stations
                </label>
                {pickupPoints?.data && pickupPoints.data.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {pickupPoints.data.map((p: any) => {
                      const isSelected = selectedPickupPointId === p.id;
                      return (
                        <div
                          key={p.id}
                          onClick={() => handleSelectPickupPoint(p)}
                          className={`p-2.5 sm:p-3 rounded-2xl border cursor-pointer transition-all ${
                            isSelected
                              ? 'border-[#ffac00] bg-[#ffac00]/10 text-neutral-950 dark:text-white font-bold'
                              : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-900/40 text-neutral-700 dark:text-neutral-300'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-semibold truncate">{p.name}</span>
                            {isSelected && <Check className="h-3.5 w-3.5 text-[#ffac00] shrink-0" />}
                          </div>
                          {p.address && (
                            <p className="text-[10px] text-neutral-400 truncate mt-0.5">
                              {p.address}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-400 italic">No pre-assigned stations. Please use GPS or enter address below.</p>
                )}
              </div>

              {/* Custom Coordinates/Address */}
              <div className="space-y-3 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] sm:text-[10px] font-bold uppercase text-neutral-500">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="33.5731"
                      value={pickupLat ?? ''}
                      onChange={(e) => setPickupLat(e.target.value ? parseFloat(e.target.value) : null)}
                      className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 px-2.5 sm:px-3 py-2 text-xs font-mono text-neutral-900 dark:text-white focus:border-[#ffac00] focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] sm:text-[10px] font-bold uppercase text-neutral-500">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="-7.5898"
                      value={pickupLng ?? ''}
                      onChange={(e) => setPickupLng(e.target.value ? parseFloat(e.target.value) : null)}
                      className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 px-2.5 sm:px-3 py-2 text-xs font-mono text-neutral-900 dark:text-white focus:border-[#ffac00] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] sm:text-[10px] font-bold uppercase text-neutral-500">Station Name / Address</label>
                  <input
                    type="text"
                    placeholder="e.g. Casa Port Station Gate 2"
                    value={pickupAddress}
                    onChange={(e) => setPickupAddress(e.target.value)}
                    className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 px-3 py-2 text-xs text-neutral-900 dark:text-white focus:border-[#ffac00] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Trip Preferences Card */}
            <div className="p-4 sm:p-6 rounded-3xl bg-white dark:bg-[#14161c] border border-neutral-200/80 dark:border-neutral-800 space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-neutral-950 dark:text-white">
                      Time & Passengers
                    </h3>
                    <p className="text-[10px] sm:text-[11px] text-neutral-400">Set schedule and group size</p>
                  </div>
                </div>

                {/* Passenger Stepper */}
                <div className="space-y-1.5">
                  <label className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 block">
                    Number of Seats
                  </label>
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <button
                      type="button"
                      onClick={() => setPassengerCount(Math.max(1, passengerCount - 1))}
                      disabled={passengerCount <= 1}
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800 font-bold text-sm hover:bg-neutral-200 disabled:opacity-40"
                    >
                      -
                    </button>
                    <span className="w-8 sm:w-10 text-center text-base sm:text-lg font-black font-mono text-neutral-950 dark:text-white">
                      {passengerCount}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPassengerCount(Math.min(20, passengerCount + 1))}
                      disabled={passengerCount >= 20}
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800 font-bold text-sm hover:bg-neutral-200 disabled:opacity-40"
                    >
                      +
                    </button>
                    <span className="text-xs text-neutral-400 ml-1 truncate">
                      {passengerCount > 1 ? 'Group reservation' : 'Single passenger'}
                    </span>
                  </div>
                </div>

                {/* Pickup DateTime */}
                <div className="space-y-1.5">
                  <label className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 block">
                    Pickup Schedule
                  </label>
                  <input
                    type="datetime-local"
                    value={pickupTime}
                    onChange={(e) => setPickupTime(e.target.value)}
                    className="w-full rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 px-3 py-2.5 text-xs font-mono text-neutral-900 dark:text-white focus:border-[#ffac00] focus:outline-none"
                  />
                </div>

                {/* Contact Phone */}
                <div className="space-y-1.5">
                  <label className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 block">
                    Contact Phone (Driver SMS updates)
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
                      <Phone className="h-3.5 w-3.5" />
                    </div>
                    <input
                      type="tel"
                      placeholder="+212 600-000000"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      className="w-full rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 pl-9 pr-3 py-2.5 text-xs text-neutral-900 dark:text-white focus:border-[#ffac00] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Special Notes */}
                <div className="space-y-1.5">
                  <label className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 block">
                    Special Notes (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Luggage, wheelchair, or group notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 px-3 py-2.5 text-xs text-neutral-900 dark:text-white focus:border-[#ffac00] focus:outline-none"
                  />
                </div>
              </div>

              {/* Action Buttons (Stacked on mobile) */}
              <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setStep('select-event')}
                  className="rounded-full border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white font-bold py-2.5 sm:py-3 px-5 text-xs transition-all flex items-center justify-center gap-1.5 order-2 sm:order-1"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Previous
                </button>

                <button
                  type="button"
                  onClick={handleBook}
                  disabled={bookMutation.isPending}
                  className="flex-1 rounded-full bg-neutral-950 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200 font-extrabold py-3 px-5 text-xs shadow-lg transition-all flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-60 order-1 sm:order-2"
                >
                  {bookMutation.isPending ? (
                    <span>Scheduling Shuttle...</span>
                  ) : (
                    <>
                      <span>Confirm & Issue QR Pass</span>
                      <ArrowRight className="h-4 w-4 text-[#ffac00]" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Step 3: Shared Shuttle Matches Found (Match Overlay) */}
      {showMatches && matches.length > 0 && (
        <div className="p-4 sm:p-6 rounded-3xl bg-white dark:bg-[#14161c] border-2 border-[#ffac00] shadow-2xl space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3 sm:pb-4">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-[#ffac00] text-neutral-950 flex items-center justify-center font-extrabold shrink-0">
                <UserPlus className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-neutral-950 dark:text-white">
                  Shared Shuttles Nearby!
                </h3>
                <p className="text-[11px] sm:text-xs text-neutral-400">
                  We found existing event shuttles near your pickup station. Join one for fast boarding!
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
            {matches.map((match: any, idx: number) => (
              <div
                key={match.matchId}
                className="p-3.5 sm:p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-[#ffac00]/20 px-2.5 py-0.5 text-[10px] font-bold text-[#ffac00]">
                    Match #{idx + 1}
                  </span>
                  <span className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                    {match.existingParticipant?.firstName}'s Shuttle
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                  <div className="flex items-center gap-1">
                    <Navigation className="h-3 w-3 text-[#629b5c]" />
                    <span>{(match.distance * 1000).toFixed(0)}m away</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3 text-blue-500" />
                    <span>{match.occupiedSeats}/{match.totalCapacity} filled</span>
                  </div>
                  <div className="flex items-center gap-1 col-span-2 font-mono">
                    <Clock className="h-3 w-3 text-[#ffac00]" />
                    <span>Departs: {new Date(match.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleJoinTrip(match.existingReservationId, match.tripId)}
                  disabled={joinTripMutation.isPending}
                  className="w-full rounded-full bg-neutral-950 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-950 font-bold py-2 text-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#629b5c]" /> Join This Shuttle
                </button>
              </div>
            ))}
          </div>

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => navigate('/participant/tickets')}
              className="text-xs text-neutral-400 hover:text-neutral-900 dark:hover:text-white font-bold underline underline-offset-4"
            >
              Skip — Keep My Dedicated Pass
            </button>
          </div>
        </div>
      )}

      {/* Searching Banner */}
      {searching && (
        <div className="p-4 sm:p-6 rounded-3xl bg-neutral-950 text-white border border-neutral-800 flex items-center justify-center gap-3">
          <div className="w-5 h-5 rounded-full border-2 border-[#ffac00] border-t-transparent animate-spin shrink-0" />
          <span className="text-xs sm:text-sm font-bold text-neutral-200 text-center">{searching}</span>
        </div>
      )}
    </div>
  );
}