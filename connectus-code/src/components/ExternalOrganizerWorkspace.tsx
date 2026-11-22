import { useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  FileImage,
  Film,
  Globe,
  Loader2,
  LogIn,
  ShieldCheck,
  Sparkles,
  UploadCloud,
} from 'lucide-react';
import type {
  Area,
  CampusEvent,
  College,
  EventCoordinatorContact,
  EventMode,
  EventPaymentInfo,
  EventScheduleDay,
  EventType,
  OrganizerAccount,
  PosterExtractionResult,
  Registration,
} from '../types';
import { formatIstFull, resizeAndStripPoster, utcIsoToIstInput } from '../utils/format';
import { PlaceSearchInput } from './PlaceSearchInput';
import { PosterImage } from './PosterImage';
import { QrScannerCheckIn, type CheckInPayload } from './QrScannerCheckIn';
import { ScheduleBuilder } from './ScheduleBuilder';

interface SamplePosterItem {
  id: string;
  label: string;
  imagePath: string;
  collegeId: string;
}

export interface ExternalEventPublishPayload {
  title: string;
  description: string;
  type: EventType;
  startDatetimeIst: string;
  endDatetimeIst: string;
  venueName: string;
  areaId: string;
  placeId?: string;
  formattedAddress?: string;
  lat?: number;
  lng?: number;
  mode: EventMode;
  audience: 'open_to_all' | 'host_college_only';
  branches: string[];
  years: string[];
  feeInr: number;
  capacity: number;
  regDeadlineIst: string;
  regLink: string;
  googleFormUrl?: string;
  whatsappGroupUrl?: string;
  telegramGroupUrl?: string;
  paymentInfo?: EventPaymentInfo;
  rules?: string[];
  teamSize?: string;
  prizesAndPerks?: string[];
  prerequisites?: string[];
  schedule?: EventScheduleDay[];
  coordinatorContact?: EventCoordinatorContact;
  posterUrl: string;
  promoVideoUrl?: string;
  promoVideoCaption?: string;
  aiConfidence?: Record<string, number>;
  ignoreDuplicate?: boolean;
  isSponsored?: boolean;
  sponsorLabel?: string;
  organizerId?: string;
}

export interface ExternalEventUpdatePayload {
  action: 'edit' | 'cancel';
  title?: string;
  venueName?: string;
  formattedAddress?: string;
  description?: string;
  feeInr?: number;
  capacity?: number;
  mode?: EventMode;
  startDatetimeIst?: string;
  endDatetimeIst?: string;
  regDeadlineIst?: string;
  schedule?: EventScheduleDay[];
}

interface ExternalOrganizerWorkspaceProps {
  firebaseUser: User | null;
  matchedOrg: OrganizerAccount | null;
  colleges: College[];
  areas: Area[];
  samplePosters: SamplePosterItem[];
  externalEvents: CampusEvent[];
  registrations: Registration[];
  mapsEnabled: boolean;
  onOpenLogin: () => void;
  onSubmitApplication: (payload: {
    clubName: string;
    organizationName: string;
    organizationWebsite: string;
    organizationCategory: string;
    contactName: string;
    designation: string;
    email: string;
    collegeId: string;
    proofNote: string;
  }) => Promise<void>;
  onExtractPoster: (payload: {
    imageDataUrl?: string;
    samplePosterId?: string;
    organizerCollegeId: string;
  }) => Promise<PosterExtractionResult>;
  onUploadPromoVideo: (file: File) => Promise<string>;
  onCheckDuplicate: (payload: {
    title: string;
    collegeId: string;
    startDatetimeIst: string;
  }) => Promise<CampusEvent | null>;
  onPublishEvent: (payload: ExternalEventPublishPayload) => Promise<CampusEvent | void>;
  onUpdateEvent: (eventId: string, payload: ExternalEventUpdatePayload) => Promise<void>;
  onCheckIn: (eventId: string, payload: CheckInPayload) => Promise<Registration | null>;
}

const DEFAULT_POSTER = '/src/assets/images/poster_fintech_case_1795081969450.jpg';
const ORG_CATEGORIES = [
  'Tech Hub / Incubator',
  'Hackathon Platform',
  'Startup / Industry Partner',
  'Developer Community',
  'Design / Cultural Collective',
];

