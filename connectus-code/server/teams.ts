import type {
  CallGenderFilter,
  CampusEvent,
  ChatParticipant,
  ConnectionRequest,
  PartnerPost,
  PublicSquadSummary,
  Registration,
  Squad,
  SquadJoinRequest,
  SquadMember,
  SquadMemberRegistrationStatus,
  SquadRegistrationSnapshot,
  StudentGender,
  StudentProfile,
  SupportedLanguage,
  TeamChatMessage,
  TeamConversation,
  TeamUpCall,
  TeamUpCallEventRef,
} from '../src/types';
import { SUPPORTED_LANGUAGES } from '../src/types';
import { HYDERABAD_COLLEGES, type DatabaseState } from './store';

export function resolveCollegeShortName(student: Pick<StudentProfile, 'collegeId' | 'customCollegeName'>): string {
  if (student.collegeId === 'other') {
    return (student.customCollegeName || '').trim() || 'Campus India';
  }
  return HYDERABAD_COLLEGES.find((c) => c.id === student.collegeId)?.shortName || 'Campus';
}

export function resolveStudentAreaId(student: Pick<StudentProfile, 'collegeId' | 'areaId'>): string {
  const col = HYDERABAD_COLLEGES.find((c) => c.id === student.collegeId);
  if (col?.areaId) return col.areaId;
  return (student.areaId || '').trim();
}

export function computeRosterHash(memberIds: string[]): string {
  return [...memberIds].sort().join('|');
}

