import { useEffect, useRef, useState } from 'react';
import { ExternalLink, MapPin } from 'lucide-react';
import {
  AdvancedMarker,
  APILoadingStatus,
  InfoWindow,
  Map as GoogleMap,
  Pin,
  useAdvancedMarkerRef,
  useApiLoadingStatus,
  useMap,
} from '@vis.gl/react-google-maps';

export interface MapLocationMarker {
  id: string;
  lat: number;
  lng: number;
  title: string;
  subtitle?: string;
  badgeText?: string;
  highlighted?: boolean;
  onAction?: () => void;
  actionLabel?: string;
}

interface CollegeLocationMapProps {
  mapsEnabled: boolean;
  markers: MapLocationMarker[];
  center?: { lat: number; lng: number };
  zoom?: number;
  className?: string;
  fallbackLabel?: string;
  directionsQuery?: string;
}

export function buildGoogleMapsUrl(lat: number, lng: number, label?: string): string {
  const q = label ? `${label} (${lat.toFixed(5)},${lng.toFixed(5)})` : `${lat},${lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

function MapCameraSync({
  center,
  zoom,
}: {
  center: { lat: number; lng: number };
  zoom: number;
}) {
  const map = useMap();
  const prevRef = useRef<{ lat: number; lng: number; zoom: number } | null>(null);

  useEffect(() => {
    if (!map) return;
    const prev = prevRef.current;
    if (!prev) {
      prevRef.current = { lat: center.lat, lng: center.lng, zoom };
      return;
    }
    const moved =
      Math.abs(prev.lat - center.lat) > 0.0001 ||
      Math.abs(prev.lng - center.lng) > 0.0001;
    const zoomed = prev.zoom !== zoom;

    if (moved) {
      map.panTo(center);
    }
    if (zoomed) {
      map.setZoom(zoom);
    }
    if (moved || zoomed) {
      prevRef.current = { lat: center.lat, lng: center.lng, zoom };
    }
  }, [map, center, zoom]);

  return null;
}

export function CollegeLocationMap({
  mapsEnabled,
  markers,
  center,
  zoom = 13,
  className = 'w-full h-[300px]',
  fallbackLabel,
  directionsQuery,
}: CollegeLocationMapProps) {
  const loadingStatus = useApiLoadingStatus();
  const [activeMarkerId, setActiveMarkerId] = useState<string | null>(
    markers.length === 1 ? markers[0].id : null
  );

  useEffect(() => {
    if (loadingStatus === APILoadingStatus.AUTH_FAILURE) {
      window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
    }
  }, [loadingStatus]);

  useEffect(() => {
    if (activeMarkerId && !markers.some((m) => m.id === activeMarkerId)) {
      setActiveMarkerId(markers.length === 1 ? markers[0].id : null);
    }
  }, [markers, activeMarkerId]);

  const primary = markers[0];
  const resolvedCenter =
    center ||
    (primary
      ? { lat: primary.lat, lng: primary.lng }
      : { lat: 20.5937, lng: 78.9629 });

  const apiUnavailable =
    !mapsEnabled ||
    loadingStatus === APILoadingStatus.FAILED ||
    loadingStatus === APILoadingStatus.AUTH_FAILURE;

  if (apiUnavailable) {
    const targetLat = resolvedCenter.lat;
    const targetLng = resolvedCenter.lng;
    const extUrl = buildGoogleMapsUrl(
      targetLat,
      targetLng,
      directionsQuery || fallbackLabel || primary?.title
    );

    return (
      <div
        className={`${className} rounded-[var(--radius-card)] border border-[var(--ink)] bg-[var(--paper-raised)] flex flex-col items-center justify-center p-5 text-center gap-2.5`}
      >
        <MapPin className="w-6 h-6 text-[var(--crimson)]" />
        <div className="space-y-0.5 max-w-sm">
          <div className="text-xs font-bold text-[var(--ink)]">
            {fallbackLabel || primary?.title || 'Campus Location Coordinates'}
          </div>
          <div className="text-[11px] font-mono text-[var(--ink-2)] tabular-nums">
            {targetLat.toFixed(4)}° N, {targetLng.toFixed(4)}° E
          </div>
        </div>
        <a
          href={extUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--crimson)] hover:text-[var(--ink)] underline underline-offset-4"
        >
          <span>Open in Google Maps</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    );
  }

  const isLoadingApi =
    loadingStatus === APILoadingStatus.NOT_LOADED ||
    loadingStatus === APILoadingStatus.LOADING;

  return (
    <div
      className={`${className} rounded-[var(--radius-card)] overflow-hidden border border-[var(--ink)] bg-[var(--paper-raised)] relative`}
    >
      {isLoadingApi && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--paper-raised)]/90 text-xs font-medium text-[var(--ink-2)] pointer-events-none">
          Loading interactive Google Map...
        </div>
      )}
      <GoogleMap
        mapId="DEMO_MAP_ID"
        defaultCenter={resolvedCenter}
        defaultZoom={zoom}
        gestureHandling="cooperative"
        disableDefaultUI={false}
        mapTypeControl={false}
        streetViewControl={false}
        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        className="w-full h-full"
      >
        <MapCameraSync center={resolvedCenter} zoom={zoom} />
        {markers.map((item) => (
          <MarkerWithInfo
            key={item.id}
            item={item}
            isOpen={activeMarkerId === item.id}
            onOpen={() => setActiveMarkerId(item.id)}
            onClose={() => setActiveMarkerId(null)}
          />
        ))}
      </GoogleMap>
    </div>
  );
}

interface MarkerWithInfoProps {
  item: MapLocationMarker;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

function MarkerWithInfo({ item, isOpen, onOpen, onClose }: MarkerWithInfoProps) {
  const [markerRef, marker] = useAdvancedMarkerRef();

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={{ lat: item.lat, lng: item.lng }}
        title={item.title}
        onClick={onOpen}
      >
        <Pin
          background={item.highlighted ? '#9f3045' : '#251911'}
          borderColor={item.highlighted ? '#531d2a' : '#5b4c43'}
          glyphColor="#fef9ef"
          scale={item.highlighted ? 1.15 : 1}
        />
      </AdvancedMarker>

      {isOpen && marker && (
        <InfoWindow
          anchor={marker}
          maxWidth={260}
          onClose={onClose}
          onCloseClick={onClose}
        >
          <div className="p-1 space-y-1.5 text-[var(--ink)]">
            {item.badgeText && (
              <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--crimson)]">
                {item.badgeText}
              </div>
            )}
            <div className="text-xs font-bold leading-snug">{item.title}</div>
            {item.subtitle && (
              <div className="text-[11px] text-[var(--ink-2)] leading-snug">{item.subtitle}</div>
            )}
            <div className="pt-1 flex items-center gap-3">
              {item.onAction && (
                <button
                  type="button"
                  onClick={item.onAction}
                  className="text-[11px] font-semibold text-[var(--crimson)] hover:underline"
                >
                  {item.actionLabel || 'View Event'}
                </button>
              )}
              <a
                href={buildGoogleMapsUrl(item.lat, item.lng, item.title)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-medium text-[var(--ink-2)] hover:text-[var(--ink)] inline-flex items-center gap-1"
              >
                <span>Directions</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
}
