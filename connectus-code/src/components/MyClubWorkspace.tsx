import { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Edit3,
  Eye,
  FileImage,
  Film,
  Loader2,
  MessageSquare,
  Plus,
  Send,
  Sparkles,
  Star,
  UploadCloud,
} from 'lucide-react';
import type {
  Area,
  CampusEvent,
  College,
  EventCoordinatorContact,
  EventFeedback,
  EventMode,
  EventPaymentInfo,
  EventScheduleDay,
  EventType,
  FeedbackAnalysisReport,
  OrganizerAccount,
  PosterExtractionResult,
  RegStatus,
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

export interface ClubEventSubmitPayload {
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
  saveAsDraft?: boolean;
  draftEventId?: string;
  organizerId?: string;
}

export interface ClubEventUpdatePayload {
  action: 'edit' | 'cancel' | 'submit';
  submitForReview?: boolean;
  title?: string;
  venueName?: string;
  formattedAddress?: string;
  description?: string;
  startDatetimeIst?: string;
  endDatetimeIst?: string;
  regDeadlineIst?: string;
  feeInr?: number;
  capacity?: number;
  mode?: EventMode;
  regStatus?: RegStatus;
  posterUrl?: string;
  regLink?: string;
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
  promoVideoUrl?: string;
  promoVideoCaption?: string;
}

interface MyClubWorkspaceProps {
  activeOrg: OrganizerAccount;
  colleges: College[];
  areas: Area[];
  samplePosters: SamplePosterItem[];
  clubEvents: CampusEvent[];
  registrations: Registration[];
  eventFeedback?: EventFeedback[];
  mapsEnabled: boolean;
  onBackToStudent?: () => void;
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
  onPublishEvent: (payload: ClubEventSubmitPayload) => Promise<CampusEvent | void>;
  onUpdateEvent: (eventId: string, payload: ClubEventUpdatePayload) => Promise<void>;
  onCheckIn: (eventId: string, payload: CheckInPayload) => Promise<Registration | null>;
  onAnalyzeClubFeedback?: (eventId?: string) => Promise<FeedbackAnalysisReport>;
}

type ClubSection = 'submissions' | 'create' | 'performance' | 'feedback';
type SubmissionFilter = 'all' | 'draft' | 'pending_review' | 'changes_requested' | 'rejected';

const DEFAULT_POSTER = '/src/assets/images/poster_ai_hackathon_1795081969222.jpg';

export function MyClubWorkspace({
  activeOrg,
  colleges,
  areas,
  samplePosters,
  clubEvents,
  registrations,
  eventFeedback = [],
  mapsEnabled,
  onBackToStudent,
  onExtractPoster,
  onUploadPromoVideo,
  onCheckDuplicate,
  onPublishEvent,
  onUpdateEvent,
  onCheckIn,
  onAnalyzeClubFeedback,
}: MyClubWorkspaceProps) {
  const college = colleges.find((c) => c.id === activeOrg.collegeId) || colleges[0];
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  const [section, setSection] = useState<ClubSection>('submissions');
  const [submissionFilter, setSubmissionFilter] = useState<SubmissionFilter>('all');
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [selectedFeedbackEventId, setSelectedFeedbackEventId] = useState<string | null>(null);
  const [analyzingFeedback, setAnalyzingFeedback] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [feedbackReport, setFeedbackReport] = useState<FeedbackAnalysisReport | null>(null);

  // Draft / Submission Form State
  const [posterPreview, setPosterPreview] = useState<string>('');
  const [promoVideoUrl, setPromoVideoUrl] = useState<string>('');
  const [promoVideoCaption, setPromoVideoCaption] = useState<string>('');
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractionMeta, setExtractionMeta] = useState<PosterExtractionResult | null>(null);
  const [lowConfConfirmed, setLowConfConfirmed] = useState<Record<string, boolean>>({});
  const [showOptionalFields, setShowOptionalFields] = useState(false);

  const [title, setTitle] = useState('');
  const [type, setType] = useState<EventType>('Hackathon');
  const [startDatetimeIst, setStartDatetimeIst] = useState('2026-11-26T10:00');
  const [endDatetimeIst, setEndDatetimeIst] = useState('2026-11-26T17:00');
  const [venueName, setVenueName] = useState('');
  const [areaId, setAreaId] = useState(college?.areaId || areas[0]?.id || 'area-gachibowli');
  const [placeId, setPlaceId] = useState<string | undefined>(undefined);
  const [formattedAddress, setFormattedAddress] = useState<string | undefined>(undefined);
  const [lat, setLat] = useState<number | undefined>(undefined);
  const [lng, setLng] = useState<number | undefined>(undefined);
  const [mode, setMode] = useState<EventMode>('In-Person');
  const [audience, setAudience] = useState<'open_to_all' | 'host_college_only'>('open_to_all');
  const [branchesText, setBranchesText] = useState('All');
  const [yearsText, setYearsText] = useState('All');
  const [feeInr, setFeeInr] = useState('0');
  const [capacity, setCapacity] = useState('120');
  const [regDeadlineIst, setRegDeadlineIst] = useState('2026-11-25T23:59');
  const [regLink, setRegLink] = useState('https://connectus.in/register/club-event');
  const [description, setDescription] = useState('');
  const [teamSize, setTeamSize] = useState('');
  const [rulesText, setRulesText] = useState('');
  const [prizesText, setPrizesText] = useState('');
  const [prerequisitesText, setPrerequisitesText] = useState('');
  const [coordinatorName, setCoordinatorName] = useState(activeOrg.contactName || '');
  const [coordinatorRole, setCoordinatorRole] = useState(activeOrg.designation || 'Club Lead');
  const [coordinatorPhone, setCoordinatorPhone] = useState('');
  const [coordinatorEmail, setCoordinatorEmail] = useState(activeOrg.email || '');
  const [upiId, setUpiId] = useState('');
  const [googleFormUrl, setGoogleFormUrl] = useState('');
  const [whatsappGroupUrl, setWhatsappGroupUrl] = useState('');
  const [telegramGroupUrl, setTelegramGroupUrl] = useState('');
  const [schedule, setSchedule] = useState<EventScheduleDay[]>([]);

  const [duplicateWarning, setDuplicateWarning] = useState<CampusEvent | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formNotice, setFormNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Published event edit & check-in state
  const [editingLiveId, setEditingLiveId] = useState<string | null>(null);
  const [liveTitle, setLiveTitle] = useState('');
  const [liveVenue, setLiveVenue] = useState('');
  const [liveFormattedAddress, setLiveFormattedAddress] = useState('');
  const [liveDesc, setLiveDesc] = useState('');
  const [liveFee, setLiveFee] = useState('0');
  const [liveCapacity, setLiveCapacity] = useState('100');
  const [liveMode, setLiveMode] = useState<EventMode>('In-Person');
  const [liveStartIst, setLiveStartIst] = useState('');
  const [liveEndIst, setLiveEndIst] = useState('');
  const [liveDeadlineIst, setLiveDeadlineIst] = useState('');
  const [liveRegLink, setLiveRegLink] = useState('');
  const [liveTeamSize, setLiveTeamSize] = useState('');
  const [liveRulesText, setLiveRulesText] = useState('');
  const [livePrizesText, setLivePrizesText] = useState('');
  const [livePrerequisitesText, setLivePrerequisitesText] = useState('');
  const [liveSchedule, setLiveSchedule] = useState<EventScheduleDay[]>([]);
  const [liveEditBusy, setLiveEditBusy] = useState(false);
  const [liveMessage, setLiveMessage] = useState<string | null>(null);
  const [checkInEventId, setCheckInEventId] = useState<string | null>(null);
  const [expandedTimelineIds, setExpandedTimelineIds] = useState<Record<string, boolean>>({});

  const submissionEvents = useMemo(
    () =>
      clubEvents.filter((e) =>
        ['draft', 'pending_review', 'changes_requested', 'rejected'].includes(e.status)
      ),
    [clubEvents]
  );

  const filteredSubmissions = useMemo(
    () =>
      submissionFilter === 'all'
        ? submissionEvents
        : submissionEvents.filter((e) => e.status === submissionFilter),
    [submissionEvents, submissionFilter]
  );

  const publishedEvents = useMemo(
    () => clubEvents.filter((e) => e.status === 'published' || e.status === 'cancelled'),
    [clubEvents]
  );

  const clubEventIds = useMemo(() => new Set(clubEvents.map((e) => e.id)), [clubEvents]);

  const clubFeedback = useMemo(
    () =>
      eventFeedback
        .filter((f) => clubEventIds.has(f.eventId) || f.clubId === activeOrg.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [eventFeedback, clubEventIds, activeOrg.id]
  );

  const feedbackEventList = useMemo(() => {
    const eventsWithFeedbackOrPublished = clubEvents.filter(
      (e) =>
        e.status === 'published' ||
        e.status === 'cancelled' ||
        clubFeedback.some((f) => f.eventId === e.id)
    );
    return [...eventsWithFeedbackOrPublished].sort((a, b) => {
      const aCount = clubFeedback.filter((f) => f.eventId === a.id).length;
      const bCount = clubFeedback.filter((f) => f.eventId === b.id).length;
      if (aCount !== bCount) return bCount - aCount;
      return b.startAt.localeCompare(a.startAt);
    });
  }, [clubEvents, clubFeedback]);

  const selectedFeedbackEvent = useMemo(
    () => feedbackEventList.find((e) => e.id === selectedFeedbackEventId) || null,
    [feedbackEventList, selectedFeedbackEventId]
  );

  const selectedEventFeedback = useMemo(
    () =>
      selectedFeedbackEvent
        ? clubFeedback.filter((f) => f.eventId === selectedFeedbackEvent.id)
        : [],
    [clubFeedback, selectedFeedbackEvent]
  );

  const draftCount = clubEvents.filter((e) => e.status === 'draft').length;
  const pendingCount = clubEvents.filter((e) => e.status === 'pending_review').length;
  const changesCount = clubEvents.filter((e) => e.status === 'changes_requested').length;

  async function handleRunClubFeedbackAnalysis(eventId?: string) {
    if (!onAnalyzeClubFeedback) return;
    setAnalysisError(null);
    setAnalyzingFeedback(true);
    try {
      const report = await onAnalyzeClubFeedback(eventId || selectedFeedbackEventId || undefined);
      setFeedbackReport(report);
    } catch (err) {
      setAnalysisError(
        err instanceof Error ? err.message : 'Could not run AI feedback analysis for this event.'
      );
    } finally {
      setAnalyzingFeedback(false);
    }
  }

  function resetDraftForm() {
    setEditingDraftId(null);
    setPosterPreview('');
    setPromoVideoUrl('');
    setPromoVideoCaption('');
    setExtractionMeta(null);
    setLowConfConfirmed({});
    setDuplicateWarning(null);
    setTitle('');
    setType('Hackathon');
    setVenueName('');
    setPlaceId(undefined);
    setFormattedAddress(undefined);
    setLat(undefined);
    setLng(undefined);
    setDescription('');
    setFeeInr('0');
    setCapacity('120');
    setBranchesText('All');
    setYearsText('All');
    setRulesText('');
    setPrizesText('');
    setPrerequisitesText('');
    setTeamSize('');
    setUpiId('');
    setGoogleFormUrl('');
    setWhatsappGroupUrl('');
    setTelegramGroupUrl('');
    setSchedule([]);
    setCoordinatorName(activeOrg.contactName || '');
    setCoordinatorRole(activeOrg.designation || 'Club Lead');
    setCoordinatorPhone('');
    setCoordinatorEmail(activeOrg.email || '');
    setFormError(null);
    setFormNotice(null);
  }

  function loadDraftIntoForm(evt: CampusEvent) {
    setEditingDraftId(evt.id);
    setPosterPreview(evt.posterUrl || DEFAULT_POSTER);
    setPromoVideoUrl(evt.promoVideoUrl || '');
    setPromoVideoCaption(evt.promoVideoCaption || '');
    setTitle(evt.title);
    setType(evt.type);
    setStartDatetimeIst(utcIsoToIstInput(evt.startAt));
    setEndDatetimeIst(utcIsoToIstInput(evt.endAt));
    setRegDeadlineIst(utcIsoToIstInput(evt.regDeadline));
    setVenueName(evt.venueName);
    setAreaId(evt.areaId);
    setPlaceId(evt.placeId);
    setFormattedAddress(evt.formattedAddress);
    setLat(evt.lat);
    setLng(evt.lng);
    setMode(evt.mode);
    setAudience(evt.audience);
    setBranchesText(evt.branches.join(', '));
    setYearsText(evt.years.join(', '));
    setFeeInr(String(evt.feeInr));
    setCapacity(String(evt.capacity));
    setRegLink(evt.regLink);
    setDescription(evt.description);
    setTeamSize(evt.teamSize || '');
    setRulesText((evt.rules || []).join('\n'));
    setPrizesText((evt.prizesAndPerks || []).join('\n'));
    setPrerequisitesText((evt.prerequisites || []).join('\n'));
    setSchedule(
      evt.schedule
        ? evt.schedule.map((d) => ({
            dayLabel: d.dayLabel,
            items: d.items.map((i) => ({ ...i })),
          }))
        : []
    );
    setCoordinatorName(evt.coordinatorContact?.name || activeOrg.contactName || '');
    setCoordinatorRole(evt.coordinatorContact?.role || activeOrg.designation || 'Club Lead');
    setCoordinatorPhone(evt.coordinatorContact?.phone || '');
    setCoordinatorEmail(evt.coordinatorContact?.email || activeOrg.email || '');
    setUpiId(evt.paymentInfo?.upiId || '');
    setGoogleFormUrl(evt.googleFormUrl || '');
    setWhatsappGroupUrl(evt.whatsappGroupUrl || '');
    setTelegramGroupUrl(evt.telegramGroupUrl || '');
    setExtractionMeta(null);
    setLowConfConfirmed({});
    setFormError(null);
    setFormNotice(null);
    setShowOptionalFields(
      Boolean(
        evt.teamSize ||
          (evt.rules && evt.rules.length > 0) ||
          (evt.prizesAndPerks && evt.prizesAndPerks.length > 0) ||
          (evt.prerequisites && evt.prerequisites.length > 0) ||
          (evt.schedule && evt.schedule.length > 0) ||
          evt.paymentInfo?.upiId ||
          evt.googleFormUrl ||
          evt.whatsappGroupUrl ||
          evt.telegramGroupUrl ||
          evt.promoVideoUrl
      )
    );
    setSection('create');
  }

  function applyExtraction(data: PosterExtractionResult, posterUrl: string) {
    setPosterPreview(posterUrl);
    setExtractionMeta(data);
    setLowConfConfirmed({});
    if (data.title) setTitle(data.title);
    if (data.type) setType(data.type);
    if (data.start_datetime_ist) setStartDatetimeIst(data.start_datetime_ist);
    if (data.end_datetime_ist) setEndDatetimeIst(data.end_datetime_ist);
    if (data.venue_name) setVenueName(data.venue_name);
    if (data.mode) setMode(data.mode);
    if (data.audience) setAudience(data.audience);
    if (data.branches?.length) setBranchesText(data.branches.join(', '));
    if (data.years?.length) setYearsText(data.years.join(', '));
    if (typeof data.fee_inr === 'number') setFeeInr(String(data.fee_inr));
    if (typeof data.capacity === 'number') setCapacity(String(data.capacity));
    if (data.registration_deadline_ist) setRegDeadlineIst(data.registration_deadline_ist);
    if (data.registration_link) setRegLink(data.registration_link);
    if (data.description) setDescription(data.description);
    if (data.area_guess) {
      const matched = areas.find(
        (a) =>
          a.name.toLowerCase().includes(data.area_guess!.toLowerCase()) ||
          data.area_guess!.toLowerCase().includes(a.name.split('/')[0].trim().toLowerCase())
      );
      if (matched) setAreaId(matched.id);
    }
  }

  async function handleUploadPosterFile(file: File | undefined) {
    if (!file) return;
    setExtractError(null);
    setFormError(null);
    try {
      const stripped = await resizeAndStripPoster(file);
      setExtracting(true);
      const result = await onExtractPoster({
        imageDataUrl: stripped,
        organizerCollegeId: activeOrg.collegeId,
      });
      applyExtraction(result, stripped);
    } catch (err) {
      setExtractError(
        err instanceof Error ? err.message : 'AI extraction failed. Fill details manually.'
      );
    } finally {
      setExtracting(false);
    }
  }

  async function handleSamplePoster(sample: SamplePosterItem) {
    setExtractError(null);
    setFormError(null);
    setExtracting(true);
    try {
      const result = await onExtractPoster({
        samplePosterId: sample.id,
        organizerCollegeId: activeOrg.collegeId,
      });
      applyExtraction(result, sample.imagePath);
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : 'Sample extraction failed.');
      setPosterPreview(sample.imagePath);
    } finally {
      setExtracting(false);
    }
  }

  async function handleVideoChange(file: File | undefined) {
    if (!file) return;
    setVideoError(null);
    setUploadingVideo(true);
    try {
      const url = await onUploadPromoVideo(file);
      setPromoVideoUrl(url);
    } catch (err) {
      setVideoError(err instanceof Error ? err.message : 'Could not upload promo video.');
    } finally {
      setUploadingVideo(false);
    }
  }

  const lowConfidenceKeys = extractionMeta
    ? Object.entries(extractionMeta.confidence || {})
        .filter(([, score]) => typeof score === 'number' && score < 0.7)
        .map(([key]) => key)
    : [];

  const allLowConfConfirmed = lowConfidenceKeys.every((k) => lowConfConfirmed[k]);

  async function submitDraftOrReview(saveAsDraft: boolean, ignoreDuplicate = false) {
    setFormError(null);
    setFormNotice(null);
    if (!title.trim() || !venueName.trim()) {
      setFormError('Title and venue name are required.');
      return;
    }
    if (!saveAsDraft && lowConfidenceKeys.length > 0 && !allLowConfConfirmed) {
      setFormError('Confirm all amber low-confidence AI fields before submitting to Campus Official.');
      return;
    }

    if (!saveAsDraft && !ignoreDuplicate && !editingDraftId) {
      const dup = await onCheckDuplicate({
        title: title.trim(),
        collegeId: activeOrg.collegeId,
        startDatetimeIst,
      });
      if (dup) {
        setDuplicateWarning(dup);
        return;
      }
    }

    setSubmitting(true);
    try {
      await onPublishEvent({
        title: title.trim(),
        description: description.trim() || `${type} hosted by ${activeOrg.clubName}`,
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
        audience,
        branches: branchesText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        years: yearsText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        feeInr: Number(feeInr) || 0,
        capacity: Math.max(10, Number(capacity) || 100),
        regDeadlineIst,
        regLink: regLink.trim() || 'https://connectus.in/register',
        googleFormUrl: googleFormUrl.trim() || undefined,
        whatsappGroupUrl: whatsappGroupUrl.trim() || undefined,
        telegramGroupUrl: telegramGroupUrl.trim() || undefined,
        paymentInfo: upiId.trim() ? { upiId: upiId.trim() } : undefined,
        rules: rulesText
          .split('\n')
          .map((r) => r.trim())
          .filter(Boolean),
        prizesAndPerks: prizesText
          .split('\n')
          .map((p) => p.trim())
          .filter(Boolean),
        prerequisites: prerequisitesText
          .split('\n')
          .map((p) => p.trim())
          .filter(Boolean),
        schedule: schedule.length > 0 ? schedule : undefined,
        teamSize: teamSize.trim() || undefined,
        coordinatorContact: coordinatorName.trim()
          ? {
              name: coordinatorName.trim(),
              role: coordinatorRole.trim() || undefined,
              phone: coordinatorPhone.trim() || undefined,
              email: coordinatorEmail.trim() || undefined,
            }
          : undefined,
        posterUrl: posterPreview || DEFAULT_POSTER,
        promoVideoUrl: promoVideoUrl || undefined,
        promoVideoCaption: promoVideoCaption.trim() || undefined,
        aiConfidence: extractionMeta?.confidence,
        ignoreDuplicate: true,
        saveAsDraft,
        draftEventId: editingDraftId || undefined,
        organizerId: activeOrg.id,
      });

      resetDraftForm();
      setSection('submissions');
      setFormNotice(
        saveAsDraft
          ? 'Draft saved privately in My Club. Submit to Campus Official when ready.'
          : 'Submitted to Campus Official review queue. Live feed updates once approved.'
      );
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save event.');
    } finally {
      setSubmitting(false);
    }
  }

  function startEditingLiveEvent(evt: CampusEvent) {
    setEditingLiveId(evt.id);
    setLiveTitle(evt.title);
    setLiveVenue(evt.venueName);
    setLiveFormattedAddress(evt.formattedAddress || '');
    setLiveDesc(evt.description);
    setLiveFee(String(evt.feeInr));
    setLiveCapacity(String(evt.capacity));
    setLiveMode(evt.mode);
    setLiveStartIst(utcIsoToIstInput(evt.startAt));
    setLiveEndIst(utcIsoToIstInput(evt.endAt));
    setLiveDeadlineIst(utcIsoToIstInput(evt.regDeadline));
    setLiveRegLink(evt.regLink);
    setLiveTeamSize(evt.teamSize || '');
    setLiveRulesText((evt.rules || []).join('\n'));
    setLivePrizesText((evt.prizesAndPerks || []).join('\n'));
    setLivePrerequisitesText((evt.prerequisites || []).join('\n'));
    setLiveSchedule(
      evt.schedule
        ? evt.schedule.map((d) => ({
            dayLabel: d.dayLabel,
            items: d.items.map((i) => ({ ...i })),
          }))
        : []
    );
    setLiveMessage(null);
  }

  async function submitLiveEdit(e: React.FormEvent, evt: CampusEvent) {
    e.preventDefault();
    setLiveEditBusy(true);
    setLiveMessage(null);
    const splitLines = (raw: string) =>
      raw
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
    try {
      await onUpdateEvent(evt.id, {
        action: 'edit',
        title: liveTitle.trim(),
        venueName: liveVenue.trim(),
        formattedAddress: liveFormattedAddress.trim() || undefined,
        description: liveDesc.trim(),
        feeInr: Number(liveFee) || 0,
        capacity: Math.max(10, Number(liveCapacity) || evt.capacity),
        mode: liveMode,
        startDatetimeIst: liveStartIst,
        endDatetimeIst: liveEndIst,
        regDeadlineIst: liveDeadlineIst,
        regLink: liveRegLink.trim(),
        teamSize: liveTeamSize.trim() || undefined,
        rules: splitLines(liveRulesText),
        prizesAndPerks: splitLines(livePrizesText),
        prerequisites: splitLines(livePrerequisitesText),
        schedule: liveSchedule,
      });
      setEditingLiveId(null);
      setLiveMessage(
        'Saved. Material changes (title, venue, dates, fee, capacity, or link) are queued for Campus Official approval before updating the live student card.'
      );
    } catch (err) {
      setLiveMessage(err instanceof Error ? err.message : 'Could not update event.');
    } finally {
      setLiveEditBusy(false);
    }
  }

  const firstReturnedEvent = submissionEvents.find((e) => e.status === 'changes_requested');

  return (
    <div className="space-y-6">
      {/* Clean Editorial Club Studio Header */}
      <section className="pb-5 border-b border-[var(--border-warm)] flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-[-0.04em] text-[var(--ink)] truncate">
            {activeOrg.clubName}
          </h1>
          <div className="text-xs sm:text-sm text-[var(--ink-2)] font-medium">
            {activeOrg.contactName}
          </div>
          <div className="pt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono tabular-nums text-[var(--ink-2)]">
            <button
              type="button"
              onClick={() => {
                setSubmissionFilter('all');
                setSection('submissions');
              }}
              className="hover:text-[var(--ink)] transition-colors"
            >
              Drafts &amp; Updates:{' '}
              <strong className="text-[var(--ink)]">{draftCount + changesCount}</strong>
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => {
                setSubmissionFilter('pending_review');
                setSection('submissions');
              }}
              className="hover:text-[var(--ink)] transition-colors"
            >
              In Review: <strong className="text-[var(--amber-ink)]">{pendingCount}</strong>
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setSection('performance')}
              className="hover:text-[var(--ink)] transition-colors"
            >
              Live Events: <strong className="text-[var(--olive)]">{publishedEvents.length}</strong>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              resetDraftForm();
              setSection('create');
            }}
            className="paper-btn-crimson min-h-[40px] px-4 py-2 text-xs uppercase tracking-[0.06em] inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Event Draft</span>
          </button>
        </div>
      </section>

      {/* Workspace Segmented Nav */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="paper-segment overflow-x-auto max-w-full">
          <button
            type="button"
            aria-pressed={section === 'submissions'}
            onClick={() => setSection('submissions')}
            className="paper-segment-btn min-h-[38px] px-4 py-1.5 text-xs sm:text-sm whitespace-nowrap tabular-nums"
          >
            Submissions ({submissionEvents.length})
          </button>
          <button
            type="button"
            aria-pressed={section === 'create'}
            onClick={() => setSection('create')}
            className="paper-segment-btn min-h-[38px] px-4 py-1.5 text-xs sm:text-sm whitespace-nowrap"
          >
            {editingDraftId ? 'Editing Draft' : 'Create Draft'}
          </button>
          <button
            type="button"
            aria-pressed={section === 'performance'}
            onClick={() => setSection('performance')}
            className="paper-segment-btn min-h-[38px] px-4 py-1.5 text-xs sm:text-sm whitespace-nowrap tabular-nums"
          >
            Live Events ({publishedEvents.length})
          </button>
          <button
            type="button"
            aria-pressed={section === 'feedback'}
            onClick={() => setSection('feedback')}
            className="paper-segment-btn min-h-[38px] px-4 py-1.5 text-xs sm:text-sm whitespace-nowrap tabular-nums"
          >
            Feedbacks ({clubFeedback.length})
          </button>
        </div>

        {onBackToStudent && (
          <button
            type="button"
            onClick={onBackToStudent}
            className="hidden md:inline-flex text-xs font-semibold text-[var(--ink-2)] hover:text-[var(--crimson)] underline underline-offset-4"
          >
            Switch to Student Feed
          </button>
        )}
      </div>

      {firstReturnedEvent && section !== 'create' && (
        <div className="p-3.5 border border-[var(--amber-border)] bg-[var(--amber-tint)] rounded-[12px] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start sm:items-center gap-2 text-[var(--amber-ink)]">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 sm:mt-0" />
            <span>
              <strong>Changes requested</strong> on &ldquo;{firstReturnedEvent.title}&rdquo;
              {firstReturnedEvent.submissionFeedback
                ? `: ${firstReturnedEvent.submissionFeedback}`
                : '.'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => loadDraftIntoForm(firstReturnedEvent)}
            className="paper-btn-ink min-h-[34px] px-3 py-1 text-xs shrink-0 self-start sm:self-center"
          >
            Edit &amp; Resubmit
          </button>
        </div>
      )}

      {formNotice && (
        <div className="p-3.5 border border-[var(--olive-border)] bg-[var(--olive-tint)] text-xs font-medium text-[var(--ink)] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[var(--olive)] shrink-0" />
          <span>{formNotice}</span>
        </div>
      )}

      {liveMessage && (
        <div className="p-3.5 border border-[var(--olive-border)] bg-[var(--olive-tint)] text-xs font-medium text-[var(--ink)] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[var(--olive)] shrink-0" />
          <span>{liveMessage}</span>
        </div>
      )}

      {/* SECTION 1: CREATE / EDIT DRAFT */}
      {section === 'create' && (
        <section className="paper-card p-5 sm:p-7 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border-warm)]">
            <div>
              <h2 className="font-display text-xl font-extrabold text-[var(--ink)]">
                {editingDraftId ? 'Edit & Resubmit Event Draft' : 'Create Club Event Draft'}
              </h2>
              <p className="text-xs text-[var(--ink-2)]">
                Upload a poster to auto-fill with AI or enter details directly. Drafts stay private until submitted to your Campus Official.
              </p>
            </div>
            {editingDraftId && (
              <button
                type="button"
                onClick={resetDraftForm}
                className="paper-btn-secondary min-h-[34px] px-3 py-1 text-xs shrink-0 self-start sm:self-auto"
              >
                Start Fresh Draft
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Poster Upload + Preview */}
            <div className="lg:col-span-4 space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  void handleUploadPosterFile(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                disabled={extracting}
                onClick={() => fileInputRef.current?.click()}
                className="w-full p-5 border border-dashed border-[var(--border-ink)] bg-[var(--paper-dashed)] rounded-[14px] text-center space-y-2 hover:bg-[var(--paper-raised)] transition-colors"
              >
                {extracting ? (
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--crimson)] mx-auto" />
                ) : (
                  <UploadCloud className="w-6 h-6 text-[var(--crimson)] mx-auto" />
                )}
                <div className="font-display font-bold text-sm text-[var(--ink)]">
                  {extracting
                    ? 'Extracting Fields with AI...'
                    : posterPreview
                      ? 'Replace Poster Image'
                      : 'Upload Poster for AI Auto-Fill'}
                </div>
                <div className="text-[11px] text-[var(--ink-2)]">
                  JPG, PNG, WEBP · Auto-extracts title, time, venue &amp; fee
                </div>
              </button>

              {samplePosters.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-2)]">
                    Or Try Sample Poster
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {samplePosters.slice(0, 4).map((sp) => (
                      <button
                        key={sp.id}
                        type="button"
                        disabled={extracting}
                        onClick={() => void handleSamplePoster(sp)}
                        className="paper-btn-secondary min-h-[34px] px-2.5 py-1 text-[11px] inline-flex items-center gap-1 justify-start truncate"
                      >
                        <FileImage className="w-3 h-3 text-[var(--crimson)] shrink-0" />
                        <span className="truncate">{sp.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {extractError && (
                <div className="p-3 border border-[var(--amber-border)] bg-[var(--amber-tint)] text-xs text-[var(--amber-ink)]">
                  {extractError}
                </div>
              )}

              {posterPreview && (
                <div className="p-2.5 border border-[var(--border-warm)] rounded-[12px] bg-[var(--paper-raised)] flex justify-center">
                  <PosterImage
                    src={posterPreview}
                    alt="Draft poster preview"
                    title={title || 'Club Poster'}
                    className="max-h-60 object-contain rounded-[6px]"
                  />
                </div>
              )}
            </div>

            {/* Right Column: Structured Editable Form */}
            <div className="lg:col-span-8 space-y-5">
              {lowConfidenceKeys.length > 0 && (
                <div className="p-3.5 border border-[var(--amber-border)] bg-[var(--amber-tint)] rounded-[10px] space-y-2">
                  <div className="text-xs font-bold text-[var(--amber-ink)] flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Confirm Low-Confidence AI Fields Before Submitting</span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {lowConfidenceKeys.map((key) => (
                      <label key={key} className="flex items-center gap-1.5 text-xs text-[var(--ink)] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(lowConfConfirmed[key])}
                          onChange={(e) =>
                            setLowConfConfirmed((prev) => ({
                              ...prev,
                              [key]: e.target.checked,
                            }))
                          }
                          className="accent-[var(--crimson)]"
                        />
                        <span>Verified {key.replace(/_/g, ' ')}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--crimson)]">
                  1 · Core Event Details
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--ink-2)] mb-1">
                    Event Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. ACM Systems Hackathon 2026"
                    className="paper-input w-full min-h-[40px] px-3 py-1.5 text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--ink-2)] mb-1">
                      Category
                    </label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value as EventType)}
                      className="paper-input w-full min-h-[38px] px-2.5 py-1.5 text-xs"
                    >
                      {(['Hackathon', 'Workshop', 'Talk', 'Cultural', 'Competition', 'Meetup'] as const).map(
                        (t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--ink-2)] mb-1">
                      Format / Mode
                    </label>
                    <select
                      value={mode}
                      onChange={(e) => setMode(e.target.value as EventMode)}
                      className="paper-input w-full min-h-[38px] px-2.5 py-1.5 text-xs"
                    >
                      <option value="In-Person">In-Person</option>
                      <option value="Hybrid">Hybrid</option>
                      <option value="Online">Online</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--ink-2)] mb-1">
                      Visibility Audience
                    </label>
                    <select
                      value={audience}
                      onChange={(e) => setAudience(e.target.value as 'open_to_all' | 'host_college_only')}
                      className="paper-input w-full min-h-[38px] px-2.5 py-1.5 text-xs"
                    >
                      <option value="open_to_all">Open to All Colleges</option>
                      <option value="host_college_only">{college?.shortName || 'Host'} Only</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--ink-2)] mb-1">
                    Description &amp; Highlights
                  </label>
                  <textarea
                    rows={3}
                    maxLength={1500}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What will students build, learn, or win? Mention speakers, tracks, and perks."
                    className="paper-input w-full p-2.5 text-xs resize-none"
                  />
                </div>

                <div className="pt-3 border-t border-[var(--border-warm)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--crimson)]">
                  2 · Schedule, Venue &amp; Capacity
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--ink-2)] mb-1">
                      Venue / Auditorium *
                    </label>
                    <input
                      type="text"
                      value={venueName}
                      onChange={(e) => setVenueName(e.target.value)}
                      placeholder="e.g. Himalaya Block Lab 302"
                      className="paper-input w-full min-h-[38px] px-3 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--ink-2)] mb-1">
                      Pin Campus Map Location
                    </label>
                    <PlaceSearchInput
                      initialValue={formattedAddress || venueName}
                      mapsEnabled={mapsEnabled}
                      placeholder="Search auditorium or campus..."
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
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--ink-2)] mb-1">
                      Start (IST)
                    </label>
                    <input
                      type="datetime-local"
                      value={startDatetimeIst}
                      onChange={(e) => setStartDatetimeIst(e.target.value)}
                      className="paper-input w-full min-h-[38px] px-2.5 py-1.5 text-xs font-mono tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--ink-2)] mb-1">
                      End (IST)
                    </label>
                    <input
                      type="datetime-local"
                      value={endDatetimeIst}
                      onChange={(e) => setEndDatetimeIst(e.target.value)}
                      className="paper-input w-full min-h-[38px] px-2.5 py-1.5 text-xs font-mono tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--ink-2)] mb-1">
                      Reg Deadline (IST)
                    </label>
                    <input
                      type="datetime-local"
                      value={regDeadlineIst}
                      onChange={(e) => setRegDeadlineIst(e.target.value)}
                      className="paper-input w-full min-h-[38px] px-2.5 py-1.5 text-xs font-mono tabular-nums"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--ink-2)] mb-1">
                      Fee (INR)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={feeInr}
                      onChange={(e) => setFeeInr(e.target.value)}
                      className="paper-input w-full min-h-[38px] px-2.5 py-1.5 text-xs font-mono tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--ink-2)] mb-1">
                      Capacity
                    </label>
                    <input
                      type="number"
                      min={10}
                      value={capacity}
                      onChange={(e) => setCapacity(e.target.value)}
                      className="paper-input w-full min-h-[38px] px-2.5 py-1.5 text-xs font-mono tabular-nums"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-semibold text-[var(--ink-2)] mb-1">
                      Registration URL
                    </label>
                    <input
                      type="url"
                      value={regLink}
                      onChange={(e) => setRegLink(e.target.value)}
                      className="paper-input w-full min-h-[38px] px-2.5 py-1 text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Detailed Event Info: Schedule, Rules, Perks, Entry Prerequisites, Coordinator & Links */}
                <div className="pt-2 border-t border-[var(--border-warm)] space-y-3">
                  <ScheduleBuilder
                    schedule={schedule}
                    onChange={setSchedule}
                    title="3 · Event Agenda / Day-by-Day Schedule (IST)"
                  />

                  <button
                    type="button"
                    onClick={() => setShowOptionalFields((v) => !v)}
                    className="w-full py-2 flex items-center justify-between text-xs font-semibold text-[var(--ink)] hover:text-[var(--crimson)]"
                  >
                    <span>4 · Prizes, Entry Rules, Coordinator Contact &amp; Community Links</span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${showOptionalFields ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {showOptionalFields && (
                    <div className="pt-2 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-[var(--ink-2)] mb-1">
                            Team Size / Format
                          </label>
                          <input
                            type="text"
                            value={teamSize}
                            onChange={(e) => setTeamSize(e.target.value)}
                            placeholder="e.g. Solo or 2–4 members"
                            className="paper-input w-full min-h-[36px] px-2.5 py-1 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[var(--ink-2)] mb-1">
                            Eligible Branches
                          </label>
                          <input
                            type="text"
                            value={branchesText}
                            onChange={(e) => setBranchesText(e.target.value)}
                            placeholder="All, CSE, ECE"
                            className="paper-input w-full min-h-[36px] px-2.5 py-1 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[var(--ink-2)] mb-1">
                            Eligible Years
                          </label>
                          <input
                            type="text"
                            value={yearsText}
                            onChange={(e) => setYearsText(e.target.value)}
                            placeholder="All, 2nd Year, 3rd Year"
                            className="paper-input w-full min-h-[36px] px-2.5 py-1 text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-[var(--ink-2)] mb-1">
                            Rules (1 per line)
                          </label>
                          <textarea
                            rows={2}
                            value={rulesText}
                            onChange={(e) => setRulesText(e.target.value)}
                            placeholder="Carry student ID card..."
                            className="paper-input w-full p-2 text-xs resize-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[var(--ink-2)] mb-1">
                            Prizes &amp; Perks (1 per line)
                          </label>
                          <textarea
                            rows={2}
                            value={prizesText}
                            onChange={(e) => setPrizesText(e.target.value)}
                            placeholder="₹50,000 prize pool..."
                            className="paper-input w-full p-2 text-xs resize-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[var(--ink-2)] mb-1">
                            What to Bring / Prerequisites
                          </label>
                          <textarea
                            rows={2}
                            value={prerequisitesText}
                            onChange={(e) => setPrerequisitesText(e.target.value)}
                            placeholder="College ID + Laptop..."
                            className="paper-input w-full p-2 text-xs resize-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-[var(--ink-2)] mb-1">
                            Coordinator Name
                          </label>
                          <input
                            type="text"
                            value={coordinatorName}
                            onChange={(e) => setCoordinatorName(e.target.value)}
                            className="paper-input w-full min-h-[36px] px-2.5 py-1 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[var(--ink-2)] mb-1">
                            Role
                          </label>
                          <input
                            type="text"
                            value={coordinatorRole}
                            onChange={(e) => setCoordinatorRole(e.target.value)}
                            className="paper-input w-full min-h-[36px] px-2.5 py-1 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[var(--ink-2)] mb-1">
                            Coordinator Phone
                          </label>
                          <input
                            type="tel"
                            value={coordinatorPhone}
                            onChange={(e) => setCoordinatorPhone(e.target.value)}
                            placeholder="+91 98..."
                            className="paper-input w-full min-h-[36px] px-2.5 py-1 text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[var(--ink-2)] mb-1">
                            UPI ID (if paid)
                          </label>
                          <input
                            type="text"
                            value={upiId}
                            onChange={(e) => setUpiId(e.target.value)}
                            placeholder="club@upi"
                            className="paper-input w-full min-h-[36px] px-2.5 py-1 text-xs font-mono"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-[var(--ink-2)] mb-1">
                            Google Form URL
                          </label>
                          <input
                            type="url"
                            value={googleFormUrl}
                            onChange={(e) => setGoogleFormUrl(e.target.value)}
                            placeholder="https://forms.gle/..."
                            className="paper-input w-full min-h-[36px] px-2.5 py-1 text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[var(--ink-2)] mb-1">
                            WhatsApp Group URL
                          </label>
                          <input
                            type="url"
                            value={whatsappGroupUrl}
                            onChange={(e) => setWhatsappGroupUrl(e.target.value)}
                            placeholder="https://chat.whatsapp.com/..."
                            className="paper-input w-full min-h-[36px] px-2.5 py-1 text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[var(--ink-2)] mb-1">
                            Telegram Group URL
                          </label>
                          <input
                            type="url"
                            value={telegramGroupUrl}
                            onChange={(e) => setTelegramGroupUrl(e.target.value)}
                            placeholder="https://t.me/..."
                            className="paper-input w-full min-h-[36px] px-2.5 py-1 text-xs font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[var(--ink-2)] mb-1">
                          Promo Reel Video (MP4/WebM)
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            ref={videoInputRef}
                            type="file"
                            accept="video/mp4,video/webm,video/quicktime"
                            className="hidden"
                            onChange={(e) => {
                              void handleVideoChange(e.target.files?.[0]);
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
                            <span>
                              {uploadingVideo
                                ? 'Uploading...'
                                : promoVideoUrl
                                  ? 'Reel Attached'
                                  : 'Upload Promo Reel'}
                            </span>
                          </button>
                          {videoError && (
                            <span className="text-[11px] text-[var(--crimson)]">{videoError}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {duplicateWarning && (
                  <div className="p-3.5 border border-[var(--amber-border)] bg-[var(--amber-tint)] space-y-2 text-xs">
                    <div className="font-bold text-[var(--amber-ink)]">
                      Possible Duplicate Detected: &ldquo;{duplicateWarning.title}&rdquo;
                    </div>
                    <button
                      type="button"
                      onClick={() => void submitDraftOrReview(false, true)}
                      className="paper-btn-crimson min-h-[34px] px-3 py-1 text-xs"
                    >
                      Confirm &amp; Submit Anyway
                    </button>
                  </div>
                )}

                {formError && (
                  <div className="p-3 border border-[var(--crimson)] bg-[var(--crimson-tint)] text-xs font-medium text-[var(--crimson)]">
                    {formError}
                  </div>
                )}

                <div className="pt-3 border-t border-[var(--border-warm)] flex flex-wrap items-center justify-between gap-2.5">
                  <div className="text-[11px] text-[var(--ink-2)]">
                    Required: Title &amp; Venue · Submits for official review
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    {editingDraftId && (
                      <button
                        type="button"
                        onClick={resetDraftForm}
                        className="paper-btn-secondary min-h-[38px] px-3.5 py-1.5 text-xs"
                      >
                        Cancel Edit
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => void submitDraftOrReview(true)}
                      className="paper-btn-secondary min-h-[40px] px-4 py-2 text-xs uppercase tracking-[0.05em]"
                    >
                      {submitting ? 'Saving...' : 'Save Private Draft'}
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => void submitDraftOrReview(false)}
                      className="paper-btn-crimson min-h-[40px] px-5 py-2 text-xs uppercase tracking-[0.05em] inline-flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{submitting ? 'Submitting...' : 'Submit for Approval'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* SECTION 2: MY SUBMISSIONS (DRAFTS, PENDING REVIEW, CHANGES REQUESTED, REJECTED) */}
      {section === 'submissions' && (
        <section className="space-y-4">
          {submissionEvents.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  { id: 'all', label: `All (${submissionEvents.length})` },
                  {
                    id: 'draft',
                    label: `Drafts (${submissionEvents.filter((e) => e.status === 'draft').length})`,
                  },
                  {
                    id: 'pending_review',
                    label: `Pending (${submissionEvents.filter((e) => e.status === 'pending_review').length})`,
                  },
                  {
                    id: 'changes_requested',
                    label: `Changes (${submissionEvents.filter((e) => e.status === 'changes_requested').length})`,
                  },
                  {
                    id: 'rejected',
                    label: `Rejected (${submissionEvents.filter((e) => e.status === 'rejected').length})`,
                  },
                ] as { id: SubmissionFilter; label: string }[]
              ).map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setSubmissionFilter(chip.id)}
                  className={`min-h-[34px] px-3 py-1 text-xs font-semibold border transition-colors tabular-nums ${
                    submissionFilter === chip.id
                      ? 'bg-[var(--ink)] text-[var(--paper-app)] border-[var(--ink)]'
                      : 'bg-[var(--paper-raised)] text-[var(--ink-2)] border-[var(--border-warm)] hover:border-[var(--ink)]'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          )}

          {filteredSubmissions.length === 0 ? (
            <div className="paper-card p-8 text-center space-y-3">
              <Clock className="w-8 h-8 text-[var(--crimson)] mx-auto" />
              <h2 className="font-display text-lg font-extrabold text-[var(--ink)]">
                {submissionEvents.length === 0
                  ? 'No Club Drafts or Pending Submissions'
                  : 'No Submissions Match This Filter'}
              </h2>
              <p className="text-xs text-[var(--ink-2)] max-w-md mx-auto">
                Start a draft from any club poster, save privately, and submit to your Campus Official for approval when dates and venue are final.
              </p>
              <button
                type="button"
                onClick={() => {
                  resetDraftForm();
                  setSection('create');
                }}
                className="paper-btn-primary min-h-[38px] px-4 py-1.5 text-xs"
              >
                Create Event Draft
              </button>
            </div>
          ) : (
            <div className="paper-card overflow-hidden divide-y divide-[var(--border-warm)]">
              {filteredSubmissions.map((evt) => {
                const timelineOpen = Boolean(expandedTimelineIds[evt.id]);
                return (
                  <div
                    key={evt.id}
                    className="p-5 flex flex-col md:flex-row md:items-start justify-between gap-4"
                  >
                    <div className="flex gap-4 min-w-0 flex-1">
                      <div className="w-16 sm:w-20 aspect-[3/4] rounded-[8px] border border-[var(--border-ink)] bg-[var(--paper-raised)] overflow-hidden shrink-0">
                        <PosterImage
                          src={evt.posterUrl}
                          alt={evt.title}
                          title={evt.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 space-y-1.5 flex-1">
                        <div className="text-[11px] font-mono uppercase tracking-[0.06em] flex flex-wrap items-center gap-x-2">
                          <span
                            className={`font-bold ${
                              evt.status === 'pending_review'
                                ? 'text-[var(--amber-ink)]'
                                : evt.status === 'changes_requested' || evt.status === 'rejected'
                                  ? 'text-[var(--crimson)]'
                                  : 'text-[var(--ink-2)]'
                            }`}
                          >
                            {evt.status === 'draft'
                              ? 'Private Draft'
                              : evt.status === 'pending_review'
                                ? 'In Official Review'
                                : evt.status === 'changes_requested'
                                  ? 'Changes Requested'
                                  : 'Rejected'}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="text-[var(--ink-2)]">{evt.type}</span>
                          <span aria-hidden="true">·</span>
                          <span className="text-[var(--ink-2)] tabular-nums">
                            {formatIstFull(evt.startAt)} IST
                          </span>
                        </div>

                        <h3 className="font-display text-lg font-extrabold text-[var(--ink)]">
                          {evt.title}
                        </h3>
                        <div className="text-xs text-[var(--ink-2)]">
                          {evt.venueName} · Capacity {evt.capacity} · {evt.mode}
                        </div>

                        {evt.submissionFeedback && (
                          <div className="p-2.5 border border-[var(--amber-border)] bg-[var(--amber-tint)] text-xs text-[var(--amber-ink)] rounded-[8px]">
                            <strong>Official Feedback:</strong> {evt.submissionFeedback}
                          </div>
                        )}

                        {evt.approvalHistory && evt.approvalHistory.length > 0 && (
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedTimelineIds((prev) => ({
                                  ...prev,
                                  [evt.id]: !prev[evt.id],
                                }))
                              }
                              className="text-[11px] font-mono font-semibold text-[var(--crimson)] hover:underline inline-flex items-center gap-1"
                            >
                              <span>
                                {timelineOpen
                                  ? 'Hide Review History'
                                  : `View Review History (${evt.approvalHistory.length})`}
                              </span>
                              <ChevronDown
                                className={`w-3.5 h-3.5 transition-transform ${
                                  timelineOpen ? 'rotate-180' : ''
                                }`}
                              />
                            </button>
                            {timelineOpen && (
                              <ul className="mt-1.5 space-y-1 text-[11px] font-mono text-[var(--ink-2)] pl-2.5 border-l border-[var(--border-warm)]">
                                {evt.approvalHistory.map((h) => (
                                  <li key={h.id} className="flex flex-wrap items-baseline gap-x-2">
                                    <span className="font-semibold text-[var(--ink)]">
                                      {h.decision.replace(/_/g, ' ')}
                                    </span>
                                    <span>by {h.reviewerName}</span>
                                    <span className="text-[10px]">({formatIstFull(h.createdAt)})</span>
                                    {h.note && (
                                      <span className="text-[var(--amber-ink)] font-sans">
                                        — &ldquo;{h.note}&rdquo;
                                      </span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {(evt.status === 'draft' || evt.status === 'changes_requested') && (
                        <>
                          <button
                            type="button"
                            onClick={() => loadDraftIntoForm(evt)}
                            className="paper-btn-secondary min-h-[36px] px-3 py-1.5 text-xs inline-flex items-center gap-1"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit Draft</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => void onUpdateEvent(evt.id, { action: 'submit' })}
                            className="paper-btn-crimson min-h-[36px] px-3.5 py-1.5 text-xs inline-flex items-center gap-1"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Submit to Official</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* SECTION 3: EVENT PERFORMANCE (OWN CLUB PUBLISHED EVENTS + METRICS + QR GATE + REVISIONS) */}
      {section === 'performance' && (
        <section className="space-y-4">
          {publishedEvents.length === 0 ? (
            <div className="paper-card p-8 text-center space-y-2">
              <BarChart3 className="w-8 h-8 text-[var(--crimson)] mx-auto" />
              <h2 className="font-display text-lg font-extrabold text-[var(--ink)]">
                No Official-Approved Live Events Yet
              </h2>
              <p className="text-xs text-[var(--ink-2)] max-w-md mx-auto">
                Once your Campus Official approves a submitted draft, your live event performance metrics, view counts, QR gate check-in, and revision workflows appear here.
              </p>
            </div>
          ) : (
            <div className="paper-card overflow-hidden divide-y divide-[var(--border-warm)]">
              {publishedEvents.map((evt) => {
                const evtRegs = registrations.filter(
                  (r) => r.eventId === evt.id && r.status !== 'cancelled'
                );
                const pendingPaymentCount = evtRegs.filter(
                  (r) => r.paymentStatus === 'pending_verification'
                ).length;
                const checkedInCount = evtRegs.filter((r) => r.status === 'checked_in').length;
                const seatsRemaining = Math.max(0, evt.capacity - evt.confirmedCount);
                const evtReviews = clubFeedback.filter((f) => f.eventId === evt.id);
                const evtAvgRating =
                  evtReviews.length > 0
                    ? evtReviews.reduce((sum, item) => sum + item.rating, 0) / evtReviews.length
                    : null;
                const isEditing = editingLiveId === evt.id;
                const isScannerOpen = checkInEventId === evt.id;

                return (
                  <div key={evt.id} className="p-5 sm:p-6 space-y-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="text-[11px] font-mono uppercase tracking-[0.06em] flex flex-wrap items-center gap-x-2">
                          <span
                            className={`font-bold ${
                              evt.status === 'cancelled'
                                ? 'text-[var(--crimson)]'
                                : 'text-[var(--olive)]'
                            }`}
                          >
                            {evt.status === 'cancelled'
                              ? 'Cancelled'
                              : 'Club Event · Official Approved'}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="text-[var(--ink-2)] tabular-nums">
                            {formatIstFull(evt.startAt)} IST
                          </span>
                          {evt.approvedByName && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-[var(--ink-2)]">
                                Approved by {evt.approvedByName}
                              </span>
                            </>
                          )}
                        </div>
                        <h3 className="font-display text-xl font-extrabold text-[var(--ink)]">
                          {evt.title}
                        </h3>
                        <div className="text-xs font-mono tabular-nums text-[var(--ink-2)] flex flex-wrap items-center gap-x-4 gap-y-1">
                          <span>
                            Confirmed:{' '}
                            <strong className="text-[var(--ink)]">
                              {evt.confirmedCount}/{evt.capacity}
                            </strong>
                          </span>
                          <span>
                            Seats Left: <strong className="text-[var(--ink)]">{seatsRemaining}</strong>
                          </span>
                          <span>
                            Waitlisted:{' '}
                            <strong className="text-[var(--ink)]">{evt.waitlistCount}</strong>
                          </span>
                          <span>
                            Checked In:{' '}
                            <strong className="text-[var(--olive)]">{checkedInCount}</strong>
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5 text-[var(--crimson)]" />
                            Views:{' '}
                            <strong className="text-[var(--ink)]">{evt.viewCount ?? 0}</strong>
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 text-[var(--amber-ink)]" />
                            Rating:{' '}
                            <strong className="text-[var(--ink)]">
                              {evtAvgRating !== null
                                ? `${evtAvgRating.toFixed(1)}/5 (${evtReviews.length})`
                                : 'No reviews'}
                            </strong>
                          </span>
                          {pendingPaymentCount > 0 && (
                            <span>
                              Pending Fees:{' '}
                              <strong className="text-[var(--amber-ink)]">
                                {pendingPaymentCount}
                              </strong>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {pendingPaymentCount > 0 && !isScannerOpen && (
                          <button
                            type="button"
                            onClick={() => setCheckInEventId(evt.id)}
                            className="min-h-[36px] px-3 py-1.5 text-xs font-semibold border border-[var(--amber-border)] bg-[var(--amber-tint)] hover:bg-[var(--feel-tint)] text-[var(--amber-ink)]"
                          >
                            Verify {pendingPaymentCount} Pending Fee(s)
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setCheckInEventId(isScannerOpen ? null : evt.id)}
                          className={`min-h-[36px] px-3.5 py-1.5 text-xs ${
                            isScannerOpen ? 'paper-btn-ink' : 'paper-btn-primary'
                          }`}
                        >
                          {isScannerOpen ? 'Hide QR Check-In' : 'QR Gate & Roster'}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            isEditing ? setEditingLiveId(null) : startEditingLiveEvent(evt)
                          }
                          className="paper-btn-secondary min-h-[36px] px-3.5 py-1.5 text-xs inline-flex items-center gap-1"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>{isEditing ? 'Close Edit' : 'Edit Event'}</span>
                        </button>
                      </div>
                    </div>

                    {evt.revisionPendingReview && evt.pendingRevision && (
                      <div className="p-3 border border-[var(--amber-border)] bg-[var(--amber-tint)] rounded-[10px] text-xs text-[var(--amber-ink)]">
                        <strong>Live Revision Pending Official Approval:</strong> Updated{' '}
                        {evt.pendingRevision.changedFields.join(', ')}. Live student card stays unchanged until your Campus Official approves.
                      </div>
                    )}

                    {isEditing && (
                      <form
                        onSubmit={(e) => void submitLiveEdit(e, evt)}
                        className="p-4 border border-[var(--border-ink)] rounded-[12px] bg-[var(--paper-raised)] space-y-3"
                      >
                        <div className="text-xs text-[var(--amber-ink)] font-medium">
                          Material edits (title, venue, schedule, deadline, fee, capacity, mode, registration link) go through Campus Official re-approval before updating the live student card.
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <input
                            type="text"
                            required
                            value={liveTitle}
                            onChange={(e) => setLiveTitle(e.target.value)}
                            placeholder="Event Title"
                            className="paper-input min-h-[36px] px-3 py-1 text-xs"
                          />
                          <input
                            type="text"
                            required
                            value={liveVenue}
                            onChange={(e) => setLiveVenue(e.target.value)}
                            placeholder="Venue Name"
                            className="paper-input min-h-[36px] px-3 py-1 text-xs"
                          />
                        </div>
                        <input
                          type="text"
                          value={liveFormattedAddress}
                          onChange={(e) => setLiveFormattedAddress(e.target.value)}
                          placeholder="Gate Address / Block Landmark"
                          className="paper-input w-full min-h-[36px] px-3 py-1 text-xs"
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <input
                            type="datetime-local"
                            value={liveStartIst}
                            onChange={(e) => setLiveStartIst(e.target.value)}
                            className="paper-input min-h-[36px] px-2.5 py-1 text-xs font-mono"
                          />
                          <input
                            type="datetime-local"
                            value={liveEndIst}
                            onChange={(e) => setLiveEndIst(e.target.value)}
                            className="paper-input min-h-[36px] px-2.5 py-1 text-xs font-mono"
                          />
                          <input
                            type="datetime-local"
                            value={liveDeadlineIst}
                            onChange={(e) => setLiveDeadlineIst(e.target.value)}
                            className="paper-input min-h-[36px] px-2.5 py-1 text-xs font-mono"
                          />
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <input
                            type="number"
                            min={0}
                            value={liveFee}
                            onChange={(e) => setLiveFee(e.target.value)}
                            placeholder="Fee INR"
                            className="paper-input min-h-[36px] px-2.5 py-1 text-xs font-mono"
                          />
                          <input
                            type="number"
                            min={10}
                            value={liveCapacity}
                            onChange={(e) => setLiveCapacity(e.target.value)}
                            placeholder="Capacity"
                            className="paper-input min-h-[36px] px-2.5 py-1 text-xs font-mono"
                          />
                          <select
                            value={liveMode}
                            onChange={(e) => setLiveMode(e.target.value as EventMode)}
                            className="paper-input min-h-[36px] px-2.5 py-1 text-xs"
                          >
                            <option value="In-Person">In-Person</option>
                            <option value="Hybrid">Hybrid</option>
                            <option value="Online">Online</option>
                          </select>
                          <input
                            type="text"
                            value={liveTeamSize}
                            onChange={(e) => setLiveTeamSize(e.target.value)}
                            placeholder="Team Size"
                            className="paper-input min-h-[36px] px-2.5 py-1 text-xs"
                          />
                        </div>
                        <textarea
                          rows={3}
                          maxLength={1500}
                          value={liveDesc}
                          onChange={(e) => setLiveDesc(e.target.value)}
                          placeholder="Full event description..."
                          className="paper-input w-full p-2.5 text-xs resize-none"
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <textarea
                            rows={2}
                            value={liveRulesText}
                            onChange={(e) => setLiveRulesText(e.target.value)}
                            placeholder="Rules (1 per line)"
                            className="paper-input w-full p-2 text-xs resize-none"
                          />
                          <textarea
                            rows={2}
                            value={livePrizesText}
                            onChange={(e) => setLivePrizesText(e.target.value)}
                            placeholder="Prizes & perks (1 per line)"
                            className="paper-input w-full p-2 text-xs resize-none"
                          />
                          <textarea
                            rows={2}
                            value={livePrerequisitesText}
                            onChange={(e) => setLivePrerequisitesText(e.target.value)}
                            placeholder="What to bring (1 per line)"
                            className="paper-input w-full p-2 text-xs resize-none"
                          />
                        </div>
                        <ScheduleBuilder
                          schedule={liveSchedule}
                          onChange={setLiveSchedule}
                          compact={true}
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingLiveId(null)}
                            className="paper-btn-secondary min-h-[34px] px-3 py-1 text-xs"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={liveEditBusy}
                            className="paper-btn-primary min-h-[34px] px-4 py-1 text-xs"
                          >
                            {liveEditBusy ? 'Saving...' : 'Submit Edit / Revision'}
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
              })}
            </div>
          )}
        </section>
      )}

      {/* SECTION 4: EVENT-FIRST FEEDBACKS */}
      {section === 'feedback' && (
        <section className="space-y-5">
          {!selectedFeedbackEvent ? (
            <>
              <div className="pb-4 border-b border-[var(--border-warm)] flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <h2 className="font-display text-2xl font-extrabold tracking-[-0.03em] text-[var(--ink)]">
                  Feedbacks
                </h2>
                <div className="text-xs font-mono tabular-nums text-[var(--ink-2)]">
                  {clubFeedback.length} {clubFeedback.length === 1 ? 'review' : 'reviews'} across{' '}
                  {feedbackEventList.length} {feedbackEventList.length === 1 ? 'event' : 'events'}
                </div>
              </div>

              {feedbackEventList.length === 0 ? (
                <div className="paper-card p-8 text-center space-y-2">
                  <MessageSquare className="w-7 h-7 text-[var(--crimson)] mx-auto" />
                  <h3 className="font-display text-base font-extrabold text-[var(--ink)]">
                    No Events Published Yet
                  </h3>
                  <p className="text-xs text-[var(--ink-2)]">
                    Publish an event to start collecting student ratings and reviews.
                  </p>
                </div>
              ) : (
                <div className="paper-card overflow-hidden divide-y divide-[var(--border-warm)]">
                  {feedbackEventList.map((evt) => {
                    const evtReviews = clubFeedback.filter((f) => f.eventId === evt.id);
                    const avg =
                      evtReviews.length > 0
                        ? evtReviews.reduce((sum, r) => sum + r.rating, 0) / evtReviews.length
                        : null;
                    return (
                      <button
                        key={evt.id}
                        type="button"
                        onClick={() => {
                          setSelectedFeedbackEventId(evt.id);
                          setFeedbackReport(null);
                          setAnalysisError(null);
                        }}
                        className="w-full p-4 sm:p-5 flex items-center justify-between gap-4 text-left hover:bg-[var(--paper-raised)] transition-colors"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-12 aspect-[3/4] rounded-[8px] overflow-hidden border border-[var(--border-ink)] shrink-0 bg-[var(--feel-tint)]">
                            <PosterImage
                              src={evt.posterUrl}
                              alt={evt.title}
                              title={evt.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0 space-y-1">
                            <div className="font-display font-bold text-base text-[var(--ink)] truncate">
                              {evt.title}
                            </div>
                            <div className="text-xs text-[var(--ink-2)] font-mono tabular-nums">
                              {evt.type} · {formatIstFull(evt.startAt)}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0">
                          <div className="text-right tabular-nums">
                            <div className="font-display text-sm font-extrabold text-[var(--ink)] flex items-center justify-end gap-1">
                              <Star className="w-3.5 h-3.5 text-[var(--amber-ink)] fill-current" />
                              <span>{avg !== null ? avg.toFixed(1) : '—'}</span>
                            </div>
                            <div className="text-[11px] font-mono text-[var(--ink-2)]">
                              {evtReviews.length} {evtReviews.length === 1 ? 'review' : 'reviews'}
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-[var(--ink-2)]" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            (() => {
              const avg =
                selectedEventFeedback.length > 0
                  ? selectedEventFeedback.reduce((sum, r) => sum + r.rating, 0) /
                    selectedEventFeedback.length
                  : null;
              return (
                <div className="space-y-5">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFeedbackEventId(null);
                      setFeedbackReport(null);
                      setAnalysisError(null);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.06em] text-[var(--ink-2)] hover:text-[var(--crimson)]"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>All Events</span>
                  </button>

                  {/* Top Rating Summary Header for Selected Event */}
                  <div className="paper-card p-5 sm:p-6 space-y-5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[var(--border-warm)]">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-14 aspect-[3/4] rounded-[10px] overflow-hidden border border-[var(--border-ink)] shrink-0 bg-[var(--feel-tint)]">
                          <PosterImage
                            src={selectedFeedbackEvent.posterUrl}
                            alt={selectedFeedbackEvent.title}
                            title={selectedFeedbackEvent.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 space-y-1">
                          <h2 className="font-display text-xl sm:text-2xl font-extrabold tracking-[-0.03em] text-[var(--ink)] truncate">
                            {selectedFeedbackEvent.title}
                          </h2>
                          <div className="text-xs font-mono text-[var(--ink-2)] tabular-nums">
                            {formatIstFull(selectedFeedbackEvent.startAt)} · {selectedFeedbackEvent.venueName}
                          </div>
                        </div>
                      </div>

                      {onAnalyzeClubFeedback && (
                        <button
                          type="button"
                          disabled={analyzingFeedback || selectedEventFeedback.length === 0}
                          onClick={() => void handleRunClubFeedbackAnalysis(selectedFeedbackEvent.id)}
                          className="paper-btn-secondary min-h-[38px] px-3.5 py-1.5 text-xs uppercase tracking-[0.05em] inline-flex items-center gap-1.5 shrink-0 self-start md:self-center"
                        >
                          {analyzingFeedback ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5 text-[var(--crimson)]" />
                          )}
                          <span>{analyzingFeedback ? 'Analyzing...' : 'Analyze with AI'}</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
                      <div className="sm:col-span-4 space-y-1">
                        <div className="flex items-baseline gap-2">
                          <span className="font-display text-4xl font-extrabold tracking-[-0.04em] text-[var(--ink)] tabular-nums">
                            {avg !== null ? avg.toFixed(1) : '—'}
                          </span>
                          <span className="text-sm font-mono text-[var(--ink-2)]">/ 5.0</span>
                        </div>
                        <div className="flex items-center gap-1 text-[var(--amber-ink)]">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <Star
                              key={n}
                              className={`w-4 h-4 ${
                                avg !== null && n <= Math.round(avg)
                                  ? 'fill-current'
                                  : 'text-[var(--border-ink)]'
                              }`}
                            />
                          ))}
                        </div>
                        <div className="text-xs font-mono text-[var(--ink-2)] tabular-nums pt-0.5">
                          {selectedEventFeedback.length}{' '}
                          {selectedEventFeedback.length === 1 ? 'review' : 'reviews'}
                        </div>
                      </div>

                      <div className="sm:col-span-8 space-y-1.5">
                        {[5, 4, 3, 2, 1].map((stars) => {
                          const count = selectedEventFeedback.filter((f) => f.rating === stars).length;
                          const pct =
                            selectedEventFeedback.length > 0
                              ? Math.round((count / selectedEventFeedback.length) * 100)
                              : 0;
                          return (
                            <div key={stars} className="flex items-center gap-2.5 text-xs font-mono tabular-nums">
                              <span className="w-7 text-right text-[var(--ink-2)]">{stars}★</span>
                              <div className="flex-1 h-2 bg-[var(--border-warm)] overflow-hidden">
                                <div
                                  className="h-full bg-[var(--amber-ink)]"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="w-8 text-right text-[var(--ink-2)]">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {analysisError && (
                      <div className="p-3 border border-[var(--crimson)] bg-[var(--crimson-tint)] text-xs text-[var(--crimson)] font-medium">
                        {analysisError}
                      </div>
                    )}

                    {feedbackReport && (
                      <div className="p-4 border border-[var(--border-ink)] bg-[var(--paper-raised)] rounded-[12px] space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[var(--border-warm)]">
                          <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-[var(--crimson)] font-bold">
                            AI Summary
                          </span>
                          <div className="flex items-center gap-3 text-xs font-mono tabular-nums">
                            <span className="text-[var(--olive)]">+{feedbackReport.sentimentBreakdown.positive}</span>
                            <span className="text-[var(--ink-2)]">~{feedbackReport.sentimentBreakdown.neutral}</span>
                            <span className="text-[var(--crimson)]">-{feedbackReport.sentimentBreakdown.negative}</span>
                          </div>
                        </div>
                        <p className="text-xs text-[var(--ink)] leading-relaxed">{feedbackReport.summaryNote}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          <div className="space-y-1">
                            <div className="font-mono text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--crimson)]">
                              Common Issues
                            </div>
                            {feedbackReport.commonComplaints.length === 0 ? (
                              <p className="text-[var(--ink-2)]">None flagged.</p>
                            ) : (
                              <ul className="space-y-1">
                                {feedbackReport.commonComplaints.map((c, idx) => (
                                  <li key={idx} className="text-[var(--ink)]">
                                    <strong>{c.theme}</strong> ({c.count})
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                          <div className="space-y-1">
                            <div className="font-mono text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--olive)]">
                              Suggestions
                            </div>
                            {feedbackReport.recurringSuggestions.length === 0 ? (
                              <p className="text-[var(--ink-2)]">None recorded.</p>
                            ) : (
                              <ul className="space-y-1">
                                {feedbackReport.recurringSuggestions.map((s, idx) => (
                                  <li key={idx} className="text-[var(--ink)]">
                                    <strong>{s.theme}</strong> ({s.count})
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Reviews for this event */}
                  {selectedEventFeedback.length === 0 ? (
                    <div className="paper-card p-8 text-center space-y-2">
                      <MessageSquare className="w-7 h-7 text-[var(--crimson)] mx-auto" />
                      <h3 className="font-display text-base font-extrabold text-[var(--ink)]">
                        No Reviews Yet
                      </h3>
                      <p className="text-xs text-[var(--ink-2)]">
                        Student reviews for this event will appear here once submitted.
                      </p>
                    </div>
                  ) : (
                    <div className="paper-card overflow-hidden divide-y divide-[var(--border-warm)]">
                      {selectedEventFeedback.map((item) => (
                        <div key={item.id} className="p-4 sm:p-5 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="inline-flex items-center gap-1 font-mono font-bold text-[var(--amber-ink)] tabular-nums">
                                <Star className="w-3.5 h-3.5 fill-current" />
                                {item.rating}/5
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="font-semibold text-[var(--ink)]">
                                {item.isAnonymous ? 'Anonymous Student' : item.authorName}
                              </span>
                            </div>
                            <span className="text-[11px] font-mono text-[var(--ink-2)] tabular-nums">
                              {formatIstFull(item.createdAt)}
                            </span>
                          </div>
                          {item.comment && (
                            <p className="text-xs sm:text-sm text-[var(--ink)] leading-relaxed">
                              {item.comment}
                            </p>
                          )}
                          {item.suggestion && (
                            <div className="text-xs text-[var(--olive)] font-medium">
                              Suggestion: {item.suggestion}
                            </div>
                          )}
                          {item.complaint && (
                            <div className="text-xs text-[var(--crimson)] font-medium">
                              Issue: {item.complaint}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()
          )}
        </section>
      )}
    </div>
  );
}
