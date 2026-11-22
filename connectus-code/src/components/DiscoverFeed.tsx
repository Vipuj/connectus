import { useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  Bell,
  Film,
  LayoutGrid,
  MapPin,
  PlusCircle,
  Search,
} from 'lucide-react';
import type { Area, College, EventType, FeedEvent, StudentProfile } from '../types';
import { formatFee, formatIstDate } from '../utils/format';
import { CollegeLocationMap } from './CollegeLocationMap';
import { EventPosterCard } from './EventPosterCard';
import { ReelsViewer } from './ReelsViewer';

interface DiscoverFeedProps {
  events: FeedEvent[];
  loading: boolean;
  student: StudentProfile;
  areas: Area[];
  colleges: College[];
  mapsEnabled: boolean;
  typeFilter: string;
  searchQuery: string;
  onlyFollowed: boolean;
  showAllIndia: boolean;
  onChangeType: (type: string) => void;
  onChangeSearch: (q: string) => void;
  onToggleOnlyFollowed: () => void;
  onToggleShowAllIndia: () => void;
  onOpenPreferences: () => void;
  onOpenSkills?: () => void;
  onOpenTelegram: () => void;
  onOpenSuggest: () => void;
  onSelectEvent: (event: FeedEvent) => void;
  onToggleSave: (eventId: string) => Promise<void>;
}

const FILTER_TYPES: ('All' | EventType)[] = [
  'All',
  'Hackathon',
  'Workshop',
  'Talk',
  'Cultural',
  'Competition',
  'Meetup',
];

