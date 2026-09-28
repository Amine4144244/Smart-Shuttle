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
          return (
            <Card key={trip.id}>
              <CardContent className="p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">{trip.name || `Trip #${trip.id.slice(0, 8)}`}</h3>
                      <Badge className={getStatusColor(trip.status)}>{trip.status ? trip.status.replace('_', ' ') : ''}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{trip.route?.name} — {trip.route?.origin} → {trip.route?.destination}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                      <span>Date: {formatDate(trip.date)}</span>
                      <span>Departure: {formatTime(trip.departureTime)}</span>
                      <span>Vehicle: {trip.vehicle?.busNumber}</span>
                      <span>Capacity: {trip.vehicle?.capacity || 0}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {trip.status === 'IN_PROGRESS' && (
                      <Button size="sm" variant="outline" onClick={() => setExpandedTrip(isExpanded ? null : trip.id)}>
                        <Users className="mr-1 h-4 w-4" /> Passengers {isExpanded ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />}
                      </Button>
                    )}
                    {trip.status === 'SCHEDULED' && (
                      <Button size="sm" onClick={() => handleStartTrip(trip.id)}><Play className="mr-1 h-4 w-4" /> Start</Button>
                    )}
                    {trip.status === 'IN_PROGRESS' && (
                      <Button size="sm" variant="secondary" onClick={() => handleCompleteTrip(trip.id)}><CheckCircle2 className="mr-1 h-4 w-4" /> Complete</Button>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 border-t pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Search className="h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Search by name or code..." value={passengerSearch}
                        onChange={(e) => setPassengerSearch(e.target.value)} className="max-w-xs h-8 text-sm" />
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-muted-foreground">
                            <th className="pb-2 font-medium">Participant</th>
                            <th className="pb-2 font-medium">Code</th>
                            <th className="pb-2 font-medium">Status</th>
                            <th className="pb-2 font-medium">Boarding</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredPassengers.map((r: any) => (
                            <tr key={r.id} className="border-b last:border-0">
                              <td className="py-2.5">
                                <div className="flex items-center gap-2">
                                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                                    {r.participant?.firstName?.[0]}{r.participant?.lastName?.[0]}
                                  </div>
                                  <div>
                                    <p className="font-medium">{r.participant?.firstName} {r.participant?.lastName}</p>
                                    <p className="text-xs text-muted-foreground">{r.participant?.email}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-2.5 font-mono text-xs">{r.reservationCode}</td>
                              <td className="py-2.5"><Badge className={getStatusColor(r.status)}>{r.status}</Badge></td>
                              <td className="py-2.5">
                                {r.status === 'CHECKED_IN' ? (
                                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Boarded</Badge>
                                ) : r.status === 'CONFIRMED' ? (
                                  <Badge variant="outline" className="text-yellow-600 border-yellow-600">Waiting</Badge>
                                ) : (
                                  <Badge variant="outline">{r.status}</Badge>
                                )}
                              </td>
                            </tr>
                          ))}
                          {filteredPassengers.length === 0 && (
                            <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">No passengers found</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">{filteredPassengers.length} passenger(s)</p>
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
