import { useEffect, useRef, useState } from 'react';
import {
  Bookmark,
  Calendar,
  ChevronDown,
  ChevronUp,
  Film,
  MapPin,
  Pause,
  Play,
  Ticket,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { FeedEvent } from '../types';
import { formatFee, formatIstDate, formatIstTime } from '../utils/format';
import { PosterImage } from './PosterImage';

interface ReelsViewerProps {
  events: FeedEvent[];
  initialEventId?: string | null;
  onSelectEvent: (event: FeedEvent) => void;
  onToggleSave: (eventId: string) => Promise<void>;
  onSwitchToGrid: () => void;
}

export function ReelsViewer({
  events,
  initialEventId,
  onSelectEvent,
  onToggleSave,
  onSwitchToGrid,
}: ReelsViewerProps) {
  const reelEvents = events.filter((e) => Boolean(e.promoVideoUrl));
  const [activeIndex, setActiveIndex] = useState(() => {
    if (initialEventId) {
      const idx = reelEvents.findIndex((e) => e.id === initialEventId);
      if (idx >= 0) return idx;
    }
    return 0;
  });
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!initialEventId) return;
    const idx = reelEvents.findIndex((e) => e.id === initialEventId);
    if (idx >= 0) {
      setActiveIndex(idx);
    }
  }, [initialEventId, reelEvents.length]);

  useEffect(() => {
    if (activeIndex >= reelEvents.length && reelEvents.length > 0) {
      setActiveIndex(0);
    }
  }, [activeIndex, reelEvents.length]);

  const currentEvent = reelEvents[activeIndex] || null;

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !currentEvent) return;
    setProgress(0);
    setPlaying(true);
    vid.currentTime = 0;
    const playPromise = vid.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        setPlaying(false);
      });
    }
  }, [currentEvent?.id]);

  useEffect(() => {
    if (reelEvents.length <= 1) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(reelEvents.length - 1, i + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [reelEvents.length]);

  function togglePlayPause() {
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused) {
      vid
        .play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false));
    } else {
      vid.pause();
      setPlaying(false);
    }
  }

  function toggleMute() {
    const vid = videoRef.current;
    const nextMuted = !muted;
    setMuted(nextMuted);
    if (vid) {
      vid.muted = nextMuted;
    }
  }

  if (reelEvents.length === 0) {
    return (
      <div className="paper-card py-16 px-6 text-center space-y-3">
        <div className="w-11 h-11 bg-[var(--feel-tint)] border border-[var(--ink)] text-[var(--ink)] flex items-center justify-center mx-auto">
          <Film className="w-5 h-5" />
        </div>
        <h2 className="text-xl font-extrabold tracking-[-0.03em] text-[var(--ink)]">
          No promo reels in the current filter yet
        </h2>
        <p className="text-[15px] font-light text-[var(--ink-2)] max-w-md mx-auto">
          Organizers can attach vertical promo reels alongside event posters. Try switching back to Grid view or widening your filter to All India.
        </p>
        <div className="pt-2">
          <button
            type="button"
            onClick={onSwitchToGrid}
            className="paper-btn-primary min-h-[40px] px-4 py-2 text-xs uppercase tracking-[0.06em]"
          >
            Back to Poster Grid
          </button>
        </div>
      </div>
    );
  }

  const seatsLeft = Math.max(0, currentEvent.capacity - currentEvent.confirmedCount);

  return (
    <section
      aria-label="Campus promo reels"
      className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
    >
      {/* Left/Center: 9:16 Vertical Reel Stage + Up/Down Switcher */}
      <div className="lg:col-span-7 flex flex-col sm:flex-row items-center justify-center gap-4 paper-card p-4 sm:p-6">
        <div className="relative w-full max-w-[360px] aspect-[9/16] max-h-[72vh] rounded-[var(--radius-card)] overflow-hidden bg-[var(--ink)] border border-[var(--ink)] shadow-[6px_6px_0_var(--feel-shadow)] select-none">
          <video
            ref={videoRef}
            key={currentEvent.id}
            src={currentEvent.promoVideoUrl}
            poster={currentEvent.posterUrl}
            muted={muted}
            loop
            playsInline
            autoPlay
            onClick={togglePlayPause}
            onTimeUpdate={() => {
              const vid = videoRef.current;
              if (vid && vid.duration > 0) {
                setProgress((vid.currentTime / vid.duration) * 100);
              }
            }}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            className="w-full h-full object-cover cursor-pointer"
          />

          {/* Top Progress Bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#fef9ef]/25">
            <div
              className="h-full bg-[var(--orange)] transition-[width] duration-150"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>

          {/* Top Controls Overlay */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
            <div className="px-2.5 py-1 bg-[#251911] border border-[#fef9ef]/40 text-[#fef9ef] text-[11px] font-mono tabular-nums">
              Reel {activeIndex + 1} / {reelEvents.length}
            </div>
            <div className="flex items-center gap-1.5 pointer-events-auto">
              <button
                type="button"
                onClick={togglePlayPause}
                aria-label={playing ? 'Pause reel' : 'Play reel'}
                className="min-w-[36px] min-h-[36px] bg-[#251911] border border-[#fef9ef]/50 text-[#fef9ef] flex items-center justify-center hover:bg-[#531d2a]"
              >
                {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={toggleMute}
                aria-label={muted ? 'Unmute reel' : 'Mute reel'}
                className="min-w-[36px] min-h-[36px] bg-[#251911] border border-[#fef9ef]/50 text-[#fef9ef] flex items-center justify-center hover:bg-[#531d2a]"
              >
                {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Center Play Indicator When Paused */}
          {!playing && (
            <button
              type="button"
              onClick={togglePlayPause}
              aria-label="Resume promo reel"
              className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-[#251911] border-2 border-[#fef9ef] text-[#fef9ef] flex items-center justify-center"
            >
              <Play className="w-6 h-6 ml-0.5" />
            </button>
          )}

          {/* Bottom Scrim & Event CTA */}
          <div className="absolute inset-x-0 bottom-0 p-4 pt-16 bg-gradient-to-t from-[#141414] via-[#141414]/85 to-transparent text-[#fef9ef] space-y-2.5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#e3959e] flex flex-wrap items-center gap-1.5">
              <span className="text-[#fef9ef]">{currentEvent.collegeShortName}</span>
              <span aria-hidden="true">·</span>
              <span>{currentEvent.type}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">{formatFee(currentEvent.feeInr)}</span>
            </div>

            <h2 className="text-lg font-extrabold tracking-[-0.03em] leading-snug line-clamp-2 text-[#fef9ef]">
              {currentEvent.title}
            </h2>

            {currentEvent.promoVideoCaption && (
              <p className="text-xs font-normal text-[#fef9ef]/90 line-clamp-2 leading-relaxed">
                {currentEvent.promoVideoCaption}
              </p>
            )}

            <div className="text-[11px] font-mono text-[#fef9ef]/80 tabular-nums flex items-center gap-2">
              <span>{formatIstDate(currentEvent.startAt)} · {formatIstTime(currentEvent.startAt)} IST</span>
            </div>

            <div className="pt-1 flex items-center gap-2">
              <button
                type="button"
                onClick={() => onSelectEvent(currentEvent)}
                className="paper-btn-crimson flex-1 min-h-[40px] px-3.5 py-2 text-xs uppercase tracking-[0.05em] inline-flex items-center justify-center gap-1.5"
              >
                <Ticket className="w-4 h-4 shrink-0" />
                <span>Poster &amp; Register</span>
              </button>
              <button
                type="button"
                onClick={() => onToggleSave(currentEvent.id)}
                aria-label={currentEvent.isSaved ? 'Remove from saved' : 'Save event'}
                className={`min-w-[40px] min-h-[40px] border border-[#fef9ef] flex items-center justify-center transition-colors ${
                  currentEvent.isSaved
                    ? 'bg-[#fef9ef] text-[#251911]'
                    : 'bg-[#251911] text-[#fef9ef] hover:bg-[#531d2a]'
                }`}
              >
                <Bookmark className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Up / Down Reel Stepper */}
        <div className="flex sm:flex-col items-center gap-2.5">
          <button
            type="button"
            disabled={activeIndex === 0}
            onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
            aria-label="Previous reel"
            className="paper-btn-secondary min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <ChevronUp className="w-5 h-5" />
          </button>
          <span className="text-xs font-mono tabular-nums font-bold text-[var(--ink)] px-1">
            {activeIndex + 1}/{reelEvents.length}
          </span>
          <button
            type="button"
            disabled={activeIndex >= reelEvents.length - 1}
            onClick={() => setActiveIndex((i) => Math.min(reelEvents.length - 1, i + 1))}
            aria-label="Next reel"
            className="paper-btn-secondary min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Right Column: Selected Reel Details + Up Next Queue */}
      <div className="lg:col-span-5 space-y-5">
        <div className="paper-card p-5 space-y-4">
          <div className="flex items-start gap-3.5">
            <div className="w-16 aspect-[3/4] rounded-[10px] overflow-hidden border border-[var(--ink)] bg-[var(--paper-raised)] shrink-0">
              <PosterImage
                src={currentEvent.posterUrl}
                alt={`Poster for ${currentEvent.title}`}
                title={currentEvent.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0 space-y-1">
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--crimson)]">
                {currentEvent.collegeName}
              </div>
              <h3 className="text-lg font-extrabold tracking-[-0.03em] text-[var(--ink)] leading-snug">
                {currentEvent.title}
              </h3>
              <div className="text-xs text-[var(--ink-2)]">
                Hosted by {currentEvent.clubName}
              </div>
            </div>
          </div>

          <p className="text-[15px] font-light text-[var(--ink-2)] leading-relaxed">
            {currentEvent.description}
          </p>

          <div className="space-y-1.5 pt-3 border-t border-[var(--border-warm)] text-xs text-[var(--ink)]">
            <div className="flex items-center gap-2 font-mono tabular-nums">
              <Calendar className="w-3.5 h-3.5 text-[var(--crimson)] shrink-0" />
              <span>
                {formatIstDate(currentEvent.startAt)} · {formatIstTime(currentEvent.startAt)} IST
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-[var(--ink-2)] shrink-0" />
              <span>{currentEvent.venueName}</span>
            </div>
          </div>

          <div className="pt-3 border-t border-[var(--border-warm)] flex items-center justify-between text-xs tabular-nums">
            <span className="font-mono font-bold text-[var(--ink)]">
              {formatFee(currentEvent.feeInr)}
            </span>
            <span className={seatsLeft === 0 ? 'text-[var(--amber-ink)] font-semibold' : 'text-[var(--ink-2)]'}>
              {seatsLeft === 0
                ? `Waitlist (${currentEvent.waitlistCount} waiting)`
                : `${seatsLeft} of ${currentEvent.capacity} seats left`}
            </span>
          </div>

          <button
            type="button"
            onClick={() => onSelectEvent(currentEvent)}
            className="paper-btn-primary w-full min-h-[42px] px-4 py-2 text-xs uppercase tracking-[0.06em]"
          >
            Open Full Poster, Rules &amp; Pass Registration
          </button>
        </div>

        <div className="paper-card p-4 space-y-3">
          <h3 className="font-display text-sm font-extrabold text-[var(--ink)]">
            Campus Promo Reels ({reelEvents.length})
          </h3>
          <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
            {reelEvents.map((evt, idx) => {
              const isSelected = idx === activeIndex;
              return (
                <button
                  key={evt.id}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  className={`w-full p-2.5 border text-left flex items-center gap-3 transition-colors ${
                    isSelected
                      ? 'border-[var(--ink)] bg-[var(--feel-tint)] shadow-[3px_3px_0_var(--feel-shadow)]'
                      : 'border-[var(--border-warm)] hover:bg-[var(--paper-input)] bg-[var(--paper-raised)]'
                  }`}
                >
                  <div className="w-10 aspect-[3/4] rounded-[6px] overflow-hidden border border-[var(--ink)] bg-[var(--paper-raised)] shrink-0">
                    <PosterImage
                      src={evt.posterUrl}
                      alt={evt.title}
                      title={evt.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--crimson)] truncate">
                      {evt.collegeShortName} · {evt.type}
                    </div>
                    <div className="text-xs font-bold text-[var(--ink)] truncate">
                      {evt.title}
                    </div>
                    <div className="text-[11px] font-mono text-[var(--ink-2)] tabular-nums">
                      {formatIstDate(evt.startAt)} · {formatFee(evt.feeInr)}
                    </div>
                  </div>
                  <Film
                    className={`w-4 h-4 shrink-0 ${
                      isSelected ? 'text-[var(--crimson)]' : 'text-[var(--ink-2)]'
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
