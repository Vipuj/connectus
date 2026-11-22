import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronRight,
  Copy,
  Edit3,
  ExternalLink,
  Eye,
  FileImage,
  Film,
  KeyRound,
  Link2,
  Loader2,
  Mail,
  MapPin,
  Megaphone,
  MessageSquareWarning,
  Phone,
  Pin,
  Plus,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Star,
  Trash2,
  UploadCloud,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import type {
  Area,
  CampusAnnouncement,
  CampusEvent,
  CampusSurvey,
  College,
  EventCoordinatorContact,
  EventFeedback,
  EventMode,
  EventPaymentInfo,
  EventScheduleDay,
  EventType,
  FeedbackAnalysisReport,
  OfficialInvite,
  OrganizerAccount,
  PosterExtractionResult,
  RegStatus,
  Registration,
  SurveyResponse,
} from '../types';
import { formatFee, formatIstFull, resizeAndStripPoster, utcIsoToIstInput } from '../utils/format';
import { focusAndFollowTarget } from '../utils/scroll';
import { PlaceSearchInput } from './PlaceSearchInput';
import { PosterImage } from './PosterImage';
import { QrScannerCheckIn, type CheckInPayload } from './QrScannerCheckIn';
import { ScheduleBuilder } from './ScheduleBuilder';
import type { OfficialSectionId } from './TopBar';

interface SamplePosterItem {
  id: string;
  label: string;
  imagePath: string;
  collegeId: string;
}

