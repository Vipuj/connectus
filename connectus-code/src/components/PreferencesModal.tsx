import { useEffect, useState } from 'react';
import { MapPin, SlidersHorizontal, X } from 'lucide-react';
import type { Area, College, EventType, StudentProfile } from '../types';
import { CollegeLocationMap } from './CollegeLocationMap';
import { PlaceSearchInput } from './PlaceSearchInput';

interface PreferencesModalProps {
  open: boolean;
  onClose: () => void;
  student: StudentProfile;
  areas: Area[];
  colleges: College[];
  mapsEnabled: boolean;
  onSavePreferences: (updates: Partial<StudentProfile>) => Promise<void>;
}

const EVENT_TYPES: EventType[] = [
  'Hackathon',
  'Workshop',
  'Talk',
  'Cultural',
  'Competition',
  'Meetup',
];

export function PreferencesModal({
  open,
  onClose,
  student,
  areas,
  colleges,
  mapsEnabled,
  onSavePreferences,
}: PreferencesModalProps) {
  const [areaId, setAreaId] = useState(student.areaId);
  const [locationLabel, setLocationLabel] = useState(student.locationLabel || '');
  const [locationLat, setLocationLat] = useState<number>(
    student.locationLat ?? areas[0]?.lat ?? 17.4401
  );
  const [locationLng, setLocationLng] = useState<number>(
    student.locationLng ?? areas[0]?.lng ?? 78.3489
  );
  const [radiusKm, setRadiusKm] = useState<5 | 10 | 20 | 50>(student.radiusKm || 10);
  const [interests, setInterests] = useState<EventType[]>(student.interests);
  const [followedCollegeIds, setFollowedCollegeIds] = useState<string[]>(
    student.followedCollegeIds
  );
  const [collegeSearch, setCollegeSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<'All' | 'Tier 1' | 'Tier 2' | 'Tier 3'>('All');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      const area = areas.find((a) => a.id === student.areaId) || areas[0];
      setAreaId(student.areaId);
      setLocationLabel(student.locationLabel || area?.name || 'India');
      setLocationLat(student.locationLat ?? area?.lat ?? 17.4401);
      setLocationLng(student.locationLng ?? area?.lng ?? 78.3489);
      setRadiusKm(student.radiusKm || 10);
      setInterests(student.interests);
      setFollowedCollegeIds(student.followedCollegeIds);
    }
  }, [open, student, areas]);

  if (!open) return null;

  function toggleInterest(type: EventType) {
    setInterests((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }

  function toggleFollow(id: string) {
    setFollowedCollegeIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  const filteredColleges = colleges.filter((col) => {
    if (tierFilter !== 'All' && col.tier !== tierFilter) return false;
    const q = collegeSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      col.name.toLowerCase().includes(q) ||
      col.shortName.toLowerCase().includes(q) ||
      col.emailDomain.toLowerCase().includes(q)
    );
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSavePreferences({
        areaId,
        locationLabel: locationLabel.trim() || 'India',
        locationLat,
        locationLng,
        radiusKm,
        interests,
        followedCollegeIds,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 paper-scrim flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Discovery Preferences & Alerts"
    >
      <div className="paper-modal w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border-warm)] bg-[var(--paper-raised)] flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <SlidersHorizontal className="w-5 h-5 text-[var(--crimson)] shrink-0" />
            <div>
              <h2 className="font-display text-xl font-extrabold tracking-[-0.03em] text-[var(--ink)]">
                Discovery Preferences
              </h2>
              <p className="text-xs text-[var(--ink-2)]">
                Set your Google Maps search location, travel radius, event interests, and followed colleges.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preferences"
            className="paper-btn-secondary min-w-[40px] min-h-[40px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Precise Google Maps Location & Radius */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              <div className="space-y-2">
                <PlaceSearchInput
                  label="Search Location (Any City or Campus in India)"
                  placeholder="Search Bengaluru, Delhi, Pune, Gachibowli..."
                  initialValue={locationLabel}
                  mapsEnabled={mapsEnabled}
                  onSelect={(place) => {
                    setLocationLabel(place.name);
                    setLocationLat(place.lat);
                    setLocationLng(place.lng);
                  }}
                />
                <div className="flex items-center gap-1.5 text-[11px] text-[var(--ink-2)]">
                  <MapPin className="w-3.5 h-3.5 text-[var(--crimson)] shrink-0" />
                  <span className="truncate">
                    Pinned: <strong className="text-[var(--ink)]">{locationLabel}</strong>{' '}
                    <span className="font-mono tabular-nums">
                      ({locationLat.toFixed(3)}, {locationLng.toFixed(3)})
                    </span>
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <label className="block space-y-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-2)]">
                    Quick Campus Hub Preset
                  </span>
                  <select
                    value={areaId}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      setAreaId(nextId);
                      const matched = areas.find((a) => a.id === nextId);
                      if (matched) {
                        setLocationLabel(matched.name);
                        setLocationLat(matched.lat);
                        setLocationLng(matched.lng);
                      }
                    }}
                    className="paper-input w-full min-h-[42px] px-3 py-2 text-sm"
                  >
                    {areas.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="space-y-1.5">
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-2)]">
                    Travel Radius
                  </span>
                  <div className="paper-segment w-full grid grid-cols-4">
                    {([5, 10, 20, 50] as const).map((km) => (
                      <button
                        key={km}
                        type="button"
                        aria-pressed={radiusKm === km}
                        onClick={() => setRadiusKm(km)}
                        className="paper-segment-btn min-h-[34px] text-xs font-mono tabular-nums"
                      >
                        {km} km
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <CollegeLocationMap
              mapsEnabled={mapsEnabled}
              center={{ lat: locationLat, lng: locationLng }}
              zoom={12}
              className="w-full h-[200px]"
              fallbackLabel={locationLabel}
              markers={[
                {
                  id: 'student-origin',
                  lat: locationLat,
                  lng: locationLng,
                  title: locationLabel || 'Discovery Origin',
                  subtitle: `Filtering events within ${radiusKm} km`,
                  highlighted: true,
                },
              ]}
            />
          </div>

          {/* Event Interests */}
          <div className="space-y-2.5 pt-4 border-t border-[var(--border-warm)]">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-2)]">
              Event Interests
            </span>
            <div className="flex flex-wrap gap-2">
              {EVENT_TYPES.map((t) => {
                const active = interests.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleInterest(t)}
                    className={`min-h-[38px] px-3.5 py-1.5 text-xs whitespace-nowrap ${
                      active ? 'paper-btn-ink' : 'paper-btn-secondary'
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Followed Colleges */}
          <div className="space-y-2.5 pt-4 border-t border-[var(--border-warm)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-2)]">
                Followed Colleges ({followedCollegeIds.length} for instant alerts)
              </span>
              <div className="paper-segment self-start sm:self-auto">
                {(['All', 'Tier 1', 'Tier 2', 'Tier 3'] as const).map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    aria-pressed={tierFilter === tier}
                    onClick={() => setTierFilter(tier)}
                    className="paper-segment-btn px-2.5 py-1 text-[11px] whitespace-nowrap"
                  >
                    {tier}
                  </button>
                ))}
              </div>
            </div>

            <input
              type="search"
              value={collegeSearch}
              onChange={(e) => setCollegeSearch(e.target.value)}
              placeholder="Search colleges (e.g. MRDU, CBIT, IIIT-H, Osmania)..."
              className="paper-input w-full min-h-[38px] px-3 py-1.5 text-xs"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1">
              {filteredColleges.map((col) => {
                const followed = followedCollegeIds.includes(col.id);
                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => toggleFollow(col.id)}
                    className={`min-h-[44px] px-3 py-2 text-left text-xs border flex items-center justify-between gap-2 transition-colors ${
                      followed
                        ? 'bg-[var(--feel-tint)] border-[var(--border-ink)] text-[var(--ink)] font-semibold shadow-[2px_2px_0_var(--feel-shadow)]'
                        : 'bg-[var(--paper-input)] border-[var(--border-warm)] text-[var(--ink-2)] hover:border-[var(--border-ink)]'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="truncate text-[var(--ink)]">{col.name}</div>
                      <div className="text-[11px] text-[var(--ink-2)]">
                        {col.tier} · {col.shortName}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 font-mono text-[11px] font-semibold ${
                        followed ? 'text-[var(--crimson)]' : 'text-[var(--ink-2)]'
                      }`}
                    >
                      {followed ? 'Following' : 'Follow'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border-warm)]">
            <button
              type="button"
              onClick={onClose}
              className="paper-btn-secondary min-h-[42px] px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="paper-btn-primary min-h-[42px] px-5 py-2 text-sm"
            >
              {saving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
