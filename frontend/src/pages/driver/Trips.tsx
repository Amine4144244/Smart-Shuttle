import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tripsApi, reservationsApi } from '@/services/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDate, formatTime, getStatusColor } from '@/lib/utils';
import { Play, CheckCircle2, Clock, Users, ChevronDown, ChevronUp, Search, Bus } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DriverTrips() {
  const [expandedTrip, setExpandedTrip] = useState<string | null>(null);
  const [passengerSearch, setPassengerSearch] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['driver-trips'],
    queryFn: () => tripsApi.getAll({ limit: 50 }).then(r => r.data),
  });

  const { data: reservations } = useQuery({
    queryKey: ['trip-passengers', expandedTrip],
    queryFn: () => reservationsApi.getAll({ tripId: expandedTrip, limit: 200 }).then(r => r.data),
    enabled: !!expandedTrip,
  });

  const handleStartTrip = async (id: string) => {
    try { await tripsApi.startTrip(id); toast.success('Trip started!'); refetch(); }
    catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleCompleteTrip = async (id: string) => {
    try { await tripsApi.completeTrip(id); toast.success('Trip completed!'); refetch(); }
    catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  if (isLoading) return (
    <div className="flex min-h-[400px] items-center justify-center">
      <Clock className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  const filteredPassengers = reservations?.data?.filter((r: any) =>
    !passengerSearch || `${r.participant?.firstName} ${r.participant?.lastName} ${r.reservationCode}`
      .toLowerCase().includes(passengerSearch.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">My Trips</h1>
        <p className="text-muted-foreground">Your assigned trips and passenger boarding</p>
      </div>

      {(!data?.data || data.data.length === 0) ? (
        <Card className="rounded-3xl border-dashed">
          <CardContent className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
              <Bus className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <h3 className="text-base font-bold">No Trips Assigned Yet</h3>
              <p className="text-xs text-muted-foreground">
                You have not been assigned to any event shuttle runs yet. When an event organizer selects you during the shuttle programming phase, your assigned trips will appear here automatically.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {data.data.map((trip: any) => {
            const isExpanded = expandedTrip === trip.id;
            const passengerCount = trip._count?.reservations ?? 0;
            return (
              <Card key={trip.id} className="overflow-hidden border-border/60 hover:shadow-md transition-all">
                <CardContent className="p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold">{trip.name || `Trip #${trip.id.slice(0, 8)}`}</h3>
                        <Badge className={getStatusColor(trip.status)}>{trip.status ? trip.status.replace('_', ' ') : ''}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{trip.route?.name} — {trip.route?.origin} → {trip.route?.destination}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span>Date: <strong className="text-foreground">{formatDate(trip.date)}</strong></span>
                        <span>Departure: <strong className="text-foreground">{formatTime(trip.departureTime)}</strong></span>
                        <span>Vehicle: <strong className="text-foreground">{trip.vehicle?.busNumber}</strong></span>
                        <span>Capacity: <strong className="text-foreground">{trip.vehicle?.capacity || 0}</strong></span>
                        <span>Passengers: <strong className="text-primary font-bold">{passengerCount}</strong></span>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2 flex-wrap items-center">
                      <Button
                        size="sm"
                        variant={isExpanded ? 'secondary' : 'outline'}
                        onClick={() => setExpandedTrip(isExpanded ? null : trip.id)}
                      >
                        <Users className="mr-1.5 h-4 w-4" />
                        Passengers ({passengerCount})
                        {isExpanded ? <ChevronUp className="ml-1.5 h-3.5 w-3.5" /> : <ChevronDown className="ml-1.5 h-3.5 w-3.5" />}
                      </Button>

                      {trip.status === 'SCHEDULED' && (
                        <Button size="sm" onClick={() => handleStartTrip(trip.id)}>
                          <Play className="mr-1 h-4 w-4" /> Start Trip
                        </Button>
                      )}
                      {trip.status === 'IN_PROGRESS' && (
                        <Button size="sm" variant="default" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleCompleteTrip(trip.id)}>
                          <CheckCircle2 className="mr-1 h-4 w-4" /> Complete Trip
                        </Button>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 border-t pt-4 space-y-3">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <Search className="h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search passenger by name or code..."
                            value={passengerSearch}
                            onChange={(e) => setPassengerSearch(e.target.value)}
                            className="max-w-xs h-8 text-sm"
                          />
                        </div>
                        <span className="text-xs text-muted-foreground font-medium">
                          Showing {filteredPassengers.length} of {reservations?.data?.length || 0} booked passenger(s)
                        </span>
                      </div>

                      <div className="overflow-x-auto rounded-xl border">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/50">
                            <tr className="border-b text-left text-xs font-semibold uppercase text-muted-foreground">
                              <th className="py-2.5 px-3">Participant</th>
                              <th className="py-2.5 px-3">Pickup Location</th>
                              <th className="py-2.5 px-3">Code</th>
                              <th className="py-2.5 px-3">Status</th>
                              <th className="py-2.5 px-3">Boarding</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {filteredPassengers.map((r: any) => (
                              <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                                <td className="py-2.5 px-3">
                                  <div className="flex items-center gap-2">
                                    <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                                      {r.participant?.firstName?.[0]}{r.participant?.lastName?.[0]}
                                    </div>
                                    <div>
                                      <p className="font-medium text-foreground">{r.participant?.firstName} {r.participant?.lastName}</p>
                                      <p className="text-xs text-muted-foreground">{r.participant?.phone || r.participant?.email}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-xs text-muted-foreground font-medium">
                                  {r.pickupPoint?.name || r.pickupAddress || 'Assigned Station'}
                                </td>
                                <td className="py-2.5 px-3 font-mono text-xs font-semibold text-foreground">{r.reservationCode}</td>
                                <td className="py-2.5 px-3"><Badge className={getStatusColor(r.status)}>{r.status}</Badge></td>
                                <td className="py-2.5 px-3">
                                  {r.status === 'CHECKED_IN' ? (
                                    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">Boarded</Badge>
                                  ) : r.status === 'CONFIRMED' ? (
                                    <Badge variant="outline" className="text-amber-600 border-amber-500/30 bg-amber-500/10">Waiting</Badge>
                                  ) : (
                                    <Badge variant="outline">{r.status}</Badge>
                                  )}
                                </td>
                              </tr>
                            ))}
                            {filteredPassengers.length === 0 && (
                              <tr>
                                <td colSpan={5} className="py-8 text-center text-muted-foreground text-xs">
                                  No passengers found for this trip.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
