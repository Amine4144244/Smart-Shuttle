import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Transit Design System Custom Icons
const createBusIcon = () =>
  L.divIcon({
    html: `
      <div class="relative flex items-center justify-center">
        <span class="absolute inline-flex h-10 w-10 animate-ping rounded-full bg-blue-400 opacity-60"></span>
        <div class="relative w-8 h-8 rounded-full bg-slate-900 border-2 border-blue-500 flex items-center justify-center text-white shadow-xl shadow-blue-500/40">
          <svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h8m-8 4h8m-6 4h4M5 3h14a2 2 0 012 2v11a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2zM6 19v2m12-2v2"/>
          </svg>
        </div>
      </div>
    `,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

const createStopIcon = (type: 'origin' | 'stop' | 'destination' = 'stop') => {
  const colors = {
    origin: 'bg-blue-500 ring-blue-500/30 border-white text-blue-500',
    stop: 'bg-emerald-500 ring-emerald-500/30 border-white text-emerald-500',
    destination: 'bg-amber-500 ring-amber-500/30 border-white text-amber-500',
  };

  return L.divIcon({
    html: `
      <div class="flex items-center justify-center">
        <div class="w-3.5 h-3.5 rounded-full ${colors[type]} ring-4 border-2 shadow-md"></div>
      </div>
    `,
    className: '',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
};

interface MapPoint {
  lat: number;
  lng: number;
  name?: string;
}

interface ShuttleMapProps {
  center?: [number, number];
  shuttlePosition?: [number, number];
  stops?: MapPoint[];
  origin?: MapPoint;
  destination?: MapPoint;
  zoom?: number;
  height?: string;
}

export default function ShuttleMap({
  center = [40.7128, -74.006],
  shuttlePosition,
  stops = [],
  origin,
  destination,
  zoom = 13,
  height = '100%',
}: ShuttleMapProps) {
  const mapRef = useRef<L.Map>(null);

  useEffect(() => {
    if (shuttlePosition && mapRef.current) {
      mapRef.current.setView(shuttlePosition, mapRef.current.getZoom());
    }
  }, [shuttlePosition]);

  const routePoints: [number, number][] = [];
  if (origin) routePoints.push([origin.lat, origin.lng]);
  stops.forEach((s) => routePoints.push([s.lat, s.lng]));
  if (destination) routePoints.push([destination.lat, destination.lng]);

  return (
    <div className="relative z-0 isolate w-full h-full rounded-xl overflow-hidden border border-border/80 shadow-md">
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height, width: '100%' }}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {origin && (
          <Marker position={[origin.lat, origin.lng]} icon={createStopIcon('origin')}>
            <Popup className="font-sans">
              <div className="p-1">
                <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider block">Origin Departure</span>
                <p className="text-xs font-medium text-foreground">{origin.name || 'Origin Point'}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {stops.map((stop, i) => (
          <Marker key={i} position={[stop.lat, stop.lng]} icon={createStopIcon('stop')}>
            <Popup className="font-sans">
              <div className="p-1">
                <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider block">Station {i + 1}</span>
                <p className="text-xs font-medium text-foreground">{stop.name || `Waypoint ${i + 1}`}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {destination && (
          <Marker position={[destination.lat, destination.lng]} icon={createStopIcon('destination')}>
            <Popup className="font-sans">
              <div className="p-1">
                <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider block">Terminus Destination</span>
                <p className="text-xs font-medium text-foreground">{destination.name || 'Final Destination'}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {routePoints.length > 1 && (
          <>
            <Polyline positions={routePoints} color="#3b82f6" weight={5} opacity={0.3} />
            <Polyline positions={routePoints} color="#2563eb" weight={3} dashArray="6 6" />
          </>
        )}

        {shuttlePosition && (
          <Marker position={shuttlePosition} icon={createBusIcon()}>
            <Popup className="font-sans">
              <div className="p-1.5 text-center">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 text-[10px] font-bold tracking-wider uppercase mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                  Active Shuttle
                </div>
                <p className="font-mono text-xs font-semibold text-foreground">
                  {shuttlePosition[0].toFixed(5)}, {shuttlePosition[1].toFixed(5)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
