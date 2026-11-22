import { Clock, Plus, Trash2 } from 'lucide-react';
import type { EventScheduleDay } from '../types';

interface ScheduleBuilderProps {
  schedule: EventScheduleDay[];
  onChange: (next: EventScheduleDay[]) => void;
  title?: string;
  compact?: boolean;
}

export function ScheduleBuilder({
  schedule,
  onChange,
  title = 'Structured Event Schedule / Agenda (IST)',
  compact = false,
}: ScheduleBuilderProps) {
  function handleAddDay() {
    if (schedule.length >= 14) return;
    const dayNum = schedule.length + 1;
    onChange([
      ...schedule,
      {
        dayLabel: `Day ${dayNum} · Schedule`,
        items: [{ time: '09:30 AM – 10:30 AM', activity: 'Check-In & Inauguration' }],
      },
    ]);
  }

  function handleRemoveDay(dayIdx: number) {
    onChange(schedule.filter((_, idx) => idx !== dayIdx));
  }

  function handleDayLabelChange(dayIdx: number, dayLabel: string) {
    onChange(
      schedule.map((d, idx) => (idx === dayIdx ? { ...d, dayLabel } : d))
    );
  }

  function handleAddSlot(dayIdx: number) {
    onChange(
      schedule.map((d, idx) =>
        idx === dayIdx && d.items.length < 30
          ? {
              ...d,
              items: [...d.items, { time: '11:00 AM – 12:30 PM', activity: '' }],
            }
          : d
      )
    );
  }

  function handleRemoveSlot(dayIdx: number, slotIdx: number) {
    onChange(
      schedule.map((d, idx) =>
        idx === dayIdx
          ? { ...d, items: d.items.filter((_, i) => i !== slotIdx) }
          : d
      )
    );
  }

  function handleSlotChange(
    dayIdx: number,
    slotIdx: number,
    field: 'time' | 'activity',
    value: string
  ) {
    onChange(
      schedule.map((d, idx) =>
        idx === dayIdx
          ? {
              ...d,
              items: d.items.map((item, i) =>
                i === slotIdx ? { ...item, [field]: value } : item
              ),
            }
          : d
      )
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ink-2)] flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-[var(--crimson)]" />
          <span>{title}</span>
        </div>
        <button
          type="button"
          disabled={schedule.length >= 14}
          onClick={handleAddDay}
          className="paper-btn-secondary min-h-[32px] px-2.5 py-1 text-[11px] inline-flex items-center gap-1"
        >
          <Plus className="w-3 h-3 text-[var(--crimson)]" />
          <span>Add Day / Track</span>
        </button>
      </div>

      {schedule.length === 0 ? (
        <div className="p-3 rounded-[10px] border border-dashed border-[var(--border-warm)] bg-[var(--paper-raised)] text-xs text-[var(--ink-2)] flex flex-wrap items-center justify-between gap-2">
          <span>No session timeline added yet. Add time slots so attendees know check-in &amp; demo timings.</span>
          <button
            type="button"
            onClick={handleAddDay}
            className="text-[var(--crimson)] font-semibold hover:underline text-xs"
          >
            + Add Day 1 Timeline
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {schedule.map((day, dayIdx) => (
            <div
              key={dayIdx}
              className="rounded-[12px] border border-[var(--border-warm)] bg-[var(--paper-raised)] p-3 space-y-2.5"
            >
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={day.dayLabel}
                  onChange={(e) => handleDayLabelChange(dayIdx, e.target.value)}
                  placeholder="e.g. Day 1 – Saturday (28 Nov 2026)"
                  className="paper-input flex-1 min-h-[34px] px-2.5 py-1 text-xs font-semibold"
                />
                <button
                  type="button"
                  onClick={() => handleAddSlot(dayIdx)}
                  className="paper-btn-secondary min-h-[34px] px-2.5 py-1 text-[11px] inline-flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-3 h-3" />
                  <span>Slot</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveDay(dayIdx)}
                  aria-label={`Remove ${day.dayLabel || 'day'}`}
                  className="min-h-[34px] px-2 py-1 border border-[var(--border-warm)] text-[var(--crimson)] hover:bg-[var(--crimson-tint)] text-xs inline-flex items-center justify-center shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2">
                {day.items.map((slot, slotIdx) => (
                  <div
                    key={slotIdx}
                    className={`grid gap-2 items-center ${
                      compact ? 'grid-cols-1 sm:grid-cols-12' : 'grid-cols-1 sm:grid-cols-12'
                    }`}
                  >
                    <input
                      type="text"
                      value={slot.time}
                      onChange={(e) =>
                        handleSlotChange(dayIdx, slotIdx, 'time', e.target.value)
                      }
                      placeholder="09:00 AM – 10:00 AM"
                      className="paper-input sm:col-span-4 min-h-[34px] px-2.5 py-1 text-xs font-mono tabular-nums"
                    />
                    <input
                      type="text"
                      value={slot.activity}
                      onChange={(e) =>
                        handleSlotChange(dayIdx, slotIdx, 'activity', e.target.value)
                      }
                      placeholder="Activity (e.g. Gate Check-In, Keynote, Jury Demo)"
                      className="paper-input sm:col-span-7 min-h-[34px] px-2.5 py-1 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveSlot(dayIdx, slotIdx)}
                      aria-label="Remove slot"
                      className="sm:col-span-1 min-h-[34px] px-2 py-1 border border-[var(--border-warm)] text-[var(--ink-2)] hover:text-[var(--crimson)] text-xs inline-flex items-center justify-center"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
