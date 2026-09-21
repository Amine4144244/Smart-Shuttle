import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  eventsApi,
  pickupPointsApi,
  routesApi,
  vehiclesApi,
  driversApi,
  tripsApi,
  reservationsApi,
} from '@/services/api';
import {
  Calendar,
  MapPin,
  Route as RouteIcon,
  Truck,
  UserCircle,
  Bus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Plus,
  ArrowRight,
  ArrowLeft,
  Share2,
  ExternalLink,
  QrCode,
  Radio,
  Gauge,
  Layers,
  Check,
  ChevronRight,
  RefreshCw,
  Edit2,
  Trash2,
  Copy,
  Sliders,
  Send,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import AddressSearch from '@/components/shared/AddressSearch';
import LocationPicker from '@/components/shared/LocationPicker';
import SafeQRCode from '@/components/shared/SafeQRCode';
import { formatDate, formatTime, getStatusColor } from '@/lib/utils';
import { reverseGeocode, getRoute } from '@/services/googleMaps';
import toast from 'react-hot-toast';

type PhaseTab = 'event' | 'pickups' | 'routes' | 'fleet' | 'trips' | 'launchpad';

export default function AdminFullPhaseConfig() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<PhaseTab>('event');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(searchParams.get('eventId') || null);

  // Phase 1: Event Form State
  const [eventName, setEventName] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventStartTime, setEventStartTime] = useState('08:00');
  const [eventEndTime, setEventEndTime] = useState('18:00');
  const [eventAddress, setEventAddress] = useState('');
  const [eventLat, setEventLat] = useState<number>(33.5731);
  const [eventLng, setEventLng] = useState<number>(-7.5898);
  const [eventCapacity, setEventCapacity] = useState<number>(500);
  const [eventStatus, setEventStatus] = useState<string>('PUBLISHED');

  // Phase 2: Pickup Form State
  const [pickupName, setPickupName] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [pickupLat, setPickupLat] = useState<number>(33.5892);
  const [pickupLng, setPickupLng] = useState<number>(-7.6187);
  const [pickupCapacity, setPickupCapacity] = useState<number>(50);

  // Phase 3: Route Form State
  const [routeName, setRouteName] = useState('');
  const [routeOrigin, setRouteOrigin] = useState('');
  const [routeOriginLat, setRouteOriginLat] = useState<number>(33.5892);
  const [routeOriginLng, setRouteOriginLng] = useState<number>(-7.6187);
  const [routeDest, setRouteDest] = useState('');
  const [routeDestLat, setRouteDestLat] = useState<number>(33.5731);
  const [routeDestLng, setRouteDestLng] = useState<number>(-7.5898);
  const [routeDistance, setRouteDistance] = useState<number>(12.5);
  const [routeDuration, setRouteDuration] = useState<number>(25);

  // Phase 4: Fleet & Driver Pairing State
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [newBusNumber, setNewBusNumber] = useState('');
  const [newPlateNumber, setNewPlateNumber] = useState('');
  const [newBusCapacity, setNewBusCapacity] = useState(40);

  // Phase 5: Trip Form State
  const [tripCreationMode, setTripCreationMode] = useState<'SINGLE' | 'BATCH'>('SINGLE');
  const [tripRouteId, setTripRouteId] = useState<string>('');
  const [tripVehicleId, setTripVehicleId] = useState<string>('');
  const [tripDriverId, setTripDriverId] = useState<string>('');
  const [tripDepartureTime, setTripDepartureTime] = useState('08:30');
  const [batchIntervalMinutes, setBatchIntervalMinutes] = useState(30);
  const [batchCount, setBatchCount] = useState(3);
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);

  // 1. Fetch All Events
  const { data: eventsData, isLoading: isEventsLoading } = useQuery({
    queryKey: ['admin-events-list'],
    queryFn: () => eventsApi.getAll({ limit: 100 }).then((r) => r.data),
  });
  const events = eventsData?.data || [];

  // Selected Event Object
  const selectedEvent = events.find((e: any) => e.id === selectedEventId) || null;

  // 2. Fetch Event-Specific Data
  const { data: pickupPointsData } = useQuery({
    queryKey: ['pickup-points-event', selectedEventId],
    queryFn: () => pickupPointsApi.getAll({ eventId: selectedEventId!, limit: 100 }).then((r) => r.data),
    enabled: !!selectedEventId,
  });
  const eventPickupPoints = pickupPointsData?.data || [];

  const { data: routesData } = useQuery({
    queryKey: ['routes-event', selectedEventId],
    queryFn: () => routesApi.getAll({ limit: 100 }).then((r) => r.data),
  });
  const allRoutes = routesData?.data || [];
  const eventRoutes = allRoutes.filter((r: any) => r.eventId === selectedEventId);

  // 3. Fetch Fleet & Drivers
  const { data: vehiclesData } = useQuery({
    queryKey: ['vehicles-list'],
    queryFn: () => vehiclesApi.getAll({ limit: 100 }).then((r) => r.data),
  });
  const allVehicles = vehiclesData?.data || [];

  const { data: driversData } = useQuery({
    queryKey: ['drivers-list'],
    queryFn: () => driversApi.getAll({ limit: 100 }).then((r) => r.data),
  });
  const allDrivers = driversData?.data || [];

  // 4. Fetch Trips
  const { data: tripsData } = useQuery({
    queryKey: ['trips-list'],
    queryFn: () => tripsApi.getAll({ limit: 100 }).then((r) => r.data),
  });
  const allTrips = tripsData?.data || [];
  const eventTrips = allTrips.filter((t: any) => t.route?.eventId === selectedEventId);

  // Populate form when selectedEvent changes
  useEffect(() => {
    if (selectedEvent) {
      setEventName(selectedEvent.name || '');
      setEventDesc(selectedEvent.description || '');
      setEventDate(selectedEvent.date ? selectedEvent.date.split('T')[0] : '');
      setEventStartTime(selectedEvent.startTime ? selectedEvent.startTime.slice(0, 5) : '08:00');
      setEventEndTime(selectedEvent.endTime ? selectedEvent.endTime.slice(0, 5) : '18:00');
      setEventAddress(selectedEvent.address || '');
      setEventLat(selectedEvent.latitude || 33.5731);
      setEventLng(selectedEvent.longitude || -7.5898);
      setEventCapacity(selectedEvent.capacity || 500);
      setEventStatus(selectedEvent.status || 'PUBLISHED');

      // Sync destination defaults for routes
      setRouteDest(selectedEvent.address || '');
      setRouteDestLat(selectedEvent.latitude || 33.5731);
      setRouteDestLng(selectedEvent.longitude || -7.5898);
    }
  }, [selectedEvent]);

  // Mutations
  const createEventMutation = useMutation({
    mutationFn: (d: any) => eventsApi.create(d),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['admin-events-list'] });
      toast.success('Événement créé avec succès !');
      setSelectedEventId(res.data.id);
      setSearchParams({ eventId: res.data.id });
      setActiveTab('pickups');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Erreur création événement'),
  });

  const updateEventMutation = useMutation({
    mutationFn: (d: any) => eventsApi.update(selectedEventId!, d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-events-list'] });
      toast.success('Paramètres événement mis à jour');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Erreur mise à jour'),
  });

  const createPickupMutation = useMutation({
    mutationFn: (d: any) => pickupPointsApi.create(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pickup-points-event'] });
      toast.success('Point de ramassage ajouté');
      setPickupName('');
      setPickupAddress('');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Erreur point de ramassage'),
  });

  const deletePickupMutation = useMutation({
    mutationFn: (id: string) => pickupPointsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pickup-points-event'] });
      toast.success('Point de ramassage supprimé');
    },
  });

  const createRouteMutation = useMutation({
    mutationFn: (d: any) => routesApi.create(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes-event'] });
      toast.success('Itinéraire créé avec succès');
      setRouteName('');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Erreur création itinéraire'),
  });

  const createVehicleMutation = useMutation({
    mutationFn: (d: any) => vehiclesApi.create(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles-list'] });
      toast.success('Véhicule navette ajouté');
      setNewBusNumber('');
      setNewPlateNumber('');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Erreur ajout véhicule'),
  });

  const createTripMutation = useMutation({
    mutationFn: (d: any) => tripsApi.create(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips-list'] });
      toast.success('Navette programmée avec succès');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Erreur programmation navette'),
  });

  const deleteTripMutation = useMutation({
    mutationFn: (id: string) => tripsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips-list'] });
      toast.success('Navette supprimée');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Erreur suppression navette'),
  });

  // Calculate Readiness Score
  const hasEvent = !!selectedEventId;
  const hasPickups = eventPickupPoints.length > 0;
  const hasRoutes = eventRoutes.length > 0;
  const hasFleet = allVehicles.length > 0 && allDrivers.length > 0;
  const hasTrips = eventTrips.length > 0;

  const scorePillars = [hasEvent, hasPickups, hasRoutes, hasFleet, hasTrips];
  const readinessPercent = Math.round((scorePillars.filter(Boolean).length / scorePillars.length) * 100);

  // Quick Action Handlers
  const handleSaveEvent = () => {
    if (!eventName || !eventAddress || !eventDate) {
      toast.error('Veuillez remplir le nom, la date et le lieu');
      return;
    }
    const payload = {
      name: eventName,
      description: eventDesc,
      date: eventDate,
      startTime: eventStartTime,
      endTime: eventEndTime,
      address: eventAddress,
      latitude: Number(eventLat),
      longitude: Number(eventLng),
      capacity: Number(eventCapacity),
      status: eventStatus,
    };

    if (selectedEventId) {
      updateEventMutation.mutate(payload);
    } else {
      createEventMutation.mutate(payload);
    }
  };

  const handleAddPickup = () => {
    if (!selectedEventId) {
      toast.error("Veuillez d'abord créer ou sélectionner un événement");
      return;
    }
    if (!pickupName) {
      toast.error('Veuillez spécifier le nom du point de ramassage');
      return;
    }
    createPickupMutation.mutate({
      name: pickupName,
      address: pickupAddress || pickupName,
      latitude: Number(pickupLat),
      longitude: Number(pickupLng),
      maxCapacity: Number(pickupCapacity),
      eventId: selectedEventId,
    });
  };

  const handleCreateRoute = () => {
    if (!selectedEventId) {
      toast.error("Veuillez d'abord sélectionner un événement");
      return;
    }
    if (!routeName || !routeOrigin || !routeDest) {
      toast.error("Veuillez remplir le nom, l'origine et la destination de l'itinéraire");
      return;
    }
    createRouteMutation.mutate({
      name: routeName,
      origin: routeOrigin,
      originLat: Number(routeOriginLat),
      originLng: Number(routeOriginLng),
      destination: routeDest,
      destinationLat: Number(routeDestLat),
      destinationLng: Number(routeDestLng),
      distance: Number(routeDistance),
      estimatedDuration: Number(routeDuration),
      isActive: true,
      eventId: selectedEventId,
      stops: eventPickupPoints.map((p: any, idx: number) => ({
        name: p.name,
        latitude: p.latitude,
        longitude: p.longitude,
        order: idx + 1,
      })),
    });
  };

  const handleCreateTrip = () => {
    if (!tripRouteId || !tripVehicleId || !tripDriverId || !eventDate) {
      toast.error('Veuillez sélectionner un itinéraire, un véhicule, un chauffeur et une heure');
      return;
    }

    // Duplicate check
    const existingDuplicate = eventTrips.find(
      (t: any) =>
        t.routeId === tripRouteId &&
        t.vehicleId === tripVehicleId &&
        t.departureTime?.slice(0, 5) === tripDepartureTime?.slice(0, 5)
    );
    if (existingDuplicate) {
      if (!window.confirm(`Une navette existe déjà pour cet itinéraire à ${tripDepartureTime}. Voulez-vous vraiment programmer un doublon ?`)) {
        return;
      }
    }

    createTripMutation.mutate({
      routeId: tripRouteId,
      vehicleId: tripVehicleId,
      driverId: tripDriverId,
      date: eventDate,
      departureTime: tripDepartureTime,
    });
  };

  const handleBatchGenerateTrips = async () => {
    if (!tripRouteId || !tripVehicleId || !tripDriverId || !eventDate) {
      toast.error('Veuillez configurer un itinéraire, un véhicule et un chauffeur pour le générateur');
      return;
    }

    const [hours, minutes] = tripDepartureTime.split(':').map(Number);
    const timesToCreate: string[] = [];
    for (let i = 0; i < batchCount; i++) {
      const totalMin = hours * 60 + minutes + i * batchIntervalMinutes;
      const h = String(Math.floor(totalMin / 60) % 24).padStart(2, '0');
      const m = String(totalMin % 60).padStart(2, '0');
      timesToCreate.push(`${h}:${m}`);
    }

    if (!window.confirm(`Confirmer la création en série de ${timesToCreate.length} départs (${timesToCreate.join(', ')}) ?`)) {
      return;
    }

    setIsGeneratingBatch(true);
    let createdCount = 0;
    try {
      for (const timeStr of timesToCreate) {
        await tripsApi.create({
          routeId: tripRouteId,
          vehicleId: tripVehicleId,
          driverId: tripDriverId,
          date: eventDate,
          departureTime: timeStr,
        });
        createdCount++;
      }
      queryClient.invalidateQueries({ queryKey: ['trips-list'] });
      toast.success(`${createdCount} navettes programmées en série avec succès`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur lors de la génération en série');
    } finally {
      setIsGeneratingBatch(false);
    }
  };

  const handleDeleteAllTrips = async () => {
    if (eventTrips.length === 0) return;
    if (!window.confirm(`Voulez-vous vraiment supprimer toutes les ${eventTrips.length} navettes de cet événement ?`)) {
      return;
    }
    try {
      for (const t of eventTrips) {
        await tripsApi.delete(t.id);
      }
      queryClient.invalidateQueries({ queryKey: ['trips-list'] });
      toast.success('Toutes les navettes de cet événement ont été supprimées');
    } catch {
      toast.error('Erreur lors de la suppression des navettes');
    }
  };

  const passengerBookingUrl = `${window.location.origin}/participant/bookings`;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-sans">
      {/* 1. Master Header & Event Selector */}
      <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                <Sparkles className="h-3.5 w-3.5" />
                CONFIGURATION ORGANISATEUR • PHASE COMPLÈTE
              </span>
              {selectedEvent && (
                <Badge variant={selectedEvent.status === 'PUBLISHED' ? 'success' : 'secondary'}>
                  {selectedEvent.status}
                </Badge>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              {selectedEvent ? selectedEvent.name : 'Orchestration & Déploiement Événement'}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
              Console maîtresse de bout en bout : configurez le lieu, le réseau de ramassage, les itinéraires OSRM, la flotte de navettes et lancez la billetterie en temps réel.
            </p>
          </div>

          {/* Quick Event Switcher */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex flex-col">
              <label className="text-[10px] font-bold uppercase text-muted-foreground mb-1">
                Événement en cours :
              </label>
              <select
                value={selectedEventId || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'NEW') {
                    setSelectedEventId(null);
                    setSearchParams({});
                    setEventName('');
                    setEventAddress('');
                    setEventDesc('');
                  } else {
                    setSelectedEventId(val);
                    setSearchParams({ eventId: val });
                  }
                }}
                className="h-10 rounded-xl border border-input bg-background px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
              >
                <option value="NEW">✨ + Créer un nouvel événement...</option>
                {events.map((e: any) => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({formatDate(e.date)})
                  </option>
                ))}
              </select>
            </div>

            <Button
              onClick={() => {
                setSelectedEventId(null);
                setSearchParams({});
                setEventName('');
                setEventAddress('');
                setEventDesc('');
                setActiveTab('event');
              }}
              variant="outline"
              size="sm"
              className="mt-4 rounded-xl font-bold h-10"
            >
              <Plus className="h-4 w-4 mr-1.5 text-primary" /> Nouveau
            </Button>
          </div>
        </div>

        {/* Readiness Checklist Ribbon */}
        <div className="pt-3 border-t border-border/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                État de Préparation :
              </span>
              <span className={`text-sm font-black font-mono ${readinessPercent === 100 ? 'text-emerald-600' : 'text-primary'}`}>
                {readinessPercent}% Prêt
              </span>
            </div>
            <div className="w-32 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${readinessPercent === 100 ? 'bg-emerald-500' : 'bg-primary'}`}
                style={{ width: `${readinessPercent}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-[11px] font-bold">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border ${hasEvent ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-muted text-muted-foreground border-border'}`}>
              {hasEvent ? <Check className="h-3 w-3" /> : '1'} Événement
            </span>
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border ${hasPickups ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-muted text-muted-foreground border-border'}`}>
              {hasPickups ? <Check className="h-3 w-3" /> : '2'} Ramassage ({eventPickupPoints.length})
            </span>
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border ${hasRoutes ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-muted text-muted-foreground border-border'}`}>
              {hasRoutes ? <Check className="h-3 w-3" /> : '3'} Itinéraires ({eventRoutes.length})
            </span>
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border ${hasFleet ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-muted text-muted-foreground border-border'}`}>
              {hasFleet ? <Check className="h-3 w-3" /> : '4'} Flotte ({allVehicles.length} bus)
            </span>
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border ${hasTrips ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-muted text-muted-foreground border-border'}`}>
              {hasTrips ? <Check className="h-3 w-3" /> : '5'} Navettes ({eventTrips.length})
            </span>
          </div>
        </div>
      </div>

      {/* 2. Phase Navigation Tabs */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 no-scrollbar border-b border-border/80">
        {[
          { id: 'event', label: '1. Événement & Lieu', icon: Calendar, ready: hasEvent },
          { id: 'pickups', label: '2. Points de Ramassage', icon: MapPin, ready: hasPickups },
          { id: 'routes', label: '3. Itinéraires OSRM', icon: RouteIcon, ready: hasRoutes },
          { id: 'fleet', label: '4. Flotte & Chauffeurs', icon: Truck, ready: hasFleet },
          { id: 'trips', label: '5. Programmation Navettes', icon: Bus, ready: hasTrips },
          { id: 'launchpad', label: '6. Audit & Lancement', icon: RocketIcon, ready: readinessPercent === 100 },
        ].map((tab) => {
          const TabIcon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as PhaseTab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <TabIcon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
              {tab.ready && <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-white' : 'bg-emerald-500'}`} />}
            </button>
          );
        })}
      </div>

      {/* 3. Workspaces by Phase */}

      {/* PHASE 1: EVENT DETAILS */}
      {activeTab === 'event' && (
        <div className="grid gap-6 lg:grid-cols-12 animate-in fade-in duration-200">
          <div className="lg:col-span-7 space-y-4">
            <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-sm space-y-4">
              <h2 className="text-base font-black tracking-tight text-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Spécifications de l'Événement
              </h2>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Nom de l'événement</Label>
                  <Input
                    placeholder="ex: GITEX Africa 2026 - Navettes Officielles"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    className="font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Description</Label>
                  <Textarea
                    placeholder="Description du service de transport, consignes et accès..."
                    value={eventDesc}
                    onChange={(e) => setEventDesc(e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Date</Label>
                    <Input
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Début</Label>
                    <Input
                      type="time"
                      value={eventStartTime}
                      onChange={(e) => setEventStartTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Fin</Label>
                    <Input
                      type="time"
                      value={eventEndTime}
                      onChange={(e) => setEventEndTime(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Capacité Totale Salle</Label>
                    <Input
                      type="number"
                      value={eventCapacity}
                      onChange={(e) => setEventCapacity(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Statut</Label>
                    <select
                      value={eventStatus}
                      onChange={(e) => setEventStatus(e.target.value)}
                      className="w-full h-10 rounded-xl border border-input bg-background px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="DRAFT">Brouillon (DRAFT)</option>
                      <option value="PUBLISHED">Publié (PUBLISHED)</option>
                      <option value="ONGOING">En cours (ONGOING)</option>
                      <option value="COMPLETED">Terminé (COMPLETED)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1 pt-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Adresse du Lieu de Destination</Label>
                  <AddressSearch
                    value={eventAddress}
                    onChange={(val) => setEventAddress(val)}
                    onSelect={(addr, lat, lng) => {
                      setEventAddress(addr);
                      setEventLat(lat);
                      setEventLng(lng);
                    }}
                    placeholder="Rechercher l'adresse du site ou lieu d'accueil..."
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border/80">
                <span className="text-xs text-muted-foreground font-medium">
                  {selectedEventId ? 'Modifiez et enregistrez' : 'Créez pour débloquer les phases suivantes'}
                </span>
                <Button
                  onClick={handleSaveEvent}
                  disabled={createEventMutation.isPending || updateEventMutation.isPending}
                  className="font-bold"
                >
                  {selectedEventId ? 'Mettre à Jour' : 'Créer & Continuer'} <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-sm space-y-3">
              <Label className="text-xs font-bold uppercase text-muted-foreground block">
                Position GPS du Lieu (Destination)
              </Label>
              <LocationPicker
                lat={eventLat}
                lng={eventLng}
                onMove={(lat, lng) => {
                  setEventLat(lat);
                  setEventLng(lng);
                  reverseGeocode(lat, lng).then((addr) => { if (addr) setEventAddress(addr); });
                }}
                height="320px"
              />
              <div className="flex items-center justify-between text-xs font-mono text-muted-foreground pt-1">
                <span>Lat: {eventLat.toFixed(5)}</span>
                <span>Lng: {eventLng.toFixed(5)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PHASE 2: PICKUP STATIONS */}
      {activeTab === 'pickups' && (
        <div className="grid gap-6 lg:grid-cols-12 animate-in fade-in duration-200">
          <div className="lg:col-span-5 space-y-4">
            <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-sm space-y-4">
              <h2 className="text-base font-black tracking-tight text-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4 text-emerald-600" />
                Ajouter une Station de Ramassage
              </h2>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Nom du Point</Label>
                  <Input
                    placeholder="ex: Gare Casa-Port Porte 1"
                    value={pickupName}
                    onChange={(e) => setPickupName(e.target.value)}
                    className="font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Adresse / Repère</Label>
                  <AddressSearch
                    value={pickupAddress}
                    onChange={(val) => setPickupAddress(val)}
                    onSelect={(addr, lat, lng) => {
                      setPickupAddress(addr);
                      setPickupLat(lat);
                      setPickupLng(lng);
                      if (!pickupName) setPickupName(addr.split(',')[0]);
                    }}
                    placeholder="Recherche adresse de ramassage..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Capacité Max</Label>
                    <Input
                      type="number"
                      value={pickupCapacity}
                      onChange={(e) => setPickupCapacity(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Événement Lié</Label>
                    <Input value={selectedEvent?.name || 'Aucun'} disabled className="bg-muted text-xs truncate" />
                  </div>
                </div>

                {/* Templates Rapides */}
                <div className="space-y-1 pt-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground block">
                    Modèles Rapides Maroc :
                  </Label>
                  <div className="flex gap-1.5 flex-wrap">
                    {[
                      { name: 'Gare Casa-Port', lat: 33.5992, lng: -7.6125 },
                      { name: 'Technopark Casablanca', lat: 33.5505, lng: -7.6152 },
                      { name: 'Aéroport Med V Terminal 1', lat: 33.3675, lng: -7.5899 },
                      { name: 'Gare Marrakech Guéliz', lat: 31.6348, lng: -8.0177 },
                    ].map((tpl) => (
                      <button
                        key={tpl.name}
                        type="button"
                        onClick={() => {
                          setPickupName(tpl.name);
                          setPickupAddress(tpl.name);
                          setPickupLat(tpl.lat);
                          setPickupLng(tpl.lng);
                        }}
                        className="px-2.5 py-1 rounded-xl bg-muted text-[10px] font-bold hover:bg-primary/20 hover:text-primary transition-all"
                      >
                        + {tpl.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <Button
                onClick={handleAddPickup}
                disabled={createPickupMutation.isPending || !selectedEventId}
                className="w-full font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Plus className="h-4 w-4 mr-1.5" /> Enregistrer le Point de Ramassage
              </Button>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-border/80">
              <LocationPicker
                lat={pickupLat}
                lng={pickupLng}
                onMove={(lat, lng) => {
                  setPickupLat(lat);
                  setPickupLng(lng);
                  reverseGeocode(lat, lng).then((addr) => {
                    if (addr) setPickupAddress(addr);
                  });
                }}
                height="220px"
              />
            </div>
          </div>

          <div className="lg:col-span-7 space-y-4">
            <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-base text-foreground">
                    Stations Config комиees ({eventPickupPoints.length})
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Points d'embarquement associés à cet événement
                  </p>
                </div>
                <Button
                  onClick={() => setActiveTab('routes')}
                  variant="outline"
                  size="sm"
                  className="font-bold text-xs"
                >
                  Continuer vers Itinéraires <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>

              {eventPickupPoints.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-border bg-muted/30 space-y-2">
                  <MapPin className="h-8 w-8 mx-auto text-muted-foreground/50" />
                  <p className="text-xs font-bold text-foreground">Aucun point de ramassage configuré</p>
                  <p className="text-[11px] text-muted-foreground">
                    Utilisez le formulaire ci-contre pour ajouter les arrêts de navette.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                  {eventPickupPoints.map((p: any, idx: number) => (
                    <div
                      key={p.id}
                      className="p-4 rounded-2xl border border-border bg-background flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0">
                          #{idx + 1}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-foreground truncate">{p.name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{p.address}</p>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            Capacité: {p.maxCapacity} passagers
                          </span>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deletePickupMutation.mutate(p.id)}
                        className="text-destructive hover:bg-destructive/10 shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PHASE 3: ROUTES & OSRM ENGINE */}
      {activeTab === 'routes' && (
        <div className="grid gap-6 lg:grid-cols-12 animate-in fade-in duration-200">
          <div className="lg:col-span-5 space-y-4">
            <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-sm space-y-4">
              <h2 className="text-base font-black tracking-tight text-foreground flex items-center gap-2">
                <RouteIcon className="h-4 w-4 text-primary" />
                Définir un Itinéraire Navette
              </h2>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Nom de la Ligne</Label>
                  <Input
                    placeholder="ex: Ligne Express Casa-Port ➔ Event Center"
                    value={routeName}
                    onChange={(e) => setRouteName(e.target.value)}
                    className="font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Point de Départ (Origine)</Label>
                  <AddressSearch
                    value={routeOrigin}
                    onChange={(val) => setRouteOrigin(val)}
                    onSelect={(addr, lat, lng) => {
                      setRouteOrigin(addr);
                      setRouteOriginLat(lat);
                      setRouteOriginLng(lng);
                    }}
                    placeholder="Adresse de départ..."
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Destination (Site Événement)</Label>
                  <Input value={routeDest || selectedEvent?.address || ''} disabled className="bg-muted text-xs truncate" />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Distance (km)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={routeDistance}
                      onChange={(e) => setRouteDistance(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Durée Estimée (min)</Label>
                    <Input
                      type="number"
                      value={routeDuration}
                      onChange={(e) => setRouteDuration(Number(e.target.value))}
                    />
                  </div>
                </div>

                {/* Bouton Calcul OSRM */}
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    try {
                      const res = await getRoute(
                        [routeOriginLat, routeOriginLng],
                        [routeDestLat, routeDestLng]
                      );
                      if (res) {
                        setRouteDistance(Number(res.distance.toFixed(1)));
                        setRouteDuration(Math.round(res.duration));
                        toast.success(`Calcul OSRM : ${res.distance.toFixed(1)} km en ~${Math.round(res.duration)} min`);
                      }
                    } catch {
                      toast.error('Calcul OSRM indisponible');
                    }
                  }}
                  className="w-full text-xs font-bold"
                >
                  <Gauge className="h-3.5 w-3.5 mr-1.5 text-primary" /> Calculer Distance & Durée (OSRM)
                </Button>
              </div>

              <Button
                onClick={handleCreateRoute}
                disabled={createRouteMutation.isPending || !selectedEventId}
                className="w-full font-bold"
              >
                <Plus className="h-4 w-4 mr-1.5" /> Créer & Relier l'Itinéraire
              </Button>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-4">
            <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-base text-foreground">
                    Itinéraires Définis ({eventRoutes.length})
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Lignes de navette prêtes pour la planification
                  </p>
                </div>
                <Button
                  onClick={() => setActiveTab('fleet')}
                  variant="outline"
                  size="sm"
                  className="font-bold text-xs"
                >
                  Phase 4 : Flotte & Chauffeurs <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>

              {eventRoutes.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-border bg-muted/30 space-y-2">
                  <RouteIcon className="h-8 w-8 mx-auto text-muted-foreground/50" />
                  <p className="text-xs font-bold text-foreground">Aucun itinéraire pour cet événement</p>
                  <p className="text-[11px] text-muted-foreground">
                    Créez au moins un trajet reliant un point de ramassage au site événement.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {eventRoutes.map((r: any) => (
                    <div
                      key={r.id}
                      className="p-4 rounded-2xl border border-border bg-background space-y-2 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-foreground">{r.name}</span>
                        <Badge variant={r.isActive ? 'success' : 'secondary'}>
                          {r.isActive ? 'Actif' : 'Inactif'}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <span className="font-semibold text-foreground">{r.origin}</span>
                        <span>➔</span>
                        <span className="font-semibold text-foreground">{r.destination}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground pt-1 border-t border-border/60">
                        <span>Distance: {r.distance} km</span>
                        <span>Durée: ~{r.estimatedDuration} min</span>
                        <span>Arrêts: {r.stops?.length || 0}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PHASE 4: FLEET & DRIVERS */}
      {activeTab === 'fleet' && (
        <div className="grid gap-6 lg:grid-cols-12 animate-in fade-in duration-200">
          <div className="lg:col-span-5 space-y-4">
            <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-sm space-y-4">
              <h2 className="text-base font-black tracking-tight text-foreground flex items-center gap-2">
                <Truck className="h-4 w-4 text-amber-500" />
                Ajout Rapide de Navette
              </h2>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Numéro / Code Bus</Label>
                  <Input
                    placeholder="ex: Bus Shuttle #04"
                    value={newBusNumber}
                    onChange={(e) => setNewBusNumber(e.target.value)}
                    className="font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Immatriculation</Label>
                  <Input
                    placeholder="ex: 12345-A-1"
                    value={newPlateNumber}
                    onChange={(e) => setNewPlateNumber(e.target.value)}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Capacité (Places assises)</Label>
                  <Input
                    type="number"
                    value={newBusCapacity}
                    onChange={(e) => setNewBusCapacity(Number(e.target.value))}
                  />
                </div>
              </div>

              <Button
                onClick={() => {
                  if (!newBusNumber || !newPlateNumber) {
                    toast.error('Veuillez renseigner le numéro et la plaque du bus');
                    return;
                  }
                  createVehicleMutation.mutate({
                    busNumber: newBusNumber,
                    plateNumber: newPlateNumber,
                    capacity: Number(newBusCapacity),
                    status: 'ACTIVE',
                  });
                }}
                disabled={createVehicleMutation.isPending}
                className="w-full font-bold"
              >
                <Plus className="h-4 w-4 mr-1.5" /> Ajouter à la Flotte
              </Button>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-4">
            <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-base text-foreground">
                    Flotte & Chauffeurs Enregistrés
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Ressources mobilisables pour l'événement
                  </p>
                </div>
                <Button
                  onClick={() => setActiveTab('trips')}
                  variant="outline"
                  size="sm"
                  className="font-bold text-xs"
                >
                  Phase 5 : Planifier les Navettes <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Vehicles Column */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground block">
                    Véhicules ({allVehicles.length})
                  </Label>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {allVehicles.map((v: any) => (
                      <div key={v.id} className="p-3 rounded-xl border border-border bg-background flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-foreground">{v.busNumber}</p>
                          <p className="font-mono text-[10px] text-muted-foreground">{v.plateNumber}</p>
                        </div>
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-bold">
                          {v.capacity} pl.
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Drivers Column */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground block">
                    Conducteurs ({allDrivers.length})
                  </Label>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {allDrivers.map((d: any) => (
                      <div key={d.id} className="p-3 rounded-xl border border-border bg-background flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <UserCircle className="h-6 w-6 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <p className="font-bold text-foreground truncate">{d.user?.firstName} {d.user?.lastName}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{d.phone || 'Sans tel'}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                          ★ {d.rating || 5.0}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PHASE 5: TRIPS SCHEDULING */}
      {activeTab === 'trips' && (
        <div className="grid gap-6 lg:grid-cols-12 animate-in fade-in duration-200">
          <div className="lg:col-span-5 space-y-4">
            <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-black tracking-tight text-foreground flex items-center gap-2">
                  <Bus className="h-4 w-4 text-primary" />
                  Programmation des Navettes
                </h2>
              </div>

              {/* Mode Toggle: Single Trip vs Batch Generator */}
              <div className="grid grid-cols-2 p-1 bg-muted/60 rounded-xl gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => setTripCreationMode('SINGLE')}
                  className={`py-2 px-3 rounded-lg font-bold transition-all ${
                    tripCreationMode === 'SINGLE'
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Départ Unique (1)
                </button>
                <button
                  type="button"
                  onClick={() => setTripCreationMode('BATCH')}
                  className={`py-2 px-3 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
                    tripCreationMode === 'BATCH'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Sliders className="h-3 w-3" /> Multi-Départs
                </button>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Itinéraire</Label>
                  <select
                    value={tripRouteId}
                    onChange={(e) => setTripRouteId(e.target.value)}
                    className="w-full h-10 rounded-xl border border-input bg-background px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">-- Sélectionner un itinéraire --</option>
                    {eventRoutes.map((r: any) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.origin} ➔ {r.destination})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Bus Navette</Label>
                    <select
                      value={tripVehicleId}
                      onChange={(e) => setTripVehicleId(e.target.value)}
                      className="w-full h-10 rounded-xl border border-input bg-background px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">-- Bus --</option>
                      {allVehicles.map((v: any) => (
                        <option key={v.id} value={v.id}>
                          {v.busNumber} ({v.capacity} pl.)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Conducteur</Label>
                    <select
                      value={tripDriverId}
                      onChange={(e) => setTripDriverId(e.target.value)}
                      className="w-full h-10 rounded-xl border border-input bg-background px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">-- Chauffeur --</option>
                      {allDrivers.map((d: any) => (
                        <option key={d.id} value={d.id}>
                          {d.user?.firstName} {d.user?.lastName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {tripCreationMode === 'SINGLE' ? (
                  /* SINGLE TRIP FORM */
                  <div className="space-y-3 pt-1">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold uppercase text-muted-foreground">Heure de Départ</Label>
                      <Input
                        type="time"
                        value={tripDepartureTime}
                        onChange={(e) => setTripDepartureTime(e.target.value)}
                      />
                    </div>

                    <Button
                      onClick={handleCreateTrip}
                      disabled={createTripMutation.isPending}
                      className="w-full font-bold shadow-sm"
                    >
                      <Plus className="h-4 w-4 mr-1.5" /> Programmer 1 Seule Navette
                    </Button>
                  </div>
                ) : (
                  /* BATCH GENERATOR FORM */
                  <div className="space-y-3 pt-1">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold uppercase text-muted-foreground">1er Départ</Label>
                      <Input
                        type="time"
                        value={tripDepartureTime}
                        onChange={(e) => setTripDepartureTime(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-bold uppercase text-muted-foreground">Intervalle (min)</Label>
                        <Input
                          type="number"
                          min={5}
                          max={240}
                          step={5}
                          value={batchIntervalMinutes}
                          onChange={(e) => setBatchIntervalMinutes(Number(e.target.value))}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-bold uppercase text-muted-foreground">Nombre de Navettes</Label>
                        <Input
                          type="number"
                          min={2}
                          max={20}
                          value={batchCount}
                          onChange={(e) => setBatchCount(Number(e.target.value))}
                        />
                      </div>
                    </div>

                    {/* Live preview of scheduled times */}
                    <div className="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Aperçu des horaires générés :
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {Array.from({ length: Math.min(batchCount, 8) }).map((_, idx) => {
                          const [hStr, mStr] = tripDepartureTime.split(':');
                          const total = Number(hStr || 8) * 60 + Number(mStr || 0) + idx * batchIntervalMinutes;
                          const hh = String(Math.floor(total / 60) % 24).padStart(2, '0');
                          const mm = String(total % 60).padStart(2, '0');
                          return (
                            <Badge key={idx} variant="secondary" className="font-mono text-[11px] px-2 py-0.5">
                              {hh}:{mm}
                            </Badge>
                          );
                        })}
                        {batchCount > 8 && (
                          <span className="text-[10px] text-muted-foreground self-center">
                            +{batchCount - 8} de plus
                          </span>
                        )}
                      </div>
                    </div>

                    <Button
                      type="button"
                      onClick={handleBatchGenerateTrips}
                      disabled={isGeneratingBatch}
                      className="w-full font-bold bg-primary hover:bg-primary/90"
                    >
                      <Sliders className="h-4 w-4 mr-1.5" />
                      {isGeneratingBatch
                        ? 'Génération en cours...'
                        : `Générer ${batchCount} Navettes en Série`}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-4">
            <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-black text-base text-foreground">
                    Planning des Navettes ({eventTrips.length})
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Navettes programmées pour cet événement
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {eventTrips.length > 0 && (
                    <Button
                      onClick={handleDeleteAllTrips}
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30 font-bold text-xs"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Supprimer tout
                    </Button>
                  )}
                  <Button
                    onClick={() => setActiveTab('launchpad')}
                    variant="outline"
                    size="sm"
                    className="font-bold text-xs"
                  >
                    Phase 6 : Audit & Lancement <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              </div>

              {eventTrips.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-border bg-muted/30 space-y-2">
                  <Bus className="h-8 w-8 mx-auto text-muted-foreground/50" />
                  <p className="text-xs font-bold text-foreground">Aucune navette programmée</p>
                  <p className="text-[11px] text-muted-foreground">
                    Programmez un premier trajet ou utilisez le générateur multi-départs.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                  {eventTrips.map((t: any) => (
                    <div
                      key={t.id}
                      className="p-3.5 rounded-2xl border border-border bg-background flex items-center justify-between gap-3 text-xs shadow-2xs hover:border-border/80 transition-colors"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-foreground truncate">{t.route?.name || 'Navette Express'}</p>
                          <Badge className={getStatusColor(t.status)}>
                            {t.status ? t.status.replace('_', ' ') : 'SCHEDULED'}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground font-mono">
                          Départ : <strong className="text-primary">{formatTime(t.departureTime)}</strong> • {formatDate(t.date)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Bus: {t.vehicle?.busNumber} • Chauffeur: {t.driver?.user?.firstName} {t.driver?.user?.lastName}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (window.confirm(`Supprimer la navette de ${formatTime(t.departureTime)} ?`)) {
                              deleteTripMutation.mutate(t.id);
                            }
                          }}
                          disabled={deleteTripMutation.isPending}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PHASE 6: AUDIT DE PRÉPARATION & LAUNCHPAD */}
      {activeTab === 'launchpad' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Left Column: Readiness Audit Checklist */}
            <div className="lg:col-span-7 space-y-4">
              <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-black tracking-tight text-foreground flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-emerald-600" />
                    Audit de Préparation Événement
                  </h2>
                  <span className="text-xs font-mono font-bold text-muted-foreground">
                    {readinessPercent}% Conforme
                  </span>
                </div>

                <div className="space-y-3">
                  {[
                    {
                      label: "1. Spécification de l'Événement",
                      desc: `${eventName || 'Non défini'} (${eventDate || 'Date requise'})`,
                      ok: hasEvent,
                      action: () => setActiveTab('event'),
                    },
                    {
                      label: '2. Réseau Points de Ramassage',
                      desc: `${eventPickupPoints.length} point(s) d'embarquement géolocalisé(s)`,
                      ok: hasPickups,
                      action: () => setActiveTab('pickups'),
                    },
                    {
                      label: '3. Itinéraires Routiers OSRM',
                      desc: `${eventRoutes.length} trajet(s) relié(s) au site d'accueil`,
                      ok: hasRoutes,
                      action: () => setActiveTab('routes'),
                    },
                    {
                      label: '4. Flotte & Chauffeurs Assignés',
                      desc: `${allVehicles.length} bus et ${allDrivers.length} chauffeurs prêts`,
                      ok: hasFleet,
                      action: () => setActiveTab('fleet'),
                    },
                    {
                      label: '5. Navettes Programmées',
                      desc: `${eventTrips.length} départ(s) horaire(s) configuré(s)`,
                      ok: hasTrips,
                      action: () => setActiveTab('trips'),
                    },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
                        item.ok
                          ? 'border-emerald-500/30 bg-emerald-500/5 text-foreground'
                          : 'border-amber-500/30 bg-amber-500/5 text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                            item.ok
                              ? 'bg-emerald-500 text-white'
                              : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {item.ok ? <Check className="h-4 w-4" /> : '!'}
                        </div>
                        <div>
                          <p className="font-bold text-xs">{item.label}</p>
                          <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={item.action}
                        className="text-xs font-bold text-primary hover:bg-primary/10"
                      >
                        Configurer
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Sharable Passenger Pass & Direct Launchpad */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-sm space-y-4">
                <h3 className="font-black text-base text-foreground flex items-center gap-2">
                  <Share2 className="h-4 w-4 text-primary" />
                  Accès Billetterie Passager
                </h3>
                <p className="text-xs text-muted-foreground">
                  Partagez ce lien ou QR code avec les participants pour qu'ils réservent leur place sur les navettes.
                </p>

                <div className="p-4 rounded-2xl bg-muted/40 border border-border text-center space-y-3">
                  <div className="p-2 bg-white rounded-2xl shadow-sm border border-border inline-block mx-auto">
                    <SafeQRCode value={passengerBookingUrl} size={110} />
                  </div>
                  <p className="text-[11px] font-mono text-muted-foreground truncate">
                    {passengerBookingUrl}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(passengerBookingUrl);
                      toast.success('Lien copié dans le presse-papier !');
                    }}
                    className="w-full font-bold text-xs"
                  >
                    <Copy className="h-3.5 w-3.5 mr-1.5" /> Copier le Lien d'Inscription
                  </Button>
                </div>

                {/* Live Operations Cockpit Actions */}
                <div className="pt-3 border-t border-border/60 space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground block">
                    Commandes Opérationnelles en Direct :
                  </Label>
                  <Button
                    onClick={() => navigate('/admin/active-shuttles')}
                    className="w-full font-black bg-primary text-primary-foreground flex items-center justify-center gap-2"
                  >
                    <Radio className="h-4 w-4 animate-pulse" />
                    Ouvrir le Radar Navettes en Direct
                  </Button>

                  <Button
                    onClick={() => navigate('/admin/trips')}
                    variant="outline"
                    className="w-full font-bold text-xs"
                  >
                    <Bus className="h-4 w-4 mr-1.5" />
                    Consulter la Liste des Trajets
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RocketIcon(props: any) {
  return <Sparkles {...props} />;
}
