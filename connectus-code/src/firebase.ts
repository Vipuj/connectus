import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getFirestore,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import type {
  BetaAccessConfig,
  BetaInviteCode,
  CallGenderFilter,
  CampusAnnouncement,
  CampusEvent,
  CampusSurvey,
  ConnectionRequest,
  EventFeedback,
  EventMode,
  EventType,
  NotificationItem,
  OrganizerStatus,
  PartnerPost,
  Registration,
  Squad,
  SquadJoinRequest,
  SquadRegistrationSnapshot,
  StudentGender,
  StudentProfile,
  SupportedLanguage,
  SurveyResponse,
  TeamChatMessage,
  TeamConversation,
  TeamUpCall,
} from './types';
import { SUPPORTED_LANGUAGES } from './types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection to Firestore on startup
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
void testConnection();

export function subscribeAuthState(cb: (user: User | null) => void) {
  return onAuthStateChanged(auth, cb);
}

export async function signInStudentWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutStudent(): Promise<void> {
  await signOut(auth);
}

function canSyncAuthenticatedFirestore(): boolean {
  return Boolean(auth.currentUser && auth.currentUser.emailVerified);
}

function toTimestampOrUndefined(iso?: string) {
  if (!iso) return undefined;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? undefined : Timestamp.fromDate(d);
}

export interface FirestoreStudentDoc {
  uid: string;
  role: 'student';
  displayName: string;
  email: string;
  phoneNumber?: string;
  photoUrl?: string;
  course: string;
  branch: string;
  semester: string;
  year: string;
  collegeId: string;
  customCollegeName?: string;
  collegePlaceId?: string;
  collegeAddress?: string;
  collegeLat?: number;
  collegeLng?: number;
  collegeVerified: boolean;
  areaId: string;
  locationLabel?: string;
  locationLat?: number;
  locationLng?: number;
  radiusKm: 5 | 10 | 20 | 50;
  interests: EventType[];
  followedCollegeIds: string[];
  onboardingCompleted: boolean;
  consentAccepted: boolean;
  skills?: string[];
  learningGoals?: string[];
  headline?: string;
  bio?: string;
  graduationYear?: string;
  rollNumber?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  leetcodeUrl?: string;
  hackerrankUrl?: string;
  instagramUrl?: string;
  savedEventIds?: string[];
  mutedAll?: boolean;
  telegramConnected?: boolean;
  telegramHandle?: string;
  telegramChatId?: string;
  quietHours?: { enabled: boolean; start: string; end: string };
  profileVisibility?: {
    linksVisibility: 'public' | 'squads' | 'hidden';
    discoverableInTeams: boolean;
    showAcademicYear: boolean;
  };
  accessibilityPrefs?: {
    reducedMotion: boolean;
    highContrastFocus: boolean;
    compactDensity: boolean;
    themePreference?: 'system' | 'light' | 'dark';
  };
  preferredModes?: EventMode[];
  availability?: 'Weekends' | 'Evenings' | 'Open to All';
  priorityLowSeatAlerts?: boolean;
  teamDiscoveryEnabled?: boolean;
  teamCallNotifications?: boolean;
  gender?: StudentGender;
  languages?: SupportedLanguage[];
}

