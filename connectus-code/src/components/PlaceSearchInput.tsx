import { useEffect, useRef, useState } from 'react';
import { Loader2, MapPin, Search } from 'lucide-react';
import {
  APILoadingStatus,
  useApiLoadingStatus,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import { useAutocompleteSuggestions } from '../hooks/useAutocompleteSuggestions';

export interface SelectedPlaceResult {
  placeId: string;
  name: string;
  formattedAddress: string;
  lat: number;
  lng: number;
}

interface PlaceSearchInputProps {
  label?: string;
  placeholder?: string;
  initialValue?: string;
  mapsEnabled: boolean;
  onSelect: (place: SelectedPlaceResult) => void;
  helperText?: string;
}

export function PlaceSearchInput({
  label,
  placeholder = 'Search any college, campus, or city in India...',
  initialValue = '',
  mapsEnabled,
  onSelect,
  helperText,
}: PlaceSearchInputProps) {
  const [query, setQuery] = useState(initialValue);
  const [fetchingDetails, setFetchingDetails] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuery(initialValue);
    }
  }, [initialValue, open]);

  if (!mapsEnabled) {
    return (
      <div className="space-y-1.5">
        {label && (
          <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-2)]">
            {label}
          </span>
        )}
        <div className="px-3 py-2.5 border border-[var(--border-warm)] bg-[var(--paper-raised)] text-xs text-[var(--ink-2)]">
          Google Maps location search initializes when an API key is active. Use manual entry or presets below.
        </div>
      </div>
    );
  }

  return (
    <PlaceSearchInner
      label={label}
      placeholder={placeholder}
      query={query}
      setQuery={setQuery}
      fetchingDetails={fetchingDetails}
      setFetchingDetails={setFetchingDetails}
      detailError={detailError}
      setDetailError={setDetailError}
      open={open}
      setOpen={setOpen}
      onSelect={onSelect}
      helperText={helperText}
    />
  );
}

interface PlaceSearchInnerProps {
  label?: string;
  placeholder: string;
  query: string;
  setQuery: (v: string) => void;
  fetchingDetails: boolean;
  setFetchingDetails: (v: boolean) => void;
  detailError: string | null;
  setDetailError: (v: string | null) => void;
  open: boolean;
  setOpen: (v: boolean) => void;
  onSelect: (place: SelectedPlaceResult) => void;
  helperText?: string;
}

function PlaceSearchInner({
  label,
  placeholder,
  query,
  setQuery,
  fetchingDetails,
  setFetchingDetails,
  detailError,
  setDetailError,
  open,
  setOpen,
  onSelect,
  helperText,
}: PlaceSearchInnerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const loadingStatus = useApiLoadingStatus();
  const placesLib = useMapsLibrary('places');
  const { suggestions, isLoading, placesReady, error, resetSession } =
    useAutocompleteSuggestions(query, open);

  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [setOpen]);

  const mapsFailed =
    loadingStatus === APILoadingStatus.FAILED ||
    loadingStatus === APILoadingStatus.AUTH_FAILURE;

  async function handleSelectSuggestion(
    suggestion: google.maps.places.AutocompleteSuggestion
  ) {
    if (!placesLib || !suggestion.placePrediction) return;
    setFetchingDetails(true);
    setDetailError(null);
    try {
      const place = suggestion.placePrediction.toPlace();
      await place.fetchFields({
        fields: ['id', 'displayName', 'formattedAddress', 'location'],
      });
      const loc = place.location;
      if (!loc) {
        setDetailError('Selected place has no map coordinates.');
        return;
      }
      const name =
        place.displayName ||
        suggestion.placePrediction.mainText?.text ||
        suggestion.placePrediction.text.text;
      const formattedAddress =
        place.formattedAddress || suggestion.placePrediction.text.text;
      const lat = typeof loc.lat === 'function' ? loc.lat() : Number(loc.lat);
      const lng = typeof loc.lng === 'function' ? loc.lng() : Number(loc.lng);

      setQuery(name);
      setOpen(false);
      resetSession();
      onSelect({
        placeId: place.id || '',
        name,
        formattedAddress,
        lat,
        lng,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err || '');
      if (
        msg.toUpperCase().includes('RESOURCE_EXHAUSTED') ||
        msg.toUpperCase().includes('QUOTA') ||
        msg.includes('429')
      ) {
        window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
      }
      setDetailError('Could not load coordinates for that place.');
    } finally {
      setFetchingDetails(false);
    }
  }

  return (
    <div ref={containerRef} className="space-y-1.5 relative">
      {label && (
        <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-2)]">
          {label}
        </span>
      )}
      <div className="relative">
        <Search className="w-4 h-4 text-[var(--ink-2)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setDetailError(null);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setOpen(false);
            }
          }}
          placeholder={
            mapsFailed
              ? 'Location search unavailable — enter manually below'
              : placesReady
                ? placeholder
                : 'Loading Google Maps Places...'
          }
          className="paper-input w-full min-h-[42px] pl-9 pr-9 py-2 text-sm"
        />
        {(isLoading || fetchingDetails) && (
          <Loader2 className="w-4 h-4 text-[var(--crimson)] animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
        )}
      </div>

      {helperText && <p className="text-[11px] text-[var(--ink-2)]">{helperText}</p>}

      {(error || detailError) && (
        <p className="text-xs text-[var(--amber-ink)] bg-[var(--amber-tint)] border border-[var(--amber-border)] px-2.5 py-1.5">
          {detailError || error}
        </p>
      )}

      {open && suggestions.length > 0 && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 z-30 mt-1 max-h-56 overflow-y-auto bg-[var(--paper-input)] border border-[var(--ink)] shadow-[6px_6px_0_var(--feel-shadow)] divide-y divide-[var(--border-warm)]"
        >
          {suggestions.map((s, idx) => {
            const pred = s.placePrediction;
            if (!pred) return null;
            const mainText = pred.mainText?.text || pred.text.text;
            const secondary = pred.secondaryText?.text || '';
            return (
              <li key={pred.placeId || idx}>
                <button
                  type="button"
                  onClick={() => handleSelectSuggestion(s)}
                  className="w-full px-3.5 py-2.5 text-left hover:bg-[var(--feel-tint)] flex items-start gap-2.5 transition-colors"
                >
                  <MapPin className="w-4 h-4 text-[var(--crimson)] shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[var(--ink)] truncate">
                      {mainText}
                    </div>
                    {secondary && (
                      <div className="text-[11px] text-[var(--ink-2)] truncate">{secondary}</div>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
