import { useMemo, useState } from 'react';
import {
  Bookmark,
  Compass,
  QrCode,
  Star,
  Ticket,
  Trash2,
} from 'lucide-react';
import type { FeedEvent, Registration, StudentProfile } from '../types';
import { formatFee, formatIstDate, formatIstTime } from '../utils/format';
import { QrPassModal } from './QrPassModal';

interface TicketsViewProps {
  student: StudentProfile;
  events: FeedEvent[];
  participatedEvents?: FeedEvent[];
  registrations: Registration[];
  onSelectEvent: (event: FeedEvent) => void;
  onToggleSave: (eventId: string) => Promise<void>;
  onOpenDiscover: () => void;
  onUpdatePassPhoto?: (
    eventId: string,
    registrationId: string,
    photoUrl: string
  ) => Promise<void>;
}

type BookingsTab = 'current' | 'previous' | 'cancelled' | 'saved';

export function TicketsView({
  student,
  events,
  participatedEvents,
  registrations,
  onSelectEvent,
  onToggleSave,
  onOpenDiscover,
  onUpdatePassPhoto,
}: TicketsViewProps) {
  const [activePassEvent, setActivePassEvent] = useState<FeedEvent | null>(null);
  const [listTab, setListTab] = useState<BookingsTab>('current');

  const eventSource = useMemo(() => {
    const map = new Map<string, FeedEvent>();
    for (const evt of events) map.set(evt.id, evt);
    for (const evt of participatedEvents || []) map.set(evt.id, evt);
    return map;
  }, [events, participatedEvents]);

  const {
    currentBookings,
    previousBookings,
    cancelledBookings,
  } = useMemo(() => {
    const nowMs = Date.now();
    const current: Array<{ evt: FeedEvent; reg: Registration | null; isLive: boolean }> = [];
    const previous: Array<{ evt: FeedEvent; reg: Registration | null; isLive: boolean }> = [];
    const cancelled: Array<{ evt: FeedEvent; reg: Registration | null; isLive: boolean }> = [];

    const myRegs = registrations.filter((r) => r.userId === student.id);
    const seenActiveEventIds = new Set<string>();

    for (const reg of myRegs) {
      const evt = eventSource.get(reg.eventId);
      if (!evt) continue;
      if (reg.status === 'cancelled') {
        cancelled.push({ evt, reg, isLive: false });
        continue;
      }
      if (seenActiveEventIds.has(evt.id)) continue;
      seenActiveEventIds.add(evt.id);

      const startMs = new Date(evt.startAt).getTime();
      const endMs = new Date(evt.endAt).getTime();
      const isLive = reg.status === 'checked_in' || (nowMs >= startMs && nowMs <= endMs);

      if (nowMs > endMs && reg.status !== 'checked_in') {
        previous.push({ evt, reg, isLive: false });
      } else {
        current.push({ evt, reg, isLive });
      }
    }

    for (const evt of eventSource.values()) {
      if (
        evt.myRegistrationStatus &&
        evt.myRegistrationStatus !== 'cancelled' &&
        !seenActiveEventIds.has(evt.id)
      ) {
        const reg = evt.myRegistration || null;
        const startMs = new Date(evt.startAt).getTime();
        const endMs = new Date(evt.endAt).getTime();
        const isLive =
          evt.myRegistrationStatus === 'checked_in' || (nowMs >= startMs && nowMs <= endMs);

        if (nowMs > endMs && evt.myRegistrationStatus !== 'checked_in') {
          previous.push({ evt, reg, isLive: false });
        } else {
          current.push({ evt, reg, isLive });
        }
      }
    }

    return {
      currentBookings: current.sort((a, b) => {
        if (a.isLive !== b.isLive) return a.isLive ? -1 : 1;
        return a.evt.startAt.localeCompare(b.evt.startAt);
      }),
      previousBookings: previous.sort((a, b) => b.evt.endAt.localeCompare(a.evt.endAt)),
      cancelledBookings: cancelled.sort((a, b) =>
        (b.reg?.createdAt || '').localeCompare(a.reg?.createdAt || '')
      ),
    };
  }, [eventSource, registrations, student.id]);

  const savedEvents = useMemo(
    () =>
      Array.from(eventSource.values()).filter(
        (e) => e.isSaved || student.savedEventIds.includes(e.id)
      ),
    [eventSource, student.savedEventIds]
  );

  const activePassRegistration = useMemo(() => {
    if (!activePassEvent) return null;
    return (
      activePassEvent.myRegistration ||
      registrations.find(
        (r) =>
          r.eventId === activePassEvent.id &&
          r.userId === student.id &&
          r.status !== 'cancelled'
      ) ||
      null
    );
  }, [activePassEvent, registrations, student.id]);

  return (
    <div className="space-y-5">
      {/* Uniform Student Header */}
      <section className="pb-3.5 border-b border-[var(--border-warm)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <Ticket className="w-6 h-6 text-[var(--crimson)] shrink-0" />
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-[-0.04em] leading-tight text-[var(--ink)]">
              My Bookings
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[var(--ink-2)]">
            Log of your current and previous event bookings, pass status, and entry E-Tickets.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenDiscover}
          className="paper-btn-secondary min-h-[40px] px-3.5 py-2 text-xs uppercase tracking-[0.06em] inline-flex items-center gap-1.5 whitespace-nowrap self-start sm:self-auto"
        >
          <Compass className="w-4 h-4 text-[var(--crimson)]" />
          <span>Explore Events</span>
        </button>
      </section>

      <section className="paper-card p-5 sm:p-6 space-y-5">
        <div className="paper-segment overflow-x-auto max-w-full">
          {(
            [
              { id: 'current', label: `Current (${currentBookings.length})` },
              { id: 'previous', label: `Previous (${previousBookings.length})` },
              { id: 'cancelled', label: `Cancelled (${cancelledBookings.length})` },
              { id: 'saved', label: `Saved (${savedEvents.length})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              aria-pressed={listTab === tab.id}
              onClick={() => setListTab(tab.id)}
              className="paper-segment-btn min-h-[36px] px-3.5 py-1.5 text-xs whitespace-nowrap tabular-nums"
            >
              {tab.label}
            </button>
          ))}
        </div>

        {(listTab === 'current' || listTab === 'previous' || listTab === 'cancelled') && (() => {
          const activeList =
            listTab === 'current'
              ? currentBookings
              : listTab === 'previous'
                ? previousBookings
                : cancelledBookings;

          if (activeList.length === 0) {
            const emptyCopy =
              listTab === 'current'
                ? {
                    title: 'No Current Bookings Yet',
                    desc: 'Active and upcoming event registrations appear here along with instant E-Tickets.',
                  }
                : listTab === 'previous'
                  ? {
                      title: 'No Previous Bookings Yet',
                      desc: 'Completed events you registered for or attended appear here for reference and reviews.',
                    }
                  : {
                      title: 'No Cancelled Bookings',
                      desc: 'Withdrawn or cancelled event bookings are logged here for your record.',
                    };

            return (
              <div className="py-10 text-center space-y-3 border-t border-[var(--border-warm)]">
                <QrCode className="w-8 h-8 text-[var(--crimson)] mx-auto" />
                <div className="space-y-1">
                  <h2 className="font-display text-lg font-extrabold text-[var(--ink)]">
                    {emptyCopy.title}
                  </h2>
                  <p className="text-xs text-[var(--ink-2)] max-w-md mx-auto">
                    {emptyCopy.desc}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onOpenDiscover}
                  className="paper-btn-primary min-h-[38px] px-4 py-1.5 text-xs"
                >
                  Browse Events
                </button>
              </div>
            );
          }

          return (
            <div className="border-t border-[var(--border-warm)] divide-y divide-[var(--border-warm)]">
              {activeList.map(({ evt, reg, isLive }, idx) => {
                const statusLabel =
                  listTab === 'cancelled'
                    ? 'Cancelled'
                    : reg?.status === 'checked_in' || evt.myRegistrationStatus === 'checked_in'
                      ? 'Checked In'
                      : listTab === 'previous'
                        ? 'Attended / Ended'
                        : reg?.status === 'waitlisted' || evt.myRegistrationStatus === 'waitlisted'
                          ? `Waitlist #${evt.waitlistPosition || 1}`
                          : isLive
                            ? 'Live Now · Confirmed'
                            : 'Booked · Confirmed';

                const statusColor =
                  listTab === 'cancelled'
                    ? 'text-[var(--crimson)]'
                    : reg?.status === 'waitlisted' || evt.myRegistrationStatus === 'waitlisted'
                      ? 'text-[var(--amber-ink)]'
                      : 'text-[var(--olive)]';

                const feeSummary =
                  reg?.paymentStatus === 'free' || evt.feeInr === 0
                    ? 'Free Pass'
                    : reg?.paymentStatus === 'paid_verified'
                      ? `Paid ${formatFee(reg.amountPaidInr || evt.feeInr)}`
                      : `${formatFee(evt.feeInr)} · Gate Check`;

                const rowPhoto = reg?.attendeePhotoUrl || student.photoUrl || '';
                const rowInitials = (reg?.userName || student.displayName || 'ST')
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((p) => p[0]?.toUpperCase() || '')
                  .join('');

                return (
                  <div
                    key={`${listTab}-${evt.id}-${reg?.id || idx}`}
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex items-start gap-3">
                      <div className="w-11 h-11 rounded-[8px] border border-[var(--border-ink)] bg-[var(--paper-raised)] overflow-hidden flex items-center justify-center shrink-0 mt-0.5">
                        {rowPhoto ? (
                          <img
                            src={rowPhoto}
                            alt={reg?.userName || student.displayName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="font-display text-xs font-extrabold text-[var(--ink-2)]">
                            {rowInitials}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-x-2 text-xs">
                        <span className={`font-semibold ${statusColor}`}>{statusLabel}</span>
                        {reg?.passCode && listTab !== 'cancelled' && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono text-[var(--ink-2)] tabular-nums">
                              {reg.passCode}
                            </span>
                          </>
                        )}
                        <span aria-hidden="true">·</span>
                        <span className="font-mono text-[var(--ink-2)] tabular-nums">
                          {formatIstDate(evt.startAt)} · {formatIstTime(evt.startAt)} IST
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => onSelectEvent(evt)}
                        className="font-display font-bold text-base text-[var(--ink)] hover:text-[var(--crimson)] text-left block max-w-full"
                      >
                        {evt.title}
                      </button>

                      <div className="text-xs text-[var(--ink-2)] flex flex-wrap items-center gap-x-2">
                        <span>{evt.collegeShortName}</span>
                        <span aria-hidden="true">·</span>
                        <span>{evt.venueName}</span>
                        <span aria-hidden="true">·</span>
                        <span>{feeSummary}</span>
                        {reg?.teamName && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>Team: {reg.teamName}</span>
                          </>
                        )}
                      </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {listTab !== 'cancelled' && (
                        <button
                          type="button"
                          onClick={() => setActivePassEvent(evt)}
                          className="paper-btn-ink min-h-[36px] px-3 py-1.5 text-xs inline-flex items-center gap-1.5 whitespace-nowrap"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>E-Ticket</span>
                        </button>
                      )}
                      {(listTab === 'previous' || listTab === 'current') && (
                        <button
                          type="button"
                          onClick={() => onSelectEvent(evt)}
                          className="paper-btn-tint min-h-[36px] px-3 py-1.5 text-xs inline-flex items-center gap-1 whitespace-nowrap"
                        >
                          <Star className="w-3.5 h-3.5 text-[var(--crimson)]" />
                          <span>Rate &amp; Review</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onSelectEvent(evt)}
                        className="paper-btn-secondary min-h-[36px] px-3 py-1.5 text-xs whitespace-nowrap"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {listTab === 'saved' &&
          (savedEvents.length === 0 ? (
            <div className="py-10 text-center space-y-3 border-t border-[var(--border-warm)]">
              <Bookmark className="w-8 h-8 text-[var(--crimson)] mx-auto" />
              <div className="space-y-1">
                <h2 className="font-display text-lg font-extrabold text-[var(--ink)]">
                  No Saved Events
                </h2>
                <p className="text-xs text-[var(--ink-2)] max-w-md mx-auto">
                  Bookmark posters you want to revisit later from Discover or My Campus.
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenDiscover}
                className="paper-btn-primary min-h-[38px] px-4 py-1.5 text-xs"
              >
                Explore Events
              </button>
            </div>
          ) : (
            <div className="border-t border-[var(--border-warm)] divide-y divide-[var(--border-warm)]">
              {savedEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="text-xs text-[var(--ink-2)] font-mono tabular-nums">
                      {evt.type} · {formatIstDate(evt.startAt)} · {evt.collegeShortName}
                    </div>
                    <button
                      type="button"
                      onClick={() => onSelectEvent(evt)}
                      className="font-display font-bold text-base text-[var(--ink)] hover:text-[var(--crimson)] text-left block max-w-full"
                    >
                      {evt.title}
                    </button>
                    <div className="text-xs text-[var(--ink-2)]">{evt.venueName}</div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onSelectEvent(evt)}
                      className="paper-btn-ink min-h-[36px] px-3.5 py-1.5 text-xs whitespace-nowrap"
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleSave(evt.id)}
                      aria-label={`Remove ${evt.title} from saved`}
                      className="paper-btn-secondary min-h-[36px] px-2.5 py-1.5 text-xs text-[var(--crimson)] inline-flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
      </section>

      <QrPassModal
        open={Boolean(activePassEvent && activePassRegistration)}
        event={activePassEvent}
        registration={activePassRegistration}
        waitlistPosition={activePassEvent?.waitlistPosition ?? null}
        student={student}
        onUpdatePassPhoto={onUpdatePassPhoto}
        onClose={() => setActivePassEvent(null)}
      />
    </div>
  );
}