export async function fetchStudentProfileFromFirestore(
  uid: string
): Promise<FirestoreStudentDoc | null> {
  const path = `studentProfiles/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'studentProfiles', uid));
    if (!snap.exists()) return null;
    return snap.data() as FirestoreStudentDoc;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export function subscribeStudentProfileFromFirestore(
  uid: string,
  onProfile: (profile: FirestoreStudentDoc | null) => void
): () => void {
  if (!canSyncAuthenticatedFirestore() || !uid) return () => {};
  const path = `studentProfiles/${uid}`;
  return onSnapshot(
    doc(db, 'studentProfiles', uid),
    (snap) => {
      onProfile(snap.exists() ? (snap.data() as FirestoreStudentDoc) : null);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export async function saveStudentProfileToFirestore(
  uid: string,
  profile: StudentProfile
): Promise<void> {
  const path = `studentProfiles/${uid}`;
  try {
    const ref = doc(db, 'studentProfiles', uid);
    const existing = await getDoc(ref);

    const rawCandidateName = (profile.displayName || '').trim();
    const fallbackAuthName = (auth.currentUser?.displayName || '').trim();
    const chosenName =
      rawCandidateName &&
      rawCandidateName !== 'Guest Student' &&
      rawCandidateName !== 'Student'
        ? rawCandidateName
        : fallbackAuthName || rawCandidateName || 'Student';
    const safeDisplayName = chosenName.slice(0, 120) || 'Student';
    const rawEmail = (profile.email || auth.currentUser?.email || 'student@connectus.in').trim();
    const safeEmail = (rawEmail.length >= 3 ? rawEmail : 'student@connectus.in').slice(0, 180);
    const numRadius = Number(profile.radiusKm);
    const safeRadius = ([5, 10, 20, 50].includes(numRadius) ? numRadius : 10) as 5 | 10 | 20 | 50;
    const safeInterests = Array.isArray(profile.interests)
      ? profile.interests.filter((x): x is EventType => typeof x === 'string').slice(0, 10)
      : [];
    const safeFollowed = Array.isArray(profile.followedCollegeIds)
      ? profile.followedCollegeIds.filter((x): x is string => typeof x === 'string').slice(0, 100)
      : [];
    const safeSavedEvents = Array.isArray(profile.savedEventIds)
      ? Array.from(
          new Set(profile.savedEventIds.filter((x): x is string => typeof x === 'string' && x.trim().length > 0))
        ).slice(0, 100)
      : [];
    const safeSkills = Array.isArray(profile.skills)
      ? profile.skills
          .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
          .map((x) => x.trim().slice(0, 60))
          .slice(0, 15)
      : [];
    const safeGoals = Array.isArray(profile.learningGoals)
      ? profile.learningGoals
          .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
          .map((x) => x.trim().slice(0, 60))
          .slice(0, 15)
      : [];
    const safeModes = Array.isArray(profile.preferredModes)
      ? profile.preferredModes
          .filter((m): m is EventMode => m === 'In-Person' || m === 'Hybrid' || m === 'Online')
          .slice(0, 3)
      : [];
    const safeAvailability =
      profile.availability === 'Weekends' ||
      profile.availability === 'Evenings' ||
      profile.availability === 'Open to All'
        ? profile.availability
        : 'Open to All';

    const safeGender: StudentGender =
      profile.gender === 'woman' ||
      profile.gender === 'man' ||
      profile.gender === 'non_binary' ||
      profile.gender === 'prefer_not_to_say' ||
      profile.gender === 'unset'
        ? profile.gender
        : 'unset';
    const supportedLangSet = new Set<string>(SUPPORTED_LANGUAGES);
    const safeLanguages = Array.isArray(profile.languages)
      ? Array.from(
          new Set(
            profile.languages.filter(
              (lang): lang is SupportedLanguage =>
                typeof lang === 'string' && supportedLangSet.has(lang)
            )
          )
        ).slice(0, 5)
      : [];

    const safeQuietHours = {
      enabled: Boolean(profile.quietHours?.enabled ?? true),
      start: String(profile.quietHours?.start || '22:00').slice(0, 10),
      end: String(profile.quietHours?.end || '07:00').slice(0, 10),
    };

    const rawVis = profile.profileVisibility?.linksVisibility;
    const safeProfileVisibility = {
      linksVisibility: (rawVis === 'public' || rawVis === 'squads' || rawVis === 'hidden'
        ? rawVis
        : 'public') as 'public' | 'squads' | 'hidden',
      discoverableInTeams: profile.profileVisibility?.discoverableInTeams ?? profile.teamDiscoveryEnabled !== false,
      showAcademicYear: profile.profileVisibility?.showAcademicYear !== false,
    };

    const rawThemePref = profile.accessibilityPrefs?.themePreference;
    const safeThemePref: 'system' | 'light' | 'dark' =
      rawThemePref === 'light' || rawThemePref === 'dark' || rawThemePref === 'system'
        ? rawThemePref
        : 'system';

    const safeAccessibilityPrefs = {
      reducedMotion: Boolean(profile.accessibilityPrefs?.reducedMotion),
      highContrastFocus: Boolean(profile.accessibilityPrefs?.highContrastFocus),
      compactDensity: Boolean(profile.accessibilityPrefs?.compactDensity),
      themePreference: safeThemePref,
    };

    const mutableFields = {
      displayName: safeDisplayName,
      email: safeEmail,
      phoneNumber: (profile.phoneNumber || '').trim().slice(0, 24),
      photoUrl: (profile.photoUrl || '').slice(0, 80000),
      course: (profile.course || 'B.Tech').trim().slice(0, 60) || 'B.Tech',
      branch: (profile.branch || 'CSE').trim().slice(0, 80) || 'CSE',
      semester: (profile.semester || 'Sem 1').trim().slice(0, 30) || 'Sem 1',
      year: (profile.year || '1st Year').trim().slice(0, 30) || '1st Year',
      collegeId: (profile.collegeId || 'other').trim().slice(0, 80) || 'other',
      customCollegeName: (profile.customCollegeName || '').trim().slice(0, 150),
      ...(profile.collegePlaceId
        ? { collegePlaceId: profile.collegePlaceId.slice(0, 140) }
        : {}),
      ...(profile.collegeAddress
        ? { collegeAddress: profile.collegeAddress.slice(0, 240) }
        : {}),
      ...(typeof profile.collegeLat === 'number' && !Number.isNaN(profile.collegeLat)
        ? { collegeLat: profile.collegeLat }
        : {}),
      ...(typeof profile.collegeLng === 'number' && !Number.isNaN(profile.collegeLng)
        ? { collegeLng: profile.collegeLng }
        : {}),
      collegeVerified: Boolean(profile.collegeVerified),
      areaId: (profile.areaId || 'area-kompally').trim().slice(0, 80) || 'area-kompally',
      ...(profile.locationLabel
        ? { locationLabel: profile.locationLabel.slice(0, 160) }
        : {}),
      ...(typeof profile.locationLat === 'number' && !Number.isNaN(profile.locationLat)
        ? { locationLat: profile.locationLat }
        : {}),
      ...(typeof profile.locationLng === 'number' && !Number.isNaN(profile.locationLng)
        ? { locationLng: profile.locationLng }
        : {}),
      radiusKm: safeRadius,
      interests: safeInterests,
      followedCollegeIds: safeFollowed,
      savedEventIds: safeSavedEvents,
      skills: safeSkills,
      learningGoals: safeGoals,
      headline: (profile.headline || '').trim().slice(0, 140),
      bio: (profile.bio || '').trim().slice(0, 300),
      graduationYear: (profile.graduationYear || '').trim().slice(0, 16),
      rollNumber: (profile.rollNumber || '').trim().slice(0, 40),
      linkedinUrl: (profile.linkedinUrl || '').trim().slice(0, 200),
      githubUrl: (profile.githubUrl || '').trim().slice(0, 200),
      portfolioUrl: (profile.portfolioUrl || '').trim().slice(0, 200),
      leetcodeUrl: (profile.leetcodeUrl || '').trim().slice(0, 200),
      hackerrankUrl: (profile.hackerrankUrl || '').trim().slice(0, 200),
      instagramUrl: (profile.instagramUrl || '').trim().slice(0, 200),
      preferredModes: safeModes,
      availability: safeAvailability,
      priorityLowSeatAlerts: profile.priorityLowSeatAlerts !== false,
      teamDiscoveryEnabled: profile.teamDiscoveryEnabled !== false,
      teamCallNotifications: profile.teamCallNotifications !== false,
      mutedAll: Boolean(profile.mutedAll),
      telegramConnected: Boolean(profile.telegramConnected),
      telegramHandle: (profile.telegramHandle || '').trim().slice(0, 64),
      ...(profile.telegramChatId
        ? { telegramChatId: profile.telegramChatId.trim().slice(0, 64) }
        : {}),
      quietHours: safeQuietHours,
      profileVisibility: safeProfileVisibility,
      accessibilityPrefs: safeAccessibilityPrefs,
      gender: safeGender,
      languages: safeLanguages,
      onboardingCompleted: Boolean(profile.onboardingCompleted),
      consentAccepted: Boolean(profile.consentAccepted),
      updatedAt: serverTimestamp(),
    };

    if (!existing.exists()) {
      await setDoc(ref, {
        uid,
        role: 'student' as const,
        ...mutableFields,
        createdAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, mutableFields);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteStudentProfileFromFirestore(uid: string): Promise<void> {
  const path = `studentProfiles/${uid}`;
  try {
    await deleteDoc(doc(db, 'studentProfiles', uid));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function deleteAllStudentDataFromFirestore(uid: string): Promise<void> {
  if (!canSyncAuthenticatedFirestore()) return;

  const queriesToDelete = [
    query(collection(db, 'registrations'), where('userId', '==', uid)),
    query(collection(db, 'partnerPosts'), where('userId', '==', uid)),
    query(collection(db, 'eventFeedback'), where('userId', '==', uid)),
    query(collection(db, 'surveyResponses'), where('userId', '==', uid)),
    query(collection(db, 'teamUpCalls'), where('creatorId', '==', uid)),
    query(collection(db, 'squads'), where('ownerId', '==', uid), where('memberIds', 'array-contains', uid)),
  ];

  for (const q of queriesToDelete) {
    try {
      const snap = await getDocs(q);
      if (snap.empty) continue;
      let batch = writeBatch(db);
      let count = 0;
      for (const docSnap of snap.docs) {
        batch.delete(docSnap.ref);
        count += 1;
        if (count >= 400) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }
      if (count > 0) {
        await batch.commit();
      }
    } catch {
      // Continue wiping remaining collections even if a subset fails
    }
  }

  await deleteStudentProfileFromFirestore(uid).catch(() => {});
}

export interface FirestoreOrganizerAppDoc {
  uid: string;
  clubName: string;
  contactName: string;
  designation: string;
  officialEmail: string;
  facultyEmail?: string;
  collegeId: string;
  domainMatched: boolean;
  proofNote: string;
  status: OrganizerStatus;
}

export async function submitOrganizerApplicationToFirestore(
  uid: string,
  payload: Omit<FirestoreOrganizerAppDoc, 'uid' | 'status'>
): Promise<void> {
  const path = `organizerApplications/${uid}`;
  try {
    const ref = doc(db, 'organizerApplications', uid);
    const existing = await getDoc(ref);

    const safeClubName = payload.clubName.trim().slice(0, 140);
    const safeContactName = payload.contactName.trim().slice(0, 120);
    const safeEmail = payload.officialEmail.trim().slice(0, 180);
    const safeCollegeId = (payload.collegeId || 'other').trim().slice(0, 80) || 'other';
    const rawProof = (payload.proofNote || '').trim();
    const safeProofNote = (
      rawProof.length >= 4 ? rawProof : 'College institutional verification submitted.'
    ).slice(0, 400);

    const mutableFields = {
      clubName: safeClubName.length >= 2 ? safeClubName : 'Campus Club',
      contactName: safeContactName.length >= 2 ? safeContactName : 'Coordinator',
      designation: payload.designation,
      officialEmail: safeEmail.length >= 3 ? safeEmail : 'official@connectus.in',
      ...(payload.facultyEmail ? { facultyEmail: payload.facultyEmail.trim().slice(0, 180) } : {}),
      collegeId: safeCollegeId,
      domainMatched: Boolean(payload.domainMatched),
      proofNote: safeProofNote,
      updatedAt: serverTimestamp(),
    };

    if (!existing.exists()) {
      await setDoc(ref, {
        uid,
        ...mutableFields,
        status: 'pending' as const,
        createdAt: serverTimestamp(),
      });
    } else if (existing.data()?.status === 'pending') {
      await updateDoc(ref, mutableFields);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchAllOrganizerApplicationsForAdmin(): Promise<FirestoreOrganizerAppDoc[]> {
  const path = 'organizerApplications';
  try {
    const snaps = await getDocs(collection(db, path));
    return snaps.docs.map((d) => d.data() as FirestoreOrganizerAppDoc);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function updateOrganizerApplicationStatusInFirestore(
  uid: string,
  status: 'approved' | 'rejected'
): Promise<void> {
  const path = `organizerApplications/${uid}`;
  try {
    await updateDoc(doc(db, 'organizerApplications', uid), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export interface FirestoreOfficialMembershipDoc {
  uid: string;
  collegeId: string;
  clubName: string;
  contactName: string;
  email: string;
  designation: string;
  memberRole: 'college_official' | 'club_leader';
  invitedByUid?: string;
  inviteToken?: string;
  status: 'approved' | 'revoked';
}

export async function fetchOfficialMembershipFromFirestore(
  uid: string
): Promise<FirestoreOfficialMembershipDoc | null> {
  const path = `officialMemberships/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'officialMemberships', uid));
    if (!snap.exists()) return null;
    const data = snap.data() as FirestoreOfficialMembershipDoc;
    if ((data.email || '').trim().toLowerCase() === BETA_STUDENT_EMAIL) {
      return null;
    }
    return data;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveOfficialInviteToFirestore(params: {
  token: string;
  code: string;
  collegeId: string;
  clubName: string;
  createdByUid: string;
  createdByName: string;
  createdByEmail: string;
  targetEmail?: string;
  maxUses: number;
}): Promise<void> {
  const path = `officialInvites/${params.token}`;
  try {
    await setDoc(doc(db, 'officialInvites', params.token), {
      token: params.token.slice(0, 128),
      code: params.code.slice(0, 40),
      collegeId: params.collegeId.slice(0, 80),
      clubName: params.clubName.slice(0, 140),
      createdByUid: params.createdByUid.slice(0, 128),
      createdByName: params.createdByName.slice(0, 120),
      createdByEmail: params.createdByEmail.slice(0, 180),
      ...(params.targetEmail ? { targetEmail: params.targetEmail.slice(0, 180) } : {}),
      maxUses: Math.min(50, Math.max(1, params.maxUses)),
      usedCount: 0,
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function acceptOfficialInviteInFirestore(params: {
  uid: string;
  inviteToken: string;
  collegeId: string;
  clubName: string;
  contactName: string;
  email: string;
  invitedByUid?: string;
}): Promise<void> {
  const path = `officialMemberships/${params.uid}`;
  try {
    const inviteRef = doc(db, 'officialInvites', params.inviteToken);
    const inviteSnap = await getDoc(inviteRef);
    if (!inviteSnap.exists()) return;
    const inviteData = inviteSnap.data() as {
      usedCount?: number;
      maxUses?: number;
      status?: string;
    };
    const nextUsed = (inviteData.usedCount || 0) + 1;
    const maxUses = inviteData.maxUses || 1;
    const nextStatus = nextUsed >= maxUses ? 'used' : 'active';

    const batch = writeBatch(db);
    batch.set(doc(db, 'officialMemberships', params.uid), {
      uid: params.uid.slice(0, 128),
      collegeId: params.collegeId.slice(0, 80),
      clubName: params.clubName.slice(0, 140),
      contactName: params.contactName.slice(0, 120),
      email: params.email.slice(0, 180),
      designation: 'Invited Club Leader',
      memberRole: 'club_leader',
      ...(params.invitedByUid ? { invitedByUid: params.invitedByUid.slice(0, 128) } : {}),
      inviteToken: params.inviteToken.slice(0, 128),
      status: 'approved',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.update(inviteRef, {
      usedCount: nextUsed,
      status: nextStatus,
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// --- Teams Firestore Persistence (Starter-tier verified client sync) ---

export async function syncPartnerPostToFirestore(post: PartnerPost): Promise<void> {
  if (!canSyncAuthenticatedFirestore() || auth.currentUser?.uid !== post.userId) return;
  const path = `partnerPosts/${post.id}`;
  try {
    const ref = doc(db, 'partnerPosts', post.id);
    const existing = await getDoc(ref);
    const payload = {
      id: post.id.slice(0, 128),
      eventId: post.eventId.slice(0, 128),
      eventTitle: post.eventTitle.slice(0, 200),
      eventType: String(post.eventType).slice(0, 40),
      userId: post.userId.slice(0, 128),
      userName: post.userName.slice(0, 120),
      ...(post.collegeId ? { collegeId: post.collegeId.slice(0, 80) } : {}),
      collegeShortName: (post.collegeShortName || 'Campus').slice(0, 60),
      branch: (post.branch || 'CSE').slice(0, 80),
      year: (post.year || '1st Year').slice(0, 40),
      skills: (post.skills || []).slice(0, 15),
      roleSkill: post.roleSkill.slice(0, 100),
      lookingFor: post.lookingFor.slice(0, 120),
      teamSlotsNeeded: Math.min(10, Math.max(1, Number(post.teamSlotsNeeded) || 1)),
      note: (post.note || '').slice(0, 300),
      whatsappReady: Boolean(post.whatsappReady),
      discoveryEnabled: post.discoveryEnabled !== false,
      createdAt: existing.exists() ? existing.data()?.createdAt || serverTimestamp() : serverTimestamp(),
    };
    await setDoc(ref, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deletePartnerPostFromFirestore(postId: string): Promise<void> {
  if (!canSyncAuthenticatedFirestore()) return;
  const path = `partnerPosts/${postId}`;
  try {
    await deleteDoc(doc(db, 'partnerPosts', postId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function syncSquadToFirestore(squad: Squad): Promise<void> {
  if (!canSyncAuthenticatedFirestore()) return;
  const uid = auth.currentUser?.uid;
  if (!uid || (!squad.memberIds.includes(uid) && squad.ownerId !== uid)) return;
  const path = `squads/${squad.id}`;
  try {
    const ref = doc(db, 'squads', squad.id);
    const existing = await getDoc(ref);
    const payload = {
      id: squad.id.slice(0, 128),
      name: squad.name.slice(0, 80),
      eventId: squad.eventId.slice(0, 128),
      eventTitle: squad.eventTitle.slice(0, 200),
      eventType: String(squad.eventType).slice(0, 40),
      ownerId: squad.ownerId.slice(0, 128),
      targetSize: Math.min(10, Math.max(2, Number(squad.targetSize) || 4)),
      requiredRoles: (squad.requiredRoles || []).slice(0, 10),
      recruitmentStatus: squad.recruitmentStatus,
      isLocked: Boolean(squad.isLocked),
      ...(squad.whatsappGroupUrl
        ? { whatsappGroupUrl: squad.whatsappGroupUrl.slice(0, 300) }
        : {}),
      memberIds: squad.memberIds.slice(0, 10),
      createdAt: existing.exists() ? existing.data()?.createdAt || serverTimestamp() : serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (!existing.exists()) {
      if (squad.ownerId !== uid) return;
      await setDoc(ref, payload);
    } else {
      await updateDoc(ref, payload);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function syncConnectionRequestToFirestore(reqItem: ConnectionRequest): Promise<void> {
  if (!canSyncAuthenticatedFirestore()) return;
  const uid = auth.currentUser?.uid;
  if (!uid || (reqItem.fromUserId !== uid && reqItem.toUserId !== uid)) return;
  const path = `connectionRequests/${reqItem.id}`;
  try {
    const ref = doc(db, 'connectionRequests', reqItem.id);
    const existing = await getDoc(ref);
    const expiresTs = toTimestampOrUndefined(reqItem.expiresAt);
    if (!existing.exists()) {
      if (reqItem.fromUserId !== uid) return;
      await setDoc(ref, {
        id: reqItem.id.slice(0, 128),
        eventId: reqItem.eventId.slice(0, 128),
        eventTitle: reqItem.eventTitle.slice(0, 200),
        fromUserId: reqItem.fromUserId.slice(0, 128),
        toUserId: reqItem.toUserId.slice(0, 128),
        note: (reqItem.note || '').slice(0, 300),
        status: 'pending',
        ...(expiresTs ? { expiresAt: expiresTs } : {}),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        status: reqItem.status,
        ...(reqItem.conversationId ? { conversationId: reqItem.conversationId.slice(0, 128) } : {}),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function syncJoinRequestToFirestore(reqItem: SquadJoinRequest): Promise<void> {
  if (!canSyncAuthenticatedFirestore()) return;
  const uid = auth.currentUser?.uid;
  if (!uid || (reqItem.applicantId !== uid && reqItem.squadOwnerId !== uid)) return;
  const path = `joinRequests/${reqItem.id}`;
  try {
    const ref = doc(db, 'joinRequests', reqItem.id);
    const existing = await getDoc(ref);
    const expiresTs = toTimestampOrUndefined(reqItem.expiresAt);
    if (!existing.exists()) {
      if (reqItem.applicantId !== uid) return;
      await setDoc(ref, {
        id: reqItem.id.slice(0, 128),
        squadId: reqItem.squadId.slice(0, 128),
        squadOwnerId: reqItem.squadOwnerId.slice(0, 128),
        eventId: reqItem.eventId.slice(0, 128),
        applicantId: reqItem.applicantId.slice(0, 128),
        roleApplied: (reqItem.roleApplied || '').slice(0, 80),
        note: (reqItem.note || '').slice(0, 300),
        status: 'pending',
        ...(expiresTs ? { expiresAt: expiresTs } : {}),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else if (reqItem.squadOwnerId === uid) {
      await updateDoc(ref, {
        status: reqItem.status,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function syncTeamUpCallToFirestore(call: TeamUpCall): Promise<void> {
  if (!canSyncAuthenticatedFirestore() || auth.currentUser?.uid !== call.creatorId) return;
  const path = `teamUpCalls/${call.id}`;
  try {
    const ref = doc(db, 'teamUpCalls', call.id);
    const existing = await getDoc(ref);
    const expiresTs = toTimestampOrUndefined(call.expiresAt);
    const safeEventIds = Array.from(
      new Set(
        (Array.isArray(call.eventIds) && call.eventIds.length > 0 ? call.eventIds : [call.eventId])
          .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
          .map((id) => id.trim().slice(0, 128))
      )
    ).slice(0, 3);
    const safeEvents = (
      Array.isArray(call.events) && call.events.length > 0
        ? call.events
        : [{ id: call.eventId, title: call.eventTitle, type: call.eventType }]
    )
      .slice(0, 3)
      .map((ev) => ({
        id: String(ev.id || call.eventId).slice(0, 128),
        title: String(ev.title || call.eventTitle || '').slice(0, 200),
        type: ev.type || call.eventType,
        ...(ev.regDeadline ? { regDeadline: String(ev.regDeadline).slice(0, 60) } : {}),
      }));
    const supportedLangSet = new Set<string>(SUPPORTED_LANGUAGES);
    const safeAreas = Array.from(
      new Set(
        (Array.isArray(call.preferredAreas) ? call.preferredAreas : [])
          .filter((a): a is string => typeof a === 'string' && a.trim().length > 0)
          .map((a) => a.trim().slice(0, 80))
      )
    ).slice(0, 16);
    const safeLanguages = Array.from(
      new Set(
        (Array.isArray(call.preferredLanguages) ? call.preferredLanguages : []).filter(
          (l): l is SupportedLanguage => typeof l === 'string' && supportedLangSet.has(l)
        )
      )
    ).slice(0, 10);
    const safeGenderPref: CallGenderFilter =
      call.genderPreference === 'woman' ||
      call.genderPreference === 'man' ||
      call.genderPreference === 'non_binary' ||
      call.genderPreference === 'any'
        ? call.genderPreference
        : 'any';

    const payload = {
      id: call.id.slice(0, 128),
      eventId: (safeEventIds[0] || call.eventId).slice(0, 128),
      eventIds: safeEventIds.length > 0 ? safeEventIds : [call.eventId.slice(0, 128)],
      events: safeEvents,
      creatorId: call.creatorId.slice(0, 128),
      teammatesNeeded: Math.min(8, Math.max(1, Number(call.teammatesNeeded) || 1)),
      preferredCollege: (call.preferredCollege || 'Any').slice(0, 80),
      preferredYear: (call.preferredYear || 'Any').slice(0, 40),
      preferredSkills: (call.preferredSkills || []).slice(0, 10),
      rolesNeeded: (call.rolesNeeded || []).slice(0, 10),
      preferredAreas: safeAreas,
      preferredLanguages: safeLanguages,
      genderPreference: safeGenderPref,
      audienceMode: call.audienceMode,
      note: (call.note || '').slice(0, 300),
      eligibleCount: Math.min(1000, Math.max(0, Number(call.eligibleCount) || 0)),
      recipientUserIds: (call.recipientUserIds || []).slice(0, 50),
      status: call.status,
      ...(expiresTs ? { expiresAt: expiresTs } : {}),
      createdAt: existing.exists() ? existing.data()?.createdAt || serverTimestamp() : serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (!existing.exists()) {
      await setDoc(ref, payload);
    } else {
      await updateDoc(ref, payload);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function syncConversationToFirestore(conv: TeamConversation): Promise<void> {
  if (!canSyncAuthenticatedFirestore()) return;
  const uid = auth.currentUser?.uid;
  if (!uid || !conv.participantIds.includes(uid) || conv.participantIds.length !== 2) return;
  const path = `conversations/${conv.id}`;
  try {
    const ref = doc(db, 'conversations', conv.id);
    const existing = await getDoc(ref);
    const payload = {
      id: conv.id.slice(0, 128),
      eventId: conv.eventId.slice(0, 128),
      participantIds: conv.participantIds.slice(0, 2),
      confirmedByUserIds: (conv.confirmedByUserIds || []).slice(0, 2),
      status: conv.status,
      createdAt: existing.exists() ? existing.data()?.createdAt || serverTimestamp() : serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (!existing.exists()) {
      await setDoc(ref, payload);
    } else {
      await updateDoc(ref, payload);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function syncChatMessageToFirestore(
  message: TeamChatMessage,
  participantIds: string[]
): Promise<void> {
  if (!canSyncAuthenticatedFirestore()) return;
  const uid = auth.currentUser?.uid;
  if (!uid || message.senderId !== uid || !participantIds.includes(uid)) return;
  const path = `chatMessages/${message.id}`;
  try {
    await setDoc(doc(db, 'chatMessages', message.id), {
      id: message.id.slice(0, 128),
      roomId: message.roomId.slice(0, 128),
      roomScope: message.roomScope || 'conversation',
      senderId: message.senderId.slice(0, 128),
      senderName: (message.senderName || 'Student').slice(0, 120),
      kind: message.kind,
      body: message.body.slice(0, 1000),
      participantIds: participantIds.slice(0, 10),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function syncRegistrationSnapshotToFirestore(
  snapshot: SquadRegistrationSnapshot
): Promise<void> {
  if (!canSyncAuthenticatedFirestore()) return;
  const uid = auth.currentUser?.uid;
  const memberIds = snapshot.members.map((m) => m.userId).slice(0, 10);
  if (!uid || !memberIds.includes(uid)) return;
  const path = `registrationSnapshots/${snapshot.id}`;
  try {
    const ref = doc(db, 'registrationSnapshots', snapshot.id);
    const existing = await getDoc(ref);
    const payload = {
      id: snapshot.id.slice(0, 128),
      squadId: snapshot.squadId.slice(0, 128),
      eventId: snapshot.eventId.slice(0, 128),
      submittedByUserId: snapshot.submittedByUserId.slice(0, 128),
      memberIds,
      status: snapshot.status,
      rosterHash: snapshot.rosterHash.slice(0, 200),
      submittedAt: existing.exists()
        ? existing.data()?.submittedAt || serverTimestamp()
        : serverTimestamp(),
    };
    if (!existing.exists()) {
      await setDoc(ref, payload);
    } else {
      await updateDoc(ref, payload);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// --- Beta Access & Official Governance Persistence ---

export const BETA_OFFICIAL_EMAIL = 'nvipuj@gmail.com';
export const BETA_OFFICIAL_EMAILS = new Set([
  'nvipuj@gmail.com',
]);
export const BETA_CLUB_LEADER_EMAIL = 'janumpallyvinaychandra@gmail.com';
export const BETA_STUDENT_EMAIL = 'vipujgaming@gmail.com';

export function isBetaOfficialEmail(email?: string | null): boolean {
  if (!email) return false;
  return BETA_OFFICIAL_EMAILS.has(email.trim().toLowerCase());
}

export async function hashEmailHex(email: string): Promise<string> {
  const clean = email.trim().toLowerCase();
  const encoded = new TextEncoder().encode(clean);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    if (Array.isArray(v)) {
      out[k] = v.map((item) =>
        item && typeof item === 'object' && !(item instanceof Timestamp)
          ? stripUndefined(item as Record<string, unknown>)
          : item
      );
    } else if (v && typeof v === 'object' && !(v instanceof Timestamp)) {
      out[k] = stripUndefined(v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out as T;
}

export async function ensureOfficialMembershipInFirestore(user: User): Promise<void> {
  if (!user.emailVerified || !user.email) return;
  const cleanEmail = user.email.trim().toLowerCase();
  const isFixedOfficial = isBetaOfficialEmail(cleanEmail);
  const isFixedClubLeader = cleanEmail === BETA_CLUB_LEADER_EMAIL;

  if (cleanEmail === BETA_STUDENT_EMAIL) {
    try {
      const memRef = doc(db, 'officialMemberships', user.uid);
      const existing = await getDoc(memRef);
      if (existing.exists()) {
        await deleteDoc(memRef);
      }
    } catch {
      // ignore if already removed or restricted
    }
    return;
  }

  if (!isFixedOfficial && !isFixedClubLeader) return;

  const memPath = `officialMemberships/${user.uid}`;
  try {
    const memRef = doc(db, 'officialMemberships', user.uid);
    const existing = await getDoc(memRef);
    if (!existing.exists()) {
      await setDoc(memRef, {
        uid: user.uid.slice(0, 128),
        collegeId: 'col-iiith',
        clubName: isFixedOfficial
          ? 'IIIT Hyderabad Student Affairs & Clubs Office'
          : 'IIITH Coding & Robotics Club',
        contactName: (
          user.displayName ||
          (isFixedOfficial ? 'Campus Official' : 'Vinay Chandra Janumpally')
        ).slice(0, 120),
        email: cleanEmail.slice(0, 180),
        designation: isFixedOfficial ? 'Campus Official' : 'Invited Club Leader',
        memberRole: isFixedOfficial ? 'college_official' : 'club_leader',
        status: 'approved',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, memPath);
  }

  if (isFixedOfficial) {
    try {
      const cfgRef = doc(db, 'betaConfig', 'main');
      const cfgSnap = await getDoc(cfgRef);
      if (!cfgSnap.exists()) {
        await setDoc(cfgRef, {
          id: 'main',
          enabled: false,
          maxSeats: 6,
          managerEmail: cleanEmail,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else if ((cfgSnap.data() as { managerEmail?: string }).managerEmail !== cleanEmail) {
        await updateDoc(cfgRef, {
          managerEmail: cleanEmail,
          updatedAt: serverTimestamp(),
        });
      }
      for (const officialEmail of BETA_OFFICIAL_EMAILS) {
        await syncBetaSeatToFirestore(officialEmail, 'college_official');
      }
      await syncBetaSeatToFirestore(BETA_CLUB_LEADER_EMAIL, 'club_leader');
      await syncBetaSeatToFirestore(BETA_STUDENT_EMAIL, 'student');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'betaConfig/main');
    }
  }
}

export async function syncBetaConfigToFirestore(enabled: boolean, maxSeats = 6): Promise<void> {
  if (!canSyncAuthenticatedFirestore()) return;
  const path = 'betaConfig/main';
  try {
    const ref = doc(db, 'betaConfig', 'main');
    const existing = await getDoc(ref);
    const currentEmail = auth.currentUser?.email?.trim().toLowerCase();
    const managerEmail = isBetaOfficialEmail(currentEmail) ? currentEmail! : BETA_OFFICIAL_EMAIL;
    if (!existing.exists()) {
      await setDoc(ref, {
        id: 'main',
        enabled: Boolean(enabled),
        maxSeats: Math.min(20, Math.max(2, Number(maxSeats) || 6)),
        managerEmail,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        enabled: Boolean(enabled),
        maxSeats: Math.min(20, Math.max(2, Number(maxSeats) || 6)),
        managerEmail,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchBetaConfigFromFirestore(): Promise<{
  enabled: boolean;
  maxSeats: number;
} | null> {
  if (!canSyncAuthenticatedFirestore()) return null;
  const path = 'betaConfig/main';
  try {
    const snap = await getDoc(doc(db, 'betaConfig', 'main'));
    if (!snap.exists()) return null;
    const d = snap.data() as { enabled?: boolean; maxSeats?: number };
    return {
      enabled: d.enabled !== false,
      maxSeats: Number(d.maxSeats) || 6,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function syncBetaSeatToFirestore(
  email: string,
  role: 'college_official' | 'club_leader' | 'student',
  invitedByCode?: string
): Promise<void> {
  if (!canSyncAuthenticatedFirestore()) return;
  const clean = email.trim().toLowerCase();
  const seatId = await hashEmailHex(clean);
  const path = `betaSeats/${seatId}`;
  try {
    const ref = doc(db, 'betaSeats', seatId);
    const existing = await getDoc(ref);
    if (!existing.exists()) {
      await setDoc(ref, {
        seatId,
        email: clean.slice(0, 180),
        role,
        status: 'active',
        ...(invitedByCode ? { invitedByCode: invitedByCode.slice(0, 32) } : {}),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        role,
        status: 'active',
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function removeBetaSeatFromFirestore(email: string): Promise<void> {
  if (!canSyncAuthenticatedFirestore()) return;
  const seatId = await hashEmailHex(email);
  const path = `betaSeats/${seatId}`;
  try {
    await deleteDoc(doc(db, 'betaSeats', seatId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function fetchAllBetaSeatsFromFirestore(): Promise<string[]> {
  if (!canSyncAuthenticatedFirestore()) return [];
  const path = 'betaSeats';
  try {
    const snaps = await getDocs(collection(db, path));
    const list: string[] = [];
    for (const d of snaps.docs) {
      const data = d.data() as { email?: string; status?: string };
      if (data.status === 'active' && data.email) {
        list.push(data.email.trim().toLowerCase());
      }
    }
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveBetaInviteCodeToFirestore(entry: BetaInviteCode): Promise<void> {
  if (!canSyncAuthenticatedFirestore()) return;
  const codeId = entry.code.trim().toUpperCase().slice(0, 32);
  const path = `betaInviteCodes/${codeId}`;
  try {
    await setDoc(doc(db, 'betaInviteCodes', codeId), {
      code: codeId,
      ...(entry.label ? { label: entry.label.slice(0, 80) } : {}),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function fetchAllBetaInviteCodesFromFirestore(): Promise<BetaInviteCode[]> {
  if (!canSyncAuthenticatedFirestore()) return [];
  const path = 'betaInviteCodes';
  try {
    const snaps = await getDocs(collection(db, path));
    return snaps.docs.map((d) => {
      const data = d.data() as {
        code: string;
        label?: string;
        createdAt?: Timestamp;
        usedByEmail?: string;
        usedAt?: Timestamp;
      };
      return {
        code: data.code,
        ...(data.label ? { label: data.label } : {}),
        createdAt: data.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
        ...(data.usedByEmail ? { usedByEmail: data.usedByEmail } : {}),
        ...(data.usedAt ? { usedAt: data.usedAt.toDate?.().toISOString() } : {}),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function revokeBetaInviteCodeInFirestore(code: string): Promise<void> {
  if (!canSyncAuthenticatedFirestore()) return;
  const codeId = code.trim().toUpperCase().slice(0, 32);
  const path = `betaInviteCodes/${codeId}`;
  try {
    await deleteDoc(doc(db, 'betaInviteCodes', codeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function redeemBetaCodeInFirestore(code: string, userEmail: string): Promise<boolean> {
  if (!canSyncAuthenticatedFirestore()) return false;
  const codeId = code.trim().toUpperCase().slice(0, 32);
  const cleanEmail = userEmail.trim().toLowerCase().slice(0, 180);
  const path = `betaInviteCodes/${codeId}`;
  try {
    const codeRef = doc(db, 'betaInviteCodes', codeId);
    const codeSnap = await getDoc(codeRef);
    if (!codeSnap.exists()) return false;
    const codeData = codeSnap.data() as { usedAt?: unknown };
    if (codeData.usedAt) return false;

    const seatId = await hashEmailHex(cleanEmail);
    const seatRef = doc(db, 'betaSeats', seatId);
    const batch = writeBatch(db);
    batch.update(codeRef, {
      usedByEmail: cleanEmail,
      usedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.set(seatRef, {
      seatId,
      email: cleanEmail,
      role: 'student',
      status: 'active',
      invitedByCode: codeId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchBetaHydrationForManager(): Promise<BetaAccessConfig | null> {
  if (!canSyncAuthenticatedFirestore()) return null;
  const [cfg, emails, codes] = await Promise.all([
    fetchBetaConfigFromFirestore(),
    fetchAllBetaSeatsFromFirestore(),
    fetchAllBetaInviteCodesFromFirestore(),
  ]);
  if (!cfg && emails.length === 0 && codes.length === 0) return null;
  return {
    enabled: cfg?.enabled ?? false,
    maxSeats: cfg?.maxSeats ?? 6,
    allowedEmails: Array.from(
      new Set([...Array.from(BETA_OFFICIAL_EMAILS), BETA_CLUB_LEADER_EMAIL, BETA_STUDENT_EMAIL, ...emails])
    ),
    inviteCodes: codes,
  };
}

// --- Shared Cross-Device Persistence: Events, Registrations, Announcements, Notifications ---

function sanitizeCampusEventForFirestore(
  event: CampusEvent,
  ownerUid: string,
  submittedByEmail: string
) {
  return stripUndefined({
    id: event.id.slice(0, 128),
    clubId: event.clubId.slice(0, 128),
    clubName: event.clubName.slice(0, 140),
    collegeId: event.collegeId.slice(0, 80),
    title: event.title.slice(0, 200),
    description: (event.description || '').slice(0, 4000),
    type: event.type,
    startAt: event.startAt.slice(0, 60),
    endAt: event.endAt.slice(0, 60),
    venueName: event.venueName.slice(0, 200),
    areaId: (event.areaId || 'area-gachibowli').slice(0, 80),
    placeId: event.placeId?.slice(0, 140),
    formattedAddress: event.formattedAddress?.slice(0, 240),
    lat: typeof event.lat === 'number' && !Number.isNaN(event.lat) ? event.lat : 17.445,
    lng: typeof event.lng === 'number' && !Number.isNaN(event.lng) ? event.lng : 78.348,
    mode: event.mode,
    audience: event.audience,
    regStatus: event.regStatus,
    branches: (event.branches || ['All']).slice(0, 30),
    years: (event.years || ['All']).slice(0, 15),
    feeInr: Math.max(0, Number(event.feeInr) || 0),
    capacity: Math.max(1, Number(event.capacity) || 100),
    confirmedCount: Math.max(0, Number(event.confirmedCount) || 0),
    waitlistCount: Math.max(0, Number(event.waitlistCount) || 0),
    regDeadline: event.regDeadline.slice(0, 60),
    regLink: (event.regLink || 'https://connectus.in').slice(0, 300),
    googleFormUrl: event.googleFormUrl?.slice(0, 300),
    whatsappGroupUrl: event.whatsappGroupUrl?.slice(0, 300),
    telegramGroupUrl: event.telegramGroupUrl?.slice(0, 300),
    paymentInfo: event.paymentInfo,
    rules: event.rules?.slice(0, 20),
    teamSize: event.teamSize?.slice(0, 80),
    prizesAndPerks: event.prizesAndPerks?.slice(0, 20),
    prerequisites: event.prerequisites?.slice(0, 20),
    schedule: Array.isArray(event.schedule) ? event.schedule.slice(0, 14) : undefined,
    coordinatorContact: event.coordinatorContact,
    posterUrl: (() => {
      const raw = (event.posterUrl || '').trim();
      const fallback = '/src/assets/images/poster_ai_hackathon_1795081969222.jpg';
      if (!raw) return fallback;
      if (raw.length <= 350000) return raw;
      // Never slice base64 data URIs mid-stream (causes broken images)
      return raw.startsWith('data:') ? fallback : raw.slice(0, 350000);
    })(),
    additionalPosterUrls: Array.isArray(event.additionalPosterUrls)
      ? event.additionalPosterUrls.filter((u): u is string => typeof u === 'string' && u.length <= 350000).slice(0, 8)
      : undefined,
    promoVideoUrl: event.promoVideoUrl?.slice(0, 400),
    promoVideoCaption: event.promoVideoCaption?.slice(0, 200),
    source: event.source,
    sourceType: event.sourceType,
    isSponsored: Boolean(event.isSponsored),
    sponsorLabel: event.sponsorLabel?.slice(0, 80),
    submissionFeedback: event.submissionFeedback?.slice(0, 400),
    submittedById: event.submittedById?.slice(0, 128),
    submittedByName: event.submittedByName?.slice(0, 120),
    approvedById: event.approvedById?.slice(0, 128),
    approvedByName: event.approvedByName?.slice(0, 120),
    pendingRevision: event.pendingRevision,
    revisionPendingReview: Boolean(event.revisionPendingReview),
    approvalHistory: event.approvalHistory?.slice(0, 30),
    aiConfidence: event.aiConfidence,
    status: event.status,
    changeNotice: event.changeNotice?.slice(0, 400),
    ownerUid: ownerUid.slice(0, 128),
    submittedByEmail: submittedByEmail.slice(0, 180),
  });
}

function docToCampusEvent(raw: Record<string, unknown>): CampusEvent {
  const { createdAt, updatedAt: _u, ownerUid: _o, submittedByEmail: _se, ...rest } = raw;
  const createdIso =
    createdAt && typeof (createdAt as Timestamp).toDate === 'function'
      ? (createdAt as Timestamp).toDate().toISOString()
      : typeof createdAt === 'string'
        ? createdAt
        : new Date().toISOString();
  return {
    ...(rest as unknown as CampusEvent),
    createdAt: createdIso,
  };
}

export async function syncEventToFirestore(event: CampusEvent): Promise<void> {
  if (!canSyncAuthenticatedFirestore()) return;
  const uid = auth.currentUser?.uid;
  const email = (auth.currentUser?.email || '').trim().toLowerCase();
  if (!uid) return;
  const path = `events/${event.id}`;
  try {
    const ref = doc(db, 'events', event.id);
    const existing = await getDoc(ref);
    const preservedOwnerUid =
      existing.exists() && typeof existing.data()?.ownerUid === 'string'
        ? (existing.data()?.ownerUid as string)
        : uid;
    const preservedSubmittedEmail =
      existing.exists() && typeof existing.data()?.submittedByEmail === 'string'
        ? (existing.data()?.submittedByEmail as string)
        : email;

    const payload = sanitizeCampusEventForFirestore(
      event,
      preservedOwnerUid,
      preservedSubmittedEmail
    );
    if (!existing.exists()) {
      await setDoc(ref, {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        ...payload,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function syncEventCountsToFirestore(
  eventId: string,
  confirmedCount: number,
  waitlistCount: number
): Promise<void> {
  if (!canSyncAuthenticatedFirestore()) return;
  const path = `events/${eventId}`;
  try {
    const ref = doc(db, 'events', eventId);
    const existing = await getDoc(ref);
    if (!existing.exists() || existing.data()?.status !== 'published') return;
    await updateDoc(ref, {
      confirmedCount: Math.max(0, Number(confirmedCount) || 0),
      waitlistCount: Math.max(0, Number(waitlistCount) || 0),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribeEventsFromFirestore(
  isBetaManager: boolean,
  uid: string,
  onData: (events: CampusEvent[]) => void
): () => void {
  if (!canSyncAuthenticatedFirestore()) return () => {};
  const byId = new Map<string, CampusEvent>();
  const emit = () => onData(Array.from(byId.values()));

  if (isBetaManager) {
    const path = 'events';
    return onSnapshot(
      collection(db, path),
      (snap) => {
        byId.clear();
        for (const d of snap.docs) {
          byId.set(d.id, docToCampusEvent(d.data() as Record<string, unknown>));
        }
        emit();
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  }

  const publicMap = new Map<string, CampusEvent>();
  const mineMap = new Map<string, CampusEvent>();
  const mergeAndEmit = () => {
    byId.clear();
    for (const [k, v] of publicMap.entries()) byId.set(k, v);
    for (const [k, v] of mineMap.entries()) byId.set(k, v);
    emit();
  };

  const unsubPublic = onSnapshot(
    query(collection(db, 'events'), where('status', 'in', ['published', 'cancelled'])),
    (snap) => {
      publicMap.clear();
      for (const d of snap.docs) {
        publicMap.set(d.id, docToCampusEvent(d.data() as Record<string, unknown>));
      }
      mergeAndEmit();
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'events');
    }
  );

  const unsubMine = onSnapshot(
    query(collection(db, 'events'), where('ownerUid', '==', uid)),
    (snap) => {
      mineMap.clear();
      for (const d of snap.docs) {
        mineMap.set(d.id, docToCampusEvent(d.data() as Record<string, unknown>));
      }
      mergeAndEmit();
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'events');
    }
  );

  return () => {
    unsubPublic();
    unsubMine();
  };
}

export async function syncRegistrationToFirestore(
  reg: Registration,
  collegeId: string
): Promise<void> {
  if (!canSyncAuthenticatedFirestore()) return;
  const path = `registrations/${reg.id}`;
  try {
    const ref = doc(db, 'registrations', reg.id);
    const existing = await getDoc(ref);
    const payload = stripUndefined({
      id: reg.id.slice(0, 128),
      eventId: reg.eventId.slice(0, 128),
      collegeId: (collegeId || 'col-iiith').slice(0, 80),
      userId: reg.userId.slice(0, 128),
      userName: reg.userName.slice(0, 120),
      userEmail: reg.userEmail?.slice(0, 180),
      userPhone: reg.userPhone?.slice(0, 24),
      collegeShortName: reg.collegeShortName?.slice(0, 60),
      rollNumber: reg.rollNumber?.slice(0, 40),
      branch: reg.branch?.slice(0, 80),
      year: reg.year?.slice(0, 40),
      participationType: reg.participationType,
      needsTeammates: reg.needsTeammates,
      squadId: reg.squadId?.slice(0, 128),
      squadSnapshotId: reg.squadSnapshotId?.slice(0, 128),
      passCode: reg.passCode.slice(0, 40),
      qrPayload: reg.qrPayload.slice(0, 300),
      paymentStatus: reg.paymentStatus,
      amountPaidInr: Math.max(0, Number(reg.amountPaidInr) || 0),
      paymentMethod: reg.paymentMethod,
      paymentRef: reg.paymentRef?.slice(0, 120),
      teamName: reg.teamName?.slice(0, 120),
      teamMembers: reg.teamMembers?.slice(0, 400),
      pitchNote: reg.pitchNote?.slice(0, 400),
      attendeePhotoUrl:
        reg.attendeePhotoUrl && reg.attendeePhotoUrl.length <= 80000
          ? reg.attendeePhotoUrl
          : undefined,
      emergencyContact: reg.emergencyContact?.slice(0, 40),
      status: reg.status,
      checkedInAt: reg.checkedInAt?.slice(0, 60),
      checkedInBy: reg.checkedInBy?.slice(0, 120),
    });

    if (!existing.exists()) {
      await setDoc(ref, {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        ...payload,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

function docToRegistration(raw: Record<string, unknown>): Registration {
  const { createdAt, updatedAt: _u, collegeId: _c, ...rest } = raw;
  const createdIso =
    createdAt && typeof (createdAt as Timestamp).toDate === 'function'
      ? (createdAt as Timestamp).toDate().toISOString()
      : typeof createdAt === 'string'
        ? createdAt
        : new Date().toISOString();
  return {
    ...(rest as unknown as Registration),
    createdAt: createdIso,
  };
}

export function subscribeRegistrationsFromFirestore(
  isBetaManager: boolean,
  uid: string,
  onData: (regs: Registration[]) => void
): () => void {
  if (!canSyncAuthenticatedFirestore()) return () => {};
  const q = isBetaManager
    ? collection(db, 'registrations')
    : query(collection(db, 'registrations'), where('userId', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => docToRegistration(d.data() as Record<string, unknown>)));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'registrations');
    }
  );
}

export async function syncAnnouncementToFirestore(ann: CampusAnnouncement): Promise<void> {
  if (!canSyncAuthenticatedFirestore()) return;
  const path = `announcements/${ann.id}`;
  try {
    const ref = doc(db, 'announcements', ann.id);
    const existing = await getDoc(ref);
    const payload = stripUndefined({
      id: ann.id.slice(0, 128),
      collegeId: ann.collegeId.slice(0, 80),
      collegeShortName: ann.collegeShortName.slice(0, 60),
      authorId: ann.authorId.slice(0, 128),
      authorName: ann.authorName.slice(0, 120),
      authorDesignation: ann.authorDesignation?.slice(0, 120),
      title: ann.title.slice(0, 140),
      body: ann.body.slice(0, 600),
      pinned: Boolean(ann.pinned),
    });
    if (!existing.exists()) {
      await setDoc(ref, {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        ...payload,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteAnnouncementFromFirestore(id: string): Promise<void> {
  if (!canSyncAuthenticatedFirestore()) return;
  const path = `announcements/${id}`;
  try {
    await deleteDoc(doc(db, 'announcements', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeAnnouncementsFromFirestore(
  onData: (items: CampusAnnouncement[]) => void
): () => void {
  if (!canSyncAuthenticatedFirestore()) return () => {};
  const path = 'announcements';
  return onSnapshot(
    collection(db, path),
    (snap) => {
      const items = snap.docs.map((d) => {
        const raw = d.data() as Record<string, unknown>;
        const { createdAt, updatedAt: _u, ...rest } = raw;
        const createdIso =
          createdAt && typeof (createdAt as Timestamp).toDate === 'function'
            ? (createdAt as Timestamp).toDate().toISOString()
            : typeof createdAt === 'string'
              ? createdAt
              : new Date().toISOString();
        return {
          ...(rest as unknown as CampusAnnouncement),
          createdAt: createdIso,
        };
      });
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function syncNotificationToFirestore(
  notif: NotificationItem,
  opts?: { recipientUid?: string; recipientEmail?: string }
): Promise<void> {
  if (!canSyncAuthenticatedFirestore()) return;
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  const path = `notifications/${notif.id}`;
  try {
    const inferredEmail =
      opts?.recipientEmail ||
      (notif.userId.startsWith('email:') ? notif.userId.slice(6) : undefined);
    const inferredUid =
      opts?.recipientUid || (!notif.userId.startsWith('email:') ? notif.userId : undefined);
    const ref = doc(db, 'notifications', notif.id);
    const existing = await getDoc(ref);
    if (existing.exists()) return;
    await setDoc(
      ref,
      stripUndefined({
        id: notif.id.slice(0, 128),
        userId: notif.userId.slice(0, 180),
        senderUid: uid.slice(0, 128),
        recipientUid: inferredUid?.slice(0, 128),
        recipientEmail: inferredEmail?.trim().toLowerCase().slice(0, 180),
        eventId: notif.eventId.slice(0, 128),
        eventTitle: notif.eventTitle.slice(0, 200),
        kind: notif.kind,
        channel: notif.channel,
        title: notif.title.slice(0, 200),
        body: notif.body.slice(0, 800),
        sendAfter: notif.sendAfter.slice(0, 60),
        sentAt: notif.sentAt?.slice(0, 60) || null,
        status: notif.status,
        dedupeKey: notif.dedupeKey.slice(0, 200),
        createdAt: serverTimestamp(),
      })
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeMyNotificationsFromFirestore(
  uid: string,
  email: string | null | undefined,
  onData: (items: NotificationItem[]) => void
): () => void {
  if (!canSyncAuthenticatedFirestore()) return () => {};
  const byUidMap = new Map<string, NotificationItem>();
  const byEmailMap = new Map<string, NotificationItem>();

  const toNotif = (raw: Record<string, unknown>): NotificationItem => ({
    id: String(raw.id || ''),
    userId: String(raw.userId || uid),
    eventId: String(raw.eventId || ''),
    eventTitle: String(raw.eventTitle || ''),
    kind: raw.kind as NotificationItem['kind'],
    channel: raw.channel as NotificationItem['channel'],
    title: String(raw.title || ''),
    body: String(raw.body || ''),
    sendAfter: String(raw.sendAfter || new Date().toISOString()),
    sentAt: typeof raw.sentAt === 'string' ? raw.sentAt : null,
    status: raw.status as NotificationItem['status'],
    dedupeKey: String(raw.dedupeKey || ''),
  });

  const emit = () => {
    const merged = new Map<string, NotificationItem>();
    for (const [k, v] of byUidMap.entries()) merged.set(k, v);
    for (const [k, v] of byEmailMap.entries()) merged.set(k, v);
    onData(Array.from(merged.values()));
  };

  const unsubUid = onSnapshot(
    query(collection(db, 'notifications'), where('recipientUid', '==', uid)),
    (snap) => {
      byUidMap.clear();
      for (const d of snap.docs) byUidMap.set(d.id, toNotif(d.data() as Record<string, unknown>));
      emit();
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
    }
  );

  let unsubEmail = () => {};
  const cleanEmail = (email || '').trim().toLowerCase();
  if (cleanEmail) {
    unsubEmail = onSnapshot(
      query(collection(db, 'notifications'), where('recipientEmail', '==', cleanEmail)),
      (snap) => {
        byEmailMap.clear();
        for (const d of snap.docs) {
          byEmailMap.set(d.id, toNotif(d.data() as Record<string, unknown>));
        }
        emit();
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'notifications');
      }
    );
  }

  return () => {
    unsubUid();
    unsubEmail();
  };
}

export async function syncFeedbackToFirestore(fb: EventFeedback): Promise<void> {
  if (!canSyncAuthenticatedFirestore()) return;
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  const path = `eventFeedback/${fb.id}`;
  try {
    const ref = doc(db, 'eventFeedback', fb.id);
    const existing = await getDoc(ref);
    const payload = stripUndefined({
      id: fb.id.slice(0, 128),
      eventId: fb.eventId.slice(0, 128),
      eventTitle: fb.eventTitle?.slice(0, 200),
      eventType: fb.eventType,
      collegeId: fb.collegeId.slice(0, 80),
      clubId: fb.clubId.slice(0, 128),
      clubName: fb.clubName?.slice(0, 140),
      userId: uid.slice(0, 128),
      authorName: fb.isAnonymous ? 'Anonymous Student' : fb.authorName.slice(0, 120),
      isAnonymous: Boolean(fb.isAnonymous),
      rating: Math.min(5, Math.max(1, Math.round(fb.rating))),
      requestedCategory: fb.requestedCategory?.slice(0, 60),
      comment: fb.comment.slice(0, 600),
      suggestion: fb.suggestion?.slice(0, 400),
      complaint: fb.complaint?.slice(0, 400),
    });
    if (!existing.exists()) {
      await setDoc(ref, { ...payload, createdAt: serverTimestamp() });
    } else {
      await updateDoc(ref, { ...payload, updatedAt: new Date().toISOString() });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function syncSurveyToFirestore(survey: CampusSurvey): Promise<void> {
  if (!canSyncAuthenticatedFirestore()) return;
  const path = `surveys/${survey.id}`;
  try {
    const ref = doc(db, 'surveys', survey.id);
    const existing = await getDoc(ref);
    const payload = stripUndefined({
      id: survey.id.slice(0, 128),
      collegeId: survey.collegeId.slice(0, 80),
      collegeShortName: survey.collegeShortName?.slice(0, 60),
      createdById: survey.createdById.slice(0, 128),
      createdByName: survey.createdByName.slice(0, 120),
      title: survey.title.slice(0, 140),
      description: survey.description.slice(0, 400),
      questionPrompt: survey.questionPrompt.slice(0, 300),
      allowAnonymous: Boolean(survey.allowAnonymous),
      options: survey.options?.slice(0, 8),
      status: survey.status,
    });
    if (!existing.exists()) {
      await setDoc(ref, { ...payload, createdAt: serverTimestamp() });
    } else {
      await updateDoc(ref, payload);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function syncSurveyResponseToFirestore(resp: SurveyResponse): Promise<void> {
  if (!canSyncAuthenticatedFirestore()) return;
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  const path = `surveyResponses/${resp.id}`;
  try {
    const ref = doc(db, 'surveyResponses', resp.id);
    const existing = await getDoc(ref);
    const payload = stripUndefined({
      id: resp.id.slice(0, 128),
      surveyId: resp.surveyId.slice(0, 128),
      collegeId: resp.collegeId.slice(0, 80),
      userId: uid.slice(0, 128),
      respondentName: resp.isAnonymous ? 'Anonymous Student' : resp.respondentName.slice(0, 120),
      isAnonymous: Boolean(resp.isAnonymous),
      rating: typeof resp.rating === 'number' ? Math.min(5, Math.max(1, Math.round(resp.rating))) : undefined,
      selectedOption: resp.selectedOption?.slice(0, 120),
      responseText: resp.responseText.slice(0, 600),
    });
    if (!existing.exists()) {
      await setDoc(ref, { ...payload, createdAt: serverTimestamp() });
    } else {
      await updateDoc(ref, payload);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

function tsToIso(val: unknown): string {
  if (val && typeof (val as Timestamp).toDate === 'function') {
    return (val as Timestamp).toDate().toISOString();
  }
  if (typeof val === 'string' && val.trim()) return val;
  return new Date().toISOString();
}

export function subscribePartnerPostsFromFirestore(
  onData: (items: PartnerPost[]) => void
): () => void {
  if (!canSyncAuthenticatedFirestore()) return () => {};
  return onSnapshot(
    collection(db, 'partnerPosts'),
    (snap) => {
      onData(
        snap.docs.map((d) => {
          const raw = d.data() as Record<string, unknown>;
          return {
            ...(raw as unknown as PartnerPost),
            createdAt: tsToIso(raw.createdAt),
          };
        })
      );
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'partnerPosts')
  );
}

export function subscribeSquadsFromFirestore(
  isBetaManager: boolean,
  uid: string,
  onData: (items: Squad[]) => void
): () => void {
  if (!canSyncAuthenticatedFirestore()) return () => {};
  const q = isBetaManager
    ? collection(db, 'squads')
    : query(collection(db, 'squads'), where('memberIds', 'array-contains', uid));
  return onSnapshot(
    q,
    (snap) => {
      onData(
        snap.docs.map((d) => {
          const raw = d.data() as Record<string, unknown>;
          const memberIds = Array.isArray(raw.memberIds) ? (raw.memberIds as string[]) : [];
          return {
            ...(raw as unknown as Squad),
            memberIds,
            members: Array.isArray(raw.members) ? (raw.members as Squad['members']) : [],
            createdAt: tsToIso(raw.createdAt),
            updatedAt: tsToIso(raw.updatedAt),
          };
        })
      );
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'squads')
  );
}

export function subscribeConnectionRequestsFromFirestore(
  isBetaManager: boolean,
  uid: string,
  onData: (items: ConnectionRequest[]) => void
): () => void {
  if (!canSyncAuthenticatedFirestore()) return () => {};
  const toMap = new Map<string, ConnectionRequest>();
  const fromMap = new Map<string, ConnectionRequest>();
  const convert = (raw: Record<string, unknown>): ConnectionRequest => ({
    ...(raw as unknown as ConnectionRequest),
    createdAt: tsToIso(raw.createdAt),
    updatedAt: tsToIso(raw.updatedAt),
    expiresAt: tsToIso(raw.expiresAt || raw.createdAt),
  });
  const emit = () => {
    const merged = new Map<string, ConnectionRequest>();
    for (const [k, v] of fromMap) merged.set(k, v);
    for (const [k, v] of toMap) merged.set(k, v);
    onData(Array.from(merged.values()));
  };
  if (isBetaManager) {
    return onSnapshot(
      collection(db, 'connectionRequests'),
      (snap) => onData(snap.docs.map((d) => convert(d.data() as Record<string, unknown>))),
      (error) => handleFirestoreError(error, OperationType.LIST, 'connectionRequests')
    );
  }
  const u1 = onSnapshot(
    query(collection(db, 'connectionRequests'), where('fromUserId', '==', uid)),
    (snap) => {
      fromMap.clear();
      for (const d of snap.docs) fromMap.set(d.id, convert(d.data() as Record<string, unknown>));
      emit();
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'connectionRequests')
  );
  const u2 = onSnapshot(
    query(collection(db, 'connectionRequests'), where('toUserId', '==', uid)),
    (snap) => {
      toMap.clear();
      for (const d of snap.docs) toMap.set(d.id, convert(d.data() as Record<string, unknown>));
      emit();
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'connectionRequests')
  );
  return () => {
    u1();
    u2();
  };
}

export function subscribeJoinRequestsFromFirestore(
  isBetaManager: boolean,
  uid: string,
  onData: (items: SquadJoinRequest[]) => void
): () => void {
  if (!canSyncAuthenticatedFirestore()) return () => {};
  const appMap = new Map<string, SquadJoinRequest>();
  const ownerMap = new Map<string, SquadJoinRequest>();
  const convert = (raw: Record<string, unknown>): SquadJoinRequest => ({
    ...(raw as unknown as SquadJoinRequest),
    createdAt: tsToIso(raw.createdAt),
    updatedAt: tsToIso(raw.updatedAt),
    expiresAt: tsToIso(raw.expiresAt || raw.createdAt),
  });
  const emit = () => {
    const merged = new Map<string, SquadJoinRequest>();
    for (const [k, v] of appMap) merged.set(k, v);
    for (const [k, v] of ownerMap) merged.set(k, v);
    onData(Array.from(merged.values()));
  };
  if (isBetaManager) {
    return onSnapshot(
      collection(db, 'joinRequests'),
      (snap) => onData(snap.docs.map((d) => convert(d.data() as Record<string, unknown>))),
      (error) => handleFirestoreError(error, OperationType.LIST, 'joinRequests')
    );
  }
  const u1 = onSnapshot(
    query(collection(db, 'joinRequests'), where('applicantId', '==', uid)),
    (snap) => {
      appMap.clear();
      for (const d of snap.docs) appMap.set(d.id, convert(d.data() as Record<string, unknown>));
      emit();
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'joinRequests')
  );
  const u2 = onSnapshot(
    query(collection(db, 'joinRequests'), where('squadOwnerId', '==', uid)),
    (snap) => {
      ownerMap.clear();
      for (const d of snap.docs) ownerMap.set(d.id, convert(d.data() as Record<string, unknown>));
      emit();
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'joinRequests')
  );
  return () => {
    u1();
    u2();
  };
}

export function subscribeTeamUpCallsFromFirestore(
  isBetaManager: boolean,
  uid: string,
  onData: (items: TeamUpCall[]) => void
): () => void {
  if (!canSyncAuthenticatedFirestore()) return () => {};
  const createdMap = new Map<string, TeamUpCall>();
  const recipMap = new Map<string, TeamUpCall>();
  const convert = (raw: Record<string, unknown>): TeamUpCall => ({
    ...(raw as unknown as TeamUpCall),
    responses: Array.isArray(raw.responses) ? (raw.responses as TeamUpCall['responses']) : [],
    createdAt: tsToIso(raw.createdAt),
    updatedAt: tsToIso(raw.updatedAt),
    expiresAt: tsToIso(raw.expiresAt || raw.createdAt),
  });
  const emit = () => {
    const merged = new Map<string, TeamUpCall>();
    for (const [k, v] of createdMap) merged.set(k, v);
    for (const [k, v] of recipMap) merged.set(k, v);
    onData(Array.from(merged.values()));
  };
  if (isBetaManager) {
    return onSnapshot(
      collection(db, 'teamUpCalls'),
      (snap) => onData(snap.docs.map((d) => convert(d.data() as Record<string, unknown>))),
      (error) => handleFirestoreError(error, OperationType.LIST, 'teamUpCalls')
    );
  }
  const u1 = onSnapshot(
    query(collection(db, 'teamUpCalls'), where('creatorId', '==', uid)),
    (snap) => {
      createdMap.clear();
      for (const d of snap.docs) createdMap.set(d.id, convert(d.data() as Record<string, unknown>));
      emit();
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'teamUpCalls')
  );
  const u2 = onSnapshot(
    query(collection(db, 'teamUpCalls'), where('recipientUserIds', 'array-contains', uid)),
    (snap) => {
      recipMap.clear();
      for (const d of snap.docs) recipMap.set(d.id, convert(d.data() as Record<string, unknown>));
      emit();
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'teamUpCalls')
  );
  return () => {
    u1();
    u2();
  };
}

export function subscribeConversationsFromFirestore(
  isBetaManager: boolean,
  uid: string,
  onData: (items: TeamConversation[]) => void
): () => void {
  if (!canSyncAuthenticatedFirestore()) return () => {};
  const q = isBetaManager
    ? collection(db, 'conversations')
    : query(collection(db, 'conversations'), where('participantIds', 'array-contains', uid));
  return onSnapshot(
    q,
    (snap) => {
      onData(
        snap.docs.map((d) => {
          const raw = d.data() as Record<string, unknown>;
          return {
            ...(raw as unknown as TeamConversation),
            createdAt: tsToIso(raw.createdAt),
            updatedAt: tsToIso(raw.updatedAt),
          };
        })
      );
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'conversations')
  );
}

export function subscribeChatMessagesFromFirestore(
  isBetaManager: boolean,
  uid: string,
  onData: (items: TeamChatMessage[]) => void
): () => void {
  if (!canSyncAuthenticatedFirestore()) return () => {};
  const q = isBetaManager
    ? collection(db, 'chatMessages')
    : query(collection(db, 'chatMessages'), where('participantIds', 'array-contains', uid));
  return onSnapshot(
    q,
    (snap) => {
      onData(
        snap.docs.map((d) => {
          const raw = d.data() as Record<string, unknown>;
          const { participantIds: _p, ...rest } = raw;
          return {
            ...(rest as unknown as TeamChatMessage),
            createdAt: tsToIso(raw.createdAt),
          };
        })
      );
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'chatMessages')
  );
}

export function subscribeRegistrationSnapshotsFromFirestore(
  isBetaManager: boolean,
  uid: string,
  onData: (items: SquadRegistrationSnapshot[]) => void
): () => void {
  if (!canSyncAuthenticatedFirestore()) return () => {};
  const q = isBetaManager
    ? collection(db, 'registrationSnapshots')
    : query(collection(db, 'registrationSnapshots'), where('memberIds', 'array-contains', uid));
  return onSnapshot(
    q,
    (snap) => {
      onData(
        snap.docs.map((d) => {
          const raw = d.data() as Record<string, unknown>;
          return {
            ...(raw as unknown as SquadRegistrationSnapshot),
            submittedAt: tsToIso(raw.submittedAt),
          };
        })
      );
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'registrationSnapshots')
  );
}

export function subscribeSurveysFromFirestore(
  onData: (items: CampusSurvey[]) => void
): () => void {
  if (!canSyncAuthenticatedFirestore()) return () => {};
  return onSnapshot(
    collection(db, 'surveys'),
    (snap) => {
      onData(
        snap.docs.map((d) => {
          const raw = d.data() as Record<string, unknown>;
          return {
            ...(raw as unknown as CampusSurvey),
            createdAt: tsToIso(raw.createdAt),
          };
        })
      );
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'surveys')
  );
}

export function subscribeEventFeedbackFromFirestore(
  isBetaManager: boolean,
  uid: string,
  onData: (items: EventFeedback[]) => void
): () => void {
  if (!canSyncAuthenticatedFirestore()) return () => {};
  const q = isBetaManager
    ? collection(db, 'eventFeedback')
    : query(collection(db, 'eventFeedback'), where('userId', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      onData(
        snap.docs.map((d) => {
          const raw = d.data() as Record<string, unknown>;
          return {
            ...(raw as unknown as EventFeedback),
            createdAt: tsToIso(raw.createdAt),
          };
        })
      );
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'eventFeedback')
  );
}

export function subscribeSurveyResponsesFromFirestore(
  isBetaManager: boolean,
  uid: string,
  onData: (items: SurveyResponse[]) => void
): () => void {
  if (!canSyncAuthenticatedFirestore()) return () => {};
  const q = isBetaManager
    ? collection(db, 'surveyResponses')
    : query(collection(db, 'surveyResponses'), where('userId', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      onData(
        snap.docs.map((d) => {
          const raw = d.data() as Record<string, unknown>;
          return {
            ...(raw as unknown as SurveyResponse),
            createdAt: tsToIso(raw.createdAt),
          };
        })
      );
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'surveyResponses')
  );
}