export function ExternalOrganizerWorkspace({
  firebaseUser,
  matchedOrg,
  colleges,
  areas,
  samplePosters,
  externalEvents,
  registrations,
  mapsEnabled,
  onOpenLogin,
  onSubmitApplication,
  onExtractPoster,
  onUploadPromoVideo,
  onCheckDuplicate,
  onPublishEvent,
  onUpdateEvent,
  onCheckIn,
}: ExternalOrganizerWorkspaceProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  // External Partner Application Form State
  const [organizationName, setOrganizationName] = useState('');
  const [organizationWebsite, setOrganizationWebsite] = useState('');
  const [organizationCategory, setOrganizationCategory] = useState(ORG_CATEGORIES[0]);
  const [contactName, setContactName] = useState(firebaseUser?.displayName || '');
  const [designation, setDesignation] = useState('Programs Lead');
  const [email, setEmail] = useState(firebaseUser?.email || '');
  const [collegeId, setCollegeId] = useState(colleges[0]?.id || 'col-iiith');
  const [proofNote, setProofNote] = useState('');
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applySuccess, setApplySuccess] = useState<string | null>(null);

  // Publishing State
  const [section, setSection] = useState<'publish' | 'events'>('publish');
  const [posterPreview, setPosterPreview] = useState('');
  const [promoVideoUrl, setPromoVideoUrl] = useState('');
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractionMeta, setExtractionMeta] = useState<PosterExtractionResult | null>(null);
  const [lowConfConfirmed, setLowConfConfirmed] = useState<Record<string, boolean>>({});
  const [showForm, setShowForm] = useState(false);

  const [title, setTitle] = useState('');
  const [type, setType] = useState<EventType>('Hackathon');
  const [startDatetimeIst, setStartDatetimeIst] = useState('2026-11-28T09:30');
  const [endDatetimeIst, setEndDatetimeIst] = useState('2026-11-28T18:30');
  const [regDeadlineIst, setRegDeadlineIst] = useState('2026-11-27T23:59');
  const [venueName, setVenueName] = useState('');
  const [areaId, setAreaId] = useState(areas[0]?.id || 'area-madhapur');
  const [placeId, setPlaceId] = useState<string | undefined>(undefined);
  const [formattedAddress, setFormattedAddress] = useState<string | undefined>(undefined);
  const [lat, setLat] = useState<number | undefined>(undefined);
  const [lng, setLng] = useState<number | undefined>(undefined);
  const [mode, setMode] = useState<EventMode>('In-Person');
  const [feeInr, setFeeInr] = useState('0');
  const [capacity, setCapacity] = useState('200');
  const [regLink, setRegLink] = useState('https://connectus.in/register/partner-event');
  const [description, setDescription] = useState('');
  const [teamSize, setTeamSize] = useState('');
  const [rulesText, setRulesText] = useState('');
  const [prizesText, setPrizesText] = useState('');
  const [prerequisitesText, setPrerequisitesText] = useState('');
  const [coordinatorName, setCoordinatorName] = useState('');
  const [coordinatorPhone, setCoordinatorPhone] = useState('');
  const [upiId, setUpiId] = useState('');
  const [googleFormUrl, setGoogleFormUrl] = useState('');
  const [whatsappGroupUrl, setWhatsappGroupUrl] = useState('');
  const [telegramGroupUrl, setTelegramGroupUrl] = useState('');
  const [schedule, setSchedule] = useState<EventScheduleDay[]>([]);
  const [isSponsored, setIsSponsored] = useState(false);
  const [sponsorLabel, setSponsorLabel] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState<CampusEvent | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishNotice, setPublishNotice] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  const [checkInEventId, setCheckInEventId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editVenue, setEditVenue] = useState('');
  const [editFormattedAddress, setEditFormattedAddress] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editFee, setEditFee] = useState('0');
  const [editCap, setEditCap] = useState('150');
  const [editSchedule, setEditSchedule] = useState<EventScheduleDay[]>([]);
  const [editBusy, setEditBusy] = useState(false);

  async function handleApplySubmit(e: React.FormEvent) {
    e.preventDefault();
    setApplying(true);
    setApplyError(null);
    setApplySuccess(null);
    try {
      await onSubmitApplication({
        clubName: organizationName.trim(),
        organizationName: organizationName.trim(),
        organizationWebsite: organizationWebsite.trim(),
        organizationCategory,
        contactName: contactName.trim(),
        designation: designation.trim() || 'Partner Coordinator',
        email: email.trim(),
        collegeId,
        proofNote: proofNote.trim(),
      });
      setApplySuccess('External organizer application submitted to the Campus Governance verification queue.');
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : 'Could not submit application.');
    } finally {
      setApplying(false);
    }
  }

  function applyExtraction(data: PosterExtractionResult, posterUrl: string) {
    setPosterPreview(posterUrl);
    setExtractionMeta(data);
    setLowConfConfirmed({});
    setShowForm(true);
    if (data.title) setTitle(data.title);
    if (data.type) setType(data.type);
    if (data.start_datetime_ist) setStartDatetimeIst(data.start_datetime_ist);
    if (data.end_datetime_ist) setEndDatetimeIst(data.end_datetime_ist);
    if (data.registration_deadline_ist) setRegDeadlineIst(data.registration_deadline_ist);
    if (data.venue_name) setVenueName(data.venue_name);
    if (data.mode) setMode(data.mode);
    if (typeof data.fee_inr === 'number') setFeeInr(String(data.fee_inr));
    if (typeof data.capacity === 'number') setCapacity(String(data.capacity));
    if (data.registration_link) setRegLink(data.registration_link);
    if (data.description) setDescription(data.description);
  }

  async function handlePosterFile(file: File | undefined) {
    if (!file || !matchedOrg) return;
    setExtractError(null);
    try {
      const stripped = await resizeAndStripPoster(file);
      setExtracting(true);
      const res = await onExtractPoster({
        imageDataUrl: stripped,
        organizerCollegeId: matchedOrg.collegeId,
      });
      applyExtraction(res, stripped);
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : 'Extraction failed.');
      setShowForm(true);
    } finally {
      setExtracting(false);
    }
  }

  const lowConfidenceKeys = extractionMeta
    ? Object.entries(extractionMeta.confidence || {})
        .filter(([, score]) => typeof score === 'number' && score < 0.7)
        .map(([k]) => k)
    : [];

  async function handlePublish(e: React.FormEvent, ignoreDup = false) {
    e.preventDefault();
    if (!matchedOrg) return;
    setPublishError(null);
    setPublishNotice(null);
    if (!title.trim() || !venueName.trim()) {
      setPublishError('Title and venue name are required.');
      return;
    }
    if (!lowConfidenceKeys.every((k) => lowConfConfirmed[k])) {
      setPublishError('Confirm all amber low-confidence AI fields before publishing.');
      return;
    }
    if (!ignoreDup) {
      const dup = await onCheckDuplicate({
        title: title.trim(),
        collegeId: matchedOrg.collegeId,
        startDatetimeIst,
      });
      if (dup) {
        setDuplicateWarning(dup);
        return;
      }
    }
    const splitLines = (raw: string) =>
      raw
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
    setPublishing(true);
    try {
      await onPublishEvent({
        title: title.trim(),
        description: description.trim() || `${type} hosted by ${matchedOrg.organizationName || matchedOrg.clubName}`,
        type,
        startDatetimeIst,
        endDatetimeIst,
        venueName: venueName.trim(),
        areaId,
        placeId,
        formattedAddress,
        lat,
        lng,
        mode,
        audience: 'open_to_all',
        branches: ['All'],
        years: ['All'],
        feeInr: Number(feeInr) || 0,
        capacity: Math.max(10, Number(capacity) || 150),
        regDeadlineIst,
        regLink: regLink.trim() || 'https://connectus.in/register',
        googleFormUrl: googleFormUrl.trim() || undefined,
        whatsappGroupUrl: whatsappGroupUrl.trim() || undefined,
        telegramGroupUrl: telegramGroupUrl.trim() || undefined,
        paymentInfo: upiId.trim() ? { upiId: upiId.trim() } : undefined,
        rules: splitLines(rulesText),
        teamSize: teamSize.trim() || undefined,
        prizesAndPerks: splitLines(prizesText),
        prerequisites: splitLines(prerequisitesText),
        schedule: schedule.length > 0 ? schedule : undefined,
        coordinatorContact: coordinatorName.trim()
          ? {
              name: coordinatorName.trim(),
              role: matchedOrg.designation || 'Partner Coordinator',
              phone: coordinatorPhone.trim() || undefined,
            }
          : undefined,
        posterUrl: posterPreview || DEFAULT_POSTER,
        promoVideoUrl: promoVideoUrl || undefined,
        aiConfidence: extractionMeta?.confidence,
        ignoreDuplicate: true,
        isSponsored,
        sponsorLabel: isSponsored ? sponsorLabel.trim() || 'Sponsored Partner' : undefined,
        organizerId: matchedOrg.id,
      });
      setTitle('');
      setVenueName('');
      setFormattedAddress(undefined);
      setDescription('');
      setTeamSize('');
      setRulesText('');
      setPrizesText('');
      setPrerequisitesText('');
      setCoordinatorName('');
      setCoordinatorPhone('');
      setUpiId('');
      setGoogleFormUrl('');
      setWhatsappGroupUrl('');
      setTelegramGroupUrl('');
      setSchedule([]);
      setPosterPreview('');
      setPromoVideoUrl('');
      setExtractionMeta(null);
      setShowForm(false);
      setDuplicateWarning(null);
      setSection('events');
      setPublishNotice('External event published with "External Organizer · Verified" disclosure.');
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : 'Could not publish external event.');
    } finally {
      setPublishing(false);
    }
  }

  // Gate: require signed-in partner & verification
  const isApprovedExternal =
    matchedOrg?.memberRole === 'external_organizer' && matchedOrg.status === 'approved';

  if (!firebaseUser) {
    return (
      <section className="paper-card p-8 max-w-2xl mx-auto space-y-4">
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-[-0.04em] text-[var(--ink)]">
          Sign In to Apply or Publish as an External Partner
        </h1>
        <p className="text-sm text-[var(--ink-2)] leading-relaxed">
          Tech hubs, startup incubators, hackathon platforms, and industry communities can submit verification credentials to list public student events transparently marked{' '}
          <strong className="text-[var(--ink)]">External Organizer · Verified</strong>.
        </p>
        <button
          type="button"
          onClick={onOpenLogin}
          className="paper-btn-crimson min-h-[42px] px-5 py-2 text-xs uppercase tracking-[0.06em] inline-flex items-center gap-2"
        >
          <LogIn className="w-4 h-4" />
          <span>Sign In with Google</span>
        </button>
      </section>
    );
  }

  if (!isApprovedExternal) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        {matchedOrg && matchedOrg.memberRole === 'external_organizer' && (
          <section className="paper-card p-6 space-y-2 border-[var(--amber-border)]">
            <div className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--amber-ink)] flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>
                {matchedOrg.status === 'pending'
                  ? 'Application Pending Governance Review'
                  : 'Application Rejected'}
              </span>
            </div>
            <h2 className="font-display text-xl font-extrabold text-[var(--ink)]">
              {matchedOrg.organizationName || matchedOrg.clubName}
            </h2>
            <p className="text-xs text-[var(--ink-2)]">
              Category: {matchedOrg.organizationCategory || 'External Partner'} · Contact: {matchedOrg.email}
            </p>
          </section>
        )}

        <section className="paper-card p-6 sm:p-7 space-y-5">
          <div className="space-y-1.5">
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-[-0.04em] text-[var(--ink)]">
              Apply as Verified External Organizer
            </h1>
            <p className="text-xs sm:text-sm text-[var(--ink-2)]">
              External hubs cannot impersonate a college office. Once approved through Campus Governance, your events publish with an explicit{' '}
              <strong className="text-[var(--ink)]">External Organizer · Verified</strong> source disclosure.
            </p>
          </div>

          {applySuccess && (
            <div className="p-3.5 border border-[var(--olive-border)] bg-[var(--olive-tint)] text-xs font-medium text-[var(--ink)] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[var(--olive)] shrink-0" />
              <span>{applySuccess}</span>
            </div>
          )}

          {applyError && (
            <div className="p-3.5 border border-[var(--crimson)] bg-[var(--crimson-tint)] text-xs font-medium text-[var(--crimson)]">
              {applyError}
            </div>
          )}

          <form onSubmit={handleApplySubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-[var(--ink-2)] mb-1">
                  Organization / Hub Name *
                </label>
                <input
                  type="text"
                  required
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  placeholder="e.g. T-Hub Student Innovation Network"
                  className="paper-input w-full min-h-[38px] px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--ink-2)] mb-1">
                  Organization Category
                </label>
                <select
                  value={organizationCategory}
                  onChange={(e) => setOrganizationCategory(e.target.value)}
                  className="paper-input w-full min-h-[38px] px-3 py-1.5 text-sm"
                >
                  {ORG_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-[var(--ink-2)] mb-1">
                  Official Website
                </label>
                <input
                  type="url"
                  value={organizationWebsite}
                  onChange={(e) => setOrganizationWebsite(e.target.value)}
                  placeholder="https://organization.in"
                  className="paper-input w-full min-h-[38px] px-3 py-1.5 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--ink-2)] mb-1">
                  Anchor Campus / City Corridor
                </label>
                <select
                  value={collegeId}
                  onChange={(e) => setCollegeId(e.target.value)}
                  className="paper-input w-full min-h-[38px] px-3 py-1.5 text-sm"
                >
                  {colleges.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.shortName} — {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-[var(--ink-2)] mb-1">
                  Contact Name *
                </label>
                <input
                  type="text"
                  required
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="paper-input w-full min-h-[38px] px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--ink-2)] mb-1">
                  Role / Designation
                </label>
                <input
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="paper-input w-full min-h-[38px] px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--ink-2)] mb-1">
                  Official Contact Email *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="paper-input w-full min-h-[38px] px-3 py-1.5 text-sm font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--ink-2)] mb-1">
                Verification Proof Note (GST / Company Domain / Partner Reference) *
              </label>
              <textarea
                rows={2}
                required
                value={proofNote}
                onChange={(e) => setProofNote(e.target.value)}
                placeholder="Include official website domain, LinkedIn page, or partner registration link..."
                className="paper-input w-full p-2.5 text-sm resize-none"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={applying}
                className="paper-btn-crimson min-h-[42px] px-5 py-2 text-xs uppercase tracking-[0.06em]"
              >
                {applying ? 'Submitting...' : 'Submit Partner Verification'}
              </button>
            </div>
          </form>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="paper-card p-6 sm:p-7 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-[-0.04em] text-[var(--ink)]">
            {matchedOrg.organizationName || matchedOrg.clubName}
          </h1>
          <div className="text-xs sm:text-sm text-[var(--ink-2)] flex flex-wrap items-center gap-x-2">
            <span className="inline-flex items-center gap-1 text-[var(--olive)] font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verified External Organizer</span>
            </span>
            {matchedOrg.organizationCategory && (
              <>
                <span aria-hidden="true">·</span>
                <span>{matchedOrg.organizationCategory}</span>
              </>
            )}
            {matchedOrg.organizationWebsite && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono inline-flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  {matchedOrg.organizationWebsite}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="paper-segment shrink-0">
          <button
            type="button"
            aria-pressed={section === 'publish'}
            onClick={() => setSection('publish')}
            className="paper-segment-btn min-h-[36px] px-4 py-1.5 text-xs uppercase tracking-[0.05em]"
          >
            Publish Event
          </button>
          <button
            type="button"
            aria-pressed={section === 'events'}
            onClick={() => setSection('events')}
            className="paper-segment-btn min-h-[36px] px-4 py-1.5 text-xs uppercase tracking-[0.05em] tabular-nums"
          >
            My Events ({externalEvents.length})
          </button>
        </div>
      </section>

      {publishNotice && (
        <div className="p-3.5 border border-[var(--olive-border)] bg-[var(--olive-tint)] text-xs font-medium text-[var(--ink)] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[var(--olive)] shrink-0" />
          <span>{publishNotice}</span>
        </div>
      )}

      {section === 'publish' && (
        <section className="paper-card p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[var(--border-warm)]">
            <div>
              <h2 className="font-display text-xl font-extrabold text-[var(--ink)]">
                Publish Verified External Event
              </h2>
              <p className="text-xs text-[var(--ink-2)]">
                Listings show an <strong className="text-[var(--ink)]">External Organizer · Verified</strong> source line (plus <strong className="text-[var(--ink)]">Sponsored</strong> if enabled).
              </p>
            </div>
            {!showForm && (
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="paper-btn-secondary min-h-[36px] px-3.5 py-1.5 text-xs"
              >
                Fill Manually
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div className="lg:col-span-5 space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  void handlePosterFile(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                disabled={extracting}
                onClick={() => fileInputRef.current?.click()}
                className="w-full p-5 border border-dashed border-[var(--border-ink)] bg-[var(--paper-dashed)] rounded-[14px] text-center space-y-2 hover:bg-[var(--paper-raised)]"
              >
                {extracting ? (
                  <Loader2 className="w-7 h-7 animate-spin text-[var(--crimson)] mx-auto" />
                ) : (
                  <UploadCloud className="w-7 h-7 text-[var(--crimson)] mx-auto" />
                )}
                <div className="font-display font-bold text-sm text-[var(--ink)]">
                  {extracting ? 'Extracting Poster Fields...' : 'Upload Event Poster for AI Fill'}
                </div>
              </button>

              {samplePosters.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {samplePosters.slice(0, 3).map((sp) => (
                    <button
                      key={sp.id}
                      type="button"
                      onClick={async () => {
                        setExtracting(true);
                        try {
                          const res = await onExtractPoster({
                            samplePosterId: sp.id,
                            organizerCollegeId: matchedOrg.collegeId,
                          });
                          applyExtraction(res, sp.imagePath);
                        } finally {
                          setExtracting(false);
                        }
                      }}
                      className="paper-btn-secondary min-h-[32px] px-2.5 py-1 text-[11px] inline-flex items-center gap-1"
                    >
                      <FileImage className="w-3 h-3 text-[var(--crimson)]" />
                      <span>{sp.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {extractError && (
                <div className="p-2.5 border border-[var(--amber-border)] bg-[var(--amber-tint)] text-xs text-[var(--amber-ink)]">
                  {extractError}
                </div>
              )}

              {posterPreview && (
                <div className="p-3 border border-[var(--border-warm)] rounded-[12px] bg-[var(--paper-raised)] flex justify-center">
                  <PosterImage
                    src={posterPreview}
                    alt="Partner poster preview"
                    title={title || 'Partner Event'}
                    className="max-h-56 object-contain rounded-[6px]"
                  />
                </div>
              )}
            </div>

            <div className="lg:col-span-7">
              {showForm ? (
                <form onSubmit={(e) => void handlePublish(e)} className="space-y-3.5">
                  {lowConfidenceKeys.length > 0 && (
                    <div className="p-3 border border-[var(--amber-border)] bg-[var(--amber-tint)] text-xs space-y-1.5">
                      <div className="font-bold text-[var(--amber-ink)] flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Confirm Low-Confidence AI Fields</span>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {lowConfidenceKeys.map((k) => (
                          <label key={k} className="inline-flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(lowConfConfirmed[k])}
                              onChange={(e) =>
                                setLowConfConfirmed((p) => ({ ...p, [k]: e.target.checked }))
                              }
                              className="accent-[var(--crimson)]"
                            />
                            <span>{k.replace(/_/g, ' ')}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Event Title *"
                    className="paper-input w-full min-h-[38px] px-3 py-1.5 text-sm"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value as EventType)}
                      className="paper-input min-h-[38px] px-2.5 py-1 text-xs"
                    >
                      {(['Hackathon', 'Workshop', 'Talk', 'Cultural', 'Competition', 'Meetup'] as const).map(
                        (t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        )
                      )}
                    </select>
                    <select
                      value={mode}
                      onChange={(e) => setMode(e.target.value as EventMode)}
                      className="paper-input min-h-[38px] px-2.5 py-1 text-xs"
                    >
                      <option value="In-Person">In-Person</option>
                      <option value="Hybrid">Hybrid</option>
                      <option value="Online">Online</option>
                    </select>
                    <select
                      value={areaId}
                      onChange={(e) => setAreaId(e.target.value)}
                      className="paper-input min-h-[38px] px-2.5 py-1 text-xs"
                    >
                      {areas.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      required
                      value={venueName}
                      onChange={(e) => setVenueName(e.target.value)}
                      placeholder="Venue / Hub Name *"
                      className="paper-input min-h-[38px] px-3 py-1.5 text-xs"
                    />
                    <PlaceSearchInput
                      initialValue={formattedAddress || venueName}
                      mapsEnabled={mapsEnabled}
                      placeholder="Pin venue coordinates..."
                      onSelect={(p) => {
                        setPlaceId(p.placeId);
                        setFormattedAddress(p.formattedAddress);
                        setLat(p.lat);
                        setLng(p.lng);
                        if (!venueName.trim()) setVenueName(p.name);
                      }}
                      helperText={
                        formattedAddress ? `Pinned: ${formattedAddress}` : undefined
                      }
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="datetime-local"
                      value={startDatetimeIst}
                      onChange={(e) => setStartDatetimeIst(e.target.value)}
                      className="paper-input min-h-[38px] px-2.5 py-1 text-xs font-mono"
                    />
                    <input
                      type="datetime-local"
                      value={endDatetimeIst}
                      onChange={(e) => setEndDatetimeIst(e.target.value)}
                      className="paper-input min-h-[38px] px-2.5 py-1 text-xs font-mono"
                    />
                    <input
                      type="datetime-local"
                      value={regDeadlineIst}
                      onChange={(e) => setRegDeadlineIst(e.target.value)}
                      className="paper-input min-h-[38px] px-2.5 py-1 text-xs font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <input
                      type="number"
                      min={0}
                      value={feeInr}
                      onChange={(e) => setFeeInr(e.target.value)}
                      placeholder="Fee INR"
                      className="paper-input min-h-[38px] px-2.5 py-1 text-xs font-mono"
                    />
                    <input
                      type="number"
                      min={10}
                      value={capacity}
                      onChange={(e) => setCapacity(e.target.value)}
                      placeholder="Capacity"
                      className="paper-input min-h-[38px] px-2.5 py-1 text-xs font-mono"
                    />
                    <input
                      type="url"
                      value={regLink}
                      onChange={(e) => setRegLink(e.target.value)}
                      placeholder="Registration Link"
                      className="paper-input col-span-2 sm:col-span-1 min-h-[38px] px-2.5 py-1 text-xs font-mono"
                    />
                  </div>

                  <textarea
                    rows={3}
                    maxLength={1500}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Event overview, eligibility, tracks, speakers, and prizes..."
                    className="paper-input w-full p-2.5 text-xs resize-none"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="text"
                      value={teamSize}
                      onChange={(e) => setTeamSize(e.target.value)}
                      placeholder="Team size (e.g. Solo or 2–4)"
                      className="paper-input min-h-[36px] px-2.5 py-1 text-xs"
                    />
                    <input
                      type="text"
                      value={coordinatorName}
                      onChange={(e) => setCoordinatorName(e.target.value)}
                      placeholder="Coordinator name"
                      className="paper-input min-h-[36px] px-2.5 py-1 text-xs"
                    />
                    <input
                      type="tel"
                      value={coordinatorPhone}
                      onChange={(e) => setCoordinatorPhone(e.target.value)}
                      placeholder="Coordinator phone"
                      className="paper-input min-h-[36px] px-2.5 py-1 text-xs font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <textarea
                      rows={2}
                      value={rulesText}
                      onChange={(e) => setRulesText(e.target.value)}
                      placeholder="Rules (1 per line)"
                      className="paper-input w-full p-2 text-xs resize-none"
                    />
                    <textarea
                      rows={2}
                      value={prizesText}
                      onChange={(e) => setPrizesText(e.target.value)}
                      placeholder="Prizes & perks (1 per line)"
                      className="paper-input w-full p-2 text-xs resize-none"
                    />
                    <textarea
                      rows={2}
                      value={prerequisitesText}
                      onChange={(e) => setPrerequisitesText(e.target.value)}
                      placeholder="What to bring (1 per line)"
                      className="paper-input w-full p-2 text-xs resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="UPI ID (if paid)"
                      className="paper-input min-h-[36px] px-2.5 py-1 text-xs font-mono"
                    />
                    <input
                      type="url"
                      value={googleFormUrl}
                      onChange={(e) => setGoogleFormUrl(e.target.value)}
                      placeholder="Google Form URL"
                      className="paper-input min-h-[36px] px-2.5 py-1 text-xs font-mono"
                    />
                    <input
                      type="url"
                      value={whatsappGroupUrl}
                      onChange={(e) => setWhatsappGroupUrl(e.target.value)}
                      placeholder="WhatsApp Group URL"
                      className="paper-input min-h-[36px] px-2.5 py-1 text-xs font-mono"
                    />
                    <input
                      type="url"
                      value={telegramGroupUrl}
                      onChange={(e) => setTelegramGroupUrl(e.target.value)}
                      placeholder="Telegram URL"
                      className="paper-input min-h-[36px] px-2.5 py-1 text-xs font-mono"
                    />
                  </div>

                  <ScheduleBuilder
                    schedule={schedule}
                    onChange={setSchedule}
                    compact={true}
                  />

                  <div className="p-3 border border-[var(--border-warm)] rounded-[10px] bg-[var(--paper-raised)] space-y-2">
                    <label className="flex items-center gap-2 text-xs text-[var(--ink)] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isSponsored}
                        onChange={(e) => setIsSponsored(e.target.checked)}
                        className="accent-[var(--crimson)]"
                      />
                      <span>
                        <strong className="font-semibold">Sponsored Disclosure</strong> — Show transparent Sponsored label on feed &amp; detail modal.
                      </span>
                    </label>
                    {isSponsored && (
                      <input
                        type="text"
                        value={sponsorLabel}
                        onChange={(e) => setSponsorLabel(e.target.value)}
                        placeholder="Sponsor disclosure label (e.g. Sponsored Partner)"
                        className="paper-input w-full min-h-[34px] px-2.5 py-1 text-xs"
                      />
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setUploadingVideo(true);
                        try {
                          const url = await onUploadPromoVideo(file);
                          setPromoVideoUrl(url);
                        } finally {
                          setUploadingVideo(false);
                        }
                        e.target.value = '';
                      }}
                    />
                    <button
                      type="button"
                      disabled={uploadingVideo}
                      onClick={() => videoInputRef.current?.click()}
                      className="paper-btn-secondary min-h-[36px] px-3 py-1 text-xs inline-flex items-center gap-1.5"
                    >
                      <Film className="w-3.5 h-3.5 text-[var(--crimson)]" />
                      <span>{uploadingVideo ? 'Uploading Reel...' : promoVideoUrl ? 'Reel Attached' : 'Attach Promo Reel'}</span>
                    </button>
                  </div>

                  {duplicateWarning && (
                    <div className="p-3 border border-[var(--amber-border)] bg-[var(--amber-tint)] text-xs space-y-1.5">
                      <div className="font-bold text-[var(--amber-ink)]">
                        Similar event exists: {duplicateWarning.title}
                      </div>
                      <button
                        type="button"
                        onClick={(ev) => void handlePublish(ev, true)}
                        className="paper-btn-crimson min-h-[32px] px-3 py-1 text-xs"
                      >
                        Publish Anyway
                      </button>
                    </div>
                  )}

                  {publishError && (
                    <div className="p-3 border border-[var(--crimson)] bg-[var(--crimson-tint)] text-xs text-[var(--crimson)]">
                      {publishError}
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={publishing}
                      className="paper-btn-crimson min-h-[40px] px-5 py-2 text-xs uppercase tracking-[0.06em] inline-flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{publishing ? 'Publishing...' : 'Publish External Event'}</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-6 border border-[var(--border-warm)] rounded-[12px] bg-[var(--paper-raised)] text-center space-y-2">
                  <Building2 className="w-7 h-7 text-[var(--crimson)] mx-auto" />
                  <p className="text-xs text-[var(--ink-2)]">
                    Upload an event poster on the left or click &ldquo;Fill Manually&rdquo; to publish under {matchedOrg.organizationName || matchedOrg.clubName}.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {section === 'events' && (
        <section className="space-y-4">
          {externalEvents.length === 0 ? (
            <div className="paper-card p-8 text-center text-xs text-[var(--ink-2)]">
              No external events published yet.
            </div>
          ) : (
            externalEvents.map((evt) => {
              const evtRegs = registrations.filter(
                (r) => r.eventId === evt.id && r.status !== 'cancelled'
              );
              const pendingFees = evtRegs.filter((r) => r.paymentStatus === 'pending_verification').length;
              const checkedIn = evtRegs.filter((r) => r.status === 'checked_in').length;
              const isScannerOpen = checkInEventId === evt.id;
              const isEditing = editingId === evt.id;
              return (
                <div key={evt.id} className="paper-card p-5 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-[11px] font-mono uppercase tracking-[0.06em] text-[var(--ink-2)]">
                        External Organizer · Verified
                        {evt.isSponsored ? ` · ${evt.sponsorLabel || 'Sponsored'}` : ''} ·{' '}
                        {formatIstFull(evt.startAt)} IST
                      </div>
                      <h3 className="font-display text-lg font-extrabold text-[var(--ink)]">
                        {evt.title}
                      </h3>
                      <div className="text-xs font-mono tabular-nums text-[var(--ink-2)]">
                        Confirmed {evt.confirmedCount}/{evt.capacity} · Pending Fee {pendingFees} · Checked In {checkedIn}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setCheckInEventId(isScannerOpen ? null : evt.id)}
                        className={isScannerOpen ? 'paper-btn-ink min-h-[36px] px-3 py-1.5 text-xs' : 'paper-btn-primary min-h-[36px] px-3 py-1.5 text-xs'}
                      >
                        {isScannerOpen ? 'Hide QR Check-In' : 'QR Gate & Roster'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (isEditing) {
                            setEditingId(null);
                          } else {
                            setEditingId(evt.id);
                            setEditTitle(evt.title);
                            setEditVenue(evt.venueName);
                            setEditFormattedAddress(evt.formattedAddress || '');
                            setEditDescription(evt.description || '');
                            setEditFee(String(evt.feeInr));
                            setEditCap(String(evt.capacity));
                            setEditSchedule(
                              evt.schedule
                                ? evt.schedule.map((d) => ({
                                    dayLabel: d.dayLabel,
                                    items: d.items.map((i) => ({ ...i })),
                                  }))
                                : []
                            );
                          }
                        }}
                        className="paper-btn-secondary min-h-[36px] px-3 py-1.5 text-xs"
                      >
                        {isEditing ? 'Close Edit' : 'Edit'}
                      </button>
                    </div>
                  </div>

                  {isEditing && (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        setEditBusy(true);
                        try {
                          await onUpdateEvent(evt.id, {
                            action: 'edit',
                            title: editTitle.trim(),
                            venueName: editVenue.trim(),
                            formattedAddress: editFormattedAddress.trim() || undefined,
                            description: editDescription.trim(),
                            feeInr: Number(editFee) || 0,
                            capacity: Math.max(10, Number(editCap) || evt.capacity),
                            startDatetimeIst: utcIsoToIstInput(evt.startAt),
                            endDatetimeIst: utcIsoToIstInput(evt.endAt),
                            regDeadlineIst: utcIsoToIstInput(evt.regDeadline),
                            schedule: editSchedule,
                          });
                          setEditingId(null);
                        } finally {
                          setEditBusy(false);
                        }
                      }}
                      className="p-4 border border-[var(--border-warm)] rounded-[10px] bg-[var(--paper-raised)] space-y-3"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          placeholder="Event Title"
                          className="paper-input sm:col-span-2 min-h-[36px] px-2.5 py-1 text-xs"
                        />
                        <input
                          type="text"
                          value={editVenue}
                          onChange={(e) => setEditVenue(e.target.value)}
                          placeholder="Venue Name"
                          className="paper-input min-h-[36px] px-2.5 py-1 text-xs"
                        />
                        <input
                          type="number"
                          min={0}
                          value={editFee}
                          onChange={(e) => setEditFee(e.target.value)}
                          placeholder="Fee INR"
                          className="paper-input min-h-[36px] px-2.5 py-1 text-xs font-mono"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <input
                          type="text"
                          value={editFormattedAddress}
                          onChange={(e) => setEditFormattedAddress(e.target.value)}
                          placeholder="Gate Address / Landmark"
                          className="paper-input sm:col-span-2 min-h-[36px] px-2.5 py-1 text-xs"
                        />
                        <input
                          type="number"
                          min={10}
                          value={editCap}
                          onChange={(e) => setEditCap(e.target.value)}
                          placeholder="Capacity"
                          className="paper-input min-h-[36px] px-2.5 py-1 text-xs font-mono"
                        />
                      </div>
                      <textarea
                        rows={2}
                        maxLength={1500}
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Event overview..."
                        className="paper-input w-full p-2 text-xs resize-none"
                      />
                      <ScheduleBuilder
                        schedule={editSchedule}
                        onChange={setEditSchedule}
                        compact={true}
                      />
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={editBusy}
                          className="paper-btn-primary min-h-[36px] px-4 py-1 text-xs"
                        >
                          {editBusy ? 'Saving...' : 'Save Event Details'}
                        </button>
                      </div>
                    </form>
                  )}

                  {isScannerOpen && (
                    <QrScannerCheckIn
                      event={evt}
                      registrations={evtRegs}
                      onCheckIn={onCheckIn}
                    />
                  )}
                </div>
              );
            })
          )}
        </section>
      )}
    </div>
  );
}