export function buildWaMeUrl(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) return '';
  const normalized = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${normalized}`;
}

export function parseEventMaxTeamSize(teamSizeText?: string): number {
  if (!teamSizeText) return 6;
  const rangeMatch = teamSizeText.match(/(\d+)\s*[–\-to]+\s*(\d+)/i);
  if (rangeMatch) {
    return Math.min(8, Math.max(2, Number(rangeMatch[2]) || 6));
  }
  const singleMatch = teamSizeText.match(/\b([2-8])\b/);
  if (singleMatch) {
    return Number(singleMatch[1]) || 6;
  }
  if (/duo|pair/i.test(teamSizeText)) return 2;
  if (/solo only|individual only/i.test(teamSizeText)) return 1;
  return 6;
}

export function computeCallOrRequestExpiry(eventOrEvents?: CampusEvent | CampusEvent[]): string {
  const seventyTwoHoursMs = Date.now() + 72 * 3600 * 1000;
  if (Array.isArray(eventOrEvents)) {
    const deadlines = eventOrEvents
      .filter((e) => e && e.status !== 'cancelled' && e.regDeadline)
      .map((e) => Date.parse(e.regDeadline))
      .filter((ms) => !Number.isNaN(ms));
    if (deadlines.length === 0) {
      return new Date(seventyTwoHoursMs).toISOString();
    }
    const latestMs = Math.max(...deadlines);
    return new Date(Math.max(Date.now() + 3600 * 1000, latestMs)).toISOString();
  }

  const event = eventOrEvents;
  if (!event?.regDeadline) {
    return new Date(seventyTwoHoursMs).toISOString();
  }
  const deadlineMs = Date.parse(event.regDeadline);
  if (Number.isNaN(deadlineMs)) {
    return new Date(seventyTwoHoursMs).toISOString();
  }
  const boundedMs = Math.max(Date.now() + 3600 * 1000, Math.min(seventyTwoHoursMs, deadlineMs));
  return new Date(boundedMs).toISOString();
}

export function expireStaleTeamItems(db: DatabaseState): boolean {
  let changed = false;
  const nowMs = Date.now();
  const eventMap = new Map(db.events.map((e) => [e.id, e]));

  for (const req of db.connectionRequests) {
    if (req.status !== 'pending') continue;
    const evt = eventMap.get(req.eventId);
    const deadlineMs = evt ? Date.parse(evt.regDeadline) : NaN;
    const expMs = Date.parse(req.expiresAt);
    if (
      (!Number.isNaN(expMs) && nowMs > expMs) ||
      (!Number.isNaN(deadlineMs) && nowMs > deadlineMs) ||
      evt?.status === 'cancelled'
    ) {
      req.status = 'expired';
      req.updatedAt = new Date(nowMs).toISOString();
      changed = true;
    }
  }

  for (const req of db.joinRequests) {
    if (req.status !== 'pending') continue;
    const evt = eventMap.get(req.eventId);
    const deadlineMs = evt ? Date.parse(evt.regDeadline) : NaN;
    const expMs = Date.parse(req.expiresAt);
    if (
      (!Number.isNaN(expMs) && nowMs > expMs) ||
      (!Number.isNaN(deadlineMs) && nowMs > deadlineMs) ||
      evt?.status === 'cancelled'
    ) {
      req.status = 'expired';
      req.updatedAt = new Date(nowMs).toISOString();
      changed = true;
    }
  }

  for (const call of db.teamUpCalls) {
    if (call.status !== 'active') continue;
    const targetIds =
      Array.isArray(call.eventIds) && call.eventIds.length > 0
        ? call.eventIds
        : call.eventId
          ? [call.eventId]
          : [];
    const referencedEvents = targetIds
      .map((id) => eventMap.get(id))
      .filter((e): e is CampusEvent => Boolean(e));
    const activeEvents = referencedEvents.filter((e) => e.status !== 'cancelled');
    const deadlines = activeEvents
      .map((e) => Date.parse(e.regDeadline))
      .filter((ms) => !Number.isNaN(ms));
    const latestDeadlineMs = deadlines.length > 0 ? Math.max(...deadlines) : NaN;
    const expMs = Date.parse(call.expiresAt);
    if (
      activeEvents.length === 0 ||
      (!Number.isNaN(latestDeadlineMs) ? nowMs > latestDeadlineMs : !Number.isNaN(expMs) && nowMs > expMs)
    ) {
      call.status = 'expired';
      call.updatedAt = new Date(nowMs).toISOString();
      changed = true;
    }
  }

  for (const conv of db.conversations) {
    if (conv.status !== 'active') continue;
    const evt = eventMap.get(conv.eventId);
    const deadlineMs = evt ? Date.parse(evt.regDeadline) : NaN;
    if ((!Number.isNaN(deadlineMs) && nowMs > deadlineMs) || evt?.status === 'cancelled') {
      conv.status = 'archived';
      conv.updatedAt = new Date(nowMs).toISOString();
      changed = true;
    }
  }

  return changed;
}

export function sanitizeTeamUpCallForViewer(call: TeamUpCall, viewerId: string): TeamUpCall {
  const eventIds =
    Array.isArray(call.eventIds) && call.eventIds.length > 0
      ? call.eventIds
      : call.eventId
        ? [call.eventId]
        : [];
  const events: TeamUpCallEventRef[] =
    Array.isArray(call.events) && call.events.length > 0
      ? call.events
      : call.eventId
        ? [
            {
              id: call.eventId,
              title: call.eventTitle,
              type: call.eventType,
            },
          ]
        : [];

  const isCreator = call.creatorId === viewerId;
  const rawCount = Math.max(0, Number(call.eligibleCount) || 0);
  const maskedCount = rawCount === 0 ? 0 : rawCount < 3 ? 2 : rawCount;
  const eligibleCountLabel =
    rawCount === 0 ? '0' : rawCount < 3 ? 'fewer than 3' : String(rawCount);

  if (isCreator) {
    return {
      ...call,
      eventIds,
      events,
      eligibleCount: maskedCount,
      eligibleCountLabel,
      // Never leak the list of matched recipient UIDs to the sender
      recipientUserIds: [],
    };
  }

  return {
    ...call,
    eventIds,
    events,
    // Never reveal gendered targeting parameters or other recipients' IDs/responses to a recipient
    genderPreference: undefined,
    eligibleCount: rawCount < 3 ? 0 : rawCount,
    eligibleCountLabel: rawCount < 3 ? 'fewer than 3' : String(rawCount),
    recipientUserIds: call.recipientUserIds.includes(viewerId) ? [viewerId] : [],
    responses: (call.responses || []).filter((r) => r.userId === viewerId),
  };
}

export function toPublicSquadSummary(squad: Squad): PublicSquadSummary {
  const owner = squad.members.find((m) => m.userId === squad.ownerId) || squad.members[0];
  const openSeats = Math.max(0, squad.targetSize - squad.members.length);
  return {
    id: squad.id,
    name: squad.name,
    eventId: squad.eventId,
    eventTitle: squad.eventTitle,
    eventType: squad.eventType,
    ownerId: squad.ownerId,
    ownerName: owner?.name || 'Squad Lead',
    ownerCollege: owner?.collegeShortName || 'Campus',
    memberCount: squad.members.length,
    targetSize: squad.targetSize,
    openSeats,
    requiredRoles: squad.requiredRoles || [],
    recruitmentStatus: squad.recruitmentStatus,
    memberPreviews: squad.members.map((m) => ({
      userId: m.userId,
      name: m.name,
      collegeShortName: m.collegeShortName,
      roleSkill: m.roleSkill,
    })),
    createdAt: squad.createdAt,
  };
}

export function sanitizeSquadForMember(squad: Squad, viewerId: string): Squad {
  // Phone numbers are only included if that specific member explicitly shared WhatsApp in the squad
  return {
    ...squad,
    members: squad.members.map((m) => ({
      ...m,
      whatsappNumber:
        m.whatsappShared || m.userId === viewerId ? m.whatsappNumber : undefined,
    })),
  };
}

export function buildMemberRegistrationStatuses(
  squad: Squad,
  registrations: Registration[]
): SquadMemberRegistrationStatus[] {
  return squad.members.map((m) => {
    const reg = registrations.find(
      (r) => r.eventId === squad.eventId && r.userId === m.userId && r.status !== 'cancelled'
    );
    return {
      userId: m.userId,
      name: m.name,
      collegeShortName: m.collegeShortName,
      roleSkill: m.roleSkill,
      registrationStatus:
        reg?.status === 'waitlisted'
          ? 'waitlisted'
          : reg
            ? 'confirmed'
            : 'not_registered',
      passCode: reg?.passCode,
      hasQrPass: Boolean(reg?.passCode && reg.status !== 'waitlisted'),
    };
  });
}

export function markSnapshotsNeedsUpdateIfRosterChanged(
  db: DatabaseState,
  squad: Squad
): SquadRegistrationSnapshot[] {
  const updated: SquadRegistrationSnapshot[] = [];
  const currentHash = computeRosterHash(squad.memberIds);
  for (const snap of db.registrationSnapshots) {
    if (snap.squadId !== squad.id || snap.eventId !== squad.eventId) continue;
    if (snap.rosterHash !== currentHash) {
      snap.status = 'needs_update';
      updated.push(snap);
    }
  }
  return updated;
}

export function buildScopedTeamsPayload(db: DatabaseState, viewerId: string) {
  const publicPartnerPosts = db.partnerPosts.filter(
    (p) => p.discoveryEnabled !== false || p.userId === viewerId
  );

  const publicSquads: PublicSquadSummary[] = db.squads
    .filter(
      (sq) =>
        !sq.archivedAt &&
        sq.recruitmentStatus === 'open' &&
        !sq.isLocked &&
        sq.members.length < sq.targetSize
    )
    .map(toPublicSquadSummary);

  const mySquads = db.squads
    .filter((sq) => sq.memberIds.includes(viewerId))
    .map((sq) => sanitizeSquadForMember(sq, viewerId));

  const connectionRequests = db.connectionRequests.filter(
    (r) => r.fromUserId === viewerId || r.toUserId === viewerId
  );

  const joinRequests = db.joinRequests.filter(
    (r) => r.applicantId === viewerId || r.squadOwnerId === viewerId
  );

  const teamUpCalls = db.teamUpCalls
    .filter((c) => c.creatorId === viewerId || c.recipientUserIds.includes(viewerId))
    .map((c) => sanitizeTeamUpCallForViewer(c, viewerId));

  const conversations = db.conversations.filter((c) => c.participantIds.includes(viewerId));

  const allowedRoomIds = new Set<string>([
    ...mySquads.map((s) => s.id),
    ...conversations.map((c) => c.id),
  ]);

  const chatMessages = db.chatMessages.filter((m) => allowedRoomIds.has(m.roomId));

  const mySquadIds = new Set(mySquads.map((s) => s.id));
  const registrationSnapshots = db.registrationSnapshots
    .filter(
      (snap) =>
        mySquadIds.has(snap.squadId) || snap.members.some((m) => m.userId === viewerId)
    )
    .map((snap) => {
      const sq = db.squads.find((s) => s.id === snap.squadId);
      if (!sq) return snap;
      return {
        ...snap,
        members: buildMemberRegistrationStatuses(sq, db.registrations),
      };
    });

  return {
    partnerPosts: publicPartnerPosts,
    publicSquads,
    mySquads,
    connectionRequests,
    joinRequests,
    teamUpCalls,
    conversations,
    chatMessages,
    registrationSnapshots,
  };
}

export interface DiscoverableCandidate {
  userId: string;
  name: string;
  collegeId: string;
  collegeShortName: string;
  branch: string;
  year: string;
  skills: string[];
  roleSkill: string;
  discoveryEnabled: boolean;
  callNotificationsEnabled: boolean;
  publicLinks?: {
    linkedinUrl?: string;
    githubUrl?: string;
    portfolioUrl?: string;
    leetcodeUrl?: string;
    hackerrankUrl?: string;
  };
}

interface InternalMatchCandidate extends DiscoverableCandidate {
  areaId: string;
  gender: StudentGender;
  languages: SupportedLanguage[];
}

const VALID_GENDERS: Set<StudentGender> = new Set([
  'woman',
  'man',
  'non_binary',
  'prefer_not_to_say',
  'unset',
]);
const VALID_LANG_SET: Set<string> = new Set(SUPPORTED_LANGUAGES);

function collectInternalMatchCandidates(
  db: DatabaseState,
  excludeUserId: string
): InternalMatchCandidate[] {
  const byId = new Map<string, InternalMatchCandidate>();

  for (const stu of Object.values(db.students || {})) {
    if (
      !stu.id ||
      stu.id === excludeUserId ||
      stu.id === 'guest:anonymous' ||
      (stu.id.startsWith('guest:') && (!Array.isArray(stu.skills) || stu.skills.length === 0))
    ) {
      continue;
    }
    const vis = stu.profileVisibility;
    const isDiscoverable =
      stu.teamDiscoveryEnabled !== false && vis?.discoverableInTeams !== false;
    const showYear = vis?.showAcademicYear !== false;
    const linksPublic = vis?.linksVisibility === 'public';
    const safeGender: StudentGender =
      stu.gender && VALID_GENDERS.has(stu.gender) ? stu.gender : 'unset';
    const safeLanguages: SupportedLanguage[] = Array.isArray(stu.languages)
      ? stu.languages
          .filter((l): l is SupportedLanguage => VALID_LANG_SET.has(l))
          .slice(0, 5)
      : [];

    byId.set(stu.id, {
      userId: stu.id,
      name: stu.displayName,
      collegeId: stu.collegeId || 'other',
      collegeShortName: resolveCollegeShortName(stu),
      areaId: resolveStudentAreaId(stu),
      gender: safeGender,
      languages: safeLanguages,
      branch: stu.branch || 'CSE',
      year: showYear ? stu.year || '1st Year' : 'Campus Peer',
      skills: Array.isArray(stu.skills) ? stu.skills : [],
      roleSkill: (stu.skills || []).slice(0, 3).join(', ') || stu.headline || stu.branch,
      discoveryEnabled: isDiscoverable,
      callNotificationsEnabled: stu.teamCallNotifications !== false,
      ...(linksPublic
        ? {
            publicLinks: {
              linkedinUrl: stu.linkedinUrl || undefined,
              githubUrl: stu.githubUrl || undefined,
              portfolioUrl: stu.portfolioUrl || undefined,
              leetcodeUrl: stu.leetcodeUrl || undefined,
              hackerrankUrl: stu.hackerrankUrl || undefined,
            },
          }
        : {}),
    });
  }

  const allStudents = Object.values(db.students || {});
  for (const post of db.partnerPosts) {
    if (!post.userId || post.userId === excludeUserId) continue;
    const existing = byId.get(post.userId);
    const stuRecord = allStudents.find((s) => s.id === post.userId);
    const mergedSkills = Array.from(
      new Set([
        ...(existing?.skills || []),
        ...(post.skills || []),
        ...post.roleSkill.split(/[,/·]+/).map((s) => s.trim()).filter(Boolean),
      ])
    );
    const stuDiscovery = stuRecord
      ? stuRecord.teamDiscoveryEnabled !== false &&
        stuRecord.profileVisibility?.discoverableInTeams !== false
      : true;
    const stuCallNotifs = stuRecord ? stuRecord.teamCallNotifications !== false : true;
    const showYear = stuRecord ? stuRecord.profileVisibility?.showAcademicYear !== false : true;
    const postCollege = HYDERABAD_COLLEGES.find(
      (c) => c.id === post.collegeId || c.shortName === post.collegeShortName
    );
    const resolvedAreaId =
      existing?.areaId ||
      (stuRecord ? resolveStudentAreaId(stuRecord) : '') ||
      postCollege?.areaId ||
      '';
    const resolvedGender: StudentGender =
      existing?.gender ||
      (stuRecord?.gender && VALID_GENDERS.has(stuRecord.gender) ? stuRecord.gender : 'unset');
    const resolvedLanguages: SupportedLanguage[] =
      existing?.languages ||
      (Array.isArray(stuRecord?.languages)
        ? stuRecord!.languages
            .filter((l): l is SupportedLanguage => VALID_LANG_SET.has(l))
            .slice(0, 5)
        : []);

    byId.set(post.userId, {
      userId: post.userId,
      name: existing?.name || post.userName,
      collegeId: existing?.collegeId || post.collegeId || 'other',
      collegeShortName: existing?.collegeShortName || post.collegeShortName,
      areaId: resolvedAreaId,
      gender: resolvedGender,
      languages: resolvedLanguages,
      branch: existing?.branch || post.branch,
      year: showYear ? existing?.year || post.year : 'Campus Peer',
      skills: mergedSkills,
      roleSkill: post.roleSkill || existing?.roleSkill || post.branch,
      discoveryEnabled:
        (existing ? existing.discoveryEnabled : stuDiscovery) && post.discoveryEnabled !== false,
      callNotificationsEnabled: existing ? existing.callNotificationsEnabled : stuCallNotifs,
      ...(existing?.publicLinks ? { publicLinks: existing.publicLinks } : {}),
    });
  }

  return Array.from(byId.values());
}

export function collectDiscoverableCandidates(
  db: DatabaseState,
  excludeUserId: string
): DiscoverableCandidate[] {
  // Never expose private areaId/gender/languages outside server matching
  return collectInternalMatchCandidates(db, excludeUserId).map(
    ({ areaId: _a, gender: _g, languages: _l, ...publicCand }) => publicCand
  );
}

export function matchCandidatesForTeamUpCall(
  db: DatabaseState,
  params: {
    creatorId: string;
    preferredCollege?: string;
    preferredYear?: string;
    preferredSkills?: string[];
    rolesNeeded?: string[];
    preferredAreas?: string[];
    preferredLanguages?: SupportedLanguage[];
    genderPreference?: CallGenderFilter;
    audienceMode: 'active_only' | 'all_matching';
    activeUserIds: Set<string>;
  }
): DiscoverableCandidate[] {
  const candidates = collectInternalMatchCandidates(db, params.creatorId);
  const prefCollege = (params.preferredCollege || '').trim().toLowerCase();
  const prefYear = (params.preferredYear || '').trim().toLowerCase();
  const wantedTerms = [
    ...(params.preferredSkills || []),
    ...(params.rolesNeeded || []),
  ]
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const areaSet = new Set(
    (params.preferredAreas || []).map((a) => a.trim()).filter(Boolean)
  );
  const langSet = new Set(
    (params.preferredLanguages || []).filter((l) => VALID_LANG_SET.has(l))
  );
  const genderPref: CallGenderFilter =
    params.genderPreference === 'woman' ||
    params.genderPreference === 'man' ||
    params.genderPreference === 'non_binary'
      ? params.genderPreference
      : 'any';

  const matched = candidates.filter((cand) => {
    if (!cand.discoveryEnabled || !cand.callNotificationsEnabled) return false;

    if (params.audienceMode === 'active_only' && !params.activeUserIds.has(cand.userId)) {
      if (params.activeUserIds.size > 0) {
        return false;
      }
    }

    if (prefCollege && prefCollege !== 'any' && prefCollege !== 'all') {
      const colMatch =
        cand.collegeId.toLowerCase() === prefCollege ||
        cand.collegeShortName.toLowerCase().includes(prefCollege);
      if (!colMatch) return false;
    }

    if (prefYear && prefYear !== 'any' && prefYear !== 'all') {
      if (cand.year.toLowerCase() !== prefYear) return false;
    }

    if (wantedTerms.length > 0) {
      const hay = `${cand.skills.join(' ')} ${cand.roleSkill} ${cand.branch}`.toLowerCase();
      const hit = wantedTerms.some((term) => hay.includes(term));
      if (!hit) return false;
    }

    if (areaSet.size > 0) {
      if (!cand.areaId || !areaSet.has(cand.areaId)) return false;
    }

    if (langSet.size > 0) {
      const speaksOne = cand.languages.some((l) => langSet.has(l));
      if (!speaksOne) return false;
    }

    if (genderPref !== 'any') {
      // Students with 'unset' or 'prefer_not_to_say' never match a gendered filter
      if (cand.gender !== genderPref) return false;
    }

    return true;
  });

  return matched.map(({ areaId: _a, gender: _g, languages: _l, ...publicCand }) => publicCand);
}

export function toSquadMember(
  participant: ChatParticipant,
  role: 'owner' | 'member' = 'member'
): SquadMember {
  return {
    userId: participant.userId,
    name: participant.name,
    collegeShortName: participant.collegeShortName,
    branch: participant.branch || 'CSE',
    year: participant.year || '2nd Year',
    roleSkill: participant.roleSkill || participant.branch || 'Builder',
    role,
    joinedAt: new Date().toISOString(),
  };
}

