import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Archive,
  ArrowLeft,
  Bell,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Lock,
  MessageCircle,
  Phone,
  Plus,
  QrCode,
  Search,
  Send,
  Settings,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  SUPPORTED_LANGUAGES,
  type Area,
  type CallGenderFilter,
  type College,
  type ConnectionRequest,
  type FeedEvent,
  type PartnerPost,
  type PublicSquadSummary,
  type Registration,
  type Squad,
  type SquadJoinRequest,
  type SquadRecruitmentStatus,
  type SquadRegistrationSnapshot,
  type StudentProfile,
  type SupportedLanguage,
  type TeamChatMessage,
  type TeamConversation,
  type TeamUpCall,
} from '../types';
import { formatIstDate, formatIstTime } from '../utils/format';

export interface ActiveTeamRoom {
  scope: 'conversation' | 'squad';
  id: string;
}

interface TeamChatHubProps {
  student: StudentProfile;
  events: FeedEvent[];
  colleges: College[];
  areas: Area[];
  registrations: Registration[];
  partnerPosts: PartnerPost[];
  publicSquads: PublicSquadSummary[];
  mySquads: Squad[];
  connectionRequests: ConnectionRequest[];
  joinRequests: SquadJoinRequest[];
  teamUpCalls: TeamUpCall[];
  conversations: TeamConversation[];
  chatMessages: TeamChatMessage[];
  registrationSnapshots: SquadRegistrationSnapshot[];
  activeRoom: ActiveTeamRoom | null;
  draftCallEventId: string | null;
  onClearDraftCallEventId: () => void;
  onSelectRoom: (room: ActiveTeamRoom | null) => void;
  onOpenEvent: (eventId: string, initialTab?: 'overview' | 'apply') => void;
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
  onRespondConnectionRequest: (
    requestId: string,
    action: 'start_conversation' | 'decline'
  ) => Promise<void>;
  onEstimateTeamUpCall: (payload: {
    preferredCollege: string;
    preferredYear: string;
    preferredSkills: string[];
    rolesNeeded: string[];
    preferredAreas: string[];
    preferredLanguages: SupportedLanguage[];
    genderPreference: CallGenderFilter;
    audienceMode: 'active_only' | 'all_matching';
  }) => Promise<number | 'fewer than 3'>;
  onCreateTeamUpCall: (payload: {
    eventIds: string[];
    teammatesNeeded: number;
    preferredCollege: string;
    preferredYear: string;
    preferredSkills: string[];
    rolesNeeded: string[];
    preferredAreas: string[];
    preferredLanguages: SupportedLanguage[];
    genderPreference: CallGenderFilter;
    audienceMode: 'active_only' | 'all_matching';
    note: string;
  }) => Promise<void>;
  onRespondTeamUpCall: (
    callId: string,
    decision: 'interested' | 'dismissed',
    note?: string
  ) => Promise<void>;
  onInviteFromTeamUpCall: (
    callId: string,
    targetUserId: string,
    eventId?: string
  ) => Promise<void>;
  onCloseTeamUpCall: (callId: string) => Promise<void>;
  onSendConversationMessage: (conversationId: string, body: string) => Promise<void>;
  onConfirmConversationToSquad: (
    conversationId: string,
    payload: { squadName: string; targetSize: number }
  ) => Promise<void>;
  onArchiveConversation: (conversationId: string) => Promise<void>;
  onCreateSquad: (payload: {
    name: string;
    eventId: string;
    targetSize: number;
    requiredRoles: string[];
  }) => Promise<void>;
  onUpdateSquad: (
    squadId: string,
    payload: {
      name?: string;
      targetSize?: number;
      requiredRoles?: string[];
      recruitmentStatus?: SquadRecruitmentStatus;
      archived?: boolean;
    }
  ) => Promise<void>;
  onLeaveSquad: (squadId: string) => Promise<void>;
  onRemoveSquadMember: (squadId: string, memberUserId: string) => Promise<void>;
  onTransferSquadOwner: (squadId: string, nextOwnerId: string) => Promise<void>;
  onRequestJoinSquad: (
    squadId: string,
    payload: { roleApplied: string; note: string }
  ) => Promise<void>;
  onRespondJoinRequest: (
    requestId: string,
    decision: 'approve' | 'decline'
  ) => Promise<void>;
  onSendSquadMessage: (squadId: string, body: string) => Promise<void>;
  onShareSquadWhatsapp: (
    squadId: string,
    payload: { mode: 'contact' | 'group'; whatsappNumber?: string; whatsappGroupUrl?: string }
  ) => Promise<void>;
  onAmendSquadRegistration: (eventId: string, squadId: string) => Promise<void>;
}

type MainSection = 'discover' | 'activity' | 'squads';
type DiscoverSubView = 'people' | 'squads';
type ActivitySubView = 'requests' | 'chats';
type SquadWorkspaceTab = 'chat' | 'team';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
}

