import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pickupPointsApi, eventsApi } from '@/services/api';
import { DataTable } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { EntityModal } from '@/components/shared/EntityModal';
import AddressSearch from '@/components/shared/AddressSearch';
import LocationPicker from '@/components/shared/LocationPicker';
import { pickupPointSchema, PickupPointFormData } from '@/lib/validation';
import { Plus, Edit2, Trash2, MapPin, Calendar, Compass } from 'lucide-react';
import toast from 'react-hot-toast';
import { reverseGeocode } from '@/services/googleMaps';

export default function AdminPickupPoints() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedEventFilter, setSelectedEventFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const queryClient = useQueryClient();

  const form = useForm<PickupPointFormData>({
    resolver: zodResolver(pickupPointSchema),
    defaultValues: {
      name: '',
      address: '',
      latitude: 0,
      longitude: 0,
      maxCapacity: 50,
      eventId: '',
    },
  });

  const { data: eventsData } = useQuery({
    queryKey: ['events-list'],
    queryFn: () => eventsApi.getAll({ limit: 100 }).then((r) => r.data),
  });
  const events = eventsData?.data || [];

  const { data, isLoading } = useQuery({
    queryKey: ['pickup-points', page, search, selectedEventFilter],
    queryFn: () =>
      pickupPointsApi
        .getAll({ page, limit: 10, search, ...(selectedEventFilter ? { eventId: selectedEventFilter } : {}) })
        .then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (d: PickupPointFormData) => pickupPointsApi.create(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pickup-points'] });
      toast.success('Pickup point created successfully');
      setModalOpen(false);
      form.reset();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create pickup point');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (d: PickupPointFormData) => pickupPointsApi.update(editing.id, d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pickup-points'] });
      toast.success('Pickup point updated successfully');
      setModalOpen(false);
      setEditing(null);
      form.reset();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update pickup point');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => pickupPointsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pickup-points'] });
      toast.success('Pickup point deleted');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete pickup point');
    },
  });

  const openCreate = () => {
    setEditing(null);
    const initialEventId = selectedEventFilter || (events.length > 0 ? events[0].id : '');
    const selectedEvent = events.find((e: any) => e.id === initialEventId);
    const defaultLat = selectedEvent?.latitude || 40.7128;
    const defaultLng = selectedEvent?.longitude || -74.006;

    form.reset({
      name: '',
      address: '',
      latitude: defaultLat,
      longitude: defaultLng,
      maxCapacity: 50,
      eventId: initialEventId,
    });
    setModalOpen(true);
  };

  const openEdit = (p: any) => {
    setEditing(p);
    form.reset({
      name: p.name,
      latitude: p.latitude || 0,
      longitude: p.longitude || 0,
      address: p.address || '',
      maxCapacity: p.maxCapacity || 50,
      eventId: p.eventId,
    });
    setModalOpen(true);
  };

  const handleEventChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newEventId = e.target.value;
    form.setValue('eventId', newEventId, { shouldValidate: true });
    const targetEvent = events.find((ev: any) => ev.id === newEventId);
    if (targetEvent?.latitude && targetEvent?.longitude) {
      // If pickup point lat/lng is still 0 or empty, sync to event's location
      const currentLat = form.getValues('latitude');
      if (!currentLat || currentLat === 0) {
        form.setValue('latitude', targetEvent.latitude, { shouldValidate: true });
        form.setValue('longitude', targetEvent.longitude, { shouldValidate: true });
        if (targetEvent.address && !form.getValues('address')) {
          form.setValue('address', targetEvent.address, { shouldValidate: true });
        }
      }
    }
  };

  const setLocationFromEvent = () => {
    const currentEventId = form.getValues('eventId');
    const targetEvent = events.find((ev: any) => ev.id === currentEventId);
    if (targetEvent?.latitude && targetEvent?.longitude) {
      form.setValue('latitude', targetEvent.latitude, { shouldValidate: true });
      form.setValue('longitude', targetEvent.longitude, { shouldValidate: true });
      if (targetEvent.address) {
        form.setValue('address', targetEvent.address, { shouldValidate: true });
      }
      toast.success('Coordinates synced from event location');
    } else {
      toast('Selected event does not have coordinates', { icon: 'ℹ️' });
    }
  };

  const onSubmit = async (data: PickupPointFormData) => {
    const payload = {
      ...data,
      latitude: Number(data.latitude) || 0,
      longitude: Number(data.longitude) || 0,
      maxCapacity: Number(data.maxCapacity) || 50,
    };
    if (editing) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Pickup Station',
      render: (p: any) => (
        <div>
          <span className="font-semibold text-foreground">{p.name}</span>
          {p.event?.name && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
              <Calendar className="h-3 w-3 text-primary" />
              <span>{p.event.name}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'address',
      header: 'Address',
      render: (p: any) => (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground max-w-xs truncate">
          <MapPin className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
          <span className="truncate">{p.address || 'GPS Coordinate Station'}</span>
        </div>
      ),
    },
    {
      key: 'capacity',
      header: 'Max Capacity',
      render: (p: any) => (
        <Badge variant="outline" className="font-mono text-xs font-semibold">
          {p.maxCapacity ? `${p.maxCapacity} seats` : '50 seats'}
        </Badge>
      ),
    },
    {
      key: 'coordinates',
      header: 'Coordinates',
      render: (p: any) =>
        p.latitude && p.longitude ? (
          <span className="font-mono text-xs text-muted-foreground">
            {p.latitude.toFixed(4)}, {p.longitude.toFixed(4)}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground italic">-</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      render: (p: any) => (
        <div className="flex gap-1 justify-end">
          <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
            onClick={() => {
              if (confirm(`Delete pickup point "${p.name}"?`)) deleteMutation.mutate(p.id);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const currentLat = Number(form.watch('latitude')) || 40.7128;
  const currentLng = Number(form.watch('longitude')) || -74.006;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Pickup Points</h1>
          <p className="text-muted-foreground text-sm">
            Manage passenger boarding hubs, smart station clusters, and GPS pickup coordinates.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Add Pickup Point
        </Button>
      </div>

      {/* Filter by Event Strip if events exist */}
      {events.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedEventFilter('')}
            className={`rounded-full px-3.5 py-1 text-xs font-semibold transition-all shrink-0 ${
              selectedEventFilter === ''
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            All Events ({data?.total || 0})
          </button>
          {events.map((ev: any) => (
            <button
              key={ev.id}
              onClick={() => setSelectedEventFilter(ev.id)}
              className={`rounded-full px-3.5 py-1 text-xs font-semibold transition-all shrink-0 ${
                selectedEventFilter === ev.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {ev.name}
            </button>
          ))}
        </div>
      )}

      <DataTable
        columns={columns}
        data={data?.data || []}
        total={data?.total}
        page={data?.page}
        totalPages={data?.totalPages}
        onPageChange={setPage}
        onSearch={setSearch}
        loading={isLoading}
        searchPlaceholder="Search pickup points..."
      />

      <EntityModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editing ? 'Edit Pickup Point' : 'Add Pickup Point'}
        description="Configure station name, target event, and map coordinates for participant pickup."
        form={form}
        onSubmit={onSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        submitLabel={editing ? 'Save Changes' : 'Create Pickup Point'}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Station Name */}
          <div className="sm:col-span-2">
            <Label htmlFor="name">Station / Hub Name *</Label>
            <Input
              id="name"
              placeholder="e.g. North Gate Hub, Silicon Station"
              {...form.register('name')}
            />
            {form.formState.errors.name && (
              <p className="text-xs text-red-500 mt-1 font-medium">{form.formState.errors.name.message}</p>
            )}
          </div>

          {/* Event Dropdown */}
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <Label htmlFor="eventId">Associated Event *</Label>
              {form.watch('eventId') && (
                <button
                  type="button"
                  onClick={setLocationFromEvent}
                  className="text-[11px] text-primary hover:underline flex items-center gap-1 font-medium"
                >
                  <Compass className="h-3 w-3" /> Use Event Location
                </button>
              )}
            </div>
            <select
              id="eventId"
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={form.watch('eventId') || ''}
              onChange={handleEventChange}
            >
              <option value="">Select an event...</option>
              {events.map((e: any) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
            {form.formState.errors.eventId && (
              <p className="text-xs text-red-500 mt-1 font-medium">{form.formState.errors.eventId.message}</p>
            )}
          </div>

          {/* Address Search */}
          <div className="sm:col-span-2">
            <Label>Station Address / Search</Label>
            <AddressSearch
              value={form.watch('address') || ''}
              onChange={(v) => form.setValue('address', v, { shouldValidate: true })}
              onSelect={(addr, lat, lng) => {
                form.setValue('address', addr, { shouldValidate: true });
                form.setValue('latitude', lat, { shouldValidate: true });
                form.setValue('longitude', lng, { shouldValidate: true });
              }}
              placeholder="Search pickup point address or location..."
            />
          </div>

          {/* Hidden Form Latitude/Longitude bindings */}
          <input type="hidden" {...form.register('latitude')} />
          <input type="hidden" {...form.register('longitude')} />

          {/* Interactive Map Picker */}
          <div className="sm:col-span-2 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <Label className="text-xs">Pin Location On Map (Click or Drag)</Label>
              <span className="font-mono text-[11px] text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3 text-emerald-500" />
                {currentLat.toFixed(5)}, {currentLng.toFixed(5)}
              </span>
            </div>
            <LocationPicker
              lat={currentLat}
              lng={currentLng}
              onMove={async (lat, lng) => {
                form.setValue('latitude', lat, { shouldValidate: true });
                form.setValue('longitude', lng, { shouldValidate: true });
                try {
                  const addr = await reverseGeocode(lat, lng);
                  if (addr) form.setValue('address', addr, { shouldValidate: true });
                } catch {}
              }}
              height="200px"
            />
          </div>

          {/* Max Capacity */}
          <div className="sm:col-span-2">
            <Label htmlFor="maxCapacity">Max Waiting Capacity (Passengers)</Label>
            <Input
              id="maxCapacity"
              type="number"
              min={1}
              max={1000}
              placeholder="50"
              {...form.register('maxCapacity')}
            />
            {form.formState.errors.maxCapacity && (
              <p className="text-xs text-red-500 mt-1 font-medium">{form.formState.errors.maxCapacity.message}</p>
            )}
          </div>
        </div>
      </EntityModal>
    </div>
  );
}

