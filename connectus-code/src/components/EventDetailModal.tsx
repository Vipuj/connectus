import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Award,
  Backpack,
  Bookmark,
  Camera,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock,
  Copy,
  CreditCard,
  ExternalLink,
  Eye,
  Film,
  Flag,
  Image as ImageIcon,
  Loader2,
  Lock,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquare,
  Phone,
  QrCode,
  Scale,
  Send,
  Share2,
  Sparkles,
  Star,
  Ticket,
  Trash2,
  UserPlus,
  Users,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type {
  College,
  EventFeedback,
  FeedEvent,
  PartnerPost,
  Registration,
  Squad,
  SquadRegistrationSnapshot,
  StudentProfile,
} from '../types';
import { formatFee, formatIstFull, resizeAvatarImage } from '../utils/format';
import { focusAndFollowTarget } from '../utils/scroll';
import { buildGoogleMapsUrl, CollegeLocationMap } from './CollegeLocationMap';
import { PosterImage } from './PosterImage';
import { QrPassModal } from './QrPassModal';

interface RegisterPayload {
  userName?: string;
  collegeShortName?: string;
  rollNumber?: string;
  branch?: string;
  year?: string;
  participationType?: 'individual' | 'team';
  teamName?: string;
  teamMembers?: string;
  pitchNote?: string;
  needsTeammates?: boolean;
  squadId?: string;
  paymentMethod?: 'UPI' | 'College Portal' | 'Free Pass';
  paymentRef?: string;
  userPhone?: string;
  userEmail?: string;
  attendeePhotoUrl?: string;
  emergencyContact?: string;
  savePhotoToProfile?: boolean;
}

interface EventDetailModalProps {
  event: FeedEvent | null;
  student: StudentProfile;
  colleges: College[];
  partnerPosts: PartnerPost[];
  mySquads: Squad[];
  registrationSnapshots: SquadRegistrationSnapshot[];
  eventFeedback?: EventFeedback[];
  mapsEnabled: boolean;
  onClose: () => void;
  onRecordView?: (eventId: string) => void;
  onRegister: (eventId: string, payload?: RegisterPayload) => Promise<Registration | null>;
  onUpdatePassPhoto?: (
    eventId: string,
    registrationId: string,
    photoUrl: string
  ) => Promise<void>;
  onCancelRegistration: (eventId: string) => Promise<void>;
  onToggleSave: (eventId: string) => Promise<void>;
  onReport: (eventId: string, reason: string) => Promise<void>;
  onSubmitFeedback?: (
    eventId: string,
    payload: {
      rating: number;
      comment: string;
      suggestion?: string;
      complaint?: string;
      requestedCategory?: string;
      isAnonymous: boolean;
    }
  ) => Promise<void>;
  onPostPartnerRequest: (payload: {
    eventId: string;
    roleSkill: string;
    lookingFor: string;
    teamSlotsNeeded: number;
    note: string;
    whatsappReady: boolean;
  }) => Promise<void>;
  onDeletePartnerRequest: (postId: string) => Promise<void>;
  onSendConnectionRequest: (payload: {
    toUserId: string;
    eventId: string;
    note: string;
  }) => Promise<void>;
  onLaunchTeamUpCall: (eventId: string) => void;
}

type DetailTab = 'overview' | 'apply' | 'schedule' | 'team' | 'feedback';

