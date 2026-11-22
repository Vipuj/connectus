import { motion } from 'motion/react';
import { Bookmark, BookmarkCheck, Play } from 'lucide-react';
import type { FeedEvent } from '../types';
import { formatFee, formatIstDate, formatIstTime } from '../utils/format';
import { PosterImage } from './PosterImage';

interface EventPosterCardProps {
  event: FeedEvent;
  index?: number;
  onSelect: (event: FeedEvent) => void;
  onWatchReel?: (eventId: string) => void;
  onToggleSave?: (eventId: string) => Promise<void>;
}

export function EventPosterCard({
  event,
  index = 0,
  onSelect,
  onWatchReel,
  onToggleSave,
}: EventPosterCardProps) {
  const seatsLeft = Math.max(0, event.capacity - event.confirmedCount);

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.24,
        delay: Math.min(index * 0.03, 0.21),
        ease: [0.16, 1, 0.3, 1],
      }}
      onClick={() => onSelect(event)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(event);
        }
      }}
      className="group paper-card-interactive overflow-hidden cursor-pointer flex flex-col h-full"
    >
      {/* Standardized 3:4 poster stage with guaranteed warm-paper outer margin */}
      <div className="relative aspect-[3/4] w-full bg-[var(--paper-raised)] p-4 border-b border-[var(--ink)] flex items-center justify-center overflow-hidden">
        <PosterImage
          src={event.posterUrl}
          alt={`Event poster for ${event.title}`}
          title={event.title}
          className="max-w-full max-h-full w-auto h-auto object-contain rounded-[6px] border border-[var(--border-warm)] bg-[var(--paper)] shadow-[0_2px_10px_rgba(38,24,18,0.06)] group-hover:scale-[1.02] transition-transform duration-200"
        />

        {event.additionalPosterUrls && event.additionalPosterUrls.length > 0 && (
          <div className="absolute top-2.5 left-2.5 px-2 py-1 bg-[var(--ink)]/90 border border-[var(--on-ink)]/25 text-[var(--on-ink)] font-mono text-[10px] font-semibold uppercase tracking-[0.06em]">
            {1 + event.additionalPosterUrls.length} Posters
          </div>
        )}

        {event.promoVideoUrl && onWatchReel && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onWatchReel(event.id);
            }}
            className="paper-btn-ink absolute top-2.5 right-2.5 px-2.5 py-1.5 text-[11px] uppercase tracking-[0.06em] inline-flex items-center gap-1.5"
          >
            <Play className="w-3 h-3 fill-current text-[var(--rose)]" />
            <span>Watch Reel</span>
          </button>
        )}

        {event.myRegistrationStatus && (
          <div className="absolute bottom-2.5 left-2.5 right-2.5 px-3 py-1.5 bg-[var(--ink)] border border-[var(--on-ink)]/30 text-[var(--on-ink)] text-xs font-semibold flex items-center justify-between">
            <span>
              {event.myRegistrationStatus === 'checked_in'
                ? 'Checked In'
                : event.myRegistrationStatus === 'confirmed'
                  ? 'Seat Confirmed'
                  : `Waitlist #${event.waitlistPosition || 1}`}
            </span>
            <span className="font-mono text-[var(--rose)]">Pass Active</span>
          </div>
        )}
      </div>

      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-3.5">
        <div className="space-y-2">
          <h2 className="text-base sm:text-lg font-extrabold tracking-[-0.03em] text-[var(--ink)] leading-snug line-clamp-2 group-hover:text-[var(--crimson)] transition-colors">
            {event.title}
          </h2>

          <div className="text-xs font-medium text-[var(--ink-2)] flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <span className="font-semibold text-[var(--crimson)]">{event.collegeShortName}</span>
            <span aria-hidden="true">·</span>
            <span>{event.areaName}</span>
            <span aria-hidden="true">·</span>
            <span>{event.type}</span>
            {event.audience === 'host_college_only' && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-semibold text-[var(--crimson)]">Exclusive</span>
              </>
            )}
          </div>

          <div className="text-xs font-mono tabular-nums text-[var(--ink-2)]">
            {formatIstDate(event.startAt)} · {formatIstTime(event.startAt)} IST
          </div>

          {(event.matchedSkills?.length || event.matchedGoals?.length) ? (
            <div className="text-xs font-semibold text-[var(--crimson)] truncate">
              {event.matchedSkills?.length
                ? `Matches ${event.matchedSkills[0]}`
                : `Learn ${event.matchedGoals?.[0]}`}
              {event.isFillingFast && seatsLeft > 0 ? ' · Priority' : ''}
            </div>
          ) : null}
        </div>

        <div className="pt-3 border-t border-[var(--border-warm)] flex items-center justify-between gap-2 text-xs tabular-nums">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono font-semibold text-[var(--ink)] shrink-0">
              {formatFee(event.feeInr)}
            </span>
            <span className="text-[var(--ink-2)]" aria-hidden="true">
              ·
            </span>
            <span
              className={`truncate ${
                seatsLeft === 0 || event.isFillingFast
                  ? 'text-[var(--amber-ink)] font-semibold'
                  : 'text-[var(--ink-2)] font-medium'
              }`}
            >
              {seatsLeft === 0
                ? `Waitlist (${event.waitlistCount} waiting)`
                : event.isFillingFast
                  ? `Filling fast · ${seatsLeft} left`
                  : `${seatsLeft} of ${event.capacity} seats left`}
            </span>
          </div>

          {onToggleSave && (
            <button
              type="button"
              aria-label={event.isSaved ? `Remove ${event.title} bookmark` : `Save ${event.title}`}
              onClick={(e) => {
                e.stopPropagation();
                void onToggleSave(event.id);
              }}
              className="p-1.5 text-[var(--ink-2)] hover:text-[var(--crimson)] shrink-0"
            >
              {event.isSaved ? (
                <BookmarkCheck className="w-4 h-4 text-[var(--crimson)] fill-[var(--crimson)]" />
              ) : (
                <Bookmark className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>
    </motion.article>
  );
}