interface OrganizerStudioProps {
  organizers: OrganizerAccount[];
  activeOrganizerId: string;
  activeSection?: OfficialSectionId;
  onSelectSection?: (section: OfficialSectionId) => void;
  officialInvites: OfficialInvite[];
  announcements: CampusAnnouncement[];
  colleges: College[];
  areas: Area[];
  samplePosters: SamplePosterItem[];
  organizerEvents: CampusEvent[];
  discoverView?: React.ReactNode;
  registrations: Registration[];
  eventFeedback?: EventFeedback[];
  surveys?: CampusSurvey[];
  surveyResponses?: SurveyResponse[];
  mapsEnabled: boolean;
  canAccessOfficials: boolean;
  onSelectOrganizer: (organizerId: string) => Promise<void>;
  onCreateInvite: (payload: {
    clubName: string;
    targetEmail?: string;
    maxUses: number;
    singleUse?: boolean;
    expiresInDays?: number;
    organizerId?: string;
  }) => Promise<OfficialInvite>;
  onRevokeInvite: (token: string) => Promise<void>;
  onRevokeMember: (memberId: string) => Promise<void>;
  onReplaceMember?: (
    memberId: string,
    payload: { newLeaderEmail?: string; clubName?: string }
  ) => Promise<OfficialInvite>;
  onOpenInviteAccept: (tokenOrCode?: string) => void;
  onReviewSubmission: (
    eventId: string,
    payload: {
      decision: 'approve' | 'request_changes' | 'reject' | 'approve_revision' | 'reject_revision';
      feedback?: string;
      organizerId?: string;
    }
  ) => Promise<void>;
  onCreateAnnouncement: (payload: {
    title: string;
    body: string;
    pinned: boolean;
    organizerId?: string;
  }) => Promise<void>;
  onDeleteAnnouncement: (id: string) => Promise<void>;
  onCreateSurvey?: (payload: {
    title: string;
    description: string;
    questionPrompt: string;
    options?: string[];
    allowAnonymous: boolean;
    organizerId?: string;
  }) => Promise<void>;
  onToggleSurveyStatus?: (
    surveyId: string,
    status: 'active' | 'closed',
    organizerId?: string
  ) => Promise<void>;
  onAnalyzeCampusFeedback?: (eventId?: string) => Promise<FeedbackAnalysisReport>;
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
  onPublishEvent: (payload: {
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
    organizerId?: string;
  }) => Promise<void>;
  onUpdateEvent: (
    eventId: string,
    payload: {
      action: 'edit' | 'cancel';
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
  ) => Promise<void>;
  onCheckIn: (eventId: string, payload: CheckInPayload) => Promise<Registration | null>;
}

const DEFAULT_POSTER = '/src/assets/images/poster_ai_hackathon_1795081969222.jpg';

export function OrganizerStudio({
  organizers,
  activeOrganizerId,
  activeSection,
  onSelectSection,
  officialInvites,
  announcements,
  colleges,
  areas,
  samplePosters,
  organizerEvents,
  discoverView,
  registrations,
  eventFeedback = [],
  surveys = [],
  surveyResponses = [],
  mapsEnabled,
  canAccessOfficials,
  onSelectOrganizer,
  onCreateInvite,
  onRevokeInvite,
  onRevokeMember,
  onReplaceMember,
  onOpenInviteAccept,
  onReviewSubmission,
  onCreateAnnouncement,
  onDeleteAnnouncement,
  onCreateSurvey,
  onToggleSurveyStatus,
  onAnalyzeCampusFeedback,
  onExtractPoster,
  onUploadPromoVideo,
  onCheckDuplicate,
  onPublishEvent,
  onUpdateEvent,
  onCheckIn,
}: OrganizerStudioProps) {
  const campusOfficialsOnly = useMemo(
    () => organizers.filter((o) => o.memberRole === 'college_official' && o.status === 'approved'),
    [organizers]
  );

  const activeOrg =
    organizers.find((o) => o.id === activeOrganizerId && o.memberRole === 'college_official') ||
    campusOfficialsOnly[0] ||
    organizers.find((o) => o.id === activeOrganizerId) ||
    organizers[0];

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const editVideoInputRef = useRef<HTMLInputElement | null>(null);
  const reviewFormRef = useRef<HTMLElement | null>(null);
  const studioWorkspaceRef = useRef<HTMLDivElement | null>(null);
  const editFormRef = useRef<HTMLDivElement | null>(null);
  const rosterRef = useRef<HTMLDivElement | null>(null);

  const [internalSection, setInternalSection] = useState<OfficialSectionId>('discover');
  const studioSection = activeSection ?? internalSection;
  const [publishDrawerOpen, setPublishDrawerOpen] = useState(false);
  const [eventsStatusFilter, setEventsStatusFilter] = useState<'all' | 'live' | 'upcoming' | 'cancelled'>('all');
  const [eventsSearchQuery, setEventsSearchQuery] = useState('');
  const [approvalsFilter, setApprovalsFilter] = useState<'pending' | 'history'>('pending');

  // Replace club leader state
  const [replacingMemberId, setReplacingMemberId] = useState<string | null>(null);
  const [replaceEmailInput, setReplaceEmailInput] = useState('');
  const [replaceBusy, setReplaceBusy] = useState(false);
  const [replaceError, setReplaceError] = useState<string | null>(null);
  const [replaceSuccess, setReplaceSuccess] = useState<string | null>(null);

  // Campus feedback, surveys, AI analysis & full event inspection state
  const [inspectedEventId, setInspectedEventId] = useState<string | null>(null);
  const [feedbackSubTab, setFeedbackSubTab] = useState<'events' | 'surveys'>('events');
  const [selectedFeedbackEventId, setSelectedFeedbackEventId] = useState<string | null>(null);
  const [surveyTitle, setSurveyTitle] = useState('');
  const [surveyDescription, setSurveyDescription] = useState('');
  const [surveyPrompt, setSurveyPrompt] = useState('');
  const [surveyOptionsText, setSurveyOptionsText] = useState('');
  const [surveyAllowAnonymous, setSurveyAllowAnonymous] = useState(true);
  const [creatingSurvey, setCreatingSurvey] = useState(false);
  const [surveyError, setSurveyError] = useState<string | null>(null);
  const [togglingSurveyId, setTogglingSurveyId] = useState<string | null>(null);
  const [analyzingAi, setAnalyzingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiReport, setAiReport] = useState<FeedbackAnalysisReport | null>(null);

  // Review queue state
  const [reviewFeedbackByEventId, setReviewFeedbackByEventId] = useState<Record<string, string>>({});
  const [reviewBusyId, setReviewBusyId] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Announcements state
  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');
  const [annPinned, setAnnPinned] = useState(true);
  const [annBusy, setAnnBusy] = useState(false);
  const [annError, setAnnError] = useState<string | null>(null);

  // Poster AI Publish state
  const [posterPreview, setPosterPreview] = useState<string>('');
  const [promoVideoUrl, setPromoVideoUrl] = useState<string>('');
  const [promoVideoCaption, setPromoVideoCaption] = useState<string>('');
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoUploadError, setVideoUploadError] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractionMeta, setExtractionMeta] = useState<PosterExtractionResult | null>(null);
  const [showReview, setShowReview] = useState(false);

  const [title, setTitle] = useState('');
  const [type, setType] = useState<EventType>('Hackathon');
  const [startDatetimeIst, setStartDatetimeIst] = useState('2026-11-26T10:00');
  const [endDatetimeIst, setEndDatetimeIst] = useState('2026-11-26T17:00');
  const [venueName, setVenueName] = useState('');
  const [areaId, setAreaId] = useState(
    activeOrg?.collegeId
      ? colleges.find((c) => c.id === activeOrg.collegeId)?.areaId || 'area-kompally'
      : 'area-kompally'
  );
  const [placeId, setPlaceId] = useState<string | undefined>(undefined);
  const [formattedAddress, setFormattedAddress] = useState<string | undefined>(undefined);
  const [lat, setLat] = useState<number | undefined>(undefined);
  const [lng, setLng] = useState<number | undefined>(undefined);
  const [mode, setMode] = useState<EventMode>('In-Person');
  const [audience, setAudience] = useState<'open_to_all' | 'host_college_only'>('open_to_all');
  const [branchesText, setBranchesText] = useState('All');
  const [yearsText, setYearsText] = useState('All');
  const [feeInr, setFeeInr] = useState('0');
  const [capacity, setCapacity] = useState('100');
  const [regDeadlineIst, setRegDeadlineIst] = useState('2026-11-25T23:59');
  const [regLink, setRegLink] = useState('https://connectus.in/register/new-event');
  const [description, setDescription] = useState('');
  const [teamSize, setTeamSize] = useState('');
  const [googleFormUrl, setGoogleFormUrl] = useState('');
  const [whatsappGroupUrl, setWhatsappGroupUrl] = useState('');
  const [telegramGroupUrl, setTelegramGroupUrl] = useState('');
  const [upiId, setUpiId] = useState('');
  const [paymentUrl, setPaymentUrl] = useState('');
  const [paymentAccountNote, setPaymentAccountNote] = useState('');
  const [refundPolicy, setRefundPolicy] = useState('');
  const [rulesText, setRulesText] = useState('');
  const [prizesText, setPrizesText] = useState('');
  const [prerequisitesText, setPrerequisitesText] = useState('');
  const [schedule, setSchedule] = useState<EventScheduleDay[]>([]);
  const [coordinatorName, setCoordinatorName] = useState('');
  const [coordinatorRole, setCoordinatorRole] = useState('');
  const [coordinatorPhone, setCoordinatorPhone] = useState('');
  const [coordinatorEmail, setCoordinatorEmail] = useState('');

  const [confirmedFields, setConfirmedFields] = useState<Record<string, boolean>>({});
  const [duplicateWarning, setDuplicateWarning] = useState<CampusEvent | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null);

  // Edit event state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editVenue, setEditVenue] = useState('');
  const [editFormattedAddress, setEditFormattedAddress] = useState('');
  const [editStartIst, setEditStartIst] = useState('');
  const [editEndIst, setEditEndIst] = useState('');
  const [editDeadlineIst, setEditDeadlineIst] = useState('');
  const [editFeeInr, setEditFeeInr] = useState('0');
  const [editCapacity, setEditCapacity] = useState('100');
  const [editMode, setEditMode] = useState<EventMode>('In-Person');
  const [editRegStatus, setEditRegStatus] = useState<RegStatus>('open');
  const [editDescription, setEditDescription] = useState('');
  const [editTeamSize, setEditTeamSize] = useState('');
  const [editGoogleFormUrl, setEditGoogleFormUrl] = useState('');
  const [editWhatsappGroupUrl, setEditWhatsappGroupUrl] = useState('');
  const [editTelegramGroupUrl, setEditTelegramGroupUrl] = useState('');
  const [editUpiId, setEditUpiId] = useState('');
  const [editPaymentUrl, setEditPaymentUrl] = useState('');
  const [editPaymentAccountNote, setEditPaymentAccountNote] = useState('');
  const [editRefundPolicy, setEditRefundPolicy] = useState('');
  const [editRulesText, setEditRulesText] = useState('');
  const [editPrizesText, setEditPrizesText] = useState('');
  const [editPrerequisitesText, setEditPrerequisitesText] = useState('');
  const [editSchedule, setEditSchedule] = useState<EventScheduleDay[]>([]);
  const [editCoordName, setEditCoordName] = useState('');
  const [editCoordRole, setEditCoordRole] = useState('');
  const [editCoordPhone, setEditCoordPhone] = useState('');
  const [editCoordEmail, setEditCoordEmail] = useState('');
  const [editPromoVideoUrl, setEditPromoVideoUrl] = useState('');
  const [editPromoVideoCaption, setEditPromoVideoCaption] = useState('');
  const [uploadingEditVideo, setUploadingEditVideo] = useState(false);
  const [editVideoError, setEditVideoError] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [rosterEventId, setRosterEventId] = useState<string | null>(null);

  // Single-use expiring Club Leader Invite state
  const [inviteClubName, setInviteClubName] = useState('');
  const [inviteTargetEmail, setInviteTargetEmail] = useState('');
  const [inviteSingleUse, setInviteSingleUse] = useState(true);
  const [inviteMaxUses, setInviteMaxUses] = useState('1');
  const [inviteExpiresDays, setInviteExpiresDays] = useState('14');
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const isApprovedOfficial = Boolean(
    activeOrg && activeOrg.status === 'approved' && activeOrg.memberRole === 'college_official'
  );
  const canManageInvites = isApprovedOfficial;
  const isPortalUnlocked = canAccessOfficials;

  useEffect(() => {
    if (showReview && publishDrawerOpen && studioSection === 'events') {
      focusAndFollowTarget(reviewFormRef.current, {
        block: 'start',
        focusInput: false,
        delayMs: 90,
      });
    }
  }, [showReview, publishDrawerOpen, studioSection]);

  useEffect(() => {
    if (editingId && studioSection === 'events') {
      focusAndFollowTarget(editFormRef.current, { block: 'center', delayMs: 80 });
    }
  }, [editingId, studioSection]);

  useEffect(() => {
    if (rosterEventId && studioSection === 'events') {
      focusAndFollowTarget(rosterRef.current, {
        block: 'nearest',
        focusInput: false,
        delayMs: 80,
      });
    }
  }, [rosterEventId, studioSection]);

  function switchStudioSection(next: OfficialSectionId, followWorkspace = false) {
    setInternalSection(next);
    onSelectSection?.(next);
    if (followWorkspace) {
      focusAndFollowTarget(studioWorkspaceRef.current, {
        block: 'start',
        focusInput: false,
        delayMs: 70,
      });
    }
  }

  const confidenceMap = extractionMeta?.confidence || {};
  const lowConfFields = Object.entries(confidenceMap)
    .filter(([, score]) => typeof score === 'number' && score < 0.7)
    .map(([key]) => key);
  const unconfirmedLowConf = lowConfFields.filter((key) => !confirmedFields[key]);

  function applyExtractionToForm(res: PosterExtractionResult, imageSrc: string) {
    setPosterPreview(imageSrc);
    setExtractionMeta(res);
    setConfirmedFields({});
    setDuplicateWarning(null);
    setPublishError(null);
    setPublishSuccess(null);

    if (!res.is_event_poster) {
      setShowReview(false);
      setExtractError(
        'This image does not look like an event poster. Upload an event poster or switch to manual entry.'
      );
      return;
    }

    setTitle(res.title || '');
    setType(res.type || 'Workshop');
    setStartDatetimeIst(res.start_datetime_ist || '2026-11-27T10:00');
    setEndDatetimeIst(res.end_datetime_ist || '2026-11-27T17:00');
    setVenueName(res.venue_name || '');
    if (res.area_guess && areas.some((a) => a.id === res.area_guess)) {
      setAreaId(res.area_guess);
    } else {
      const orgCol = colleges.find((c) => c.id === activeOrg?.collegeId);
      if (orgCol) setAreaId(orgCol.areaId);
    }
    setPlaceId(undefined);
    setFormattedAddress(undefined);
    setLat(undefined);
    setLng(undefined);
    setMode(res.mode || 'In-Person');
    setAudience(res.audience || 'open_to_all');
    setBranchesText(res.branches?.length ? res.branches.join(', ') : 'All');
    setYearsText(res.years?.length ? res.years.join(', ') : 'All');
    setFeeInr(res.fee_inr !== null && res.fee_inr !== undefined ? String(res.fee_inr) : '0');
    setCapacity(res.capacity !== null && res.capacity !== undefined ? String(res.capacity) : '100');
    setRegDeadlineIst(res.registration_deadline_ist || '2026-11-26T22:00');
    setRegLink(res.registration_link || 'https://connectus.in/register/event');
    setDescription(res.description || '');
    setSchedule([]);
    setCoordinatorName(activeOrg?.contactName || '');
    setCoordinatorRole(activeOrg?.designation || activeOrg?.clubName || '');
    setCoordinatorEmail(activeOrg?.email || '');
    setShowReview(true);
  }

  async function handleFileUpload(file: File) {
    if (!activeOrg) return;
    setExtractError(null);
    setExtracting(true);
    try {
      const dataUrl = await resizeAndStripPoster(file);
      setPosterPreview(dataUrl);
      const res = await onExtractPoster({
        imageDataUrl: dataUrl,
        organizerCollegeId: activeOrg.collegeId,
      });
      applyExtractionToForm(res, dataUrl);
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : 'Poster extraction failed.');
      setShowReview(true);
    } finally {
      setExtracting(false);
    }
  }

  async function handleSamplePoster(sample: SamplePosterItem) {
    if (!activeOrg) return;
    setExtractError(null);
    setExtracting(true);
    setPosterPreview(sample.imagePath);
    try {
      const res = await onExtractPoster({
        samplePosterId: sample.id,
        organizerCollegeId: activeOrg.collegeId,
      });
      applyExtractionToForm(res, sample.imagePath);
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : 'Poster extraction failed.');
      setShowReview(true);
    } finally {
      setExtracting(false);
    }
  }

  async function handlePromoVideoUpload(file: File, target: 'publish' | 'edit') {
    if (file.size > 30 * 1024 * 1024) {
      const msg = 'Promo video exceeds the 30 MB limit. Trim to a 15–60s vertical reel.';
      if (target === 'publish') setVideoUploadError(msg);
      else setEditVideoError(msg);
      return;
    }
    if (target === 'publish') {
      setVideoUploadError(null);
      setUploadingVideo(true);
    } else {
      setEditVideoError(null);
      setUploadingEditVideo(true);
    }
    try {
      const url = await onUploadPromoVideo(file);
      if (target === 'publish') setPromoVideoUrl(url);
      else setEditPromoVideoUrl(url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Promo video upload failed.';
      if (target === 'publish') setVideoUploadError(msg);
      else setEditVideoError(msg);
    } finally {
      if (target === 'publish') setUploadingVideo(false);
      else setUploadingEditVideo(false);
    }
  }

  function openManualForm() {
    setExtractError(null);
    setExtractionMeta(null);
    setConfirmedFields({});
    setPosterPreview(posterPreview || DEFAULT_POSTER);
    setPromoVideoUrl('');
    setPromoVideoCaption('');
    setVideoUploadError(null);
    setTitle('');
    setVenueName('');
    setPlaceId(undefined);
    setFormattedAddress(undefined);
    setLat(undefined);
    setLng(undefined);
    setDescription('');
    setTeamSize('');
    setGoogleFormUrl('');
    setWhatsappGroupUrl('');
    setTelegramGroupUrl('');
    setUpiId('');
    setPaymentUrl('');
    setPaymentAccountNote('');
    setRefundPolicy('');
    setRulesText('');
    setPrizesText('');
    setPrerequisitesText('');
    setSchedule([]);
    setCoordinatorName(activeOrg?.contactName || '');
    setCoordinatorRole(activeOrg?.designation || activeOrg?.clubName || '');
    setCoordinatorPhone('');
    setCoordinatorEmail(activeOrg?.email || '');
    setShowReview(true);
  }

  async function handlePublish(ignoreDuplicate = false) {
    if (!activeOrg) return;
    setPublishError(null);
    setPublishSuccess(null);

    if (unconfirmedLowConf.length > 0) {
      setPublishError(
        `Confirm low-confidence fields (${unconfirmedLowConf.join(', ')}) before publishing.`
      );
      return;
    }

    setPublishing(true);
    try {
      if (!ignoreDuplicate) {
        const dup = await onCheckDuplicate({
          title,
          collegeId: activeOrg.collegeId,
          startDatetimeIst,
        });
        if (dup) {
          setDuplicateWarning(dup);
          setPublishing(false);
          return;
        }
      }

      const splitLines = (raw: string) =>
        raw
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean);
      const hasPaymentInfo =
        upiId.trim() || paymentUrl.trim() || paymentAccountNote.trim() || refundPolicy.trim();
      const hasCoordinator =
        coordinatorName.trim() ||
        coordinatorRole.trim() ||
        coordinatorPhone.trim() ||
        coordinatorEmail.trim();

      await onPublishEvent({
        title,
        description,
        type,
        startDatetimeIst,
        endDatetimeIst,
        venueName,
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
        capacity: Number(capacity) || 100,
        regDeadlineIst,
        regLink,
        googleFormUrl: googleFormUrl.trim() || undefined,
        whatsappGroupUrl: whatsappGroupUrl.trim() || undefined,
        telegramGroupUrl: telegramGroupUrl.trim() || undefined,
        paymentInfo: hasPaymentInfo
          ? {
              upiId: upiId.trim() || undefined,
              paymentUrl: paymentUrl.trim() || undefined,
              accountNote: paymentAccountNote.trim() || undefined,
              refundPolicy: refundPolicy.trim() || undefined,
            }
          : undefined,
        rules: splitLines(rulesText),
        teamSize: teamSize.trim() || undefined,
        prizesAndPerks: splitLines(prizesText),
        prerequisites: splitLines(prerequisitesText),
        schedule: schedule.length > 0 ? schedule : undefined,
        coordinatorContact: hasCoordinator
          ? {
              name: coordinatorName.trim() || activeOrg.contactName,
              role: coordinatorRole.trim() || activeOrg.clubName,
              phone: coordinatorPhone.trim() || undefined,
              email: coordinatorEmail.trim() || undefined,
            }
          : undefined,
        posterUrl: posterPreview || DEFAULT_POSTER,
        promoVideoUrl: promoVideoUrl.trim() || undefined,
        promoVideoCaption: promoVideoCaption.trim() || undefined,
        aiConfidence: extractionMeta?.confidence,
        ignoreDuplicate,
        organizerId: activeOrg.id,
      });

      setPublishSuccess(`"${title}" is now live across the Connectus feed.`);
      setShowReview(false);
      setPublishDrawerOpen(false);
      setDuplicateWarning(null);
      setSchedule([]);
      setPromoVideoUrl('');
      setPromoVideoCaption('');
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : 'Failed to publish event.');
    } finally {
      setPublishing(false);
    }
  }

  async function handleReviewAction(
    evt: CampusEvent,
    decision: 'approve' | 'request_changes' | 'reject' | 'approve_revision' | 'reject_revision'
  ) {
    const feedback = (reviewFeedbackByEventId[evt.id] || '').trim();
    if (
      (decision === 'request_changes' || decision === 'reject' || decision === 'reject_revision') &&
      !feedback
    ) {
      setReviewError(
        decision === 'request_changes'
          ? 'Please add a note explaining what the Club Leader must update before resubmitting.'
          : 'Please provide an institutional reason before rejecting this submission or revision.'
      );
      return;
    }
    setReviewError(null);
    setReviewBusyId(evt.id);
    try {
      await onReviewSubmission(evt.id, {
        decision,
        feedback: feedback || undefined,
        organizerId: activeOrg?.id,
      });
      setReviewFeedbackByEventId((prev) => {
        const next = { ...prev };
        delete next[evt.id];
        return next;
      });
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : 'Could not submit review decision.');
    } finally {
      setReviewBusyId(null);
    }
  }

  async function handleCreateInviteSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteClubName.trim()) return;
    setInviteError(null);
    setCreatingInvite(true);
    try {
      await onCreateInvite({
        clubName: inviteClubName.trim(),
        targetEmail: inviteTargetEmail.trim() || undefined,
        singleUse: inviteSingleUse,
        maxUses: inviteSingleUse ? 1 : Number(inviteMaxUses) || 3,
        expiresInDays: Number(inviteExpiresDays) || 14,
        organizerId: activeOrg?.id,
      });
      setInviteClubName('');
      setInviteTargetEmail('');
      setInviteSingleUse(true);
      setInviteMaxUses('1');
      setInviteExpiresDays('14');
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to create invite link.');
    } finally {
      setCreatingInvite(false);
    }
  }

  async function handleCreateAnnouncementSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!annTitle.trim() || !annBody.trim()) return;
    setAnnError(null);
    setAnnBusy(true);
    try {
      await onCreateAnnouncement({
        title: annTitle.trim(),
        body: annBody.trim(),
        pinned: annPinned,
        organizerId: activeOrg?.id,
      });
      setAnnTitle('');
      setAnnBody('');
      setAnnPinned(true);
    } catch (err) {
      setAnnError(err instanceof Error ? err.message : 'Could not publish campus notice.');
    } finally {
      setAnnBusy(false);
    }
  }

  function handleCopyInviteLink(token: string) {
    const url = `${window.location.origin}/officials?invite=${encodeURIComponent(token)}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopiedToken(token);
    setTimeout(() => {
      setCopiedToken((curr) => (curr === token ? null : curr));
    }, 2500);
  }

  function startEditingEvent(evt: CampusEvent) {
    setEditingId(evt.id);
    setEditTitle(evt.title);
    setEditVenue(evt.venueName);
    setEditFormattedAddress(evt.formattedAddress || '');
    setEditStartIst(utcIsoToIstInput(evt.startAt));
    setEditEndIst(utcIsoToIstInput(evt.endAt));
    setEditDeadlineIst(utcIsoToIstInput(evt.regDeadline));
    setEditFeeInr(String(evt.feeInr ?? 0));
    setEditCapacity(String(evt.capacity ?? 100));
    setEditMode(evt.mode);
    setEditRegStatus(evt.regStatus);
    setEditDescription(evt.description || '');
    setEditTeamSize(evt.teamSize || '');
    setEditGoogleFormUrl(evt.googleFormUrl || '');
    setEditWhatsappGroupUrl(evt.whatsappGroupUrl || '');
    setEditTelegramGroupUrl(evt.telegramGroupUrl || '');
    setEditUpiId(evt.paymentInfo?.upiId || '');
    setEditPaymentUrl(evt.paymentInfo?.paymentUrl || '');
    setEditPaymentAccountNote(evt.paymentInfo?.accountNote || '');
    setEditRefundPolicy(evt.paymentInfo?.refundPolicy || '');
    setEditRulesText((evt.rules || []).join('\n'));
    setEditPrizesText((evt.prizesAndPerks || []).join('\n'));
    setEditPrerequisitesText((evt.prerequisites || []).join('\n'));
    setEditSchedule(
      evt.schedule
        ? evt.schedule.map((d) => ({
            dayLabel: d.dayLabel,
            items: d.items.map((item) => ({ ...item })),
          }))
        : []
    );
    setEditCoordName(evt.coordinatorContact?.name || '');
    setEditCoordRole(evt.coordinatorContact?.role || '');
    setEditCoordPhone(evt.coordinatorContact?.phone || '');
    setEditCoordEmail(evt.coordinatorContact?.email || '');
    setEditPromoVideoUrl(evt.promoVideoUrl || '');
    setEditPromoVideoCaption(evt.promoVideoCaption || '');
    setEditVideoError(null);
  }

  const activeCollege = colleges.find((c) => c.id === activeOrg?.collegeId);

  const collegeOfficialTeam = useMemo(
    () =>
      organizers.filter(
        (o) =>
          o.collegeId === activeOrg?.collegeId &&
          o.status === 'approved' &&
          (o.memberRole === 'college_official' || o.memberRole === 'club_leader')
      ),
    [organizers, activeOrg?.collegeId]
  );

  const collegeInvites = useMemo(
    () => officialInvites.filter((i) => i.collegeId === activeOrg?.collegeId),
    [officialInvites, activeOrg?.collegeId]
  );

  const collegeEvents = useMemo(
    () =>
      organizerEvents.filter((e) =>
        activeOrg?.collegeId ? e.collegeId === activeOrg.collegeId : e.clubId === activeOrg?.id
      ),
    [organizerEvents, activeOrg?.collegeId, activeOrg?.id]
  );

  const pendingQueueEvents = useMemo(
    () =>
      collegeEvents.filter(
        (e) => e.status === 'pending_review' || Boolean(e.revisionPendingReview && e.pendingRevision)
      ),
    [collegeEvents]
  );

  const reviewedHistoryEvents = useMemo(
    () =>
      collegeEvents.filter(
        (e) => e.status === 'changes_requested' || e.status === 'rejected'
      ),
    [collegeEvents]
  );

  const publishedAndCancelledEvents = useMemo(
    () =>
      collegeEvents.filter(
        (e) => e.status === 'published' || e.status === 'cancelled'
      ),
    [collegeEvents]
  );

  const collegeFeedbackItems = useMemo(
    () =>
      eventFeedback
        .filter((f) => !activeOrg?.collegeId || f.collegeId === activeOrg.collegeId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [eventFeedback, activeOrg?.collegeId]
  );

  const feedbackEventList = useMemo(() => {
    const candidates = collegeEvents.filter(
      (e) =>
        e.status === 'published' ||
        e.status === 'cancelled' ||
        collegeFeedbackItems.some((f) => f.eventId === e.id)
    );
    return [...candidates].sort((a, b) => {
      const aCount = collegeFeedbackItems.filter((f) => f.eventId === a.id).length;
      const bCount = collegeFeedbackItems.filter((f) => f.eventId === b.id).length;
      if (aCount !== bCount) return bCount - aCount;
      return b.startAt.localeCompare(a.startAt);
    });
  }, [collegeEvents, collegeFeedbackItems]);

  const selectedFeedbackEvent = useMemo(
    () => feedbackEventList.find((e) => e.id === selectedFeedbackEventId) || null,
    [feedbackEventList, selectedFeedbackEventId]
  );

  const selectedEventFeedbackItems = useMemo(
    () =>
      selectedFeedbackEvent
        ? collegeFeedbackItems.filter((f) => f.eventId === selectedFeedbackEvent.id)
        : [],
    [collegeFeedbackItems, selectedFeedbackEvent]
  );

  const inspectedEvent = useMemo(
    () => collegeEvents.find((e) => e.id === inspectedEventId) || null,
    [collegeEvents, inspectedEventId]
  );

  const collegeSurveys = useMemo(
    () =>
      surveys
        .filter((s) => !activeOrg?.collegeId || s.collegeId === activeOrg.collegeId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [surveys, activeOrg?.collegeId]
  );

  const livePublishedCount = publishedAndCancelledEvents.filter((e) => e.status === 'published').length;

  const upcomingCollegeEvents = useMemo(() => {
    const nowMs = Date.now();
    return publishedAndCancelledEvents
      .filter((e) => e.status === 'published' && new Date(e.endAt).getTime() >= nowMs)
      .sort((a, b) => a.startAt.localeCompare(b.startAt));
  }, [publishedAndCancelledEvents]);

  const filteredCollegeRosterEvents = useMemo(() => {
    const nowMs = Date.now();
    const q = eventsSearchQuery.trim().toLowerCase();
    return publishedAndCancelledEvents.filter((evt) => {
      if (eventsStatusFilter === 'live' && evt.status !== 'published') return false;
      if (eventsStatusFilter === 'cancelled' && evt.status !== 'cancelled') return false;
      if (
        eventsStatusFilter === 'upcoming' &&
        (evt.status !== 'published' || new Date(evt.endAt).getTime() < nowMs)
      ) {
        return false;
      }
      if (q) {
        const hay = `${evt.title} ${evt.clubName} ${evt.venueName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [publishedAndCancelledEvents, eventsStatusFilter, eventsSearchQuery]);

  const totalCollegeViews = useMemo(
    () => collegeEvents.reduce((acc, e) => acc + (e.viewCount ?? 0), 0),
    [collegeEvents]
  );

  const collegeClubsOnly = useMemo(
    () => collegeOfficialTeam.filter((m) => m.memberRole === 'club_leader'),
    [collegeOfficialTeam]
  );

  const collegeOfficialsOnlyTeam = useMemo(
    () => collegeOfficialTeam.filter((m) => m.memberRole !== 'club_leader'),
    [collegeOfficialTeam]
  );

  const collegeSurveyResponsesCount = useMemo(() => {
    const surveyIds = new Set(collegeSurveys.map((s) => s.id));
    return surveyResponses.filter((sr) => surveyIds.has(sr.surveyId)).length;
  }, [collegeSurveys, surveyResponses]);

  const collegeAvgRating = useMemo(() => {
    if (collegeFeedbackItems.length === 0) return null;
    const sum = collegeFeedbackItems.reduce((acc, item) => acc + item.rating, 0);
    return sum / collegeFeedbackItems.length;
  }, [collegeFeedbackItems]);

  const collegeEventIds = useMemo(() => new Set(collegeEvents.map((e) => e.id)), [collegeEvents]);
  const collegeRegistrations = useMemo(
    () => registrations.filter((r) => collegeEventIds.has(r.eventId) && r.status !== 'cancelled'),
    [registrations, collegeEventIds]
  );
  const confirmedTotal = collegeEvents.reduce((acc, evt) => acc + evt.confirmedCount, 0);
  const pendingFeeTotal = collegeRegistrations.filter(
    (r) => r.paymentStatus === 'pending_verification'
  ).length;
  const checkedInTotal = collegeRegistrations.filter((r) => r.status === 'checked_in').length;

  const collegeAnnouncements = useMemo(
    () =>
      announcements
        .filter((a) => !activeOrg?.collegeId || a.collegeId === activeOrg.collegeId)
        .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt)),
    [announcements, activeOrg?.collegeId]
  );

  async function handleCreateSurveySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!onCreateSurvey || !surveyTitle.trim() || !surveyPrompt.trim()) return;
    setSurveyError(null);
    setCreatingSurvey(true);
    try {
      const options = surveyOptionsText
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      await onCreateSurvey({
        title: surveyTitle.trim(),
        description: surveyDescription.trim(),
        questionPrompt: surveyPrompt.trim(),
        options: options.length > 0 ? options : undefined,
        allowAnonymous: surveyAllowAnonymous,
        organizerId: activeOrg?.id,
      });
      setSurveyTitle('');
      setSurveyDescription('');
      setSurveyPrompt('');
      setSurveyOptionsText('');
      setSurveyAllowAnonymous(true);
    } catch (err) {
      setSurveyError(err instanceof Error ? err.message : 'Could not publish campus survey.');
    } finally {
      setCreatingSurvey(false);
    }
  }

  async function handleRunAiAnalysis(eventId?: string) {
    if (!onAnalyzeCampusFeedback) return;
    setAiError(null);
    setAnalyzingAi(true);
    try {
      const report = await onAnalyzeCampusFeedback(
        eventId || selectedFeedbackEventId || undefined
      );
      setAiReport(report);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'AI feedback analysis failed.');
    } finally {
      setAnalyzingAi(false);
    }
  }

  return (
    <div ref={studioWorkspaceRef} className="space-y-6 cp-scroll-target">
      {!isPortalUnlocked ? (
        <section className="paper-card p-6 sm:p-8 space-y-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-[12px] bg-[var(--feel-tint)] border border-[var(--border-ink)] text-[var(--crimson)] flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="space-y-1.5">
              <h2 className="font-display text-xl font-extrabold tracking-[-0.03em] text-[var(--ink)]">
                Appointed Campus Officials Only
              </h2>
              <p className="text-[14px] text-[var(--ink-2)] leading-relaxed max-w-2xl">
                Campus Officials are verified by Campus Governance for each institution. Self-signup is disabled to guarantee academic governance integrity.
              </p>
              <p className="text-xs text-[var(--ink-2)]">
                Student Club Leaders join using a single-use invite issued by their Campus Official and manage drafts in their <strong>My Club</strong> workspace.
              </p>
            </div>
          </div>
        </section>
      ) : (
        <>
          {publishSuccess && (
            <div className="p-4 rounded-[14px] bg-[var(--olive-tint)] border border-[var(--olive-border)] text-sm font-semibold text-[var(--olive)] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>{publishSuccess}</span>
              </div>
              <button
                type="button"
                onClick={() => switchStudioSection('events', true)}
                className="paper-btn-ink px-3 py-1.5 text-xs shrink-0"
              >
                View Live Events
              </button>
            </div>
          )}

          <motion.div
            key={studioSection}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* SECTION 1: DISCOVER */}
            {studioSection === 'discover' && (
              <div className="space-y-4">
                {discoverView}
              </div>
            )}

            {/* SECTION 2: REVIEW & APPROVAL QUEUE */}
            {studioSection === 'approvals' && (
              <div className="space-y-6">
                <section className="pb-4 border-b border-[var(--border-warm)] flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div className="space-y-1">
                    <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-[-0.04em] text-[var(--ink)]">
                      Review &amp; Approval
                    </h1>
                    <p className="text-xs sm:text-sm text-[var(--ink-2)]">
                      Open any submission to inspect full details before approving or returning for edits.
                    </p>
                  </div>

                  <div className="paper-segment shrink-0">
                    <button
                      type="button"
                      aria-pressed={approvalsFilter === 'pending'}
                      onClick={() => setApprovalsFilter('pending')}
                      className="paper-segment-btn min-h-[36px] px-3.5 py-1.5 text-xs tabular-nums"
                    >
                      Pending ({pendingQueueEvents.length})
                    </button>
                    <button
                      type="button"
                      aria-pressed={approvalsFilter === 'history'}
                      onClick={() => setApprovalsFilter('history')}
                      className="paper-segment-btn min-h-[36px] px-3.5 py-1.5 text-xs tabular-nums"
                    >
                      Returned / Rejected ({reviewedHistoryEvents.length})
                    </button>
                  </div>
                </section>

                {reviewError && (
                  <div className="p-3 bg-[var(--crimson-tint)] border border-[var(--crimson)] text-xs font-semibold text-[var(--crimson)]">
                    {reviewError}
                  </div>
                )}

                {approvalsFilter === 'pending' && (
                  pendingQueueEvents.length === 0 ? (
                    <div className="paper-card p-8 text-center space-y-1.5">
                      <CheckCircle2 className="w-7 h-7 text-[var(--olive)] mx-auto" />
                      <div className="font-display text-base font-extrabold text-[var(--ink)]">
                        Approval Queue Clear
                      </div>
                      <p className="text-xs text-[var(--ink-2)]">
                        All club submissions and revision requests have been reviewed.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pendingQueueEvents.map((evt) => {
                        const isRev = Boolean(evt.revisionPendingReview && evt.pendingRevision);
                        const rev = evt.pendingRevision;
                        const feedbackVal = reviewFeedbackByEventId[evt.id] || '';
                        const busy = reviewBusyId === evt.id;

                        return (
                          <div
                            key={evt.id}
                            className="paper-card p-5 space-y-4"
                          >
                            <div className="flex flex-col sm:flex-row items-start gap-4">
                              <button
                                type="button"
                                onClick={() => setInspectedEventId(evt.id)}
                                className="w-16 sm:w-20 aspect-[3/4] rounded-[10px] overflow-hidden border border-[var(--border-ink)] shrink-0 bg-[var(--feel-tint)] hover:opacity-90 transition-opacity"
                                aria-label={`Inspect ${evt.title}`}
                              >
                                <PosterImage
                                  src={rev?.posterUrl || evt.posterUrl}
                                  alt={evt.title}
                                  title={evt.title}
                                  className="w-full h-full object-cover"
                                />
                              </button>
                              <div className="flex-1 min-w-0 space-y-1.5">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                                    <span className="font-bold uppercase tracking-[0.06em] text-[var(--crimson)]">
                                      {isRev ? 'Live Event Revision' : 'New Club Submission'}
                                    </span>
                                    <span aria-hidden="true">·</span>
                                    <span className="font-semibold text-[var(--ink)]">{evt.clubName}</span>
                                    {evt.submittedByName && (
                                      <>
                                        <span aria-hidden="true">·</span>
                                        <span className="text-[var(--ink-2)]">by {evt.submittedByName}</span>
                                      </>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setInspectedEventId(evt.id)}
                                    className="paper-btn-secondary min-h-[32px] px-3 py-1 text-xs inline-flex items-center gap-1.5 shrink-0"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-[var(--crimson)]" />
                                    <span>View Full Event</span>
                                  </button>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => setInspectedEventId(evt.id)}
                                  className="text-left block hover:text-[var(--crimson)] transition-colors"
                                >
                                  <h3 className="font-display text-lg font-extrabold text-[var(--ink)] hover:text-[var(--crimson)]">
                                    {evt.title}
                                  </h3>
                                </button>
                                <div className="text-xs text-[var(--ink-2)] tabular-nums">
                                  {formatIstFull(evt.startAt)} IST · {evt.venueName} · {formatFee(evt.feeInr)} · Cap {evt.capacity}
                                </div>
                                {evt.description && (
                                  <p className="text-xs text-[var(--ink-2)] leading-relaxed line-clamp-2">
                                    {evt.description}
                                  </p>
                                )}

                                {isRev && rev && (
                                  <div className="p-3 rounded-[10px] bg-[var(--amber-tint)] border border-[var(--amber-border)] space-y-1.5 text-xs text-[var(--amber-ink)]">
                                    <div className="font-bold">
                                      Changed fields: {rev.changedFields.join(', ')} (by {rev.submittedByName})
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                                      {rev.title && rev.title !== evt.title && (
                                        <div>
                                          <strong>Title:</strong> {evt.title} → <span className="underline">{rev.title}</span>
                                        </div>
                                      )}
                                      {rev.venueName && rev.venueName !== evt.venueName && (
                                        <div>
                                          <strong>Venue:</strong> {evt.venueName} → <span className="underline">{rev.venueName}</span>
                                        </div>
                                      )}
                                      {rev.startAt && rev.startAt !== evt.startAt && (
                                        <div>
                                          <strong>Start:</strong> {formatIstFull(evt.startAt)} → <span className="underline">{formatIstFull(rev.startAt)}</span>
                                        </div>
                                      )}
                                      {typeof rev.feeInr === 'number' && rev.feeInr !== evt.feeInr && (
                                        <div>
                                          <strong>Fee:</strong> ₹{evt.feeInr} → <span className="underline">₹{rev.feeInr}</span>
                                        </div>
                                      )}
                                      {typeof rev.capacity === 'number' && rev.capacity !== evt.capacity && (
                                        <div>
                                          <strong>Capacity:</strong> {evt.capacity} → <span className="underline">{rev.capacity}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="pt-3 border-t border-[var(--border-warm)] flex flex-col md:flex-row md:items-center justify-between gap-3">
                              <input
                                type="text"
                                aria-label={`Review note for ${evt.title}`}
                                value={feedbackVal}
                                onChange={(e) =>
                                  setReviewFeedbackByEventId((prev) => ({
                                    ...prev,
                                    [evt.id]: e.target.value,
                                  }))
                                }
                                placeholder="Review note to Club Leader (required to return or reject)"
                                className="paper-input flex-1 min-h-[38px] px-3 py-1.5 text-xs"
                              />

                              <div className="flex flex-wrap items-center gap-2 shrink-0">
                                {isRev ? (
                                  <>
                                    <button
                                      type="button"
                                      disabled={busy}
                                      onClick={() => handleReviewAction(evt, 'approve_revision')}
                                      className="paper-btn-primary min-h-[38px] px-3.5 py-1.5 text-xs inline-flex items-center gap-1.5"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>Approve Revision</span>
                                    </button>
                                    <button
                                      type="button"
                                      disabled={busy}
                                      onClick={() => handleReviewAction(evt, 'reject_revision')}
                                      className="min-h-[38px] px-3 py-1.5 text-xs font-semibold border border-[var(--crimson)] text-[var(--crimson)] hover:bg-[var(--crimson-tint)]"
                                    >
                                      Reject Revision
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      disabled={busy}
                                      onClick={() => handleReviewAction(evt, 'approve')}
                                      className="paper-btn-primary min-h-[38px] px-3.5 py-1.5 text-xs inline-flex items-center gap-1.5"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>Approve &amp; Publish</span>
                                    </button>
                                    <button
                                      type="button"
                                      disabled={busy}
                                      onClick={() => handleReviewAction(evt, 'request_changes')}
                                      className="paper-btn-secondary min-h-[38px] px-3 py-1.5 text-xs inline-flex items-center gap-1.5"
                                    >
                                      <MessageSquareWarning className="w-3.5 h-3.5 text-[var(--amber-ink)]" />
                                      <span>Request Changes</span>
                                    </button>
                                    <button
                                      type="button"
                                      disabled={busy}
                                      onClick={() => handleReviewAction(evt, 'reject')}
                                      className="min-h-[38px] px-3 py-1.5 text-xs font-semibold border border-[var(--crimson)] text-[var(--crimson)] hover:bg-[var(--crimson-tint)]"
                                    >
                                      Reject
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                )}

                {approvalsFilter === 'history' && (
                  reviewedHistoryEvents.length === 0 ? (
                    <div className="paper-card p-6 text-center text-xs text-[var(--ink-2)]">
                      No returned or rejected club submissions recorded yet.
                    </div>
                  ) : (
                    <div className="paper-card overflow-hidden divide-y divide-[var(--border-warm)]">
                      {reviewedHistoryEvents.map((evt) => (
                        <div key={evt.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1 min-w-0">
                            <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--crimson)]">
                              {evt.status === 'changes_requested' ? 'Changes Requested' : 'Rejected'} · {evt.clubName}
                            </div>
                            <div className="font-display font-bold text-sm text-[var(--ink)] truncate">
                              {evt.title}
                            </div>
                            {evt.submissionFeedback && (
                              <p className="text-xs text-[var(--ink-2)]">Note: {evt.submissionFeedback}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="font-mono text-[11px] text-[var(--ink-2)] tabular-nums">
                              {evt.approvalHistory?.[0]?.createdAt
                                ? formatIstFull(evt.approvalHistory[0].createdAt)
                                : formatIstFull(evt.startAt)}
                            </span>
                            <button
                              type="button"
                              onClick={() => setInspectedEventId(evt.id)}
                              className="paper-btn-secondary min-h-[32px] px-2.5 py-1 text-xs inline-flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5 text-[var(--crimson)]" />
                              <span>View</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>
            )}

            {/* SECTION 3: OUR EVENTS (CLEAN EVENT OPERATIONS) */}
            {studioSection === 'events' && (
              <div className="space-y-5">
                <section className="pb-4 border-b border-[var(--border-warm)] flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div className="space-y-1.5">
                    <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-[-0.04em] text-[var(--ink)]">
                      Our Events
                    </h1>
                    <div className="text-xs font-mono tabular-nums text-[var(--ink-2)] flex flex-wrap items-center gap-x-2.5 gap-y-1">
                      <span>
                        <strong className="text-[var(--ink)]">{livePublishedCount}</strong> live
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        <strong className="text-[var(--ink)]">{totalCollegeViews}</strong> views
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        <strong className="text-[var(--olive)]">{checkedInTotal}</strong> checked in
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        <strong className={pendingFeeTotal > 0 ? 'text-[var(--crimson)]' : 'text-[var(--ink)]'}>
                          {pendingFeeTotal}
                        </strong>{' '}
                        pending fee check
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPublishDrawerOpen((v) => !v)}
                    className="paper-btn-primary min-h-[40px] px-4 py-2 text-xs uppercase tracking-[0.06em] inline-flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{publishDrawerOpen ? 'Close Publisher' : 'Publish Event'}</span>
                  </button>
                </section>

                <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="paper-segment">
                    {(
                      [
                        { id: 'all', label: `All (${publishedAndCancelledEvents.length})` },
                        { id: 'live', label: `Live (${livePublishedCount})` },
                        { id: 'upcoming', label: `Upcoming (${upcomingCollegeEvents.length})` },
                        {
                          id: 'cancelled',
                          label: `Cancelled (${publishedAndCancelledEvents.length - livePublishedCount})`,
                        },
                      ] as const
                    ).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        aria-pressed={eventsStatusFilter === f.id}
                        onClick={() => setEventsStatusFilter(f.id)}
                        className="paper-segment-btn min-h-[36px] px-3 py-1 text-xs whitespace-nowrap tabular-nums"
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                  <input
                    type="search"
                    value={eventsSearchQuery}
                    onChange={(e) => setEventsSearchQuery(e.target.value)}
                    placeholder="Filter events by title, club, or venue..."
                    className="paper-input min-h-[38px] px-3 py-1.5 text-xs sm:w-64"
                  />
                </section>

                {/* B. Collapsible Direct Campus Official Event Publisher */}
                {publishDrawerOpen && (
                  <div className="space-y-6">
                    <section className="paper-card p-6 space-y-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h2 className="font-display text-xl font-extrabold tracking-[-0.03em] text-[var(--ink)]">
                            Publish Official Campus Event (Poster AI + Promo Reel)
                          </h2>
                          <p className="text-xs text-[var(--ink-2)]">
                            Events published by an approved Campus Official go straight to the feed badged as Campus Official.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={openManualForm}
                          className="text-xs font-semibold text-[var(--crimson)] hover:underline underline-offset-4 self-start sm:self-auto"
                        >
                          Enter details manually instead
                        </button>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                        <div className="lg:col-span-5">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload(file);
                            }}
                          />
                          <button
                            type="button"
                            disabled={extracting}
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full h-full min-h-[180px] p-6 border-2 border-dashed border-[var(--border-ink)] hover:border-[var(--crimson)] rounded-[14px] bg-[var(--paper-dashed)] hover:bg-[var(--feel-tint)] transition-colors flex flex-col items-center justify-center text-center gap-2.5"
                          >
                            {extracting ? (
                              <>
                                <Loader2 className="w-7 h-7 text-[var(--crimson)] animate-spin" />
                                <span className="text-sm font-bold text-[var(--ink)]">
                                  Extracting fields with AI Vision...
                                </span>
                                <span className="text-xs text-[var(--ink-2)]">
                                  Checking dd/mm dates, venue, eligibility &amp; confidence
                                </span>
                              </>
                            ) : (
                              <>
                                <UploadCloud className="w-8 h-8 text-[var(--crimson)]" />
                                <span className="text-sm font-bold text-[var(--ink)]">
                                  Upload Event Poster
                                </span>
                                <span className="text-xs text-[var(--ink-2)]">
                                  JPG, PNG, WEBP up to 5 MB · EXIF metadata stripped
                                </span>
                              </>
                            )}
                          </button>
                        </div>

                        <div className="lg:col-span-7 space-y-2.5">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-2)]">
                            Or test live AI Vision extraction on a sample poster:
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {samplePosters.map((sample) => (
                              <button
                                key={sample.id}
                                type="button"
                                disabled={extracting}
                                onClick={() => handleSamplePoster(sample)}
                                className="p-2.5 rounded-[12px] border border-[var(--border-ink)] bg-[var(--paper-input)] hover:bg-[var(--feel-tint)] text-left flex items-center gap-3 transition-colors disabled:opacity-50"
                              >
                                <div className="w-10 h-13 rounded-[6px] overflow-hidden border border-[var(--border-ink)] shrink-0 bg-[var(--feel-tint)]">
                                  <img
                                    src={sample.imagePath}
                                    alt={sample.label}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-[var(--ink)] line-clamp-2">
                                    {sample.label}
                                  </div>
                                  <div className="text-[11px] text-[var(--crimson)] font-semibold mt-0.5 inline-flex items-center gap-1">
                                    <FileImage className="w-3 h-3" />
                                    <span>Extract with AI</span>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {extractError && (
                        <div className="p-3.5 bg-[var(--crimson-tint)] border border-[var(--crimson)] text-xs sm:text-sm font-medium text-[var(--crimson)] flex items-start gap-2.5">
                          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>{extractError}</span>
                        </div>
                      )}
                    </section>

                    {showReview && (
                      <section
                        ref={reviewFormRef}
                        className="paper-card p-6 space-y-5 cp-scroll-target"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[var(--border-warm)]">
                          <div>
                            <h2 className="font-display text-xl font-extrabold tracking-[-0.03em] text-[var(--ink)]">
                              Review &amp; Confirm Official Listing
                            </h2>
                            <p className="text-xs text-[var(--ink-2)]">
                              Amber fields scored below 0.70 confidence and must be confirmed before publishing.
                            </p>
                          </div>
                          {extractionMeta && (
                            <div className="text-xs font-mono tabular-nums text-[var(--ink-2)]">
                              {extractionMeta.language} · {extractionMeta.latencyMs ?? 0} ms{' '}
                              {extractionMeta.cached ? '(cached)' : ''}
                            </div>
                          )}
                        </div>

                        {extractionMeta && extractionMeta.warnings.length > 0 && (
                          <div className="p-3.5 rounded-[12px] bg-[var(--amber-tint)] border border-[var(--amber-border)] space-y-1 text-xs text-[var(--amber-ink)]">
                            {extractionMeta.multiple_events && (
                              <div className="font-bold">
                                Multiple events detected on poster — extracted primary event only.
                              </div>
                            )}
                            {extractionMeta.warnings.map((w, i) => (
                              <div key={i} className="flex items-start gap-2">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                <span>{w}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                          <div className="lg:col-span-4 space-y-4">
                            <div className="aspect-[3/4] rounded-[14px] overflow-hidden border border-[var(--border-ink)] bg-[var(--feel-tint)]">
                              <PosterImage
                                src={posterPreview || DEFAULT_POSTER}
                                alt="Uploaded poster preview"
                                title={title || 'Event Poster'}
                                className="w-full h-full object-cover"
                              />
                            </div>

                            {lowConfFields.length > 0 && (
                              <div className="p-3 rounded-[10px] bg-[var(--amber-tint)] border border-[var(--amber-border)] text-xs text-[var(--amber-ink)]">
                                <strong>{unconfirmedLowConf.length}</strong> amber field(s) remaining to confirm.
                              </div>
                            )}

                            <div className="p-4 rounded-[14px] border border-[var(--border-ink)] bg-[var(--paper-raised)] space-y-3">
                              <div className="flex items-center justify-between gap-2">
                                <div className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
                                  <Film className="w-4 h-4 text-[var(--crimson)] shrink-0" />
                                  <span>Promo Reel Video</span>
                                </div>
                                <span className="text-[11px] font-mono text-[var(--ink-2)]">MP4/WebM · 30MB</span>
                              </div>

                              <input
                                ref={videoInputRef}
                                type="file"
                                accept="video/mp4,video/webm,video/quicktime"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handlePromoVideoUpload(file, 'publish');
                                  e.target.value = '';
                                }}
                              />

                              {promoVideoUrl ? (
                                <div className="space-y-2.5">
                                  <div className="relative mx-auto w-full max-w-[210px] aspect-[9/16] rounded-[12px] overflow-hidden border border-[var(--border-ink)] bg-[var(--ink)]">
                                    <video
                                      src={promoVideoUrl}
                                      controls
                                      muted
                                      loop
                                      playsInline
                                      className="w-full h-full object-cover"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setPromoVideoUrl('')}
                                      aria-label="Remove promo reel"
                                      className="paper-btn-secondary absolute top-2 right-2 w-7 h-7 flex items-center justify-center"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                  <button
                                    type="button"
                                    disabled={uploadingVideo}
                                    onClick={() => videoInputRef.current?.click()}
                                    className="paper-btn-secondary w-full min-h-[36px] px-3 py-1.5 text-xs"
                                  >
                                    Replace Promo Reel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  disabled={uploadingVideo}
                                  onClick={() => videoInputRef.current?.click()}
                                  className="w-full min-h-[42px] px-3 py-2 border border-dashed border-[var(--border-ink)] hover:border-[var(--crimson)] bg-[var(--paper-input)] text-xs font-semibold text-[var(--ink)] inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                                >
                                  {uploadingVideo ? (
                                    <>
                                      <Loader2 className="w-4 h-4 text-[var(--crimson)] animate-spin" />
                                      <span>Uploading Reel...</span>
                                    </>
                                  ) : (
                                    <>
                                      <UploadCloud className="w-4 h-4 text-[var(--crimson)]" />
                                      <span>Upload Promo Reel</span>
                                    </>
                                  )}
                                </button>
                              )}

                              {videoUploadError && (
                                <div className="text-[11px] font-semibold text-[var(--crimson)]">
                                  {videoUploadError}
                                </div>
                              )}

                              <label className="block space-y-1">
                                <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ink-2)]">
                                  Or Paste Direct Video URL
                                </span>
                                <input
                                  type="url"
                                  value={promoVideoUrl}
                                  onChange={(e) => setPromoVideoUrl(e.target.value)}
                                  placeholder="https://... or upload MP4 above"
                                  className="paper-input w-full min-h-[36px] px-2.5 py-1 text-xs font-mono"
                                />
                              </label>

                              <label className="block space-y-1">
                                <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ink-2)]">
                                  Reel Caption (Optional)
                                </span>
                                <input
                                  type="text"
                                  maxLength={120}
                                  value={promoVideoCaption}
                                  onChange={(e) => setPromoVideoCaption(e.target.value)}
                                  placeholder="e.g. 24-hr build sprint teaser"
                                  className="paper-input w-full min-h-[36px] px-2.5 py-1 text-xs"
                                />
                              </label>
                            </div>
                          </div>

                          <div className="lg:col-span-8 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                              <ReviewField
                                label="Event Title"
                                fieldKey="title"
                                confidence={confidenceMap.title}
                                confirmed={confirmedFields.title}
                                onConfirm={() => setConfirmedFields((p) => ({ ...p, title: true }))}
                                className="sm:col-span-2"
                              >
                                <input
                                  type="text"
                                  value={title}
                                  onChange={(e) => {
                                    setTitle(e.target.value);
                                    setConfirmedFields((p) => ({ ...p, title: true }));
                                  }}
                                  className="paper-input w-full min-h-[38px] px-3 py-1.5 text-sm"
                                />
                              </ReviewField>

                              <ReviewField
                                label="Category"
                                fieldKey="type"
                                confidence={confidenceMap.type}
                                confirmed={confirmedFields.type}
                                onConfirm={() => setConfirmedFields((p) => ({ ...p, type: true }))}
                              >
                                <select
                                  value={type}
                                  onChange={(e) => {
                                    setType(e.target.value as EventType);
                                    setConfirmedFields((p) => ({ ...p, type: true }));
                                  }}
                                  className="paper-input w-full min-h-[38px] px-3 py-1.5 text-sm"
                                >
                                  <option value="Hackathon">Hackathon</option>
                                  <option value="Workshop">Workshop</option>
                                  <option value="Talk">Talk</option>
                                  <option value="Cultural">Cultural</option>
                                  <option value="Competition">Competition</option>
                                  <option value="Meetup">Meetup</option>
                                </select>
                              </ReviewField>

                              <ReviewField
                                label="Campus Region Hub"
                                fieldKey="areaId"
                                confirmed={true}
                                onConfirm={() => {}}
                              >
                                <select
                                  value={areaId}
                                  onChange={(e) => setAreaId(e.target.value)}
                                  className="paper-input w-full min-h-[38px] px-3 py-1.5 text-sm"
                                >
                                  {areas.map((a) => (
                                    <option key={a.id} value={a.id}>
                                      {a.name}
                                    </option>
                                  ))}
                                </select>
                              </ReviewField>

                              <div className="sm:col-span-2">
                                <PlaceSearchInput
                                  label="Pin Exact Venue / Campus Location on Google Maps"
                                  placeholder="Search auditorium, campus block, or university..."
                                  mapsEnabled={mapsEnabled}
                                  onSelect={(place) => {
                                    setVenueName((curr) => curr || place.name);
                                    setPlaceId(place.placeId);
                                    setFormattedAddress(place.formattedAddress);
                                    setLat(place.lat);
                                    setLng(place.lng);
                                  }}
                                  helperText={
                                    formattedAddress ? `Pinned: ${formattedAddress}` : undefined
                                  }
                                />
                              </div>

                              <ReviewField
                                label="Start Date & Time (IST)"
                                fieldKey="start_datetime_ist"
                                confidence={confidenceMap.start_datetime_ist}
                                confirmed={confirmedFields.start_datetime_ist}
                                onConfirm={() =>
                                  setConfirmedFields((p) => ({ ...p, start_datetime_ist: true }))
                                }
                              >
                                <input
                                  type="datetime-local"
                                  value={startDatetimeIst}
                                  onChange={(e) => {
                                    setStartDatetimeIst(e.target.value);
                                    setConfirmedFields((p) => ({ ...p, start_datetime_ist: true }));
                                  }}
                                  className="paper-input w-full min-h-[38px] px-3 py-1.5 text-sm font-mono tabular-nums"
                                />
                              </ReviewField>

                              <ReviewField
                                label="End Date & Time (IST)"
                                fieldKey="end_datetime_ist"
                                confidence={confidenceMap.end_datetime_ist}
                                confirmed={confirmedFields.end_datetime_ist}
                                onConfirm={() =>
                                  setConfirmedFields((p) => ({ ...p, end_datetime_ist: true }))
                                }
                              >
                                <input
                                  type="datetime-local"
                                  value={endDatetimeIst}
                                  onChange={(e) => {
                                    setEndDatetimeIst(e.target.value);
                                    setConfirmedFields((p) => ({ ...p, end_datetime_ist: true }));
                                  }}
                                  className="paper-input w-full min-h-[38px] px-3 py-1.5 text-sm font-mono tabular-nums"
                                />
                              </ReviewField>

                              <ReviewField
                                label="Venue Name"
                                fieldKey="venue_name"
                                confidence={confidenceMap.venue_name}
                                confirmed={confirmedFields.venue_name}
                                onConfirm={() =>
                                  setConfirmedFields((p) => ({ ...p, venue_name: true }))
                                }
                              >
                                <input
                                  type="text"
                                  value={venueName}
                                  onChange={(e) => {
                                    setVenueName(e.target.value);
                                    setConfirmedFields((p) => ({ ...p, venue_name: true }));
                                  }}
                                  className="paper-input w-full min-h-[38px] px-3 py-1.5 text-sm"
                                />
                              </ReviewField>

                              <ReviewField
                                label="Registration Deadline (IST)"
                                fieldKey="registration_deadline_ist"
                                confidence={confidenceMap.registration_deadline_ist}
                                confirmed={confirmedFields.registration_deadline_ist}
                                onConfirm={() =>
                                  setConfirmedFields((p) => ({
                                    ...p,
                                    registration_deadline_ist: true,
                                  }))
                                }
                              >
                                <input
                                  type="datetime-local"
                                  value={regDeadlineIst}
                                  onChange={(e) => {
                                    setRegDeadlineIst(e.target.value);
                                    setConfirmedFields((p) => ({
                                      ...p,
                                      registration_deadline_ist: true,
                                    }));
                                  }}
                                  className="paper-input w-full min-h-[38px] px-3 py-1.5 text-sm font-mono tabular-nums"
                                />
                              </ReviewField>

                              <div className="grid grid-cols-2 gap-2.5">
                                <ReviewField
                                  label="Fee (INR)"
                                  fieldKey="fee_inr"
                                  confidence={confidenceMap.fee_inr}
                                  confirmed={confirmedFields.fee_inr}
                                  onConfirm={() => setConfirmedFields((p) => ({ ...p, fee_inr: true }))}
                                >
                                  <input
                                    type="number"
                                    min={0}
                                    value={feeInr}
                                    onChange={(e) => {
                                      setFeeInr(e.target.value);
                                      setConfirmedFields((p) => ({ ...p, fee_inr: true }));
                                    }}
                                    className="paper-input w-full min-h-[38px] px-3 py-1.5 text-sm font-mono tabular-nums"
                                  />
                                </ReviewField>

                                <ReviewField
                                  label="Capacity"
                                  fieldKey="capacity"
                                  confidence={confidenceMap.capacity}
                                  confirmed={confirmedFields.capacity}
                                  onConfirm={() =>
                                    setConfirmedFields((p) => ({ ...p, capacity: true }))
                                  }
                                >
                                  <input
                                    type="number"
                                    min={1}
                                    value={capacity}
                                    onChange={(e) => {
                                      setCapacity(e.target.value);
                                      setConfirmedFields((p) => ({ ...p, capacity: true }));
                                    }}
                                    className="paper-input w-full min-h-[38px] px-3 py-1.5 text-sm font-mono tabular-nums"
                                  />
                                </ReviewField>
                              </div>

                              <div className="grid grid-cols-2 gap-2.5">
                                <label className="block space-y-1">
                                  <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ink-2)]">
                                    Audience
                                  </span>
                                  <select
                                    value={audience}
                                    onChange={(e) =>
                                      setAudience(e.target.value as 'open_to_all' | 'host_college_only')
                                    }
                                    className="paper-input w-full min-h-[38px] px-2.5 py-1.5 text-xs"
                                  >
                                    <option value="open_to_all">Open to All Colleges</option>
                                    <option value="host_college_only">Host College Only</option>
                                  </select>
                                </label>

                                <label className="block space-y-1">
                                  <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ink-2)]">
                                    Mode
                                  </span>
                                  <select
                                    value={mode}
                                    onChange={(e) => setMode(e.target.value as EventMode)}
                                    className="paper-input w-full min-h-[38px] px-2.5 py-1.5 text-xs"
                                  >
                                    <option value="In-Person">In-Person</option>
                                    <option value="Hybrid">Hybrid</option>
                                    <option value="Online">Online</option>
                                  </select>
                                </label>
                              </div>

                              <label className="block space-y-1">
                                <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ink-2)]">
                                  Eligible Branches
                                </span>
                                <input
                                  type="text"
                                  value={branchesText}
                                  onChange={(e) => setBranchesText(e.target.value)}
                                  className="paper-input w-full min-h-[38px] px-3 py-1.5 text-sm"
                                />
                              </label>

                              <label className="block space-y-1">
                                <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ink-2)]">
                                  Eligible Years
                                </span>
                                <input
                                  type="text"
                                  value={yearsText}
                                  onChange={(e) => setYearsText(e.target.value)}
                                  className="paper-input w-full min-h-[38px] px-3 py-1.5 text-sm"
                                />
                              </label>

                              <ReviewField
                                label="Registration Link (https://)"
                                fieldKey="registration_link"
                                confidence={confidenceMap.registration_link}
                                confirmed={confirmedFields.registration_link}
                                onConfirm={() =>
                                  setConfirmedFields((p) => ({ ...p, registration_link: true }))
                                }
                                className="sm:col-span-2"
                              >
                                <input
                                  type="url"
                                  value={regLink}
                                  onChange={(e) => {
                                    setRegLink(e.target.value);
                                    setConfirmedFields((p) => ({ ...p, registration_link: true }));
                                  }}
                                  className="paper-input w-full min-h-[38px] px-3 py-1.5 text-sm font-mono"
                                />
                              </ReviewField>

                              <label className="block space-y-1 sm:col-span-2">
                                <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ink-2)]">
                                  Summary / Event Description
                                </span>
                                <textarea
                                  rows={3}
                                  maxLength={1500}
                                  value={description}
                                  onChange={(e) => setDescription(e.target.value)}
                                  className="paper-input w-full px-3 py-2 text-sm"
                                />
                              </label>

                              <div className="sm:col-span-2 pt-3 border-t border-[var(--border-warm)] space-y-3">
                                <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--crimson)]">
                                  College Payment, Google Form &amp; Community Links
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <label className="block space-y-1">
                                    <span className="text-[11px] font-semibold text-[var(--ink-2)]">
                                      Official UPI ID
                                    </span>
                                    <input
                                      type="text"
                                      value={upiId}
                                      onChange={(e) => setUpiId(e.target.value)}
                                      placeholder="e.g. events@sbi"
                                      className="paper-input w-full min-h-[38px] px-3 py-1.5 text-sm font-mono"
                                    />
                                  </label>
                                  <label className="block space-y-1">
                                    <span className="text-[11px] font-semibold text-[var(--ink-2)]">
                                      Payment Portal Link
                                    </span>
                                    <input
                                      type="url"
                                      value={paymentUrl}
                                      onChange={(e) => setPaymentUrl(e.target.value)}
                                      placeholder="https://payments.college.ac.in/..."
                                      className="paper-input w-full min-h-[38px] px-3 py-1.5 text-sm font-mono"
                                    />
                                  </label>
                                  <label className="block space-y-1">
                                    <span className="text-[11px] font-semibold text-[var(--ink-2)]">
                                      Payment Note
                                    </span>
                                    <input
                                      type="text"
                                      value={paymentAccountNote}
                                      onChange={(e) => setPaymentAccountNote(e.target.value)}
                                      className="paper-input w-full min-h-[38px] px-3 py-1.5 text-sm"
                                    />
                                  </label>
                                  <label className="block space-y-1">
                                    <span className="text-[11px] font-semibold text-[var(--ink-2)]">
                                      Refund Policy
                                    </span>
                                    <input
                                      type="text"
                                      value={refundPolicy}
                                      onChange={(e) => setRefundPolicy(e.target.value)}
                                      className="paper-input w-full min-h-[38px] px-3 py-1.5 text-sm"
                                    />
                                  </label>
                                  <label className="block space-y-1 sm:col-span-2">
                                    <span className="text-[11px] font-semibold text-[var(--ink-2)]">
                                      Google Form Link
                                    </span>
                                    <input
                                      type="url"
                                      value={googleFormUrl}
                                      onChange={(e) => setGoogleFormUrl(e.target.value)}
                                      placeholder="https://forms.gle/..."
                                      className="paper-input w-full min-h-[38px] px-3 py-1.5 text-sm font-mono"
                                    />
                                  </label>
                                  <label className="block space-y-1">
                                    <span className="text-[11px] font-semibold text-[var(--ink-2)]">
                                      WhatsApp Group Link
                                    </span>
                                    <input
                                      type="url"
                                      value={whatsappGroupUrl}
                                      onChange={(e) => setWhatsappGroupUrl(e.target.value)}
                                      placeholder="https://chat.whatsapp.com/..."
                                      className="paper-input w-full min-h-[38px] px-3 py-1.5 text-sm font-mono"
                                    />
                                  </label>
                                  <label className="block space-y-1">
                                    <span className="text-[11px] font-semibold text-[var(--ink-2)]">
                                      Telegram Group Link
                                    </span>
                                    <input
                                      type="url"
                                      value={telegramGroupUrl}
                                      onChange={(e) => setTelegramGroupUrl(e.target.value)}
                                      placeholder="https://t.me/..."
                                      className="paper-input w-full min-h-[38px] px-3 py-1.5 text-sm font-mono"
                                    />
                                  </label>
                                </div>
                              </div>

                              <div className="sm:col-span-2 pt-3 border-t border-[var(--border-warm)] space-y-3">
                                <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--crimson)]">
                                  Rules, Format, Perks &amp; Coordinator Contact
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <label className="block space-y-1 sm:col-span-2">
                                    <span className="text-[11px] font-semibold text-[var(--ink-2)]">
                                      Team Size / Participation Format
                                    </span>
                                    <input
                                      type="text"
                                      value={teamSize}
                                      onChange={(e) => setTeamSize(e.target.value)}
                                      className="paper-input w-full min-h-[38px] px-3 py-1.5 text-sm"
                                    />
                                  </label>
                                  <label className="block space-y-1 sm:col-span-2">
                                    <span className="text-[11px] font-semibold text-[var(--ink-2)]">
                                      Rules (one per line)
                                    </span>
                                    <textarea
                                      rows={3}
                                      value={rulesText}
                                      onChange={(e) => setRulesText(e.target.value)}
                                      className="paper-input w-full px-3 py-2 text-sm"
                                    />
                                  </label>
                                  <label className="block space-y-1">
                                    <span className="text-[11px] font-semibold text-[var(--ink-2)]">
                                      Prizes &amp; Perks (one per line)
                                    </span>
                                    <textarea
                                      rows={2}
                                      value={prizesText}
                                      onChange={(e) => setPrizesText(e.target.value)}
                                      className="paper-input w-full px-3 py-2 text-sm"
                                    />
                                  </label>
                                  <label className="block space-y-1">
                                    <span className="text-[11px] font-semibold text-[var(--ink-2)]">
                                      Prerequisites (one per line)
                                    </span>
                                    <textarea
                                      rows={2}
                                      value={prerequisitesText}
                                      onChange={(e) => setPrerequisitesText(e.target.value)}
                                      className="paper-input w-full px-3 py-2 text-sm"
                                    />
                                  </label>
                                  <label className="block space-y-1">
                                    <span className="text-[11px] font-semibold text-[var(--ink-2)]">
                                      Coordinator Name
                                    </span>
                                    <input
                                      type="text"
                                      value={coordinatorName}
                                      onChange={(e) => setCoordinatorName(e.target.value)}
                                      className="paper-input w-full min-h-[38px] px-3 py-1.5 text-sm"
                                    />
                                  </label>
                                  <label className="block space-y-1">
                                    <span className="text-[11px] font-semibold text-[var(--ink-2)]">
                                      Coordinator Role
                                    </span>
                                    <input
                                      type="text"
                                      value={coordinatorRole}
                                      onChange={(e) => setCoordinatorRole(e.target.value)}
                                      className="paper-input w-full min-h-[38px] px-3 py-1.5 text-sm"
                                    />
                                  </label>
                                  <label className="block space-y-1">
                                    <span className="text-[11px] font-semibold text-[var(--ink-2)]">
                                      Coordinator Phone
                                    </span>
                                    <input
                                      type="tel"
                                      value={coordinatorPhone}
                                      onChange={(e) => setCoordinatorPhone(e.target.value)}
                                      className="paper-input w-full min-h-[38px] px-3 py-1.5 text-sm font-mono"
                                    />
                                  </label>
                                  <label className="block space-y-1">
                                    <span className="text-[11px] font-semibold text-[var(--ink-2)]">
                                      Coordinator Email
                                    </span>
                                    <input
                                      type="email"
                                      value={coordinatorEmail}
                                      onChange={(e) => setCoordinatorEmail(e.target.value)}
                                      className="paper-input w-full min-h-[38px] px-3 py-1.5 text-sm"
                                    />
                                  </label>
                                </div>
                              </div>

                              <div className="sm:col-span-2 pt-3 border-t border-[var(--border-warm)]">
                                <ScheduleBuilder schedule={schedule} onChange={setSchedule} />
                              </div>
                            </div>

                            {typeof lat === 'number' && typeof lng === 'number' && (
                              <div className="flex items-center gap-2 text-xs text-[var(--olive)] font-medium">
                                <MapPin className="w-3.5 h-3.5 shrink-0" />
                                <span>
                                  Coordinates pinned via Google Maps ({lat.toFixed(4)}, {lng.toFixed(4)})
                                </span>
                              </div>
                            )}

                            {duplicateWarning && (
                              <div className="p-3.5 rounded-[12px] bg-[var(--amber-tint)] border border-[var(--amber-border)] text-xs text-[var(--amber-ink)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                  <strong>Possible duplicate detected:</strong> &ldquo;{duplicateWarning.title}&rdquo; is already listed for{' '}
                                  {formatIstFull(duplicateWarning.startAt)} IST.
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handlePublish(true)}
                                  className="paper-btn-ink min-h-[36px] px-3 py-1.5 whitespace-nowrap"
                                >
                                  Publish Anyway
                                </button>
                              </div>
                            )}

                            {publishError && (
                              <div className="p-3 bg-[var(--crimson-tint)] border border-[var(--crimson)] text-xs font-medium text-[var(--crimson)]">
                                {publishError}
                              </div>
                            )}

                            <div className="pt-2 flex flex-wrap items-center justify-end gap-3">
                              <button
                                type="button"
                                onClick={() => setShowReview(false)}
                                className="paper-btn-secondary min-h-[44px] px-4 py-2 text-sm"
                              >
                                Discard
                              </button>
                              <button
                                type="button"
                                disabled={publishing || unconfirmedLowConf.length > 0}
                                onClick={() => handlePublish(false)}
                                className="paper-btn-primary min-h-[44px] px-6 py-2.5 text-sm"
                              >
                                {publishing
                                  ? 'Publishing & Alerting...'
                                  : unconfirmedLowConf.length > 0
                                    ? `Confirm ${unconfirmedLowConf.length} Flagged Field(s)`
                                    : 'Publish Official Event'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </section>
                    )}
                  </div>
                )}

                {/* C. Events & Live QR Gate */}
                <section className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h2 className="font-display text-xl font-extrabold tracking-[-0.03em] text-[var(--ink)]">
                      Live Events ({filteredCollegeRosterEvents.length})
                    </h2>
                  </div>

                  {filteredCollegeRosterEvents.length === 0 ? (
                    <div className="paper-card-soft p-6 border border-[var(--border-warm)] text-sm text-[var(--ink-2)]">
                      {publishedAndCancelledEvents.length === 0
                        ? 'No live events published yet.'
                        : 'No events match the selected filter.'}
                    </div>
                  ) : (
                    <div className="paper-card overflow-hidden divide-y divide-[var(--border-warm)]">
                      {filteredCollegeRosterEvents.map((evt) => {
                        const eventRegs = registrations.filter(
                          (r) => r.eventId === evt.id && r.status !== 'cancelled'
                        );
                        const pendingFeesCount = eventRegs.filter(
                          (r) => r.paymentStatus === 'pending_verification'
                        ).length;
                        const checkedInCount = eventRegs.filter((r) => r.status === 'checked_in').length;
                        const isRosterOpen = rosterEventId === evt.id;
                        const isPastEvent = new Date(evt.endAt).getTime() < Date.now();
                        const fillPct =
                          evt.capacity > 0
                            ? Math.min(100, Math.round((evt.confirmedCount / evt.capacity) * 100))
                            : 0;
                        const sourceLabel =
                          evt.sourceType === 'club_approved'
                            ? 'Club Event · Approved'
                            : evt.sourceType === 'external_verified'
                              ? 'External Verified Partner'
                              : 'Campus Official';

                        return (
                          <div key={evt.id} className="p-4 sm:p-6 space-y-4">
                            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                              <div className="flex items-start gap-3.5 flex-1 min-w-0">
                                <div className="w-14 sm:w-16 aspect-[3/4] rounded-[10px] overflow-hidden border border-[var(--border-ink)] shrink-0 bg-[var(--feel-tint)]">
                                  <PosterImage
                                    src={evt.posterUrl}
                                    alt={evt.title}
                                    title={evt.title}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="space-y-1.5 flex-1 min-w-0">
                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                                    <span className="font-mono tabular-nums text-[var(--ink-2)]">
                                      {formatIstFull(evt.startAt)} IST
                                    </span>
                                    <span aria-hidden="true">·</span>
                                    <span
                                      className={
                                        evt.status === 'cancelled'
                                          ? 'text-[var(--crimson)] font-bold'
                                          : isPastEvent
                                            ? 'text-[var(--ink-2)] font-bold'
                                            : 'text-[var(--olive)] font-bold'
                                      }
                                    >
                                      {evt.status === 'cancelled'
                                        ? 'Cancelled'
                                        : isPastEvent
                                          ? 'Completed'
                                          : 'Live'}
                                    </span>
                                    <span aria-hidden="true">·</span>
                                    <span className="font-semibold text-[var(--ink-2)]">
                                      {sourceLabel}
                                    </span>
                                    {evt.revisionPendingReview && (
                                      <>
                                        <span aria-hidden="true">·</span>
                                        <span className="font-bold text-[var(--amber-ink)]">
                                          Revision Pending Review
                                        </span>
                                      </>
                                    )}
                                  </div>
                                  <div className="font-display font-bold text-base sm:text-lg text-[var(--ink)] truncate">
                                    {evt.title}
                                  </div>

                                {editingId === evt.id ? (
                                  <div
                                    ref={editFormRef}
                                    className="mt-3 p-4 rounded-[12px] bg-[var(--paper-raised)] border border-[var(--border-ink)] space-y-3 cp-scroll-target"
                                  >
                                    <div className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--crimson)]">
                                      Edit Full Event Details
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      <label className="block space-y-1 sm:col-span-2">
                                        <span className="text-[11px] font-semibold text-[var(--ink-2)]">
                                          Event Title
                                        </span>
                                        <input
                                          type="text"
                                          value={editTitle}
                                          onChange={(e) => setEditTitle(e.target.value)}
                                          className="paper-input w-full min-h-[38px] px-3 py-1.5 text-sm"
                                        />
                                      </label>
                                      <label className="block space-y-1 sm:col-span-2">
                                        <span className="text-[11px] font-semibold text-[var(--ink-2)]">
                                          Venue Name
                                        </span>
                                        <input
                                          type="text"
                                          value={editVenue}
                                          onChange={(e) => setEditVenue(e.target.value)}
                                          className="paper-input w-full min-h-[38px] px-3 py-1.5 text-sm"
                                        />
                                      </label>
                                      <label className="block space-y-1 sm:col-span-2">
                                        <span className="text-[11px] font-semibold text-[var(--ink-2)]">
                                          Gate Address / Block Landmark
                                        </span>
                                        <input
                                          type="text"
                                          value={editFormattedAddress}
                                          onChange={(e) => setEditFormattedAddress(e.target.value)}
                                          placeholder="Campus block, floor, or nearest entry gate"
                                          className="paper-input w-full min-h-[38px] px-3 py-1.5 text-sm"
                                        />
                                      </label>
                                      <label className="block space-y-1">
                                        <span className="text-[11px] font-semibold text-[var(--ink-2)]">
                                          Start (IST)
                                        </span>
                                        <input
                                          type="datetime-local"
                                          value={editStartIst}
                                          onChange={(e) => setEditStartIst(e.target.value)}
                                          className="paper-input w-full min-h-[38px] px-3 py-1.5 text-xs font-mono tabular-nums"
                                        />
                                      </label>
                                      <label className="block space-y-1">
                                        <span className="text-[11px] font-semibold text-[var(--ink-2)]">
                                          End (IST)
                                        </span>
                                        <input
                                          type="datetime-local"
                                          value={editEndIst}
                                          onChange={(e) => setEditEndIst(e.target.value)}
                                          className="paper-input w-full min-h-[38px] px-3 py-1.5 text-xs font-mono tabular-nums"
                                        />
                                      </label>
                                      <label className="block space-y-1">
                                        <span className="text-[11px] font-semibold text-[var(--ink-2)]">
                                          Registration Deadline (IST)
                                        </span>
                                        <input
                                          type="datetime-local"
                                          value={editDeadlineIst}
                                          onChange={(e) => setEditDeadlineIst(e.target.value)}
                                          className="paper-input w-full min-h-[38px] px-3 py-1.5 text-xs font-mono tabular-nums"
                                        />
                                      </label>
                                      <div className="grid grid-cols-2 gap-2.5">
                                        <label className="block space-y-1">
                                          <span className="text-[11px] font-semibold text-[var(--ink-2)]">
                                            Fee (INR)
                                          </span>
                                          <input
                                            type="number"
                                            min={0}
                                            value={editFeeInr}
                                            onChange={(e) => setEditFeeInr(e.target.value)}
                                            className="paper-input w-full min-h-[38px] px-3 py-1.5 text-xs font-mono tabular-nums"
                                          />
                                        </label>
                                        <label className="block space-y-1">
                                          <span className="text-[11px] font-semibold text-[var(--ink-2)]">
                                            Capacity
                                          </span>
                                          <input
                                            type="number"
                                            min={Math.max(1, evt.confirmedCount)}
                                            value={editCapacity}
                                            onChange={(e) => setEditCapacity(e.target.value)}
                                            className="paper-input w-full min-h-[38px] px-3 py-1.5 text-xs font-mono tabular-nums"
                                          />
                                        </label>
                                      </div>
                                      <label className="block space-y-1">
                                        <span className="text-[11px] font-semibold text-[var(--ink-2)]">
                                          Mode
                                        </span>
                                        <select
                                          value={editMode}
                                          onChange={(e) => setEditMode(e.target.value as EventMode)}
                                          className="paper-input w-full min-h-[38px] px-3 py-1.5 text-xs"
                                        >
                                          <option value="In-Person">In-Person</option>
                                          <option value="Hybrid">Hybrid</option>
                                          <option value="Online">Online</option>
                                        </select>
                                      </label>
                                      <label className="block space-y-1">
                                        <span className="text-[11px] font-semibold text-[var(--ink-2)]">
                                          Registration Status
                                        </span>
                                        <select
                                          value={editRegStatus}
                                          onChange={(e) => setEditRegStatus(e.target.value as RegStatus)}
                                          className="paper-input w-full min-h-[38px] px-3 py-1.5 text-xs"
                                        >
                                          <option value="open">Open</option>
                                          <option value="closed">Closed</option>
                                        </select>
                                      </label>
                                      <label className="block space-y-1 sm:col-span-2">
                                        <span className="text-[11px] font-semibold text-[var(--ink-2)]">
                                          Description
                                        </span>
                                        <textarea
                                          rows={3}
                                          maxLength={1500}
                                          value={editDescription}
                                          onChange={(e) => setEditDescription(e.target.value)}
                                          className="paper-input w-full px-3 py-2 text-xs"
                                        />
                                      </label>
                                      <label className="block space-y-1 sm:col-span-2">
                                        <span className="text-[11px] font-semibold text-[var(--ink-2)]">
                                          Team Size / Format
                                        </span>
                                        <input
                                          type="text"
                                          value={editTeamSize}
                                          onChange={(e) => setEditTeamSize(e.target.value)}
                                          className="paper-input w-full min-h-[38px] px-3 py-1.5 text-xs"
                                        />
                                      </label>
                                      <label className="block space-y-1">
                                        <span className="text-[11px] font-semibold text-[var(--ink-2)]">
                                          UPI ID
                                        </span>
                                        <input
                                          type="text"
                                          value={editUpiId}
                                          onChange={(e) => setEditUpiId(e.target.value)}
                                          className="paper-input w-full min-h-[38px] px-3 py-1.5 text-xs font-mono"
                                        />
                                      </label>
                                      <label className="block space-y-1">
                                        <span className="text-[11px] font-semibold text-[var(--ink-2)]">
                                          Payment URL
                                        </span>
                                        <input
                                          type="url"
                                          value={editPaymentUrl}
                                          onChange={(e) => setEditPaymentUrl(e.target.value)}
                                          className="paper-input w-full min-h-[38px] px-3 py-1.5 text-xs font-mono"
                                        />
                                      </label>
                                      <label className="block space-y-1">
                                        <span className="text-[11px] font-semibold text-[var(--ink-2)]">
                                          Payment Note
                                        </span>
                                        <input
                                          type="text"
                                          value={editPaymentAccountNote}
                                          onChange={(e) => setEditPaymentAccountNote(e.target.value)}
                                          className="paper-input w-full min-h-[38px] px-3 py-1.5 text-xs"
                                        />
                                      </label>
                                      <label className="block space-y-1">
                                        <span className="text-[11px] font-semibold text-[var(--ink-2)]">
                                          Refund Policy
                                        </span>
                                        <input
                                          type="text"
                                          value={editRefundPolicy}
                                          onChange={(e) => setEditRefundPolicy(e.target.value)}
                                          className="paper-input w-full min-h-[38px] px-3 py-1.5 text-xs"
                                        />
                                      </label>
                                      <label className="block space-y-1 sm:col-span-2">
                                        <span className="text-[11px] font-semibold text-[var(--ink-2)]">
                                          Google Form URL
                                        </span>
                                        <input
                                          type="url"
                                          value={editGoogleFormUrl}
                                          onChange={(e) => setEditGoogleFormUrl(e.target.value)}
                                          className="paper-input w-full min-h-[38px] px-3 py-1.5 text-xs font-mono"
                                        />
                                      </label>
                                      <label className="block space-y-1">
                                        <span className="text-[11px] font-semibold text-[var(--ink-2)]">
                                          WhatsApp Group URL
                                        </span>
                                        <input
                                          type="url"
                                          value={editWhatsappGroupUrl}
                                          onChange={(e) => setEditWhatsappGroupUrl(e.target.value)}
                                          className="paper-input w-full min-h-[38px] px-3 py-1.5 text-xs font-mono"
                                        />
                                      </label>
                                      <label className="block space-y-1">
                                        <span className="text-[11px] font-semibold text-[var(--ink-2)]">
                                          Telegram Group URL
                                        </span>
                                        <input
                                          type="url"
                                          value={editTelegramGroupUrl}
                                          onChange={(e) => setEditTelegramGroupUrl(e.target.value)}
                                          className="paper-input w-full min-h-[38px] px-3 py-1.5 text-xs font-mono"
                                        />
                                      </label>
                                      <label className="block space-y-1 sm:col-span-2">
                                        <span className="text-[11px] font-semibold text-[var(--ink-2)]">
                                          Rules (one per line)
                                        </span>
                                        <textarea
                                          rows={3}
                                          value={editRulesText}
                                          onChange={(e) => setEditRulesText(e.target.value)}
                                          className="paper-input w-full px-3 py-2 text-xs"
                                        />
                                      </label>
                                      <label className="block space-y-1">
                                        <span className="text-[11px] font-semibold text-[var(--ink-2)]">
                                          Prizes &amp; Perks
                                        </span>
                                        <textarea
                                          rows={2}
                                          value={editPrizesText}
                                          onChange={(e) => setEditPrizesText(e.target.value)}
                                          className="paper-input w-full px-3 py-2 text-xs"
                                        />
                                      </label>
                                      <label className="block space-y-1">
                                        <span className="text-[11px] font-semibold text-[var(--ink-2)]">
                                          Prerequisites
                                        </span>
                                        <textarea
                                          rows={2}
                                          value={editPrerequisitesText}
                                          onChange={(e) => setEditPrerequisitesText(e.target.value)}
                                          className="paper-input w-full px-3 py-2 text-xs"
                                        />
                                      </label>
                                      <label className="block space-y-1">
                                        <span className="text-[11px] font-semibold text-[var(--ink-2)]">
                                          Coordinator Name
                                        </span>
                                        <input
                                          type="text"
                                          value={editCoordName}
                                          onChange={(e) => setEditCoordName(e.target.value)}
                                          className="paper-input w-full min-h-[38px] px-3 py-1.5 text-xs"
                                        />
                                      </label>
                                      <label className="block space-y-1">
                                        <span className="text-[11px] font-semibold text-[var(--ink-2)]">
                                          Coordinator Role
                                        </span>
                                        <input
                                          type="text"
                                          value={editCoordRole}
                                          onChange={(e) => setEditCoordRole(e.target.value)}
                                          className="paper-input w-full min-h-[38px] px-3 py-1.5 text-xs"
                                        />
                                      </label>
                                      <label className="block space-y-1">
                                        <span className="text-[11px] font-semibold text-[var(--ink-2)]">
                                          Coordinator Phone
                                        </span>
                                        <input
                                          type="tel"
                                          value={editCoordPhone}
                                          onChange={(e) => setEditCoordPhone(e.target.value)}
                                          className="paper-input w-full min-h-[38px] px-3 py-1.5 text-xs font-mono"
                                        />
                                      </label>
                                      <label className="block space-y-1">
                                        <span className="text-[11px] font-semibold text-[var(--ink-2)]">
                                          Coordinator Email
                                        </span>
                                        <input
                                          type="email"
                                          value={editCoordEmail}
                                          onChange={(e) => setEditCoordEmail(e.target.value)}
                                          className="paper-input w-full min-h-[38px] px-3 py-1.5 text-xs"
                                        />
                                      </label>

                                      <div className="sm:col-span-2 pt-2 border-t border-[var(--border-warm)]">
                                        <ScheduleBuilder
                                          schedule={editSchedule}
                                          onChange={setEditSchedule}
                                          compact={true}
                                        />
                                      </div>

                                      <div className="sm:col-span-2 pt-2 border-t border-[var(--border-warm)] space-y-2.5">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                          <span className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
                                            <Film className="w-3.5 h-3.5 text-[var(--crimson)]" />
                                            <span>Promo Reel Video</span>
                                          </span>
                                          <div className="flex items-center gap-2">
                                            <input
                                              ref={editVideoInputRef}
                                              type="file"
                                              accept="video/mp4,video/webm,video/quicktime"
                                              className="hidden"
                                              onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) handlePromoVideoUpload(file, 'edit');
                                                e.target.value = '';
                                              }}
                                            />
                                            <button
                                              type="button"
                                              disabled={uploadingEditVideo}
                                              onClick={() => editVideoInputRef.current?.click()}
                                              className="paper-btn-secondary min-h-[34px] px-3 py-1 text-xs inline-flex items-center gap-1.5"
                                            >
                                              {uploadingEditVideo ? (
                                                <>
                                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--crimson)]" />
                                                  <span>Uploading...</span>
                                                </>
                                              ) : (
                                                <>
                                                  <UploadCloud className="w-3.5 h-3.5 text-[var(--crimson)]" />
                                                  <span>
                                                    {editPromoVideoUrl ? 'Replace Reel' : 'Upload MP4/WebM'}
                                                  </span>
                                                </>
                                              )}
                                            </button>
                                            {editPromoVideoUrl && (
                                              <button
                                                type="button"
                                                onClick={() => setEditPromoVideoUrl('')}
                                                className="min-h-[34px] px-2.5 py-1 border border-[var(--crimson)] text-[var(--crimson)] hover:bg-[var(--crimson-tint)] text-xs font-semibold"
                                              >
                                                Remove
                                              </button>
                                            )}
                                          </div>
                                        </div>

                                        {editVideoError && (
                                          <div className="text-xs font-semibold text-[var(--crimson)]">
                                            {editVideoError}
                                          </div>
                                        )}

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                          <label className="block space-y-1">
                                            <span className="text-[11px] font-semibold text-[var(--ink-2)]">
                                              Promo Reel URL
                                            </span>
                                            <input
                                              type="text"
                                              value={editPromoVideoUrl}
                                              onChange={(e) => setEditPromoVideoUrl(e.target.value)}
                                              className="paper-input w-full min-h-[36px] px-3 py-1 text-xs font-mono"
                                            />
                                          </label>
                                          <label className="block space-y-1">
                                            <span className="text-[11px] font-semibold text-[var(--ink-2)]">
                                              Reel Caption
                                            </span>
                                            <input
                                              type="text"
                                              maxLength={120}
                                              value={editPromoVideoCaption}
                                              onChange={(e) => setEditPromoVideoCaption(e.target.value)}
                                              className="paper-input w-full min-h-[36px] px-3 py-1 text-xs"
                                            />
                                          </label>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-end gap-2 pt-1">
                                      <button
                                        type="button"
                                        onClick={() => setEditingId(null)}
                                        className="paper-btn-secondary min-h-[36px] px-3 py-1.5 text-xs"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        type="button"
                                        disabled={savingEdit}
                                        onClick={async () => {
                                          setSavingEdit(true);
                                          try {
                                            const splitLines = (raw: string) =>
                                              raw
                                                .split('\n')
                                                .map((s) => s.trim())
                                                .filter(Boolean);
                                            const hasPayment =
                                              editUpiId.trim() ||
                                              editPaymentUrl.trim() ||
                                              editPaymentAccountNote.trim() ||
                                              editRefundPolicy.trim();
                                            const hasCoord =
                                              editCoordName.trim() ||
                                              editCoordRole.trim() ||
                                              editCoordPhone.trim() ||
                                              editCoordEmail.trim();
                                            await onUpdateEvent(evt.id, {
                                              action: 'edit',
                                              title: editTitle,
                                              venueName: editVenue,
                                              formattedAddress: editFormattedAddress.trim() || undefined,
                                              description: editDescription,
                                              startDatetimeIst: editStartIst,
                                              endDatetimeIst: editEndIst,
                                              regDeadlineIst: editDeadlineIst,
                                              feeInr: Number(editFeeInr) || 0,
                                              capacity: Number(editCapacity) || evt.capacity,
                                              mode: editMode,
                                              regStatus: editRegStatus,
                                              googleFormUrl: editGoogleFormUrl.trim(),
                                              whatsappGroupUrl: editWhatsappGroupUrl.trim(),
                                              telegramGroupUrl: editTelegramGroupUrl.trim(),
                                              paymentInfo: hasPayment
                                                ? {
                                                    upiId: editUpiId.trim() || undefined,
                                                    paymentUrl: editPaymentUrl.trim() || undefined,
                                                    accountNote: editPaymentAccountNote.trim() || undefined,
                                                    refundPolicy: editRefundPolicy.trim() || undefined,
                                                  }
                                                : undefined,
                                              rules: splitLines(editRulesText),
                                              teamSize: editTeamSize.trim(),
                                              prizesAndPerks: splitLines(editPrizesText),
                                              prerequisites: splitLines(editPrerequisitesText),
                                              schedule: editSchedule,
                                              coordinatorContact: hasCoord
                                                ? {
                                                    name: editCoordName.trim() || 'Event Coordinator',
                                                    role: editCoordRole.trim() || evt.clubName,
                                                    phone: editCoordPhone.trim() || undefined,
                                                    email: editCoordEmail.trim() || undefined,
                                                  }
                                                : undefined,
                                              promoVideoUrl: editPromoVideoUrl.trim(),
                                              promoVideoCaption: editPromoVideoCaption.trim(),
                                            });
                                            setEditingId(null);
                                          } finally {
                                            setSavingEdit(false);
                                          }
                                        }}
                                        className="paper-btn-ink min-h-[36px] px-4 py-1.5 text-xs"
                                      >
                                        {savingEdit ? 'Saving...' : 'Save Details & Notify'}
                                      </button>
                                    </div>
                                  </div>
                                ) : (() => {
                                  const evtReviews = collegeFeedbackItems.filter(
                                    (f) => f.eventId === evt.id
                                  );
                                  const avgRating =
                                    evtReviews.length > 0
                                      ? evtReviews.reduce((sum, r) => sum + r.rating, 0) /
                                        evtReviews.length
                                      : null;
                                  return (
                                    <div className="space-y-2 pt-0.5">
                                      <div className="text-xs text-[var(--ink-2)]">
                                        {evt.venueName} · {evt.clubName}
                                      </div>
                                      <div className="max-w-md space-y-1">
                                        <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-[var(--ink-2)]">
                                          <span>
                                            <strong className="text-[var(--ink)]">{evt.confirmedCount}</strong>/{evt.capacity} seats filled ({fillPct}%)
                                          </span>
                                          <span>{evt.waitlistCount} waitlisted</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-[var(--border-warm)] overflow-hidden">
                                          <div
                                            className={`h-full ${fillPct >= 95 ? 'bg-[var(--crimson)]' : 'bg-[var(--olive)]'}`}
                                            style={{ width: `${fillPct}%` }}
                                          />
                                        </div>
                                      </div>
                                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono tabular-nums">
                                        <span className="px-2 py-0.5 border border-[var(--border-warm)] bg-[var(--paper-raised)] text-[var(--ink-2)]">
                                          {evt.viewCount ?? 0} views
                                        </span>
                                        <span className="px-2 py-0.5 border border-[var(--border-warm)] bg-[var(--paper-raised)] text-[var(--olive)] font-semibold">
                                          {checkedInCount} checked in
                                        </span>
                                        <span className="px-2 py-0.5 border border-[var(--border-warm)] bg-[var(--paper-raised)] text-[var(--ink-2)]">
                                          {formatFee(evt.feeInr)}
                                        </span>
                                        {avgRating !== null && (
                                          <span className="px-2 py-0.5 border border-[var(--border-warm)] bg-[var(--paper-raised)] text-[var(--ink)] font-semibold">
                                            ★ {avgRating.toFixed(1)} ({evtReviews.length})
                                          </span>
                                        )}
                                        {pendingFeesCount > 0 && (
                                          <button
                                            type="button"
                                            onClick={() => setRosterEventId(evt.id)}
                                            className="px-2 py-0.5 border border-[var(--amber-border)] bg-[var(--amber-tint)] hover:bg-[var(--feel-tint)] text-[var(--amber-ink)] font-semibold cursor-pointer"
                                          >
                                            Verify {pendingFeesCount} pending fee(s) →
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })()}
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setInspectedEventId(evt.id)}
                                  className="paper-btn-secondary min-h-[38px] px-3 py-1.5 text-xs inline-flex items-center gap-1.5"
                                >
                                  <Eye className="w-3.5 h-3.5 text-[var(--crimson)]" />
                                  <span>View</span>
                                </button>
                                {evt.status !== 'cancelled' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => setRosterEventId(isRosterOpen ? null : evt.id)}
                                      className={`min-h-[38px] px-3 py-1.5 text-xs inline-flex items-center gap-1.5 ${
                                        isRosterOpen ? 'paper-btn-ink' : 'paper-btn-secondary'
                                      }`}
                                    >
                                      <Users className="w-3.5 h-3.5" />
                                      <span>Roster ({eventRegs.length})</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => startEditingEvent(evt)}
                                      className="paper-btn-secondary min-h-[38px] px-3 py-1.5 text-xs inline-flex items-center gap-1.5"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                      <span>Edit Details</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => onUpdateEvent(evt.id, { action: 'cancel' })}
                                      className="min-h-[38px] px-3 py-1.5 text-xs font-semibold border border-[var(--crimson)] text-[var(--crimson)] hover:bg-[var(--crimson-tint)]"
                                    >
                                      Cancel Event
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>

                            {isRosterOpen && (
                              <div ref={rosterRef} className="cp-scroll-target">
                                <QrScannerCheckIn
                                  event={evt}
                                  registrations={eventRegs}
                                  onCheckIn={onCheckIn}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              </div>
            )}

            {/* SECTION 4: FEEDBACKS (EVENT-FIRST DRILL-DOWN + SURVEYS) */}
            {studioSection === 'feedback' && (
              <div className="space-y-6">
                <section className="pb-4 border-b border-[var(--border-warm)] flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div className="space-y-1">
                    <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-[-0.04em] text-[var(--ink)]">
                      Feedbacks
                    </h1>
                    <div className="text-xs font-mono tabular-nums text-[var(--ink-2)]">
                      {collegeFeedbackItems.length} {collegeFeedbackItems.length === 1 ? 'review' : 'reviews'} across {feedbackEventList.length} {feedbackEventList.length === 1 ? 'event' : 'events'}
                    </div>
                  </div>

                  <div className="paper-segment shrink-0">
                    <button
                      type="button"
                      aria-pressed={feedbackSubTab === 'events'}
                      onClick={() => setFeedbackSubTab('events')}
                      className="paper-segment-btn min-h-[36px] px-3.5 py-1.5 text-xs tabular-nums"
                    >
                      Event Reviews ({collegeFeedbackItems.length})
                    </button>
                    <button
                      type="button"
                      aria-pressed={feedbackSubTab === 'surveys'}
                      onClick={() => setFeedbackSubTab('surveys')}
                      className="paper-segment-btn min-h-[36px] px-3.5 py-1.5 text-xs tabular-nums"
                    >
                      Surveys ({collegeSurveys.length})
                    </button>
                  </div>
                </section>

                {feedbackSubTab === 'events' && (
                  !selectedFeedbackEvent ? (
                    feedbackEventList.length === 0 ? (
                      <div className="paper-card p-8 text-center space-y-2">
                        <Star className="w-7 h-7 text-[var(--amber-ink)] mx-auto" />
                        <div className="font-display text-base font-extrabold text-[var(--ink)]">
                          No Events Available
                        </div>
                        <p className="text-xs text-[var(--ink-2)]">
                          Published events will appear here once student ratings and reviews begin coming in.
                        </p>
                      </div>
                    ) : (
                      <div className="paper-card overflow-hidden divide-y divide-[var(--border-warm)]">
                        {feedbackEventList.map((evt) => {
                          const evtReviews = collegeFeedbackItems.filter((f) => f.eventId === evt.id);
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
                                setAiReport(null);
                                setAiError(null);
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
                                    {evt.clubName} · {evt.type} · {formatIstFull(evt.startAt)}
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
                    )
                  ) : (
                    (() => {
                      const avg =
                        selectedEventFeedbackItems.length > 0
                          ? selectedEventFeedbackItems.reduce((sum, r) => sum + r.rating, 0) /
                            selectedEventFeedbackItems.length
                          : null;
                      return (
                        <div className="space-y-5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedFeedbackEventId(null);
                              setAiReport(null);
                              setAiError(null);
                            }}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.06em] text-[var(--ink-2)] hover:text-[var(--crimson)]"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span>All Events</span>
                          </button>

                          {/* Top Event Rating Summary Card */}
                          <section className="paper-card p-5 sm:p-6 space-y-5">
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
                                    {selectedFeedbackEvent.clubName} · {formatIstFull(selectedFeedbackEvent.startAt)} · {selectedFeedbackEvent.venueName}
                                  </div>
                                </div>
                              </div>

                              {onAnalyzeCampusFeedback && (
                                <button
                                  type="button"
                                  disabled={analyzingAi || selectedEventFeedbackItems.length === 0}
                                  onClick={() => void handleRunAiAnalysis(selectedFeedbackEvent.id)}
                                  className="paper-btn-secondary min-h-[38px] px-3.5 py-1.5 text-xs uppercase tracking-[0.05em] inline-flex items-center gap-1.5 shrink-0 self-start md:self-center"
                                >
                                  {analyzingAi ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Sparkles className="w-3.5 h-3.5 text-[var(--crimson)]" />
                                  )}
                                  <span>{analyzingAi ? 'Analyzing...' : 'Analyze with AI'}</span>
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
                                  {selectedEventFeedbackItems.length}{' '}
                                  {selectedEventFeedbackItems.length === 1 ? 'review' : 'reviews'}
                                </div>
                              </div>

                              <div className="sm:col-span-8 space-y-1.5">
                                {[5, 4, 3, 2, 1].map((stars) => {
                                  const count = selectedEventFeedbackItems.filter((f) => f.rating === stars).length;
                                  const pct =
                                    selectedEventFeedbackItems.length > 0
                                      ? Math.round((count / selectedEventFeedbackItems.length) * 100)
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

                            {aiError && (
                              <div className="p-3 bg-[var(--crimson-tint)] border border-[var(--crimson)] text-xs font-semibold text-[var(--crimson)]">
                                {aiError}
                              </div>
                            )}

                            {aiReport && (
                              <div className="p-4 rounded-[12px] border border-[var(--border-ink)] bg-[var(--paper-raised)] space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[var(--border-warm)]">
                                  <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--crimson)]">
                                    AI Summary
                                  </span>
                                  <div className="flex items-center gap-3 text-xs font-mono tabular-nums">
                                    <span className="text-[var(--olive)]">+{aiReport.sentimentBreakdown.positive}</span>
                                    <span className="text-[var(--ink-2)]">~{aiReport.sentimentBreakdown.neutral}</span>
                                    <span className="text-[var(--crimson)]">-{aiReport.sentimentBreakdown.negative}</span>
                                  </div>
                                </div>
                                <p className="text-xs sm:text-sm text-[var(--ink)] leading-relaxed">
                                  {aiReport.summaryNote}
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                  <div className="space-y-1">
                                    <div className="font-bold text-[var(--crimson)]">Common Complaints</div>
                                    {aiReport.commonComplaints.length === 0 ? (
                                      <p className="text-[var(--ink-2)]">None flagged.</p>
                                    ) : (
                                      <ul className="space-y-1">
                                        {aiReport.commonComplaints.map((item, i) => (
                                          <li key={i} className="text-[var(--ink)]">
                                            <strong>{item.theme}</strong> ({item.count}x)
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                  </div>
                                  <div className="space-y-1">
                                    <div className="font-bold text-[var(--olive)]">Suggestions</div>
                                    {aiReport.recurringSuggestions.length === 0 ? (
                                      <p className="text-[var(--ink-2)]">None recorded.</p>
                                    ) : (
                                      <ul className="space-y-1">
                                        {aiReport.recurringSuggestions.map((item, i) => (
                                          <li key={i} className="text-[var(--ink)]">
                                            <strong>{item.theme}</strong> ({item.count}x)
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </section>

                          {/* Student Reviews for Selected Event */}
                          {selectedEventFeedbackItems.length === 0 ? (
                            <div className="paper-card p-8 text-center text-xs text-[var(--ink-2)]">
                              No student reviews submitted for this event yet.
                            </div>
                          ) : (
                            <div className="paper-card overflow-hidden divide-y divide-[var(--border-warm)]">
                              {selectedEventFeedbackItems.map((fb) => (
                                <div key={fb.id} className="p-4 sm:p-5 space-y-2">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 text-xs">
                                      <span className="inline-flex items-center gap-1 font-mono font-bold text-[var(--amber-ink)] tabular-nums">
                                        <Star className="w-3.5 h-3.5 fill-current" />
                                        {fb.rating}/5
                                      </span>
                                      <span aria-hidden="true">·</span>
                                      <span className="font-semibold text-[var(--ink)]">
                                        {fb.isAnonymous ? 'Anonymous Student' : fb.authorName}
                                      </span>
                                    </div>
                                    <span className="font-mono text-[11px] text-[var(--ink-2)] tabular-nums">
                                      {formatIstFull(fb.createdAt)}
                                    </span>
                                  </div>
                                  {fb.comment && (
                                    <p className="text-xs sm:text-sm text-[var(--ink)] leading-relaxed">
                                      {fb.comment}
                                    </p>
                                  )}
                                  {fb.suggestion && (
                                    <p className="text-xs text-[var(--olive)] font-medium">
                                      Suggestion: {fb.suggestion}
                                    </p>
                                  )}
                                  {fb.complaint && (
                                    <p className="text-xs text-[var(--crimson)] font-medium">
                                      Issue reported: {fb.complaint}
                                    </p>
                                  )}
                                  {fb.requestedCategory && (
                                    <div className="text-[11px] font-semibold text-[var(--ink-2)]">
                                      Requested topic: {fb.requestedCategory}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()
                  )
                )}

                {feedbackSubTab === 'surveys' && (
                  <section className="paper-card p-6 space-y-5">
                    <div className="pb-4 border-b border-[var(--border-warm)]">
                      <h2 className="font-display text-xl font-extrabold tracking-[-0.03em] text-[var(--ink)]">
                        Campus Surveys ({collegeSurveys.length})
                      </h2>
                      <p className="text-xs text-[var(--ink-2)]">
                        Publish quick polls or event-interest surveys for students.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      <form
                        onSubmit={handleCreateSurveySubmit}
                        className="lg:col-span-5 p-4 rounded-[12px] border border-[var(--border-ink)] bg-[var(--paper-raised)] space-y-3"
                      >
                        <div className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
                          <BarChart3 className="w-4 h-4 text-[var(--crimson)]" />
                          <span>Create Survey</span>
                        </div>
                        <label className="block space-y-1">
                          <span className="text-[11px] font-semibold text-[var(--ink-2)]">Survey Title</span>
                          <input
                            type="text"
                            required
                            maxLength={120}
                            value={surveyTitle}
                            onChange={(e) => setSurveyTitle(e.target.value)}
                            placeholder="e.g. Spring Fest Workshop Priorities"
                            className="paper-input w-full min-h-[38px] px-3 py-1.5 text-sm"
                          />
                        </label>
                        <label className="block space-y-1">
                          <span className="text-[11px] font-semibold text-[var(--ink-2)]">Question Prompt</span>
                          <input
                            type="text"
                            required
                            maxLength={240}
                            value={surveyPrompt}
                            onChange={(e) => setSurveyPrompt(e.target.value)}
                            placeholder="Which tracks or timing slots work best for you?"
                            className="paper-input w-full min-h-[38px] px-3 py-1.5 text-sm"
                          />
                        </label>
                        <label className="block space-y-1">
                          <span className="text-[11px] font-semibold text-[var(--ink-2)]">
                            Description (Optional)
                          </span>
                          <textarea
                            rows={2}
                            maxLength={320}
                            value={surveyDescription}
                            onChange={(e) => setSurveyDescription(e.target.value)}
                            placeholder="Used to schedule next month's workshops."
                            className="paper-input w-full px-3 py-2 text-xs"
                          />
                        </label>
                        <label className="block space-y-1">
                          <span className="text-[11px] font-semibold text-[var(--ink-2)]">
                            Poll Options (comma or new line separated, optional)
                          </span>
                          <textarea
                            rows={2}
                            value={surveyOptionsText}
                            onChange={(e) => setSurveyOptionsText(e.target.value)}
                            placeholder="AI Systems Lab, Design Sprint, Cybersecurity CTF"
                            className="paper-input w-full px-3 py-2 text-xs"
                          />
                        </label>
                        <label className="flex items-center gap-2 text-xs font-semibold text-[var(--ink)]">
                          <input
                            type="checkbox"
                            checked={surveyAllowAnonymous}
                            onChange={(e) => setSurveyAllowAnonymous(e.target.checked)}
                            className="accent-[var(--crimson)]"
                          />
                          <span>Allow students to respond anonymously</span>
                        </label>

                        {surveyError && (
                          <div className="text-xs font-semibold text-[var(--crimson)]">{surveyError}</div>
                        )}

                        <div className="flex justify-end">
                          <button
                            type="submit"
                            disabled={creatingSurvey || !onCreateSurvey || !surveyTitle.trim() || !surveyPrompt.trim()}
                            className="paper-btn-primary min-h-[38px] px-4 py-1.5 text-xs"
                          >
                            {creatingSurvey ? 'Publishing...' : 'Publish Survey'}
                          </button>
                        </div>
                      </form>

                      <div className="lg:col-span-7 space-y-3">
                        {collegeSurveys.length === 0 ? (
                          <div className="p-5 rounded-[12px] border border-[var(--border-warm)] bg-[var(--paper-raised)] text-xs text-[var(--ink-2)]">
                            No surveys created yet. Launch one on the left to gather student input.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {collegeSurveys.map((srv) => {
                              const resps = surveyResponses.filter((r) => r.surveyId === srv.id);
                              return (
                                <div
                                  key={srv.id}
                                  className="p-4 rounded-[12px] border border-[var(--border-ink)] bg-[var(--paper-raised)] space-y-3"
                                >
                                  <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div className="space-y-0.5 min-w-0">
                                      <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--crimson)]">
                                        {srv.status === 'active' ? 'Active Survey' : 'Closed Survey'} · {resps.length} response(s)
                                      </div>
                                      <div className="font-display font-bold text-base text-[var(--ink)]">
                                        {srv.title}
                                      </div>
                                      <p className="text-xs text-[var(--ink-2)]">{srv.questionPrompt}</p>
                                    </div>
                                    {onToggleSurveyStatus && (
                                      <button
                                        type="button"
                                        disabled={togglingSurveyId === srv.id}
                                        onClick={async () => {
                                          setTogglingSurveyId(srv.id);
                                          try {
                                            await onToggleSurveyStatus(
                                              srv.id,
                                              srv.status === 'active' ? 'closed' : 'active',
                                              activeOrg?.id
                                            );
                                          } finally {
                                            setTogglingSurveyId(null);
                                          }
                                        }}
                                        className="paper-btn-secondary min-h-[32px] px-3 py-1 text-xs shrink-0"
                                      >
                                        {srv.status === 'active' ? 'Close Survey' : 'Reopen'}
                                      </button>
                                    )}
                                  </div>

                                  {(srv.options || []).length > 0 && (
                                    <div className="space-y-2">
                                      {(srv.options || []).map((opt) => {
                                        const count = resps.filter((r) => r.selectedOption === opt).length;
                                        const votePct =
                                          resps.length > 0
                                            ? Math.round((count / resps.length) * 100)
                                            : 0;
                                        return (
                                          <div key={opt} className="space-y-1 px-3 py-2 rounded-[8px] border border-[var(--border-warm)] bg-[var(--paper)]">
                                            <div className="flex items-center justify-between text-xs gap-2">
                                              <span className="font-medium text-[var(--ink)]">{opt}</span>
                                              <span className="font-mono text-[var(--crimson)] tabular-nums shrink-0">
                                                {count} ({votePct}%)
                                              </span>
                                            </div>
                                            <div className="w-full h-1.5 bg-[var(--border-warm)] overflow-hidden">
                                              <div
                                                className="h-full bg-[var(--crimson)]"
                                                style={{ width: `${votePct}%` }}
                                              />
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}

                                  {resps.length > 0 && (
                                    <div className="pt-2 border-t border-[var(--border-warm)] space-y-1.5 max-h-40 overflow-y-auto">
                                      {resps.map((r) => (
                                        <div key={r.id} className="text-xs text-[var(--ink-2)]">
                                          <strong className="text-[var(--ink)]">
                                            {r.isAnonymous ? 'Anonymous Student' : r.respondentName || 'Student'}
                                          </strong>
                                          {typeof r.rating === 'number' ? ` · ★ ${r.rating}/5` : ''}
                                          {r.selectedOption ? ` · [${r.selectedOption}]` : ''}
                                          {r.responseText ? `: ${r.responseText}` : ''}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </section>
                )}
              </div>
            )}

            {/* SECTION 5: CLUBS & SINGLE-USE EXPIRING INVITES */}
            {studioSection === 'clubs' && (
              <div className="space-y-6">
                <section className="pb-4 border-b border-[var(--border-warm)] flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div className="space-y-1">
                    <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-[-0.04em] text-[var(--ink)]">
                      Clubs &amp; Members
                    </h1>
                    <p className="text-xs sm:text-sm text-[var(--ink-2)]">
                      Manage onboarded clubs ({collegeClubsOnly.length}), appointed officials ({collegeOfficialsOnlyTeam.length}), and single-use Club Leader invites.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenInviteAccept('')}
                    className="paper-btn-secondary min-h-[40px] px-4 py-2 text-xs inline-flex items-center gap-1.5 whitespace-nowrap self-start sm:self-auto"
                  >
                    <KeyRound className="w-4 h-4 text-[var(--crimson)] shrink-0" />
                    <span>Redeem Club Invite</span>
                  </button>
                </section>

                {replaceSuccess && (
                  <div className="p-3.5 rounded-[12px] bg-[var(--olive-tint)] border border-[var(--olive-border)] text-xs font-semibold text-[var(--olive)]">
                    {replaceSuccess}
                  </div>
                )}
                {replaceError && (
                  <div className="p-3.5 bg-[var(--crimson-tint)] border border-[var(--crimson)] text-xs font-semibold text-[var(--crimson)]">
                    {replaceError}
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  <div className="lg:col-span-6 space-y-5">
                    <div className="space-y-2.5">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-2)]">
                        Registered Student Clubs ({collegeClubsOnly.length})
                      </div>
                      {collegeClubsOnly.length === 0 ? (
                        <div className="paper-card p-5 text-xs text-[var(--ink-2)]">
                          No student club leaders onboarded yet. Generate an invite link on the right to onboard a club leader.
                        </div>
                      ) : (
                        <div className="paper-card overflow-hidden divide-y divide-[var(--border-warm)]">
                          {collegeClubsOnly.map((member) => {
                            const clubEvts = collegeEvents.filter((e) => e.clubId === member.id);
                            const liveCount = clubEvts.filter((e) => e.status === 'published').length;
                            const pendingCount = clubEvts.filter(
                              (e) => e.status === 'pending_review' || e.revisionPendingReview
                            ).length;
                            const isReplacing = replacingMemberId === member.id;
                            return (
                              <div key={member.id} className="p-4 space-y-2.5 text-xs">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0 space-y-1">
                                    <div className="font-display font-bold text-sm text-[var(--ink)]">
                                      {member.clubName}
                                    </div>
                                    <div className="text-[var(--ink)] font-semibold">
                                      {member.contactName}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono tabular-nums text-[var(--ink-2)]">
                                      <span className="text-[var(--olive)] font-semibold">
                                        {liveCount} live
                                      </span>
                                      <span>·</span>
                                      <span className={pendingCount > 0 ? 'text-[var(--crimson)] font-semibold' : ''}>
                                        {pendingCount} awaiting review
                                      </span>
                                    </div>
                                  </div>

                                  {canManageInvites && (
                                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                                      {onReplaceMember && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setReplacingMemberId(isReplacing ? null : member.id);
                                            setReplaceEmailInput('');
                                            setReplaceError(null);
                                          }}
                                          className="paper-btn-secondary min-h-[32px] px-2.5 py-1 text-xs inline-flex items-center gap-1"
                                        >
                                          <RefreshCw className="w-3 h-3" />
                                          <span>Replace</span>
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => onRevokeMember(member.id)}
                                        className="min-h-[32px] px-2.5 py-1 text-xs font-semibold text-[var(--crimson)] hover:bg-[var(--crimson-tint)] border border-[var(--crimson)] inline-flex items-center gap-1"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>Remove</span>
                                      </button>
                                    </div>
                                  )}
                                </div>

                                {isReplacing && onReplaceMember && (
                                  <form
                                    onSubmit={async (e) => {
                                      e.preventDefault();
                                      setReplaceBusy(true);
                                      setReplaceError(null);
                                      setReplaceSuccess(null);
                                      try {
                                        const inv = await onReplaceMember(member.id, {
                                          newLeaderEmail: replaceEmailInput.trim() || undefined,
                                          clubName: member.clubName,
                                        });
                                        setReplaceSuccess(
                                          `Replaced ${member.contactName} for ${member.clubName}. Issued new single-use invite code ${inv.code}.`
                                        );
                                        setReplacingMemberId(null);
                                        setReplaceEmailInput('');
                                      } catch (err) {
                                        setReplaceError(
                                          err instanceof Error ? err.message : 'Could not replace Club Leader.'
                                        );
                                      } finally {
                                        setReplaceBusy(false);
                                      }
                                    }}
                                    className="p-3 rounded-[10px] border border-[var(--border-ink)] bg-[var(--paper-raised)] space-y-2"
                                  >
                                    <div className="text-[11px] font-semibold text-[var(--ink)]">
                                      Revoke {member.contactName} &amp; issue replacement single-use invite
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-2">
                                      <input
                                        type="email"
                                        value={replaceEmailInput}
                                        onChange={(e) => setReplaceEmailInput(e.target.value)}
                                        placeholder="New leader email (optional lock)"
                                        className="paper-input flex-1 min-h-[34px] px-2.5 py-1 text-xs"
                                      />
                                      <button
                                        type="submit"
                                        disabled={replaceBusy}
                                        className="paper-btn-primary min-h-[34px] px-3 py-1 text-xs whitespace-nowrap"
                                      >
                                        {replaceBusy ? 'Replacing...' : 'Confirm Replace'}
                                      </button>
                                    </div>
                                  </form>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2.5">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-2)]">
                        Appointed Campus Officials ({collegeOfficialsOnlyTeam.length})
                      </div>
                      <div className="paper-card overflow-hidden divide-y divide-[var(--border-warm)]">
                        {collegeOfficialsOnlyTeam.map((official) => {
                          const officialEventsCount = collegeEvents.filter(
                            (e) => e.clubId === official.id
                          ).length;
                          return (
                            <div key={official.id} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                              <div className="min-w-0 space-y-0.5">
                                <div className="font-bold text-[var(--ink)]">
                                  {official.contactName} · {official.clubName}
                                </div>
                                <div className="text-[var(--ink-2)] font-mono truncate">
                                  {officialEventsCount} event{officialEventsCount === 1 ? '' : 's'}
                                </div>
                              </div>
                              <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--olive)] shrink-0">
                                Official
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-6 space-y-5">
                    <form
                      onSubmit={handleCreateInviteSubmit}
                      className="paper-card p-5 space-y-3.5"
                    >
                      <div className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
                        <UserPlus className="w-4 h-4 text-[var(--crimson)] shrink-0" />
                        <span>Issue Club Leader Invite Link</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="block space-y-1 sm:col-span-2">
                          <span className="text-[11px] font-semibold text-[var(--ink-2)]">
                            Club / Society Name
                          </span>
                          <input
                            type="text"
                            required
                            value={inviteClubName}
                            onChange={(e) => setInviteClubName(e.target.value)}
                            placeholder="e.g. IEEE Student Branch / Robotics Club"
                            className="paper-input w-full min-h-[38px] px-3 py-1.5 text-sm"
                          />
                        </label>

                        <label className="block space-y-1 sm:col-span-2">
                          <span className="text-[11px] font-semibold text-[var(--ink-2)]">
                            Lock to Leader Email (Recommended)
                          </span>
                          <input
                            type="email"
                            value={inviteTargetEmail}
                            onChange={(e) => setInviteTargetEmail(e.target.value)}
                            placeholder={`leader@${activeCollege?.emailDomain || 'college.ac.in'}`}
                            className="paper-input w-full min-h-[38px] px-3 py-1.5 text-sm"
                          />
                        </label>

                        <label className="flex items-center gap-2 sm:col-span-2 text-xs font-semibold text-[var(--ink)] pt-0.5">
                          <input
                            type="checkbox"
                            checked={inviteSingleUse}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setInviteSingleUse(checked);
                              setInviteMaxUses(checked ? '1' : '3');
                            }}
                            className="accent-[var(--crimson)]"
                          />
                          <span>Single-use invite (burns immediately after 1 club leader accepts)</span>
                        </label>

                        <label className="block space-y-1">
                          <span className="text-[11px] font-semibold text-[var(--ink-2)]">
                            Expires After
                          </span>
                          <select
                            value={inviteExpiresDays}
                            onChange={(e) => setInviteExpiresDays(e.target.value)}
                            className="paper-input w-full min-h-[38px] px-3 py-1.5 text-sm"
                          >
                            <option value="7">7 Days</option>
                            <option value="14">14 Days</option>
                            <option value="30">30 Days</option>
                          </select>
                        </label>

                        <label className="block space-y-1">
                          <span className="text-[11px] font-semibold text-[var(--ink-2)]">
                            Max Redemptions
                          </span>
                          <select
                            disabled={inviteSingleUse}
                            value={inviteSingleUse ? '1' : inviteMaxUses}
                            onChange={(e) => setInviteMaxUses(e.target.value)}
                            className="paper-input w-full min-h-[38px] px-3 py-1.5 text-sm disabled:opacity-60"
                          >
                            <option value="1">1 Leader (Single-Use)</option>
                            <option value="3">Up to 3 Leaders</option>
                            <option value="5">Up to 5 Leaders</option>
                          </select>
                        </label>
                      </div>

                      {inviteError && (
                        <div className="text-xs font-semibold text-[var(--crimson)]">{inviteError}</div>
                      )}

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={creatingInvite || !inviteClubName.trim()}
                          className="paper-btn-primary min-h-[38px] px-4 py-1.5 text-xs sm:text-sm"
                        >
                          {creatingInvite ? 'Generating...' : 'Generate Club Invite'}
                        </button>
                      </div>
                    </form>

                    {collegeInvites.length > 0 && (
                      <div className="space-y-2.5">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-2)]">
                          Issued Club Invites ({collegeInvites.length})
                        </div>
                        <div className="paper-card overflow-hidden divide-y divide-[var(--border-warm)]">
                          {collegeInvites.map((inv) => (
                            <div key={inv.token} className="p-3.5 space-y-2 text-xs">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="font-bold text-[var(--ink)]">
                                  {inv.clubName} · <span className="font-mono text-[var(--crimson)]">{inv.code}</span>
                                </div>
                                <div className="font-mono text-[11px] tabular-nums text-[var(--ink-2)]">
                                  {inv.status.toUpperCase()} · {inv.singleUse ? 'SINGLE-USE' : `${inv.usedCount}/${inv.maxUses} used`}
                                </div>
                              </div>
                              <div className="text-[11px] font-mono text-[var(--ink-2)] flex flex-wrap items-center gap-x-2">
                                <span>Expires {formatIstFull(inv.expiresAt)}</span>
                                {inv.targetEmail && <span>· Locked to {inv.targetEmail}</span>}
                              </div>
                              {inv.acceptedByNames.length > 0 && (
                                <div className="text-[11px] font-medium text-[var(--olive)]">
                                  Joined: {inv.acceptedByNames.join(', ')}
                                </div>
                              )}
                              <div className="flex flex-wrap items-center gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => handleCopyInviteLink(inv.token)}
                                  className="paper-btn-secondary min-h-[32px] px-2.5 py-1 inline-flex items-center gap-1"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>{copiedToken === inv.token ? 'Copied Link' : 'Copy Link'}</span>
                                </button>
                                {inv.status === 'active' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => onOpenInviteAccept(inv.token)}
                                      className="paper-btn-tint min-h-[32px] px-2.5 py-1 inline-flex items-center gap-1"
                                    >
                                      <Link2 className="w-3.5 h-3.5 text-[var(--crimson)]" />
                                      <span>Preview</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => onRevokeInvite(inv.token)}
                                      className="min-h-[32px] px-2.5 py-1 border border-[var(--crimson)] hover:bg-[var(--crimson-tint)] font-semibold text-[var(--crimson)]"
                                    >
                                      Revoke
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 6: CAMPUS NOTICE BOARD ANNOUNCEMENTS */}
            {studioSection === 'announcements' && (
              <div className="space-y-6">
                <section className="pb-4 border-b border-[var(--border-warm)] space-y-1">
                  <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-[-0.04em] text-[var(--ink)]">
                    Campus Notice Board
                  </h1>
                  <p className="text-xs sm:text-sm text-[var(--ink-2)]">
                    Publish official circulars and advisories. Active notices pin inside <strong>My Campus</strong>.
                  </p>
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  <form
                    onSubmit={handleCreateAnnouncementSubmit}
                    className="lg:col-span-5 paper-card p-5 space-y-3"
                  >
                    <div className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
                      <Megaphone className="w-4 h-4 text-[var(--crimson)] shrink-0" />
                      <span>Publish New Campus Notice</span>
                    </div>
                    <label className="block space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--ink-2)]">
                        <span>Notice Headline</span>
                        <span className="font-mono tabular-nums">{annTitle.length}/140</span>
                      </div>
                      <input
                        type="text"
                        required
                        maxLength={140}
                        value={annTitle}
                        onChange={(e) => setAnnTitle(e.target.value)}
                        placeholder="e.g. Gate ID Check Mandatory for Weekend Hackathon"
                        className="paper-input w-full min-h-[38px] px-3 py-1.5 text-sm"
                      />
                    </label>
                    <label className="block space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--ink-2)]">
                        <span>Official Message</span>
                        <span className="font-mono tabular-nums">{annBody.length}/600</span>
                      </div>
                      <textarea
                        rows={4}
                        required
                        maxLength={600}
                        value={annBody}
                        onChange={(e) => setAnnBody(e.target.value)}
                        placeholder="Clear guidance for students at your institution..."
                        className="paper-input w-full px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold text-[var(--ink)]">
                      <input
                        type="checkbox"
                        checked={annPinned}
                        onChange={(e) => setAnnPinned(e.target.checked)}
                        className="accent-[var(--crimson)]"
                      />
                      <span>Pin notice to top of My Campus</span>
                    </label>

                    {annError && (
                      <div className="text-xs font-semibold text-[var(--crimson)]">{annError}</div>
                    )}

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={annBusy || !annTitle.trim() || !annBody.trim()}
                        className="paper-btn-primary min-h-[38px] px-4 py-1.5 text-xs sm:text-sm"
                      >
                        {annBusy ? 'Publishing...' : 'Publish Notice'}
                      </button>
                    </div>
                  </form>

                  <div className="lg:col-span-7 space-y-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-2)]">
                      Active Campus Notices ({collegeAnnouncements.length})
                    </div>
                    {collegeAnnouncements.length === 0 ? (
                      <div className="paper-card p-6 text-xs text-[var(--ink-2)]">
                        No notices posted yet.
                      </div>
                    ) : (
                      <div className="paper-card overflow-hidden divide-y divide-[var(--border-warm)]">
                        {collegeAnnouncements.map((ann) => (
                          <div key={ann.id} className="p-4 flex items-start justify-between gap-4">
                            <div className="space-y-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-[var(--ink-2)]">
                                {ann.pinned && (
                                  <span className="font-bold text-[var(--crimson)] inline-flex items-center gap-1">
                                    <Pin className="w-3 h-3" />
                                    <span>PINNED</span>
                                  </span>
                                )}
                                <span className="font-semibold text-[var(--ink)]">{ann.authorName}</span>
                                {ann.authorDesignation && <span>({ann.authorDesignation})</span>}
                                <span className="font-mono tabular-nums">
                                  · {formatIstFull(ann.createdAt)}
                                </span>
                              </div>
                              <div className="font-display font-bold text-base text-[var(--ink)]">
                                {ann.title}
                              </div>
                              <p className="text-xs text-[var(--ink-2)] leading-relaxed">{ann.body}</p>
                            </div>

                            <button
                              type="button"
                              onClick={() => onDeleteAnnouncement(ann.id)}
                              className="min-h-[32px] px-2.5 py-1 text-xs font-semibold text-[var(--crimson)] hover:bg-[var(--crimson-tint)] border border-[var(--crimson)] inline-flex items-center gap-1 shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Remove</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </motion.div>

          {/* Full Event Inspection Modal for Review & Approval / Events */}
          {inspectedEvent && (() => {
            const isRev = Boolean(inspectedEvent.revisionPendingReview && inspectedEvent.pendingRevision);
            const rev = inspectedEvent.pendingRevision;
            const isPending = inspectedEvent.status === 'pending_review' || isRev;
            const modalFeedbackVal = reviewFeedbackByEventId[inspectedEvent.id] || '';
            const modalBusy = reviewBusyId === inspectedEvent.id;
            return (
              <div
                className="fixed inset-0 z-50 bg-[var(--ink)]/55 flex items-center justify-center p-4"
                role="dialog"
                aria-modal="true"
                aria-label={`Full details for ${inspectedEvent.title}`}
              >
                <div className="paper-card w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden bg-[var(--paper)]">
                  <div className="px-5 py-4 border-b border-[var(--border-warm)] flex items-start justify-between gap-4 shrink-0">
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--crimson)]">
                        <span>
                          {isRev
                            ? 'Live Event Revision'
                            : inspectedEvent.status === 'pending_review'
                              ? 'Pending Approval'
                              : inspectedEvent.status.replace(/_/g, ' ')}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="text-[var(--ink)]">{inspectedEvent.clubName}</span>
                        {inspectedEvent.submittedByName && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-[var(--ink-2)]">by {inspectedEvent.submittedByName}</span>
                          </>
                        )}
                      </div>
                      <h2 className="font-display text-xl sm:text-2xl font-extrabold tracking-[-0.03em] text-[var(--ink)]">
                        {inspectedEvent.title}
                      </h2>
                    </div>

                    <button
                      type="button"
                      onClick={() => setInspectedEventId(null)}
                      aria-label="Close event inspection"
                      className="min-w-[36px] min-h-[36px] inline-flex items-center justify-center border border-[var(--border-ink)] bg-[var(--paper-raised)] text-[var(--ink)] hover:border-[var(--crimson)] hover:text-[var(--crimson)] shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-xs sm:text-sm">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                      <div className="md:col-span-4 space-y-3">
                        <div className="aspect-[3/4] rounded-[12px] overflow-hidden border border-[var(--border-ink)] bg-[var(--feel-tint)]">
                          <PosterImage
                            src={rev?.posterUrl || inspectedEvent.posterUrl}
                            alt={inspectedEvent.title}
                            title={inspectedEvent.title}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {inspectedEvent.promoVideoUrl && (
                          <div className="space-y-1.5">
                            <div className="text-[11px] font-mono font-bold uppercase tracking-[0.06em] text-[var(--ink-2)]">
                              Promo Reel
                            </div>
                            <video
                              src={inspectedEvent.promoVideoUrl}
                              controls
                              playsInline
                              className="w-full rounded-[10px] border border-[var(--border-ink)] bg-black max-h-64"
                            />
                            {inspectedEvent.promoVideoCaption && (
                              <p className="text-xs text-[var(--ink-2)]">{inspectedEvent.promoVideoCaption}</p>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="md:col-span-8 space-y-5">
                        <div className="space-y-1.5">
                          <div className="text-[11px] font-mono font-bold uppercase tracking-[0.06em] text-[var(--ink-2)]">
                            Full Description
                          </div>
                          <p className="text-sm text-[var(--ink)] leading-relaxed whitespace-pre-wrap">
                            {inspectedEvent.description || 'No description provided.'}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-[12px] border border-[var(--border-warm)] bg-[var(--paper-raised)] text-xs">
                          <div>
                            <div className="text-[11px] font-mono uppercase text-[var(--ink-2)]">Category &amp; Mode</div>
                            <div className="font-semibold text-[var(--ink)]">{inspectedEvent.type} · {inspectedEvent.mode}</div>
                          </div>
                          <div>
                            <div className="text-[11px] font-mono uppercase text-[var(--ink-2)]">Audience</div>
                            <div className="font-semibold text-[var(--ink)]">
                              {inspectedEvent.audience === 'host_college_only' ? 'Host College Only' : 'Open to All'}
                            </div>
                          </div>
                          <div>
                            <div className="text-[11px] font-mono uppercase text-[var(--ink-2)]">Starts (IST)</div>
                            <div className="font-mono font-semibold text-[var(--ink)] tabular-nums">{formatIstFull(inspectedEvent.startAt)}</div>
                          </div>
                          <div>
                            <div className="text-[11px] font-mono uppercase text-[var(--ink-2)]">Ends (IST)</div>
                            <div className="font-mono font-semibold text-[var(--ink)] tabular-nums">{formatIstFull(inspectedEvent.endAt)}</div>
                          </div>
                          <div>
                            <div className="text-[11px] font-mono uppercase text-[var(--ink-2)]">Registration Deadline</div>
                            <div className="font-mono font-semibold text-[var(--ink)] tabular-nums">{formatIstFull(inspectedEvent.regDeadline)}</div>
                          </div>
                          <div>
                            <div className="text-[11px] font-mono uppercase text-[var(--ink-2)]">Fee &amp; Capacity</div>
                            <div className="font-mono font-semibold text-[var(--ink)] tabular-nums">
                              {formatFee(inspectedEvent.feeInr)} · {inspectedEvent.confirmedCount}/{inspectedEvent.capacity} seats
                            </div>
                          </div>
                          <div className="sm:col-span-2">
                            <div className="text-[11px] font-mono uppercase text-[var(--ink-2)]">Venue &amp; Address</div>
                            <div className="font-semibold text-[var(--ink)]">{inspectedEvent.venueName}</div>
                            {inspectedEvent.formattedAddress && (
                              <div className="text-[var(--ink-2)]">{inspectedEvent.formattedAddress}</div>
                            )}
                          </div>
                          <div>
                            <div className="text-[11px] font-mono uppercase text-[var(--ink-2)]">Branches</div>
                            <div className="font-semibold text-[var(--ink)]">
                              {inspectedEvent.branches?.length ? inspectedEvent.branches.join(', ') : 'All'}
                            </div>
                          </div>
                          <div>
                            <div className="text-[11px] font-mono uppercase text-[var(--ink-2)]">Years</div>
                            <div className="font-semibold text-[var(--ink)]">
                              {inspectedEvent.years?.length ? inspectedEvent.years.join(', ') : 'All'}
                            </div>
                          </div>
                          {inspectedEvent.teamSize && (
                            <div className="sm:col-span-2">
                              <div className="text-[11px] font-mono uppercase text-[var(--ink-2)]">Team Size</div>
                              <div className="font-semibold text-[var(--ink)]">{inspectedEvent.teamSize}</div>
                            </div>
                          )}
                        </div>

                        {inspectedEvent.rules && inspectedEvent.rules.length > 0 && (
                          <div className="space-y-1.5">
                            <div className="text-[11px] font-mono font-bold uppercase tracking-[0.06em] text-[var(--ink-2)]">
                              Rules &amp; Guidelines
                            </div>
                            <ul className="list-disc pl-5 space-y-1 text-xs text-[var(--ink)]">
                              {inspectedEvent.rules.map((r, i) => (
                                <li key={i}>{r}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {((inspectedEvent.prizesAndPerks && inspectedEvent.prizesAndPerks.length > 0) ||
                          (inspectedEvent.prerequisites && inspectedEvent.prerequisites.length > 0)) && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                            {inspectedEvent.prizesAndPerks && inspectedEvent.prizesAndPerks.length > 0 && (
                              <div className="space-y-1">
                                <div className="text-[11px] font-mono font-bold uppercase tracking-[0.06em] text-[var(--olive)]">
                                  Prizes &amp; Perks
                                </div>
                                <ul className="list-disc pl-4 space-y-1 text-[var(--ink)]">
                                  {inspectedEvent.prizesAndPerks.map((p, i) => (
                                    <li key={i}>{p}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {inspectedEvent.prerequisites && inspectedEvent.prerequisites.length > 0 && (
                              <div className="space-y-1">
                                <div className="text-[11px] font-mono font-bold uppercase tracking-[0.06em] text-[var(--ink-2)]">
                                  Prerequisites
                                </div>
                                <ul className="list-disc pl-4 space-y-1 text-[var(--ink)]">
                                  {inspectedEvent.prerequisites.map((p, i) => (
                                    <li key={i}>{p}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}

                        {inspectedEvent.paymentInfo &&
                          (inspectedEvent.paymentInfo.upiId ||
                            inspectedEvent.paymentInfo.paymentUrl ||
                            inspectedEvent.paymentInfo.accountNote ||
                            inspectedEvent.paymentInfo.refundPolicy) && (
                            <div className="p-3.5 rounded-[10px] border border-[var(--border-warm)] bg-[var(--paper-raised)] space-y-1.5 text-xs">
                              <div className="text-[11px] font-mono font-bold uppercase tracking-[0.06em] text-[var(--ink-2)]">
                                Payment Details
                              </div>
                              {inspectedEvent.paymentInfo.upiId && (
                                <div><strong>UPI ID:</strong> <span className="font-mono">{inspectedEvent.paymentInfo.upiId}</span></div>
                              )}
                              {inspectedEvent.paymentInfo.paymentUrl && (
                                <div className="truncate">
                                  <strong>Payment URL:</strong>{' '}
                                  <a href={inspectedEvent.paymentInfo.paymentUrl} target="_blank" rel="noreferrer" className="text-[var(--crimson)] underline">
                                    {inspectedEvent.paymentInfo.paymentUrl}
                                  </a>
                                </div>
                              )}
                              {inspectedEvent.paymentInfo.accountNote && (
                                <div><strong>Instructions:</strong> {inspectedEvent.paymentInfo.accountNote}</div>
                              )}
                              {inspectedEvent.paymentInfo.refundPolicy && (
                                <div><strong>Refund Policy:</strong> {inspectedEvent.paymentInfo.refundPolicy}</div>
                              )}
                            </div>
                          )}

                        <div className="space-y-2 text-xs">
                          <div className="text-[11px] font-mono font-bold uppercase tracking-[0.06em] text-[var(--ink-2)]">
                            Links &amp; Contact
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {inspectedEvent.regLink && (
                              <a
                                href={inspectedEvent.regLink}
                                target="_blank"
                                rel="noreferrer"
                                className="paper-btn-secondary px-2.5 py-1 inline-flex items-center gap-1 text-xs"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>Registration Link</span>
                              </a>
                            )}
                            {inspectedEvent.googleFormUrl && (
                              <a
                                href={inspectedEvent.googleFormUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="paper-btn-secondary px-2.5 py-1 inline-flex items-center gap-1 text-xs"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>Google Form</span>
                              </a>
                            )}
                            {inspectedEvent.whatsappGroupUrl && (
                              <a
                                href={inspectedEvent.whatsappGroupUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="paper-btn-secondary px-2.5 py-1 inline-flex items-center gap-1 text-xs"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>WhatsApp Group</span>
                              </a>
                            )}
                            {inspectedEvent.telegramGroupUrl && (
                              <a
                                href={inspectedEvent.telegramGroupUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="paper-btn-secondary px-2.5 py-1 inline-flex items-center gap-1 text-xs"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>Telegram Group</span>
                              </a>
                            )}
                          </div>
                          {inspectedEvent.coordinatorContact && (
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--ink-2)] pt-1">
                              <span className="font-semibold text-[var(--ink)]">
                                {inspectedEvent.coordinatorContact.name}
                                {inspectedEvent.coordinatorContact.role ? ` (${inspectedEvent.coordinatorContact.role})` : ''}
                              </span>
                              {inspectedEvent.coordinatorContact.phone && (
                                <span className="inline-flex items-center gap-1 font-mono">
                                  <Phone className="w-3 h-3" />
                                  {inspectedEvent.coordinatorContact.phone}
                                </span>
                              )}
                              {inspectedEvent.coordinatorContact.email && (
                                <span className="inline-flex items-center gap-1 font-mono">
                                  <Mail className="w-3 h-3" />
                                  {inspectedEvent.coordinatorContact.email}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {isRev && rev && (
                          <div className="p-4 rounded-[12px] bg-[var(--amber-tint)] border border-[var(--amber-border)] space-y-2 text-xs text-[var(--amber-ink)]">
                            <div className="font-bold">
                              Pending Revision Diff ({rev.changedFields.join(', ')}) by {rev.submittedByName}
                            </div>
                            {rev.title && rev.title !== inspectedEvent.title && (
                              <div><strong>Title:</strong> {inspectedEvent.title} → <span className="underline">{rev.title}</span></div>
                            )}
                            {rev.description && rev.description !== inspectedEvent.description && (
                              <div><strong>Description updated:</strong> {rev.description}</div>
                            )}
                            {rev.venueName && rev.venueName !== inspectedEvent.venueName && (
                              <div><strong>Venue:</strong> {inspectedEvent.venueName} → <span className="underline">{rev.venueName}</span></div>
                            )}
                            {rev.startAt && rev.startAt !== inspectedEvent.startAt && (
                              <div><strong>Start:</strong> {formatIstFull(inspectedEvent.startAt)} → <span className="underline">{formatIstFull(rev.startAt)}</span></div>
                            )}
                            {rev.endAt && rev.endAt !== inspectedEvent.endAt && (
                              <div><strong>End:</strong> {formatIstFull(inspectedEvent.endAt)} → <span className="underline">{formatIstFull(rev.endAt)}</span></div>
                            )}
                            {typeof rev.feeInr === 'number' && rev.feeInr !== inspectedEvent.feeInr && (
                              <div><strong>Fee:</strong> ₹{inspectedEvent.feeInr} → <span className="underline">₹{rev.feeInr}</span></div>
                            )}
                            {typeof rev.capacity === 'number' && rev.capacity !== inspectedEvent.capacity && (
                              <div><strong>Capacity:</strong> {inspectedEvent.capacity} → <span className="underline">{rev.capacity}</span></div>
                            )}
                          </div>
                        )}

                        {inspectedEvent.approvalHistory && inspectedEvent.approvalHistory.length > 0 && (
                          <div className="space-y-1.5 text-xs">
                            <div className="text-[11px] font-mono font-bold uppercase tracking-[0.06em] text-[var(--ink-2)]">
                              Review History
                            </div>
                            <div className="divide-y divide-[var(--border-warm)] border border-[var(--border-warm)] rounded-[10px]">
                              {inspectedEvent.approvalHistory.map((h) => (
                                <div key={h.id} className="p-2.5 flex flex-wrap items-center justify-between gap-2">
                                  <div>
                                    <strong className="uppercase">{h.decision.replace(/_/g, ' ')}</strong> by {h.reviewerName}
                                    {h.note ? ` — "${h.note}"` : ''}
                                  </div>
                                  <span className="font-mono text-[11px] text-[var(--ink-2)] tabular-nums">
                                    {formatIstFull(h.createdAt)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {isPending && (
                    <div className="px-5 py-4 border-t border-[var(--border-warm)] bg-[var(--paper-raised)] flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
                      <input
                        type="text"
                        aria-label={`Review note for ${inspectedEvent.title}`}
                        value={modalFeedbackVal}
                        onChange={(e) =>
                          setReviewFeedbackByEventId((prev) => ({
                            ...prev,
                            [inspectedEvent.id]: e.target.value,
                          }))
                        }
                        placeholder="Review note to Club Leader (required to return or reject)"
                        className="paper-input flex-1 min-h-[38px] px-3 py-1.5 text-xs"
                      />
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {isRev ? (
                          <>
                            <button
                              type="button"
                              disabled={modalBusy}
                              onClick={async () => {
                                await handleReviewAction(inspectedEvent, 'approve_revision');
                                setInspectedEventId(null);
                              }}
                              className="paper-btn-primary min-h-[38px] px-3.5 py-1.5 text-xs inline-flex items-center gap-1.5"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Approve Revision</span>
                            </button>
                            <button
                              type="button"
                              disabled={modalBusy}
                              onClick={async () => {
                                await handleReviewAction(inspectedEvent, 'reject_revision');
                                if ((reviewFeedbackByEventId[inspectedEvent.id] || '').trim()) {
                                  setInspectedEventId(null);
                                }
                              }}
                              className="min-h-[38px] px-3 py-1.5 text-xs font-semibold border border-[var(--crimson)] text-[var(--crimson)] hover:bg-[var(--crimson-tint)]"
                            >
                              Reject Revision
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              disabled={modalBusy}
                              onClick={async () => {
                                await handleReviewAction(inspectedEvent, 'approve');
                                setInspectedEventId(null);
                              }}
                              className="paper-btn-primary min-h-[38px] px-3.5 py-1.5 text-xs inline-flex items-center gap-1.5"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Approve &amp; Publish</span>
                            </button>
                            <button
                              type="button"
                              disabled={modalBusy}
                              onClick={async () => {
                                await handleReviewAction(inspectedEvent, 'request_changes');
                                if ((reviewFeedbackByEventId[inspectedEvent.id] || '').trim()) {
                                  setInspectedEventId(null);
                                }
                              }}
                              className="paper-btn-secondary min-h-[38px] px-3 py-1.5 text-xs inline-flex items-center gap-1.5"
                            >
                              <MessageSquareWarning className="w-3.5 h-3.5 text-[var(--amber-ink)]" />
                              <span>Request Changes</span>
                            </button>
                            <button
                              type="button"
                              disabled={modalBusy}
                              onClick={async () => {
                                await handleReviewAction(inspectedEvent, 'reject');
                                if ((reviewFeedbackByEventId[inspectedEvent.id] || '').trim()) {
                                  setInspectedEventId(null);
                                }
                              }}
                              className="min-h-[38px] px-3 py-1.5 text-xs font-semibold border border-[var(--crimson)] text-[var(--crimson)] hover:bg-[var(--crimson-tint)]"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}

interface ReviewFieldProps {
  label: string;
  fieldKey: string;
  confidence?: number;
  confirmed?: boolean;
  onConfirm: () => void;
  className?: string;
  children: React.ReactNode;
}

function ReviewField({
  label,
  confidence,
  confirmed,
  onConfirm,
  className = '',
  children,
}: ReviewFieldProps) {
  const needsReview = typeof confidence === 'number' && confidence < 0.7 && !confirmed;

  return (
    <div
      className={`space-y-1 border transition-colors ${
        needsReview
          ? 'p-2.5 rounded-[10px] border-[var(--amber-border)] bg-[var(--amber-tint)]'
          : 'p-0 border-transparent'
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ink-2)]">
          {label}
        </span>
        {typeof confidence === 'number' && (
          <div className="flex items-center gap-2 text-[11px] font-mono tabular-nums">
            <span className={needsReview ? 'text-[var(--amber-ink)] font-bold' : 'text-[var(--ink-2)]'}>
              {Math.round(confidence * 100)}% conf
            </span>
            {needsReview && (
              <button
                type="button"
                onClick={onConfirm}
                className="paper-btn-ink px-2 py-0.5 font-sans text-[11px]"
              >
                Confirm
              </button>
            )}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
