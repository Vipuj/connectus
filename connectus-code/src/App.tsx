import { useCallback, useEffect, useRef, useState } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import type { User } from 'firebase/auth';
import { AnimatePresence, LayoutGroup, motion, MotionConfig } from 'motion/react';
import { Smartphone } from 'lucide-react';
import { AuthModal, type AuthModalMode, type AuthRoleIntent } from './components/AuthModal';
import { BetaAccessGate } from './components/BetaAccessGate';
import { DiscoverFeed } from './components/DiscoverFeed';
import { EventDetailModal } from './components/EventDetailModal';
import { ExternalOrganizerWorkspace } from './components/ExternalOrganizerWorkspace';
import { InviteAcceptModal } from './components/InviteAcceptModal';
import { LoadingSplash, type LoadingStage } from './components/LoadingSplash';
import { MeView } from './components/MeView';
import { MyClubWorkspace } from './components/MyClubWorkspace';
import { MyEventsView } from './components/MyEventsView';
import { OrganizerStudio } from './components/OrganizerStudio';
import { PreferencesModal } from './components/PreferencesModal';
import { ProfileModal } from './components/ProfileModal';
import type { CheckInPayload } from './components/QrScannerCheckIn';
import { SettingsModal, type SettingsTab } from './components/SettingsModal';
import { StaffPortalGate } from './components/StaffPortalGate';
import { SuggestEventModal, type SuggestEventPayload } from './components/SuggestEventModal';
import { TeamChatHub, type ActiveTeamRoom } from './components/TeamChatHub';
import { TelegramDrawer } from './components/TelegramDrawer';
import { TicketsView } from './components/TicketsView';
import { TopBar, type ActiveTab, type OfficialSectionId } from './components/TopBar';
import { WelcomeAuthPage } from './components/WelcomeAuthPage';
import { smoothScrollPageTop } from './utils/scroll';
import {
  applyThemePreference,
  clearUserStoredTheme,
  getGuestStoredTheme,
  getStoredTheme,
  getUserStoredTheme,
  normalizeThemePreference,
  type ThemePreference,
} from './utils/theme';
import {
  BETA_CLUB_LEADER_EMAIL,
  BETA_STUDENT_EMAIL,
  isBetaOfficialEmail,
  acceptOfficialInviteInFirestore,
  deleteAllStudentDataFromFirestore,
  deleteAnnouncementFromFirestore,
  deletePartnerPostFromFirestore,
  ensureOfficialMembershipInFirestore,
  fetchOfficialMembershipFromFirestore,
  fetchStudentProfileFromFirestore,
  redeemBetaCodeInFirestore,
  saveOfficialInviteToFirestore,
  saveStudentProfileToFirestore,
  signInStudentWithGoogle,
  signOutStudent,
  submitOrganizerApplicationToFirestore,
  subscribeAnnouncementsFromFirestore,
  subscribeAuthState,
  subscribeStudentProfileFromFirestore,
  subscribeChatMessagesFromFirestore,
  subscribeConnectionRequestsFromFirestore,
  subscribeConversationsFromFirestore,
  subscribeEventFeedbackFromFirestore,
  subscribeEventsFromFirestore,
  subscribeJoinRequestsFromFirestore,
  subscribeMyNotificationsFromFirestore,
  subscribePartnerPostsFromFirestore,
  subscribeRegistrationSnapshotsFromFirestore,
  subscribeRegistrationsFromFirestore,
  subscribeSquadsFromFirestore,
  subscribeSurveyResponsesFromFirestore,
  subscribeSurveysFromFirestore,
  subscribeTeamUpCallsFromFirestore,
  syncAnnouncementToFirestore,
  syncChatMessageToFirestore,
  syncConnectionRequestToFirestore,
  syncConversationToFirestore,
  syncEventCountsToFirestore,
  syncEventToFirestore,
  syncFeedbackToFirestore,
  syncJoinRequestToFirestore,
  syncNotificationToFirestore,
  syncPartnerPostToFirestore,
  syncRegistrationSnapshotToFirestore,
  syncRegistrationToFirestore,
  syncSquadToFirestore,
  syncSurveyResponseToFirestore,
  syncSurveyToFirestore,
  syncTeamUpCallToFirestore,
  type FirestoreOfficialMembershipDoc,
} from './firebase';
import type {
  Area,
  AuditLogEntry,
  CallGenderFilter,
  CampusAnnouncement,
  CampusEvent,
  CampusSurvey,
  College,
  ConnectionRequest,
  EventCoordinatorContact,
  EventFeedback,
  EventMode,
  EventPaymentInfo,
  EventReport,
  EventScheduleDay,
  EventType,
  FeedbackAnalysisReport,
  FeedEvent,
  NotificationItem,
  OfficialInvite,
  OrganizerAccount,
  PartnerPost,
  PosterExtractionResult,
  PublicSquadSummary,
  RegStatus,
  Registration,
  Squad,
  SquadJoinRequest,
  SquadRecruitmentStatus,
  SquadRegistrationSnapshot,
  StudentProfile,
  SupportedLanguage,
  SurveyResponse,
  TeamChatMessage,
  TeamConversation,
  TeamUpCall,
} from './types';

interface SamplePosterItem {
  id: string;
  label: string;
  imagePath: string;
  collegeId: string;
}

const PROFILE_PROMPTED_PREFIX = 'campuspulse:profile-prompted:';
const STUDENT_BACKUP_PREFIX = 'campuspulse:student-profile:';
const GUEST_SESSION_STORAGE_KEY = 'campuspulse:guest-session-id';

function isPlaceholderName(name?: string | null): boolean {
  const clean = (name || '').trim();
  return !clean || clean === 'Guest Student' || clean === 'Student';
}

function pickFirstNonEmpty(...values: Array<string | undefined | null>): string {
  for (const val of values) {
    if (typeof val === 'string' && val.trim().length > 0) {
      return val.trim();
    }
  }
  return '';
}

function pickFirstRealName(...values: Array<string | undefined | null>): string {
  for (const val of values) {
    if (typeof val === 'string' && !isPlaceholderName(val)) {
      return val.trim();
    }
  }
  return 'Student';
}

async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: number | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timer = window.setTimeout(() => resolve(fallback), ms);
      }),
    ]);
  } finally {
    if (timer !== null) window.clearTimeout(timer);
  }
}

function hasChosenCollege(s?: Partial<StudentProfile> | null): boolean {
  if (!s) return false;
  return Boolean(
    (s.collegeId && s.collegeId !== 'other') ||
      (typeof s.customCollegeName === 'string' && s.customCollegeName.trim().length > 0)
  );
}

function saveLocalStudentProfile(uid: string, profile: StudentProfile): void {
  try {
    window.localStorage.setItem(`${STUDENT_BACKUP_PREFIX}${uid}`, JSON.stringify(profile));
  } catch {
    // ignore storage quota errors
  }
}

