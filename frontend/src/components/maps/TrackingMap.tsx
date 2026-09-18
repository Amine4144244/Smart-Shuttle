import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPoint } from '@/services/googleMaps';
import { Button } from '@/components/ui/button';
import { Layers, Map as MapIcon, Maximize2, Minimize2, Navigation, Crosshair } from 'lucide-react';

interface TrackingMapProps {
  center?: [number, number];
  shuttlePosition?: [number, number];
  shuttleHeading?: number;
  userPosition?: [number, number];
  shuttles?: { id: string; label: string; position: [number, number]; heading?: number }[];
  stops?: MapPoint[];
  origin?: MapPoint;
  destination?: MapPoint;
  routePath?: [number, number][];
  onMapReady?: (map: L.Map) => void;
  height?: string;
  zoom?: number;
  showControls?: boolean;
  showTraffic?: boolean;
  showSatellite?: boolean;
}

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function createOriginIcon() {
  return L.divIcon({
    html: `<div class="relative flex items-center justify-center">
      <div class="absolute -inset-1 rounded-full bg-emerald-500/30 animate-ping"></div>
      <div style="background:#10b981;width:20px;height:20px;border-radius:50%;border:2.5px solid white;box-shadow:0 2px 10px rgba(16,185,129,0.5);display:flex;align-items:center;justify-content:center;color:white;font-size:9px;font-weight:bold;">A</div>
    </div>`,
    className: '', iconSize: [20, 20], iconAnchor: [10, 10],
  });
}

function createDestIcon() {
  return L.divIcon({
    html: `<div class="relative flex items-center justify-center">
      <div style="background:#ef4444;width:20px;height:20px;border-radius:50%;border:2.5px solid white;box-shadow:0 2px 10px rgba(239,68,68,0.5);display:flex;align-items:center;justify-content:center;color:white;font-size:9px;font-weight:bold;">B</div>
    </div>`,
    className: '', iconSize: [20, 20], iconAnchor: [10, 10],
  });
}

function createStopIcon() {
  return L.divIcon({
    html: `<div style="background:#0ea5e9;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 1px 6px rgba(14,165,233,0.5);"></div>`,
    className: '', iconSize: [14, 14], iconAnchor: [7, 7],
  });
}

function createShuttleIcon(heading: number) {
  return L.divIcon({
    html: `<div style="position:relative;display:flex;align-items:center;justify-content:center;width:44px;height:44px;">
      <div style="position:absolute;inset:2px;border-radius:50%;background:rgba(37,99,235,0.25);animation:pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;"></div>
      <div style="transform:rotate(${heading}deg);background:linear-gradient(135deg, #2563eb, #1d4ed8);color:white;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 4px 14px rgba(37,99,235,0.6);border:2.5px solid white;transition:transform 0.4s cubic-bezier(0.4,0,0.2,1);">
        🚌
      </div>
    </div>`,
    className: '', iconSize: [44, 44], iconAnchor: [22, 22],
  });
}

const TILE_CONFIGS: Record<string, { url: string; attribution: string; label: string }> = {
  street: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    label: 'Street',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri',
    label: 'Satellite',
  },
};

const TILE_KEYS = ['street', 'satellite'] as const;
type TileMode = (typeof TILE_KEYS)[number];