function formatDurationLabel(startIso: string, endIso: string): string {
  const diffMs = new Date(endIso).getTime() - new Date(startIso).getTime();
  if (Number.isNaN(diffMs) || diffMs <= 0) return '';
  const totalMinutes = Math.round(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const mins = totalMinutes % 60;
  if (days >= 1) {
    return hours > 0 ? `${days}d ${hours}h` : `${days} day${days > 1 ? 's' : ''}`;
  }
  if (hours >= 1) {
    return mins > 0 ? `${hours}h ${mins}m` : `${hours} hr${hours > 1 ? 's' : ''}`;
  }
  return `${mins} min`;
}

export function EventDetailModal({
  event,
  student,
  colleges,
  partnerPosts,
  mySquads,
  registrationSnapshots,
  eventFeedback = [],
  mapsEnabled,
  onClose,
  onRecordView,
  onRegister,
  onUpdatePassPhoto,
  onCancelRegistration,
  onToggleSave,
  onReport,
  onSubmitFeedback,
  onPostPartnerRequest,
  onDeletePartnerRequest,
  onSendConnectionRequest,
  onLaunchTeamUpCall,
}: EventDetailModalProps) {
  const [busy, setBusy] = useState(false);
  const [detailTab, setDetailTab] = useState<DetailTab>('overview');
  const [mediaTab, setMediaTab] = useState<'poster' | 'reel'>('poster');
  const [activePosterIdx, setActivePosterIdx] = useState(0);
  const [fullPictureOpen, setFullPictureOpen] = useState(false);
  const [fullPictureZoomed, setFullPictureZoomed] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportSubmitted, setReportSubmitted] = useState(false);

  // Full Student Event Registration Application State
  const defaultStudentCollege = useMemo(() => {
    if (student.collegeId === 'other') {
      return student.customCollegeName?.trim() || '';
    }
    const found = colleges.find((c) => c.id === student.collegeId);
    return found ? found.shortName : '';
  }, [student.collegeId, student.customCollegeName, colleges]);

  const isPlaceholderStudentName = (name?: string | null) => {
    const clean = (name || '').trim();
    return !clean || clean === 'Guest Student' || clean === 'Student';
  };

  const [appName, setAppName] = useState(
    isPlaceholderStudentName(student.displayName) ? '' : student.displayName
  );
  const [appCollege, setAppCollege] = useState(defaultStudentCollege);
  const [appRollNumber, setAppRollNumber] = useState(student.rollNumber || '');
  const [appBranch, setAppBranch] = useState(student.branch || student.course || 'CSE');
  const [appYear, setAppYear] = useState(student.year || '2nd Year');
  const [appEmail, setAppEmail] = useState(student.email || '');
  const [appPhone, setAppPhone] = useState(student.phoneNumber || '');
  const [appParticipation, setAppParticipation] = useState<'individual' | 'team'>('individual');
  const [appSquadId, setAppSquadId] = useState('');
  const [appNeedsTeammates, setAppNeedsTeammates] = useState(false);
  const [appTeamName, setAppTeamName] = useState('');
  const [appTeamMembers, setAppTeamMembers] = useState('');
  const [appPitchNote, setAppPitchNote] = useState('');
  const [appMethod, setAppMethod] = useState<'UPI' | 'College Portal'>('UPI');
  const [appPaymentRef, setAppPaymentRef] = useState('');
  const [appPhotoUrl, setAppPhotoUrl] = useState(student.photoUrl || '');
  const [appEmergencyContact, setAppEmergencyContact] = useState('');
  const [appSavePhotoToProfile, setAppSavePhotoToProfile] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const appPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const [appConsent, setAppConsent] = useState(true);
  const [appError, setAppError] = useState<string | null>(null);
  const appFormDirtyRef = useRef(false);

  const [qrPassOpen, setQrPassOpen] = useState(false);
  const [recentRegistration, setRecentRegistration] = useState<Registration | null>(null);

  const [partnerTab, setPartnerTab] = useState<'same' | 'similar'>('same');
  const [partnerFormOpen, setPartnerFormOpen] = useState(false);
  const [roleSkill, setRoleSkill] = useState((student.skills || []).slice(0, 3).join(', '));
  const [lookingFor, setLookingFor] = useState('');
  const [teamSlotsNeeded, setTeamSlotsNeeded] = useState('1');
  const [partnerNote, setPartnerNote] = useState('');
  const [whatsappReady, setWhatsappReady] = useState(true);
  const [partnerBusy, setPartnerBusy] = useState(false);

  const [connectingPeerId, setConnectingPeerId] = useState<string | null>(null);
  const [connectNote, setConnectNote] = useState('');
  const [connectedPeerIds, setConnectedPeerIds] = useState<string[]>([]);
  const [connectBusy, setConnectBusy] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  // Participant Feedback State
  const [fbRating, setFbRating] = useState<number>(5);
  const [fbComment, setFbComment] = useState('');
  const [fbSuggestion, setFbSuggestion] = useState('');
  const [fbComplaint, setFbComplaint] = useState('');
  const [fbRequestedCategory, setFbRequestedCategory] = useState('');
  const [fbAnonymous, setFbAnonymous] = useState(false);
  const [fbBusy, setFbBusy] = useState(false);
  const [fbNotice, setFbNotice] = useState<string | null>(null);
  const [fbError, setFbError] = useState<string | null>(null);

  const tabPanelRef = useRef<HTMLDivElement | null>(null);
  const partnerFormRef = useRef<HTMLFormElement | null>(null);
  const reportFormRef = useRef<HTMLFormElement | null>(null);
  const recordedViewIdRef = useRef<string | null>(null);

  const eventId = event?.id;
  const teamEventHint = Boolean(
    event?.teamSize &&
      /team|2|3|4|5|squad|group/i.test(event.teamSize) &&
      !/solo only|individual only/i.test(event.teamSize)
  );

  useEffect(() => {
    if (!eventId) {
      recordedViewIdRef.current = null;
      return;
    }
    if (recordedViewIdRef.current !== eventId) {
      recordedViewIdRef.current = eventId;
      onRecordView?.(eventId);
    }
    appFormDirtyRef.current = false;
    setDetailTab('overview');
    setMediaTab('poster');
    setActivePosterIdx(0);
    setFullPictureOpen(false);
    setFullPictureZoomed(false);
    setReportOpen(false);
    setReportSubmitted(false);
    setAppName(isPlaceholderStudentName(student.displayName) ? '' : student.displayName);
    setAppCollege(defaultStudentCollege);
    setAppRollNumber(student.rollNumber || '');
    setAppBranch(student.branch || student.course || 'CSE');
    setAppYear(student.year || '2nd Year');
    setAppEmail(student.email || '');
    setAppPhone(student.phoneNumber || '');
    setAppParticipation(teamEventHint ? 'team' : 'individual');
    setAppSquadId('');
    setAppNeedsTeammates(false);
    setAppTeamName('');
    setAppTeamMembers('');
    setAppPitchNote('');
    setAppMethod('UPI');
    setAppPaymentRef('');
    setAppPhotoUrl(student.photoUrl || '');
    setAppEmergencyContact('');
    setAppSavePhotoToProfile(true);
    setPhotoError(null);
    setAppConsent(true);
    setAppError(null);
    setQrPassOpen(false);
    setRecentRegistration(null);
    setPartnerTab('same');
    setPartnerFormOpen(false);
    setRoleSkill((student.skills || []).slice(0, 3).join(', '));
    setConnectingPeerId(null);
    setConnectNote('');
    setConnectedPeerIds([]);
    setConnectError(null);
    setFbNotice(null);
    setFbError(null);
  }, [eventId]);

  useEffect(() => {
    if (!eventId || appFormDirtyRef.current) return;
    if (!isPlaceholderStudentName(student.displayName)) {
      setAppName(student.displayName);
    }
    if (defaultStudentCollege) setAppCollege(defaultStudentCollege);
    if (student.rollNumber) setAppRollNumber(student.rollNumber);
    if (student.branch || student.course) setAppBranch(student.branch || student.course || 'CSE');
    if (student.year) setAppYear(student.year);
    if (student.email) setAppEmail(student.email);
    if (student.phoneNumber) setAppPhone(student.phoneNumber);
    if (student.photoUrl) setAppPhotoUrl(student.photoUrl);
  }, [
    eventId,
    student.displayName,
    defaultStudentCollege,
    student.rollNumber,
    student.branch,
    student.course,
    student.year,
    student.email,
    student.phoneNumber,
    student.photoUrl,
  ]);

  useEffect(() => {
    if (!eventId) return;
    const mine = eventFeedback.find((f) => f.eventId === eventId && f.userId === student.id);
    setFbRating(mine?.rating || 5);
    setFbComment(mine?.comment || '');
    setFbSuggestion(mine?.suggestion || '');
    setFbComplaint(mine?.complaint || '');
    setFbRequestedCategory(mine?.requestedCategory || '');
    setFbAnonymous(Boolean(mine?.isAnonymous));
  }, [eventId, student.id, eventFeedback]);

  useEffect(() => {
    if (!eventId) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [eventId]);

  useEffect(() => {
    if (!eventId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (fullPictureOpen) {
          setFullPictureOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [eventId, fullPictureOpen, onClose]);

  useEffect(() => {
    if (partnerFormOpen) {
      focusAndFollowTarget(partnerFormRef.current, { block: 'center' });
    }
  }, [partnerFormOpen]);

  useEffect(() => {
    if (reportOpen) {
      focusAndFollowTarget(reportFormRef.current, { block: 'center' });
    }
  }, [reportOpen]);

  if (!event) return null;

  const isFull = event.confirmedCount >= event.capacity;
  const seatsLeft = Math.max(0, event.capacity - event.confirmedCount);
  const fillPercent = Math.min(100, Math.round((event.confirmedCount / event.capacity) * 100));
  const durationLabel = formatDurationLabel(event.startAt, event.endAt);
  const hasScheduleOrRules = Boolean(event.schedule?.length || event.rules?.length);

  const sameEventPeers = partnerPosts.filter((p) => p.eventId === event.id);
  const similarEventPeers = partnerPosts.filter(
    (p) => p.eventId !== event.id && p.eventType === event.type
  );
  const myExistingPost = sameEventPeers.find((p) => p.userId === student.id);
  const visiblePeers = partnerTab === 'same' ? sameEventPeers : similarEventPeers;

  const availableSquads = mySquads
    .filter((s) => !s.archivedAt)
    .slice()
    .sort((a, b) => {
      const aMatch = a.eventId === event.id ? 0 : 1;
      const bMatch = b.eventId === event.id ? 0 : 1;
      return aMatch - bMatch;
    });
  const myEventSquads = availableSquads.filter((s) => s.eventId === event.id);

  function handleSelectAppSquad(squadId: string) {
    setAppSquadId(squadId);
    if (!squadId) return;
    const sq = availableSquads.find((s) => s.id === squadId);
    if (sq) {
      setAppTeamName(sq.name);
      setAppTeamMembers(
        sq.members
          .map((m) => (m.collegeShortName ? `${m.name} (${m.collegeShortName})` : m.name))
          .join(', ')
      );
    }
  }

  function openTabAndFocus(tab: DetailTab) {
    setDetailTab(tab);
    focusAndFollowTarget(tabPanelRef.current, {
      block: 'start',
      focusInput: tab === 'apply' && !event?.myRegistrationStatus,
      delayMs: 50,
    });
  }

  async function handleSubmitPartnerForm(e: React.FormEvent) {
    e.preventDefault();
    if (!event || !roleSkill.trim() || !lookingFor.trim() || partnerBusy) return;
    setPartnerBusy(true);
    try {
      await onPostPartnerRequest({
        eventId: event.id,
        roleSkill: roleSkill.trim(),
        lookingFor: lookingFor.trim(),
        teamSlotsNeeded: Number(teamSlotsNeeded) || 1,
        note: partnerNote.trim(),
        whatsappReady,
      });
      setPartnerFormOpen(false);
      setPartnerTab('same');
    } finally {
      setPartnerBusy(false);
    }
  }

  async function handleSendPeerConnect(e: React.FormEvent, peer: PartnerPost) {
    e.preventDefault();
    if (!event || connectBusy) return;
    setConnectBusy(true);
    setConnectError(null);
    try {
      await onSendConnectionRequest({
        toUserId: peer.userId,
        eventId: event.id,
        note:
          connectNote.trim() ||
          `Hey ${peer.userName.split(' ')[0]}, interested in teaming up for ${event.title}!`,
      });
      setConnectedPeerIds((prev) => (prev.includes(peer.userId) ? prev : [...prev, peer.userId]));
      setConnectingPeerId(null);
      setConnectNote('');
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : 'Could not send connection request.');
    } finally {
      setConnectBusy(false);
    }
  }

  function copyText(key: string, value: string) {
    navigator.clipboard?.writeText(value).catch(() => {});
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((curr) => (curr === key ? null : curr));
    }, 2200);
  }

  async function handleAction(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmRegistration(e: React.FormEvent) {
    e.preventDefault();
    if (!event) return;
    setAppError(null);

    const resolvedName = (appName.trim() || student.displayName || '').trim();
    if (!resolvedName) {
      setAppError('Please enter your full name.');
      return;
    }
    if (appParticipation === 'team' && !appTeamName.trim()) {
      setAppError('Please enter a Team name or switch to Individual participation.');
      return;
    }
    if (!appConsent) {
      setAppError('Please confirm your registration details to continue.');
      return;
    }

    setBusy(true);
    try {
      const created = await onRegister(event.id, {
        userName: resolvedName,
        collegeShortName: appCollege.trim() || defaultStudentCollege || undefined,
        rollNumber: appRollNumber.trim() || undefined,
        branch: appBranch.trim() || undefined,
        year: appYear.trim() || undefined,
        participationType: appParticipation,
        teamName: appParticipation === 'team' ? appTeamName.trim() || undefined : undefined,
        teamMembers: appParticipation === 'team' ? appTeamMembers.trim() || undefined : undefined,
        pitchNote: appPitchNote.trim() || undefined,
        needsTeammates: appParticipation === 'individual' ? appNeedsTeammates : undefined,
        squadId: appParticipation === 'team' && appSquadId ? appSquadId : undefined,
        paymentMethod: event.feeInr > 0 ? appMethod : 'Free Pass',
        paymentRef: event.feeInr > 0 ? appPaymentRef.trim() || undefined : undefined,
        userPhone: appPhone.trim() || undefined,
        userEmail: (appEmail.trim() || student.email || '').trim() || undefined,
        attendeePhotoUrl: appPhotoUrl || undefined,
        emergencyContact: appEmergencyContact.trim() || undefined,
        savePhotoToProfile: appSavePhotoToProfile,
      });
      if (created) {
        setRecentRegistration(created);
        setQrPassOpen(true);
      }
    } finally {
      setBusy(false);
    }
  }

  const activeRegistration = event.myRegistration || recentRegistration || null;
  const activeSnapshot = activeRegistration
    ? registrationSnapshots.find(
        (s) =>
          s.eventId === event.id &&
          (s.id === activeRegistration.squadSnapshotId ||
            (activeRegistration.squadId && s.squadId === activeRegistration.squadId))
      ) || null
    : null;

  async function submitReport(e: React.FormEvent) {
    e.preventDefault();
    if (!event) return;
    setBusy(true);
    try {
      await onReport(event.id, reportReason);
      setReportSubmitted(true);
      setReportOpen(false);
      setReportReason('');
    } finally {
      setBusy(false);
    }
  }

  const feedbackForEvent = eventFeedback.filter((f) => f.eventId === event.id);
  const computedAvgRating =
    feedbackForEvent.length > 0
      ? Number(
          (
            feedbackForEvent.reduce((acc, item) => acc + item.rating, 0) / feedbackForEvent.length
          ).toFixed(1)
        )
      : event.averageRating || 0;
  const isIneligible = event.eligibleToRegister === false;
  const ineligibilityReasons = event.ineligibilityReasons || [];

  async function handleSubmitFeedbackForm(e: React.FormEvent) {
    e.preventDefault();
    if (!event || !onSubmitFeedback) return;
    if (!fbComment.trim() && !fbSuggestion.trim() && !fbComplaint.trim()) {
      setFbError('Please share a review comment, suggestion, or feedback note.');
      return;
    }
    setFbBusy(true);
    setFbError(null);
    setFbNotice(null);
    try {
      await onSubmitFeedback(event.id, {
        rating: fbRating,
        comment: fbComment.trim(),
        suggestion: fbSuggestion.trim() || undefined,
        complaint: fbComplaint.trim() || undefined,
        requestedCategory: fbRequestedCategory.trim() || undefined,
        isAnonymous: fbAnonymous,
      });
      setFbNotice('Feedback recorded. Thank you!');
    } catch (err) {
      setFbError(err instanceof Error ? err.message : 'Could not save feedback.');
    } finally {
      setFbBusy(false);
    }
  }

  const tabs: { id: DetailTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    {
      id: 'apply',
      label: event.myRegistrationStatus ? 'My Application & Pass' : 'Apply & Register',
    },
    ...(hasScheduleOrRules ? [{ id: 'schedule' as const, label: 'Schedule & Rules' }] : []),
    {
      id: 'team',
      label: `Find Team (${sameEventPeers.length + similarEventPeers.length})`,
    },
    {
      id: 'feedback',
      label: `Feedback (${feedbackForEvent.length})`,
    },
  ];

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-50 bg-[var(--paper)] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-label={event.title}
      >
        {/* Sticky Modal Header */}
        <header className="shrink-0 bg-[var(--paper-raised)] border-b border-[var(--border-ink)] px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="paper-btn-secondary min-h-[38px] px-3 py-1.5 text-xs sm:text-sm inline-flex items-center gap-1.5 shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <div className="hidden sm:block text-xs text-[var(--ink-2)] truncate">
              <span className="font-bold text-[var(--ink)]">{event.collegeName}</span>
              <span className="mx-1.5" aria-hidden="true">
                ·
              </span>
              <span>{event.clubName}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() =>
                copyText(
                  'share',
                  `${event.title} — ${event.collegeName}\n${formatIstFull(event.startAt)} IST\nVenue: ${event.venueName}`
                )
              }
              className="paper-btn-secondary min-h-[38px] px-3 py-1.5 text-xs sm:text-sm inline-flex items-center gap-1.5"
            >
              {copiedKey === 'share' ? (
                <Check className="w-4 h-4 text-[var(--olive)]" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">
                {copiedKey === 'share' ? 'Copied' : 'Share'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onToggleSave(event.id)}
              className={`min-h-[38px] px-3.5 py-1.5 text-xs sm:text-sm inline-flex items-center gap-1.5 ${
                event.isSaved ? 'paper-btn-ink' : 'paper-btn-secondary'
              }`}
            >
              <Bookmark className="w-4 h-4" />
              <span>{event.isSaved ? 'Saved' : 'Save'}</span>
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto bg-[var(--paper)]">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
              {/* LEFT COLUMN: Framed Poster / Reel + Compact Spec Strip */}
              <div className="lg:col-span-5 lg:sticky lg:top-6 space-y-4">
                <div className="paper-card p-4 space-y-3">
                  {event.promoVideoUrl && (
                    <div className="paper-segment w-full grid grid-cols-2">
                      <button
                        type="button"
                        aria-pressed={mediaTab === 'poster'}
                        onClick={() => setMediaTab('poster')}
                        className="paper-segment-btn min-h-[34px] px-3 py-1.5 text-xs inline-flex items-center justify-center gap-1.5"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>Poster</span>
                      </button>
                      <button
                        type="button"
                        aria-pressed={mediaTab === 'reel'}
                        onClick={() => setMediaTab('reel')}
                        className="paper-segment-btn min-h-[34px] px-3 py-1.5 text-xs inline-flex items-center justify-center gap-1.5"
                      >
                        <Film className="w-3.5 h-3.5" />
                        <span>Promo Reel</span>
                      </button>
                    </div>
                  )}

                  <div key={mediaTab}>
                    {mediaTab === 'reel' && event.promoVideoUrl ? (
                      <div className="space-y-2.5">
                        <div className="mx-auto w-full max-w-[320px] aspect-[9/16] max-h-[52vh] rounded-[14px] overflow-hidden border border-[var(--border-ink)] bg-[var(--ink)]">
                          <video
                            key={event.promoVideoUrl}
                            src={event.promoVideoUrl}
                            poster={event.posterUrl}
                            controls
                            autoPlay
                            muted
                            loop
                            playsInline
                            className="w-full h-full object-cover"
                          />
                        </div>
                        {event.promoVideoCaption && (
                          <p className="text-xs text-[var(--ink-2)] leading-relaxed px-1">
                            {event.promoVideoCaption}
                          </p>
                        )}
                      </div>
                    ) : (
                      (() => {
                        const allPosters = [
                          event.posterUrl,
                          ...(event.additionalPosterUrls || []),
                        ].filter((u, idx, arr): u is string => Boolean(u) && arr.indexOf(u) === idx);
                        const safeIdx = Math.min(activePosterIdx, Math.max(0, allPosters.length - 1));
                        const currentPosterSrc = allPosters[safeIdx] || event.posterUrl;
                        return (
                          <div className="space-y-2.5">
                            <button
                              type="button"
                              onClick={() => {
                                setFullPictureZoomed(false);
                                setFullPictureOpen(true);
                              }}
                              aria-label="Open event poster in full picture mode"
                              className="group w-full rounded-[12px] p-4 border border-[var(--border-ink)] bg-[var(--paper-raised)] flex flex-col items-center justify-center gap-2 cursor-zoom-in"
                            >
                              <div className="rounded-[6px] overflow-hidden border border-[var(--border-warm)] bg-[var(--paper)] shadow-[0_2px_10px_rgba(38,24,18,0.06)]">
                                <PosterImage
                                  src={currentPosterSrc}
                                  alt={`Poster ${safeIdx + 1} for ${event.title}`}
                                  title={event.title}
                                  className="max-h-[42vh] lg:max-h-[46vh] w-auto max-w-full object-contain group-hover:scale-[1.01] transition-transform duration-200"
                                />
                              </div>
                              <span className="text-[11px] font-medium text-[var(--ink-2)] group-hover:text-[var(--crimson)]">
                                Click poster to expand
                              </span>
                            </button>

                            {allPosters.length > 1 && (
                              <div className="flex flex-wrap items-center gap-1.5">
                                {allPosters.map((pUrl, idx) => (
                                  <button
                                    key={pUrl}
                                    type="button"
                                    onClick={() => setActivePosterIdx(idx)}
                                    className={`px-2.5 py-1 text-[11px] font-mono font-semibold uppercase tracking-[0.06em] border ${
                                      idx === safeIdx
                                        ? 'bg-[var(--crimson)] text-white border-[var(--crimson)]'
                                        : 'bg-[var(--paper-raised)] text-[var(--ink-2)] border-[var(--border-warm)] hover:border-[var(--ink)]'
                                    }`}
                                  >
                                    {idx === 0 ? 'Official Poster' : `Poster ${idx + 1} · Schedule`}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()
                    )}
                  </div>
                </div>

                {/* Concise Snapshot Spec Strip */}
                <dl className="paper-card-soft border border-[var(--border-ink)] divide-y divide-[var(--border-warm)] text-xs sm:text-sm overflow-hidden">
                  <div className="px-4 py-2.5 flex items-center justify-between gap-4">
                    <dt className="text-[var(--ink-2)] uppercase tracking-[0.06em] text-[10px] font-semibold shrink-0">
                      Starts (IST)
                    </dt>
                    <dd className="font-mono font-semibold text-[var(--ink)] text-right tabular-nums">
                      {formatIstFull(event.startAt)}
                      {durationLabel ? ` · ${durationLabel}` : ''}
                    </dd>
                  </div>
                  <div className="px-4 py-2.5 flex items-center justify-between gap-4">
                    <dt className="text-[var(--ink-2)] uppercase tracking-[0.06em] text-[10px] font-semibold shrink-0">
                      Format
                    </dt>
                    <dd className="font-medium text-[var(--ink)] text-right">
                      {event.teamSize || 'Individual or Team'}
                    </dd>
                  </div>
                  <div className="px-4 py-2.5 flex items-center justify-between gap-4">
                    <dt className="text-[var(--ink-2)] uppercase tracking-[0.06em] text-[10px] font-semibold shrink-0">
                      Eligibility
                    </dt>
                    <dd className="font-medium text-[var(--ink)] text-right break-words">
                      {event.branches.join(', ')} · {event.years.join(', ')}
                    </dd>
                  </div>
                  <div className="px-4 py-2.5 flex items-center justify-between gap-4">
                    <dt className="text-[var(--ink-2)] uppercase tracking-[0.06em] text-[10px] font-semibold shrink-0">
                      Entry Fee
                    </dt>
                    <dd className="font-mono font-bold text-[var(--crimson)] tabular-nums text-right">
                      {formatFee(event.feeInr)}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* RIGHT COLUMN: Clean Hero + Tabbed Workspace */}
              <div className="lg:col-span-7 space-y-6">
                {event.changeNotice && (
                  <div className="p-4 rounded-[14px] bg-[var(--amber-tint)] border border-[var(--amber-border)] text-xs sm:text-sm text-[var(--amber-ink)] flex items-start gap-2.5 font-medium">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{event.changeNotice}</span>
                  </div>
                )}

                {/* Event Hero + Registration CTA */}
                <section className="paper-card p-5 sm:p-6 space-y-5">
                  <div className="space-y-2.5">
                    <h1 className="font-display text-2xl sm:text-4xl font-extrabold tracking-[-0.04em] text-[var(--ink)] leading-tight text-balance">
                      {event.title}
                    </h1>

                    <p className="text-sm text-[var(--ink-2)] flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span>
                        Hosted by{' '}
                        <strong className="font-semibold text-[var(--ink)]">{event.clubName}</strong>{' '}
                        at{' '}
                        <strong className="font-semibold text-[var(--ink)]">
                          {event.collegeName}
                        </strong>
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-medium text-[var(--ink)]">
                        {event.type} · {event.mode}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {event.audience === 'host_college_only'
                          ? `${event.collegeShortName} Only`
                          : 'Open to All Colleges'}
                      </span>
                      {(event.viewCount ?? 0) > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1 font-mono text-xs text-[var(--ink-2)] tabular-nums">
                            <Eye className="w-3.5 h-3.5" />
                            <span>{event.viewCount} views</span>
                          </span>
                        </>
                      )}
                      {feedbackForEvent.length > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <button
                            type="button"
                            onClick={() => openTabAndFocus('feedback')}
                            className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-[var(--crimson)] hover:underline tabular-nums"
                          >
                            <Star className="w-3.5 h-3.5 fill-[var(--crimson)]" />
                            <span>
                              {computedAvgRating} ({feedbackForEvent.length})
                            </span>
                          </button>
                        </>
                      )}
                    </p>
                  </div>

                  {isIneligible && !event.myRegistrationStatus && (
                    <div className="p-3.5 rounded-[12px] bg-[var(--amber-tint)] border border-[var(--amber-border)] text-xs text-[var(--amber-ink)] flex items-start gap-2.5">
                      <Lock className="w-4 h-4 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <div className="font-bold">Registration Restricted (View-Only)</div>
                        <div>
                          {ineligibilityReasons.join(' · ') ||
                            'Your current branch, year, or verification does not meet host eligibility rules.'}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Seat Progress & Deadline */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono tabular-nums">
                      <span className="text-[var(--ink)] font-semibold">
                        {event.confirmedCount}/{event.capacity} registered ·{' '}
                        {isFull
                          ? `${event.waitlistCount} waitlisted`
                          : `${seatsLeft} seat${seatsLeft === 1 ? '' : 's'} left`}
                      </span>
                      <span className="text-[var(--crimson)] font-semibold">
                        Apply by {formatIstFull(event.regDeadline)} IST
                      </span>
                    </div>
                    <div className="w-full h-2 bg-[var(--feel-panel)] border border-[var(--border-ink)] overflow-hidden">
                      <div
                        className={`h-full ${isFull ? 'bg-[var(--amber-ink)]' : 'bg-[var(--ink)]'}`}
                        style={{ width: `${fillPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Active Registration Banner */}
                  {event.myRegistrationStatus && (
                    <div
                      className={`p-3.5 rounded-[12px] border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm font-medium ${
                        event.myRegistrationStatus === 'waitlisted'
                          ? 'bg-[var(--amber-tint)] border-[var(--amber-border)] text-[var(--amber-ink)]'
                          : 'bg-[var(--olive-tint)] border-[var(--olive-border)] text-[var(--ink)]'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <CheckCircle2
                          className={`w-4 h-4 shrink-0 mt-0.5 ${
                            event.myRegistrationStatus === 'waitlisted'
                              ? 'text-[var(--amber-ink)]'
                              : 'text-[var(--olive)]'
                          }`}
                        />
                        <div className="space-y-0.5">
                          <div className="font-semibold">
                            {event.myRegistrationStatus === 'checked_in'
                              ? 'Checked in at campus venue'
                              : event.myRegistrationStatus === 'confirmed'
                                ? 'Application Submitted · Pass Confirmed'
                                : `Waitlist Position #${event.waitlistPosition || 1}`}
                          </div>
                          {activeRegistration && (
                            <div className="text-xs font-mono flex flex-wrap items-center gap-x-2">
                              <span className="inline-flex items-center gap-1 font-semibold">
                                <Ticket className="w-3.5 h-3.5 text-[var(--crimson)]" />
                                {activeRegistration.passCode}
                              </span>
                              {activeRegistration.rollNumber && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span>{activeRegistration.rollNumber}</span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      {activeRegistration && (
                        <button
                          type="button"
                          onClick={() => setQrPassOpen(true)}
                          className="paper-btn-ink min-h-[38px] px-3.5 py-1.5 text-xs inline-flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>View E-Ticket</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Primary Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    {event.myRegistrationStatus ? (
                      <>
                        <button
                          type="button"
                          onClick={() => openTabAndFocus('apply')}
                          className="paper-btn-secondary min-h-[42px] px-4 py-2 text-xs sm:text-sm inline-flex items-center gap-1.5"
                        >
                          <ClipboardList className="w-4 h-4 text-[var(--crimson)]" />
                          <span>View Application</span>
                        </button>
                        <button
                          type="button"
                          disabled={busy || event.myRegistrationStatus === 'checked_in'}
                          onClick={() => handleAction(() => onCancelRegistration(event.id))}
                          className="paper-btn-secondary min-h-[42px] px-4 py-2 text-xs sm:text-sm text-[var(--crimson)]"
                        >
                          {busy
                            ? 'Updating...'
                            : event.myRegistrationStatus === 'checked_in'
                              ? 'Checked In'
                              : 'Cancel Registration'}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        disabled={event.regStatus === 'closed' || isIneligible}
                        onClick={() => openTabAndFocus('apply')}
                        className="paper-btn-primary flex-1 min-h-[44px] px-5 py-2.5 text-sm inline-flex items-center justify-center gap-2 disabled:opacity-55"
                      >
                        {isIneligible ? <Lock className="w-4 h-4" /> : <ClipboardList className="w-4 h-4" />}
                        <span>
                          {event.regStatus === 'closed'
                            ? 'Registration Closed'
                            : isIneligible
                              ? 'Not Eligible to Register'
                              : isFull
                                ? 'Apply for Waitlist'
                                : 'Apply & Register'}
                        </span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => openTabAndFocus('team')}
                      className="paper-btn-tint min-h-[44px] px-4 py-2 text-xs sm:text-sm inline-flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <UserPlus className="w-4 h-4 text-[var(--crimson)] shrink-0" />
                      <span>
                        Find Team ({sameEventPeers.length + similarEventPeers.length})
                      </span>
                    </button>
                  </div>
                </section>

                {/* Clean Segmented Tabs (Removes Information Overload) */}
                <div ref={tabPanelRef} className="cp-scroll-target space-y-5">
                  <div className="paper-segment overflow-x-auto max-w-full">
                    {tabs.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        aria-pressed={detailTab === tab.id}
                        onClick={() => setDetailTab(tab.id)}
                        className="paper-segment-btn min-h-[36px] px-3.5 py-1.5 text-xs uppercase tracking-[0.05em] whitespace-nowrap tabular-nums"
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div key={detailTab} className="space-y-5">
                      {/* TAB 1: OVERVIEW */}
                      {detailTab === 'overview' && (
                        <>
                          <section className="paper-card p-5 sm:p-6 space-y-3">
                            <h2 className="font-display text-lg font-extrabold tracking-[-0.02em] text-[var(--ink)]">
                              About This Event
                            </h2>
                            <p className="text-[15px] font-light text-[var(--ink-2)] leading-relaxed max-w-prose">
                              {event.description}
                            </p>
                          </section>

                          <section className="paper-card p-5 sm:p-6 space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                              <div className="flex items-start gap-2.5">
                                <MapPin className="w-4 h-4 text-[var(--crimson)] mt-1 shrink-0" />
                                <div className="space-y-0.5">
                                  <div className="text-sm font-bold text-[var(--ink)]">
                                    {event.venueName}
                                  </div>
                                  <div className="text-xs text-[var(--ink-2)]">
                                    {event.areaName} ·{' '}
                                    {event.mode === 'Online'
                                      ? 'Remote / Online Event'
                                      : `${event.distanceKm} km from your location`}
                                  </div>
                                </div>
                              </div>

                              {event.mode !== 'Online' && (
                                <a
                                  href={buildGoogleMapsUrl(
                                    event.lat,
                                    event.lng,
                                    `${event.venueName}, ${event.collegeName}`
                                  )}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="paper-btn-secondary min-h-[36px] px-3 py-1.5 text-xs inline-flex items-center gap-1.5 shrink-0 self-start"
                                >
                                  <span>Google Maps</span>
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>

                            {event.mode !== 'Online' && (
                              <CollegeLocationMap
                                mapsEnabled={mapsEnabled}
                                center={{ lat: event.lat, lng: event.lng }}
                                zoom={15}
                                className="w-full h-[180px]"
                                fallbackLabel={`${event.venueName} · ${event.collegeName}`}
                                markers={[
                                  {
                                    id: event.id,
                                    lat: event.lat,
                                    lng: event.lng,
                                    title: event.venueName,
                                    subtitle: event.collegeName,
                                    highlighted: true,
                                  },
                                ]}
                              />
                            )}
                          </section>

                          {(event.prizesAndPerks?.length ||
                            event.prerequisites?.length ||
                            event.coordinatorContact) && (
                            <section className="paper-card p-5 sm:p-6 space-y-5">
                              {event.prizesAndPerks && event.prizesAndPerks.length > 0 && (
                                <div className="space-y-2">
                                  <h3 className="font-display text-base font-extrabold text-[var(--ink)] flex items-center gap-2">
                                    <Award className="w-4 h-4 text-[var(--crimson)] shrink-0" />
                                    <span>Prizes &amp; Perks</span>
                                  </h3>
                                  <ul className="space-y-1 text-sm text-[var(--ink-2)] list-disc pl-5">
                                    {event.prizesAndPerks.map((perk, idx) => (
                                      <li key={idx}>{perk}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {event.prerequisites && event.prerequisites.length > 0 && (
                                <div className="space-y-2 pt-4 border-t border-[var(--border-warm)]">
                                  <h3 className="font-display text-base font-extrabold text-[var(--ink)] flex items-center gap-2">
                                    <Backpack className="w-4 h-4 text-[var(--crimson)] shrink-0" />
                                    <span>What to Bring</span>
                                  </h3>
                                  <ul className="space-y-1 text-sm text-[var(--ink-2)] list-disc pl-5">
                                    {event.prerequisites.map((req, idx) => (
                                      <li key={idx}>{req}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {event.coordinatorContact && (
                                <div className="space-y-2 pt-4 border-t border-[var(--border-warm)]">
                                  <h3 className="font-display text-base font-extrabold text-[var(--ink)]">
                                    Coordinator Contact
                                  </h3>
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
                                    <div>
                                      <div className="font-bold text-[var(--ink)]">
                                        {event.coordinatorContact.name}
                                      </div>
                                      {event.coordinatorContact.role && (
                                        <div className="text-xs text-[var(--ink-2)]">
                                          {event.coordinatorContact.role}
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      {event.coordinatorContact.phone && (
                                        <a
                                          href={`tel:${event.coordinatorContact.phone.replace(/\s+/g, '')}`}
                                          className="paper-btn-secondary min-h-[36px] px-3 py-1 text-xs font-mono inline-flex items-center gap-1.5"
                                        >
                                          <Phone className="w-3.5 h-3.5 text-[var(--crimson)]" />
                                          <span>{event.coordinatorContact.phone}</span>
                                        </a>
                                      )}
                                      {event.coordinatorContact.email && (
                                        <a
                                          href={`mailto:${event.coordinatorContact.email}`}
                                          className="paper-btn-secondary min-h-[36px] px-3 py-1 text-xs font-mono inline-flex items-center gap-1.5"
                                        >
                                          <Mail className="w-3.5 h-3.5 text-[var(--crimson)]" />
                                          <span>{event.coordinatorContact.email}</span>
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </section>
                          )}

                          {(event.whatsappGroupUrl || event.telegramGroupUrl) && (
                            <section className="paper-card p-5 space-y-3">
                              <h3 className="font-display text-sm font-extrabold uppercase tracking-[0.06em] text-[var(--ink)]">
                                Official Event Community
                              </h3>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {event.whatsappGroupUrl && (
                                  <a
                                    href={event.whatsappGroupUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-3 rounded-[10px] border border-[var(--olive-border)] bg-[var(--olive-tint)] hover:bg-[var(--paper-input)] transition-colors flex items-center justify-between gap-2.5 text-xs font-bold text-[var(--ink)]"
                                  >
                                    <span className="inline-flex items-center gap-2 truncate">
                                      <MessageCircle className="w-4 h-4 text-[var(--olive)] shrink-0" />
                                      <span className="truncate">WhatsApp Group</span>
                                    </span>
                                    <ExternalLink className="w-3.5 h-3.5 text-[var(--olive)] shrink-0" />
                                  </a>
                                )}
                                {event.telegramGroupUrl && (
                                  <a
                                    href={event.telegramGroupUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-3 rounded-[10px] border border-[var(--border-ink)] bg-[var(--paper-raised)] hover:bg-[var(--paper-input)] transition-colors flex items-center justify-between gap-2.5 text-xs font-bold text-[var(--ink)]"
                                  >
                                    <span className="inline-flex items-center gap-2 truncate">
                                      <Send className="w-4 h-4 text-[var(--crimson)] shrink-0" />
                                      <span className="truncate">Telegram Channel</span>
                                    </span>
                                    <ExternalLink className="w-3.5 h-3.5 text-[var(--crimson)] shrink-0" />
                                  </a>
                                )}
                              </div>
                            </section>
                          )}
                        </>
                      )}

                      {/* TAB 2: DEDICATED EVENT REGISTRATION APPLICATION FORM */}
                      {detailTab === 'apply' && (
                        <section className="paper-card p-5 sm:p-6 space-y-5">
                          {event.myRegistrationStatus && activeRegistration ? (
                            <div className="space-y-5">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                  {(activeRegistration.attendeePhotoUrl || student.photoUrl) && (
                                    <img
                                      src={activeRegistration.attendeePhotoUrl || student.photoUrl}
                                      alt={activeRegistration.userName}
                                      className="w-12 h-12 rounded-[10px] border border-[var(--border-ink)] object-cover shrink-0"
                                    />
                                  )}
                                  <h2 className="font-display text-xl font-extrabold tracking-[-0.03em] text-[var(--ink)]">
                                    Registration Recorded · {activeRegistration.passCode}
                                  </h2>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setQrPassOpen(true)}
                                  className="paper-btn-primary min-h-[40px] px-4 py-2 text-xs inline-flex items-center gap-1.5"
                                >
                                  <QrCode className="w-4 h-4" />
                                  <span>View E-Ticket</span>
                                </button>
                              </div>

                              <dl className="border border-[var(--border-ink)] rounded-[12px] bg-[var(--paper-raised)] divide-y divide-[var(--border-warm)] text-xs sm:text-sm overflow-hidden">
                                <div className="px-4 py-3 flex items-center justify-between gap-4">
                                  <dt className="text-[var(--ink-2)] font-medium">Applicant</dt>
                                  <dd className="font-bold text-[var(--ink)] text-right">
                                    {activeRegistration.userName}
                                  </dd>
                                </div>
                                <div className="px-4 py-3 flex items-center justify-between gap-4">
                                  <dt className="text-[var(--ink-2)] font-medium">
                                    College &amp; ID
                                  </dt>
                                  <dd className="font-mono text-xs font-semibold text-[var(--ink)] text-right">
                                    {[activeRegistration.collegeShortName, activeRegistration.rollNumber]
                                      .filter(Boolean)
                                      .join(' · ') || 'Campus Student'}
                                  </dd>
                                </div>
                                {(activeRegistration.branch || activeRegistration.year) && (
                                  <div className="px-4 py-3 flex items-center justify-between gap-4">
                                    <dt className="text-[var(--ink-2)] font-medium">Academic</dt>
                                    <dd className="text-[var(--ink)] text-right">
                                      {[activeRegistration.branch, activeRegistration.year]
                                        .filter(Boolean)
                                        .join(' · ')}
                                    </dd>
                                  </div>
                                )}
                                <div className="px-4 py-3 flex items-center justify-between gap-4">
                                  <dt className="text-[var(--ink-2)] font-medium">
                                    Participation
                                  </dt>
                                  <dd className="text-[var(--ink)] text-right">
                                    {activeRegistration.teamName
                                      ? `Team: ${activeRegistration.teamName}`
                                      : activeRegistration.participationType === 'team'
                                        ? 'Team'
                                        : 'Individual'}
                                  </dd>
                                </div>
                                {activeRegistration.teamMembers && (
                                  <div className="px-4 py-3 flex items-center justify-between gap-4">
                                    <dt className="text-[var(--ink-2)] font-medium">Teammates</dt>
                                    <dd className="text-[var(--ink)] text-right">
                                      {activeRegistration.teamMembers}
                                    </dd>
                                  </div>
                                )}
                                <div className="px-4 py-3 flex items-center justify-between gap-4">
                                  <dt className="text-[var(--ink-2)] font-medium">Contact</dt>
                                  <dd className="font-mono text-xs text-[var(--ink)] text-right">
                                    {[activeRegistration.userPhone, activeRegistration.userEmail]
                                      .filter(Boolean)
                                      .join(' · ')}
                                  </dd>
                                </div>
                                {activeRegistration.emergencyContact && (
                                  <div className="px-4 py-3 flex items-center justify-between gap-4">
                                    <dt className="text-[var(--ink-2)] font-medium">Emergency Contact</dt>
                                    <dd className="font-mono text-xs text-[var(--ink)] text-right">
                                      {activeRegistration.emergencyContact}
                                    </dd>
                                  </div>
                                )}
                                <div className="px-4 py-3 flex items-center justify-between gap-4">
                                  <dt className="text-[var(--ink-2)] font-medium">Fee Status</dt>
                                  <dd className="font-mono font-semibold text-[var(--olive)] text-right">
                                    {activeRegistration.paymentStatus === 'free'
                                      ? 'Free Pass'
                                      : activeRegistration.paymentStatus === 'paid_verified'
                                        ? `Paid ₹${activeRegistration.amountPaidInr} (${activeRegistration.paymentRef || 'Verified'})`
                                        : `Pending Verification (₹${event.feeInr})`}
                                  </dd>
                                </div>
                              </dl>

                              {activeSnapshot && (
                                <div className="p-4 rounded-[12px] bg-[var(--paper-raised)] border border-[var(--border-ink)] space-y-2.5">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="text-xs font-bold uppercase tracking-[0.06em] text-[var(--ink)] flex items-center gap-1.5">
                                      <Users className="w-3.5 h-3.5 text-[var(--crimson)]" />
                                      <span>Squad Roster Snapshot</span>
                                    </div>
                                    <span
                                      className={`text-[11px] font-mono font-semibold uppercase tracking-[0.05em] ${
                                        activeSnapshot.status === 'needs_update'
                                          ? 'text-[var(--amber-ink)]'
                                          : 'text-[var(--olive)]'
                                      }`}
                                    >
                                      {activeSnapshot.status === 'needs_update'
                                        ? 'Roster changed · Amend in Teams'
                                        : 'Synced with Squad'}
                                    </span>
                                  </div>
                                  <div className="divide-y divide-[var(--border-warm)] border-t border-[var(--border-warm)]">
                                    {activeSnapshot.members.map((m) => (
                                      <div
                                        key={m.userId}
                                        className="py-1.5 flex items-center justify-between gap-2 text-xs"
                                      >
                                        <span className="font-medium text-[var(--ink)] truncate">
                                          {m.name}
                                          {m.collegeShortName ? ` · ${m.collegeShortName}` : ''}
                                        </span>
                                        <span className="font-mono text-[11px] text-[var(--ink-2)] shrink-0">
                                          {m.registrationStatus === 'confirmed'
                                            ? `Pass ${m.passCode || 'Issued'}`
                                            : m.registrationStatus === 'waitlisted'
                                              ? 'Waitlisted'
                                              : 'Pass Pending'}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {(activeRegistration.needsTeammates ||
                                activeRegistration.participationType === 'individual') && (
                                <div className="p-4 rounded-[12px] bg-[var(--feel-tint)] border border-[var(--border-ink)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                  <div className="text-xs text-[var(--ink)] space-y-0.5">
                                    <div className="font-bold">Looking for teammates?</div>
                                    <div className="text-[var(--ink-2)]">
                                      Launch a Team-up Call to reach matching students for {event.title}.
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => onLaunchTeamUpCall(event.id)}
                                    className="paper-btn-primary min-h-[36px] px-3.5 py-1.5 text-xs inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap"
                                  >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>Create Team-up Call</span>
                                  </button>
                                </div>
                              )}

                              {event.googleFormUrl && (
                                <div className="p-4 rounded-[12px] bg-[var(--feel-tint)] border border-[var(--border-ink)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                  <div className="text-xs text-[var(--ink)]">
                                    <strong>Optional Host Form:</strong> Submit project decks or
                                    consent via {event.collegeShortName}&apos;s Google Form.
                                  </div>
                                  <a
                                    href={event.googleFormUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="paper-btn-secondary min-h-[38px] px-3.5 py-1.5 text-xs inline-flex items-center gap-1.5 shrink-0"
                                  >
                                    <span>Open Google Form</span>
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                </div>
                              )}
                            </div>
                          ) : event.regStatus === 'closed' ? (
                            <div className="py-8 text-center space-y-2">
                              <h2 className="font-display text-xl font-extrabold text-[var(--ink)]">
                                Registration Closed
                              </h2>
                              <p className="text-sm text-[var(--ink-2)] max-w-md mx-auto">
                                The host organizer has closed new applications for this event.
                              </p>
                            </div>
                          ) : isIneligible ? (
                            <div className="py-8 text-center space-y-2.5">
                              <Lock className="w-8 h-8 text-[var(--amber-ink)] mx-auto" />
                              <h2 className="font-display text-xl font-extrabold text-[var(--ink)]">
                                Eligibility Restriction
                              </h2>
                              <p className="text-sm text-[var(--ink-2)] max-w-md mx-auto">
                                {ineligibilityReasons.join(' · ') ||
                                  'This event is restricted to specific student eligibility criteria. You can still view the poster, schedule, rules, and organizers.'}
                              </p>
                            </div>
                          ) : (
                            <form onSubmit={handleConfirmRegistration} className="space-y-5">
                              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--border-warm)]">
                                <h2 className="font-display text-lg sm:text-xl font-extrabold tracking-[-0.03em] text-[var(--ink)]">
                                  {isFull ? 'Waitlist Registration' : 'Event Registration'}
                                </h2>
                                <span className="font-mono text-xs font-semibold text-[var(--crimson)] tabular-nums">
                                  {event.feeInr === 0 ? 'Free Entry' : `Fee ${formatFee(event.feeInr)}`}
                                </span>
                              </div>

                                {/* 1. Participant Info */}
                              <div className="space-y-3">
                                <div className="text-[11px] font-mono text-[var(--ink-2)] flex items-center gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-[var(--olive)] shrink-0" />
                                  <span>
                                    {student.phoneNumber && !isPlaceholderStudentName(student.displayName)
                                      ? 'Auto-filled from your saved profile · Changes save for future events'
                                      : 'Details entered here are automatically saved to your profile for future events'}
                                  </span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                  <label className="block space-y-1.5">
                                    <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ink-2)]">
                                      Full Name *
                                    </span>
                                    <input
                                      type="text"
                                      required
                                      value={appName}
                                      onChange={(e) => {
                                        appFormDirtyRef.current = true;
                                        setAppName(e.target.value);
                                      }}
                                      placeholder="Your full name"
                                      className="paper-input w-full min-h-[40px] px-3 py-2 text-sm"
                                    />
                                  </label>

                                  <label className="block space-y-1.5">
                                    <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ink-2)]">
                                      College
                                    </span>
                                    <input
                                      type="text"
                                      value={appCollege}
                                      onChange={(e) => {
                                        appFormDirtyRef.current = true;
                                        setAppCollege(e.target.value);
                                      }}
                                      placeholder="e.g. MRDU, CBIT, IIITH"
                                      className="paper-input w-full min-h-[40px] px-3 py-2 text-sm"
                                    />
                                  </label>

                                  <label className="block space-y-1.5">
                                    <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ink-2)]">
                                      Email *
                                    </span>
                                    <input
                                      type="email"
                                      value={appEmail}
                                      onChange={(e) => {
                                        appFormDirtyRef.current = true;
                                        setAppEmail(e.target.value);
                                      }}
                                      placeholder="student@college.edu.in"
                                      className="paper-input w-full min-h-[40px] px-3 py-2 text-sm"
                                    />
                                  </label>

                                  <label className="block space-y-1.5">
                                    <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ink-2)]">
                                      Phone / WhatsApp
                                    </span>
                                    <input
                                      type="tel"
                                      value={appPhone}
                                      onChange={(e) => {
                                        appFormDirtyRef.current = true;
                                        setAppPhone(e.target.value);
                                      }}
                                      placeholder="+91 98765 43210"
                                      className="paper-input w-full min-h-[40px] px-3 py-2 text-sm font-mono"
                                    />
                                  </label>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                                  <label className="block space-y-1.5">
                                    <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ink-2)]">
                                      Roll No. (optional)
                                    </span>
                                    <input
                                      type="text"
                                      value={appRollNumber}
                                      onChange={(e) => {
                                        appFormDirtyRef.current = true;
                                        setAppRollNumber(e.target.value);
                                      }}
                                      placeholder="e.g. 22BCE1042"
                                      className="paper-input w-full min-h-[40px] px-3 py-2 text-sm font-mono uppercase"
                                    />
                                  </label>

                                  <label className="block space-y-1.5">
                                    <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ink-2)]">
                                      Branch
                                    </span>
                                    <input
                                      type="text"
                                      value={appBranch}
                                      onChange={(e) => {
                                        appFormDirtyRef.current = true;
                                        setAppBranch(e.target.value);
                                      }}
                                      placeholder="e.g. CSE"
                                      className="paper-input w-full min-h-[40px] px-3 py-2 text-sm"
                                    />
                                  </label>

                                  <label className="block space-y-1.5">
                                    <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ink-2)]">
                                      Year
                                    </span>
                                    <select
                                      value={appYear}
                                      onChange={(e) => {
                                        appFormDirtyRef.current = true;
                                        setAppYear(e.target.value);
                                      }}
                                      className="paper-input w-full min-h-[40px] px-2.5 py-2 text-sm"
                                    >
                                      <option value="1st Year">1st Year</option>
                                      <option value="2nd Year">2nd Year</option>
                                      <option value="3rd Year">3rd Year</option>
                                      <option value="4th Year">4th Year</option>
                                      <option value="PG / PhD">PG / PhD</option>
                                    </select>
                                  </label>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-start pt-1">
                                  <div className="sm:col-span-7 p-3 rounded-[10px] border border-[var(--border-warm)] bg-[var(--paper-raised)] flex items-center gap-3.5">
                                    <div className="w-16 h-16 rounded-[10px] border border-[var(--border-ink)] bg-[var(--paper-input)] overflow-hidden flex items-center justify-center shrink-0">
                                      {appPhotoUrl ? (
                                        <img
                                          src={appPhotoUrl}
                                          alt="Attendee pass preview"
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <Camera className="w-5 h-5 text-[var(--ink-2)]" />
                                      )}
                                    </div>
                                    <div className="min-w-0 flex-1 space-y-1.5">
                                      <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ink)]">
                                        Entry Pass Photo (Recommended)
                                      </div>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <input
                                          ref={appPhotoInputRef}
                                          type="file"
                                          accept="image/*"
                                          className="hidden"
                                          onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            e.target.value = '';
                                            if (!file) return;
                                            setPhotoError(null);
                                            setUploadingPhoto(true);
                                            try {
                                              const compressed = await resizeAvatarImage(file);
                                              appFormDirtyRef.current = true;
                                              setAppPhotoUrl(compressed);
                                            } catch (err) {
                                              setPhotoError(
                                                err instanceof Error
                                                  ? err.message
                                                  : 'Could not process image.'
                                              );
                                            } finally {
                                              setUploadingPhoto(false);
                                            }
                                          }}
                                        />
                                        <button
                                          type="button"
                                          disabled={uploadingPhoto}
                                          onClick={() => appPhotoInputRef.current?.click()}
                                          className="paper-btn-secondary min-h-[32px] px-2.5 py-1 text-xs inline-flex items-center gap-1.5"
                                        >
                                          {uploadingPhoto ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--crimson)]" />
                                          ) : (
                                            <Camera className="w-3.5 h-3.5 text-[var(--crimson)]" />
                                          )}
                                          <span>
                                            {uploadingPhoto
                                              ? 'Compressing...'
                                              : appPhotoUrl
                                                ? 'Replace Photo'
                                                : 'Upload Photo'}
                                          </span>
                                        </button>
                                        {appPhotoUrl && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              appFormDirtyRef.current = true;
                                              setAppPhotoUrl('');
                                            }}
                                            className="text-[11px] font-semibold text-[var(--crimson)] hover:underline"
                                          >
                                            Remove
                                          </button>
                                        )}
                                      </div>
                                      {appPhotoUrl && (
                                        <label className="flex items-center gap-1.5 text-[11px] text-[var(--ink-2)] cursor-pointer">
                                          <input
                                            type="checkbox"
                                            checked={appSavePhotoToProfile}
                                            onChange={(e) => setAppSavePhotoToProfile(e.target.checked)}
                                            className="accent-[var(--crimson)]"
                                          />
                                          <span>Also save to my Connectus profile</span>
                                        </label>
                                      )}
                                      {photoError && (
                                        <div className="text-[11px] text-[var(--crimson)]">
                                          {photoError}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <label className="sm:col-span-5 block space-y-1.5">
                                    <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ink-2)]">
                                      Emergency Contact (optional)
                                    </span>
                                    <input
                                      type="tel"
                                      maxLength={40}
                                      value={appEmergencyContact}
                                      onChange={(e) => setAppEmergencyContact(e.target.value)}
                                      placeholder="Guardian / peer phone"
                                      className="paper-input w-full min-h-[40px] px-3 py-2 text-sm font-mono"
                                    />
                                    <span className="block text-[10.5px] text-[var(--ink-2)]">
                                      Printed on your pass for overnight / outstation events.
                                    </span>
                                  </label>
                                </div>
                              </div>

                              {/* 2. Participation Mode */}
                              <div className="space-y-3.5 pt-4 border-t border-[var(--border-warm)]">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--ink)]">
                                    Participation
                                  </span>
                                  <div className="paper-segment">
                                    <button
                                      type="button"
                                      aria-pressed={appParticipation === 'individual'}
                                      onClick={() => {
                                        setAppParticipation('individual');
                                        setAppSquadId('');
                                      }}
                                      className="paper-segment-btn min-h-[32px] px-3 py-1 text-xs"
                                    >
                                      Individual
                                    </button>
                                    <button
                                      type="button"
                                      aria-pressed={appParticipation === 'team'}
                                      onClick={() => setAppParticipation('team')}
                                      className="paper-segment-btn min-h-[32px] px-3 py-1 text-xs"
                                    >
                                      Team Entry
                                    </button>
                                  </div>
                                </div>

                                {appParticipation === 'individual' ? (
                                  <label className="flex items-center gap-2.5 text-xs text-[var(--ink)] cursor-pointer py-1">
                                    <input
                                      type="checkbox"
                                      checked={appNeedsTeammates}
                                      onChange={(e) => setAppNeedsTeammates(e.target.checked)}
                                      className="rounded-none border-[var(--ink)] accent-[var(--crimson)]"
                                    />
                                    <span>Looking for teammates for this event</span>
                                  </label>
                                ) : (
                                  <div className="space-y-3">
                                    {availableSquads.length > 0 && (
                                      <label className="block space-y-1.5">
                                        <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ink-2)]">
                                          Existing Squad (optional)
                                        </span>
                                        <select
                                          value={appSquadId}
                                          onChange={(e) => handleSelectAppSquad(e.target.value)}
                                          className="paper-input w-full min-h-[40px] px-3 py-2 text-sm"
                                        >
                                          <option value="">Enter team manually...</option>
                                          {availableSquads.map((sq) => (
                                            <option key={sq.id} value={sq.id}>
                                              {sq.name} · {sq.members.length}/{sq.targetSize} members
                                            </option>
                                          ))}
                                        </select>
                                      </label>
                                    )}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                      <label className="block space-y-1.5">
                                        <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ink-2)]">
                                          Team Name *
                                        </span>
                                        <input
                                          type="text"
                                          required
                                          value={appTeamName}
                                          onChange={(e) => setAppTeamName(e.target.value)}
                                          placeholder="e.g. Deccan Builders"
                                          className="paper-input w-full min-h-[40px] px-3 py-2 text-sm"
                                        />
                                      </label>
                                      <label className="block space-y-1.5">
                                        <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ink-2)]">
                                          Teammates (optional)
                                        </span>
                                        <input
                                          type="text"
                                          value={appTeamMembers}
                                          onChange={(e) => setAppTeamMembers(e.target.value)}
                                          placeholder="Names or roll numbers"
                                          className="paper-input w-full min-h-[40px] px-3 py-2 text-sm"
                                        />
                                      </label>
                                    </div>
                                  </div>
                                )}

                                <label className="block space-y-1.5">
                                  <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ink-2)]">
                                    Track / Note (optional)
                                  </span>
                                  <input
                                    type="text"
                                    value={appPitchNote}
                                    onChange={(e) => setAppPitchNote(e.target.value)}
                                    placeholder="Preferred track or short note"
                                    className="paper-input w-full min-h-[40px] px-3 py-2 text-sm"
                                  />
                                </label>
                              </div>

                              {/* 3. Payment (Only when paid event) */}
                              {event.feeInr > 0 && (
                                <div className="space-y-3 pt-4 border-t border-[var(--border-warm)]">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--ink)] inline-flex items-center gap-1.5">
                                      <CreditCard className="w-3.5 h-3.5 text-[var(--crimson)]" />
                                      <span>Payment · {formatFee(event.feeInr)}</span>
                                    </span>
                                    {event.paymentInfo?.upiId && (
                                      <button
                                        type="button"
                                        onClick={() => copyText('app-upi', event.paymentInfo!.upiId!)}
                                        className="paper-btn-secondary px-2.5 py-1 font-mono text-[11px] inline-flex items-center gap-1.5"
                                      >
                                        {copiedKey === 'app-upi' ? (
                                          <Check className="w-3 h-3 text-[var(--olive)]" />
                                        ) : (
                                          <Copy className="w-3 h-3" />
                                        )}
                                        <span>UPI: {event.paymentInfo.upiId}</span>
                                      </button>
                                    )}
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                    <label className="block space-y-1.5">
                                      <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ink-2)]">
                                        Payment Method
                                      </span>
                                      <select
                                        value={appMethod}
                                        onChange={(e) =>
                                          setAppMethod(e.target.value as 'UPI' | 'College Portal')
                                        }
                                        className="paper-input w-full min-h-[40px] px-2.5 py-2 text-sm"
                                      >
                                        <option value="UPI">UPI Transfer / QR</option>
                                        <option value="College Portal">College Payment Portal</option>
                                      </select>
                                    </label>
                                    <label className="block space-y-1.5">
                                      <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ink-2)]">
                                        UTR / Transaction Ref (optional)
                                      </span>
                                      <input
                                        type="text"
                                        value={appPaymentRef}
                                        onChange={(e) => setAppPaymentRef(e.target.value)}
                                        placeholder="Enter UTR if paid, or pay at gate"
                                        className="paper-input w-full min-h-[40px] px-3 py-2 text-sm font-mono"
                                      />
                                    </label>
                                  </div>
                                </div>
                              )}

                              {(event.googleFormUrl || event.regLink) && (
                                <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--ink-2)]">
                                  <span>External form available if needed:</span>
                                  <div className="flex items-center gap-3">
                                    {event.googleFormUrl && (
                                      <a
                                        href={event.googleFormUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-semibold text-[var(--crimson)] hover:underline inline-flex items-center gap-1"
                                      >
                                        <span>Google Form</span>
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    )}
                                    {event.regLink && (
                                      <a
                                        href={event.regLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-semibold text-[var(--ink)] hover:underline inline-flex items-center gap-1"
                                      >
                                        <span>Host Portal</span>
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    )}
                                  </div>
                                </div>
                              )}

                              {appError && (
                                <div className="p-3 border border-[var(--crimson)] bg-[var(--crimson-soft)] text-xs font-medium text-[var(--crimson)]">
                                  {appError}
                                </div>
                              )}

                              <div className="pt-4 border-t border-[var(--border-warm)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <label className="flex items-start gap-2.5 text-xs text-[var(--ink-2)] cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={appConsent}
                                    onChange={(e) => setAppConsent(e.target.checked)}
                                    className="mt-0.5 rounded-none border-[var(--ink)] accent-[var(--crimson)]"
                                  />
                                  <span>
                                    I confirm my details are accurate for gate check-in.
                                  </span>
                                </label>

                                <button
                                  type="submit"
                                  disabled={busy}
                                  className="paper-btn-primary w-full sm:w-auto min-h-[44px] px-6 py-2.5 text-sm inline-flex items-center justify-center gap-2 shrink-0 whitespace-nowrap"
                                >
                                  <QrCode className="w-4 h-4" />
                                  <span>
                                    {busy
                                      ? 'Generating E-Ticket...'
                                      : isFull
                                        ? 'Join Waitlist & Get Pass'
                                        : 'Register & Generate E-Ticket'}
                                  </span>
                                </button>
                              </div>
                            </form>
                          )}
                        </section>
                      )}

                      {/* TAB 3: SCHEDULE & RULES */}
                      {detailTab === 'schedule' && hasScheduleOrRules && (
                        <>
                          {event.schedule && event.schedule.length > 0 && (
                            <section className="paper-card p-5 sm:p-6 space-y-4">
                              <h2 className="font-display text-lg font-extrabold tracking-[-0.02em] text-[var(--ink)] flex items-center gap-2">
                                <Clock className="w-4 h-4 text-[var(--crimson)] shrink-0" />
                                <span>Event Schedule (IST)</span>
                              </h2>
                              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                {event.schedule.map((day) => (
                                  <div
                                    key={day.dayLabel}
                                    className="rounded-[12px] border border-[var(--border-ink)] bg-[var(--paper-raised)] overflow-hidden"
                                  >
                                    <div className="px-4 py-2.5 bg-[var(--feel-tint)] border-b border-[var(--border-ink)] text-xs font-bold uppercase tracking-[0.06em] text-[var(--ink)]">
                                      {day.dayLabel}
                                    </div>
                                    <div className="divide-y divide-[var(--border-warm)]">
                                      {day.items.map((item, idx) => (
                                        <div
                                          key={`${day.dayLabel}-${idx}`}
                                          className="px-3.5 py-2.5 flex items-start justify-between gap-3 text-xs"
                                        >
                                          <span className="font-mono font-semibold text-[var(--crimson)] tabular-nums whitespace-nowrap shrink-0">
                                            {item.time}
                                          </span>
                                          <span className="text-right font-medium text-[var(--ink)] leading-snug">
                                            {item.activity}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </section>
                          )}

                          {event.rules && event.rules.length > 0 && (
                            <section className="paper-card p-5 sm:p-6 space-y-3.5">
                              <h2 className="font-display text-lg font-extrabold tracking-[-0.02em] text-[var(--ink)] flex items-center gap-2">
                                <Scale className="w-4 h-4 text-[var(--crimson)] shrink-0" />
                                <span>Rules &amp; Regulations</span>
                              </h2>
                              <ol className="space-y-2.5 text-sm text-[var(--ink-2)]">
                                {event.rules.map((rule, idx) => (
                                  <li key={idx} className="flex items-start gap-3">
                                    <span className="font-mono text-xs font-bold text-[var(--crimson)] tabular-nums pt-0.5 shrink-0">
                                      {String(idx + 1).padStart(2, '0')}.
                                    </span>
                                    <span className="leading-relaxed text-[var(--ink)]">{rule}</span>
                                  </li>
                                ))}
                              </ol>
                            </section>
                          )}
                        </>
                      )}

                      {/* TAB 4: FIND TEAM / TEAM-UP CALL */}
                      {detailTab === 'team' && (
                        <section className="paper-card p-5 sm:p-6 space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div className="space-y-1">
                              <h2 className="font-display text-lg font-extrabold tracking-[-0.02em] text-[var(--ink)] flex items-center gap-2">
                                <UserPlus className="w-4 h-4 text-[var(--crimson)] shrink-0" />
                                <span>Find Teammates for {event.title}</span>
                              </h2>
                              <p className="text-xs text-[var(--ink-2)]">
                                Send a mutual-consent Connect request to interested students or publish a targeted Team-up Call.
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  if (myExistingPost) {
                                    setRoleSkill(myExistingPost.roleSkill);
                                    setLookingFor(myExistingPost.lookingFor);
                                    setTeamSlotsNeeded(String(myExistingPost.teamSlotsNeeded));
                                    setPartnerNote(myExistingPost.note);
                                    setWhatsappReady(myExistingPost.whatsappReady);
                                  }
                                  setPartnerFormOpen((v) => !v);
                                }}
                                className="paper-btn-ink min-h-[38px] px-3.5 py-1.5 text-xs whitespace-nowrap"
                              >
                                {myExistingPost ? 'Edit My Listing' : 'Post Availability'}
                              </button>
                              <button
                                type="button"
                                onClick={() => onLaunchTeamUpCall(event.id)}
                                className="paper-btn-primary min-h-[38px] px-3.5 py-1.5 text-xs inline-flex items-center gap-1.5 whitespace-nowrap"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Create Team-up Call</span>
                              </button>
                            </div>
                          </div>

                          {myEventSquads.length > 0 && (
                            <div className="p-3.5 rounded-[12px] bg-[var(--olive-tint)] border border-[var(--olive-border)] space-y-1.5">
                              <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--ink)] flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5 text-[var(--olive)]" />
                                <span>Your Squad for This Event</span>
                              </div>
                              {myEventSquads.map((sq) => (
                                <div key={sq.id} className="text-xs text-[var(--ink)] flex flex-wrap items-center justify-between gap-2">
                                  <span>
                                    <strong>{sq.name}</strong> · {sq.members.length}/{sq.targetSize} members
                                    {sq.requiredRoles.length > 0 ? ` · Open for ${sq.requiredRoles.join(', ')}` : ''}
                                  </span>
                                  <span className="font-mono text-[11px] text-[var(--ink-2)]">
                                    Manage in Teams → My Squads
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          {connectError && (
                            <div className="p-3 rounded-[10px] bg-[var(--crimson-soft)] border border-[var(--crimson)] text-xs font-medium text-[var(--crimson)]">
                              {connectError}
                            </div>
                          )}

                          {partnerFormOpen && (
                            <form
                              ref={partnerFormRef}
                              onSubmit={handleSubmitPartnerForm}
                              className="p-4 rounded-[12px] bg-[var(--paper-raised)] border border-[var(--border-ink)] space-y-3 cp-scroll-target"
                            >
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <label className="block space-y-1">
                                  <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ink-2)]">
                                    Your Role / Skills *
                                  </span>
                                  <input
                                    type="text"
                                    required
                                    value={roleSkill}
                                    onChange={(e) => setRoleSkill(e.target.value)}
                                    placeholder="e.g. React & Node.js Backend"
                                    className="paper-input w-full min-h-[38px] px-3 py-1.5 text-xs"
                                  />
                                </label>
                                <label className="block space-y-1">
                                  <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ink-2)]">
                                    Looking For *
                                  </span>
                                  <input
                                    type="text"
                                    required
                                    value={lookingFor}
                                    onChange={(e) => setLookingFor(e.target.value)}
                                    placeholder="e.g. ML Engineer + UI/UX Designer"
                                    className="paper-input w-full min-h-[38px] px-3 py-1.5 text-xs"
                                  />
                                </label>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <label className="block space-y-1">
                                  <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ink-2)]">
                                    Slots Needed
                                  </span>
                                  <select
                                    value={teamSlotsNeeded}
                                    onChange={(e) => setTeamSlotsNeeded(e.target.value)}
                                    className="paper-input w-full min-h-[38px] px-3 py-1.5 text-xs"
                                  >
                                    <option value="1">1 Partner (Pair / Duo)</option>
                                    <option value="2">2 Teammates (3-member Squad)</option>
                                    <option value="3">3 Teammates (4-member Squad)</option>
                                    <option value="4">4+ Teammates (Large Squad)</option>
                                  </select>
                                </label>
                                <label className="flex items-center gap-2 pt-5 text-xs text-[var(--ink)] cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={whatsappReady}
                                    onChange={(e) => setWhatsappReady(e.target.checked)}
                                    className="rounded-none border-[var(--ink)] accent-[var(--crimson)]"
                                  />
                                  <span>Open to moving chat to WhatsApp</span>
                                </label>
                              </div>

                              <label className="block space-y-1">
                                <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ink-2)]">
                                  Short Pitch
                                </span>
                                <input
                                  type="text"
                                  value={partnerNote}
                                  onChange={(e) => setPartnerNote(e.target.value)}
                                  placeholder="e.g. Building an AI edge tracker, free evenings to sync..."
                                  className="paper-input w-full min-h-[38px] px-3 py-1.5 text-xs"
                                />
                              </label>

                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setPartnerFormOpen(false)}
                                  className="paper-btn-secondary min-h-[36px] px-3 py-1.5 text-xs"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="submit"
                                  disabled={partnerBusy}
                                  className="paper-btn-primary min-h-[36px] px-4 py-1.5 text-xs"
                                >
                                  {partnerBusy ? 'Posting...' : 'Publish Listing'}
                                </button>
                              </div>
                            </form>
                          )}

                          <div className="paper-segment w-fit">
                            <button
                              type="button"
                              aria-pressed={partnerTab === 'same'}
                              onClick={() => setPartnerTab('same')}
                              className="paper-segment-btn min-h-[34px] px-3.5 py-1 text-xs whitespace-nowrap tabular-nums"
                            >
                              This Event ({sameEventPeers.length})
                            </button>
                            <button
                              type="button"
                              aria-pressed={partnerTab === 'similar'}
                              onClick={() => setPartnerTab('similar')}
                              className="paper-segment-btn min-h-[34px] px-3.5 py-1 text-xs whitespace-nowrap tabular-nums"
                            >
                              Similar {event.type}s ({similarEventPeers.length})
                            </button>
                          </div>

                          {visiblePeers.length === 0 ? (
                            <div className="p-4 rounded-[12px] bg-[var(--paper-raised)] border border-[var(--border-warm)] text-xs text-[var(--ink-2)] flex flex-wrap items-center justify-between gap-2">
                              <span>
                                {partnerTab === 'same'
                                  ? 'No partner requests posted for this exact event yet.'
                                  : `No peers listed on other ${event.type.toLowerCase()}s yet.`}
                              </span>
                              {partnerTab === 'same' && similarEventPeers.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setPartnerTab('similar')}
                                  className="text-[var(--crimson)] font-semibold underline underline-offset-4"
                                >
                                  View {similarEventPeers.length} peers from similar{' '}
                                  {event.type.toLowerCase()}s
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {visiblePeers.map((peer) => {
                                const isMine = peer.userId === student.id;
                                const isConnected = connectedPeerIds.includes(peer.userId);
                                const isConnecting = connectingPeerId === peer.id;
                                return (
                                  <div
                                    key={peer.id}
                                    className="p-4 rounded-[12px] border border-[var(--border-ink)] bg-[var(--paper-raised)] space-y-2.5"
                                  >
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                      <div>
                                        <div className="text-sm font-bold text-[var(--ink)]">
                                          {peer.userName} {isMine ? '(You)' : ''}
                                        </div>
                                        <div className="text-xs text-[var(--ink-2)]">
                                          {peer.collegeShortName} · {peer.branch} · {peer.year}
                                        </div>
                                      </div>
                                      <span className="text-xs font-mono font-semibold text-[var(--crimson)] tabular-nums">
                                        {peer.teamSlotsNeeded === 1
                                          ? 'Needs 1 partner'
                                          : `Needs ${peer.teamSlotsNeeded} teammates`}
                                      </span>
                                    </div>

                                    {partnerTab === 'similar' && (
                                      <div className="text-[11px] font-medium text-[var(--ink-2)]">
                                        Interested in:{' '}
                                        <strong className="text-[var(--ink)]">
                                          {peer.eventTitle}
                                        </strong>
                                      </div>
                                    )}

                                    <div className="text-xs text-[var(--ink-2)] space-y-1">
                                      <div>
                                        <span className="uppercase tracking-[0.06em] text-[10px] font-semibold">
                                          Brings:{' '}
                                        </span>
                                        <strong className="text-[var(--ink)]">
                                          {peer.roleSkill}
                                        </strong>
                                      </div>
                                      <div>
                                        <span className="uppercase tracking-[0.06em] text-[10px] font-semibold">
                                          Looking for:{' '}
                                        </span>
                                        <span className="text-[var(--ink)]">{peer.lookingFor}</span>
                                      </div>
                                      {peer.note && <p className="leading-relaxed">{peer.note}</p>}
                                    </div>

                                    <div className="pt-2 border-t border-[var(--border-warm)] flex flex-wrap items-center justify-between gap-2">
                                      <span className="text-[11px] text-[var(--ink-2)]">
                                        {peer.whatsappReady
                                          ? 'Happy to switch to WhatsApp after matching'
                                          : 'In-app mutual discussion first'}
                                      </span>

                                      {isMine ? (
                                        <button
                                          type="button"
                                          onClick={() => onDeletePartnerRequest(peer.id)}
                                          className="min-h-[34px] px-3 py-1 border border-[var(--crimson)] text-[var(--crimson)] hover:bg-[var(--crimson-tint)] text-xs font-semibold inline-flex items-center gap-1"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                          <span>Remove Listing</span>
                                        </button>
                                      ) : isConnected ? (
                                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--olive)]">
                                          <CheckCircle2 className="w-3.5 h-3.5" />
                                          <span>Request Sent · Check Teams Activity</span>
                                        </span>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setConnectingPeerId(isConnecting ? null : peer.id);
                                            setConnectNote(
                                              `Hey ${peer.userName.split(' ')[0]}, I'm looking for a teammate for ${event.title}. Let's discuss!`
                                            );
                                          }}
                                          className="paper-btn-ink min-h-[36px] px-3.5 py-1.5 text-xs inline-flex items-center gap-1.5 whitespace-nowrap"
                                        >
                                          <UserPlus className="w-3.5 h-3.5" />
                                          <span>{isConnecting ? 'Cancel' : 'Connect'}</span>
                                        </button>
                                      )}
                                    </div>

                                    {isConnecting && !isConnected && (
                                      <form
                                        onSubmit={(e) => handleSendPeerConnect(e, peer)}
                                        className="pt-2 flex flex-col sm:flex-row gap-2"
                                      >
                                        <input
                                          type="text"
                                          required
                                          value={connectNote}
                                          onChange={(e) => setConnectNote(e.target.value)}
                                          placeholder="Short intro note..."
                                          className="paper-input flex-1 min-h-[36px] px-3 py-1.5 text-xs"
                                        />
                                        <button
                                          type="submit"
                                          disabled={connectBusy}
                                          className="paper-btn-primary min-h-[36px] px-3.5 py-1.5 text-xs shrink-0"
                                        >
                                          {connectBusy ? 'Sending...' : 'Send Connect Request'}
                                        </button>
                                      </form>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </section>
                      )}

                      {/* TAB 5: EVENT FEEDBACK & REVIEWS */}
                      {detailTab === 'feedback' && (
                        <section className="paper-card p-5 sm:p-6 space-y-5">
                          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--border-warm)]">
                            <div>
                              <h2 className="font-display text-lg font-extrabold tracking-[-0.02em] text-[var(--ink)] flex items-center gap-2">
                                <MessageSquare className="w-4 h-4 text-[var(--crimson)] shrink-0" />
                                <span>Participant Feedback &amp; Reviews</span>
                              </h2>
                              <p className="text-xs text-[var(--ink-2)]">
                                Real participant ratings, improvement suggestions, and organizer feedback.
                              </p>
                            </div>

                            {feedbackForEvent.length > 0 && (
                              <div className="px-3 py-1.5 rounded-[10px] border border-[var(--border-ink)] bg-[var(--paper-raised)] font-mono text-xs font-bold text-[var(--ink)] flex items-center gap-1.5 tabular-nums">
                                <Star className="w-3.5 h-3.5 text-[var(--crimson)] fill-[var(--crimson)]" />
                                <span>{computedAvgRating} / 5</span>
                                <span className="text-[var(--ink-2)] font-normal">
                                  ({feedbackForEvent.length})
                                </span>
                              </div>
                            )}
                          </div>

                          {event.myRegistrationStatus && onSubmitFeedback ? (
                            <form
                              onSubmit={handleSubmitFeedbackForm}
                              className="p-4 rounded-[12px] border border-[var(--border-ink)] bg-[var(--paper-raised)] space-y-3"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="text-xs font-bold text-[var(--ink)]">
                                  Share Your Experience
                                </div>
                                <div className="flex items-center gap-1">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                      key={star}
                                      type="button"
                                      onClick={() => setFbRating(star)}
                                      aria-label={`Rate ${star} stars`}
                                      className="p-1 cursor-pointer"
                                    >
                                      <Star
                                        className={`w-4 h-4 ${
                                          star <= fbRating
                                            ? 'text-[var(--crimson)] fill-[var(--crimson)]'
                                            : 'text-[var(--ink-2)]/40'
                                        }`}
                                      />
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <textarea
                                rows={2}
                                value={fbComment}
                                onChange={(e) => setFbComment(e.target.value)}
                                placeholder="What worked well or stood out about this event?"
                                className="paper-input w-full px-3 py-2 text-xs resize-none"
                              />

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                <input
                                  type="text"
                                  value={fbSuggestion}
                                  onChange={(e) => setFbSuggestion(e.target.value)}
                                  placeholder="Optional suggestion for next edition..."
                                  className="paper-input w-full min-h-[36px] px-3 py-1.5 text-xs"
                                />
                                <input
                                  type="text"
                                  value={fbComplaint}
                                  onChange={(e) => setFbComplaint(e.target.value)}
                                  placeholder="Optional issue / complaint (logistics, timing)..."
                                  className="paper-input w-full min-h-[36px] px-3 py-1.5 text-xs"
                                />
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <input
                                  type="text"
                                  value={fbRequestedCategory}
                                  onChange={(e) => setFbRequestedCategory(e.target.value)}
                                  placeholder="Topic / category wanted next (e.g. Robotics, Design)"
                                  className="paper-input flex-1 min-w-[200px] min-h-[36px] px-3 py-1.5 text-xs"
                                />

                                <label className="flex items-center gap-1.5 text-xs text-[var(--ink)] cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={fbAnonymous}
                                    onChange={(e) => setFbAnonymous(e.target.checked)}
                                    className="accent-[var(--crimson)]"
                                  />
                                  <span>Post anonymously</span>
                                </label>
                              </div>

                              {fbError && (
                                <div className="text-xs font-medium text-[var(--crimson)]">
                                  {fbError}
                                </div>
                              )}
                              {fbNotice && (
                                <div className="text-xs font-medium text-[var(--olive)]">
                                  {fbNotice}
                                </div>
                              )}

                              <div className="flex justify-end">
                                <button
                                  type="submit"
                                  disabled={fbBusy}
                                  className="paper-btn-primary min-h-[36px] px-4 py-1.5 text-xs"
                                >
                                  {fbBusy ? 'Saving...' : 'Submit Feedback'}
                                </button>
                              </div>
                            </form>
                          ) : (
                            <div className="p-3.5 rounded-[10px] border border-[var(--border-warm)] bg-[var(--paper-raised)] text-xs text-[var(--ink-2)]">
                              Feedback submission is available to registered or attended participants of this event.
                            </div>
                          )}

                          {feedbackForEvent.length === 0 ? (
                            <div className="py-6 text-center text-xs text-[var(--ink-2)]">
                              No participant reviews submitted yet.
                            </div>
                          ) : (
                            <div className="divide-y divide-[var(--border-warm)] border-t border-[var(--border-warm)]">
                              {feedbackForEvent.map((item) => (
                                <div key={item.id} className="py-3.5 space-y-1.5 text-xs">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="font-bold text-[var(--ink)] flex items-center gap-2">
                                      <span>{item.isAnonymous ? 'Anonymous Student' : item.authorName}</span>
                                      <span className="font-mono text-[var(--crimson)] inline-flex items-center gap-0.5 tabular-nums">
                                        {'★'.repeat(item.rating)}
                                        <span className="text-[var(--ink-2)] ml-1">({item.rating}/5)</span>
                                      </span>
                                    </div>
                                    <span className="font-mono text-[11px] text-[var(--ink-2)] tabular-nums">
                                      {formatIstFull(item.createdAt)}
                                    </span>
                                  </div>
                                  {item.comment && (
                                    <p className="text-[var(--ink)] leading-relaxed">{item.comment}</p>
                                  )}
                                  {item.suggestion && (
                                    <div className="text-[var(--olive)]">
                                      <strong>Suggestion:</strong> {item.suggestion}
                                    </div>
                                  )}
                                  {item.complaint && (
                                    <div className="text-[var(--crimson)]">
                                      <strong>Issue noted:</strong> {item.complaint}
                                    </div>
                                  )}
                                  {item.requestedCategory && (
                                    <div className="text-[11px] font-mono text-[var(--ink-2)]">
                                      Requested topic: {item.requestedCategory}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </section>
                      )}
                  </div>
                </div>

                {/* Footer Transparency & Report */}
                <div className="pt-2 pb-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--ink-2)]">
                  <span>Why you see this: {event.reasons.join(' · ') || 'Campus feed'}</span>
                  {reportSubmitted ? (
                    <span className="text-[var(--olive)] font-semibold">Reported to Admin queue</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setReportOpen((v) => !v)}
                      className="inline-flex items-center gap-1 text-[var(--ink-2)] hover:text-[var(--crimson)] font-medium min-h-[36px]"
                    >
                      <Flag className="w-3.5 h-3.5" />
                      <span>Report Inaccurate Info</span>
                    </button>
                  )}
                </div>

                {reportOpen && (
                  <form
                    ref={reportFormRef}
                    onSubmit={submitReport}
                    className="paper-card-soft p-4 border border-[var(--border-ink)] space-y-2.5 cp-scroll-target"
                  >
                    <input
                      type="text"
                      required
                      value={reportReason}
                      onChange={(e) => setReportReason(e.target.value)}
                      placeholder="Describe inaccurate date, fake fee/UPI, broken link, or wrong venue..."
                      className="paper-input w-full min-h-[40px] px-3 py-2 text-xs"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setReportOpen(false)}
                        className="paper-btn-secondary px-3 py-1.5 text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={busy}
                        className="paper-btn-crimson px-4 py-1.5 text-xs"
                      >
                        Submit Report
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FULL-PICTURE POSTER LIGHTBOX */}
      {fullPictureOpen && (
        <div
          className="fixed inset-0 z-[70] bg-[#141414] flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-label={`Full picture poster for ${event.title}`}
        >
          <div className="shrink-0 px-4 sm:px-6 h-14 flex items-center justify-between gap-4 border-b border-[#333333] text-[#fafafa]">
            <div className="text-xs sm:text-sm font-semibold truncate">
              {event.title} · {event.collegeShortName}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setFullPictureZoomed((z) => !z)}
                className="min-h-[38px] px-3 py-1.5 border border-[#fafafa]/35 text-[#fafafa] hover:bg-[#a31c24] text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                {fullPictureZoomed ? (
                  <>
                    <ZoomOut className="w-4 h-4" />
                    <span>Fit to Screen</span>
                  </>
                ) : (
                  <>
                    <ZoomIn className="w-4 h-4" />
                    <span>Zoom In</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setFullPictureOpen(false)}
                aria-label="Close full picture poster"
                className="paper-btn-secondary min-h-[38px] px-3 py-1.5 text-xs inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                <X className="w-4 h-4" />
                <span>Close</span>
              </button>
            </div>
          </div>

          <div
            onClick={() => setFullPictureOpen(false)}
            className="flex-1 overflow-auto p-4 sm:p-8 flex"
          >
            <div
              onClick={(e) => {
                e.stopPropagation();
                setFullPictureZoomed((z) => !z);
              }}
              className={`m-auto ${
                fullPictureZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'
              }`}
            >
              {(() => {
                const allPosters = [
                  event.posterUrl,
                  ...(event.additionalPosterUrls || []),
                ].filter((u, idx, arr): u is string => Boolean(u) && arr.indexOf(u) === idx);
                const safeIdx = Math.min(activePosterIdx, Math.max(0, allPosters.length - 1));
                const fullPosterSrc = allPosters[safeIdx] || event.posterUrl;
                return (
                  <PosterImage
                    src={fullPosterSrc}
                    alt={`Full poster for ${event.title}`}
                    title={event.title}
                    className={
                      fullPictureZoomed
                        ? 'w-[min(1080px,94vw)] h-auto rounded-[14px] border border-[var(--on-ink)]/25 block'
                        : 'max-h-[85vh] max-w-[94vw] w-auto h-auto object-contain rounded-[14px] border border-[var(--on-ink)]/25 block'
                    }
                  />
                );
              })()}
            </div>
          </div>
        </div>
      )}

      <QrPassModal
        open={qrPassOpen}
        event={event}
        registration={activeRegistration}
        waitlistPosition={event.waitlistPosition}
        student={student}
        onUpdatePassPhoto={onUpdatePassPhoto}
        onClose={() => setQrPassOpen(false)}
      />
    </>,
    document.body
  );
}