function buildWaLink(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, '');
  if (!digits) return '';
  const normalized = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${normalized}`;
}

const CALL_ROLE_PRESETS = [
  'Frontend',
  'Backend',
  'Full-Stack',
  'AI / ML',
  'UI / UX',
  'Mobile',
  'Hardware / IoT',
  'Pitch / Product',
  'Design / Media',
] as const;

export function TeamChatHub({
  student,
  events,
  colleges,
  areas,
  registrations,
  partnerPosts,
  publicSquads,
  mySquads,
  connectionRequests,
  joinRequests,
  teamUpCalls,
  conversations,
  chatMessages,
  registrationSnapshots,
  activeRoom,
  draftCallEventId,
  onClearDraftCallEventId,
  onSelectRoom,
  onOpenEvent,
  onPostPartnerRequest,
  onDeletePartnerRequest,
  onSendConnectionRequest,
  onRespondConnectionRequest,
  onEstimateTeamUpCall,
  onCreateTeamUpCall,
  onRespondTeamUpCall,
  onInviteFromTeamUpCall,
  onCloseTeamUpCall,
  onSendConversationMessage,
  onConfirmConversationToSquad,
  onArchiveConversation,
  onCreateSquad,
  onUpdateSquad,
  onLeaveSquad,
  onRemoveSquadMember,
  onTransferSquadOwner,
  onRequestJoinSquad,
  onRespondJoinRequest,
  onSendSquadMessage,
  onShareSquadWhatsapp,
  onAmendSquadRegistration,
}: TeamChatHubProps) {
  const [section, setSection] = useState<MainSection>('discover');
  const [discoverView, setDiscoverView] = useState<DiscoverSubView>('people');
  const [activityView, setActivityView] = useState<ActivitySubView>('requests');
  const [squadTab, setSquadTab] = useState<SquadWorkspaceTab>('chat');
  const [showArchivedSquads, setShowArchivedSquads] = useState(false);

  // Discover filters (extra filters collapsed by default)
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterEventId, setFilterEventId] = useState<string>('all');
  const [filterCollege, setFilterCollege] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterSkill, setFilterSkill] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Status / Error banner
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Active thread composer
  const [msgDraft, setMsgDraft] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Confirm-to-Squad state inside active 1-on-1 conversation
  const [confirmSquadName, setConfirmSquadName] = useState('');
  const [confirmTargetSize, setConfirmTargetSize] = useState('4');

  // Connect modal state
  const [connectTarget, setConnectTarget] = useState<PartnerPost | null>(null);
  const [connectNote, setConnectNote] = useState('');

  // Join Squad modal state
  const [joinTarget, setJoinTarget] = useState<PublicSquadSummary | null>(null);
  const [joinRole, setJoinRole] = useState('');
  const [joinNote, setJoinNote] = useState('');

  // Post Availability modal state
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [cardEventId, setCardEventId] = useState(events[0]?.id || 'evt-deccan-hack');
  const [cardRoleSkill, setCardRoleSkill] = useState((student.skills || []).slice(0, 3).join(', '));
  const [cardLookingFor, setCardLookingFor] = useState('');
  const [cardNote, setCardNote] = useState('');
  const [cardWhatsappReady, setCardWhatsappReady] = useState(true);

  // New Squad modal state
  const [newSquadModalOpen, setNewSquadModalOpen] = useState(false);
  const [newSquadName, setNewSquadName] = useState('');
  const [newSquadEventId, setNewSquadEventId] = useState(events[0]?.id || 'evt-deccan-hack');
  const [newSquadTargetSize, setNewSquadTargetSize] = useState('4');
  const [newSquadRoles, setNewSquadRoles] = useState('');

  // Team-up Call modal state
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [callMoreOpen, setCallMoreOpen] = useState(true);
  const [callEventIds, setCallEventIds] = useState<string[]>(
    events[0]?.id ? [events[0].id] : []
  );
  const [callNeeded, setCallNeeded] = useState('2');
  const [callPrefCollege, setCallPrefCollege] = useState('Any');
  const [callPrefYear, setCallPrefYear] = useState('Any');
  const [callSelectedRoles, setCallSelectedRoles] = useState<string[]>([]);
  const [callPrefSkills, setCallPrefSkills] = useState('');
  const [callPrefAreas, setCallPrefAreas] = useState<string[]>([]);
  const [callPrefLanguages, setCallPrefLanguages] = useState<SupportedLanguage[]>([]);
  const [callGenderPref, setCallGenderPref] = useState<CallGenderFilter>('any');
  const [callAudienceMode, setCallAudienceMode] = useState<'active_only' | 'all_matching'>('all_matching');
  const [callNote, setCallNote] = useState('');
  const [callEstimatedCount, setCallEstimatedCount] = useState<number | 'fewer than 3' | null>(null);
  const [callEstimateError, setCallEstimateError] = useState(false);
  const [callEstimateRetryTick, setCallEstimateRetryTick] = useState(0);
  const [callEstimating, setCallEstimating] = useState(false);
  const [callFormError, setCallFormError] = useState<string | null>(null);
  const [inviteEventByResp, setInviteEventByResp] = useState<Record<string, string>>({});

  // Squad workspace progressive disclosure toggles
  const [manageMemberId, setManageMemberId] = useState<string | null>(null);
  const [waOpen, setWaOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editSquadName, setEditSquadName] = useState('');
  const [editSquadSize, setEditSquadSize] = useState('4');
  const [editSquadRoles, setEditSquadRoles] = useState('');
  const [waNumberInput, setWaNumberInput] = useState(student.phoneNumber || '');
  const [waGroupInput, setWaGroupInput] = useState('');

  // Stable callback refs so effects never re-run spuriously on parent re-render
  const estimateRef = useRef(onEstimateTeamUpCall);
  useEffect(() => {
    estimateRef.current = onEstimateTeamUpCall;
  }, [onEstimateTeamUpCall]);

  const clearDraftRef = useRef(onClearDraftCallEventId);
  useEffect(() => {
    clearDraftRef.current = onClearDraftCallEventId;
  }, [onClearDraftCallEventId]);

  useEffect(() => {
    if (!draftCallEventId) return;
    setCallEventIds([draftCallEventId]);
    setCallFormError(null);
    setCallMoreOpen(true);
    setCallModalOpen(true);
    clearDraftRef.current();
  }, [draftCallEventId]);

  useEffect(() => {
    if (!activeRoom) return;
    if (activeRoom.scope === 'conversation') {
      setSection('activity');
      setActivityView('chats');
    } else {
      setSection('squads');
      setSquadTab('chat');
      setManageMemberId(null);
      setWaOpen(false);
      setSettingsOpen(false);
    }
  }, [activeRoom]);

  // Escape key closes whichever modal is open
  const anyModalOpen = Boolean(
    connectTarget || joinTarget || callModalOpen || cardModalOpen || newSquadModalOpen
  );
  useEffect(() => {
    if (!anyModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setConnectTarget(null);
        setJoinTarget(null);
        setCallModalOpen(false);
        setCardModalOpen(false);
        setNewSquadModalOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [anyModalOpen]);

  // Live audience count preview for Team-up Call modal
  useEffect(() => {
    if (!callModalOpen) return;
    if (callEventIds.length === 0) {
      setCallEstimating(false);
      setCallEstimateError(false);
      setCallEstimatedCount(null);
      return;
    }
    let cancelled = false;
    setCallEstimating(true);
    setCallEstimateError(false);
    const timer = window.setTimeout(async () => {
      try {
        const count = await estimateRef.current({
          preferredCollege: callPrefCollege,
          preferredYear: callPrefYear,
          preferredSkills: callPrefSkills
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          rolesNeeded: callSelectedRoles,
          preferredAreas: callPrefAreas,
          preferredLanguages: callPrefLanguages,
          genderPreference: callGenderPref,
          audienceMode: callAudienceMode,
        });
        if (!cancelled) {
          setCallEstimatedCount(count);
          setCallEstimateError(false);
        }
      } catch {
        if (!cancelled) {
          setCallEstimatedCount(null);
          setCallEstimateError(true);
        }
      } finally {
        if (!cancelled) setCallEstimating(false);
      }
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    callModalOpen,
    callEventIds.length,
    callPrefCollege,
    callPrefYear,
    callPrefSkills,
    callSelectedRoles,
    callPrefAreas,
    callPrefLanguages,
    callGenderPref,
    callAudienceMode,
    callEstimateRetryTick,
  ]);

  const activeConversation = useMemo(() => {
    if (activeRoom?.scope !== 'conversation') return null;
    return conversations.find((c) => c.id === activeRoom.id) || null;
  }, [activeRoom, conversations]);

  const activeSquad = useMemo(() => {
    if (activeRoom?.scope !== 'squad') return null;
    return mySquads.find((s) => s.id === activeRoom.id) || null;
  }, [activeRoom, mySquads]);

  useEffect(() => {
    if (activeConversation) {
      setConfirmSquadName(
        activeConversation.proposedSquadName ||
          `${activeConversation.eventTitle.split(' ')[0]} Builders`
      );
      setConfirmTargetSize(String(activeConversation.proposedTargetSize || 4));
    }
  }, [activeConversation]);

  useEffect(() => {
    if (activeSquad) {
      setEditSquadName(activeSquad.name);
      setEditSquadSize(String(activeSquad.targetSize));
      setEditSquadRoles((activeSquad.requiredRoles || []).join(', '));
      setWaGroupInput(activeSquad.whatsappGroupUrl || '');
      setWaNumberInput(student.phoneNumber || '');
    }
  }, [activeSquad, student.phoneNumber]);

  const threadMessages = useMemo(() => {
    const roomId = activeConversation?.id || activeSquad?.id;
    if (!roomId) return [];
    return chatMessages
      .filter((m) => m.roomId === roomId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }, [chatMessages, activeConversation, activeSquad]);

  useEffect(() => {
    if (activeConversation || (activeSquad && squadTab === 'chat')) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [threadMessages.length, activeConversation, activeSquad, squadTab]);

  // Derived Activity Collections
  const incomingCalls = useMemo(
    () =>
      teamUpCalls.filter(
        (c) =>
          c.creatorId !== student.id &&
          c.status === 'active' &&
          c.recipientUserIds.includes(student.id) &&
          !c.responses.some((r) => r.userId === student.id && r.status === 'dismissed')
      ),
    [teamUpCalls, student.id]
  );

  const incomingConnectionRequests = useMemo(
    () =>
      connectionRequests.filter(
        (r) => r.toUserId === student.id && r.status === 'pending'
      ),
    [connectionRequests, student.id]
  );

  const incomingJoinRequests = useMemo(
    () =>
      joinRequests.filter(
        (r) => r.squadOwnerId === student.id && r.status === 'pending'
      ),
    [joinRequests, student.id]
  );

  const outgoingCalls = useMemo(
    () => teamUpCalls.filter((c) => c.creatorId === student.id),
    [teamUpCalls, student.id]
  );

  const outgoingConnectionRequests = useMemo(
    () => connectionRequests.filter((r) => r.fromUserId === student.id),
    [connectionRequests, student.id]
  );

  const outgoingJoinRequests = useMemo(
    () => joinRequests.filter((r) => r.applicantId === student.id),
    [joinRequests, student.id]
  );

  const activeConversations = useMemo(
    () =>
      conversations
        .filter((c) => c.status !== 'archived')
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [conversations]
  );

  const incomingTotal =
    incomingCalls.length +
    incomingConnectionRequests.length +
    incomingJoinRequests.length;

  const outgoingTotal =
    outgoingCalls.length +
    outgoingConnectionRequests.length +
    outgoingJoinRequests.length;

  const pendingActivityCount =
    incomingCalls.filter(
      (c) => !c.responses.some((r) => r.userId === student.id)
    ).length +
    incomingConnectionRequests.length +
    incomingJoinRequests.length +
    activeConversations.filter(
      (c) =>
        c.status === 'active' &&
        c.confirmedByUserIds.length === 1 &&
        !c.confirmedByUserIds.includes(student.id)
    ).length;

  const availableEvents = useMemo(
    () => events.filter((e) => e.status === 'published'),
    [events]
  );

  const collegeFilterOptions = useMemo(() => {
    const names = new Set<string>();
    for (const p of partnerPosts) {
      if (p.collegeShortName) names.add(p.collegeShortName);
    }
    for (const sq of publicSquads) {
      if (sq.ownerCollege) names.add(sq.ownerCollege);
    }
    for (const c of colleges) {
      if (c.shortName) names.add(c.shortName);
    }
    return Array.from(names).sort();
  }, [partnerPosts, publicSquads, colleges]);

  const activeFilterCount =
    (filterCollege !== 'all' ? 1 : 0) +
    (filterYear !== 'all' && discoverView === 'people' ? 1 : 0) +
    (filterSkill.trim() ? 1 : 0);

  const filteredPeople = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const skillQ = filterSkill.trim().toLowerCase();
    return partnerPosts.filter((p) => {
      if (filterEventId !== 'all' && p.eventId !== filterEventId) return false;
      if (
        filterCollege !== 'all' &&
        p.collegeShortName.toLowerCase() !== filterCollege.toLowerCase()
      ) {
        return false;
      }
      if (filterYear !== 'all' && p.year !== filterYear) return false;
      if (skillQ) {
        const hay = `${p.roleSkill} ${p.lookingFor} ${(p.skills || []).join(' ')}`.toLowerCase();
        if (!hay.includes(skillQ)) return false;
      }
      if (q) {
        const hay = `${p.userName} ${p.collegeShortName} ${p.branch} ${p.eventTitle} ${p.roleSkill} ${p.lookingFor} ${p.note}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [partnerPosts, filterEventId, filterCollege, filterYear, filterSkill, searchQuery]);

  const filteredPublicSquads = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const skillQ = filterSkill.trim().toLowerCase();
    return publicSquads.filter((sq) => {
      if (filterEventId !== 'all' && sq.eventId !== filterEventId) return false;
      if (
        filterCollege !== 'all' &&
        sq.ownerCollege.toLowerCase() !== filterCollege.toLowerCase()
      ) {
        return false;
      }
      if (skillQ) {
        const hay = `${sq.requiredRoles.join(' ')} ${sq.memberPreviews.map((m) => m.roleSkill).join(' ')}`.toLowerCase();
        if (!hay.includes(skillQ)) return false;
      }
      if (q) {
        const hay = `${sq.name} ${sq.eventTitle} ${sq.ownerName} ${sq.ownerCollege} ${sq.requiredRoles.join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [publicSquads, filterEventId, filterCollege, filterSkill, searchQuery]);

  const visibleMySquads = useMemo(
    () =>
      mySquads.filter((sq) => (showArchivedSquads ? Boolean(sq.archivedAt) : !sq.archivedAt)),
    [mySquads, showArchivedSquads]
  );

  const archivedSquadCount = useMemo(
    () => mySquads.filter((sq) => Boolean(sq.archivedAt)).length,
    [mySquads]
  );

  async function runAction(id: string, fn: () => Promise<void>, successNote?: string) {
    setBusyId(id);
    setActionError(null);
    setActionMessage(null);
    try {
      await fn();
      if (successNote) setActionMessage(successNote);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action could not be completed.');
    } finally {
      setBusyId(null);
    }
  }

  function switchSection(next: MainSection) {
    setSection(next);
    setActionError(null);
    setActionMessage(null);
    if (next !== 'activity' && activeRoom?.scope === 'conversation') {
      onSelectRoom(null);
    }
    if (next !== 'squads' && activeRoom?.scope === 'squad') {
      onSelectRoom(null);
    }
  }

  const callEligibleEvents = useMemo(() => {
    const nowMs = Date.now();
    return availableEvents.filter((e) => {
      const deadlineMs = Date.parse(e.regDeadline || e.endAt);
      return Number.isNaN(deadlineMs) || deadlineMs >= nowMs;
    });
  }, [availableEvents]);

  const studentCollegeShort = useMemo(
    () =>
      colleges.find((c) => c.id === student.collegeId)?.shortName ||
      student.customCollegeName ||
      'Campus',
    [colleges, student.collegeId, student.customCollegeName]
  );

  function openCreateCallModal() {
    const defaultEvt = callEligibleEvents[0] || availableEvents[0];
    setCallEventIds(defaultEvt ? [defaultEvt.id] : []);
    setCallNeeded('2');
    setCallPrefCollege('Any');
    setCallPrefYear('Any');
    setCallSelectedRoles([]);
    setCallPrefSkills('');
    setCallPrefAreas([]);
    setCallPrefLanguages([]);
    setCallGenderPref('any');
    setCallAudienceMode('all_matching');
    setCallNote('');
    setCallFormError(null);
    setCallEstimateError(false);
    setCallMoreOpen(true);
    setCallModalOpen(true);
  }

  function openPostCardModal() {
    setCardEventId(availableEvents[0]?.id || 'evt-deccan-hack');
    setCardRoleSkill((student.skills || []).slice(0, 3).join(', '));
    setCardModalOpen(true);
  }

  function openNewSquadModal() {
    const evt = availableEvents[0];
    setNewSquadEventId(evt?.id || 'evt-deccan-hack');
    setNewSquadName(evt ? `${evt.title.split(' ')[0]} Builders` : 'Campus Squad');
    setNewSquadModalOpen(true);
  }

  function getSnapshotForSquad(squad: Squad): SquadRegistrationSnapshot | null {
    return (
      registrationSnapshots.find(
        (s) => s.squadId === squad.id && s.eventId === squad.eventId
      ) || null
    );
  }

  function renderMessagesList() {
    return (
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 bg-[var(--paper)] min-h-[260px] max-h-[440px]">
        {threadMessages.map((msg) => {
          const isMe = msg.senderId === student.id;
          if (msg.kind === 'system') {
            return (
              <div key={msg.id} className="text-center py-1">
                <span className="inline-block px-3 py-1 bg-[var(--paper-raised)] border border-[var(--border-warm)] rounded-[8px] text-[11px] text-[var(--ink-2)]">
                  {msg.body}
                </span>
              </div>
            );
          }

          if (msg.kind === 'whatsapp_contact' || msg.kind === 'whatsapp_group') {
            return (
              <div
                key={msg.id}
                className="p-3.5 bg-[var(--olive-tint)] border border-[var(--olive-border)] rounded-[10px] space-y-2 max-w-md"
              >
                <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-[var(--olive)]">
                  <span>{msg.senderName} · WhatsApp Handoff</span>
                  <span className="font-mono text-[var(--ink-2)]">
                    {formatIstTime(msg.createdAt)}
                  </span>
                </div>
                <p className="text-xs text-[var(--ink)] leading-relaxed">{msg.body}</p>
                {msg.whatsappUrl && (
                  <a
                    href={msg.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="paper-btn-ink min-h-[34px] px-3 py-1 text-xs inline-flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>
                      {msg.kind === 'whatsapp_group' ? 'Open WhatsApp Group' : 'Message on WhatsApp'}
                    </span>
                  </a>
                )}
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
            >
              <div className="text-[11px] text-[var(--ink-2)] mb-1 flex items-center gap-1.5">
                <span className="font-semibold text-[var(--ink)]">
                  {isMe ? 'You' : msg.senderName}
                </span>
                <span className="font-mono">{formatIstTime(msg.createdAt)}</span>
              </div>
              <div
                className={`px-3.5 py-2 rounded-[10px] text-sm max-w-[85%] sm:max-w-[75%] border ${
                  isMe
                    ? 'bg-[var(--ink)] text-[var(--on-ink)] border-[var(--ink)]'
                    : 'bg-[var(--paper-raised)] text-[var(--ink)] border-[var(--border-warm)]'
                }`}
              >
                {msg.body}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Compact Header with 1 Primary Action */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-[var(--border-warm)]">
        <div className="space-y-1">
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-[-0.04em] leading-tight text-[var(--ink)]">
            Campus Teams
          </h1>
          <p className="text-xs sm:text-sm text-[var(--ink-2)] max-w-xl">
            Find teammates for events, chat briefly to align, then confirm together to form your squad.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateCallModal}
          className="paper-btn-crimson min-h-[42px] px-4 py-2 text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <Bell className="w-4 h-4" />
          <span>Team-up Call</span>
        </button>
      </header>

      {/* Primary 3-Section Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="paper-segment">
          <button
            type="button"
            aria-pressed={section === 'discover'}
            onClick={() => switchSection('discover')}
            className="paper-segment-btn min-h-[40px] px-4 py-2 text-xs sm:text-sm whitespace-nowrap"
          >
            Discover
          </button>
          <button
            type="button"
            aria-pressed={section === 'activity'}
            onClick={() => switchSection('activity')}
            className="paper-segment-btn min-h-[40px] px-4 py-2 text-xs sm:text-sm whitespace-nowrap inline-flex items-center gap-2"
          >
            <span>Activity</span>
            {pendingActivityCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-[var(--crimson)] text-[var(--on-crimson)] tabular-nums">
                {pendingActivityCount}
              </span>
            )}
          </button>
          <button
            type="button"
            aria-pressed={section === 'squads'}
            onClick={() => switchSection('squads')}
            className="paper-segment-btn min-h-[40px] px-4 py-2 text-xs sm:text-sm whitespace-nowrap tabular-nums"
          >
            My Squads ({mySquads.filter((s) => !s.archivedAt).length})
          </button>
        </div>

        {student.teamDiscoveryEnabled === false && (
          <div className="text-xs font-medium text-[var(--amber-ink)] bg-[var(--amber-tint)] border border-[var(--amber-border)] px-3 py-1.5 rounded-[8px]">
            Discovery paused in Me settings.
          </div>
        )}
      </div>

      {actionError && (
        <div className="p-3.5 rounded-[10px] border border-[var(--crimson)] bg-[var(--crimson-tint)] text-xs font-medium text-[var(--crimson)] flex items-center justify-between gap-3">
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            aria-label="Dismiss error"
            className="p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {actionMessage && (
        <div className="p-3.5 rounded-[10px] border border-[var(--olive-border)] bg-[var(--olive-tint)] text-xs font-medium text-[var(--ink)] flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-[var(--olive)] shrink-0" />
            <span>{actionMessage}</span>
          </span>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            aria-label="Dismiss notice"
            className="p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SECTION A: DISCOVER (People & Open Recruiting Squads)                  */}
      {/* ===================================================================== */}
      {section === 'discover' && (
        <div className="space-y-4">
          {/* Streamlined Single-Row Toolbar + Expandable Extra Filters */}
          <div className="paper-card p-3.5 sm:p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="paper-segment shrink-0">
                <button
                  type="button"
                  aria-pressed={discoverView === 'people'}
                  onClick={() => setDiscoverView('people')}
                  className="paper-segment-btn min-h-[36px] px-3.5 py-1.5 text-xs whitespace-nowrap"
                >
                  People ({filteredPeople.length})
                </button>
                <button
                  type="button"
                  aria-pressed={discoverView === 'squads'}
                  onClick={() => setDiscoverView('squads')}
                  className="paper-segment-btn min-h-[36px] px-3.5 py-1.5 text-xs whitespace-nowrap"
                >
                  Squads ({filteredPublicSquads.length})
                </button>
              </div>

              <div className="relative flex-1 min-w-[180px]">
                <Search className="w-3.5 h-3.5 text-[var(--ink-2)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    discoverView === 'people'
                      ? 'Search students, skills, or events...'
                      : 'Search squads, roles, or events...'
                  }
                  className="paper-input w-full min-h-[38px] pl-8 pr-3 py-1.5 text-xs"
                />
              </div>

              <select
                value={filterEventId}
                onChange={(e) => setFilterEventId(e.target.value)}
                aria-label="Filter by event"
                className="paper-input min-h-[38px] px-2.5 py-1.5 text-xs max-w-[200px]"
              >
                <option value="all">All Events</option>
                {availableEvents.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title}
                  </option>
                ))}
              </select>

              <button
                type="button"
                aria-expanded={filtersOpen}
                onClick={() => setFiltersOpen((v) => !v)}
                className={`min-h-[38px] px-3 py-1.5 text-xs inline-flex items-center gap-1.5 whitespace-nowrap ${
                  activeFilterCount > 0 ? 'paper-btn-tint' : 'paper-btn-secondary'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}</span>
              </button>

              <button
                type="button"
                onClick={discoverView === 'people' ? openPostCardModal : openNewSquadModal}
                className="paper-btn-ink min-h-[38px] px-3.5 py-1.5 text-xs inline-flex items-center gap-1.5 whitespace-nowrap ml-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{discoverView === 'people' ? 'Post Availability' : 'New Squad'}</span>
              </button>
            </div>

            {filtersOpen && (
              <div className="pt-3 border-t border-[var(--border-warm)] grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 items-center">
                <select
                  value={filterCollege}
                  onChange={(e) => setFilterCollege(e.target.value)}
                  aria-label="Filter by college"
                  className="paper-input min-h-[38px] px-2.5 py-1.5 text-xs"
                >
                  <option value="all">All Colleges</option>
                  {collegeFilterOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                {discoverView === 'people' && (
                  <select
                    value={filterYear}
                    onChange={(e) => setFilterYear(e.target.value)}
                    aria-label="Filter by academic year"
                    className="paper-input min-h-[38px] px-2.5 py-1.5 text-xs"
                  >
                    <option value="all">All Years</option>
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                    <option value="PG / PhD">PG / PhD</option>
                  </select>
                )}

                <input
                  type="text"
                  value={filterSkill}
                  onChange={(e) => setFilterSkill(e.target.value)}
                  placeholder="Skill (e.g. UI/UX)"
                  className="paper-input min-h-[38px] px-2.5 py-1.5 text-xs"
                />

                {(filterEventId !== 'all' ||
                  filterCollege !== 'all' ||
                  filterYear !== 'all' ||
                  filterSkill ||
                  searchQuery) && (
                  <button
                    type="button"
                    onClick={() => {
                      setFilterEventId('all');
                      setFilterCollege('all');
                      setFilterYear('all');
                      setFilterSkill('');
                      setSearchQuery('');
                    }}
                    className="paper-btn-secondary min-h-[38px] px-3 py-1.5 text-xs text-[var(--crimson)]"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            )}
          </div>

          {/* People View */}
          {discoverView === 'people' ? (
            filteredPeople.length === 0 ? (
              <div className="paper-card p-10 text-center space-y-3">
                <Users className="w-8 h-8 text-[var(--crimson)] mx-auto" />
                <h2 className="font-display text-lg font-extrabold text-[var(--ink)]">
                  No Matching Students Found
                </h2>
                <p className="text-xs text-[var(--ink-2)] max-w-md mx-auto">
                  Adjust your filters or publish a Team-up Call to reach matching students directly.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredPeople.map((post) => {
                  const isMine = post.userId === student.id;
                  const existingConv = activeConversations.find(
                    (c) =>
                      c.eventId === post.eventId &&
                      c.participantIds.includes(post.userId)
                  );
                  const pendingReq = connectionRequests.find(
                    (r) =>
                      r.eventId === post.eventId &&
                      r.status === 'pending' &&
                      ((r.fromUserId === student.id && r.toUserId === post.userId) ||
                        (r.fromUserId === post.userId && r.toUserId === student.id))
                  );

                  return (
                    <article
                      key={post.id}
                      className="paper-card p-5 flex flex-col justify-between gap-4"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-[10px] bg-[var(--ink)] text-[var(--on-ink)] font-display font-bold text-xs flex items-center justify-center shrink-0">
                              {getInitials(post.userName)}
                            </div>
                            <div className="min-w-0">
                              <h2 className="font-display font-extrabold text-base text-[var(--ink)] truncate">
                                {post.userName} {isMine ? '(You)' : ''}
                              </h2>
                              <div className="text-xs text-[var(--ink-2)] truncate">
                                {post.collegeShortName} · {post.branch} · {post.year}
                              </div>
                            </div>
                          </div>
                          <span className="text-[11px] font-mono font-semibold text-[var(--crimson)] shrink-0 tabular-nums">
                            +{post.teamSlotsNeeded}
                          </span>
                        </div>

                        <div className="text-xs">
                          <span className="text-[var(--ink-2)]">For </span>
                          <button
                            type="button"
                            onClick={() => onOpenEvent(post.eventId)}
                            className="font-bold text-[var(--crimson)] hover:underline text-left"
                          >
                            {post.eventTitle}
                          </button>
                        </div>

                        <div className="space-y-1 text-xs">
                          <div>
                            <span className="text-[var(--ink-2)]">Brings: </span>
                            <strong className="text-[var(--ink)]">{post.roleSkill}</strong>
                          </div>
                          <div>
                            <span className="text-[var(--ink-2)]">Looking for: </span>
                            <span className="text-[var(--ink)] font-medium">
                              {post.lookingFor}
                            </span>
                          </div>
                          {post.note && (
                            <p className="text-[var(--ink-2)] leading-relaxed pt-1 line-clamp-2">
                              {post.note}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-[var(--border-warm)] flex items-center justify-end gap-2">
                        {isMine ? (
                          <button
                            type="button"
                            disabled={busyId === post.id}
                            onClick={() =>
                              runAction(
                                post.id,
                                () => onDeletePartnerRequest(post.id),
                                'Availability post removed.'
                              )
                            }
                            className="paper-btn-secondary min-h-[38px] px-3.5 py-1.5 text-xs text-[var(--crimson)] inline-flex items-center gap-1.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        ) : existingConv ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSection('activity');
                              setActivityView('chats');
                              onSelectRoom({ scope: 'conversation', id: existingConv.id });
                            }}
                            className="paper-btn-ink min-h-[38px] px-4 py-1.5 text-xs inline-flex items-center gap-1.5"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>Open Chat</span>
                          </button>
                        ) : pendingReq ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSection('activity');
                              setActivityView('requests');
                            }}
                            className="paper-btn-tint min-h-[38px] px-3.5 py-1.5 text-xs text-[var(--ink)]"
                          >
                            {pendingReq.fromUserId === student.id ? 'Request Sent' : 'Respond in Activity'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setConnectTarget(post);
                              setConnectNote('');
                            }}
                            className="paper-btn-primary min-h-[38px] px-4 py-1.5 text-xs inline-flex items-center gap-1.5"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Connect</span>
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )
          ) : /* Squads View */ filteredPublicSquads.length === 0 ? (
            <div className="paper-card p-10 text-center space-y-3">
              <Users className="w-8 h-8 text-[var(--crimson)] mx-auto" />
              <h2 className="font-display text-lg font-extrabold text-[var(--ink)]">
                No Open Recruiting Squads Match
              </h2>
              <p className="text-xs text-[var(--ink-2)] max-w-md mx-auto">
                Start a new squad yourself or broaden your filters to see more open teams.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredPublicSquads.map((sq) => {
                const alreadyMember = mySquads.some((m) => m.id === sq.id);
                const pendingJoin = outgoingJoinRequests.find(
                  (r) => r.squadId === sq.id && r.status === 'pending'
                );

                return (
                  <article
                    key={sq.id}
                    className="paper-card p-5 flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h2 className="font-display font-extrabold text-base text-[var(--ink)] truncate">
                            {sq.name}
                          </h2>
                          <div className="text-xs text-[var(--ink-2)]">
                            {sq.ownerName} ({sq.ownerCollege})
                          </div>
                        </div>
                        <span className="font-mono text-xs font-bold text-[var(--crimson)] tabular-nums shrink-0">
                          {sq.memberCount}/{sq.targetSize} seats
                        </span>
                      </div>

                      <div className="text-xs">
                        <span className="text-[var(--ink-2)]">For </span>
                        <button
                          type="button"
                          onClick={() => onOpenEvent(sq.eventId)}
                          className="font-bold text-[var(--crimson)] hover:underline text-left"
                        >
                          {sq.eventTitle}
                        </button>
                      </div>

                      <div className="space-y-1 text-xs">
                        <div>
                          <span className="text-[var(--ink-2)]">Open: </span>
                          <strong className="text-[var(--ink)]">
                            {sq.openSeats} {sq.openSeats === 1 ? 'seat' : 'seats'}
                          </strong>
                          {' · '}
                          <span className="text-[var(--ink)] font-medium">
                            {sq.requiredRoles.length > 0
                              ? sq.requiredRoles.join(', ')
                              : 'All-rounders'}
                          </span>
                        </div>
                        <div className="text-[11px] text-[var(--ink-2)] truncate">
                          Roster: {sq.memberPreviews.map((m) => m.name.split(' ')[0]).join(', ')}
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[var(--border-warm)] flex items-center justify-end gap-2">
                      {alreadyMember ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSection('squads');
                            onSelectRoom({ scope: 'squad', id: sq.id });
                          }}
                          className="paper-btn-ink min-h-[38px] px-4 py-1.5 text-xs"
                        >
                          Open Squad
                        </button>
                      ) : pendingJoin ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSection('activity');
                            setActivityView('requests');
                          }}
                          className="paper-btn-tint min-h-[38px] px-3.5 py-1.5 text-xs text-[var(--ink)]"
                        >
                          Pending Review
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setJoinTarget(sq);
                            setJoinRole(sq.requiredRoles[0] || (student.skills || [])[0] || student.branch);
                            setJoinNote('');
                          }}
                          className="paper-btn-primary min-h-[38px] px-4 py-1.5 text-xs inline-flex items-center gap-1.5"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Request to Join</span>
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* SECTION B: ACTIVITY (2 Clean Tabs: Requests & Calls | Chats)          */}
      {/* ===================================================================== */}
      {section === 'activity' && (
        <div className="space-y-4">
          {!activeConversation && (
            <div className="paper-segment">
              <button
                type="button"
                aria-pressed={activityView === 'requests'}
                onClick={() => setActivityView('requests')}
                className="paper-segment-btn min-h-[38px] px-4 py-1.5 text-xs whitespace-nowrap"
              >
                Requests &amp; Calls ({incomingTotal + outgoingTotal})
              </button>
              <button
                type="button"
                aria-pressed={activityView === 'chats'}
                onClick={() => setActivityView('chats')}
                className="paper-segment-btn min-h-[38px] px-4 py-1.5 text-xs whitespace-nowrap"
              >
                Chats ({activeConversations.length})
              </button>
            </div>
          )}

          {/* Focused 1-on-1 Conversation Thread View */}
          {activeConversation ? (
            <section className="paper-card overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-[var(--border-warm)] bg-[var(--paper-raised)] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => onSelectRoom(null)}
                    className="paper-btn-secondary min-h-[36px] px-3 py-1.5 text-xs inline-flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                  <div className="min-w-0">
                    <h2 className="font-display font-extrabold text-base sm:text-lg text-[var(--ink)] truncate">
                      {activeConversation.participants
                        .filter((p) => p.userId !== student.id)
                        .map((p) => `${p.name} (${p.collegeShortName})`)
                        .join(', ') || 'Conversation'}
                    </h2>
                    <button
                      type="button"
                      onClick={() => onOpenEvent(activeConversation.eventId)}
                      className="text-xs text-[var(--crimson)] hover:underline truncate block"
                    >
                      {activeConversation.eventTitle}
                    </button>
                  </div>
                </div>

                {activeConversation.status !== 'archived' && (
                  <button
                    type="button"
                    disabled={busyId === activeConversation.id}
                    onClick={() =>
                      runAction(
                        activeConversation.id,
                        async () => {
                          await onArchiveConversation(activeConversation.id);
                          onSelectRoom(null);
                        },
                        'Conversation archived.'
                      )
                    }
                    className="paper-btn-secondary min-h-[34px] px-3 py-1 text-xs inline-flex items-center gap-1"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>Archive</span>
                  </button>
                )}
              </div>

              {/* Mutual Consent Banner to Form Squad */}
              <div className="p-4 bg-[var(--feel-tint)] border-b border-[var(--border-warm)]">
                {activeConversation.status === 'confirmed_to_squad' &&
                activeConversation.createdSquadId ? (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs font-medium text-[var(--ink)] inline-flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[var(--olive)] shrink-0" />
                      <span>
                        Squad &ldquo;<strong>{activeConversation.proposedSquadName}</strong>&rdquo; is active.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSection('squads');
                        onSelectRoom({
                          scope: 'squad',
                          id: activeConversation.createdSquadId!,
                        });
                      }}
                      className="paper-btn-ink min-h-[34px] px-3.5 py-1 text-xs"
                    >
                      Open Squad
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="font-semibold text-[var(--ink)]">
                        {activeConversation.confirmedByUserIds.includes(student.id)
                          ? `You confirmed "${activeConversation.proposedSquadName || 'Squad'}". Waiting for teammate.`
                          : activeConversation.confirmedByUserIds.length > 0
                            ? `Teammate proposed "${activeConversation.proposedSquadName}" (${activeConversation.proposedTargetSize || 4} seats).`
                            : 'Ready to team up? Mutually confirm to create your squad.'}
                      </div>
                      <span className="font-mono text-[11px] text-[var(--crimson)]">
                        {activeConversation.confirmedByUserIds.length}/
                        {activeConversation.participantIds.length} confirmed
                      </span>
                    </div>

                    {!activeConversation.confirmedByUserIds.includes(student.id) && (
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="text"
                          value={confirmSquadName}
                          onChange={(e) => setConfirmSquadName(e.target.value)}
                          placeholder="Squad name"
                          disabled={activeConversation.confirmedByUserIds.length > 0}
                          className="paper-input min-h-[36px] px-3 py-1 text-xs flex-1 min-w-[150px]"
                        />
                        <select
                          value={confirmTargetSize}
                          onChange={(e) => setConfirmTargetSize(e.target.value)}
                          disabled={activeConversation.confirmedByUserIds.length > 0}
                          className="paper-input min-h-[36px] px-2.5 py-1 text-xs"
                        >
                          <option value="2">2 seats</option>
                          <option value="3">3 seats</option>
                          <option value="4">4 seats</option>
                          <option value="5">5 seats</option>
                          <option value="6">6 seats</option>
                        </select>
                        <button
                          type="button"
                          disabled={busyId === `confirm-${activeConversation.id}`}
                          onClick={() =>
                            runAction(
                              `confirm-${activeConversation.id}`,
                              () =>
                                onConfirmConversationToSquad(activeConversation.id, {
                                  squadName: confirmSquadName.trim() || 'Campus Squad',
                                  targetSize: Number(confirmTargetSize) || 4,
                                }),
                              'Confirmation recorded.'
                            )
                          }
                          className="paper-btn-primary min-h-[36px] px-4 py-1.5 text-xs inline-flex items-center gap-1.5"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>
                            {activeConversation.confirmedByUserIds.length > 0
                              ? 'Confirm Squad'
                              : 'Form Squad'}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {renderMessagesList()}

              {activeConversation.status !== 'archived' && (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!msgDraft.trim() || sendingMsg) return;
                    setSendingMsg(true);
                    const text = msgDraft;
                    setMsgDraft('');
                    try {
                      await onSendConversationMessage(activeConversation.id, text);
                    } finally {
                      setSendingMsg(false);
                    }
                  }}
                  className="p-3.5 border-t border-[var(--border-warm)] bg-[var(--paper-raised)] flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={msgDraft}
                    onChange={(e) => setMsgDraft(e.target.value)}
                    placeholder="Introduce yourself or share ideas..."
                    className="paper-input flex-1 min-h-[40px] px-3 py-2 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={sendingMsg || !msgDraft.trim()}
                    className="paper-btn-primary min-h-[40px] px-4 py-2 text-xs inline-flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </form>
              )}
            </section>
          ) : activityView === 'requests' ? (
            incomingTotal === 0 && outgoingTotal === 0 ? (
              <div className="paper-card p-10 text-center space-y-3">
                <Bell className="w-8 h-8 text-[var(--crimson)] mx-auto" />
                <h2 className="font-display text-lg font-extrabold text-[var(--ink)]">
                  All Caught Up
                </h2>
                <p className="text-xs text-[var(--ink-2)] max-w-md mx-auto">
                  Team-up Calls, connection requests, and squad join requests will show up here when active.
                </p>
                <div className="pt-1 flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => switchSection('discover')}
                    className="paper-btn-primary min-h-[38px] px-4 py-1.5 text-xs"
                  >
                    Browse Discover
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Unified Needs Your Action */}
                {incomingTotal > 0 && (
                  <section className="paper-card p-5 space-y-3">
                    <h2 className="font-display text-base font-extrabold text-[var(--ink)]">
                      Needs Your Action ({incomingTotal})
                    </h2>

                    <div className="divide-y divide-[var(--border-warm)]">
                      {incomingCalls.map((call) => {
                        const myResp = call.responses.find((r) => r.userId === student.id);
                        const targetedEvents =
                          Array.isArray(call.events) && call.events.length > 0
                            ? call.events
                            : [{ id: call.eventId, title: call.eventTitle, type: call.eventType }];
                        return (
                          <div
                            key={call.id}
                            className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                          >
                            <div className="space-y-1.5 min-w-0">
                              <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--crimson)]">
                                Team-up Call · {call.creatorName} · {call.creatorCollege} · {call.creatorBranch} · {call.creatorYear}
                              </div>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                <span className="text-xs font-bold text-[var(--ink)]">
                                  Needs {call.teammatesNeeded} teammate{call.teammatesNeeded === 1 ? '' : 's'}
                                </span>
                                <span className="text-[11px] font-mono text-[var(--ink-2)]">
                                  Expires {formatIstDate(call.expiresAt)}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {targetedEvents.map((ev) => (
                                  <button
                                    key={ev.id}
                                    type="button"
                                    onClick={() => onOpenEvent(ev.id)}
                                    className="px-2 py-1 text-xs font-semibold border border-[var(--border-warm)] bg-[var(--paper)] text-[var(--ink)] hover:border-[var(--crimson)] hover:text-[var(--crimson)] text-left"
                                  >
                                    {ev.title} ({ev.type})
                                    {ev.regDeadline ? ` · Closes ${formatIstDate(ev.regDeadline)}` : ''}
                                  </button>
                                ))}
                              </div>
                              {(call.rolesNeeded.length > 0 || call.preferredSkills.length > 0) && (
                                <div className="text-xs text-[var(--ink)]">
                                  {call.rolesNeeded.length > 0 && (
                                    <span>
                                      <strong className="font-semibold">Roles:</strong> {call.rolesNeeded.join(', ')}
                                    </span>
                                  )}
                                  {call.rolesNeeded.length > 0 && call.preferredSkills.length > 0 && ' · '}
                                  {call.preferredSkills.length > 0 && (
                                    <span>
                                      <strong className="font-semibold">Skills:</strong> {call.preferredSkills.join(', ')}
                                    </span>
                                  )}
                                </div>
                              )}
                              {call.note && (
                                <p className="text-xs text-[var(--ink-2)]">
                                  &ldquo;{call.note}&rdquo;
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0 sm:pt-1">
                              {myResp?.status === 'invited' && myResp.conversationId ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActivityView('chats');
                                    onSelectRoom({
                                      scope: 'conversation',
                                      id: myResp.conversationId!,
                                    });
                                  }}
                                  className="paper-btn-ink min-h-[36px] px-3.5 py-1.5 text-xs"
                                >
                                  Open Chat
                                </button>
                              ) : myResp?.status === 'interested' ? (
                                <span className="text-xs font-semibold text-[var(--olive)]">
                                  Interest Sent
                                </span>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    disabled={busyId === `call-dismiss-${call.id}`}
                                    onClick={() =>
                                      runAction(`call-dismiss-${call.id}`, () =>
                                        onRespondTeamUpCall(call.id, 'dismissed')
                                      )
                                    }
                                    className="paper-btn-secondary min-h-[36px] px-3 py-1.5 text-xs"
                                  >
                                    Skip
                                  </button>
                                  <button
                                    type="button"
                                    disabled={busyId === `call-int-${call.id}`}
                                    onClick={() =>
                                      runAction(
                                        `call-int-${call.id}`,
                                        () => onRespondTeamUpCall(call.id, 'interested'),
                                        `Interest sent to ${call.creatorName}.`
                                      )
                                    }
                                    className="paper-btn-primary min-h-[36px] px-3.5 py-1.5 text-xs"
                                  >
                                    Interested
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {incomingConnectionRequests.map((req) => (
                        <div
                          key={req.id}
                          className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-0.5 min-w-0">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--crimson)]">
                              Connect Request
                            </div>
                            <div className="font-display font-bold text-sm text-[var(--ink)]">
                              {req.fromName} ({req.fromCollege}, {req.fromYear})
                            </div>
                            <div className="text-xs text-[var(--ink-2)]">
                              For {req.eventTitle}
                              {req.note ? ` — "${req.note}"` : ''}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              disabled={busyId === `cr-dec-${req.id}`}
                              onClick={() =>
                                runAction(`cr-dec-${req.id}`, () =>
                                  onRespondConnectionRequest(req.id, 'decline')
                                )
                              }
                              className="paper-btn-secondary min-h-[36px] px-3 py-1.5 text-xs"
                            >
                              Decline
                            </button>
                            <button
                              type="button"
                              disabled={busyId === `cr-acc-${req.id}`}
                              onClick={() =>
                                runAction(`cr-acc-${req.id}`, () =>
                                  onRespondConnectionRequest(req.id, 'start_conversation')
                                )
                              }
                              className="paper-btn-primary min-h-[36px] px-3.5 py-1.5 text-xs inline-flex items-center gap-1.5"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>Start Chat</span>
                            </button>
                          </div>
                        </div>
                      ))}

                      {incomingJoinRequests.map((req) => (
                        <div
                          key={req.id}
                          className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-0.5 min-w-0">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--crimson)]">
                              Squad Join Request · {req.squadName}
                            </div>
                            <div className="font-display font-bold text-sm text-[var(--ink)]">
                              {req.applicantName} ({req.applicantCollege}) · {req.roleApplied}
                            </div>
                            {req.note && (
                              <div className="text-xs text-[var(--ink-2)]">&ldquo;{req.note}&rdquo;</div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              disabled={busyId === `jr-dec-${req.id}`}
                              onClick={() =>
                                runAction(`jr-dec-${req.id}`, () =>
                                  onRespondJoinRequest(req.id, 'decline')
                                )
                              }
                              className="paper-btn-secondary min-h-[36px] px-3 py-1.5 text-xs"
                            >
                              Decline
                            </button>
                            <button
                              type="button"
                              disabled={busyId === `jr-app-${req.id}`}
                              onClick={() =>
                                runAction(
                                  `jr-app-${req.id}`,
                                  () => onRespondJoinRequest(req.id, 'approve'),
                                  `${req.applicantName} added to ${req.squadName}.`
                                )
                              }
                              className="paper-btn-primary min-h-[36px] px-3.5 py-1.5 text-xs"
                            >
                              Approve
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Unified Outgoing & My Active Calls */}
                {outgoingTotal > 0 && (
                  <section className="paper-card p-5 space-y-4">
                    <h2 className="font-display text-base font-extrabold text-[var(--ink)]">
                      Your Calls &amp; Sent Requests ({outgoingTotal})
                    </h2>

                    <div className="divide-y divide-[var(--border-warm)]">
                      {outgoingCalls.map((call) => {
                        const interestedList = call.responses.filter(
                          (r) => r.status === 'interested' || r.status === 'invited'
                        );
                        const targetedEvents =
                          Array.isArray(call.events) && call.events.length > 0
                            ? call.events
                            : [{ id: call.eventId, title: call.eventTitle, type: call.eventType }];
                        const sentLabel =
                          call.eligibleCountLabel === 'fewer than 3'
                            ? 'fewer than 3 matching students'
                            : `${call.eligibleCount} matching student${call.eligibleCount === 1 ? '' : 's'}`;
                        const areaLabels = (call.preferredAreas || [])
                          .map((id) => areas.find((a) => a.id === id)?.name || id)
                          .slice(0, 3);
                        const filterBadges = [
                          call.preferredCollege && call.preferredCollege !== 'Any'
                            ? `College: ${colleges.find((c) => c.id === call.preferredCollege)?.shortName || call.preferredCollege}`
                            : null,
                          call.preferredYear && call.preferredYear !== 'Any'
                            ? `Year: ${call.preferredYear}`
                            : null,
                          areaLabels.length > 0
                            ? `Areas: ${areaLabels.join(', ')}${(call.preferredAreas?.length || 0) > 3 ? ` +${(call.preferredAreas?.length || 0) - 3}` : ''}`
                            : null,
                          call.preferredLanguages && call.preferredLanguages.length > 0
                            ? `Languages: ${call.preferredLanguages.join(', ')}`
                            : null,
                          call.genderPreference && call.genderPreference !== 'any'
                            ? `Gender: ${call.genderPreference === 'non_binary' ? 'Non-binary' : call.genderPreference === 'woman' ? 'Woman' : 'Man'}`
                            : null,
                        ].filter(Boolean);

                        return (
                          <div key={call.id} className="py-3.5 first:pt-0 last:pb-0 space-y-2.5">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="space-y-1 min-w-0">
                                <div className="font-display font-bold text-sm text-[var(--ink)]">
                                  Team-up Call · Needs {call.teammatesNeeded}
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {targetedEvents.map((ev) => (
                                    <button
                                      key={ev.id}
                                      type="button"
                                      onClick={() => onOpenEvent(ev.id)}
                                      className="px-2 py-0.5 text-xs font-medium border border-[var(--border-warm)] bg-[var(--paper)] text-[var(--ink)] hover:border-[var(--crimson)]"
                                    >
                                      {ev.title}
                                    </button>
                                  ))}
                                </div>
                                <div className="text-xs text-[var(--ink-2)]">
                                  Sent to <strong className="text-[var(--ink)]">{sentLabel}</strong> · {interestedList.length} interested ·{' '}
                                  <span className="uppercase font-mono">{call.status}</span> · Expires {formatIstDate(call.expiresAt)}
                                </div>
                                {filterBadges.length > 0 && (
                                  <div className="text-[11px] text-[var(--ink-2)]">
                                    Filters: {filterBadges.join(' · ')}
                                  </div>
                                )}
                                {call.eligibleCount === 0 && !call.eligibleCountLabel && call.status === 'active' && (
                                  <div className="text-[11px] text-[var(--crimson)] font-medium">
                                    0 students matched your current filters — consider closing this call and broadening filters.
                                  </div>
                                )}
                              </div>
                              {call.status === 'active' && (
                                <button
                                  type="button"
                                  disabled={busyId === `close-call-${call.id}`}
                                  onClick={() =>
                                    runAction(`close-call-${call.id}`, () =>
                                      onCloseTeamUpCall(call.id)
                                    )
                                  }
                                  className="paper-btn-secondary min-h-[32px] px-3 py-1 text-xs shrink-0"
                                >
                                  Close Call
                                </button>
                              )}
                            </div>

                            {interestedList.length > 0 && (
                              <div className="space-y-1.5 pl-3 border-l-2 border-[var(--border-warm)]">
                                {interestedList.map((resp) => {
                                  const respKey = `${call.id}:${resp.userId}`;
                                  const chosenEventId =
                                    inviteEventByResp[respKey] || targetedEvents[0]?.id || call.eventId;
                                  return (
                                    <div
                                      key={resp.userId}
                                      className="flex flex-wrap items-center justify-between gap-2 text-xs py-1"
                                    >
                                      <span>
                                        <strong className="text-[var(--ink)]">{resp.name}</strong> ·{' '}
                                        {resp.collegeShortName} · {resp.branch}
                                      </span>
                                      {resp.status === 'invited' && resp.conversationId ? (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setActivityView('chats');
                                            onSelectRoom({
                                              scope: 'conversation',
                                              id: resp.conversationId!,
                                            });
                                          }}
                                          className="paper-btn-ink min-h-[32px] px-3 py-1 text-xs"
                                        >
                                          Open Chat
                                        </button>
                                      ) : (
                                        <div className="flex items-center gap-2">
                                          {targetedEvents.length > 1 && (
                                            <select
                                              aria-label={`Select event for ${resp.name}`}
                                              value={chosenEventId}
                                              onChange={(e) =>
                                                setInviteEventByResp((prev) => ({
                                                  ...prev,
                                                  [respKey]: e.target.value,
                                                }))
                                              }
                                              className="paper-input min-h-[32px] px-2 py-1 text-xs max-w-[180px]"
                                            >
                                              {targetedEvents.map((ev) => (
                                                <option key={ev.id} value={ev.id}>
                                                  {ev.title}
                                                </option>
                                              ))}
                                            </select>
                                          )}
                                          <button
                                            type="button"
                                            disabled={busyId === `inv-${call.id}-${resp.userId}`}
                                            onClick={() =>
                                              runAction(`inv-${call.id}-${resp.userId}`, () =>
                                                onInviteFromTeamUpCall(call.id, resp.userId, chosenEventId)
                                              )
                                            }
                                            className="paper-btn-primary min-h-[32px] px-3 py-1 text-xs"
                                          >
                                            Invite to Chat
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {outgoingConnectionRequests.map((req) => (
                        <div
                          key={req.id}
                          className="py-3 flex flex-wrap items-center justify-between gap-2 text-xs"
                        >
                          <div>
                            <span className="text-[var(--ink-2)]">Connect → </span>
                            <strong className="text-[var(--ink)]">
                              {req.toName} ({req.toCollege})
                            </strong>{' '}
                            · {req.eventTitle}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono uppercase font-semibold text-[var(--ink-2)]">
                              {req.status}
                            </span>
                            {req.status === 'accepted' && req.conversationId && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActivityView('chats');
                                  onSelectRoom({
                                    scope: 'conversation',
                                    id: req.conversationId!,
                                  });
                                }}
                                className="paper-btn-ink min-h-[32px] px-3 py-1 text-xs"
                              >
                                Open Chat
                              </button>
                            )}
                          </div>
                        </div>
                      ))}

                      {outgoingJoinRequests.map((req) => (
                        <div
                          key={req.id}
                          className="py-3 flex flex-wrap items-center justify-between gap-2 text-xs"
                        >
                          <div>
                            <span className="text-[var(--ink-2)]">Join Squad → </span>
                            <strong className="text-[var(--ink)]">{req.squadName}</strong> ·{' '}
                            {req.eventTitle} ({req.roleApplied})
                          </div>
                          <span className="font-mono uppercase font-semibold text-[var(--ink-2)]">
                            {req.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )
          ) : (
            /* Chats List */
            <section className="paper-card p-5 space-y-4">
              <div className="space-y-0.5">
                <h2 className="font-display text-base font-extrabold text-[var(--ink)]">
                  1-on-1 Intro Chats ({activeConversations.length})
                </h2>
                <p className="text-xs text-[var(--ink-2)]">
                  Chats stay separate from My Squads until both teammates mutually confirm.
                </p>
              </div>
              {activeConversations.length === 0 ? (
                <p className="text-xs text-[var(--ink-2)] py-4">
                  No chats yet. Connect with a student in Discover or respond to an incoming request.
                </p>
              ) : (
                <div className="divide-y divide-[var(--border-warm)]">
                  {activeConversations.map((conv) => {
                    const peer = conv.participants.find((p) => p.userId !== student.id);
                    return (
                      <button
                        key={conv.id}
                        type="button"
                        onClick={() => onSelectRoom({ scope: 'conversation', id: conv.id })}
                        className="w-full text-left py-3.5 hover:bg-[var(--paper)] px-2 rounded transition-colors flex flex-wrap items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="font-display font-bold text-sm sm:text-base text-[var(--ink)]">
                            {peer ? `${peer.name} · ${peer.collegeShortName}` : 'Conversation'}
                          </div>
                          <div className="text-xs text-[var(--ink-2)]">
                            {conv.eventTitle} · {formatIstDate(conv.updatedAt)}
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-[var(--crimson)]">
                          {conv.status === 'confirmed_to_squad'
                            ? 'Squad Formed'
                            : conv.confirmedByUserIds.length > 0
                              ? 'Confirm Needed'
                              : 'Open Chat'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* SECTION C: MY SQUADS (Formed Teams Only)                              */}
      {/* ===================================================================== */}
      {section === 'squads' && (
        <div className="space-y-4">
          {!activeSquad ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-[var(--ink-2)]">
                  Only confirmed squads you belong to appear here.
                </p>
                <div className="flex items-center gap-2">
                  {archivedSquadCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowArchivedSquads((v) => !v)}
                      className="paper-btn-secondary min-h-[34px] px-3 py-1 text-xs"
                    >
                      {showArchivedSquads ? 'Active Squads' : `Archived (${archivedSquadCount})`}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={openNewSquadModal}
                    className="paper-btn-ink min-h-[34px] px-3.5 py-1 text-xs inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Squad</span>
                  </button>
                </div>
              </div>

              {visibleMySquads.length === 0 ? (
                <div className="paper-card p-10 text-center space-y-3">
                  <Users className="w-8 h-8 text-[var(--crimson)] mx-auto" />
                  <h2 className="font-display text-lg font-extrabold text-[var(--ink)]">
                    {showArchivedSquads ? 'No Archived Squads' : 'No Squads Formed Yet'}
                  </h2>
                  <p className="text-xs text-[var(--ink-2)] max-w-md mx-auto">
                    Connect with students in Discover, confirm together in Chats, or start a new squad.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {visibleMySquads.map((sq) => {
                    const snap = getSnapshotForSquad(sq);
                    const openSeats = Math.max(0, sq.targetSize - sq.members.length);
                    return (
                      <article
                        key={sq.id}
                        className="paper-card p-5 flex flex-col justify-between gap-4"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h2 className="font-display font-extrabold text-lg text-[var(--ink)] truncate">
                                {sq.name}
                              </h2>
                              <div className="text-xs text-[var(--ink-2)] truncate">
                                {sq.eventTitle}
                              </div>
                            </div>
                            <span className="font-mono text-xs font-bold text-[var(--crimson)] tabular-nums shrink-0">
                              {sq.members.length}/{sq.targetSize}
                            </span>
                          </div>

                          <div className="text-xs text-[var(--ink-2)]">
                            <span className="uppercase font-semibold text-[var(--ink)]">
                              {sq.isLocked ? 'Locked' : sq.recruitmentStatus}
                            </span>
                            {' · '}
                            <span>{openSeats} open</span>
                            {snap && (
                              <>
                                {' · '}
                                <span
                                  className={
                                    snap.status === 'needs_update'
                                      ? 'text-[var(--amber-ink)] font-semibold'
                                      : 'text-[var(--olive)] font-semibold'
                                  }
                                >
                                  {snap.status === 'needs_update' ? 'Amend roster' : 'Registered'}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="pt-3 border-t border-[var(--border-warm)] flex items-center justify-between gap-2">
                          <span className="text-xs text-[var(--ink-2)] truncate">
                            {sq.members.map((m) => m.name.split(' ')[0]).join(', ')}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setSquadTab('chat');
                              onSelectRoom({ scope: 'squad', id: sq.id });
                            }}
                            className="paper-btn-ink min-h-[36px] px-4 py-1.5 text-xs shrink-0"
                          >
                            Open
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            /* Streamlined 2-Tab Squad Workspace */
            (() => {
              const isOwner = activeSquad.ownerId === student.id;
              const snap = getSnapshotForSquad(activeSquad);
              const myReg = registrations.find(
                (r) =>
                  r.eventId === activeSquad.eventId &&
                  r.userId === student.id &&
                  r.status !== 'cancelled'
              );
              const myMemberRecord = activeSquad.members.find(
                (m) => m.userId === student.id
              );

              return (
                <section className="paper-card overflow-hidden">
                  <div className="p-4 sm:p-5 border-b border-[var(--border-warm)] bg-[var(--paper-raised)] flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        type="button"
                        onClick={() => onSelectRoom(null)}
                        className="paper-btn-secondary min-h-[36px] px-3 py-1.5 text-xs inline-flex items-center gap-1.5"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Back</span>
                      </button>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h2 className="font-display font-extrabold text-lg text-[var(--ink)] truncate">
                            {activeSquad.name}
                          </h2>
                          {activeSquad.isLocked && (
                            <Lock className="w-3.5 h-3.5 text-[var(--crimson)] shrink-0" />
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => onOpenEvent(activeSquad.eventId)}
                          className="text-xs text-[var(--crimson)] hover:underline truncate block"
                        >
                          {activeSquad.eventTitle} · {activeSquad.members.length}/
                          {activeSquad.targetSize} members
                        </button>
                      </div>
                    </div>

                    <div className="paper-segment">
                      <button
                        type="button"
                        aria-pressed={squadTab === 'chat'}
                        onClick={() => setSquadTab('chat')}
                        className="paper-segment-btn min-h-[36px] px-3.5 py-1.5 text-xs"
                      >
                        Chat
                      </button>
                      <button
                        type="button"
                        aria-pressed={squadTab === 'team'}
                        onClick={() => setSquadTab('team')}
                        className="paper-segment-btn min-h-[36px] px-3.5 py-1.5 text-xs"
                      >
                        Team &amp; Registration
                      </button>
                    </div>
                  </div>

                  {/* Tab 1: Squad Chat */}
                  {squadTab === 'chat' && (
                    <div>
                      {activeSquad.whatsappGroupUrl && (
                        <div className="px-4 py-2.5 bg-[var(--olive-tint)] border-b border-[var(--olive-border)] flex flex-wrap items-center justify-between gap-2 text-xs">
                          <span className="font-medium text-[var(--ink)]">
                            WhatsApp Group linked for daily coordination.
                          </span>
                          <a
                            href={activeSquad.whatsappGroupUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-[var(--olive)] hover:underline inline-flex items-center gap-1"
                          >
                            <span>Open WhatsApp</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      )}

                      {renderMessagesList()}

                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          if (!msgDraft.trim() || sendingMsg) return;
                          setSendingMsg(true);
                          const text = msgDraft;
                          setMsgDraft('');
                          try {
                            await onSendSquadMessage(activeSquad.id, text);
                          } finally {
                            setSendingMsg(false);
                          }
                        }}
                        className="p-3.5 border-t border-[var(--border-warm)] bg-[var(--paper-raised)] flex items-center gap-2"
                      >
                        <input
                          type="text"
                          value={msgDraft}
                          onChange={(e) => setMsgDraft(e.target.value)}
                          placeholder="Coordinate with your squad or move to WhatsApp..."
                          className="paper-input flex-1 min-h-[40px] px-3 py-2 text-sm"
                        />
                        <button
                          type="submit"
                          disabled={sendingMsg || !msgDraft.trim()}
                          className="paper-btn-primary min-h-[40px] px-4 py-2 text-xs inline-flex items-center gap-1.5"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Send</span>
                        </button>
                      </form>
                    </div>
                  )}

                  {/* Tab 2: Team Roster, Registration, WhatsApp & Collapsible Settings */}
                  {squadTab === 'team' && (
                    <div className="p-5 sm:p-6 space-y-5">
                      {/* Event Registration & QR Status */}
                      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-[10px] bg-[var(--feel-tint)] border border-[var(--border-warm)]">
                        <div className="space-y-0.5">
                          <div className="text-xs font-bold uppercase tracking-[0.06em] text-[var(--ink)]">
                            Event Registration &amp; QR Passes
                          </div>
                          <div className="text-xs text-[var(--ink-2)]">
                            {snap
                              ? snap.status === 'needs_update'
                                ? 'Roster changed since registration — amend to sync.'
                                : `Registered by ${snap.submittedByName}`
                              : 'Register your squad for this event to link passes.'}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {snap?.status === 'needs_update' && (
                            <button
                              type="button"
                              disabled={busyId === `amend-${activeSquad.id}`}
                              onClick={() =>
                                runAction(
                                  `amend-${activeSquad.id}`,
                                  () =>
                                    onAmendSquadRegistration(
                                      activeSquad.eventId,
                                      activeSquad.id
                                    ),
                                  'Squad registration roster amended cleanly; existing QR passes preserved.'
                                )
                              }
                              className="paper-btn-crimson min-h-[36px] px-3.5 py-1.5 text-xs"
                            >
                              Amend Roster
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onOpenEvent(activeSquad.eventId, 'apply')}
                            className="paper-btn-primary min-h-[36px] px-4 py-1.5 text-xs inline-flex items-center gap-1.5"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            <span>{myReg ? 'View Registration' : 'Register Squad'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Roster */}
                      <div className="border border-[var(--border-warm)] rounded-[10px] divide-y divide-[var(--border-warm)]">
                        {activeSquad.members.map((m) => {
                          const snapStatus = snap?.members.find((sm) => sm.userId === m.userId);
                          const directReg = m.userId === student.id ? myReg : undefined;
                          const regStatus =
                            snapStatus?.registrationStatus ||
                            (directReg?.status === 'waitlisted'
                              ? 'waitlisted'
                              : directReg
                                ? 'confirmed'
                                : 'not_registered');
                          const passCode = snapStatus?.passCode || directReg?.passCode;
                          const isExpanded = manageMemberId === m.userId;

                          return (
                            <div key={m.userId} className="p-4 space-y-2.5">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-display font-bold text-sm text-[var(--ink)]">
                                      {m.name} {m.userId === student.id ? '(You)' : ''}
                                    </span>
                                    {m.role === 'owner' && (
                                      <span className="text-[10px] font-mono uppercase font-bold text-[var(--crimson)] inline-flex items-center gap-0.5">
                                        <Shield className="w-3 h-3" /> Lead
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-[var(--ink-2)]">
                                    {m.collegeShortName} · {m.branch} · {m.roleSkill}
                                  </div>
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                  <span
                                    className={`text-xs font-mono font-semibold ${
                                      regStatus === 'confirmed'
                                        ? 'text-[var(--olive)]'
                                        : regStatus === 'waitlisted'
                                          ? 'text-[var(--amber-ink)]'
                                          : 'text-[var(--ink-2)]'
                                    }`}
                                  >
                                    {regStatus === 'confirmed'
                                      ? `QR Active (${passCode || 'Confirmed'})`
                                      : regStatus === 'waitlisted'
                                        ? 'Waitlisted'
                                        : 'Not registered'}
                                  </span>

                                  {isOwner && m.userId !== student.id && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setManageMemberId(isExpanded ? null : m.userId)
                                      }
                                      className="paper-btn-secondary min-h-[30px] px-2.5 py-1 text-[11px]"
                                    >
                                      {isExpanded ? 'Close' : 'Manage'}
                                    </button>
                                  )}
                                </div>
                              </div>

                              {isOwner && isExpanded && m.userId !== student.id && (
                                <div className="pt-2 border-t border-[var(--border-warm)] flex flex-wrap justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setManageMemberId(null);
                                      void runAction(
                                        `xfer-${m.userId}`,
                                        () => onTransferSquadOwner(activeSquad.id, m.userId),
                                        `Transferred squad lead to ${m.name}.`
                                      );
                                    }}
                                    className="paper-btn-secondary min-h-[32px] px-3 py-1 text-xs"
                                  >
                                    Make Lead
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setManageMemberId(null);
                                      void runAction(
                                        `rm-${m.userId}`,
                                        () => onRemoveSquadMember(activeSquad.id, m.userId),
                                        `${m.name} removed from squad.`
                                      );
                                    }}
                                    className="paper-btn-secondary min-h-[32px] px-3 py-1 text-xs text-[var(--crimson)]"
                                  >
                                    Remove Member
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Collapsible WhatsApp Handoff */}
                      <div className="border border-[var(--border-warm)] rounded-[10px] bg-[var(--paper)] overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setWaOpen((v) => !v)}
                          className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-[var(--paper-raised)] transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-[var(--olive)] shrink-0" />
                            <div>
                              <div className="font-display font-bold text-sm text-[var(--ink)]">
                                WhatsApp Handoff
                              </div>
                              <div className="text-xs text-[var(--ink-2)]">
                                Share your number voluntarily or link a squad group
                              </div>
                            </div>
                          </div>
                          {waOpen ? (
                            <ChevronUp className="w-4 h-4 text-[var(--ink-2)]" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-[var(--ink-2)]" />
                          )}
                        </button>

                        {waOpen && (
                          <div className="p-4 pt-0 border-t border-[var(--border-warm)] space-y-3 pt-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="flex gap-2">
                                <input
                                  type="tel"
                                  value={waNumberInput}
                                  onChange={(e) => setWaNumberInput(e.target.value)}
                                  placeholder="My WhatsApp (+91...)"
                                  className="paper-input flex-1 min-h-[38px] px-3 py-1.5 text-xs font-mono"
                                />
                                <button
                                  type="button"
                                  disabled={busyId === 'wa-contact'}
                                  onClick={() =>
                                    runAction(
                                      'wa-contact',
                                      () =>
                                        onShareSquadWhatsapp(activeSquad.id, {
                                          mode: 'contact',
                                          whatsappNumber: waNumberInput,
                                        }),
                                      'WhatsApp contact shared.'
                                    )
                                  }
                                  className="paper-btn-ink min-h-[38px] px-3 py-1.5 text-xs whitespace-nowrap"
                                >
                                  {myMemberRecord?.whatsappShared ? 'Update' : 'Share'}
                                </button>
                              </div>

                              <div className="flex gap-2">
                                <input
                                  type="url"
                                  value={waGroupInput}
                                  onChange={(e) => setWaGroupInput(e.target.value)}
                                  placeholder="https://chat.whatsapp.com/..."
                                  className="paper-input flex-1 min-h-[38px] px-3 py-1.5 text-xs font-mono"
                                />
                                <button
                                  type="button"
                                  disabled={busyId === 'wa-group'}
                                  onClick={() =>
                                    runAction(
                                      'wa-group',
                                      () =>
                                        onShareSquadWhatsapp(activeSquad.id, {
                                          mode: 'group',
                                          whatsappGroupUrl: waGroupInput,
                                        }),
                                      'WhatsApp Group linked.'
                                    )
                                  }
                                  className="paper-btn-primary min-h-[38px] px-3 py-1.5 text-xs whitespace-nowrap"
                                >
                                  Link Group
                                </button>
                              </div>
                            </div>

                            {activeSquad.members.some((m) => m.whatsappShared && m.whatsappNumber) && (
                              <div className="flex flex-wrap gap-2 pt-1">
                                {activeSquad.members
                                  .filter((m) => m.whatsappShared && m.whatsappNumber)
                                  .map((m) => (
                                    <a
                                      key={m.userId}
                                      href={buildWaLink(m.whatsappNumber!)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="paper-btn-secondary min-h-[32px] px-3 py-1 text-xs inline-flex items-center gap-1.5"
                                    >
                                      <span>WhatsApp {m.name.split(' ')[0]}</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Collapsible Squad Settings & Leave */}
                      <div className="border border-[var(--border-warm)] rounded-[10px] bg-[var(--paper)] overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setSettingsOpen((v) => !v)}
                          className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-[var(--paper-raised)] transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <Settings className="w-4 h-4 text-[var(--ink-2)] shrink-0" />
                            <span className="font-display font-bold text-sm text-[var(--ink)]">
                              Squad Settings &amp; Leave
                            </span>
                          </div>
                          {settingsOpen ? (
                            <ChevronUp className="w-4 h-4 text-[var(--ink-2)]" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-[var(--ink-2)]" />
                          )}
                        </button>

                        {settingsOpen && (
                          <div className="p-4 border-t border-[var(--border-warm)] space-y-4">
                            {isOwner && (
                              <form
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  runAction(
                                    `save-sq-${activeSquad.id}`,
                                    () =>
                                      onUpdateSquad(activeSquad.id, {
                                        name: editSquadName.trim(),
                                        targetSize:
                                          Number(editSquadSize) || activeSquad.targetSize,
                                        requiredRoles: editSquadRoles
                                          .split(',')
                                          .map((r) => r.trim())
                                          .filter(Boolean),
                                      }),
                                    'Squad details updated.'
                                  );
                                }}
                                className="space-y-3"
                              >
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                  <input
                                    type="text"
                                    value={editSquadName}
                                    onChange={(e) => setEditSquadName(e.target.value)}
                                    placeholder="Squad name"
                                    className="paper-input sm:col-span-2 min-h-[38px] px-3 py-1.5 text-xs"
                                  />
                                  <input
                                    type="number"
                                    min={activeSquad.members.length}
                                    max={8}
                                    value={editSquadSize}
                                    onChange={(e) => setEditSquadSize(e.target.value)}
                                    className="paper-input min-h-[38px] px-3 py-1.5 text-xs font-mono"
                                  />
                                </div>
                                <input
                                  type="text"
                                  value={editSquadRoles}
                                  onChange={(e) => setEditSquadRoles(e.target.value)}
                                  placeholder="Required roles (comma-separated)"
                                  className="paper-input w-full min-h-[38px] px-3 py-1.5 text-xs"
                                />
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        runAction(
                                          `rec-${activeSquad.id}`,
                                          () =>
                                            onUpdateSquad(activeSquad.id, {
                                              recruitmentStatus:
                                                activeSquad.recruitmentStatus === 'open'
                                                  ? 'closed'
                                                  : 'open',
                                            }),
                                          'Recruitment status updated.'
                                        )
                                      }
                                      className="paper-btn-secondary min-h-[34px] px-3 py-1 text-xs"
                                    >
                                      {activeSquad.recruitmentStatus === 'open'
                                        ? 'Close Recruitment'
                                        : 'Open Recruitment'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        runAction(
                                          `lock-${activeSquad.id}`,
                                          () =>
                                            onUpdateSquad(activeSquad.id, {
                                              recruitmentStatus: activeSquad.isLocked
                                                ? 'closed'
                                                : 'locked',
                                            }),
                                          activeSquad.isLocked ? 'Unlocked.' : 'Locked.'
                                        )
                                      }
                                      className="paper-btn-secondary min-h-[34px] px-3 py-1 text-xs"
                                    >
                                      {activeSquad.isLocked ? 'Unlock' : 'Lock Team'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        runAction(
                                          `arch-${activeSquad.id}`,
                                          () =>
                                            onUpdateSquad(activeSquad.id, {
                                              archived: !activeSquad.archivedAt,
                                            }),
                                          activeSquad.archivedAt ? 'Restored.' : 'Archived.'
                                        )
                                      }
                                      className="paper-btn-secondary min-h-[34px] px-3 py-1 text-xs"
                                    >
                                      {activeSquad.archivedAt ? 'Unarchive' : 'Archive'}
                                    </button>
                                  </div>
                                  <button
                                    type="submit"
                                    disabled={busyId === `save-sq-${activeSquad.id}`}
                                    className="paper-btn-primary min-h-[34px] px-4 py-1 text-xs"
                                  >
                                    Save Changes
                                  </button>
                                </div>
                              </form>
                            )}

                            {actionError && (
                              <div className="p-3 border border-[var(--crimson)] bg-[var(--crimson-tint)] text-xs font-medium text-[var(--crimson)]">
                                {actionError}
                              </div>
                            )}

                            <div className="pt-2 border-t border-[var(--border-warm)] flex flex-wrap items-center justify-between gap-2">
                              <span className="text-[11px] text-[var(--ink-2)]">
                                Squad rosters cannot break confirmed event passes unless an event registration is cancelled first.
                              </span>
                              <button
                                type="button"
                                disabled={busyId === `leave-${activeSquad.id}`}
                                onClick={() =>
                                  runAction(
                                    `leave-${activeSquad.id}`,
                                    async () => {
                                      await onLeaveSquad(activeSquad.id);
                                      onSelectRoom(null);
                                    },
                                    'Left squad.'
                                  )
                                }
                                className="paper-btn-secondary min-h-[36px] px-4 py-1.5 text-xs text-[var(--crimson)] shrink-0"
                              >
                                Leave Squad
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </section>
              );
            })()
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* PORTALED MODALS (Outside any transformed wrapper + Escape/backdrop)    */}
      {/* ===================================================================== */}
      {connectTarget &&
        createPortal(
          <div
            onClick={() => setConnectTarget(null)}
            className="paper-scrim fixed inset-0 z-[60] flex items-center justify-center p-4 overflow-y-auto"
          >
            <form
              onClick={(e) => e.stopPropagation()}
              onSubmit={(e) => {
                e.preventDefault();
                runAction(
                  'send-cr',
                  async () => {
                    await onSendConnectionRequest({
                      toUserId: connectTarget.userId,
                      eventId: connectTarget.eventId,
                      note: connectNote.trim(),
                    });
                    setConnectTarget(null);
                  },
                  `Connection request sent to ${connectTarget.userName}.`
                );
              }}
              className="paper-card w-full max-w-md p-6 space-y-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-display text-lg font-extrabold text-[var(--ink)]">
                    Connect with {connectTarget.userName}
                  </h2>
                  <p className="text-xs text-[var(--ink-2)]">
                    For {connectTarget.eventTitle} · Starts a private chat if they accept.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setConnectTarget(null)}
                  aria-label="Close"
                  className="p-1.5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <textarea
                rows={3}
                required
                maxLength={280}
                value={connectNote}
                onChange={(e) => setConnectNote(e.target.value)}
                placeholder={`Introduce yourself and your skills for ${connectTarget.eventTitle}...`}
                className="paper-input w-full p-3 text-xs resize-none"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConnectTarget(null)}
                  className="paper-btn-secondary min-h-[38px] px-3.5 py-1.5 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busyId === 'send-cr'}
                  className="paper-btn-primary min-h-[38px] px-4 py-1.5 text-xs"
                >
                  {busyId === 'send-cr' ? 'Sending...' : 'Send Request'}
                </button>
              </div>
            </form>
          </div>,
          document.body
        )}

      {joinTarget &&
        createPortal(
          <div
            onClick={() => setJoinTarget(null)}
            className="paper-scrim fixed inset-0 z-[60] flex items-center justify-center p-4 overflow-y-auto"
          >
            <form
              onClick={(e) => e.stopPropagation()}
              onSubmit={(e) => {
                e.preventDefault();
                runAction(
                  'send-jr',
                  async () => {
                    await onRequestJoinSquad(joinTarget.id, {
                      roleApplied: joinRole.trim() || 'Builder',
                      note: joinNote.trim(),
                    });
                    setJoinTarget(null);
                  },
                  `Join request sent to ${joinTarget.name}.`
                );
              }}
              className="paper-card w-full max-w-md p-6 space-y-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-display text-lg font-extrabold text-[var(--ink)]">
                    Join {joinTarget.name}
                  </h2>
                  <p className="text-xs text-[var(--ink-2)]">
                    {joinTarget.eventTitle} · Reviewed by {joinTarget.ownerName}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setJoinTarget(null)}
                  aria-label="Close"
                  className="p-1.5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <input
                type="text"
                required
                value={joinRole}
                onChange={(e) => setJoinRole(e.target.value)}
                placeholder="Role you bring (e.g. UI/UX Design, React, ML)"
                className="paper-input w-full min-h-[38px] px-3 py-1.5 text-xs"
              />

              <textarea
                rows={3}
                maxLength={280}
                value={joinNote}
                onChange={(e) => setJoinNote(e.target.value)}
                placeholder="Short note on past projects or availability..."
                className="paper-input w-full p-3 text-xs resize-none"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setJoinTarget(null)}
                  className="paper-btn-secondary min-h-[38px] px-3.5 py-1.5 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busyId === 'send-jr'}
                  className="paper-btn-primary min-h-[38px] px-4 py-1.5 text-xs"
                >
                  {busyId === 'send-jr' ? 'Sending...' : 'Send Join Request'}
                </button>
              </div>
            </form>
          </div>,
          document.body
        )}

      {callModalOpen &&
        createPortal(
          <div
            onClick={() => setCallModalOpen(false)}
            className="paper-scrim fixed inset-0 z-[60] flex items-center justify-center p-4 overflow-y-auto"
          >
            <form
              onClick={(e) => e.stopPropagation()}
              onSubmit={async (e) => {
                e.preventDefault();
                if (callEventIds.length === 0) {
                  setCallFormError('Select at least 1 event (up to 3) before publishing.');
                  return;
                }
                setCallFormError(null);
                setBusyId('create-call');
                setActionError(null);
                setActionMessage(null);
                try {
                  await onCreateTeamUpCall({
                    eventIds: callEventIds,
                    teammatesNeeded: Number(callNeeded) || 1,
                    preferredCollege: callPrefCollege,
                    preferredYear: callPrefYear,
                    preferredSkills: callPrefSkills
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean),
                    rolesNeeded: callSelectedRoles,
                    preferredAreas: callPrefAreas,
                    preferredLanguages: callPrefLanguages,
                    genderPreference: callGenderPref,
                    audienceMode: callAudienceMode,
                    note: callNote.trim(),
                  });
                  setCallModalOpen(false);
                  setSection('activity');
                  setActivityView('requests');
                  setActionMessage('Team-up Call published to matching students.');
                } catch (err) {
                  setCallFormError(
                    err instanceof Error ? err.message : 'Could not publish Team-up Call.'
                  );
                } finally {
                  setBusyId(null);
                }
              }}
              className="paper-modal w-full max-w-2xl p-5 sm:p-6 space-y-4 my-auto max-h-[92vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-[var(--border-warm)]">
                <div className="space-y-1">
                  <h2 className="font-display text-lg sm:text-xl font-extrabold tracking-[-0.02em] text-[var(--ink)]">
                    Recruit Teammates Across 1–3 Events
                  </h2>
                  <div className="text-[11px] text-[var(--ink-2)] flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span>
                      Posting as <strong className="text-[var(--ink)]">{student.displayName}</strong> ·{' '}
                      {studentCollegeShort} · {student.branch} · {student.year}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono">Limit: 3 calls/hr</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCallModalOpen(false)}
                  aria-label="Close"
                  className="paper-btn-secondary w-8 h-8 inline-flex items-center justify-center shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {callFormError && (
                <div className="p-3 border border-[var(--crimson)] bg-[var(--crimson-tint)] text-xs font-medium text-[var(--crimson)]">
                  {callFormError}
                </div>
              )}

              {/* Step 1: Multi-event selection (1–3) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--ink-2)]">
                    1. Target Events (Pick 1–3)
                  </span>
                  <span className="text-[11px] font-mono font-semibold text-[var(--ink)] tabular-nums">
                    {callEventIds.length}/3 selected
                  </span>
                </div>
                <div className="max-h-40 overflow-y-auto border border-[var(--border-warm)] bg-[var(--paper-raised)] divide-y divide-[var(--border-warm)]">
                  {(callEligibleEvents.length > 0 ? callEligibleEvents : availableEvents).map((ev) => {
                    const checked = callEventIds.includes(ev.id);
                    const disabled = !checked && callEventIds.length >= 3;
                    return (
                      <label
                        key={ev.id}
                        className={`flex items-start gap-2.5 px-3 py-2 text-xs ${
                          disabled ? 'opacity-55 cursor-not-allowed' : 'cursor-pointer hover:bg-[var(--paper)]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => {
                            setCallFormError(null);
                            setCallEventIds((prev) => {
                              if (prev.includes(ev.id)) {
                                return prev.filter((id) => id !== ev.id);
                              }
                              if (prev.length >= 3) return prev;
                              return [...prev, ev.id];
                            });
                          }}
                          className="mt-0.5 accent-[var(--crimson)]"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-[var(--ink)] truncate">
                            {ev.title}
                          </div>
                          <div className="text-[11px] text-[var(--ink-2)]">
                            {ev.type} · {ev.mode} · Reg closes {formatIstDate(ev.regDeadline || ev.endAt)}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
                <p className="text-[11px] text-[var(--ink-2)]">
                  Appeal stays open until the latest registration deadline among your selected events passes.
                </p>
              </div>

              {/* Step 2: Teammates + Roles & Skills */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-start">
                <div className="space-y-1">
                  <label
                    htmlFor="call-needed-select"
                    className="block text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--ink-2)]"
                  >
                    2. Open Spots
                  </label>
                  <select
                    id="call-needed-select"
                    value={callNeeded}
                    onChange={(e) => setCallNeeded(e.target.value)}
                    className="paper-input w-full min-h-[38px] px-2.5 py-1.5 text-xs"
                  >
                    <option value="1">1 teammate</option>
                    <option value="2">2 teammates</option>
                    <option value="3">3 teammates</option>
                    <option value="4">4 teammates</option>
                  </select>
                </div>

                <div className="sm:col-span-3 space-y-1.5">
                  <span className="block text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--ink-2)]">
                    Roles Needed (Select any)
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {CALL_ROLE_PRESETS.map((role) => {
                      const active = callSelectedRoles.includes(role);
                      return (
                        <button
                          key={role}
                          type="button"
                          aria-pressed={active}
                          onClick={() =>
                            setCallSelectedRoles((prev) =>
                              prev.includes(role)
                                ? prev.filter((r) => r !== role)
                                : [...prev, role]
                            )
                          }
                          className={`min-h-[30px] px-2.5 py-1 text-xs font-medium border transition-colors ${
                            active
                              ? 'bg-[var(--ink)] text-[var(--on-ink)] border-[var(--ink)]'
                              : 'bg-[var(--paper)] text-[var(--ink)] border-[var(--border-warm)] hover:border-[var(--ink)]'
                          }`}
                        >
                          {role}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="call-skills-input"
                  className="block text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--ink-2)]"
                >
                  Specific Skills / Stack (Optional)
                </label>
                <input
                  id="call-skills-input"
                  type="text"
                  value={callPrefSkills}
                  onChange={(e) => setCallPrefSkills(e.target.value)}
                  placeholder="Comma-separated, e.g. React, Python, Figma, Embedded C"
                  className="paper-input w-full min-h-[38px] px-3 py-1.5 text-xs"
                />
              </div>

              {/* Step 3: Pitch */}
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="call-pitch-input"
                    className="block text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--ink-2)]"
                  >
                    3. Project Pitch &amp; Expectations
                  </label>
                  <span className="text-[11px] font-mono text-[var(--ink-2)] tabular-nums">
                    {callNote.length}/280
                  </span>
                </div>
                <textarea
                  id="call-pitch-input"
                  rows={2}
                  maxLength={280}
                  value={callNote}
                  onChange={(e) => setCallNote(e.target.value)}
                  placeholder="What are you building, which track are you aiming for, and when can the team meet?"
                  className="paper-input w-full p-2.5 text-xs resize-none"
                />
              </div>

              {/* Step 4: Target Recipient Filters */}
              <div className="border border-[var(--border-warm)] bg-[var(--paper-raised)] p-3.5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--ink)]">
                      4. Recipient Filters (Optional)
                    </div>
                    <p className="text-[11px] text-[var(--ink-2)]">
                      Leave any filter empty for no restriction. Filters combine with AND; multiple picks inside a filter match ANY.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCallMoreOpen((v) => !v)}
                    className="text-xs font-semibold text-[var(--crimson)] hover:underline inline-flex items-center gap-1 shrink-0"
                  >
                    <span>{callMoreOpen ? 'Collapse' : 'Expand'}</span>
                    {callMoreOpen ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {callMoreOpen && (
                  <div className="pt-2 border-t border-[var(--border-warm)] space-y-3.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label
                          htmlFor="call-pref-college"
                          className="block text-[11px] font-semibold text-[var(--ink-2)] mb-1"
                        >
                          College
                        </label>
                        <select
                          id="call-pref-college"
                          value={callPrefCollege}
                          onChange={(e) => setCallPrefCollege(e.target.value)}
                          className="paper-input w-full min-h-[36px] px-2.5 py-1.5 text-xs"
                        >
                          <option value="Any">Any College</option>
                          {colleges.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.shortName}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="call-pref-year"
                          className="block text-[11px] font-semibold text-[var(--ink-2)] mb-1"
                        >
                          Academic Year
                        </label>
                        <select
                          id="call-pref-year"
                          value={callPrefYear}
                          onChange={(e) => setCallPrefYear(e.target.value)}
                          className="paper-input w-full min-h-[36px] px-2.5 py-1.5 text-xs"
                        >
                          <option value="Any">Any Year</option>
                          <option value="1st Year">1st Year</option>
                          <option value="2nd Year">2nd Year</option>
                          <option value="3rd Year">3rd Year</option>
                          <option value="4th Year">4th Year</option>
                        </select>
                      </div>
                    </div>

                    {/* Area Corridors (16 corridors) */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold text-[var(--ink-2)]">
                          College Corridor / Area ({callPrefAreas.length === 0 ? 'Any' : `${callPrefAreas.length} selected`})
                        </span>
                        {callPrefAreas.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setCallPrefAreas([])}
                            className="text-[11px] font-semibold text-[var(--crimson)] hover:underline"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                        {areas.map((area) => {
                          const active = callPrefAreas.includes(area.id);
                          return (
                            <button
                              key={area.id}
                              type="button"
                              aria-pressed={active}
                              onClick={() =>
                                setCallPrefAreas((prev) =>
                                  prev.includes(area.id)
                                    ? prev.filter((id) => id !== area.id)
                                    : [...prev, area.id]
                                )
                              }
                              className={`min-h-[28px] px-2 py-0.5 text-[11px] font-medium border ${
                                active
                                  ? 'bg-[var(--ink)] text-[var(--on-ink)] border-[var(--ink)]'
                                  : 'bg-[var(--paper)] text-[var(--ink)] border-[var(--border-warm)] hover:border-[var(--ink)]'
                              }`}
                            >
                              {area.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Spoken Languages */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold text-[var(--ink-2)]">
                          Spoken Languages ({callPrefLanguages.length === 0 ? 'Any' : `${callPrefLanguages.length} selected`})
                        </span>
                        {callPrefLanguages.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setCallPrefLanguages([])}
                            className="text-[11px] font-semibold text-[var(--crimson)] hover:underline"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {SUPPORTED_LANGUAGES.map((lang) => {
                          const active = callPrefLanguages.includes(lang);
                          return (
                            <button
                              key={lang}
                              type="button"
                              aria-pressed={active}
                              onClick={() =>
                                setCallPrefLanguages((prev) =>
                                  prev.includes(lang)
                                    ? prev.filter((item) => item !== lang)
                                    : [...prev, lang]
                                )
                              }
                              className={`min-h-[28px] px-2 py-0.5 text-[11px] font-medium border ${
                                active
                                  ? 'bg-[var(--ink)] text-[var(--on-ink)] border-[var(--ink)]'
                                  : 'bg-[var(--paper)] text-[var(--ink)] border-[var(--border-warm)] hover:border-[var(--ink)]'
                              }`}
                            >
                              {lang}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Gender */}
                    <div className="space-y-1.5">
                      <span className="block text-[11px] font-semibold text-[var(--ink-2)]">
                        Gender Filter (Opt-in Only)
                      </span>
                      <div className="paper-segment w-full">
                        {(
                          [
                            { id: 'any', label: 'Any' },
                            { id: 'woman', label: 'Woman' },
                            { id: 'man', label: 'Man' },
                            { id: 'non_binary', label: 'Non-binary' },
                          ] as const
                        ).map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            aria-pressed={callGenderPref === opt.id}
                            onClick={() => setCallGenderPref(opt.id)}
                            className="paper-segment-btn flex-1 min-h-[32px] px-2.5 py-1 text-xs whitespace-nowrap"
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      <p className="text-[11px] text-[var(--ink-2)]">
                        Students with unset or &ldquo;prefer not to say&rdquo; never match a gendered appeal, and your filter is never disclosed to recipients.
                      </p>
                    </div>

                    {/* Reach Mode */}
                    <div className="space-y-1.5">
                      <span className="block text-[11px] font-semibold text-[var(--ink-2)]">
                        Delivery Reach
                      </span>
                      <div className="paper-segment w-full">
                        <button
                          type="button"
                          aria-pressed={callAudienceMode === 'all_matching'}
                          onClick={() => setCallAudienceMode('all_matching')}
                          className="paper-segment-btn flex-1 min-h-[32px] px-3 py-1 text-xs"
                        >
                          All matching (incl. offline)
                        </button>
                        <button
                          type="button"
                          aria-pressed={callAudienceMode === 'active_only'}
                          onClick={() => setCallAudienceMode('active_only')}
                          className="paper-segment-btn flex-1 min-h-[32px] px-3 py-1 text-xs"
                        >
                          Online right now
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Live Audience Preview */}
              <div className="p-3 border border-[var(--border-warm)] bg-[var(--feel-tint)] space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-[var(--ink)] inline-flex items-center gap-1.5 font-medium">
                    <Sparkles className="w-3.5 h-3.5 text-[var(--crimson)]" />
                    <span>Estimated audience:</span>
                  </span>
                  {callEventIds.length === 0 ? (
                    <span className="font-mono font-bold text-[var(--crimson)]">
                      No events selected
                    </span>
                  ) : callEstimating ? (
                    <span className="font-mono font-bold text-[var(--ink-2)]">
                      Calculating reach...
                    </span>
                  ) : callEstimateError ? (
                    <span className="inline-flex items-center gap-2 font-mono font-bold text-[var(--crimson)]">
                      <span>Estimate unavailable</span>
                      <button
                        type="button"
                        onClick={() => setCallEstimateRetryTick((t) => t + 1)}
                        className="underline font-sans text-xs font-semibold"
                      >
                        Retry
                      </button>
                    </span>
                  ) : callEstimatedCount === 'fewer than 3' ? (
                    <span className="font-mono font-bold text-[var(--crimson)]">
                      Fewer than 3 matching students
                    </span>
                  ) : (
                    <span className="font-mono font-bold text-[var(--crimson)] tabular-nums">
                      {callEstimatedCount ?? 0} matching students
                    </span>
                  )}
                </div>
                {callEstimatedCount === 'fewer than 3' && !callEstimateError && !callEstimating && callEventIds.length > 0 && (
                  <p className="text-[11px] text-[var(--ink-2)]">
                    Counts under 3 are masked as &ldquo;fewer than 3&rdquo; so filter combinations cannot identify an individual student.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setCallModalOpen(false)}
                  className="paper-btn-secondary min-h-[38px] px-3.5 py-1.5 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busyId === 'create-call' || callEventIds.length === 0}
                  className="paper-btn-crimson min-h-[38px] px-4 py-1.5 text-xs"
                >
                  {busyId === 'create-call' ? 'Publishing...' : 'Publish Call'}
                </button>
              </div>
            </form>
          </div>,
          document.body
        )}

      {cardModalOpen &&
        createPortal(
          <div
            onClick={() => setCardModalOpen(false)}
            className="paper-scrim fixed inset-0 z-[60] flex items-center justify-center p-4 overflow-y-auto"
          >
            <form
              onClick={(e) => e.stopPropagation()}
              onSubmit={(e) => {
                e.preventDefault();
                runAction(
                  'post-avail',
                  async () => {
                    await onPostPartnerRequest({
                      eventId: cardEventId,
                      roleSkill: cardRoleSkill.trim(),
                      lookingFor: cardLookingFor.trim(),
                      teamSlotsNeeded: 2,
                      note: cardNote.trim(),
                      whatsappReady: cardWhatsappReady,
                    });
                    setCardModalOpen(false);
                  },
                  'Availability card published in Discover.'
                );
              }}
              className="paper-card w-full max-w-md p-6 space-y-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-display text-lg font-extrabold text-[var(--ink)]">
                    Post Your Availability
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setCardModalOpen(false)}
                  aria-label="Close"
                  className="p-1.5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <select
                value={cardEventId}
                onChange={(e) => setCardEventId(e.target.value)}
                className="paper-input w-full min-h-[38px] px-3 py-1.5 text-xs"
              >
                {availableEvents.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title}
                  </option>
                ))}
              </select>

              <input
                type="text"
                required
                value={cardRoleSkill}
                onChange={(e) => setCardRoleSkill(e.target.value)}
                placeholder="Skills you bring (e.g. React, UI/UX)"
                className="paper-input w-full min-h-[38px] px-3 py-1.5 text-xs"
              />
              <input
                type="text"
                required
                value={cardLookingFor}
                onChange={(e) => setCardLookingFor(e.target.value)}
                placeholder="Looking for (e.g. ML Engineer + Pitch Lead)"
                className="paper-input w-full min-h-[38px] px-3 py-1.5 text-xs"
              />
              <input
                type="text"
                value={cardNote}
                onChange={(e) => setCardNote(e.target.value)}
                placeholder="Short pitch or availability..."
                className="paper-input w-full min-h-[38px] px-3 py-1.5 text-xs"
              />

              <label className="flex items-center gap-2 text-xs text-[var(--ink)]">
                <input
                  type="checkbox"
                  checked={cardWhatsappReady}
                  onChange={(e) => setCardWhatsappReady(e.target.checked)}
                  className="accent-[var(--crimson)]"
                />
                <span>Open to moving to WhatsApp after matching</span>
              </label>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCardModalOpen(false)}
                  className="paper-btn-secondary min-h-[38px] px-3.5 py-1.5 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busyId === 'post-avail'}
                  className="paper-btn-primary min-h-[38px] px-4 py-1.5 text-xs"
                >
                  {busyId === 'post-avail' ? 'Publishing...' : 'Publish Card'}
                </button>
              </div>
            </form>
          </div>,
          document.body
        )}

      {newSquadModalOpen &&
        createPortal(
          <div
            onClick={() => setNewSquadModalOpen(false)}
            className="paper-scrim fixed inset-0 z-[60] flex items-center justify-center p-4 overflow-y-auto"
          >
            <form
              onClick={(e) => e.stopPropagation()}
              onSubmit={(e) => {
                e.preventDefault();
                runAction(
                  'new-sq',
                  async () => {
                    await onCreateSquad({
                      name: newSquadName.trim(),
                      eventId: newSquadEventId,
                      targetSize: Number(newSquadTargetSize) || 4,
                      requiredRoles: newSquadRoles
                        .split(',')
                        .map((r) => r.trim())
                        .filter(Boolean),
                    });
                    setNewSquadModalOpen(false);
                    setSection('squads');
                  },
                  'New recruiting squad created.'
                );
              }}
              className="paper-card w-full max-w-md p-6 space-y-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-display text-lg font-extrabold text-[var(--ink)]">
                    Create a Recruiting Squad
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setNewSquadModalOpen(false)}
                  aria-label="Close"
                  className="p-1.5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <input
                type="text"
                required
                value={newSquadName}
                onChange={(e) => setNewSquadName(e.target.value)}
                placeholder="Squad Name (e.g. Deccan Builders)"
                className="paper-input w-full min-h-[38px] px-3 py-1.5 text-xs"
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <select
                  value={newSquadEventId}
                  onChange={(e) => setNewSquadEventId(e.target.value)}
                  className="paper-input sm:col-span-2 min-h-[38px] px-2.5 py-1.5 text-xs"
                >
                  {availableEvents.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.title}
                    </option>
                  ))}
                </select>
                <select
                  value={newSquadTargetSize}
                  onChange={(e) => setNewSquadTargetSize(e.target.value)}
                  className="paper-input min-h-[38px] px-2.5 py-1.5 text-xs"
                >
                  <option value="2">2 seats</option>
                  <option value="3">3 seats</option>
                  <option value="4">4 seats</option>
                  <option value="5">5 seats</option>
                  <option value="6">6 seats</option>
                </select>
              </div>
              <input
                type="text"
                value={newSquadRoles}
                onChange={(e) => setNewSquadRoles(e.target.value)}
                placeholder="Roles needed (e.g. UI/UX Design, Backend)"
                className="paper-input w-full min-h-[38px] px-3 py-1.5 text-xs"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setNewSquadModalOpen(false)}
                  className="paper-btn-secondary min-h-[38px] px-3.5 py-1.5 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busyId === 'new-sq'}
                  className="paper-btn-primary min-h-[38px] px-4 py-1.5 text-xs"
                >
                  {busyId === 'new-sq' ? 'Creating...' : 'Create Squad'}
                </button>
              </div>
            </form>
          </div>,
          document.body
        )}
    </div>
  );
}