export default function TrackingMap({
  shuttlePosition, shuttleHeading, userPosition, shuttles = [], stops = [], origin, destination,
  routePath, onMapReady, height = '420px', zoom = 13,
  showControls = true, showTraffic: _showTraffic = false,
  showSatellite: initialSatellite = false, center: centerProp,
}: TrackingMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const shuttleMarkerRef = useRef<L.Marker | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const multiShuttleRef = useRef<L.Marker[]>([]);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const outerRef = useRef<HTMLDivElement>(null);
  const [mapReady, setMapReady] = useState(false);
  const [tileMode, setTileMode] = useState<TileMode>(initialSatellite ? 'satellite' : 'street');
  const [fullscreen, setFullscreen] = useState(false);

  const center: [number, number] = shuttlePosition || centerProp || [40.7128, -74.006];

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const mode: TileMode = initialSatellite ? 'satellite' : 'street';
    setTileMode(mode);
    const map = L.map(containerRef.current, {
      center: [center[0], center[1]], zoom,
      zoomControl: false, attributionControl: false,
    });
    const tile = L.tileLayer(TILE_CONFIGS[mode].url, { attribution: TILE_CONFIGS[mode].attribution }).addTo(map);
    tileLayerRef.current = tile;
    mapRef.current = map;
    setMapReady(true);
    onMapReady?.(map);
    return () => { map.remove(); mapRef.current = null; };
  }, [initialSatellite]);

  useEffect(() => {
    if (!mapRef.current) return;
    if (tileLayerRef.current) tileLayerRef.current.remove();
    const config = TILE_CONFIGS[tileMode];
    const tile = L.tileLayer(config.url, { attribution: config.attribution }).addTo(mapRef.current);
    tileLayerRef.current = tile;
  }, [tileMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    if (origin) {
      const m = L.marker([origin.lat, origin.lng], { icon: createOriginIcon() }).addTo(map);
      if (origin.name) m.bindTooltip(`Origin: ${origin.name}`, { permanent: false, direction: 'top' });
      markersRef.current.push(m);
    }
    if (destination) {
      const m = L.marker([destination.lat, destination.lng], { icon: createDestIcon() }).addTo(map);
      if (destination.name) m.bindTooltip(`Destination: ${destination.name}`, { permanent: false, direction: 'top' });
      markersRef.current.push(m);
    }
    stops.forEach((stop, index) => {
      const m = L.marker([stop.lat, stop.lng], { icon: createStopIcon() }).addTo(map);
      if (stop.name) m.bindTooltip(`Stop ${index + 1}: ${stop.name}`, { permanent: false, direction: 'top' });
      markersRef.current.push(m);
    });
  }, [origin, destination, stops, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (routeLayerRef.current) { routeLayerRef.current.remove(); routeLayerRef.current = null; }
    if (routePath && routePath.length > 1) {
      const poly = L.polyline(routePath, {
        color: '#2563eb',
        weight: 4.5,
        opacity: 0.85,
        dashArray: '8 6',
      }).addTo(map);
      routeLayerRef.current = poly;
      map.fitBounds(poly.getBounds().pad(0.12));
    }
  }, [routePath, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !shuttlePosition) return;
    const pos = L.latLng(shuttlePosition[0], shuttlePosition[1]);
    if (shuttleMarkerRef.current) {
      shuttleMarkerRef.current.setLatLng(pos);
      if (shuttleHeading !== undefined) {
        shuttleMarkerRef.current.setIcon(createShuttleIcon(shuttleHeading));
      }
    } else {
      const marker = L.marker(pos, { icon: createShuttleIcon(shuttleHeading || 0), zIndexOffset: 1000 }).addTo(map);
      marker.bindTooltip('Active Shuttle', { permanent: false, direction: 'top' });
      shuttleMarkerRef.current = marker;
    }
    map.panTo(pos, { animate: true, duration: 0.8 });
  }, [shuttlePosition, shuttleHeading, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (userMarkerRef.current) { userMarkerRef.current.remove(); userMarkerRef.current = null; }
    if (userPosition) {
      const pos = L.latLng(userPosition[0], userPosition[1]);
      const icon = L.divIcon({
        className: 'user-position-marker',
        html: `<div style="width:16px;height:16px;border-radius:50%;background:#0ea5e9;border:3px solid white;box-shadow:0 0 0 6px rgba(14,165,233,0.3),0 2px 6px rgba(0,0,0,0.3)"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      const marker = L.marker(pos, { icon, zIndexOffset: 900 }).addTo(map);
      marker.bindTooltip('Your Location', { permanent: false, direction: 'top' });
      userMarkerRef.current = marker;
    }
  }, [userPosition, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    multiShuttleRef.current.forEach(m => m.remove());
    multiShuttleRef.current = [];
    if (shuttles.length > 0) {
      const bounds = L.latLngBounds([]);
      shuttles.forEach((s) => {
        const pos = L.latLng(s.position[0], s.position[1]);
        const marker = L.marker(pos, { icon: createShuttleIcon(s.heading || 0), zIndexOffset: 1000 }).addTo(map);
        marker.bindPopup(
          `<div class="p-1 font-sans"><strong class="text-sm font-bold">${s.label}</strong><br/><span class="text-xs text-muted-foreground font-mono">${s.position[0].toFixed(5)}, ${s.position[1].toFixed(5)}</span></div>`,
          { autoClose: false }
        );
        multiShuttleRef.current.push(marker);
        bounds.extend(pos);
      });
      map.fitBounds(bounds.pad(0.2));
    }
  }, [shuttles, mapReady]);

  const toggleFullscreen = () => {
    if (!outerRef.current) return;
    if (!document.fullscreenElement) {
      outerRef.current.requestFullscreen();
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      setFullscreen(false);
    }
  };

  const recenterMap = () => {
    const map = mapRef.current;
    if (!map) return;
    if (shuttlePosition) {
      map.flyTo(L.latLng(shuttlePosition[0], shuttlePosition[1]), Math.max(map.getZoom(), 15));
    } else if (routeLayerRef.current) {
      map.fitBounds(routeLayerRef.current.getBounds().pad(0.12));
    }
  };

  const tileCycle = useMemo(() => {
    const idx = TILE_KEYS.indexOf(tileMode);
    const next = TILE_KEYS[(idx + 1) % TILE_KEYS.length];
    return () => setTileMode(next);
  }, [tileMode]);

  const actualHeight = fullscreen ? '100vh' : height;

  return (
    <div ref={outerRef} className="relative z-0 isolate overflow-hidden rounded-2xl border border-border/80 bg-card shadow-md" style={{ height: actualHeight }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {showControls && (
        <div className="absolute top-3.5 right-3.5 flex flex-col gap-2 z-[400]">
          <Button
            variant="outline"
            size="icon-sm"
            className="bg-card/90 backdrop-blur-md shadow-md border-border/80 hover:bg-card"
            onClick={recenterMap}
            title="Recenter Shuttle"
          >
            <Crosshair className="w-4 h-4 text-primary" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            className="bg-card/90 backdrop-blur-md shadow-md border-border/80 hover:bg-card"
            onClick={tileCycle}
            title={`Map: ${TILE_CONFIGS[tileMode].label}`}
          >
            <Layers className="w-4 h-4 text-foreground" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            className="bg-card/90 backdrop-blur-md shadow-md border-border/80 hover:bg-card"
            onClick={toggleFullscreen}
            title="Toggle fullscreen"
          >
            {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
        </div>
      )}
      {!mapReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-card/80 backdrop-blur-sm z-[500]">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-semibold text-muted-foreground font-mono">Initializing GIS Engine...</span>
          </div>
        </div>
      )}
    </div>
  );
}
