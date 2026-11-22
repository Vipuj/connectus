import { useEffect, useRef, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';

export interface UseAutocompleteSuggestionsReturn {
  suggestions: google.maps.places.AutocompleteSuggestion[];
  isLoading: boolean;
  placesReady: boolean;
  error: string | null;
  resetSession: () => void;
}

const DEFAULT_REGION_CODES = ['in'];

function isQuotaError(err: unknown): boolean {
  const raw = err instanceof Error ? err.message : String(err || '');
  const upper = raw.toUpperCase();
  return (
    upper.includes('RESOURCE_EXHAUSTED') ||
    upper.includes('OVER_QUERY_LIMIT') ||
    upper.includes('429') ||
    upper.includes('QUOTA')
  );
}

export function useAutocompleteSuggestions(
  inputString: string,
  enabled = true,
  includedRegionCodes: string[] = DEFAULT_REGION_CODES
): UseAutocompleteSuggestionsReturn {
  const placesLib = useMapsLibrary('places');
  const sessionTokenRef =
    useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const [suggestions, setSuggestions] = useState<
    google.maps.places.AutocompleteSuggestion[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const regionKey = includedRegionCodes.join(',');

  useEffect(() => {
    if (!enabled || !placesLib) return;

    const trimmed = inputString.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    const { AutocompleteSessionToken, AutocompleteSuggestion } = placesLib;
    if (!sessionTokenRef.current) {
      sessionTokenRef.current = new AutocompleteSessionToken();
    }

    let cancelled = false;
    const regions = regionKey ? regionKey.split(',').filter(Boolean) : [];
    const timer = window.setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: trimmed,
          sessionToken: sessionTokenRef.current || undefined,
          ...(regions.length > 0 ? { includedRegionCodes: regions } : {}),
        });
        if (!cancelled) {
          setSuggestions(res?.suggestions || []);
        }
      } catch (err) {
        if (!cancelled) {
          setSuggestions([]);
          if (isQuotaError(err)) {
            window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
            setError('Location search quota reached. Try again later or enter details manually.');
          } else {
            setError('Could not fetch place suggestions.');
          }
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [placesLib, inputString, enabled, regionKey]);

  return {
    suggestions,
    isLoading,
    placesReady: Boolean(placesLib),
    error,
    resetSession: () => {
      sessionTokenRef.current = null;
      setSuggestions([]);
      setError(null);
    },
  };
}