function loadLocalStudentProfile(uid: string): Partial<StudentProfile> | null {
  try {
    const raw = window.localStorage.getItem(`${STUDENT_BACKUP_PREFIX}${uid}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StudentProfile>;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function clearLocalStudentProfile(uid: string): void {
  try {
    window.localStorage.removeItem(`${STUDENT_BACKUP_PREFIX}${uid}`);
  } catch {
    // ignore storage errors
  }
}

type PortalRoute = 'public' | 'officials';

function detectPortalRoute(): PortalRoute {
  const pathname = window.location.pathname.toLowerCase().replace(/\/+$/, '');
  const params = new URLSearchParams(window.location.search);
  const portalParam = (params.get('portal') || '').toLowerCase();
  if (pathname === '/officials' || portalParam === 'officials' || params.has('invite')) {
    return 'officials';
  }
  return 'public';
}

function createFreshGuestKey(): string {
  return `guest:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function getOrCreateGuestKey(): string {
  try {
    let key = window.sessionStorage.getItem(GUEST_SESSION_STORAGE_KEY);
    if (!key || !key.startsWith('guest:')) {
      key = createFreshGuestKey();
      window.sessionStorage.setItem(GUEST_SESSION_STORAGE_KEY, key);
    }
    return key;
  } catch {
    return createFreshGuestKey();
  }
}

function rotateGuestKey(): string {
  const key = createFreshGuestKey();
  try {
    window.sessionStorage.setItem(GUEST_SESSION_STORAGE_KEY, key);
  } catch {
    // ignore storage errors
  }
  return key;
}

function hasSeenProfilePrompt(uid: string): boolean {
  try {
    return window.localStorage.getItem(`${PROFILE_PROMPTED_PREFIX}${uid}`) === '1';
  } catch {
    return false;
  }
}

function markProfilePromptSeen(uid: string): void {
  try {
    window.localStorage.setItem(`${PROFILE_PROMPTED_PREFIX}${uid}`, '1');
  } catch {
    // ignore storage errors
  }
}

function clearProfilePromptSeen(uid: string): void {
  try {
    window.localStorage.removeItem(`${PROFILE_PROMPTED_PREFIX}${uid}`);
  } catch {
    // ignore storage errors
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('discover');
  const [officialSection, setOfficialSection] = useState<OfficialSectionId>('discover');
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [loadingStage, setLoadingStage] = useState<LoadingStage>('auth');
  const [loadingProgress, setLoadingProgress] = useState<number>(12);
  const initialBootSettledRef = useRef<boolean>(false);
  const skipNextAuthReadyFeedRef = useRef<boolean>(false);
  const loadingProgressRef = useRef<number>(12);
  const loadingTargetRef = useRef<number>(12);
  const loadingCompletingRef = useRef<boolean>(false);
  const loadingCompletionResolveRef = useRef<(() => void) | null>(null);
  const [guestBrowsing, setGuestBrowsing] = useState(false);
  const [mapsApiKey, setMapsApiKey] = useState<string>(
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  );
  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState(false);

  const [areas, setAreas] = useState<Area[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [samplePosters, setSamplePosters] = useState<SamplePosterItem[]>([]);
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [organizers, setOrganizers] = useState<OrganizerAccount[]>([]);
  const [officialInvites, setOfficialInvites] = useState<OfficialInvite[]>([]);
  const [activeOrganizerId, setActiveOrganizerId] = useState<string>('');
  const [officialMembership, setOfficialMembership] =
    useState<FirestoreOfficialMembershipDoc | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [reports, setReports] = useState<EventReport[]>([]);
  const [pendingSuggestions, setPendingSuggestions] = useState<CampusEvent[]>([]);
  const [organizerEvents, setOrganizerEvents] = useState<CampusEvent[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [participatedEvents, setParticipatedEvents] = useState<FeedEvent[]>([]);
  const [eventFeedback, setEventFeedback] = useState<EventFeedback[]>([]);
  const [surveys, setSurveys] = useState<CampusSurvey[]>([]);
  const [surveyResponses, setSurveyResponses] = useState<SurveyResponse[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [announcements, setAnnouncements] = useState<CampusAnnouncement[]>([]);

  const [partnerPosts, setPartnerPosts] = useState<PartnerPost[]>([]);
  const [publicSquads, setPublicSquads] = useState<PublicSquadSummary[]>([]);
  const [mySquads, setMySquads] = useState<Squad[]>([]);
  const [connectionRequests, setConnectionRequests] = useState<ConnectionRequest[]>([]);
  const [joinRequests, setJoinRequests] = useState<SquadJoinRequest[]>([]);
  const [teamUpCalls, setTeamUpCalls] = useState<TeamUpCall[]>([]);
  const [conversations, setConversations] = useState<TeamConversation[]>([]);
  const [chatMessages, setChatMessages] = useState<TeamChatMessage[]>([]);
  const [registrationSnapshots, setRegistrationSnapshots] = useState<SquadRegistrationSnapshot[]>([]);
  const [activeTeamRoom, setActiveTeamRoom] = useState<ActiveTeamRoom | null>(null);
  const [draftCallEventId, setDraftCallEventId] = useState<string | null>(null);

  const [feedEvents, setFeedEvents] = useState<FeedEvent[]>([]);
  const [allEvents, setAllEvents] = useState<FeedEvent[]>([]);
  const [campusEvents, setCampusEvents] = useState<FeedEvent[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);

  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [onlyFollowed, setOnlyFollowed] = useState<boolean>(false);
  const [showAllIndia, setShowAllIndia] = useState<boolean>(false);

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<SettingsTab>('account');
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [telegramOpen, setTelegramOpen] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [initialInviteToken, setInitialInviteToken] = useState('');
  const [portalRoute, setPortalRoute] = useState<PortalRoute>(() => detectPortalRoute());
  const [toastBanner, setToastBanner] = useState<{ title: string; body: string } | null>(null);
  const [betaLocked, setBetaLocked] = useState<boolean>(false);
  const [isBetaManagerState, setIsBetaManagerState] = useState<boolean>(false);
  const [betaAccessSummary, setBetaAccessSummary] = useState<{
    enabled: boolean;
    maxSeats: number;
    usedSeats: number;
  } | null>(null);

  const officialAutoEnteredRef = useRef(false);

  const isFixedStudentUser = Boolean(
    firebaseUser?.emailVerified &&
      firebaseUser.email?.trim().toLowerCase() === BETA_STUDENT_EMAIL
  );

  const isBetaManager = Boolean(
    !isFixedStudentUser &&
      (isBetaManagerState ||
        (firebaseUser?.emailVerified && isBetaOfficialEmail(firebaseUser.email)))
  );

  const matchesAccountUser = (o: OrganizerAccount) =>
    Boolean(
      !isFixedStudentUser &&
        firebaseUser &&
        ((o.authUid && o.authUid === firebaseUser.uid) ||
          (firebaseUser.emailVerified &&
            firebaseUser.email &&
            o.email.toLowerCase() === firebaseUser.email.toLowerCase()))
    );

  const matchedAnyRoleRecord =
    firebaseUser && !isFixedStudentUser
      ? organizers.find((o) => matchesAccountUser(o) && o.status === 'approved')
      : undefined;

  const isFixedClubLeaderUser = Boolean(
    !isFixedStudentUser &&
      firebaseUser?.emailVerified &&
      firebaseUser.email?.trim().toLowerCase() === BETA_CLUB_LEADER_EMAIL
  );

  const matchedClubLeader: OrganizerAccount | undefined =
    firebaseUser && !isFixedStudentUser
      ? organizers.find(
          (o) => matchesAccountUser(o) && o.status === 'approved' && o.memberRole === 'club_leader'
        ) ||
        (officialMembership?.status === 'approved' && officialMembership.memberRole === 'club_leader'
          ? organizers.find((o) => o.id === 'org-club-vinay' || o.memberRole === 'club_leader') || {
              id: 'org-club-vinay',
              collegeId: officialMembership.collegeId || 'col-iiith',
              clubName: officialMembership.clubName || 'IIIT-H Tech & Innovation Club',
              contactName: officialMembership.contactName || firebaseUser.displayName || 'Vinay Chandra',
              email: firebaseUser.email || BETA_CLUB_LEADER_EMAIL,
              authUid: firebaseUser.uid,
              accountType: 'club_leader',
              memberRole: 'club_leader',
              status: 'approved',
              domainMatched: true,
              proofNote: 'Appointed Club Leader · Direct Beta Seat',
              createdAt: new Date().toISOString(),
            }
          : isFixedClubLeaderUser
            ? organizers.find((o) => o.id === 'org-club-vinay') || {
                id: 'org-club-vinay',
                collegeId: 'col-iiith',
                clubName: 'IIIT-H Tech & Innovation Club',
                contactName: firebaseUser.displayName || 'Vinay Chandra',
                email: firebaseUser.email || BETA_CLUB_LEADER_EMAIL,
                authUid: firebaseUser.uid,
                accountType: 'club_leader',
                memberRole: 'club_leader',
                status: 'approved',
                domainMatched: true,
                proofNote: 'Appointed Club Leader · Direct Beta Seat',
                createdAt: new Date().toISOString(),
              }
            : undefined)
      : undefined;

  const matchedExternalRecord =
    firebaseUser && !isFixedStudentUser
      ? organizers.find(
          (o) =>
            matchesAccountUser(o) &&
            (o.memberRole === 'external_organizer' || o.accountType === 'external_organizer')
        )
      : undefined;

  const matchedCampusOfficial =
    firebaseUser && !isFixedStudentUser
      ? organizers.find(
          (o) =>
            matchesAccountUser(o) &&
            o.status === 'approved' &&
            o.memberRole === 'college_official'
        ) ||
        (officialMembership?.status === 'approved' && !matchedAnyRoleRecord
          ? organizers.find((o) => o.collegeId === officialMembership.collegeId && o.memberRole === 'college_official')
          : undefined)
      : undefined;

  const isCampusOfficial = Boolean(matchedCampusOfficial);
  const isClubLeader = Boolean(matchedClubLeader);
  const isExternalOrganizer = matchedExternalRecord?.status === 'approved';
  const canAccessOfficials = !isFixedStudentUser && (isBetaManager || isCampusOfficial);
  const canAccessMyClub = !isFixedStudentUser && isClubLeader;
  const canAccessExternal = !isFixedStudentUser && isExternalOrganizer;

  useEffect(() => {
    const onPopState = () => setPortalRoute(detectPortalRoute());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (isFixedStudentUser) {
      if (portalRoute === 'officials') {
        setPortalRoute('public');
        if (window.location.pathname !== '/') {
          window.history.replaceState({}, '', '/');
        }
      }
      if (activeTab === 'organizer' || activeTab === 'my-club' || activeTab === 'external') {
        setActiveTab('discover');
      }
      return;
    }
    if (portalRoute === 'officials' && canAccessOfficials) {
      setActiveTab('organizer');
    } else if (portalRoute === 'public' && !canAccessOfficials && activeTab === 'organizer') {
      setActiveTab('discover');
    }
  }, [isFixedStudentUser, portalRoute, canAccessOfficials, activeTab]);

  useEffect(() => {
    if (!authReady) return;
    if (!firebaseUser || betaLocked || isFixedStudentUser) {
      officialAutoEnteredRef.current = false;
      return;
    }
    if (canAccessOfficials && !officialAutoEnteredRef.current) {
      officialAutoEnteredRef.current = true;
      setPortalRoute('officials');
      setActiveTab('organizer');
      if (window.location.pathname !== '/officials') {
        window.history.replaceState({}, '', '/officials');
      }
    }
  }, [authReady, firebaseUser, betaLocked, isFixedStudentUser, canAccessOfficials]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteParam = params.get('invite');
    if (inviteParam) {
      setInitialInviteToken(inviteParam);
      setInviteModalOpen(true);
      setPortalRoute('officials');
      window.history.replaceState({}, '', '/officials');
    }
  }, []);

  useEffect(() => {
    const onQuota = () => setMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuota);
  }, []);

  useEffect(() => {
    if (mapsApiKey) return;
    fetch('/api/maps-config')
      .then((r) => r.json())
      .then((d: { apiKey?: string }) => {
        if (d.apiKey) setMapsApiKey(d.apiKey);
      })
      .catch(() => {});
  }, [mapsApiKey]);

  const authUserRef = useRef<User | null>(null);
  const guestKeyRef = useRef<string>(getOrCreateGuestKey());
  const authHydratedRef = useRef<boolean>(false);
  const promptedOnboardingUidRef = useRef<string | null>(null);
  const authIntentRef = useRef<AuthModalMode | null>(null);
  const authRoleIntentRef = useRef<AuthRoleIntent | null>(null);
  const hydratingUidRef = useRef<string | null>(null);
  const hydratingPromiseRef = useRef<Promise<void> | null>(null);
  const studentRef = useRef<StudentProfile | null>(null);
  const portalRouteRef = useRef<PortalRoute>(portalRoute);
  const collegesRef = useRef<College[]>(colleges);
  const areasRef = useRef<Area[]>(areas);
  const betaLockedRef = useRef<boolean>(betaLocked);

  useEffect(() => {
    betaLockedRef.current = betaLocked;
  }, [betaLocked]);

  useEffect(() => {
    studentRef.current = student;
  }, [student]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('cp-high-contrast', Boolean(student?.accessibilityPrefs?.highContrastFocus));
    root.classList.toggle('cp-compact', Boolean(student?.accessibilityPrefs?.compactDensity));
  }, [student?.accessibilityPrefs?.highContrastFocus, student?.accessibilityPrefs?.compactDensity]);

  useEffect(() => {
    const activeUid = authUserRef.current?.uid ?? null;
    const pref =
      normalizeThemePreference(student?.accessibilityPrefs?.themePreference) ||
      getStoredTheme(activeUid);
    applyThemePreference(pref, activeUid);
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystemChange = () => {
      const uid = authUserRef.current?.uid ?? null;
      const currentPref =
        normalizeThemePreference(studentRef.current?.accessibilityPrefs?.themePreference) ||
        getStoredTheme(uid);
      if (currentPref === 'system') {
        applyThemePreference('system', uid);
      }
    };
    mq.addEventListener('change', onSystemChange);
    return () => mq.removeEventListener('change', onSystemChange);
  }, [student?.accessibilityPrefs?.themePreference]);

  useEffect(() => {
    portalRouteRef.current = portalRoute;
  }, [portalRoute]);

  useEffect(() => {
    collegesRef.current = colleges;
  }, [colleges]);

  useEffect(() => {
    areasRef.current = areas;
  }, [areas]);

  const apiFetch = useCallback(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const headers = new Headers(init.headers);
    const activeUser = authUserRef.current;
    if (activeUser) {
      try {
        const idToken = await activeUser.getIdToken();
        if (idToken) {
          headers.set('Authorization', `Bearer ${idToken}`);
        }
      } catch {
        // ignore token error
      }
    } else {
      headers.set('x-student-key', guestKeyRef.current);
    }
    return fetch(input, { ...init, headers });
  }, []);

  const applyBootstrapData = useCallback(
    (data: Record<string, unknown>, options?: { skipStudent?: boolean }) => {
      setBetaLocked(Boolean(data.betaLocked));
      setIsBetaManagerState(Boolean(data.isBetaManager));
      setBetaAccessSummary(
        (data.betaAccessSummary as {
          enabled: boolean;
          maxSeats: number;
          usedSeats: number;
        } | null) || null
      );
      const nextAreas = (data.areas as Area[]) || [];
      const nextColleges = (data.colleges as College[]) || [];
      if (nextAreas.length > 0) {
        areasRef.current = nextAreas;
      }
      if (nextColleges.length > 0) {
        collegesRef.current = nextColleges;
      }
      setAreas(nextAreas);
      setColleges(nextColleges);
      setSamplePosters((data.samplePosters as SamplePosterItem[]) || []);
      if (!options?.skipStudent && !authHydratedRef.current && data.student) {
        setStudent(data.student as StudentProfile);
      }
      setOrganizers((data.organizers as OrganizerAccount[]) || []);
      setOfficialInvites((data.officialInvites as OfficialInvite[]) || []);
      setActiveOrganizerId((data.activeOrganizerId as string) || '');
      setNotifications((data.notifications as NotificationItem[]) || []);
      setReports((data.reports as EventReport[]) || []);
      setPendingSuggestions((data.pendingSuggestions as CampusEvent[]) || []);
      setOrganizerEvents((data.organizerEvents as CampusEvent[]) || []);
      setRegistrations((data.registrations as Registration[]) || []);
      setParticipatedEvents((data.participatedEvents as FeedEvent[]) || []);
      setEventFeedback((data.eventFeedback as EventFeedback[]) || []);
      setSurveys((data.surveys as CampusSurvey[]) || []);
      setSurveyResponses((data.surveyResponses as SurveyResponse[]) || []);
      setAuditLog((data.auditLog as AuditLogEntry[]) || []);
      setAnnouncements((data.announcements as CampusAnnouncement[]) || []);
      setPartnerPosts((data.partnerPosts as PartnerPost[]) || []);
      setPublicSquads((data.publicSquads as PublicSquadSummary[]) || []);
      setMySquads((data.mySquads as Squad[]) || []);
      setConnectionRequests((data.connectionRequests as ConnectionRequest[]) || []);
      setJoinRequests((data.joinRequests as SquadJoinRequest[]) || []);
      setTeamUpCalls((data.teamUpCalls as TeamUpCall[]) || []);
      setConversations((data.conversations as TeamConversation[]) || []);
      setChatMessages((data.chatMessages as TeamChatMessage[]) || []);
      setRegistrationSnapshots((data.registrationSnapshots as SquadRegistrationSnapshot[]) || []);
    },
    []
  );

  const loadBootstrap = useCallback(async () => {
    const res = await apiFetch('/api/bootstrap');
    const data = (await res.json()) as Record<string, unknown>;
    applyBootstrapData(data);
  }, [apiFetch, applyBootstrapData]);

  const loadFeed = useCallback(async () => {
    setFeedLoading(true);
    try {
      const params = new URLSearchParams({
        type: typeFilter,
        search: searchQuery,
        onlyFollowed: String(onlyFollowed),
        showAll: String(showAllIndia),
      });
      const [filteredRes, allRes, campusRes] = await Promise.all([
        apiFetch(`/api/feed?${params.toString()}`),
        apiFetch('/api/feed?showAll=true'),
        apiFetch('/api/campus-events'),
      ]);
      if (filteredRes.status === 403 || allRes.status === 403) {
        setFeedEvents([]);
        setAllEvents([]);
        setCampusEvents([]);
        return;
      }
      const filteredData = await filteredRes.json();
      const allData = await allRes.json();
      const campusData = campusRes.ok ? await campusRes.json() : { events: [] };
      setFeedEvents(filteredData.events || []);
      setAllEvents(allData.events || []);
      setCampusEvents(campusData.events || []);
    } finally {
      setFeedLoading(false);
    }
  }, [apiFetch, typeFilter, searchQuery, onlyFollowed, showAllIndia]);

  const loadBootstrapRef = useRef(loadBootstrap);
  useEffect(() => {
    loadBootstrapRef.current = loadBootstrap;
  }, [loadBootstrap]);

  const loadFeedRef = useRef(loadFeed);
  useEffect(() => {
    loadFeedRef.current = loadFeed;
  }, [loadFeed]);

  const hydrateSignedInUser = useCallback(
    async (user: User) => {
      if (hydratingUidRef.current === user.uid && hydratingPromiseRef.current) {
        return hydratingPromiseRef.current;
      }

      const run = (async () => {
        const intent = authIntentRef.current;
        const roleIntent = authRoleIntentRef.current;
        authIntentRef.current = null;
        authRoleIntentRef.current = null;
        setGuestBrowsing(false);

        setLoadingStage('profile');
        loadingTargetRef.current = Math.max(loadingTargetRef.current, 45);

        const localBackup = loadLocalStudentProfile(user.uid);
        const preAuthCollege = hasChosenCollege(studentRef.current) ? studentRef.current : null;

        let fsFailed = false;
        const [fsMembership, fsProfile, bootData] = await Promise.all([
          withTimeout(
            fetchOfficialMembershipFromFirestore(user.uid).catch(() => null),
            750,
            null
          ),
          withTimeout(
            fetchStudentProfileFromFirestore(user.uid).catch(() => {
              fsFailed = true;
              return null;
            }),
            750,
            null
          ),
          withTimeout(
            apiFetch('/api/bootstrap')
              .then((r) => (r.ok ? (r.json() as Promise<Record<string, unknown>>) : null))
              .catch(() => null),
            1500,
            null
          ),
        ]);

        // Ensure official membership doc in background without delaying page load
        if (user.emailVerified && (isBetaOfficialEmail(user.email) || !fsMembership)) {
          ensureOfficialMembershipInFirestore(user)
            .then(() => (!fsMembership ? fetchOfficialMembershipFromFirestore(user.uid) : null))
            .then((refreshed) => {
              if (refreshed) setOfficialMembership(refreshed);
            })
            .catch(() => {});
        }
        setOfficialMembership(fsMembership);

        let serverStudent: StudentProfile | null = null;
        let bootOrganizers: OrganizerAccount[] = [];
        if (bootData) {
          if (bootData.betaLocked) {
            applyBootstrapData(bootData);
            setAuthModalMode(null);
            setProfileOpen(false);
            return;
          }
          applyBootstrapData(bootData, { skipStudent: true });
          serverStudent = (bootData.student as StudentProfile | undefined) || null;
          if (Array.isArray(bootData.organizers)) {
            bootOrganizers = bootData.organizers as OrganizerAccount[];
          }
        }

        const bestCollegeSource = hasChosenCollege(fsProfile)
          ? fsProfile
          : hasChosenCollege(localBackup)
            ? localBackup
            : hasChosenCollege(serverStudent)
              ? serverStudent
              : preAuthCollege;

        const pickList = <T,>(...lists: Array<T[] | undefined>): T[] | undefined => {
          for (const arr of lists) {
            if (Array.isArray(arr) && arr.length > 0) return arr;
          }
          return undefined;
        };

        try {
          authHydratedRef.current = true;
          const resolvedCollegeId =
            bestCollegeSource?.collegeId ||
            pickFirstNonEmpty(fsProfile?.collegeId, localBackup?.collegeId, serverStudent?.collegeId) ||
            'col-mrdu';
          const normalizedCollegeId =
            resolvedCollegeId === 'other' &&
            !pickFirstNonEmpty(
              bestCollegeSource?.customCollegeName,
              fsProfile?.customCollegeName,
              localBackup?.customCollegeName,
              serverStudent?.customCollegeName
            )
              ? 'col-mrdu'
              : resolvedCollegeId;
          const resolvedCustomCollege =
            normalizedCollegeId === 'other'
              ? pickFirstNonEmpty(
                  bestCollegeSource?.customCollegeName,
                  fsProfile?.customCollegeName,
                  localBackup?.customCollegeName,
                  serverStudent?.customCollegeName
                )
              : '';
          const matchedCol = collegesRef.current.find((c) => c.id === normalizedCollegeId);
          const matchedArea = matchedCol
            ? areasRef.current.find((a) => a.id === matchedCol.areaId)
            : undefined;
          const baseFollowed =
            pickList(
              fsProfile?.followedCollegeIds,
              localBackup?.followedCollegeIds,
              serverStudent?.followedCollegeIds
            ) || [];
          const resolvedFollowed =
            matchedCol && !baseFollowed.includes(matchedCol.id)
              ? [...baseFollowed, matchedCol.id]
              : baseFollowed;

          const resolvedDisplayName = pickFirstRealName(
            fsProfile?.displayName,
            localBackup?.displayName,
            serverStudent?.displayName,
            user.displayName
          );
          const resolvedPhone = pickFirstNonEmpty(
            fsProfile?.phoneNumber,
            localBackup?.phoneNumber,
            serverStudent?.phoneNumber
          );
          const resolvedRollNumber = pickFirstNonEmpty(
            fsProfile?.rollNumber,
            localBackup?.rollNumber,
            serverStudent?.rollNumber
          );

          const resolvedPayload: Partial<StudentProfile> = {
            authUid: user.uid,
            displayName: resolvedDisplayName,
            email: pickFirstNonEmpty(
              fsProfile?.email,
              localBackup?.email,
              serverStudent?.email,
              user.email
            ),
            phoneNumber: resolvedPhone,
            photoUrl: pickFirstNonEmpty(
              fsProfile?.photoUrl,
              localBackup?.photoUrl,
              serverStudent?.photoUrl,
              user.photoURL
            ),
            course: pickFirstNonEmpty(fsProfile?.course, localBackup?.course, serverStudent?.course) || 'B.Tech',
            branch: pickFirstNonEmpty(fsProfile?.branch, localBackup?.branch, serverStudent?.branch) || 'CSE',
            semester: pickFirstNonEmpty(fsProfile?.semester, localBackup?.semester, serverStudent?.semester) || 'Sem 1',
            year: pickFirstNonEmpty(fsProfile?.year, localBackup?.year, serverStudent?.year) || '1st Year',
            collegeId: normalizedCollegeId,
            customCollegeName: resolvedCustomCollege,
            collegePlaceId:
              normalizedCollegeId === 'other'
                ? pickFirstNonEmpty(
                    bestCollegeSource?.collegePlaceId,
                    fsProfile?.collegePlaceId,
                    localBackup?.collegePlaceId,
                    serverStudent?.collegePlaceId
                  ) || undefined
                : undefined,
            collegeAddress:
              normalizedCollegeId === 'other'
                ? pickFirstNonEmpty(
                    bestCollegeSource?.collegeAddress,
                    fsProfile?.collegeAddress,
                    localBackup?.collegeAddress,
                    serverStudent?.collegeAddress
                  ) || undefined
                : undefined,
            collegeLat:
              normalizedCollegeId === 'other'
                ? bestCollegeSource?.collegeLat ?? fsProfile?.collegeLat ?? localBackup?.collegeLat ?? serverStudent?.collegeLat
                : undefined,
            collegeLng:
              normalizedCollegeId === 'other'
                ? bestCollegeSource?.collegeLng ?? fsProfile?.collegeLng ?? localBackup?.collegeLng ?? serverStudent?.collegeLng
                : undefined,
            collegeVerified: Boolean(
              bestCollegeSource?.collegeVerified ??
                fsProfile?.collegeVerified ??
                localBackup?.collegeVerified ??
                serverStudent?.collegeVerified
            ),
            areaId:
              pickFirstNonEmpty(fsProfile?.areaId, localBackup?.areaId, serverStudent?.areaId) ||
              matchedArea?.id ||
              'area-kompally',
            locationLabel:
              pickFirstNonEmpty(
                fsProfile?.locationLabel,
                localBackup?.locationLabel,
                serverStudent?.locationLabel
              ) ||
              (matchedArea
                ? `${matchedArea.name}, Telangana`
                : 'Kompally / Medchal (MRDU), Hyderabad'),
            locationLat:
              fsProfile?.locationLat ?? localBackup?.locationLat ?? serverStudent?.locationLat ?? matchedArea?.lat,
            locationLng:
              fsProfile?.locationLng ?? localBackup?.locationLng ?? serverStudent?.locationLng ?? matchedArea?.lng,
            radiusKm: fsProfile?.radiusKm || localBackup?.radiusKm || serverStudent?.radiusKm || 50,
            interests:
              pickList(fsProfile?.interests, localBackup?.interests, serverStudent?.interests) || [
                'Hackathon',
                'Workshop',
                'Competition',
                'Cultural',
              ],
            followedCollegeIds: resolvedFollowed,
            savedEventIds:
              pickList(
                fsProfile?.savedEventIds,
                localBackup?.savedEventIds,
                serverStudent?.savedEventIds
              ) || [],
            skills: pickList(fsProfile?.skills, localBackup?.skills, serverStudent?.skills) || [],
            learningGoals:
              pickList(
                fsProfile?.learningGoals,
                localBackup?.learningGoals,
                serverStudent?.learningGoals
              ) || [],
            headline: pickFirstNonEmpty(fsProfile?.headline, localBackup?.headline, serverStudent?.headline),
            bio: pickFirstNonEmpty(fsProfile?.bio, localBackup?.bio, serverStudent?.bio),
            graduationYear: pickFirstNonEmpty(
              fsProfile?.graduationYear,
              localBackup?.graduationYear,
              serverStudent?.graduationYear
            ),
            rollNumber: resolvedRollNumber,
            linkedinUrl: pickFirstNonEmpty(
              fsProfile?.linkedinUrl,
              localBackup?.linkedinUrl,
              serverStudent?.linkedinUrl
            ),
            githubUrl: pickFirstNonEmpty(
              fsProfile?.githubUrl,
              localBackup?.githubUrl,
              serverStudent?.githubUrl
            ),
            portfolioUrl: pickFirstNonEmpty(
              fsProfile?.portfolioUrl,
              localBackup?.portfolioUrl,
              serverStudent?.portfolioUrl
            ),
            leetcodeUrl: pickFirstNonEmpty(
              fsProfile?.leetcodeUrl,
              localBackup?.leetcodeUrl,
              serverStudent?.leetcodeUrl
            ),
            hackerrankUrl: pickFirstNonEmpty(
              fsProfile?.hackerrankUrl,
              localBackup?.hackerrankUrl,
              serverStudent?.hackerrankUrl
            ),
            instagramUrl: pickFirstNonEmpty(
              fsProfile?.instagramUrl,
              localBackup?.instagramUrl,
              serverStudent?.instagramUrl
            ),
            preferredModes:
              pickList(
                fsProfile?.preferredModes,
                localBackup?.preferredModes,
                serverStudent?.preferredModes
              ) || ['In-Person', 'Hybrid', 'Online'],
            availability:
              fsProfile?.availability || localBackup?.availability || serverStudent?.availability || 'Open to All',
            priorityLowSeatAlerts:
              (fsProfile?.priorityLowSeatAlerts ??
                localBackup?.priorityLowSeatAlerts ??
                serverStudent?.priorityLowSeatAlerts) !== false,
            teamDiscoveryEnabled:
              (fsProfile?.teamDiscoveryEnabled ??
                localBackup?.teamDiscoveryEnabled ??
                serverStudent?.teamDiscoveryEnabled) !== false,
            teamCallNotifications:
              (fsProfile?.teamCallNotifications ??
                localBackup?.teamCallNotifications ??
                serverStudent?.teamCallNotifications) !== false,
            mutedAll: Boolean(fsProfile?.mutedAll ?? localBackup?.mutedAll ?? serverStudent?.mutedAll),
            telegramConnected: Boolean(
              fsProfile?.telegramConnected ??
                localBackup?.telegramConnected ??
                serverStudent?.telegramConnected
            ),
            telegramHandle: pickFirstNonEmpty(
              fsProfile?.telegramHandle,
              localBackup?.telegramHandle,
              serverStudent?.telegramHandle
            ),
            quietHours:
              fsProfile?.quietHours ||
              localBackup?.quietHours ||
              serverStudent?.quietHours || { enabled: true, start: '22:00', end: '07:00' },
            profileVisibility:
              fsProfile?.profileVisibility ||
              localBackup?.profileVisibility ||
              serverStudent?.profileVisibility,
            accessibilityPrefs: (() => {
              const resolvedThemePref: ThemePreference =
                normalizeThemePreference(fsProfile?.accessibilityPrefs?.themePreference) ||
                normalizeThemePreference(localBackup?.accessibilityPrefs?.themePreference) ||
                getUserStoredTheme(user.uid) ||
                normalizeThemePreference(serverStudent?.accessibilityPrefs?.themePreference) ||
                getGuestStoredTheme();
              return {
                reducedMotion: Boolean(
                  fsProfile?.accessibilityPrefs?.reducedMotion ??
                    localBackup?.accessibilityPrefs?.reducedMotion ??
                    serverStudent?.accessibilityPrefs?.reducedMotion
                ),
                highContrastFocus: Boolean(
                  fsProfile?.accessibilityPrefs?.highContrastFocus ??
                    localBackup?.accessibilityPrefs?.highContrastFocus ??
                    serverStudent?.accessibilityPrefs?.highContrastFocus
                ),
                compactDensity: Boolean(
                  fsProfile?.accessibilityPrefs?.compactDensity ??
                    localBackup?.accessibilityPrefs?.compactDensity ??
                    serverStudent?.accessibilityPrefs?.compactDensity
                ),
                themePreference: resolvedThemePref,
              };
            })(),
            gender:
              fsProfile?.gender || localBackup?.gender || serverStudent?.gender || 'unset',
            languages:
              pickList(fsProfile?.languages, localBackup?.languages, serverStudent?.languages) || [],
            onboardingCompleted: Boolean(
              fsProfile?.onboardingCompleted ||
                localBackup?.onboardingCompleted ||
                serverStudent?.onboardingCompleted ||
                hasChosenCollege(bestCollegeSource)
            ),
            consentAccepted: Boolean(
              fsProfile?.consentAccepted ||
                localBackup?.consentAccepted ||
                serverStudent?.consentAccepted ||
                hasChosenCollege(bestCollegeSource)
            ),
          };

          setLoadingStage('feed');
          loadingTargetRef.current = Math.max(loadingTargetRef.current, 76);

          const [profileRes] = await Promise.all([
            apiFetch('/api/student/profile', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(resolvedPayload),
            }),
            withTimeout(loadFeedRef.current().catch(() => undefined), 450, undefined),
          ]);
          skipNextAuthReadyFeedRef.current = true;

          if (profileRes.status === 403) {
            setBetaLocked(true);
            setAuthModalMode(null);
            setProfileOpen(false);
            return;
          }
          const data = (await profileRes.json()) as { student: StudentProfile };
          setStudent(data.student);
          saveLocalStudentProfile(user.uid, data.student);
          applyThemePreference(
            normalizeThemePreference(data.student.accessibilityPrefs?.themePreference) ||
              resolvedPayload.accessibilityPrefs?.themePreference ||
              'system',
            user.uid
          );

          // Always sync Firestore in background if Firestore is missing or missing any saved field
          const needsFirestoreBackfill =
            !fsFailed &&
            (!fsProfile ||
              (!fsProfile.phoneNumber && Boolean(data.student.phoneNumber)) ||
              (isPlaceholderName(fsProfile.displayName) && !isPlaceholderName(data.student.displayName)) ||
              (!fsProfile.rollNumber && Boolean(data.student.rollNumber)) ||
              (!hasChosenCollege(fsProfile) && hasChosenCollege(data.student)) ||
              (!fsProfile.accessibilityPrefs?.themePreference &&
                Boolean(data.student.accessibilityPrefs?.themePreference)) ||
              (!fsProfile.onboardingCompleted && data.student.onboardingCompleted));
          if (needsFirestoreBackfill) {
            saveStudentProfileToFirestore(user.uid, data.student).catch(() => {});
          }

          setAuthModalMode(null);

          const hasSavedCollege = hasChosenCollege(data.student);
          const isSignedInFixedStudent = Boolean(
            user.emailVerified && user.email?.trim().toLowerCase() === BETA_STUDENT_EMAIL
          );

          if (roleIntent === 'official' && !isSignedInFixedStudent) {
            const isFixedOfficial = Boolean(
              user.emailVerified && isBetaOfficialEmail(user.email)
            );
            const matchesBootOrg = (o: OrganizerAccount) =>
              Boolean(
                (o.authUid && o.authUid === user.uid) ||
                  (user.emailVerified &&
                    user.email &&
                    o.email.toLowerCase() === user.email.toLowerCase())
              );
            const bootClubLeader =
              bootOrganizers.find(
                (o) =>
                  matchesBootOrg(o) &&
                  o.status === 'approved' &&
                  o.memberRole === 'club_leader'
              ) ||
              (fsMembership?.status === 'approved' && fsMembership?.memberRole === 'club_leader'
                ? {
                    clubName: fsMembership.clubName || 'IIIT-H Tech & Innovation Club',
                  }
                : user.emailVerified && user.email?.trim().toLowerCase() === BETA_CLUB_LEADER_EMAIL
                  ? { clubName: 'IIIT-H Tech & Innovation Club' }
                  : null);
            const bootOfficial =
              bootOrganizers.find(
                (o) =>
                  matchesBootOrg(o) &&
                  o.status === 'approved' &&
                  o.memberRole === 'college_official'
              ) ||
              (fsMembership?.status === 'approved' &&
              fsMembership?.memberRole === 'college_official'
                ? fsMembership
                : null);
            const bootExternal = bootOrganizers.find(
              (o) =>
                matchesBootOrg(o) &&
                (o.memberRole === 'external_organizer' || o.accountType === 'external_organizer')
            );

            if (isFixedOfficial || bootOfficial) {
              setPortalRoute('officials');
              setActiveTab('organizer');
              if (window.location.pathname !== '/officials') {
                window.history.replaceState({}, '', '/officials');
              }
              showNotificationToast(
                'Campus Official Verified',
                `Signed in as ${user.email || data.student.displayName} · Opened Officials Console.`
              );
            } else if (bootClubLeader) {
              setPortalRoute('public');
              setActiveTab('my-club');
              showNotificationToast(
                'Club Leader Verified',
                `Opened Club Studio for ${bootClubLeader.clubName}.`
              );
            } else if (bootExternal) {
              setPortalRoute('public');
              setActiveTab('external');
              showNotificationToast(
                bootExternal.status === 'approved'
                  ? 'External Partner Verified'
                  : bootExternal.status === 'rejected'
                    ? 'External Application Rejected'
                    : 'Application Pending Review',
                bootExternal.status === 'approved'
                  ? `Opened External Organizer workspace for ${bootExternal.clubName}.`
                  : bootExternal.status === 'rejected'
                    ? 'Review the campus review note in the External Partner workspace.'
                    : 'Your External Partner application is waiting for Campus Governance approval.'
              );
            } else {
              setPortalRoute('officials');
              if (window.location.pathname !== '/officials') {
                window.history.replaceState({}, '', '/officials');
              }
              showNotificationToast(
                'Official Verification Needed',
                'No appointed official or club invite found for this Google account. Redeem an invite or apply as an external partner.'
              );
            }
          } else {
            if (isSignedInFixedStudent) {
              setPortalRoute('public');
              if (window.location.pathname !== '/') {
                window.history.replaceState({}, '', '/');
              }
              setActiveTab(hasSavedCollege ? 'my-events' : 'discover');
            } else if (hasSavedCollege && portalRouteRef.current === 'public') {
              setActiveTab('my-events');
            }

            if (hasSavedCollege) {
              markProfilePromptSeen(user.uid);
              if (intent === 'login') {
                const colLabel =
                  matchedCol?.shortName || data.student.customCollegeName || 'your college';
                showNotificationToast(
                  'Welcome back',
                  `Signed in as ${data.student.displayName} · Loaded ${colLabel} Campus Feed.`
                );
              } else if (intent === 'signup') {
                showNotificationToast(
                  'Existing Account Found',
                  `Loaded your saved profile and college for ${data.student.displayName}.`
                );
              }
            } else if (
              intent === 'signup' ||
              intent === 'login' ||
              !hasSavedCollege ||
              (!hasSeenProfilePrompt(user.uid) && promptedOnboardingUidRef.current !== user.uid)
            ) {
              promptedOnboardingUidRef.current = user.uid;
              setProfileOpen(true);
              if (intent === 'login' && !fsProfile && !localBackup) {
                showNotificationToast(
                  'Finish Creating Account',
                  `Select your college to finish setting up ${user.email || 'your Google account'}.`
                );
              }
            }
          }
        } catch {
          authHydratedRef.current = true;
          setAuthModalMode(null);
          const fallbackSource = localBackup || serverStudent || preAuthCollege;
          setStudent((prev) => {
            const base = prev || serverStudent;
            if (!base) return prev;
            const fallbackThemePref: ThemePreference =
              normalizeThemePreference(fsProfile?.accessibilityPrefs?.themePreference) ||
              normalizeThemePreference(fallbackSource?.accessibilityPrefs?.themePreference) ||
              getUserStoredTheme(user.uid) ||
              normalizeThemePreference(base.accessibilityPrefs?.themePreference) ||
              getGuestStoredTheme();
            const next: StudentProfile = {
              ...base,
              id: user.uid,
              authUid: user.uid,
              displayName: pickFirstRealName(
                fsProfile?.displayName,
                fallbackSource?.displayName,
                user.displayName,
                base.displayName
              ),
              email: pickFirstNonEmpty(
                fsProfile?.email,
                fallbackSource?.email,
                user.email,
                base.email
              ),
              phoneNumber: pickFirstNonEmpty(
                fsProfile?.phoneNumber,
                fallbackSource?.phoneNumber,
                base.phoneNumber
              ),
              photoUrl: pickFirstNonEmpty(
                fsProfile?.photoUrl,
                fallbackSource?.photoUrl,
                user.photoURL,
                base.photoUrl
              ),
              collegeId: fallbackSource?.collegeId || base.collegeId || 'other',
              customCollegeName: fallbackSource?.customCollegeName || base.customCollegeName || '',
              collegeVerified: Boolean(fallbackSource?.collegeVerified ?? base.collegeVerified),
              followedCollegeIds:
                fallbackSource?.followedCollegeIds || base.followedCollegeIds || [],
              accessibilityPrefs: {
                reducedMotion: Boolean(
                  fsProfile?.accessibilityPrefs?.reducedMotion ??
                    fallbackSource?.accessibilityPrefs?.reducedMotion ??
                    base.accessibilityPrefs?.reducedMotion
                ),
                highContrastFocus: Boolean(
                  fsProfile?.accessibilityPrefs?.highContrastFocus ??
                    fallbackSource?.accessibilityPrefs?.highContrastFocus ??
                    base.accessibilityPrefs?.highContrastFocus
                ),
                compactDensity: Boolean(
                  fsProfile?.accessibilityPrefs?.compactDensity ??
                    fallbackSource?.accessibilityPrefs?.compactDensity ??
                    base.accessibilityPrefs?.compactDensity
                ),
                themePreference: fallbackThemePref,
              },
              onboardingCompleted: Boolean(
                fallbackSource?.onboardingCompleted || hasChosenCollege(fallbackSource)
              ),
            };
            saveLocalStudentProfile(user.uid, next);
            applyThemePreference(fallbackThemePref, user.uid);
            return next;
          });
          if (hasChosenCollege(fallbackSource) && portalRouteRef.current === 'public') {
            setActiveTab('my-events');
          } else if (intent === 'signup' || intent === 'login' || !hasChosenCollege(fallbackSource)) {
            setProfileOpen(true);
          }
        }
      })();

      hydratingUidRef.current = user.uid;
      hydratingPromiseRef.current = run;
      try {
        await run;
      } finally {
        if (hydratingPromiseRef.current === run) {
          hydratingUidRef.current = null;
          hydratingPromiseRef.current = null;
        }
      }
    },
    [apiFetch, applyBootstrapData]
  );

  useEffect(() => {
    if (authReady) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      const next = loadingCompletingRef.current ? 100 : loadingTargetRef.current;
      loadingProgressRef.current = next;
      setLoadingProgress(next);
      return;
    }

    let rafId = 0;
    let holdTimer = 0;
    let disposed = false;
    const loopStartedAt = performance.now();
    let lastTime = loopStartedAt;
    let completionStartedAt: number | null = null;
    let completionFrom = loadingProgressRef.current;
    let completionFired = false;

    const step = (now: number) => {
      if (disposed) return;
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      if (loadingCompletingRef.current) {
        if (completionStartedAt === null) {
          completionStartedAt = now;
          completionFrom = loadingProgressRef.current;
        }
        const durationMs = 160;
        const t = Math.min(1, (now - completionStartedAt) / durationMs);
        const eased = 1 - Math.pow(1 - t, 2.5);
        const next = completionFrom + (100 - completionFrom) * eased;
        loadingProgressRef.current = next;
        setLoadingProgress(next);

        if (t < 1) {
          rafId = window.requestAnimationFrame(step);
        } else {
          loadingProgressRef.current = 100;
          setLoadingProgress(100);
          if (!completionFired) {
            completionFired = true;
            holdTimer = window.setTimeout(() => {
              if (disposed) return;
              const resolve = loadingCompletionResolveRef.current;
              loadingCompletionResolveRef.current = null;
              if (resolve) resolve();
            }, 40);
          }
        }
        return;
      }

      const elapsedSec = (now - loopStartedAt) / 1000;
      const continuousSweep = 16 + 66 * (1 - Math.exp(-elapsedSec * 2.2));
      const desiredTarget = Math.min(84, Math.max(loadingTargetRef.current, continuousSweep));

      const curr = loadingProgressRef.current;
      const next = Math.max(curr, curr + (desiredTarget - curr) * Math.min(1, dt * 14));
      if (Math.abs(next - curr) > 0.01) {
        loadingProgressRef.current = next;
        setLoadingProgress(next);
      }

      rafId = window.requestAnimationFrame(step);
    };

    rafId = window.requestAnimationFrame(step);
    return () => {
      disposed = true;
      if (rafId) window.cancelAnimationFrame(rafId);
      if (holdTimer) window.clearTimeout(holdTimer);
    };
  }, [authReady]);

  useEffect(() => {
    // Prefetch bootstrap & feed immediately on mount while Firebase Auth initializes
    const initialPublicBootPromise = Promise.allSettled([
      loadBootstrapRef.current().catch(() => undefined),
      loadFeedRef.current().catch(() => undefined),
    ]);

    const finishBoot = async () => {
      if (!initialBootSettledRef.current) {
        initialBootSettledRef.current = true;
        const prefersReducedMotion =
          typeof window !== 'undefined' &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        setLoadingStage('ready');
        loadingTargetRef.current = 100;
        loadingCompletingRef.current = true;

        if (prefersReducedMotion) {
          loadingProgressRef.current = 100;
          setLoadingProgress(100);
          await new Promise((resolve) => window.setTimeout(resolve, 30));
        } else {
          await new Promise<void>((resolve) => {
            let done = false;
            const finish = () => {
              if (done) return;
              done = true;
              loadingCompletionResolveRef.current = null;
              resolve();
            };
            loadingCompletionResolveRef.current = finish;
            window.setTimeout(finish, 240);
          });
        }
      } else {
        setLoadingStage('ready');
        loadingTargetRef.current = 100;
        loadingCompletingRef.current = true;
        loadingProgressRef.current = 100;
        setLoadingProgress(100);
      }
      setAuthReady(true);
    };

    const unsub = subscribeAuthState(async (user) => {
      authUserRef.current = user;
      setFirebaseUser(user);
      if (!user) {
        authHydratedRef.current = false;
        officialAutoEnteredRef.current = false;
        promptedOnboardingUidRef.current = null;
        setOfficialMembership(null);
        setIsBetaManagerState(false);
        setOrganizers([]);
        setActiveOrganizerId('');
        setProfileOpen(false);
        applyThemePreference(getGuestStoredTheme(), null);
        setLoadingStage('feed');
        loadingTargetRef.current = Math.max(loadingTargetRef.current, 78);
        await withTimeout(initialPublicBootPromise, 550, undefined);
        skipNextAuthReadyFeedRef.current = true;
        await finishBoot();
        return;
      }
      await hydrateSignedInUser(user).catch(() => {});
      await finishBoot();
    });
    return () => unsub();
  }, [hydrateSignedInUser]);

  const selectedEvent =
    allEvents.find((e) => e.id === selectedEventId) ||
    feedEvents.find((e) => e.id === selectedEventId) ||
    campusEvents.find((e) => e.id === selectedEventId) ||
    participatedEvents.find((e) => e.id === selectedEventId) ||
    null;

  function showNotificationToast(title: string, body: string) {
    setToastBanner({ title, body });
    setTimeout(() => {
      setToastBanner((curr) => (curr?.title === title ? null : curr));
    }, 8000);
  }

  async function handleGoogleSignIn() {
    const user = await signInStudentWithGoogle();
    if (user && authUserRef.current?.uid === user.uid) {
      await hydrateSignedInUser(user);
    }
  }

  async function handleAuthFlowLogin(roleHint?: AuthRoleIntent) {
    authIntentRef.current = 'login';
    authRoleIntentRef.current = roleHint || null;
    try {
      const user = await signInStudentWithGoogle();
      if (user && authUserRef.current?.uid === user.uid) {
        await hydrateSignedInUser(user);
      }
    } catch (err) {
      authIntentRef.current = null;
      authRoleIntentRef.current = null;
      throw err;
    }
  }

  async function handleAuthFlowSignUp(roleHint?: AuthRoleIntent) {
    authIntentRef.current = 'signup';
    authRoleIntentRef.current = roleHint || null;
    try {
      const user = await signInStudentWithGoogle();
      if (user && authUserRef.current?.uid === user.uid) {
        await hydrateSignedInUser(user);
      }
    } catch (err) {
      authIntentRef.current = null;
      authRoleIntentRef.current = null;
      throw err;
    }
  }

  async function handleGoogleSignOut() {
    await signOutStudent().catch(() => {});
    authUserRef.current = null;
    authHydratedRef.current = false;
    officialAutoEnteredRef.current = false;
    promptedOnboardingUidRef.current = null;
    authIntentRef.current = null;
    authRoleIntentRef.current = null;
    guestKeyRef.current = rotateGuestKey();
    setGuestBrowsing(false);
    setStudent(null);
    applyThemePreference(getGuestStoredTheme(), null);
    setOfficialMembership(null);
    setIsBetaManagerState(false);
    setOrganizers([]);
    setActiveOrganizerId('');
    setPortalRoute('public');
    setActiveTab('discover');
    if (window.location.pathname !== '/' && !new URLSearchParams(window.location.search).has('invite')) {
      window.history.replaceState({}, '', '/');
    }
    setProfileOpen(false);
    setAuthModalMode(null);
    await loadBootstrap();
    await loadFeed();
    showNotificationToast('Signed out', 'Session closed. Ready for a fresh sign up or log in.');
  }

  useEffect(() => {
    if (!authReady) return;
    if (skipNextAuthReadyFeedRef.current) {
      skipNextAuthReadyFeedRef.current = false;
      return;
    }
    void loadFeed();
  }, [authReady, loadFeed]);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let disposed = false;

    const upsertById = <T extends { id: string }>(list: T[], item: T, prepend = true): T[] => {
      const idx = list.findIndex((x) => x.id === item.id);
      if (idx >= 0) {
        return list.map((x) => (x.id === item.id ? item : x));
      }
      return prepend ? [item, ...list] : [...list, item];
    };

    const connect = async () => {
      if (disposed || betaLockedRef.current) return;
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const activeUser = authUserRef.current;
      const params = new URLSearchParams();
      if (activeUser) {
        try {
          const token = await activeUser.getIdToken();
          if (token) params.set('token', token);
        } catch {
          // ignore token fetch error
        }
      } else {
        params.set('guestKey', guestKeyRef.current);
      }
      if (disposed || betaLockedRef.current) return;
      ws = new WebSocket(`${proto}//${window.location.host}/ws/team-chat?${params.toString()}`);

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as
            | {
                type: 'teams:init';
                partnerPosts: PartnerPost[];
                publicSquads: PublicSquadSummary[];
                mySquads: Squad[];
                connectionRequests: ConnectionRequest[];
                joinRequests: SquadJoinRequest[];
                teamUpCalls: TeamUpCall[];
                conversations: TeamConversation[];
                chatMessages: TeamChatMessage[];
                registrationSnapshots: SquadRegistrationSnapshot[];
                notifications?: NotificationItem[];
              }
            | { type: 'partner:created'; post: PartnerPost }
            | { type: 'partner:removed'; id: string }
            | { type: 'publicSquad:upserted'; summary: PublicSquadSummary }
            | { type: 'publicSquad:removed'; id: string }
            | { type: 'squad:upserted'; squad: Squad }
            | { type: 'squad:removed'; id: string }
            | { type: 'connectionRequest:upserted'; request: ConnectionRequest }
            | { type: 'joinRequest:upserted'; request: SquadJoinRequest }
            | { type: 'teamUpCall:upserted'; call: TeamUpCall }
            | { type: 'conversation:upserted'; conversation: TeamConversation }
            | { type: 'message:created'; message: TeamChatMessage }
            | { type: 'snapshot:upserted'; snapshot: SquadRegistrationSnapshot }
            | { type: 'notification:created'; notification: NotificationItem }
            | { type: 'feed:refresh' }
            | { type: 'officials:refresh'; collegeId?: string }
            | { type: 'beta:locked' };

          if (payload.type === 'teams:init') {
            setPartnerPosts(payload.partnerPosts || []);
            setPublicSquads(payload.publicSquads || []);
            setMySquads(payload.mySquads || []);
            setConnectionRequests(payload.connectionRequests || []);
            setJoinRequests(payload.joinRequests || []);
            setTeamUpCalls(payload.teamUpCalls || []);
            setConversations(payload.conversations || []);
            setChatMessages(payload.chatMessages || []);
            setRegistrationSnapshots(payload.registrationSnapshots || []);
            if (Array.isArray(payload.notifications)) {
              setNotifications(payload.notifications);
            }
          } else if (payload.type === 'partner:created') {
            setPartnerPosts((prev) => upsertById(prev, payload.post, true));
          } else if (payload.type === 'partner:removed') {
            setPartnerPosts((prev) => prev.filter((p) => p.id !== payload.id));
          } else if (payload.type === 'publicSquad:upserted') {
            setPublicSquads((prev) => upsertById(prev, payload.summary, true));
          } else if (payload.type === 'publicSquad:removed') {
            setPublicSquads((prev) => prev.filter((s) => s.id !== payload.id));
          } else if (payload.type === 'squad:upserted') {
            setMySquads((prev) => upsertById(prev, payload.squad, true));
          } else if (payload.type === 'squad:removed') {
            setMySquads((prev) => prev.filter((s) => s.id !== payload.id));
            setActiveTeamRoom((curr) =>
              curr?.scope === 'squad' && curr.id === payload.id ? null : curr
            );
          } else if (payload.type === 'connectionRequest:upserted') {
            setConnectionRequests((prev) => upsertById(prev, payload.request, true));
          } else if (payload.type === 'joinRequest:upserted') {
            setJoinRequests((prev) => upsertById(prev, payload.request, true));
          } else if (payload.type === 'teamUpCall:upserted') {
            setTeamUpCalls((prev) => upsertById(prev, payload.call, true));
          } else if (payload.type === 'conversation:upserted') {
            setConversations((prev) => upsertById(prev, payload.conversation, true));
          } else if (payload.type === 'message:created') {
            setChatMessages((prev) =>
              prev.some((m) => m.id === payload.message.id) ? prev : [...prev, payload.message]
            );
          } else if (payload.type === 'snapshot:upserted') {
            setRegistrationSnapshots((prev) => upsertById(prev, payload.snapshot, true));
          } else if (payload.type === 'notification:created') {
            setNotifications((prev) =>
              prev.some((n) => n.id === payload.notification.id)
                ? prev
                : [payload.notification, ...prev]
            );
            showNotificationToast(payload.notification.title, payload.notification.body);
          } else if (payload.type === 'feed:refresh') {
            loadFeedRef.current();
            loadBootstrapRef.current();
          } else if (payload.type === 'officials:refresh') {
            loadBootstrapRef.current();
          } else if (payload.type === 'beta:locked') {
            setBetaLocked(true);
          }
        } catch {
          // ignore malformed frames
        }
      };

      ws.onclose = () => {
        if (!disposed && !betaLockedRef.current) {
          reconnectTimer = window.setTimeout(connect, 2500);
        }
      };
    };

    connect();

    return () => {
      disposed = true;
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
      }
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        ws.close();
      }
    };
  }, [firebaseUser?.uid, betaLocked]);

  useEffect(() => {
    if (!firebaseUser?.uid || !firebaseUser.emailVerified || betaLocked) return;

    const latest: {
      events?: CampusEvent[];
      registrations?: Registration[];
      announcements?: CampusAnnouncement[];
      notifications?: NotificationItem[];
      partnerPosts?: PartnerPost[];
      squads?: Squad[];
      connectionRequests?: ConnectionRequest[];
      joinRequests?: SquadJoinRequest[];
      teamUpCalls?: TeamUpCall[];
      conversations?: TeamConversation[];
      chatMessages?: TeamChatMessage[];
      registrationSnapshots?: SquadRegistrationSnapshot[];
      surveys?: CampusSurvey[];
      eventFeedback?: EventFeedback[];
      surveyResponses?: SurveyResponse[];
    } = {};
    let timer: number | null = null;
    let disposed = false;

    const scheduleReconcile = () => {
      if (disposed) return;
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(async () => {
        if (disposed) return;
        try {
          const res = await apiFetch('/api/sync/reconcile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(latest),
          });
          if (!res.ok) return;
          const data = (await res.json()) as { changed?: boolean };
          if (data.changed) {
            await loadBootstrapRef.current();
            await loadFeedRef.current();
          }
        } catch {
          // ignore transient sync error
        }
      }, 350);
    };

    const unsubs = [
      subscribeEventsFromFirestore(isBetaManager, firebaseUser.uid, (items) => {
        latest.events = items;
        scheduleReconcile();
      }),
      subscribeRegistrationsFromFirestore(isBetaManager, firebaseUser.uid, (items) => {
        latest.registrations = items;
        scheduleReconcile();
      }),
      subscribeAnnouncementsFromFirestore((items) => {
        latest.announcements = items;
        scheduleReconcile();
      }),
      subscribeMyNotificationsFromFirestore(firebaseUser.uid, firebaseUser.email, (items) => {
        latest.notifications = items;
        scheduleReconcile();
      }),
      subscribePartnerPostsFromFirestore((items) => {
        latest.partnerPosts = items;
        scheduleReconcile();
      }),
      subscribeSquadsFromFirestore(isBetaManager, firebaseUser.uid, (items) => {
        latest.squads = items;
        scheduleReconcile();
      }),
      subscribeConnectionRequestsFromFirestore(isBetaManager, firebaseUser.uid, (items) => {
        latest.connectionRequests = items;
        scheduleReconcile();
      }),
      subscribeJoinRequestsFromFirestore(isBetaManager, firebaseUser.uid, (items) => {
        latest.joinRequests = items;
        scheduleReconcile();
      }),
      subscribeTeamUpCallsFromFirestore(isBetaManager, firebaseUser.uid, (items) => {
        latest.teamUpCalls = items;
        scheduleReconcile();
      }),
      subscribeConversationsFromFirestore(isBetaManager, firebaseUser.uid, (items) => {
        latest.conversations = items;
        scheduleReconcile();
      }),
      subscribeChatMessagesFromFirestore(isBetaManager, firebaseUser.uid, (items) => {
        latest.chatMessages = items;
        scheduleReconcile();
      }),
      subscribeRegistrationSnapshotsFromFirestore(isBetaManager, firebaseUser.uid, (items) => {
        latest.registrationSnapshots = items;
        scheduleReconcile();
      }),
      subscribeSurveysFromFirestore((items) => {
        latest.surveys = items;
        scheduleReconcile();
      }),
      subscribeEventFeedbackFromFirestore(isBetaManager, firebaseUser.uid, (items) => {
        latest.eventFeedback = items;
        scheduleReconcile();
      }),
      subscribeSurveyResponsesFromFirestore(isBetaManager, firebaseUser.uid, (items) => {
        latest.surveyResponses = items;
        scheduleReconcile();
      }),
      subscribeStudentProfileFromFirestore(firebaseUser.uid, (fsDoc) => {
        if (!fsDoc || authUserRef.current?.uid !== firebaseUser.uid) return;
        const remoteTheme = normalizeThemePreference(fsDoc.accessibilityPrefs?.themePreference);
        if (!remoteTheme) return;
        const currentTheme = normalizeThemePreference(
          studentRef.current?.accessibilityPrefs?.themePreference
        );
        if (remoteTheme !== currentTheme) {
          applyThemePreference(remoteTheme, firebaseUser.uid);
          setStudent((prev) => {
            if (!prev) return prev;
            const next: StudentProfile = {
              ...prev,
              accessibilityPrefs: {
                reducedMotion: Boolean(
                  fsDoc.accessibilityPrefs?.reducedMotion ?? prev.accessibilityPrefs?.reducedMotion
                ),
                highContrastFocus: Boolean(
                  fsDoc.accessibilityPrefs?.highContrastFocus ??
                    prev.accessibilityPrefs?.highContrastFocus
                ),
                compactDensity: Boolean(
                  fsDoc.accessibilityPrefs?.compactDensity ?? prev.accessibilityPrefs?.compactDensity
                ),
                themePreference: remoteTheme,
              },
            };
            saveLocalStudentProfile(firebaseUser.uid, next);
            return next;
          });
        }
      }),
    ];

    return () => {
      disposed = true;
      if (timer !== null) window.clearTimeout(timer);
      for (const unsub of unsubs) unsub();
    };
  }, [firebaseUser?.uid, firebaseUser?.email, firebaseUser?.emailVerified, betaLocked, isBetaManager, apiFetch]);

  async function handleSaveStudentData(updates: Partial<StudentProfile>, message: string) {
    const activeUser = authUserRef.current || firebaseUser;
    const prevCollegeId = studentRef.current?.collegeId;
    const prevCustomCollege = (studentRef.current?.customCollegeName || '').trim();
    const res = await apiFetch('/api/student/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const data = (await res.json()) as {
      student: StudentProfile;
      notifications?: NotificationItem[];
      newPriorityAlerts?: NotificationItem[];
      error?: string;
    };
    if (!res.ok) {
      throw new Error(data.error || 'Could not save student profile.');
    }
    authHydratedRef.current = true;
    if (activeUser) {
      promptedOnboardingUidRef.current = activeUser.uid;
      markProfilePromptSeen(activeUser.uid);
      saveLocalStudentProfile(activeUser.uid, data.student);
    }
    setStudent(data.student);
    if (Array.isArray(data.notifications)) {
      setNotifications(data.notifications);
    }

    if (activeUser) {
      try {
        await saveStudentProfileToFirestore(activeUser.uid, data.student);
      } catch (err) {
        console.warn('Firestore profile sync deferred; local and server session saved.', err);
      }
    }

    await loadFeed();

    const collegeUpdated =
      (updates.collegeId !== undefined && updates.collegeId !== prevCollegeId) ||
      (updates.customCollegeName !== undefined &&
        updates.customCollegeName.trim() !== prevCustomCollege) ||
      Boolean(updates.onboardingCompleted);

    if (
      collegeUpdated &&
      hasChosenCollege(data.student) &&
      portalRouteRef.current === 'public'
    ) {
      setActiveTab('my-events');
      smoothScrollPageTop();
    }

    if (Array.isArray(data.newPriorityAlerts) && data.newPriorityAlerts.length > 0) {
      const firstAlert = data.newPriorityAlerts[0];
      showNotificationToast(
        firstAlert.title,
        `${firstAlert.eventTitle} matches your skills and seats are filling quickly.`
      );
    } else {
      showNotificationToast('Saved', message);
    }
  }

  const handleChangeTheme = useCallback(
    async (pref: ThemePreference) => {
      const activeUser = authUserRef.current || firebaseUser;
      const uid = activeUser?.uid ?? null;
      applyThemePreference(pref, uid);
      if (!activeUser) return;

      const prevStudent = studentRef.current;
      const nextAccessibilityPrefs = {
        reducedMotion: Boolean(prevStudent?.accessibilityPrefs?.reducedMotion),
        highContrastFocus: Boolean(prevStudent?.accessibilityPrefs?.highContrastFocus),
        compactDensity: Boolean(prevStudent?.accessibilityPrefs?.compactDensity),
        themePreference: pref,
      };
      if (prevStudent) {
        const optimistic: StudentProfile = {
          ...prevStudent,
          accessibilityPrefs: nextAccessibilityPrefs,
        };
        setStudent(optimistic);
        saveLocalStudentProfile(activeUser.uid, optimistic);
      }

      try {
        const res = await apiFetch('/api/student/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessibilityPrefs: nextAccessibilityPrefs }),
        });
        if (res.ok) {
          const data = (await res.json()) as { student?: StudentProfile };
          if (data.student) {
            setStudent(data.student);
            saveLocalStudentProfile(activeUser.uid, data.student);
            saveStudentProfileToFirestore(activeUser.uid, data.student).catch(() => {});
          }
        }
      } catch {
        // local UID storage remains intact
      }
    },
    [apiFetch, firebaseUser]
  );

  async function handleDeleteAccount() {
    const activeUser = authUserRef.current || firebaseUser;
    if (activeUser) {
      await deleteAllStudentDataFromFirestore(activeUser.uid).catch(() => {});
      promptedOnboardingUidRef.current = activeUser.uid;
      clearProfilePromptSeen(activeUser.uid);
      clearLocalStudentProfile(activeUser.uid);
      clearUserStoredTheme(activeUser.uid);
    }
    applyThemePreference(getGuestStoredTheme(), null);
    authHydratedRef.current = false;
    const res = await apiFetch('/api/student/delete-account', { method: 'POST' });
    const data = await res.json();
    setStudent(data.student);
    await loadBootstrap();
    await loadFeed();
    showNotificationToast('Account data deleted', 'Your personal profile and registrations were erased.');
  }

  async function handleToggleFollow(collegeId: string) {
    const activeUser = authUserRef.current || firebaseUser;
    const res = await apiFetch('/api/student/follow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collegeId }),
    });
    const data = await res.json();
    setStudent(data.student);
    if (activeUser) {
      saveLocalStudentProfile(activeUser.uid, data.student);
      saveStudentProfileToFirestore(activeUser.uid, data.student).catch(() => {});
    }
    await loadFeed();
  }

  async function handleToggleSave(eventId: string) {
    const activeUser = authUserRef.current || firebaseUser;
    const res = await apiFetch('/api/student/save-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId }),
    });
    const data = await res.json();
    setStudent(data.student);
    if (activeUser && data.student) {
      saveLocalStudentProfile(activeUser.uid, data.student);
      saveStudentProfileToFirestore(activeUser.uid, data.student).catch(() => {});
    }
    await loadFeed();
  }

  async function handleRegister(
    eventId: string,
    payload?: {
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
  ): Promise<Registration | null> {
    const res = await apiFetch(`/api/events/${eventId}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {}),
    });
    const data = await res.json();
    if (!res.ok) {
      showNotificationToast('Registration note', data.error || 'Could not register.');
      return null;
    }
    if (Array.isArray(data.notifications)) {
      setNotifications(data.notifications);
    }
    if (data.snapshot) {
      const snap = data.snapshot as SquadRegistrationSnapshot;
      setRegistrationSnapshots((prev) => {
        const idx = prev.findIndex((s) => s.id === snap.id);
        return idx >= 0 ? prev.map((s) => (s.id === snap.id ? snap : s)) : [snap, ...prev];
      });
      syncRegistrationSnapshotToFirestore(snap).catch(() => {});
    }
    if (data.event) {
      syncEventCountsToFirestore(
        data.event.id,
        data.event.confirmedCount,
        data.event.waitlistCount
      ).catch(() => {});
    }
    if (data.registration) {
      const reg = data.registration as Registration;
      setRegistrations((prev) => {
        const idx = prev.findIndex((r) => r.id === reg.id);
        return idx >= 0 ? prev.map((r) => (r.id === reg.id ? reg : r)) : [reg, ...prev];
      });
      const patchEvent = (evt: FeedEvent): FeedEvent =>
        evt.id === eventId
          ? {
              ...evt,
              ...(data.event ? {
                confirmedCount: data.event.confirmedCount,
                waitlistCount: data.event.waitlistCount,
              } : {}),
              myRegistrationStatus: reg.status,
              myRegistration: reg,
            }
          : evt;
      setAllEvents((prev) => prev.map(patchEvent));
      setFeedEvents((prev) => prev.map(patchEvent));
      setCampusEvents((prev) => prev.map(patchEvent));
      setParticipatedEvents((prev) => {
        const updated = prev.map(patchEvent);
        if (!updated.some((e) => e.id === eventId)) {
          const found =
            allEvents.find((e) => e.id === eventId) ||
            feedEvents.find((e) => e.id === eventId) ||
            campusEvents.find((e) => e.id === eventId);
          if (found) return [patchEvent(found), ...updated];
        }
        return updated;
      });
      syncRegistrationToFirestore(
        reg,
        (data.event as CampusEvent | undefined)?.collegeId || student?.collegeId || 'col-mrdu'
      ).catch(() => {});
    }
    if (data.student) {
      const updatedStudent = data.student as StudentProfile;
      setStudent(updatedStudent);
      const activeUser = authUserRef.current || firebaseUser;
      if (activeUser) {
        saveLocalStudentProfile(activeUser.uid, updatedStudent);
        saveStudentProfileToFirestore(activeUser.uid, updatedStudent).catch(() => {});
      }
    }
    void loadFeed();
    void loadBootstrap();
    showNotificationToast(
      data.registration.status === 'confirmed'
        ? `E-Ticket Issued · ${data.registration.passCode}`
        : 'Added to Waitlist',
      data.registration.status === 'confirmed'
        ? 'Your booking and E-Ticket pass are saved in the Bookings tab.'
        : 'You will be auto-promoted if a confirmed seat opens.'
    );
    return (data.registration as Registration) || null;
  }

  async function handleUpdatePassPhoto(
    eventId: string,
    registrationId: string,
    photoUrl: string
  ): Promise<void> {
    const res = await apiFetch(`/api/events/${encodeURIComponent(eventId)}/pass-photo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        registrationId,
        photoUrl,
        saveToProfile: true,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Could not update pass photo.');
    }
    if (data.registration) {
      const reg = data.registration as Registration;
      setRegistrations((prev) => {
        const idx = prev.findIndex((r) => r.id === reg.id);
        return idx >= 0 ? prev.map((r) => (r.id === reg.id ? reg : r)) : [reg, ...prev];
      });
      const patchReg = (evt: FeedEvent): FeedEvent =>
        evt.id === eventId
          ? {
              ...evt,
              myRegistrationStatus: reg.status,
              myRegistration: reg,
            }
          : evt;
      setAllEvents((prev) => prev.map(patchReg));
      setFeedEvents((prev) => prev.map(patchReg));
      setCampusEvents((prev) => prev.map(patchReg));
      setParticipatedEvents((prev) => prev.map(patchReg));
      const evtCollegeId =
        allEvents.find((e) => e.id === eventId)?.collegeId ||
        feedEvents.find((e) => e.id === eventId)?.collegeId ||
        student?.collegeId ||
        'col-mrdu';
      syncRegistrationToFirestore(reg, evtCollegeId).catch(() => {});
    }
    if (data.student) {
      const updatedStudent = data.student as StudentProfile;
      setStudent(updatedStudent);
      const activeUser = authUserRef.current || firebaseUser;
      if (activeUser) {
        saveLocalStudentProfile(activeUser.uid, updatedStudent);
        saveStudentProfileToFirestore(activeUser.uid, updatedStudent).catch(() => {});
      }
    }
    showNotificationToast(
      'Entry Pass Photo Updated',
      'Your pass photo is saved to your E-Ticket and Connectus profile.'
    );
  }

  async function handleCancelRegistration(eventId: string) {
    const res = await apiFetch(`/api/events/${eventId}/cancel-registration`, { method: 'POST' });
    const data = await res.json();
    if (data.notifications) setNotifications(data.notifications);
    if (data.event) {
      syncEventCountsToFirestore(
        data.event.id,
        data.event.confirmedCount,
        data.event.waitlistCount
      ).catch(() => {});
    }
    if (data.registration) {
      syncRegistrationToFirestore(
        data.registration as Registration,
        (data.event as CampusEvent | undefined)?.collegeId || student?.collegeId || 'col-mrdu'
      ).catch(() => {});
    }
    await loadFeed();
    await loadBootstrap();
    if (data.promotedName) {
      showNotificationToast(
        'Waitlist Auto-Promoted',
        `${data.promotedName} was automatically promoted from the waitlist and notified on Telegram.`
      );
    }
  }

  async function handleCheckIn(
    eventId: string,
    payload: CheckInPayload
  ): Promise<Registration | null> {
    const res = await apiFetch(`/api/events/${eventId}/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        organizerId: activeOrganizerId,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Check-in failed.');
    }
    if (data.event) {
      syncEventCountsToFirestore(
        data.event.id,
        data.event.confirmedCount,
        data.event.waitlistCount
      ).catch(() => {});
    }
    if (data.registration) {
      syncRegistrationToFirestore(
        data.registration as Registration,
        (data.event as CampusEvent | undefined)?.collegeId || student?.collegeId || 'col-mrdu'
      ).catch(() => {});
    }
    if (data.registrations) {
      setRegistrations(data.registrations);
      await loadFeed();
      await loadBootstrap();
    }
    return (data.registration as Registration) || null;
  }

  async function handleReportEvent(eventId: string, reason: string) {
    const res = await apiFetch(`/api/events/${eventId}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    const data = await res.json();
    setReports(data.reports);
  }

  async function handleConnectTelegram() {
    if (!student) return;
    const activeUser = authUserRef.current || firebaseUser;
    const res = await apiFetch('/api/student/telegram-connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: student.telegramDeepLinkToken }),
    });
    const data = await res.json();
    setStudent(data.student);
    setNotifications(data.notifications);
    if (activeUser && data.student) {
      saveLocalStudentProfile(activeUser.uid, data.student);
      saveStudentProfileToFirestore(activeUser.uid, data.student).catch(() => {});
    }
  }

  async function handleSendTelegramCommand(command: string) {
    const activeUser = authUserRef.current || firebaseUser;
    const res = await apiFetch('/api/student/telegram-command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command }),
    });
    const data = await res.json();
    setStudent(data.student);
    setNotifications(data.notifications);
    if (activeUser && data.student) {
      saveLocalStudentProfile(activeUser.uid, data.student);
      saveStudentProfileToFirestore(activeUser.uid, data.student).catch(() => {});
    }
  }

  async function handleFlushDigest() {
    const res = await apiFetch('/api/notifications/flush-digest', { method: 'POST' });
    const data = await res.json();
    setNotifications(data.notifications);
    if (data.flushedCount > 0) {
      showNotificationToast('8:00 AM Digest Delivered', `${data.flushedCount} queued alert(s) sent to Telegram.`);
    }
  }

  async function handleSubmitSuggestion(payload: SuggestEventPayload) {
    const res = await apiFetch('/api/events/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setPendingSuggestions(data.pendingSuggestions);
    showNotificationToast('Suggestion Received', 'Sent to the Campus Official queue for review before publishing.');
  }

  async function handleSelectOrganizer(organizerId: string) {
    const res = await apiFetch('/api/organizer/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organizerId }),
    });
    if (res.ok) {
      setActiveOrganizerId(organizerId);
    }
  }

  async function handleSignInOrganizer(payload: {
    clubName: string;
    organizationName?: string;
    organizationWebsite?: string;
    organizationCategory?: string;
    contactName: string;
    designation: string;
    email: string;
    facultyEmail?: string;
    collegeId: string;
    proofNote: string;
  }) {
    const activeUser = authUserRef.current || firebaseUser;
    const res = await apiFetch('/api/organizer/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, authUid: activeUser?.uid }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Could not submit External Partner application.');
    }
    if (data.organizers) setOrganizers(data.organizers);
    if (data.activeOrganizerId) setActiveOrganizerId(data.activeOrganizerId);

    if (activeUser) {
      const col = colleges.find((c) => c.id === payload.collegeId);
      const domain = (payload.email.split('@')[1] || '').toLowerCase();
      const domainMatched = Boolean(col && domain === col.emailDomain.toLowerCase());
      await submitOrganizerApplicationToFirestore(activeUser.uid, {
        clubName: payload.organizationName || payload.clubName,
        contactName: payload.contactName,
        designation: payload.designation,
        officialEmail: payload.email,
        facultyEmail: payload.facultyEmail || payload.organizationWebsite || '',
        collegeId: payload.collegeId,
        domainMatched,
        proofNote: payload.proofNote || 'External organizer verification submitted.',
      }).catch(() => {});
    }
    await loadBootstrap();
    showNotificationToast(
      'External Partner Application Submitted',
      'Your verification request is now in the Campus Governance review queue.'
    );
  }

  async function handleCreateInvite(payload: {
    clubName: string;
    targetEmail?: string;
    maxUses: number;
    singleUse?: boolean;
    expiresInDays?: number;
    organizerId?: string;
  }): Promise<OfficialInvite> {
    const res = await apiFetch('/api/officials/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        organizerId: payload.organizerId || matchedCampusOfficial?.id || activeOrganizerId,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Could not generate invite link.');
    }
    setOfficialInvites(data.officialInvites);
    if (data.auditLog) setAuditLog(data.auditLog);

    if (firebaseUser && data.invite) {
      saveOfficialInviteToFirestore({
        token: data.invite.token,
        code: data.invite.code,
        collegeId: data.invite.collegeId,
        clubName: data.invite.clubName,
        createdByUid: firebaseUser.uid,
        createdByName: data.invite.createdByName,
        createdByEmail: data.invite.createdByEmail,
        targetEmail: data.invite.targetEmail,
        maxUses: data.invite.maxUses,
      }).catch(() => {});
    }

    showNotificationToast(
      'Club Leader Invite Created',
      `Share code ${data.invite.code} with your invited club leader.`
    );
    return data.invite as OfficialInvite;
  }

  async function handleRevokeInvite(token: string) {
    const res = await apiFetch(`/api/officials/invites/${encodeURIComponent(token)}/revoke`, {
      method: 'POST',
    });
    const data = await res.json();
    if (res.ok) {
      setOfficialInvites(data.officialInvites);
      if (data.auditLog) setAuditLog(data.auditLog);
      showNotificationToast('Invite Revoked', 'That club leader invite link is no longer active.');
    }
  }

  const handleLookupInvite = useCallback(
    async (tokenOrCode: string) => {
      const res = await apiFetch(`/api/officials/invites/${encodeURIComponent(tokenOrCode)}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invite link or code not found.');
      }
      return data as { invite: OfficialInvite; college: College | null };
    },
    [apiFetch]
  );

  async function handleAcceptInvite(payload: {
    tokenOrCode: string;
    contactName: string;
    email: string;
    clubName: string;
  }) {
    let activeUser = authUserRef.current || firebaseUser;
    if (!activeUser) {
      authRoleIntentRef.current = 'official';
      activeUser = await signInStudentWithGoogle();
      if (activeUser) {
        authUserRef.current = activeUser;
      }
    }
    const res = await apiFetch(
      `/api/officials/invites/${encodeURIComponent(payload.tokenOrCode)}/accept`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactName: payload.contactName,
          email: payload.email,
          clubName: payload.clubName,
          authUid: activeUser?.uid,
        }),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Could not accept invite.');
    }

    if (activeUser && data.organizer) {
      await acceptOfficialInviteInFirestore({
        uid: activeUser.uid,
        inviteToken: data.organizer.inviteToken || payload.tokenOrCode,
        collegeId: data.organizer.collegeId,
        clubName: data.organizer.clubName,
        contactName: data.organizer.contactName,
        email: data.organizer.email,
      })
        .then(() => fetchOfficialMembershipFromFirestore(activeUser.uid))
        .then((m) => setOfficialMembership(m))
        .catch(() => {});
    }

    setBetaLocked(false);
    await loadBootstrap();
    if (activeUser) {
      await hydrateSignedInUser(activeUser);
    }
    await loadFeed();
    if (data.organizers) setOrganizers(data.organizers);
    if (data.activeOrganizerId) setActiveOrganizerId(data.activeOrganizerId);
    if (data.officialInvites) setOfficialInvites(data.officialInvites);
    if (data.auditLog) setAuditLog(data.auditLog);
    setPortalRoute('public');
    setActiveTab('my-club');
    window.history.replaceState({}, '', '/');
    smoothScrollPageTop();

    showNotificationToast(
      'Joined My Club Workspace',
      `${data.organizer.contactName} (${data.organizer.clubName}) can now draft posters and submit events for official review.`
    );
  }

  async function handleRevokeMember(memberId: string) {
    const res = await apiFetch(`/api/officials/members/${encodeURIComponent(memberId)}/revoke`, {
      method: 'POST',
    });
    const data = await res.json();
    if (res.ok) {
      setOrganizers(data.organizers);
      setActiveOrganizerId(data.activeOrganizerId);
      if (data.auditLog) setAuditLog(data.auditLog);
      showNotificationToast('Member Removed', 'Club leader access was revoked from the Official List.');
    }
  }

  async function handleReplaceMember(
    memberId: string,
    payload: { newLeaderEmail?: string; clubName?: string }
  ): Promise<OfficialInvite> {
    const res = await apiFetch(`/api/officials/members/${encodeURIComponent(memberId)}/replace`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Could not replace Club Leader.');
    }
    if (data.organizers) setOrganizers(data.organizers);
    if (data.officialInvites) setOfficialInvites(data.officialInvites);
    if (data.auditLog) setAuditLog(data.auditLog);
    if (firebaseUser && data.invite) {
      saveOfficialInviteToFirestore({
        token: data.invite.token,
        code: data.invite.code,
        collegeId: data.invite.collegeId,
        clubName: data.invite.clubName,
        createdByUid: firebaseUser.uid,
        createdByName: data.invite.createdByName,
        createdByEmail: data.invite.createdByEmail,
        targetEmail: data.invite.targetEmail,
        maxUses: data.invite.maxUses,
      }).catch(() => {});
    }
    showNotificationToast(
      'Club Leader Replaced',
      `Issued new single-use invite code ${data.invite?.code || ''} for ${data.invite?.clubName || 'club'}.`
    );
    return data.invite as OfficialInvite;
  }

  async function handleExtractPoster(payload: {
    imageDataUrl?: string;
    samplePosterId?: string;
    organizerCollegeId: string;
  }): Promise<PosterExtractionResult> {
    const res = await apiFetch('/api/extract-poster', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Poster extraction failed.');
    }
    return data.extraction;
  }

  async function handleCheckDuplicate(payload: {
    title: string;
    collegeId: string;
    startDatetimeIst: string;
  }): Promise<CampusEvent | null> {
    const res = await apiFetch('/api/events/check-duplicate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return data.duplicate || null;
  }

  async function handleUploadPromoVideo(file: File): Promise<string> {
    const res = await apiFetch('/api/upload-promo-video', {
      method: 'POST',
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
        'X-File-Name': file.name,
        'X-Organizer-Id': activeOrganizerId,
      },
      body: file,
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Could not upload promo video.');
    }
    return data.videoUrl as string;
  }

  async function handlePublishEvent(payload: {
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
    coordinatorContact?: EventCoordinatorContact;
    schedule?: EventScheduleDay[];
    posterUrl: string;
    promoVideoUrl?: string;
    promoVideoCaption?: string;
    aiConfidence?: Record<string, number>;
    ignoreDuplicate?: boolean;
    saveAsDraft?: boolean;
    draftEventId?: string;
    isSponsored?: boolean;
    sponsorLabel?: string;
    organizerId?: string;
  }) {
    const resolvedOrganizerId =
      payload.organizerId ||
      (activeTab === 'my-club' && matchedClubLeader
        ? matchedClubLeader.id
        : activeTab === 'external' && matchedExternalRecord
          ? matchedExternalRecord.id
          : matchedCampusOfficial?.id || activeOrganizerId);

    const res = await apiFetch('/api/events/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, organizerId: resolvedOrganizerId }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Publish failed.');
    }
    if (data.notifications) setNotifications(data.notifications);
    if (data.event) {
      syncEventToFirestore(data.event as CampusEvent).catch(() => {});
    }
    if (Array.isArray(data.createdNotifications)) {
      for (const notif of data.createdNotifications as NotificationItem[]) {
        syncNotificationToFirestore(notif).catch(() => {});
      }
    }
    await loadBootstrap();
    await loadFeed();

    if (data.event?.status === 'draft') {
      showNotificationToast(
        'Saved to My Club Drafts',
        `"${data.event.title}" is saved privately and not yet submitted for approval.`
      );
    } else if (data.event?.status === 'pending_review') {
      showNotificationToast(
        'Submitted to Campus Official',
        `"${data.event.title}" is queued for Campus Official approval before publishing.`
      );
    } else if (data.notification) {
      showNotificationToast(
        `Telegram Alert: ${data.notification.title}`,
        data.notification.status === 'sent'
          ? `Delivered to ${student?.displayName || 'student'} on Connectus Bot.`
          : `Queued (${data.notification.status.replace(/_/g, ' ')}). Open Telegram Bot to inspect.`
      );
    }
  }

  async function handleUpdateEvent(
    eventId: string,
    payload: {
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
      coordinatorContact?: EventCoordinatorContact;
      schedule?: EventScheduleDay[];
      promoVideoUrl?: string;
      promoVideoCaption?: string;
    }
  ) {
    const resolvedOrganizerId =
      activeTab === 'my-club' && matchedClubLeader
        ? matchedClubLeader.id
        : activeTab === 'external' && matchedExternalRecord
          ? matchedExternalRecord.id
          : matchedCampusOfficial?.id || activeOrganizerId;

    const res = await apiFetch(`/api/events/${eventId}/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        organizerId: resolvedOrganizerId,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      showNotificationToast('Update Blocked', data.error || 'Could not update event.');
      return;
    }
    if (data.notifications) setNotifications(data.notifications);
    if (data.auditLog) setAuditLog(data.auditLog);
    if (data.event) {
      syncEventToFirestore(data.event as CampusEvent).catch(() => {});
    }
    if (Array.isArray(data.createdNotifications)) {
      for (const notif of data.createdNotifications as NotificationItem[]) {
        syncNotificationToFirestore(notif).catch(() => {});
      }
    }
    await loadBootstrap();
    await loadFeed();
    if (data.revisionQueued) {
      showNotificationToast(
        'Revision Queued for Official Review',
        'Live event details remain unchanged until your Campus Official approves the updated fields.'
      );
    } else if (data.notification) {
      showNotificationToast(
        data.notification.title,
        'Event details updated and registrants notified via Telegram.'
      );
    }
  }

  async function handleReviewSubmission(
    eventId: string,
    payload: {
      decision: 'approve' | 'request_changes' | 'reject' | 'approve_revision' | 'reject_revision';
      feedback?: string;
      organizerId?: string;
    }
  ) {
    const res = await apiFetch(`/api/officials/submissions/${encodeURIComponent(eventId)}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        organizerId: payload.organizerId || matchedCampusOfficial?.id || activeOrganizerId,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Could not process review decision.');
    }
    if (data.notifications) setNotifications(data.notifications);
    if (data.auditLog) setAuditLog(data.auditLog);
    if (data.event) {
      syncEventToFirestore(data.event as CampusEvent).catch(() => {});
    }
    if (Array.isArray(data.createdNotifications)) {
      for (const notif of data.createdNotifications as NotificationItem[]) {
        syncNotificationToFirestore(notif).catch(() => {});
      }
    }
    await loadBootstrap();
    await loadFeed();
    showNotificationToast(
      'Official Review Recorded',
      `Updated status for "${data.event?.title || 'event'}".`
    );
  }

  async function handleCreateAnnouncement(payload: {
    title: string;
    body: string;
    pinned: boolean;
    organizerId?: string;
  }) {
    const res = await apiFetch('/api/officials/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        organizerId: payload.organizerId || matchedCampusOfficial?.id || activeOrganizerId,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Could not publish campus notice.');
    }
    if (data.announcements) setAnnouncements(data.announcements);
    if (data.auditLog) setAuditLog(data.auditLog);
    if (data.announcement) {
      syncAnnouncementToFirestore(data.announcement as CampusAnnouncement).catch(() => {});
    }
    showNotificationToast(
      'Campus Notice Published',
      'Students at your institution now see this notice inside My Events.'
    );
  }

  async function handleDeleteAnnouncement(id: string) {
    const res = await apiFetch(`/api/officials/announcements/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (res.ok && data.announcements) {
      setAnnouncements(data.announcements);
      deleteAnnouncementFromFirestore(id).catch(() => {});
      showNotificationToast('Campus Notice Removed', 'Removed from your institution notice board.');
    }
  }

  async function handleExportStudentData(): Promise<Record<string, unknown>> {
    const res = await apiFetch('/api/student/export-data');
    const data = (await res.json()) as Record<string, unknown>;
    if (!res.ok) {
      throw new Error((data.error as string) || 'Could not export personal data.');
    }
    return data;
  }

  const handleRecordView = useCallback(
    async (eventId: string) => {
      try {
        const res = await apiFetch(`/api/events/${encodeURIComponent(eventId)}/view`, {
          method: 'POST',
        });
        if (!res.ok) return;
        const data = (await res.json()) as { viewCount?: number };
        if (typeof data.viewCount === 'number') {
          const nextCount = data.viewCount;
          const patch = <T extends { id: string; viewCount?: number }>(list: T[]) =>
            list.map((e) => (e.id === eventId ? { ...e, viewCount: nextCount } : e));
          setFeedEvents(patch);
          setAllEvents(patch);
          setCampusEvents(patch);
          setParticipatedEvents(patch);
          setOrganizerEvents(patch);
        }
      } catch {
        // ignore transient analytics error
      }
    },
    [apiFetch]
  );

  async function handleSubmitFeedback(
    eventId: string,
    payload: {
      rating: number;
      comment: string;
      suggestion?: string;
      complaint?: string;
      requestedCategory?: string;
      isAnonymous: boolean;
    }
  ) {
    const res = await apiFetch(`/api/events/${encodeURIComponent(eventId)}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Could not submit feedback.');
    }
    if (data.feedbackItem) {
      const fb = data.feedbackItem as EventFeedback;
      setEventFeedback((prev) => {
        const idx = prev.findIndex((f) => f.id === fb.id);
        return idx >= 0 ? prev.map((f) => (f.id === fb.id ? fb : f)) : [fb, ...prev];
      });
      syncFeedbackToFirestore(fb).catch(() => {});
    }
    await loadFeed();
    await loadBootstrap();
    showNotificationToast(
      'Feedback Submitted',
      'Thank you — your review helps Campus Officials improve future events.'
    );
  }

  async function handleCreateSurvey(payload: {
    title: string;
    description: string;
    questionPrompt: string;
    options?: string[];
    allowAnonymous: boolean;
    organizerId?: string;
  }) {
    const res = await apiFetch('/api/officials/surveys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        organizerId: payload.organizerId || matchedCampusOfficial?.id || activeOrganizerId,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Could not create campus survey.');
    }
    if (Array.isArray(data.surveys)) setSurveys(data.surveys);
    if (data.auditLog) setAuditLog(data.auditLog);
    if (data.survey) {
      syncSurveyToFirestore(data.survey as CampusSurvey).catch(() => {});
    }
    showNotificationToast(
      'Campus Survey Live',
      'Students at your institution can now answer inside My Campus & Me.'
    );
  }

  async function handleToggleSurveyStatus(
    surveyId: string,
    status: 'active' | 'closed',
    organizerId?: string
  ) {
    const res = await apiFetch('/api/officials/surveys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        surveyId,
        status,
        organizerId: organizerId || matchedCampusOfficial?.id || activeOrganizerId,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Could not update survey status.');
    }
    if (Array.isArray(data.surveys)) setSurveys(data.surveys);
    if (data.survey) {
      syncSurveyToFirestore(data.survey as CampusSurvey).catch(() => {});
    }
    showNotificationToast(
      status === 'closed' ? 'Survey Closed' : 'Survey Reopened',
      'Survey visibility updated across student workspaces.'
    );
  }

  async function handleSubmitSurveyResponse(
    surveyId: string,
    payload: {
      rating?: number;
      selectedOption?: string;
      responseText?: string;
      isAnonymous?: boolean;
    }
  ) {
    const res = await apiFetch(`/api/surveys/${encodeURIComponent(surveyId)}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Could not submit survey response.');
    }
    if (data.response) {
      const resp = data.response as SurveyResponse;
      setSurveyResponses((prev) => {
        const idx = prev.findIndex((r) => r.id === resp.id);
        return idx >= 0 ? prev.map((r) => (r.id === resp.id ? resp : r)) : [resp, ...prev];
      });
      syncSurveyResponseToFirestore(resp).catch(() => {});
    }
    showNotificationToast('Response Recorded', 'Your campus survey response was saved.');
  }

  async function handleAnalyzeCampusFeedback(eventId?: string): Promise<FeedbackAnalysisReport> {
    const res = await apiFetch('/api/officials/feedback/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventId: eventId || undefined,
        organizerId: matchedCampusOfficial?.id || activeOrganizerId,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Could not analyze campus feedback.');
    }
    return data.report as FeedbackAnalysisReport;
  }

  async function handleAnalyzeClubFeedback(eventId?: string): Promise<FeedbackAnalysisReport> {
    const res = await apiFetch('/api/club/feedback/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventId: eventId || undefined,
        organizerId: matchedClubLeader?.id || activeOrganizerId,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Could not analyze club event feedback.');
    }
    return data.report as FeedbackAnalysisReport;
  }

  async function handleRedeemBetaCode(code: string) {
    const activeUser = authUserRef.current || firebaseUser;
    let firestoreRedeemed = false;
    if (activeUser?.email) {
      firestoreRedeemed = await redeemBetaCodeInFirestore(code, activeUser.email).catch(() => false);
    }
    const res = await apiFetch('/api/beta/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    if (!res.ok && !firestoreRedeemed) {
      throw new Error(data.error || 'Could not redeem invite access code.');
    }
    setBetaLocked(false);
    await loadBootstrap();
    if (activeUser) {
      await hydrateSignedInUser(activeUser);
    }
    await loadFeed();
    showNotificationToast('Beta Access Unlocked', 'Your Google account now has an active testing seat.');
  }

  async function handleRefreshBetaAccess() {
    await loadBootstrap();
    const activeUser = authUserRef.current || firebaseUser;
    if (activeUser) {
      await hydrateSignedInUser(activeUser);
    }
    await loadFeed();
  }

  async function handlePostPartnerRequest(payload: {
    eventId: string;
    roleSkill: string;
    lookingFor: string;
    teamSlotsNeeded: number;
    note: string;
    whatsappReady: boolean;
  }) {
    const res = await apiFetch('/api/teams/partners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Could not post availability.');
    }
    if (data.partnerPosts) {
      setPartnerPosts(data.partnerPosts);
    }
    if (data.post) {
      syncPartnerPostToFirestore(data.post as PartnerPost).catch(() => {});
    }
    showNotificationToast(
      'Availability Published',
      'Matching students looking for teammates can now send you a Connect request.'
    );
  }

  async function handleDeletePartnerRequest(postId: string) {
    const res = await apiFetch(`/api/teams/partners/${encodeURIComponent(postId)}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (res.ok && data.partnerPosts) {
      setPartnerPosts(data.partnerPosts);
      deletePartnerPostFromFirestore(postId).catch(() => {});
    }
  }

  async function handleSendConnectionRequest(payload: {
    toUserId: string;
    eventId: string;
    note: string;
  }) {
    const res = await apiFetch('/api/teams/connection-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Could not send connection request.');
    }
    if (data.request) {
      const reqItem = data.request as ConnectionRequest;
      setConnectionRequests((prev) =>
        prev.some((r) => r.id === reqItem.id)
          ? prev.map((r) => (r.id === reqItem.id ? reqItem : r))
          : [reqItem, ...prev]
      );
      syncConnectionRequestToFirestore(reqItem).catch(() => {});
    }
    showNotificationToast(
      'Connect Request Sent',
      'Tracked in Teams → Activity. Conversation opens once they accept.'
    );
  }

  async function handleRespondConnectionRequest(
    requestId: string,
    action: 'start_conversation' | 'decline'
  ) {
    const res = await apiFetch(
      `/api/teams/connection-requests/${encodeURIComponent(requestId)}/respond`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Could not respond to connection request.');
    }
    if (data.request) {
      const reqItem = data.request as ConnectionRequest;
      setConnectionRequests((prev) =>
        prev.map((r) => (r.id === reqItem.id ? reqItem : r))
      );
      syncConnectionRequestToFirestore(reqItem).catch(() => {});
    }
    if (data.conversation) {
      const conv = data.conversation as TeamConversation;
      setConversations((prev) =>
        prev.some((c) => c.id === conv.id)
          ? prev.map((c) => (c.id === conv.id ? conv : c))
          : [conv, ...prev]
      );
      setActiveTeamRoom({ scope: 'conversation', id: conv.id });
      syncConversationToFirestore(conv).catch(() => {});
    }
  }

  const handleEstimateTeamUpCall = useCallback(
    async (payload: {
      preferredCollege: string;
      preferredYear: string;
      preferredSkills: string[];
      rolesNeeded: string[];
      preferredAreas: string[];
      preferredLanguages: SupportedLanguage[];
      genderPreference: CallGenderFilter;
      audienceMode: 'active_only' | 'all_matching';
    }): Promise<number | 'fewer than 3'> => {
      const res = await apiFetch('/api/teams/calls/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error('Estimate unavailable');
      }
      const data = (await res.json()) as {
        eligibleCount?: number | 'fewer than 3';
        masked?: boolean;
      };
      if (data.eligibleCount === 'fewer than 3') {
        return 'fewer than 3';
      }
      return Number(data.eligibleCount || 0);
    },
    [apiFetch]
  );

  const handleClearDraftCallEventId = useCallback(() => {
    setDraftCallEventId(null);
  }, []);

  async function handleCreateTeamUpCall(payload: {
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
  }) {
    const res = await apiFetch('/api/teams/calls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Could not publish Team-up Call.');
    }
    if (data.call) {
      const call = data.call as TeamUpCall;
      setTeamUpCalls((prev) =>
        prev.some((c) => c.id === call.id)
          ? prev.map((c) => (c.id === call.id ? call : c))
          : [call, ...prev]
      );
      syncTeamUpCallToFirestore(call).catch(() => {});
    }
    const toastBody =
      data.notifiedCount === 0
        ? 'Published, but 0 students currently match your filters — consider broadening them.'
        : data.notifiedCount === 'fewer than 3'
          ? 'Notified fewer than 3 matching students.'
          : `Notified ${data.notifiedCount} matching students.`;
    showNotificationToast('Team-up Call Published', toastBody);
  }

  async function handleRespondTeamUpCall(
    callId: string,
    decision: 'interested' | 'dismissed',
    note?: string
  ) {
    const res = await apiFetch(`/api/teams/calls/${encodeURIComponent(callId)}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, note }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Could not respond to Team-up Call.');
    }
    if (data.call) {
      const call = data.call as TeamUpCall;
      setTeamUpCalls((prev) => prev.map((c) => (c.id === call.id ? call : c)));
      syncTeamUpCallToFirestore(call).catch(() => {});
    }
  }

  async function handleInviteFromTeamUpCall(
    callId: string,
    targetUserId: string,
    eventId?: string
  ) {
    const res = await apiFetch(`/api/teams/calls/${encodeURIComponent(callId)}/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId, ...(eventId ? { eventId } : {}) }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Could not invite student to conversation.');
    }
    if (data.call) {
      const call = data.call as TeamUpCall;
      setTeamUpCalls((prev) => prev.map((c) => (c.id === call.id ? call : c)));
      syncTeamUpCallToFirestore(call).catch(() => {});
    }
    if (data.conversation) {
      const conv = data.conversation as TeamConversation;
      setConversations((prev) =>
        prev.some((c) => c.id === conv.id)
          ? prev.map((c) => (c.id === conv.id ? conv : c))
          : [conv, ...prev]
      );
      setActiveTeamRoom({ scope: 'conversation', id: conv.id });
      syncConversationToFirestore(conv).catch(() => {});
    }
  }

  async function handleCloseTeamUpCall(callId: string) {
    const res = await apiFetch(`/api/teams/calls/${encodeURIComponent(callId)}/close`, {
      method: 'POST',
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Could not close Team-up Call.');
    }
    if (data.call) {
      const call = data.call as TeamUpCall;
      setTeamUpCalls((prev) => prev.map((c) => (c.id === call.id ? call : c)));
      syncTeamUpCallToFirestore(call).catch(() => {});
    }
  }

  async function handleSendConversationMessage(conversationId: string, body: string) {
    const res = await apiFetch(
      `/api/teams/conversations/${encodeURIComponent(conversationId)}/messages`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Message failed to send.');
    }
    if (data.message) {
      const msg = data.message as TeamChatMessage;
      setChatMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      const conv = conversations.find((c) => c.id === conversationId);
      if (conv) {
        syncChatMessageToFirestore(msg, conv.participantIds).catch(() => {});
      }
    }
    if (data.conversation) {
      const conv = data.conversation as TeamConversation;
      setConversations((prev) => prev.map((c) => (c.id === conv.id ? conv : c)));
      syncConversationToFirestore(conv).catch(() => {});
    }
  }

  async function handleConfirmConversationToSquad(
    conversationId: string,
    payload: { squadName: string; targetSize: number }
  ) {
    const res = await apiFetch(
      `/api/teams/conversations/${encodeURIComponent(conversationId)}/confirm-squad`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Could not confirm squad formation.');
    }
    if (data.conversation) {
      const conv = data.conversation as TeamConversation;
      setConversations((prev) => prev.map((c) => (c.id === conv.id ? conv : c)));
      syncConversationToFirestore(conv).catch(() => {});
    }
    if (data.squad) {
      const sq = data.squad as Squad;
      setMySquads((prev) =>
        prev.some((s) => s.id === sq.id) ? prev.map((s) => (s.id === sq.id ? sq : s)) : [sq, ...prev]
      );
      setActiveTeamRoom({ scope: 'squad', id: sq.id });
      syncSquadToFirestore(sq).catch(() => {});
      showNotificationToast('Squad Formed', `${sq.name} is now active in My Squads.`);
    }
  }

  async function handleArchiveConversation(conversationId: string) {
    const res = await apiFetch(
      `/api/teams/conversations/${encodeURIComponent(conversationId)}/archive`,
      { method: 'POST' }
    );
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Could not archive conversation.');
    }
    if (data.conversation) {
      const conv = data.conversation as TeamConversation;
      setConversations((prev) => prev.map((c) => (c.id === conv.id ? conv : c)));
      syncConversationToFirestore(conv).catch(() => {});
    }
    setActiveTeamRoom((curr) =>
      curr?.scope === 'conversation' && curr.id === conversationId ? null : curr
    );
  }

  async function handleCreateSquad(payload: {
    name: string;
    eventId: string;
    targetSize: number;
    requiredRoles: string[];
  }) {
    const res = await apiFetch('/api/teams/squads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Could not create squad.');
    }
    if (data.squad) {
      const sq = data.squad as Squad;
      setMySquads((prev) =>
        prev.some((s) => s.id === sq.id) ? prev.map((s) => (s.id === sq.id ? sq : s)) : [sq, ...prev]
      );
      setActiveTeamRoom({ scope: 'squad', id: sq.id });
      syncSquadToFirestore(sq).catch(() => {});
    }
  }

  async function handleUpdateSquad(
    squadId: string,
    payload: {
      name?: string;
      targetSize?: number;
      requiredRoles?: string[];
      recruitmentStatus?: SquadRecruitmentStatus;
      archived?: boolean;
    }
  ) {
    const res = await apiFetch(`/api/teams/squads/${encodeURIComponent(squadId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Could not update squad.');
    }
    if (data.squad) {
      const sq = data.squad as Squad;
      setMySquads((prev) => prev.map((s) => (s.id === sq.id ? sq : s)));
      syncSquadToFirestore(sq).catch(() => {});
    }
  }

  async function handleLeaveSquad(squadId: string) {
    const res = await apiFetch(`/api/teams/squads/${encodeURIComponent(squadId)}/leave`, {
      method: 'POST',
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Could not leave squad.');
    }
    setMySquads((prev) => prev.filter((s) => s.id !== squadId));
    setActiveTeamRoom((curr) => (curr?.scope === 'squad' && curr.id === squadId ? null : curr));
  }

  async function handleRemoveSquadMember(squadId: string, memberUserId: string) {
    const res = await apiFetch(
      `/api/teams/squads/${encodeURIComponent(squadId)}/remove-member`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberUserId }),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Could not remove member.');
    }
    if (data.squad) {
      const sq = data.squad as Squad;
      setMySquads((prev) => prev.map((s) => (s.id === sq.id ? sq : s)));
      syncSquadToFirestore(sq).catch(() => {});
    }
  }

  async function handleTransferSquadOwner(squadId: string, nextOwnerId: string) {
    const res = await apiFetch(
      `/api/teams/squads/${encodeURIComponent(squadId)}/transfer-owner`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nextOwnerId }),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Could not transfer ownership.');
    }
    if (data.squad) {
      const sq = data.squad as Squad;
      setMySquads((prev) => prev.map((s) => (s.id === sq.id ? sq : s)));
      syncSquadToFirestore(sq).catch(() => {});
    }
  }

  async function handleRequestJoinSquad(
    squadId: string,
    payload: { roleApplied: string; note: string }
  ) {
    const res = await apiFetch(
      `/api/teams/squads/${encodeURIComponent(squadId)}/join-requests`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Could not submit join request.');
    }
    if (data.request) {
      const reqItem = data.request as SquadJoinRequest;
      setJoinRequests((prev) =>
        prev.some((r) => r.id === reqItem.id)
          ? prev.map((r) => (r.id === reqItem.id ? reqItem : r))
          : [reqItem, ...prev]
      );
      syncJoinRequestToFirestore(reqItem).catch(() => {});
    }
  }

  async function handleRespondJoinRequest(
    requestId: string,
    decision: 'approve' | 'decline'
  ) {
    const res = await apiFetch(
      `/api/teams/join-requests/${encodeURIComponent(requestId)}/respond`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Could not process join request.');
    }
    if (data.request) {
      const reqItem = data.request as SquadJoinRequest;
      setJoinRequests((prev) => prev.map((r) => (r.id === reqItem.id ? reqItem : r)));
      syncJoinRequestToFirestore(reqItem).catch(() => {});
    }
    if (data.squad) {
      const sq = data.squad as Squad;
      setMySquads((prev) =>
        prev.some((s) => s.id === sq.id) ? prev.map((s) => (s.id === sq.id ? sq : s)) : [sq, ...prev]
      );
      syncSquadToFirestore(sq).catch(() => {});
    }
  }

  async function handleSendSquadMessage(squadId: string, body: string) {
    const res = await apiFetch(`/api/teams/squads/${encodeURIComponent(squadId)}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Message failed to send.');
    }
    if (data.message) {
      const msg = data.message as TeamChatMessage;
      setChatMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      const sq = mySquads.find((s) => s.id === squadId);
      if (sq) {
        syncChatMessageToFirestore(msg, sq.memberIds).catch(() => {});
      }
    }
    if (data.squad) {
      const sq = data.squad as Squad;
      setMySquads((prev) => prev.map((s) => (s.id === sq.id ? sq : s)));
    }
  }

  async function handleShareSquadWhatsapp(
    squadId: string,
    payload: { mode: 'contact' | 'group'; whatsappNumber?: string; whatsappGroupUrl?: string }
  ) {
    const res = await apiFetch(`/api/teams/squads/${encodeURIComponent(squadId)}/whatsapp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Could not share WhatsApp details.');
    }
    if (data.message) {
      const msg = data.message as TeamChatMessage;
      setChatMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      const sq = mySquads.find((s) => s.id === squadId);
      if (sq) {
        syncChatMessageToFirestore(msg, sq.memberIds).catch(() => {});
      }
    }
    if (data.squad) {
      const sq = data.squad as Squad;
      setMySquads((prev) => prev.map((s) => (s.id === sq.id ? sq : s)));
      syncSquadToFirestore(sq).catch(() => {});
    }
  }

  async function handleAmendSquadRegistration(eventId: string, squadId: string) {
    const res = await apiFetch(`/api/events/${encodeURIComponent(eventId)}/amend-squad-registration`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ squadId }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Could not amend squad registration.');
    }
    if (data.snapshot) {
      const snap = data.snapshot as SquadRegistrationSnapshot;
      setRegistrationSnapshots((prev) =>
        prev.some((s) => s.id === snap.id) ? prev.map((s) => (s.id === snap.id ? snap : s)) : [snap, ...prev]
      );
      syncRegistrationSnapshotToFirestore(snap).catch(() => {});
      showNotificationToast(
        'Squad Roster Amended',
        'Updated member list synced to event registration while preserving existing QR passes.'
      );
    }
  }

  const isAppLoading = !authReady || (Boolean(firebaseUser || guestBrowsing) && !student);

  function handleSelectTab(nextTab: ActiveTab) {
    if (nextTab === 'organizer' && !canAccessOfficials) return;
    if (nextTab === 'my-club' && !canAccessMyClub) return;

    setActiveTab(nextTab);
    if (nextTab === 'organizer') {
      setPortalRoute('officials');
      if (window.location.pathname !== '/officials') {
        window.history.pushState({}, '', '/officials');
      }
    } else {
      setPortalRoute('public');
      if (window.location.pathname !== '/') {
        window.history.pushState({}, '', '/');
      }
    }
    smoothScrollPageTop();
  }

  function handleReturnToPublicFeed(targetTab: ActiveTab = 'discover') {
    setPortalRoute('public');
    setActiveTab(targetTab);
    if (window.location.pathname !== '/') {
      window.history.pushState({}, '', '/');
    }
    smoothScrollPageTop();
  }

  const mapsEnabled = Boolean(mapsApiKey) && !mapsQuotaExceeded;

  const isLockedOfficialsPortal = portalRoute === 'officials' && !canAccessOfficials;

  const studentCollegeShort = student
    ? colleges.find((c) => c.id === student.collegeId)?.shortName ||
      (student.customCollegeName ? student.customCollegeName.slice(0, 14) : undefined)
    : undefined;

  const activeOfficialCollegeId = matchedCampusOfficial?.collegeId;
  const pendingApprovalCount = canAccessOfficials
    ? organizerEvents.filter(
        (e) =>
          (!activeOfficialCollegeId || e.collegeId === activeOfficialCollegeId) &&
          (e.status === 'pending_review' || Boolean(e.revisionPendingReview && e.pendingRevision))
      ).length
    : 0;

  const isBetaGatedSignedInUser = Boolean(firebaseUser && betaLocked);

  const content =
    isAppLoading ? (
      <LoadingSplash stage={loadingStage} progress={loadingProgress} />
    ) : isBetaGatedSignedInUser && firebaseUser ? (
      <>
        <BetaAccessGate
          firebaseUser={firebaseUser}
          usedSeats={betaAccessSummary?.usedSeats ?? 2}
          maxSeats={betaAccessSummary?.maxSeats ?? 6}
          onRedeemBetaCode={handleRedeemBetaCode}
          onRefreshAccess={handleRefreshBetaAccess}
          onOpenInviteAccept={() => {
            setInitialInviteToken('');
            setInviteModalOpen(true);
          }}
          onSignOut={handleGoogleSignOut}
        />

        <InviteAcceptModal
          open={inviteModalOpen}
          initialTokenOrCode={initialInviteToken}
          firebaseUser={firebaseUser}
          student={student}
          onClose={() => setInviteModalOpen(false)}
          onLookupInvite={handleLookupInvite}
          onAcceptInvite={handleAcceptInvite}
        />
      </>
    ) : isLockedOfficialsPortal ? (
      <>
        <StaffPortalGate
          firebaseUser={firebaseUser}
          onGoogleLogin={handleAuthFlowLogin}
          onGoogleSignOut={handleGoogleSignOut}
          onBackToFeed={() => handleReturnToPublicFeed('discover')}
          onOpenInviteAccept={() => {
            setInitialInviteToken('');
            setInviteModalOpen(true);
          }}
          onOpenExternalPortal={() => handleReturnToPublicFeed('external')}
        />

        <InviteAcceptModal
          open={inviteModalOpen}
          initialTokenOrCode={initialInviteToken}
          firebaseUser={firebaseUser}
          student={student}
          onClose={() => setInviteModalOpen(false)}
          onLookupInvite={handleLookupInvite}
          onAcceptInvite={handleAcceptInvite}
        />

        <AnimatePresence>
          {toastBanner && (
            <motion.div
              key="staff-toast"
              initial={{ opacity: 0, y: 14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="fixed bottom-6 right-4 z-50 max-w-sm paper-terminal p-4 space-y-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.06em] text-[var(--rose)]">
                  <Smartphone className="w-4 h-4 shrink-0" />
                  <span>{toastBanner.title}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setToastBanner(null)}
                  className="text-xs font-semibold uppercase tracking-[0.06em] text-[#fef9ef]/70 hover:text-[#fef9ef]"
                >
                  Close
                </button>
              </div>
              <p className="text-xs text-[#fef9ef] leading-relaxed">{toastBanner.body}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    ) : !firebaseUser && (!guestBrowsing || betaLocked) ? (
      <>
        <WelcomeAuthPage
          eventCount={allEvents.length}
          collegeCount={colleges.length}
          hasPendingInvite={Boolean(initialInviteToken)}
          betaLocked={betaLocked}
          betaUsedSeats={betaAccessSummary?.usedSeats}
          betaMaxSeats={betaAccessSummary?.maxSeats}
          onGoogleSignUp={handleAuthFlowSignUp}
          onGoogleLogin={handleAuthFlowLogin}
          onContinueAsGuest={() => {
            if (!betaLocked) setGuestBrowsing(true);
          }}
          onOpenInviteAccept={() => {
            setInitialInviteToken('');
            setInviteModalOpen(true);
          }}
        />

        <InviteAcceptModal
          open={inviteModalOpen}
          initialTokenOrCode={initialInviteToken}
          firebaseUser={firebaseUser}
          student={student}
          onClose={() => setInviteModalOpen(false)}
          onLookupInvite={handleLookupInvite}
          onAcceptInvite={handleAcceptInvite}
        />
      </>
    ) : !student ? (
      <LoadingSplash stage={loadingStage} progress={loadingProgress} />
    ) : (
      <div key="main-shell" className="min-h-screen bg-[var(--paper)] text-[var(--ink)] flex flex-col pb-20 md:pb-0">
      {mapsQuotaExceeded && (
        <div className="bg-[var(--amber-tint)] border-b border-[var(--amber-border)] text-[var(--amber-ink)] px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-[var(--ink)] hover:text-[var(--crimson)]"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      <TopBar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        officialSection={officialSection}
        onSelectOfficialSection={(sec) => {
          setOfficialSection(sec);
          if (activeTab !== 'organizer') handleSelectTab('organizer');
          smoothScrollPageTop();
        }}
        pendingApprovalCount={pendingApprovalCount}
        onOpenMe={() => handleSelectTab('me')}
        onOpenSettings={() => {
          setSettingsInitialTab('account');
          setSettingsOpen(true);
        }}
        onOpenLogin={() => setAuthModalMode('login')}
        onOpenSignUp={() => setAuthModalMode('signup')}
        onSignOut={handleGoogleSignOut}
        firebaseUser={firebaseUser}
        studentName={student.displayName}
        studentPhotoUrl={student.photoUrl}
        studentCollegeShort={studentCollegeShort}
        canAccessMyClub={canAccessMyClub}
        canAccessOfficials={canAccessOfficials}
        canAccessExternal={canAccessExternal}
        themePreference={student.accessibilityPrefs?.themePreference}
        onChangeTheme={handleChangeTheme}
      />

      <AnimatePresence>
        {toastBanner && (
          <motion.div
            key="main-toast"
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-20 md:bottom-6 right-4 z-40 max-w-sm paper-terminal p-4 space-y-2"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.06em] text-[var(--rose)]">
                <Smartphone className="w-4 h-4 shrink-0" />
                <span>{toastBanner.title}</span>
              </div>
              <button
                type="button"
                onClick={() => setToastBanner(null)}
                className="text-xs font-semibold uppercase tracking-[0.06em] text-[#fef9ef]/70 hover:text-[#fef9ef]"
              >
                Close
              </button>
            </div>
            <p className="text-xs text-[#fef9ef] leading-relaxed">{toastBanner.body}</p>
            <button
              type="button"
              onClick={() => {
                setToastBanner(null);
                setTelegramOpen(true);
              }}
              className="text-xs font-semibold text-[#e3959e] hover:text-[#fef9ef] underline underline-offset-4"
            >
              Open Telegram Phone Preview
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 w-full px-3 sm:px-4 md:px-5 pt-3.5 pb-8 sm:pt-4 sm:pb-10">
        <div key={activeTab}>
        {activeTab === 'discover' && (
          <DiscoverFeed
            events={feedEvents}
            loading={feedLoading}
            student={student}
            areas={areas}
            colleges={colleges}
            mapsEnabled={mapsEnabled}
            typeFilter={typeFilter}
            searchQuery={searchQuery}
            onlyFollowed={onlyFollowed}
            showAllIndia={showAllIndia}
            onChangeType={setTypeFilter}
            onChangeSearch={setSearchQuery}
            onToggleOnlyFollowed={() => setOnlyFollowed((v) => !v)}
            onToggleShowAllIndia={() => setShowAllIndia((v) => !v)}
            onOpenPreferences={() => setPreferencesOpen(true)}
            onOpenSkills={() => handleSelectTab('me')}
            onOpenTelegram={() => setTelegramOpen(true)}
            onOpenSuggest={() => setSuggestOpen(true)}
            onSelectEvent={(evt) => setSelectedEventId(evt.id)}
            onToggleSave={handleToggleSave}
          />
        )}

        {activeTab === 'my-events' && (
          <MyEventsView
            events={allEvents}
            campusEvents={campusEvents}
            announcements={announcements}
            surveys={surveys}
            surveyResponses={surveyResponses}
            colleges={colleges}
            areas={areas}
            student={student}
            onSelectEvent={(evt) => setSelectedEventId(evt.id)}
            onToggleSave={handleToggleSave}
            onToggleFollow={handleToggleFollow}
            onSelectStudentCollege={(collegeId: string) => {
              const col = colleges.find((c) => c.id === collegeId);
              const matchedArea = col ? areas.find((a) => a.id === col.areaId) : undefined;
              const domain = (student.email.split('@')[1] || '').toLowerCase();
              const verified = Boolean(
                col && domain && domain === col.emailDomain.toLowerCase()
              );
              const nextFollowed =
                col && !student.followedCollegeIds.includes(col.id)
                  ? [...student.followedCollegeIds, col.id]
                  : student.followedCollegeIds;
              return handleSaveStudentData(
                {
                  collegeId,
                  customCollegeName: '',
                  collegeVerified: verified,
                  areaId: col?.areaId || student.areaId,
                  ...(matchedArea
                    ? {
                        locationLabel: `${matchedArea.name}, Telangana`,
                        locationLat: matchedArea.lat,
                        locationLng: matchedArea.lng,
                      }
                    : {}),
                  followedCollegeIds: nextFollowed,
                  onboardingCompleted: true,
                },
                `My Campus set to ${col?.shortName || 'selected college'}.`
              );
            }}
            onSubmitSurveyResponse={handleSubmitSurveyResponse}
            onOpenProfile={() => setProfileOpen(true)}
            onOpenSuggest={() => setSuggestOpen(true)}
            onOpenDiscover={() => handleSelectTab('discover')}
          />
        )}

        {activeTab === 'teams' && (
          <TeamChatHub
            student={student}
            events={allEvents}
            colleges={colleges}
            areas={areas}
            registrations={registrations}
            partnerPosts={partnerPosts}
            publicSquads={publicSquads}
            mySquads={mySquads}
            connectionRequests={connectionRequests}
            joinRequests={joinRequests}
            teamUpCalls={teamUpCalls}
            conversations={conversations}
            chatMessages={chatMessages}
            registrationSnapshots={registrationSnapshots}
            activeRoom={activeTeamRoom}
            draftCallEventId={draftCallEventId}
            onClearDraftCallEventId={handleClearDraftCallEventId}
            onSelectRoom={setActiveTeamRoom}
            onOpenEvent={(eventId) => setSelectedEventId(eventId)}
            onPostPartnerRequest={handlePostPartnerRequest}
            onDeletePartnerRequest={handleDeletePartnerRequest}
            onSendConnectionRequest={handleSendConnectionRequest}
            onRespondConnectionRequest={handleRespondConnectionRequest}
            onEstimateTeamUpCall={handleEstimateTeamUpCall}
            onCreateTeamUpCall={handleCreateTeamUpCall}
            onRespondTeamUpCall={handleRespondTeamUpCall}
            onInviteFromTeamUpCall={handleInviteFromTeamUpCall}
            onCloseTeamUpCall={handleCloseTeamUpCall}
            onSendConversationMessage={handleSendConversationMessage}
            onConfirmConversationToSquad={handleConfirmConversationToSquad}
            onArchiveConversation={handleArchiveConversation}
            onCreateSquad={handleCreateSquad}
            onUpdateSquad={handleUpdateSquad}
            onLeaveSquad={handleLeaveSquad}
            onRemoveSquadMember={handleRemoveSquadMember}
            onTransferSquadOwner={handleTransferSquadOwner}
            onRequestJoinSquad={handleRequestJoinSquad}
            onRespondJoinRequest={handleRespondJoinRequest}
            onSendSquadMessage={handleSendSquadMessage}
            onShareSquadWhatsapp={handleShareSquadWhatsapp}
            onAmendSquadRegistration={handleAmendSquadRegistration}
          />
        )}

        {activeTab === 'organizer' && canAccessOfficials && (
          <OrganizerStudio
            organizers={organizers}
            activeOrganizerId={activeOrganizerId}
            activeSection={officialSection}
            onSelectSection={setOfficialSection}
            officialInvites={officialInvites}
            announcements={announcements}
            colleges={colleges}
            areas={areas}
            samplePosters={samplePosters}
            organizerEvents={organizerEvents}
            registrations={registrations}
            eventFeedback={eventFeedback}
            surveys={surveys}
            surveyResponses={surveyResponses}
            mapsEnabled={mapsEnabled}
            canAccessOfficials={canAccessOfficials}
            discoverView={
              <DiscoverFeed
                events={feedEvents}
                loading={feedLoading}
                student={student}
                areas={areas}
                colleges={colleges}
                mapsEnabled={mapsEnabled}
                typeFilter={typeFilter}
                searchQuery={searchQuery}
                onlyFollowed={onlyFollowed}
                showAllIndia={showAllIndia}
                onChangeType={setTypeFilter}
                onChangeSearch={setSearchQuery}
                onToggleOnlyFollowed={() => setOnlyFollowed((v) => !v)}
                onToggleShowAllIndia={() => setShowAllIndia((v) => !v)}
                onOpenPreferences={() => setPreferencesOpen(true)}
                onOpenTelegram={() => setTelegramOpen(true)}
                onOpenSuggest={() => setSuggestOpen(true)}
                onSelectEvent={(evt) => setSelectedEventId(evt.id)}
                onToggleSave={handleToggleSave}
              />
            }
            onSelectOrganizer={handleSelectOrganizer}
            onCreateInvite={handleCreateInvite}
            onRevokeInvite={handleRevokeInvite}
            onRevokeMember={handleRevokeMember}
            onReplaceMember={handleReplaceMember}
            onOpenInviteAccept={(tokenOrCode) => {
              setInitialInviteToken(tokenOrCode || '');
              setInviteModalOpen(true);
            }}
            onReviewSubmission={handleReviewSubmission}
            onCreateAnnouncement={handleCreateAnnouncement}
            onDeleteAnnouncement={handleDeleteAnnouncement}
            onCreateSurvey={handleCreateSurvey}
            onToggleSurveyStatus={handleToggleSurveyStatus}
            onAnalyzeCampusFeedback={handleAnalyzeCampusFeedback}
            onExtractPoster={handleExtractPoster}
            onUploadPromoVideo={handleUploadPromoVideo}
            onCheckDuplicate={handleCheckDuplicate}
            onPublishEvent={handlePublishEvent}
            onUpdateEvent={handleUpdateEvent}
            onCheckIn={handleCheckIn}
          />
        )}

        {activeTab === 'my-club' && matchedClubLeader && (
          <MyClubWorkspace
            activeOrg={matchedClubLeader}
            colleges={colleges}
            areas={areas}
            samplePosters={samplePosters}
            clubEvents={organizerEvents.filter((e) => e.clubId === matchedClubLeader.id)}
            registrations={registrations}
            eventFeedback={eventFeedback}
            mapsEnabled={mapsEnabled}
            onBackToStudent={() => handleSelectTab('discover')}
            onAnalyzeClubFeedback={handleAnalyzeClubFeedback}
            onExtractPoster={handleExtractPoster}
            onUploadPromoVideo={handleUploadPromoVideo}
            onCheckDuplicate={handleCheckDuplicate}
            onPublishEvent={handlePublishEvent}
            onUpdateEvent={handleUpdateEvent}
            onCheckIn={handleCheckIn}
          />
        )}

        {activeTab === 'external' && (
          <ExternalOrganizerWorkspace
            firebaseUser={firebaseUser}
            matchedOrg={matchedExternalRecord || null}
            colleges={colleges}
            areas={areas}
            samplePosters={samplePosters}
            externalEvents={
              matchedExternalRecord
                ? organizerEvents.filter((e) => e.clubId === matchedExternalRecord.id)
                : []
            }
            registrations={registrations}
            mapsEnabled={mapsEnabled}
            onOpenLogin={() => setAuthModalMode('login')}
            onSubmitApplication={handleSignInOrganizer}
            onExtractPoster={handleExtractPoster}
            onUploadPromoVideo={handleUploadPromoVideo}
            onCheckDuplicate={handleCheckDuplicate}
            onPublishEvent={handlePublishEvent}
            onUpdateEvent={handleUpdateEvent}
            onCheckIn={handleCheckIn}
          />
        )}

        {activeTab === 'tickets' && (
          <TicketsView
            student={student}
            events={allEvents}
            participatedEvents={participatedEvents}
            registrations={registrations}
            onSelectEvent={(evt) => setSelectedEventId(evt.id)}
            onToggleSave={handleToggleSave}
            onUpdatePassPhoto={handleUpdatePassPhoto}
            onOpenDiscover={() => handleSelectTab('discover')}
          />
        )}

        {activeTab === 'me' && (
          <MeView
            student={student}
            firebaseUser={firebaseUser}
            events={allEvents}
            surveys={surveys}
            surveyResponses={surveyResponses}
            colleges={colleges}
            areas={areas}
            notifications={notifications}
            canAccessOfficials={canAccessOfficials}
            canAccessMyClub={canAccessMyClub}
            onEditProfile={() => setProfileOpen(true)}
            onOpenSettings={(tab) => {
              setSettingsInitialTab(tab || 'account');
              setSettingsOpen(true);
            }}
            onSaveDetails={(updates) =>
              handleSaveStudentData(
                updates,
                'Skills, student details, and curated event ranking updated.'
              )
            }
            onOpenPreferences={() => setPreferencesOpen(true)}
            onOpenTelegram={() => setTelegramOpen(true)}
            onOpenSuggest={() => setSuggestOpen(true)}
            onOpenLogin={() => setAuthModalMode('login')}
            onOpenSignUp={() => setAuthModalMode('signup')}
            onSignOut={handleGoogleSignOut}
            onSelectEvent={(evt) => setSelectedEventId(evt.id)}
            onOpenDiscover={() => handleSelectTab('discover')}
            onOpenMyCampus={() => handleSelectTab('my-events')}
            onOpenClubStudio={() => handleSelectTab('my-club')}
            onOpenOfficialsPortal={() => handleSelectTab('organizer')}
          />
        )}
        </div>
      </main>

      <footer className="border-t border-[var(--border-warm)] bg-[var(--paper-raised)] mt-12">
        <div className="w-full px-3 sm:px-4 md:px-5 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-[var(--ink-2)]">
          <div className="font-medium">
            Connectus · Pan-India poster-first college event discovery
          </div>
          <div className="font-mono text-[11px] uppercase tracking-[0.06em]">
            All event schedules shown in IST (UTC+05:30)
          </div>
        </div>
      </footer>

      <EventDetailModal
        event={selectedEvent}
        student={student}
        colleges={colleges}
        partnerPosts={partnerPosts}
        mySquads={mySquads}
        registrationSnapshots={registrationSnapshots}
        eventFeedback={eventFeedback}
        mapsEnabled={mapsEnabled}
        onClose={() => setSelectedEventId(null)}
        onRecordView={handleRecordView}
        onSubmitFeedback={handleSubmitFeedback}
        onRegister={handleRegister}
        onCancelRegistration={handleCancelRegistration}
        onUpdatePassPhoto={handleUpdatePassPhoto}
        onToggleSave={handleToggleSave}
        onReport={handleReportEvent}
        onPostPartnerRequest={handlePostPartnerRequest}
        onDeletePartnerRequest={handleDeletePartnerRequest}
        onSendConnectionRequest={handleSendConnectionRequest}
        onLaunchTeamUpCall={(eventId) => {
          setSelectedEventId(null);
          setDraftCallEventId(eventId);
          setActiveTab('teams');
          smoothScrollPageTop();
        }}
      />

      <ProfileModal
        open={profileOpen}
        onClose={() => {
          if (firebaseUser) {
            markProfilePromptSeen(firebaseUser.uid);
          }
          setProfileOpen(false);
        }}
        firebaseUser={firebaseUser}
        onGoogleSignIn={handleGoogleSignIn}
        onGoogleSignOut={handleGoogleSignOut}
        onOpenAuth={(mode) => setAuthModalMode(mode)}
        student={student}
        areas={areas}
        colleges={colleges}
        mapsEnabled={mapsEnabled}
        onSaveProfile={(updates) =>
          handleSaveStudentData(updates, 'Your profile, photo, and academic info were updated.')
        }
        onDeleteAccount={handleDeleteAccount}
      />

      <AuthModal
        open={authModalMode !== null}
        initialMode={authModalMode || 'login'}
        onClose={() => setAuthModalMode(null)}
        onGoogleLogin={handleAuthFlowLogin}
        onGoogleSignUp={handleAuthFlowSignUp}
        onOpenInviteAccept={() => {
          setInitialInviteToken('');
          setInviteModalOpen(true);
        }}
      />

      <PreferencesModal
        open={preferencesOpen}
        onClose={() => setPreferencesOpen(false)}
        student={student}
        areas={areas}
        colleges={colleges}
        mapsEnabled={mapsEnabled}
        onSavePreferences={(updates) =>
          handleSaveStudentData(updates, 'Your location pin, radius, interests, and followed colleges are active.')
        }
      />

      <SuggestEventModal
        open={suggestOpen}
        onClose={() => setSuggestOpen(false)}
        colleges={colleges}
        mapsEnabled={mapsEnabled}
        defaultCollegeId={student.collegeId !== 'other' ? student.collegeId : undefined}
        onSubmitSuggestion={handleSubmitSuggestion}
      />

      <TelegramDrawer
        open={telegramOpen}
        onClose={() => setTelegramOpen(false)}
        student={student}
        notifications={notifications}
        onConnectTelegram={handleConnectTelegram}
        onSendCommand={handleSendTelegramCommand}
        onFlushDigest={handleFlushDigest}
        onToggleQuietHours={(enabled) =>
          handleSaveStudentData(
            { quietHours: { ...student.quietHours, enabled } },
            'Quiet hours setting updated.'
          )
        }
      />

      <InviteAcceptModal
        open={inviteModalOpen}
        initialTokenOrCode={initialInviteToken}
        firebaseUser={firebaseUser}
        student={student}
        onClose={() => setInviteModalOpen(false)}
        onLookupInvite={handleLookupInvite}
        onAcceptInvite={handleAcceptInvite}
      />

      <SettingsModal
        open={settingsOpen}
        initialTab={settingsInitialTab}
        student={student}
        firebaseUser={firebaseUser}
        onClose={() => setSettingsOpen(false)}
        onSaveSettings={(updates) =>
          handleSaveStudentData(updates, 'Account, notification, privacy, and display settings updated.')
        }
        onChangeTheme={handleChangeTheme}
        onOpenPreferences={() => setPreferencesOpen(true)}
        onOpenTelegram={() => setTelegramOpen(true)}
        onExportData={handleExportStudentData}
        onDeleteAccount={handleDeleteAccount}
      />
      </div>
    );

  const wrappedContent = (
    <MotionConfig reducedMotion={student?.accessibilityPrefs?.reducedMotion ? 'always' : 'user'}>
      <LayoutGroup id="connectus-root-layout">{content}</LayoutGroup>
    </MotionConfig>
  );

  if (mapsApiKey) {
    return (
      <APIProvider
        key={mapsApiKey}
        apiKey={mapsApiKey}
        libraries={['marker', 'places']}
        language="en"
        region="IN"
      >
        {wrappedContent}
      </APIProvider>
    );
  }

  return wrappedContent;
}
