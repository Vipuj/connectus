import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type {
  College,
  EventCoordinatorContact,
  EventMode,
  EventScheduleDay,
  EventType,
} from '../types';
import { PlaceSearchInput } from './PlaceSearchInput';
import { ScheduleBuilder } from './ScheduleBuilder';

export interface SuggestEventPayload {
  title: string;
  collegeId: string;
  venueName: string;
  startDatetimeIst: string;
  endDatetimeIst?: string;
  regDeadlineIst?: string;
  regLink: string;
  description: string;
  type: EventType;
  mode?: EventMode;
  feeInr?: number;
  capacity?: number;
  teamSize?: string;
  rules?: string[];
  prizesAndPerks?: string[];
  prerequisites?: string[];
  coordinatorContact?: EventCoordinatorContact;
  whatsappGroupUrl?: string;
  telegramGroupUrl?: string;
  schedule?: EventScheduleDay[];
  lat?: number;
  lng?: number;
  placeId?: string;
  formattedAddress?: string;
}

interface SuggestEventModalProps {
  open: boolean;
  onClose: () => void;
  colleges: College[];
  mapsEnabled: boolean;
  defaultCollegeId?: string;
  onSubmitSuggestion: (payload: SuggestEventPayload) => Promise<void>;
}

export function SuggestEventModal({
  open,
  onClose,
  colleges,
  mapsEnabled,
  defaultCollegeId,
  onSubmitSuggestion,
}: SuggestEventModalProps) {
  const resolvedDefaultCollege =
    defaultCollegeId && colleges.some((c) => c.id === defaultCollegeId)
      ? defaultCollegeId
      : colleges[0]?.id || 'col-iiith';
  const [title, setTitle] = useState('');
  const [collegeId, setCollegeId] = useState(resolvedDefaultCollege);
  const [type, setType] = useState<EventType>('Workshop');
  const [mode, setMode] = useState<EventMode>('In-Person');
  const [venueName, setVenueName] = useState('');
  const [placeId, setPlaceId] = useState<string | undefined>(undefined);
  const [formattedAddress, setFormattedAddress] = useState<string | undefined>(undefined);
  const [lat, setLat] = useState<number | undefined>(undefined);
  const [lng, setLng] = useState<number | undefined>(undefined);
  const [startDatetimeIst, setStartDatetimeIst] = useState('2026-11-29T10:00');
  const [endDatetimeIst, setEndDatetimeIst] = useState('2026-11-29T17:00');
  const [regDeadlineIst, setRegDeadlineIst] = useState('2026-11-28T23:59');
  const [feeInr, setFeeInr] = useState('0');
  const [capacity, setCapacity] = useState('150');
  const [teamSize, setTeamSize] = useState('');
  const [regLink, setRegLink] = useState('');
  const [description, setDescription] = useState('');
  const [rulesText, setRulesText] = useState('');
  const [prizesText, setPrizesText] = useState('');
  const [prerequisitesText, setPrerequisitesText] = useState('');
  const [coordinatorName, setCoordinatorName] = useState('');
  const [coordinatorPhone, setCoordinatorPhone] = useState('');
  const [whatsappGroupUrl, setWhatsappGroupUrl] = useState('');
  const [telegramGroupUrl, setTelegramGroupUrl] = useState('');
  const [schedule, setSchedule] = useState<EventScheduleDay[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setCollegeId(resolvedDefaultCollege);
    }
  }, [open, resolvedDefaultCollege]);

  if (!open) return null;

  const splitLines = (raw: string) =>
    raw
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmitSuggestion({
        title,
        collegeId,
        venueName,
        startDatetimeIst,
        endDatetimeIst: endDatetimeIst || undefined,
        regDeadlineIst: regDeadlineIst || undefined,
        regLink,
        description,
        type,
        mode,
        feeInr: Number(feeInr) || 0,
        capacity: Math.max(10, Number(capacity) || 150),
        teamSize: teamSize.trim() || undefined,
        rules: splitLines(rulesText),
        prizesAndPerks: splitLines(prizesText),
        prerequisites: splitLines(prerequisitesText),
        coordinatorContact: coordinatorName.trim()
          ? {
              name: coordinatorName.trim(),
              phone: coordinatorPhone.trim() || undefined,
            }
          : undefined,
        whatsappGroupUrl: whatsappGroupUrl.trim() || undefined,
        telegramGroupUrl: telegramGroupUrl.trim() || undefined,
        schedule: schedule.length > 0 ? schedule : undefined,
        lat,
        lng,
        placeId,
        formattedAddress,
      });
      setTitle('');
      setVenueName('');
      setPlaceId(undefined);
      setFormattedAddress(undefined);
      setLat(undefined);
      setLng(undefined);
      setFeeInr('0');
      setCapacity('150');
      setTeamSize('');
      setRegLink('');
      setDescription('');
      setRulesText('');
      setPrizesText('');
      setPrerequisitesText('');
      setCoordinatorName('');
      setCoordinatorPhone('');
      setWhatsappGroupUrl('');
      setTelegramGroupUrl('');
      setSchedule([]);
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 paper-scrim flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Suggest a Campus Event"
    >
      <div className="paper-modal w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border-warm)] bg-[var(--paper-raised)] flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h2 className="font-display text-lg font-extrabold tracking-[-0.03em] text-[var(--ink)]">
              Suggest an Event
            </h2>
            <p className="text-xs text-[var(--ink-2)]">
              Share complete details from a poster or campus announcement for Campus Official verification.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close suggestion form"
            className="paper-btn-secondary min-w-[40px] min-h-[40px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <label className="block space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-2)]">
              Event Title *
            </span>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. National Open Source Sprint"
              className="paper-input w-full min-h-[40px] px-3 py-2 text-sm"
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="block space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-2)]">
                Host College
              </span>
              <select
                value={collegeId}
                onChange={(e) => setCollegeId(e.target.value)}
                className="paper-input w-full min-h-[40px] px-3 py-2 text-sm"
              >
                {(['Tier 1', 'Tier 2', 'Tier 3'] as const).map((tier) => (
                  <optgroup key={tier} label={`${tier} Colleges`}>
                    {colleges
                      .filter((c) => c.tier === tier)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.shortName} · {c.name}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-2)]">
                Category
              </span>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as EventType)}
                className="paper-input w-full min-h-[40px] px-3 py-2 text-sm"
              >
                <option value="Hackathon">Hackathon</option>
                <option value="Workshop">Workshop</option>
                <option value="Talk">Talk</option>
                <option value="Cultural">Cultural</option>
                <option value="Competition">Competition</option>
                <option value="Meetup">Meetup</option>
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-2)]">
                Mode
              </span>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as EventMode)}
                className="paper-input w-full min-h-[40px] px-3 py-2 text-sm"
              >
                <option value="In-Person">In-Person</option>
                <option value="Hybrid">Hybrid</option>
                <option value="Online">Online</option>
              </select>
            </label>
          </div>

          <PlaceSearchInput
            label="Pin Exact Campus / Venue on Google Maps (Optional)"
            placeholder="Search campus auditorium or university anywhere in India..."
            mapsEnabled={mapsEnabled}
            onSelect={(place) => {
              setVenueName((curr) => curr || place.name);
              setPlaceId(place.placeId);
              setFormattedAddress(place.formattedAddress);
              setLat(place.lat);
              setLng(place.lng);
            }}
            helperText={formattedAddress ? `Pinned: ${formattedAddress}` : undefined}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-2)]">
                Venue / Hall Name *
              </span>
              <input
                type="text"
                required
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
                placeholder="Auditorium / Seminar Hall / Block"
                className="paper-input w-full min-h-[40px] px-3 py-2 text-sm"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-2)]">
                Gate Address / Landmark (optional)
              </span>
              <input
                type="text"
                value={formattedAddress || ''}
                onChange={(e) => setFormattedAddress(e.target.value || undefined)}
                placeholder="Building, floor, or nearest entry gate"
                className="paper-input w-full min-h-[40px] px-3 py-2 text-sm"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="block space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-2)]">
                Start (IST) *
              </span>
              <input
                type="datetime-local"
                required
                value={startDatetimeIst}
                onChange={(e) => setStartDatetimeIst(e.target.value)}
                className="paper-input w-full min-h-[40px] px-2.5 py-2 text-xs font-mono tabular-nums"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-2)]">
                End (IST)
              </span>
              <input
                type="datetime-local"
                value={endDatetimeIst}
                onChange={(e) => setEndDatetimeIst(e.target.value)}
                className="paper-input w-full min-h-[40px] px-2.5 py-2 text-xs font-mono tabular-nums"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-2)]">
                Reg Deadline (IST)
              </span>
              <input
                type="datetime-local"
                value={regDeadlineIst}
                onChange={(e) => setRegDeadlineIst(e.target.value)}
                className="paper-input w-full min-h-[40px] px-2.5 py-2 text-xs font-mono tabular-nums"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <label className="block space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-2)]">
                Fee (INR)
              </span>
              <input
                type="number"
                min={0}
                value={feeInr}
                onChange={(e) => setFeeInr(e.target.value)}
                className="paper-input w-full min-h-[40px] px-3 py-2 text-sm font-mono tabular-nums"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-2)]">
                Capacity
              </span>
              <input
                type="number"
                min={10}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className="paper-input w-full min-h-[40px] px-3 py-2 text-sm font-mono tabular-nums"
              />
            </label>
            <label className="block space-y-1 col-span-2 sm:col-span-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-2)]">
                Team Size
              </span>
              <input
                type="text"
                value={teamSize}
                onChange={(e) => setTeamSize(e.target.value)}
                placeholder="e.g. Solo or 2–4 members"
                className="paper-input w-full min-h-[40px] px-3 py-2 text-sm"
              />
            </label>
          </div>

          <label className="block space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-2)]">
              Detailed Overview &amp; Highlights *
            </span>
            <textarea
              rows={3}
              maxLength={1500}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tracks, speakers, eligibility, what participants will build, and key highlights..."
              className="paper-input w-full px-3 py-2 text-sm"
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-2)]">
                What to Bring / Prerequisites (1 per line)
              </span>
              <textarea
                rows={2}
                value={prerequisitesText}
                onChange={(e) => setPrerequisitesText(e.target.value)}
                placeholder="Valid College ID card&#10;Laptop + charger"
                className="paper-input w-full px-3 py-2 text-xs"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-2)]">
                Prizes &amp; Perks (1 per line)
              </span>
              <textarea
                rows={2}
                value={prizesText}
                onChange={(e) => setPrizesText(e.target.value)}
                placeholder="₹50,000 prize pool&#10;Participation certificate &amp; lunch"
                className="paper-input w-full px-3 py-2 text-xs"
              />
            </label>
          </div>

          <label className="block space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-2)]">
              Rules &amp; Entry Guidelines (1 per line)
            </span>
            <textarea
              rows={2}
              value={rulesText}
              onChange={(e) => setRulesText(e.target.value)}
              placeholder="Inter-college teams allowed&#10;Report 30 mins before check-in"
              className="paper-input w-full px-3 py-2 text-xs"
            />
          </label>

          <ScheduleBuilder
            schedule={schedule}
            onChange={setSchedule}
            title="Event Timeline / Agenda (Optional)"
            compact={true}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-2)]">
                Coordinator Name
              </span>
              <input
                type="text"
                value={coordinatorName}
                onChange={(e) => setCoordinatorName(e.target.value)}
                placeholder="Student lead / organizer contact"
                className="paper-input w-full min-h-[38px] px-3 py-1.5 text-sm"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-2)]">
                Coordinator Phone
              </span>
              <input
                type="tel"
                value={coordinatorPhone}
                onChange={(e) => setCoordinatorPhone(e.target.value)}
                placeholder="+91 98..."
                className="paper-input w-full min-h-[38px] px-3 py-1.5 text-sm font-mono"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="block space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-2)]">
                Registration URL
              </span>
              <input
                type="url"
                value={regLink}
                onChange={(e) => setRegLink(e.target.value)}
                placeholder="https://..."
                className="paper-input w-full min-h-[38px] px-3 py-1.5 text-xs font-mono"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-2)]">
                WhatsApp Group URL
              </span>
              <input
                type="url"
                value={whatsappGroupUrl}
                onChange={(e) => setWhatsappGroupUrl(e.target.value)}
                placeholder="https://chat.whatsapp.com/..."
                className="paper-input w-full min-h-[38px] px-3 py-1.5 text-xs font-mono"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-2)]">
                Telegram Channel URL
              </span>
              <input
                type="url"
                value={telegramGroupUrl}
                onChange={(e) => setTelegramGroupUrl(e.target.value)}
                placeholder="https://t.me/..."
                className="paper-input w-full min-h-[38px] px-3 py-1.5 text-xs font-mono"
              />
            </label>
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="paper-btn-secondary min-h-[42px] px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="paper-btn-primary min-h-[42px] px-5 py-2 text-sm"
            >
              {submitting ? 'Submitting...' : 'Submit for Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