export function DiscoverFeed({
  events,
  loading,
  student,
  areas,
  colleges,
  mapsEnabled,
  typeFilter,
  searchQuery,
  onlyFollowed,
  showAllIndia,
  onChangeType,
  onChangeSearch,
  onToggleOnlyFollowed,
  onToggleShowAllIndia,
  onOpenPreferences,
  onOpenTelegram,
  onOpenSuggest,
  onSelectEvent,
  onToggleSave,
}: DiscoverFeedProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'reels' | 'map'>('grid');
  const [focusedReelId, setFocusedReelId] = useState<string | null>(null);
  const reelCount = events.filter((e) => Boolean(e.promoVideoUrl)).length;

  const activeArea = areas.find((a) => a.id === student.areaId);
  const locationText = student.locationLabel || activeArea?.name || 'India';

  const urgentSkillMatch = events.find(
    (e) =>
      !e.myRegistrationStatus &&
      e.isFillingFast &&
      ((e.matchedSkills && e.matchedSkills.length > 0) ||
        (e.matchedGoals && e.matchedGoals.length > 0))
  );

  const mapCenter =
    typeof student.locationLat === 'number' && typeof student.locationLng === 'number'
      ? { lat: student.locationLat, lng: student.locationLng }
      : activeArea
        ? { lat: activeArea.lat, lng: activeArea.lng }
        : { lat: 20.5937, lng: 78.9629 };

  return (
    <div className="space-y-4">
      <section className="pb-3.5 border-b border-[var(--border-warm)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-[-0.04em] leading-tight text-[var(--ink)]">
          Campus Events
        </h1>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onOpenTelegram}
            className={`min-h-[40px] px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.06em] inline-flex items-center gap-2 whitespace-nowrap ${
              student.telegramConnected
                ? 'paper-btn-tint'
                : 'paper-btn-secondary'
            }`}
          >
            <Bell className="w-4 h-4 shrink-0" />
            <span>{student.telegramConnected ? 'Telegram Alerts On' : 'Telegram Alerts'}</span>
          </button>

          <button
            type="button"
            onClick={onOpenSuggest}
            className="paper-btn-secondary min-h-[40px] px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.06em] inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <PlusCircle className="w-4 h-4 text-[var(--crimson)] shrink-0" />
            <span>Suggest Event</span>
          </button>
        </div>
      </section>

      <section aria-label="Event filters" className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[var(--ink-2)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onChangeSearch(e.target.value)}
              placeholder="Search events, colleges (e.g. MRDU, IIT, CBIT), or city..."
              aria-label="Search events"
              className="paper-input w-full min-h-[42px] pl-10 pr-3.5 py-2 text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onToggleOnlyFollowed}
              className={`min-h-[40px] px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.06em] whitespace-nowrap shrink-0 ${
                onlyFollowed ? 'paper-btn-ink' : 'paper-btn-secondary'
              }`}
            >
              Followed Only
            </button>

            <div className="paper-segment">
              <button
                type="button"
                aria-pressed={!showAllIndia}
                onClick={() => {
                  if (showAllIndia) onToggleShowAllIndia();
                }}
                className="paper-segment-btn min-h-[32px] px-3 py-1 text-xs uppercase tracking-[0.05em] whitespace-nowrap"
              >
                Near Me ({student.radiusKm} km)
              </button>
              <button
                type="button"
                aria-pressed={showAllIndia}
                onClick={() => {
                  if (!showAllIndia) onToggleShowAllIndia();
                }}
                className="paper-segment-btn min-h-[32px] px-3 py-1 text-xs uppercase tracking-[0.05em] whitespace-nowrap"
              >
                All India
              </button>
            </div>

            <div className="paper-segment">
              <button
                type="button"
                aria-pressed={viewMode === 'grid'}
                onClick={() => setViewMode('grid')}
                className="paper-segment-btn min-h-[32px] px-2.5 py-1 text-xs uppercase tracking-[0.05em] inline-flex items-center gap-1 whitespace-nowrap"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Grid</span>
              </button>
              <button
                type="button"
                aria-pressed={viewMode === 'reels'}
                onClick={() => setViewMode('reels')}
                className="paper-segment-btn min-h-[32px] px-2.5 py-1 text-xs uppercase tracking-[0.05em] inline-flex items-center gap-1 whitespace-nowrap"
              >
                <Film className="w-3.5 h-3.5" />
                <span>Reels{reelCount > 0 ? ` (${reelCount})` : ''}</span>
              </button>
              <button
                type="button"
                aria-pressed={viewMode === 'map'}
                onClick={() => setViewMode('map')}
                className="paper-segment-btn min-h-[32px] px-2.5 py-1 text-xs uppercase tracking-[0.05em] inline-flex items-center gap-1 whitespace-nowrap"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Map</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="paper-segment overflow-x-auto max-w-full">
            {FILTER_TYPES.map((type) => {
              const active = typeFilter === type;
              return (
                <button
                  key={type}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onChangeType(type)}
                  className="paper-segment-btn min-h-[32px] px-3 py-1 text-xs uppercase tracking-[0.05em] whitespace-nowrap shrink-0"
                >
                  {type}
                </button>
              );
            })}
          </div>

          <div className="text-[11px] font-semibold uppercase tracking-[0.10em] text-[var(--ink-2)] tabular-nums shrink-0">
            {loading
              ? 'Updating feed...'
              : `${events.length} upcoming ${events.length === 1 ? 'event' : 'events'}`}
          </div>
        </div>
      </section>

      {urgentSkillMatch && !loading && (
        <div className="paper-card-soft border border-[var(--crimson)]/35 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-start sm:items-center gap-2 text-xs min-w-0">
            <AlertTriangle className="w-4 h-4 text-[var(--crimson)] shrink-0 mt-0.5 sm:mt-0" />
            <div className="min-w-0">
              <span className="font-bold text-[var(--crimson)] uppercase tracking-[0.06em] mr-2">
                Priority Alert
              </span>
              <span className="font-semibold text-[var(--ink)]">
                {urgentSkillMatch.title}
              </span>
              <span className="text-[var(--ink-2)]">
                {' '}· Matches{' '}
                {(urgentSkillMatch.matchedSkills?.[0] ||
                  urgentSkillMatch.matchedGoals?.[0] ||
                  'your skills')}{' '}
                · {Math.max(0, urgentSkillMatch.capacity - urgentSkillMatch.confirmedCount)} seats left
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onSelectEvent(urgentSkillMatch)}
            className="paper-btn-crimson min-h-[34px] px-3.5 py-1 text-xs whitespace-nowrap shrink-0"
          >
            Open &amp; Grab Seat
          </button>
        </div>
      )}

      <motion.div
        key={`${viewMode}-${typeFilter}-${loading ? 'loading' : 'ready'}`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      >
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((idx) => (
            <div key={idx} className="paper-card overflow-hidden animate-pulse">
              <div className="aspect-[3/4] bg-[var(--feel-tint)]/45 border-b border-[var(--border-warm)]" />
              <div className="p-5 space-y-3">
                <div className="h-3 w-1/2 bg-[var(--feel-tint)]/70" />
                <div className="h-5 w-4/5 bg-[var(--feel-tint)]/70" />
                <div className="h-3 w-2/3 bg-[var(--feel-tint)]/70" />
              </div>
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="paper-card py-16 px-6 text-center space-y-3">
          <h2 className="text-xl font-extrabold tracking-[-0.03em] text-[var(--ink)]">
            No matching events inside {student.radiusKm} km
          </h2>
          <p className="text-[15px] font-light text-[var(--ink-2)] max-w-md mx-auto">
            Try switching to All India, updating your Google Maps search pin, or adjusting your followed colleges.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            {!showAllIndia && (
              <button
                type="button"
                onClick={onToggleShowAllIndia}
                className="paper-btn-primary min-h-[40px] px-4 py-2 text-xs uppercase tracking-[0.06em]"
              >
                Show All India
              </button>
            )}
            <button
              type="button"
              onClick={onOpenPreferences}
              className="paper-btn-secondary min-h-[40px] px-4 py-2 text-xs uppercase tracking-[0.06em]"
            >
              Edit Preferences
            </button>
          </div>
        </div>
      ) : viewMode === 'reels' ? (
        <ReelsViewer
          events={events}
          initialEventId={focusedReelId}
          onSelectEvent={onSelectEvent}
          onToggleSave={onToggleSave}
          onSwitchToGrid={() => setViewMode('grid')}
        />
      ) : viewMode === 'map' ? (
        <section className="space-y-3">
          <CollegeLocationMap
            mapsEnabled={mapsEnabled}
            center={mapCenter}
            zoom={11}
            className="w-full h-[480px]"
            fallbackLabel={`${events.length} campus events near ${locationText}`}
            markers={events.map((evt) => ({
              id: evt.id,
              lat: evt.lat,
              lng: evt.lng,
              title: evt.title,
              subtitle: `${evt.collegeShortName} · ${evt.venueName} · ${formatIstDate(evt.startAt)}`,
              badgeText: `${evt.type} · ${formatFee(evt.feeInr)}`,
              highlighted: student.followedCollegeIds.includes(evt.collegeId),
              actionLabel: 'Open Poster & Register',
              onAction: () => onSelectEvent(evt),
            }))}
          />
          <p className="text-xs font-medium text-[var(--ink-2)]">
            Crimson pins mark followed colleges. Click any campus marker for event details and directions.
          </p>
        </section>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {events.map((event, idx) => (
            <EventPosterCard
              key={event.id}
              event={event}
              index={idx}
              onSelect={onSelectEvent}
              onWatchReel={(eventId) => {
                setFocusedReelId(eventId);
                setViewMode('reels');
              }}
              onToggleSave={onToggleSave}
            />
          ))}
        </div>
      )}
      </motion.div>
    </div>
  );
}
