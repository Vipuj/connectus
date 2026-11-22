import 'dotenv/config';
import crypto from 'crypto';
import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { WebSocket, WebSocketServer } from 'ws';
import {
  analyzeCampusFeedbackWithGemini,
  checkUploadRateLimit,
  extractPosterWithGemini,
  resolveLocalPosterToBase64,
} from './server/gemini';
import {
  dispatchRealTelegramIfConfigured,
  evaluatePriorityLowSeatAlertsForStudent,
  formatIstDateTime,
  haversineKm,
  notifyCollegeOfficialsOfSubmission,
  queueAndDispatchNotification,
  runScheduledNotificationChecks,
  triggerEventChangeNotifications,
  triggerPriorityLowSeatAlertsForEvent,
  triggerPublishNotifications,
} from './server/notifications';
import { evaluateStudentEventMatch } from './src/utils/skills';
import {
  createGuestStudent,
  HYDERABAD_AREAS,
  HYDERABAD_COLLEGES,
  loadDb,
  resetDb,
  SAMPLE_POSTERS,
  saveDb,
  type DatabaseState,
} from './server/store';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import {
  buildMemberRegistrationStatuses,
  buildScopedTeamsPayload,
  buildWaMeUrl,
  collectDiscoverableCandidates,
  computeCallOrRequestExpiry,
  computeRosterHash,
  expireStaleTeamItems,
  markSnapshotsNeedsUpdateIfRosterChanged,
  matchCandidatesForTeamUpCall,
  parseEventMaxTeamSize,
  resolveCollegeShortName,
  sanitizeSquadForMember,
  sanitizeTeamUpCallForViewer,
  toPublicSquadSummary,
  toSquadMember,
} from './server/teams';
import {
  SUPPORTED_LANGUAGES,
  type CallGenderFilter,
  type CampusAnnouncement,
  type CampusEvent,
  type CampusSurvey,
  type ChatParticipant,
  type ConnectionRequest,
  type EventApprovalEntry,
  type EventCoordinatorContact,
  type EventFeedback,
  type EventMode,
  type EventPaymentInfo,
  type EventScheduleDay,
  type EventStatus,
  type EventType,
  type FeedEvent,
  type NotificationItem,
  type OfficialInvite,
  type OrganizerAccount,
  type PartnerPost,
  type RegStatus,
  type Registration,
  type Squad,
  type SquadJoinRequest,
  type SquadRecruitmentStatus,
  type SquadRegistrationSnapshot,
  type StudentGender,
  type StudentProfile,
  type SupportedLanguage,
  type SurveyResponse,
  type TeamChatMessage,
  type TeamConversation,
  type TeamUpCall,
  type TeamUpCallEventRef,
} from './src/types';

const VALID_AREA_ID_SET = new Set(HYDERABAD_AREAS.map((a) => a.id));
const VALID_LANGUAGE_SET = new Set<string>(SUPPORTED_LANGUAGES);
const VALID_STUDENT_GENDERS = new Set<StudentGender>([
  'woman',
  'man',
  'non_binary',
  'prefer_not_to_say',
  'unset',
]);

function normalizeStudentGender(raw: unknown): StudentGender {
  if (typeof raw === 'string' && VALID_STUDENT_GENDERS.has(raw as StudentGender)) {
    return raw as StudentGender;
  }
  return 'unset';
}

function normalizeStudentLanguages(raw: unknown): SupportedLanguage[] {
  if (!Array.isArray(raw)) return [];
  return Array.from(
    new Set(
      raw
        .map((x) => String(x || '').trim())
        .filter((x): x is SupportedLanguage => VALID_LANGUAGE_SET.has(x))
    )
  ).slice(0, 5);
}

function normalizeCallAreaIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return Array.from(
    new Set(
      raw
        .map((x) => String(x || '').trim())
        .filter((x) => VALID_AREA_ID_SET.has(x))
    )
  ).slice(0, 16);
}

function normalizeCallLanguages(raw: unknown): SupportedLanguage[] {
  if (!Array.isArray(raw)) return [];
  return Array.from(
    new Set(
      raw
        .map((x) => String(x || '').trim())
        .filter((x): x is SupportedLanguage => VALID_LANGUAGE_SET.has(x))
    )
  ).slice(0, 10);
}

function normalizeCallGenderFilter(raw: unknown): CallGenderFilter {
  if (raw === 'woman' || raw === 'man' || raw === 'non_binary') {
    return raw;
  }
  return 'any';
}

function sanitizeEventSchedule(raw: unknown): EventScheduleDay[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const cleaned: EventScheduleDay[] = [];
  for (const day of raw.slice(0, 14)) {
    if (!day || typeof day !== 'object') continue;
    const d = day as { dayLabel?: unknown; items?: unknown };
    const dayLabel = String(d.dayLabel || '').trim().slice(0, 120);
    const rawItems = Array.isArray(d.items) ? d.items : [];
    const items = rawItems
      .slice(0, 30)
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const row = item as { time?: unknown; activity?: unknown };
        const time = String(row.time || '').trim().slice(0, 60);
        const activity = String(row.activity || '').trim().slice(0, 220);
        if (!time && !activity) return null;
        return {
          time: time || 'TBD',
          activity: activity || 'Session',
        };
      })
      .filter((x): x is { time: string; activity: string } => Boolean(x));
    if (!dayLabel && items.length === 0) continue;
    cleaned.push({
      dayLabel: dayLabel || `Day ${cleaned.length + 1}`,
      items,
    });
  }
  return cleaned.length > 0 ? cleaned : [];
}

function sanitizeAttendeePhoto(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 80000) return undefined;
  if (
    /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/i.test(trimmed) ||
    trimmed.startsWith('https://')
  ) {
    return trimmed;
  }
  return undefined;
}

interface VerifiedAuthIdentity {
  uid: string;
  email: string;
  emailVerified: boolean;
}

interface AuthenticatedRequest extends express.Request {
  verifiedAuth?: VerifiedAuthIdentity;
  bearerToken?: string;
}

const firebaseConfigRaw = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), 'firebase-applet-config.json'), 'utf8')
) as { projectId: string; firestoreDatabaseId?: string };

const firestoreDatabaseId = firebaseConfigRaw.firestoreDatabaseId || '(default)';

const adminApp = getApps().length
  ? getApps()[0]
  : initializeApp({ projectId: firebaseConfigRaw.projectId });
const adminAuth = getAuth(adminApp);

async function verifyBearerToken(token: string): Promise<VerifiedAuthIdentity | null> {
  if (!token) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return {
      uid: decoded.uid,
      email: (decoded.email || '').trim().toLowerCase(),
      emailVerified: Boolean(decoded.email_verified),
    };
  } catch {
    return null;
  }
}

function getStudentSessionKey(req: AuthenticatedRequest): string {
  if (req.verifiedAuth?.uid) {
    return `uid:${req.verifiedAuth.uid}`;
  }
  const headerKey = String(req.headers['x-student-key'] || '').trim().slice(0, 160);
  if (headerKey && headerKey.startsWith('guest:')) {
    return headerKey;
  }
  return 'guest:anonymous';
}

const BETA_MANAGER_EMAILS = new Set([
  'nvipuj@gmail.com',
]);
const CORE_BETA_SEATS = new Set([
  'vipujgaming@gmail.com',
  'nvipuj@gmail.com',
  'janumpallyvinaychandra@gmail.com',
]);

function getRequestAuthIdentity(req: AuthenticatedRequest): { uid: string; email: string } {
  if (!req.verifiedAuth) {
    return { uid: '', email: '' };
  }
  return {
    uid: req.verifiedAuth.uid,
    email: req.verifiedAuth.emailVerified ? req.verifiedAuth.email : '',
  };
}

function isBetaManagerRequest(req: AuthenticatedRequest): boolean {
  const { email } = getRequestAuthIdentity(req);
  return Boolean(email && BETA_MANAGER_EMAILS.has(email));
}

function getEnvBetaAllowlist(): Set<string> {
  const raw = process.env.BETA_ALLOWLIST_EMAILS || '';
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter((s) => Boolean(s) && s !== 'snow.kngt@gmail.com')
  );
}

function isEmailBetaAllowed(db: DatabaseState, email: string, emailVerified: boolean): boolean {
  const beta = db.betaAccess;
  if (!beta || !beta.enabled) return true;
  if (!emailVerified || !email) return false;
  const clean = email.trim().toLowerCase();
  if (clean === 'snow.kngt@gmail.com') return false;
  if (CORE_BETA_SEATS.has(clean)) return true;
  if (getEnvBetaAllowlist().has(clean)) return true;
  return beta.allowedEmails.includes(clean);
}

function isRequestBetaAllowed(db: DatabaseState, req: AuthenticatedRequest): boolean {
  const beta = db.betaAccess;
  if (!beta || !beta.enabled) return true;
  return isEmailBetaAllowed(
    db,
    req.verifiedAuth?.email || '',
    Boolean(req.verifiedAuth?.emailVerified)
  );
}

async function verifyBetaSeatViaFirestoreRest(
  email: string,
  bearerToken: string
): Promise<boolean> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !bearerToken || cleanEmail === 'snow.kngt@gmail.com') return false;
  try {
    const emailHash = crypto.createHash('sha256').update(cleanEmail).digest('hex');
    const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
      firebaseConfigRaw.projectId
    )}/databases/${encodeURIComponent(firestoreDatabaseId)}/documents/betaSeats/${emailHash}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${bearerToken}` },
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));
    if (!res.ok) return false;
    const json = (await res.json()) as {
      fields?: {
        email?: { stringValue?: string };
        status?: { stringValue?: string };
      };
    };
    const docEmail = (json.fields?.email?.stringValue || '').trim().toLowerCase();
    const docStatus = json.fields?.status?.stringValue || '';
    return docStatus === 'active' && docEmail === cleanEmail;
  } catch {
    return false;
  }
}

async function ensureBetaAllowedWithFirestoreFallback(
  db: DatabaseState,
  req: AuthenticatedRequest
): Promise<boolean> {
  if (isRequestBetaAllowed(db, req)) return true;
  const email = req.verifiedAuth?.email || '';
  const emailVerified = Boolean(req.verifiedAuth?.emailVerified);
  const token = req.bearerToken || '';
  if (!emailVerified || !email || !token) return false;
  const found = await verifyBetaSeatViaFirestoreRest(email, token);
  if (!found) return false;
  const clean = email.trim().toLowerCase();
  if (db.betaAccess && !db.betaAccess.allowedEmails.includes(clean)) {
    if (db.betaAccess.allowedEmails.length >= db.betaAccess.maxSeats) {
      return false;
    }
    db.betaAccess.allowedEmails.push(clean);
    saveDb(db);
  }
  return true;
}

function findApprovedOfficialForRequest(
  db: DatabaseState,
  req: AuthenticatedRequest,
  requestedOrgId?: string
): OrganizerAccount | undefined {
  const { uid, email } = getRequestAuthIdentity(req);
  if (!uid && !email) return undefined;
  if (email === 'vipujgaming@gmail.com') return undefined;
  const matchesIdentity = (o: OrganizerAccount) =>
    o.status === 'approved' &&
    (o.email || '').trim().toLowerCase() !== 'vipujgaming@gmail.com' &&
    ((uid && o.authUid === uid) || (email && o.email.toLowerCase() === email));

  if (requestedOrgId) {
    if (email && (BETA_MANAGER_EMAILS.has(email) || email === 'nvipuj@gmail.com')) {
      const org = db.organizers.find((o) => o.id === requestedOrgId);
      if (org) return org;
    }
    const exact = db.organizers.find((o) => o.id === requestedOrgId && matchesIdentity(o));
    if (exact) return exact;
  }
  return db.organizers.find(matchesIdentity);
}

function getStudentForRequest(
  db: DatabaseState,
  req: AuthenticatedRequest
): { key: string; student: StudentProfile } {
  if (!db.students || typeof db.students !== 'object') {
    db.students = {};
  }
  const key = getStudentSessionKey(req);
  let student = db.students[key];
  if (!student) {
    const studentId = key.startsWith('uid:') ? key.slice(4) : key;
    student = createGuestStudent(studentId);
    if (req.verifiedAuth?.emailVerified && req.verifiedAuth.email) {
      student.email = req.verifiedAuth.email;
    }
    if (req.verifiedAuth?.uid) {
      student.authUid = req.verifiedAuth.uid;
    }
    db.students[key] = student;
  }
  if (req.verifiedAuth?.emailVerified && req.verifiedAuth.email) {
    const emailLower = req.verifiedAuth.email.trim().toLowerCase();
    const pendingKey = `email:${emailLower}`;
    let claimed = false;
    for (const n of db.notifications) {
      if (n.userId === pendingKey) {
        n.userId = student.id;
        claimed = true;
      }
    }
    if (emailLower !== 'vipujgaming@gmail.com') {
      for (const org of db.organizers) {
        if (org.email.trim().toLowerCase() === emailLower && !org.authUid) {
          org.authUid = req.verifiedAuth.uid;
          claimed = true;
        }
      }
    }
    if (claimed) {
      saveDb(db);
    }
  }
  return { key, student };
}

function istInputToUtcIso(istStr: string): string {
  // Expected "YYYY-MM-DDTHH:mm"
  const normalized = istStr.length === 16 ? `${istStr}:00+05:30` : `${istStr}+05:30`;
  const d = new Date(normalized);
  if (isNaN(d.getTime())) {
    return new Date(istStr).toISOString();
  }
  return d.toISOString();
}

function normalizeTitleTokens(str: string): string[] {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function findDuplicateEvent(
  events: CampusEvent[],
  title: string,
  collegeId: string,
  startIsoUtc: string
): CampusEvent | null {
  const tokensA = new Set(normalizeTitleTokens(title));
  if (tokensA.size === 0) return null;
  const targetDate = startIsoUtc.slice(0, 10);

  for (const evt of events) {
    if (evt.status === 'cancelled') continue;
    if (evt.collegeId !== collegeId) continue;
    const evtDate = evt.startAt.slice(0, 10);
    if (evtDate !== targetDate) continue;

    const tokensB = normalizeTitleTokens(evt.title);
    const overlap = tokensB.filter((t) => tokensA.has(t)).length;
    const union = new Set([...tokensA, ...tokensB]).size;
    const jaccard = union > 0 ? overlap / union : 0;
    if (jaccard >= 0.45) {
      return evt;
    }
  }
  return null;
}

function isValidPromoVideoUrl(url?: string): boolean {
  if (!url) return true;
  const trimmed = url.trim();
  if (!trimmed) return true;
  return (
    trimmed.startsWith('/uploads/') ||
    trimmed.startsWith('/src/assets/') ||
    trimmed.startsWith('/assets/') ||
    trimmed.startsWith('https://')
  );
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '8mb' }));
  app.use('/api', async (req: AuthenticatedRequest, res, next) => {
    const authHeader = String(req.headers.authorization || '');
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      req.bearerToken = token;
      const verified = await verifyBearerToken(token);
      if (verified) {
        req.verifiedAuth = verified;
      }
    }

    const p = req.path;
    const isPreAuthBypass =
      p === '/maps-config' ||
      p === '/bootstrap' ||
      p === '/beta/status' ||
      p === '/beta/redeem' ||
      p.startsWith('/officials/invites/');

    if (!isPreAuthBypass) {
      const db = loadDb();
      const allowed = await ensureBetaAllowedWithFirestoreFallback(db, req);
      if (!allowed) {
        return res.status(403).json({
          error:
            'This server is in 6-person Invite-Only Beta mode. Sign in with an invited Google account or redeem an access code.',
          code: 'BETA_LOCKED',
        });
      }
    }

    next();
  });

  const UPLOADS_DIR = path.resolve(process.cwd(), 'data/uploads');
  const VIDEO_UPLOADS_DIR = path.join(UPLOADS_DIR, 'videos');
  if (!fs.existsSync(VIDEO_UPLOADS_DIR)) {
    fs.mkdirSync(VIDEO_UPLOADS_DIR, { recursive: true });
  }
  app.use('/uploads', express.static(UPLOADS_DIR));
  const httpServer = http.createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws/team-chat' });
  const wsClientMeta = new Map<WebSocket, { userId: string; isGuest: boolean }>();

  function getActiveOnlineUserIds(): Set<string> {
    const ids = new Set<string>();
    for (const [client, meta] of wsClientMeta.entries()) {
      if (client.readyState === WebSocket.OPEN && !meta.isGuest && meta.userId) {
        ids.add(meta.userId);
      }
    }
    return ids;
  }

  function broadcastToUsers(userIds: string[], payload: Record<string, unknown>) {
    const targets = new Set(userIds.filter(Boolean));
    if (targets.size === 0) return;
    const encoded = JSON.stringify(payload);
    for (const [client, meta] of wsClientMeta.entries()) {
      if (client.readyState === WebSocket.OPEN && targets.has(meta.userId)) {
        client.send(encoded);
      }
    }
  }

  function broadcastTeamUpCallUpserted(call: TeamUpCall, userIds: string[]) {
    const targets = new Set(userIds.filter(Boolean));
    if (targets.size === 0) return;
    for (const [client, meta] of wsClientMeta.entries()) {
      if (client.readyState === WebSocket.OPEN && targets.has(meta.userId)) {
        client.send(
          JSON.stringify({
            type: 'teamUpCall:upserted',
            call: sanitizeTeamUpCallForViewer(call, meta.userId),
          })
        );
      }
    }
  }

  function broadcastPublicTeamsEvent(payload: Record<string, unknown>) {
    const encoded = JSON.stringify(payload);
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(encoded);
      }
    }
  }

  function broadcastSquadUpdated(db: DatabaseState, squad: Squad) {
    for (const [client, meta] of wsClientMeta.entries()) {
      if (client.readyState === WebSocket.OPEN && squad.memberIds.includes(meta.userId)) {
        client.send(
          JSON.stringify({
            type: 'squad:upserted',
            squad: sanitizeSquadForMember(squad, meta.userId),
          })
        );
      }
    }
    if (
      !squad.archivedAt &&
      squad.recruitmentStatus === 'open' &&
      !squad.isLocked &&
      squad.members.length < squad.targetSize
    ) {
      broadcastPublicTeamsEvent({
        type: 'publicSquad:upserted',
        summary: toPublicSquadSummary(squad),
      });
    } else {
      broadcastPublicTeamsEvent({
        type: 'publicSquad:removed',
        id: squad.id,
      });
    }
    const touchedSnapshots = db.registrationSnapshots.filter((s) => s.squadId === squad.id);
    for (const snap of touchedSnapshots) {
      broadcastToUsers(squad.memberIds, {
        type: 'snapshot:upserted',
        snapshot: {
          ...snap,
          members: buildMemberRegistrationStatuses(squad, db.registrations),
        },
      });
    }
  }

  function broadcastScopedTeamsReset(db: DatabaseState) {
    for (const [client, meta] of wsClientMeta.entries()) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(
          JSON.stringify({
            type: 'teams:init',
            ...buildScopedTeamsPayload(db, meta.userId),
            notifications: db.notifications.filter(
              (n) => n.userId === meta.userId || n.eventId === 'system'
            ),
          })
        );
      }
    }
  }

  function broadcastNotificationsAndRefresh(params: {
    notifications?: NotificationItem[];
    refreshFeed?: boolean;
    refreshOfficialsCollegeId?: string;
    extraOfficialUserIds?: string[];
  }) {
    const list = params.notifications || [];
    for (const notif of list) {
      broadcastToUsers([notif.userId], {
        type: 'notification:created',
        notification: notif,
      });
    }
    if (params.refreshFeed) {
      broadcastPublicTeamsEvent({ type: 'feed:refresh' });
    }
    if (params.refreshOfficialsCollegeId || (params.extraOfficialUserIds?.length ?? 0) > 0) {
      const db = loadDb();
      const targetUserIds = new Set<string>(params.extraOfficialUserIds || []);
      for (const stu of Object.values(db.students || {})) {
        const cleanEmail = (stu.email || '').trim().toLowerCase();
        if (cleanEmail && BETA_MANAGER_EMAILS.has(cleanEmail)) {
          targetUserIds.add(stu.id);
        }
      }
      if (params.refreshOfficialsCollegeId) {
        for (const org of db.organizers) {
          if (
            org.status === 'approved' &&
            org.memberRole === 'college_official' &&
            org.collegeId === params.refreshOfficialsCollegeId
          ) {
            if (org.authUid) targetUserIds.add(org.authUid);
            for (const stu of Object.values(db.students || {})) {
              if (stu.email && stu.email.trim().toLowerCase() === org.email.trim().toLowerCase()) {
                targetUserIds.add(stu.id);
              }
            }
          }
        }
      }
      if (targetUserIds.size > 0) {
        broadcastToUsers(Array.from(targetUserIds), {
          type: 'officials:refresh',
          collegeId: params.refreshOfficialsCollegeId || '',
        });
      }
    }
  }

  wss.on('connection', async (ws, req) => {
    let userId = 'guest:anonymous';
    let isGuest = true;
    let verifiedEmail = '';
    let emailVerified = false;
    let wsToken = '';
    try {
      const parsed = new URL(req.url || '/ws/team-chat', 'http://localhost');
      const token = (parsed.searchParams.get('token') || '').trim();
      wsToken = token;
      const guestKey = (parsed.searchParams.get('guestKey') || '').trim().slice(0, 160);
      if (token) {
        const verified = await verifyBearerToken(token);
        if (verified?.uid) {
          userId = verified.uid;
          isGuest = false;
          verifiedEmail = verified.email;
          emailVerified = verified.emailVerified;
        }
      }
      if (isGuest && guestKey.startsWith('guest:')) {
        userId = guestKey;
      }
    } catch {
      // keep guest fallback
    }

    const db = loadDb();
    let wsBetaAllowed = isEmailBetaAllowed(db, verifiedEmail, emailVerified);
    if (!wsBetaAllowed && emailVerified && verifiedEmail && wsToken) {
      const restOk = await verifyBetaSeatViaFirestoreRest(verifiedEmail, wsToken);
      if (restOk && db.betaAccess && db.betaAccess.allowedEmails.length < db.betaAccess.maxSeats) {
        const clean = verifiedEmail.trim().toLowerCase();
        if (!db.betaAccess.allowedEmails.includes(clean)) {
          db.betaAccess.allowedEmails.push(clean);
          saveDb(db);
        }
        wsBetaAllowed = true;
      }
    }
    if (db.betaAccess?.enabled && !wsBetaAllowed) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'beta:locked' }));
      }
      ws.close(4003, 'Invite-only closed beta');
      return;
    }

    wsClientMeta.set(ws, { userId, isGuest });
    if (expireStaleTeamItems(db)) {
      saveDb(db);
    }

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: 'teams:init',
          ...buildScopedTeamsPayload(db, userId),
          notifications: db.notifications.filter(
            (n) => n.userId === userId || n.eventId === 'system'
          ),
        })
      );
    }

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as { type?: string };
        if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
        }
      } catch {
        // Ignore malformed WS frames
      }
    });

    ws.on('close', () => {
      wsClientMeta.delete(ws);
    });
  });

  app.get('/api/maps-config', (_req, res) => {
    const apiKey =
      process.env.VITE_GOOGLE_MAPS_API_KEY ||
      process.env.GOOGLE_MAPS_API_KEY ||
      '';
    res.json({ apiKey });
  });

  app.get('/api/beta/status', async (req: AuthenticatedRequest, res) => {
    const db = loadDb();
    const beta = db.betaAccess!;
    const allowed = await ensureBetaAllowedWithFirestoreFallback(db, req);
    res.json({
      enabled: beta.enabled,
      maxSeats: beta.maxSeats,
      usedSeats: beta.allowedEmails.length,
      betaLocked: !allowed,
    });
  });

  app.post('/api/beta/redeem', (req: AuthenticatedRequest, res) => {
    const { uid, email } = getRequestAuthIdentity(req);
    if (!uid || !email) {
      return res.status(401).json({ error: 'Sign in with your verified Google account first.' });
    }
    const db = loadDb();
    const beta = db.betaAccess!;
    const rawCode = String((req.body as { code?: string })?.code || '').trim().toUpperCase();
    if (!rawCode) {
      return res.status(400).json({ error: 'Enter your invite access code.' });
    }

    if (isRequestBetaAllowed(db, req)) {
      return res.json({ ok: true, betaLocked: false, alreadyAllowed: true });
    }

    const matchingBetaCode = beta.inviteCodes.find(
      (c) => c.code.toUpperCase() === rawCode && !c.usedAt
    );
    if (!matchingBetaCode) {
      return res.status(404).json({
        error: 'Invite access code is invalid or has already been used.',
      });
    }
    if (beta.allowedEmails.length >= beta.maxSeats) {
      return res.status(403).json({
        error: `All ${beta.maxSeats} private testing seats are currently occupied. Ask a Campus Official to free a seat.`,
      });
    }

    const nowIso = new Date().toISOString();
    beta.allowedEmails.push(email);
    matchingBetaCode.usedByEmail = email;
    matchingBetaCode.usedAt = nowIso;
    db.auditLog.unshift({
      id: `aud-${Date.now()}`,
      actor: email,
      action: 'REDEEMED_BETA_SEAT',
      target: `Seat ${beta.allowedEmails.length}/${beta.maxSeats} via ${matchingBetaCode.code}`,
      createdAt: nowIso,
    });
    saveDb(db);
    res.json({ ok: true, betaLocked: false });
  });

  app.post('/api/officials/beta/toggle', (req: AuthenticatedRequest, res) => {
    if (!isBetaManagerRequest(req)) {
      return res.status(403).json({ error: 'Campus Official authentication required.' });
    }
    const db = loadDb();
    const beta = db.betaAccess!;
    const enabled = Boolean((req.body as { enabled?: boolean })?.enabled);
    beta.enabled = enabled;
    db.auditLog.unshift({
      id: `aud-${Date.now()}`,
      actor: getRequestAuthIdentity(req).email || 'Campus Official',
      action: enabled ? 'ENABLED_INVITE_ONLY_BETA' : 'DISABLED_INVITE_ONLY_BETA',
      target: `${beta.allowedEmails.length}/${beta.maxSeats} seats configured`,
      createdAt: new Date().toISOString(),
    });
    saveDb(db);
    res.json({ betaAccess: beta, auditLog: db.auditLog });
  });

  app.post('/api/officials/beta/add-email', (req: AuthenticatedRequest, res) => {
    if (!isBetaManagerRequest(req)) {
      return res.status(403).json({ error: 'Campus Official authentication required.' });
    }
    const db = loadDb();
    const beta = db.betaAccess!;
    const email = String((req.body as { email?: string })?.email || '').trim().toLowerCase();
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Enter a valid Google email address.' });
    }
    if (email === 'snow.kngt@gmail.com') {
      return res.status(400).json({ error: 'Platform Owner account is disabled for this beta.' });
    }
    if (beta.allowedEmails.includes(email)) {
      return res.status(409).json({ error: `${email} already has a seat.` });
    }
    if (beta.allowedEmails.length >= beta.maxSeats) {
      return res.status(400).json({
        error: `Maximum ${beta.maxSeats} seats reached. Remove a student seat first to add a new tester.`,
      });
    }
    beta.allowedEmails.push(email);
    db.auditLog.unshift({
      id: `aud-${Date.now()}`,
      actor: getRequestAuthIdentity(req).email || 'Campus Official',
      action: 'ADDED_BETA_TESTER_EMAIL',
      target: `${email} (Seat ${beta.allowedEmails.length}/${beta.maxSeats})`,
      createdAt: new Date().toISOString(),
    });
    saveDb(db);
    res.json({ betaAccess: beta, auditLog: db.auditLog });
  });

  app.post('/api/officials/beta/remove-email', (req: AuthenticatedRequest, res) => {
    if (!isBetaManagerRequest(req)) {
      return res.status(403).json({ error: 'Campus Official authentication required.' });
    }
    const db = loadDb();
    const beta = db.betaAccess!;
    const email = String((req.body as { email?: string })?.email || '').trim().toLowerCase();
    if (CORE_BETA_SEATS.has(email)) {
      return res.status(400).json({
        error: 'Fixed core beta seats cannot be removed.',
      });
    }
    beta.allowedEmails = beta.allowedEmails.filter((e) => e !== email);
    db.auditLog.unshift({
      id: `aud-${Date.now()}`,
      actor: getRequestAuthIdentity(req).email || 'Campus Official',
      action: 'REMOVED_BETA_TESTER_EMAIL',
      target: email,
      createdAt: new Date().toISOString(),
    });
    saveDb(db);
    res.json({ betaAccess: beta, auditLog: db.auditLog });
  });

  app.post('/api/officials/beta/create-code', (req: AuthenticatedRequest, res) => {
    if (!isBetaManagerRequest(req)) {
      return res.status(403).json({ error: 'Campus Official authentication required.' });
    }
    const db = loadDb();
    const beta = db.betaAccess!;
    const label = String((req.body as { label?: string })?.label || '').trim().slice(0, 80);
    const code = `BETA-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    beta.inviteCodes.unshift({
      code,
      ...(label ? { label } : {}),
      createdAt: new Date().toISOString(),
    });
    db.auditLog.unshift({
      id: `aud-${Date.now()}`,
      actor: getRequestAuthIdentity(req).email || 'Campus Official',
      action: 'CREATED_BETA_ACCESS_CODE',
      target: label ? `${code} (${label})` : code,
      createdAt: new Date().toISOString(),
    });
    saveDb(db);
    res.json({ betaAccess: beta, code, auditLog: db.auditLog });
  });

  app.post('/api/officials/beta/revoke-code', (req: AuthenticatedRequest, res) => {
    if (!isBetaManagerRequest(req)) {
      return res.status(403).json({ error: 'Campus Official authentication required.' });
    }
    const db = loadDb();
    const beta = db.betaAccess!;
    const code = String((req.body as { code?: string })?.code || '').trim().toUpperCase();
    beta.inviteCodes = beta.inviteCodes.filter((c) => c.code.toUpperCase() !== code);
    saveDb(db);
    res.json({ betaAccess: beta });
  });

  const recordedViewsMap = new Map<string, number>();

  function evaluateEventEligibility(
    student: StudentProfile,
    evt: CampusEvent
  ): { eligibleToRegister: boolean; ineligibilityReasons: string[]; branchEligible: boolean; yearEligible: boolean } {
    const reasons: string[] = [];
    const college = HYDERABAD_COLLEGES.find((c) => c.id === evt.collegeId);
    const collegeShort = college?.shortName || 'Host College';

    if (evt.audience === 'host_college_only') {
      if (student.collegeId !== evt.collegeId) {
        reasons.push(`Restricted to ${collegeShort} students.`);
      } else if (!student.collegeVerified) {
        reasons.push(`Verify your ${collegeShort} student account to register.`);
      }
    }

    const branchEligible =
      evt.branches.includes('All') ||
      !student.branch ||
      evt.branches.includes(student.branch);
    if (!branchEligible) {
      reasons.push(`Eligible branches: ${evt.branches.join(', ')}.`);
    }

    const yearEligible =
      evt.years.includes('All') ||
      !student.year ||
      evt.years.includes(student.year);
    if (!yearEligible) {
      reasons.push(`Eligible years: ${evt.years.join(', ')}.`);
    }

    if (evt.regStatus === 'closed') {
      reasons.push('Registrations are closed.');
    } else if (evt.status === 'cancelled') {
      reasons.push('Event cancelled.');
    }

    return {
      eligibleToRegister: reasons.length === 0,
      ineligibilityReasons: reasons,
      branchEligible,
      yearEligible,
    };
  }

  function sanitizeFeedbackForViewer(
    fb: EventFeedback,
    viewerUserId: string
  ): EventFeedback {
    if (fb.isAnonymous && fb.userId !== viewerUserId) {
      return {
        ...fb,
        userId: 'anonymous',
        authorName: 'Anonymous Student',
      };
    }
    return fb;
  }

  function buildEnrichedFeedEvent(
    db: DatabaseState,
    student: StudentProfile,
    evt: CampusEvent,
    originLat: number,
    originLng: number,
    nowMs: number
  ): FeedEvent {
    const college = HYDERABAD_COLLEGES.find((c) => c.id === evt.collegeId);
    const area = HYDERABAD_AREAS.find((a) => a.id === evt.areaId);
    const distanceKm =
      evt.mode === 'Online' ? 0 : haversineKm(originLat, originLng, evt.lat, evt.lng);
    const elig = evaluateEventEligibility(student, evt);

    let score = 0;
    const reasons: string[] = [];

    if (student.followedCollegeIds.includes(evt.collegeId)) {
      score += 40;
      reasons.push('Followed college');
    }
    if (student.interests.includes(evt.type)) {
      score += 25;
      reasons.push(`Matches ${evt.type}`);
    }
    if (elig.branchEligible && elig.yearEligible && (!evt.branches.includes('All') || !evt.years.includes('All'))) {
      score += 15;
      reasons.push(`${student.branch} · ${student.year}`);
    }
    if (evt.mode === 'Online') {
      score += 10;
      reasons.push('Online');
    } else {
      if (distanceKm <= 5) score += 15;
      else if (distanceKm <= 10) score += 8;
      reasons.push(`${distanceKm} km away`);
    }

    const deadlineDiffHours = (new Date(evt.regDeadline).getTime() - nowMs) / (1000 * 60 * 60);
    if (deadlineDiffHours > 0 && deadlineDiffHours <= 72) {
      score += 20;
      const days = Math.ceil(deadlineDiffHours / 24);
      reasons.push(days <= 1 ? 'Closes today' : `Closes in ${days}d`);
    }

    const skillMatch = evaluateStudentEventMatch(student, evt);
    score += skillMatch.skillBoost;
    if (skillMatch.matchReason) {
      reasons.unshift(skillMatch.matchReason);
    }

    const myReg = db.registrations.find(
      (r) => r.eventId === evt.id && r.userId === student.id && r.status !== 'cancelled'
    );
    let waitlistPosition: number | null = null;
    if (myReg?.status === 'waitlisted') {
      const waitlisted = db.registrations
        .filter((r) => r.eventId === evt.id && r.status === 'waitlisted')
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      waitlistPosition = waitlisted.findIndex((r) => r.id === myReg.id) + 1;
    }

    const eventFeedbacks = (db.eventFeedback || []).filter((f) => f.eventId === evt.id);
    const avgRating =
      eventFeedbacks.length > 0
        ? Number(
            (
              eventFeedbacks.reduce((sum, f) => sum + f.rating, 0) / eventFeedbacks.length
            ).toFixed(1)
          )
        : null;

    return {
      ...evt,
      viewCount: typeof evt.viewCount === 'number' ? evt.viewCount : 0,
      collegeName: college?.name || 'Campus India',
      collegeShortName: college?.shortName || 'CAMPUS',
      areaName: evt.formattedAddress || area?.name || 'India',
      distanceKm,
      score,
      reasons: reasons.slice(0, 3),
      eligibleToRegister: elig.eligibleToRegister,
      ineligibilityReasons: elig.ineligibilityReasons,
      averageRating: avgRating,
      feedbackCount: eventFeedbacks.length,
      myRegistrationStatus: myReg ? myReg.status : null,
      myRegistration: myReg || null,
      waitlistPosition,
      isSaved: student.savedEventIds.includes(evt.id),
      matchedSkills: skillMatch.matchedSkills,
      matchedGoals: skillMatch.matchedGoals,
      fillRatio: skillMatch.fillRatio,
      isFillingFast: skillMatch.isFillingFast,
    };
  }

  app.get('/api/bootstrap', async (req: AuthenticatedRequest, res) => {
    const db = loadDb();
    if (expireStaleTeamItems(db)) {
      saveDb(db);
    }
    const beta = db.betaAccess!;
    const betaAllowed = await ensureBetaAllowedWithFirestoreFallback(db, req);

    if (!betaAllowed) {
      return res.json({
        betaLocked: true,
        isBetaManager: false,
        betaAccessSummary: {
          enabled: beta.enabled,
          maxSeats: beta.maxSeats,
          usedSeats: beta.allowedEmails.length,
        },
        areas: [],
        colleges: [],
        samplePosters: [],
        student: createGuestStudent(),
        organizers: [],
        officialInvites: [],
        announcements: [],
        activeOrganizerId: '',
        notifications: [],
        reports: [],
        pendingSuggestions: [],
        organizerEvents: [],
        participatedEvents: [],
        registrations: [],
        eventFeedback: [],
        surveys: [],
        surveyResponses: [],
        auditLog: [],
        partnerPosts: [],
        publicSquads: [],
        mySquads: [],
        connectionRequests: [],
        joinRequests: [],
        teamUpCalls: [],
        conversations: [],
        chatMessages: [],
        registrationSnapshots: [],
      });
    }

    const { student } = getStudentForRequest(db, req);
    const { uid, email } = getRequestAuthIdentity(req);
    const betaManager = isBetaManagerRequest(req);
    const officialCaller = findApprovedOfficialForRequest(db, req);
    const callerRole = officialCaller?.memberRole;

    const visibleOrganizers =
      officialCaller && callerRole === 'college_official'
        ? db.organizers.filter((o) => o.collegeId === officialCaller.collegeId)
        : officialCaller
          ? db.organizers.filter((o) => o.id === officialCaller.id)
          : uid || email
            ? db.organizers.filter(
                (o) =>
                  (uid && o.authUid === uid) ||
                  (email && o.email.toLowerCase() === email)
              )
            : [];

    const visibleOrganizerEvents = officialCaller
      ? callerRole === 'college_official'
        ? db.events.filter(
            (e) =>
              e.collegeId === officialCaller.collegeId &&
              e.source !== 'student_suggested' &&
              (e.status !== 'draft' || e.clubId === officialCaller.id)
          )
        : db.events.filter((e) => e.clubId === officialCaller.id)
      : [];

    const visibleEventIds = new Set(visibleOrganizerEvents.map((e) => e.id));
    const visibleRegistrations = officialCaller
      ? db.registrations.filter(
          (r) => r.userId === student.id || visibleEventIds.has(r.eventId)
        )
      : db.registrations.filter((r) => r.userId === student.id);

    const visibleInvites =
      officialCaller && callerRole === 'college_official'
        ? db.officialInvites.filter((i) => i.collegeId === officialCaller.collegeId)
        : [];

    const myRegEventIds = new Set(
      db.registrations.filter((r) => r.userId === student.id).map((r) => r.eventId)
    );
    const savedIdSet = new Set(student.savedEventIds || []);
    const studentAreaForReg =
      HYDERABAD_AREAS.find((a) => a.id === student.areaId) ||
      HYDERABAD_AREAS.find((a) => a.id === 'area-kompally') ||
      HYDERABAD_AREAS[0];
    const originLatBoot =
      typeof student.locationLat === 'number' ? student.locationLat : studentAreaForReg.lat;
    const originLngBoot =
      typeof student.locationLng === 'number' ? student.locationLng : studentAreaForReg.lng;
    const nowMsBoot = Date.now();

    const participatedEvents: FeedEvent[] = db.events
      .filter((e) => myRegEventIds.has(e.id) || savedIdSet.has(e.id))
      .map((e) => buildEnrichedFeedEvent(db, student, e, originLatBoot, originLngBoot, nowMsBoot));

    const scopedFeedback: EventFeedback[] = (db.eventFeedback || [])
      .filter((fb) => {
        if (fb.userId === student.id) return true;
        if (officialCaller && callerRole === 'college_official') {
          return fb.collegeId === officialCaller.collegeId;
        }
        if (officialCaller && callerRole === 'club_leader') {
          return fb.clubId === officialCaller.id;
        }
        return false;
      })
      .map((fb) => sanitizeFeedbackForViewer(fb, student.id));

    const targetSurveyCollegeId = officialCaller?.collegeId || student.collegeId;
    const visibleSurveys: CampusSurvey[] = (db.surveys || []).filter(
      (s) => s.collegeId === targetSurveyCollegeId || s.collegeId === student.collegeId
    );
    const visibleSurveyResponses: SurveyResponse[] = (db.surveyResponses || [])
      .filter((sr) => {
        if (sr.userId === student.id) return true;
        if (officialCaller && callerRole === 'college_official') {
          return sr.collegeId === officialCaller.collegeId;
        }
        return false;
      })
      .map((sr) =>
        sr.isAnonymous && sr.userId !== student.id
          ? { ...sr, userId: 'anonymous', respondentName: 'Anonymous Student' }
          : sr
      );

    const scopedTeams = buildScopedTeamsPayload(db, student.id);

    res.json({
      betaLocked: false,
      isBetaManager: betaManager,
      betaAccessSummary: {
        enabled: beta.enabled,
        maxSeats: beta.maxSeats,
        usedSeats: beta.allowedEmails.length,
      },
      ...(betaManager ? { betaAccess: beta } : {}),
      areas: HYDERABAD_AREAS,
      colleges: HYDERABAD_COLLEGES,
      samplePosters: SAMPLE_POSTERS,
      student,
      organizers: visibleOrganizers,
      officialInvites: visibleInvites,
      announcements: db.announcements || [],
      activeOrganizerId: officialCaller?.id || visibleOrganizers[0]?.id || '',
      notifications: db.notifications.filter(
        (n) => n.userId === student.id || n.eventId === 'system'
      ),
      reports: [],
      pendingSuggestions: [],
      organizerEvents: visibleOrganizerEvents,
      participatedEvents,
      registrations: visibleRegistrations,
      eventFeedback: scopedFeedback,
      surveys: visibleSurveys,
      surveyResponses: visibleSurveyResponses,
      auditLog:
        officialCaller && callerRole === 'college_official'
          ? db.auditLog.slice(0, 60)
          : [],
      ...scopedTeams,
    });
  });

  app.get('/api/feed', (req, res) => {
    const db = loadDb();
    const { student } = getStudentForRequest(db, req);
    const showAll = req.query.showAll === 'true';
    const scope = (req.query.scope as string) || 'discover';
    const onlyFollowed = req.query.onlyFollowed === 'true';
    const typeFilter = (req.query.type as string) || 'All';
    const search = ((req.query.search as string) || '').trim().toLowerCase();

    const studentArea =
      HYDERABAD_AREAS.find((a) => a.id === student.areaId) ||
      HYDERABAD_AREAS.find((a) => a.id === 'area-kompally') ||
      HYDERABAD_AREAS[0];
    const originLat =
      typeof student.locationLat === 'number' ? student.locationLat : studentArea.lat;
    const originLng =
      typeof student.locationLng === 'number' ? student.locationLng : studentArea.lng;
    const nowMs = Date.now();

    const feed: FeedEvent[] = [];

    for (const evt of db.events) {
      if (evt.status !== 'published') continue;
      if (new Date(evt.endAt).getTime() < nowMs) continue;

      const isOwnCollegeEvent = student.collegeId !== 'other' && evt.collegeId === student.collegeId;
      if (scope === 'my_campus' && !isOwnCollegeEvent) continue;

      if (!showAll && scope !== 'my_campus' && evt.regStatus === 'closed') continue;

      // Own-college events MUST always remain visible inside My Campus / showAll regardless of host_college_only or verification status!
      if (evt.audience === 'host_college_only' && !isOwnCollegeEvent) {
        continue;
      }
      if (evt.audience === 'host_college_only' && scope !== 'my_campus' && !showAll && !student.collegeVerified) {
        continue;
      }

      const distanceKm =
        evt.mode === 'Online'
          ? 0
          : haversineKm(originLat, originLng, evt.lat, evt.lng);

      if (!showAll && scope !== 'my_campus' && evt.mode !== 'Online' && distanceKm > student.radiusKm) {
        continue;
      }

      if (onlyFollowed && !student.followedCollegeIds.includes(evt.collegeId)) {
        continue;
      }

      if (typeFilter !== 'All' && evt.type !== typeFilter) {
        continue;
      }

      const college = HYDERABAD_COLLEGES.find((c) => c.id === evt.collegeId);
      const area = HYDERABAD_AREAS.find((a) => a.id === evt.areaId);

      if (search) {
        const hay = `${evt.title} ${evt.description} ${evt.clubName} ${college?.name || ''} ${college?.shortName || ''} ${area?.name || ''}`.toLowerCase();
        if (!hay.includes(search)) continue;
      }

      const elig = evaluateEventEligibility(student, evt);
      // In Discover personalized mode (!showAll), filter out ineligible events; in My Campus or showAll, keep ALL college events visible!
      if (!showAll && scope !== 'my_campus' && (!elig.branchEligible || !elig.yearEligible)) {
        continue;
      }

      feed.push(buildEnrichedFeedEvent(db, student, evt, originLat, originLng, nowMs));
    }

    feed.sort((a, b) => b.score - a.score || a.startAt.localeCompare(b.startAt));
    res.json({ events: feed });
  });

  app.get('/api/campus-events', (req, res) => {
    const db = loadDb();
    const { student } = getStudentForRequest(db, req);
    const requestedCollegeId = ((req.query.collegeId as string) || student.collegeId || '').trim();
    if (!requestedCollegeId || requestedCollegeId === 'other') {
      return res.json({ events: [] });
    }
    const studentArea =
      HYDERABAD_AREAS.find((a) => a.id === student.areaId) ||
      HYDERABAD_AREAS.find((a) => a.id === 'area-kompally') ||
      HYDERABAD_AREAS[0];
    const originLat =
      typeof student.locationLat === 'number' ? student.locationLat : studentArea.lat;
    const originLng =
      typeof student.locationLng === 'number' ? student.locationLng : studentArea.lng;
    const nowMs = Date.now();

    const isOwnCollege = requestedCollegeId === student.collegeId;
    const campusEvents = db.events
      .filter((evt) => {
        if (evt.collegeId !== requestedCollegeId) return false;
        if (evt.status !== 'published') return false;
        if (new Date(evt.endAt).getTime() < nowMs) return false;
        // Other colleges' private host-college-only events remain hidden from external campuses; own college shows ALL
        if (!isOwnCollege && evt.audience === 'host_college_only') return false;
        return true;
      })
      .map((evt) => buildEnrichedFeedEvent(db, student, evt, originLat, originLng, nowMs))
      .sort((a, b) => a.startAt.localeCompare(b.startAt));

    res.json({ events: campusEvents });
  });

  app.post('/api/events/:id/view', (req: AuthenticatedRequest, res) => {
    const db = loadDb();
    const evt = db.events.find((e) => e.id === req.params.id);
    if (!evt) return res.status(404).json({ error: 'Event not found.' });
    if (evt.status !== 'published') {
      return res.json({ eventId: evt.id, viewCount: evt.viewCount || 0 });
    }
    const { student } = getStudentForRequest(db, req);
    const dedupeKey = `${student.id}:${evt.id}`;
    const lastSeen = recordedViewsMap.get(dedupeKey) || 0;
    const now = Date.now();
    if (now - lastSeen > 30 * 60 * 1000) {
      recordedViewsMap.set(dedupeKey, now);
      evt.viewCount = (evt.viewCount || 0) + 1;
      saveDb(db);
    }
    res.json({ eventId: evt.id, viewCount: evt.viewCount || 0 });
  });

  app.post('/api/student/profile', async (req: AuthenticatedRequest, res) => {
    const db = loadDb();
    const { key, student } = getStudentForRequest(db, req);
    const updates = (req.body || {}) as Partial<StudentProfile>;
    const verifiedUid = req.verifiedAuth?.uid;
    const nextGender =
      updates.gender !== undefined
        ? normalizeStudentGender(updates.gender)
        : normalizeStudentGender(student.gender);
    const nextLanguages =
      updates.languages !== undefined
        ? normalizeStudentLanguages(updates.languages)
        : normalizeStudentLanguages(student.languages);
    const rawThemePref =
      updates.accessibilityPrefs?.themePreference ??
      student.accessibilityPrefs?.themePreference;
    const safeThemePref: 'system' | 'light' | 'dark' =
      rawThemePref === 'light' || rawThemePref === 'dark' || rawThemePref === 'system'
        ? rawThemePref
        : 'system';
    const mergedAccessibilityPrefs =
      updates.accessibilityPrefs || student.accessibilityPrefs
        ? {
            reducedMotion: Boolean(
              updates.accessibilityPrefs?.reducedMotion ??
                student.accessibilityPrefs?.reducedMotion
            ),
            highContrastFocus: Boolean(
              updates.accessibilityPrefs?.highContrastFocus ??
                student.accessibilityPrefs?.highContrastFocus
            ),
            compactDensity: Boolean(
              updates.accessibilityPrefs?.compactDensity ??
                student.accessibilityPrefs?.compactDensity
            ),
            themePreference: safeThemePref,
          }
        : undefined;
    const nextStudent: StudentProfile = {
      ...student,
      ...updates,
      id: student.id,
      authUid: verifiedUid || student.authUid,
      gender: nextGender,
      languages: nextLanguages,
      ...(mergedAccessibilityPrefs ? { accessibilityPrefs: mergedAccessibilityPrefs } : {}),
    };
    db.students[key] = nextStudent;
    for (const p of db.partnerPosts) {
      if (p.userId === nextStudent.id) {
        p.discoveryEnabled = nextStudent.teamDiscoveryEnabled !== false;
      }
    }
    saveDb(db);

    const newPriorityAlerts = await evaluatePriorityLowSeatAlertsForStudent(nextStudent);
    const updatedNotifications = loadDb().notifications.filter(
      (n) => n.userId === nextStudent.id || n.eventId === 'system'
    );
    res.json({
      student: nextStudent,
      newPriorityAlerts,
      notifications: updatedNotifications,
    });
  });

  app.post('/api/student/follow', (req, res) => {
    const db = loadDb();
    const { key, student } = getStudentForRequest(db, req);
    const { collegeId } = req.body as { collegeId: string };
    const exists = student.followedCollegeIds.includes(collegeId);
    student.followedCollegeIds = exists
      ? student.followedCollegeIds.filter((id) => id !== collegeId)
      : [...student.followedCollegeIds, collegeId];
    db.students[key] = student;
    saveDb(db);
    res.json({ student });
  });

  app.post('/api/student/save-event', (req, res) => {
    const db = loadDb();
    const { key, student } = getStudentForRequest(db, req);
    const { eventId } = req.body as { eventId: string };
    const exists = student.savedEventIds.includes(eventId);
    student.savedEventIds = exists
      ? student.savedEventIds.filter((id) => id !== eventId)
      : [...student.savedEventIds, eventId];
    db.students[key] = student;
    saveDb(db);
    res.json({ student });
  });

  app.post('/api/student/telegram-connect', (req, res) => {
    const db = loadDb();
    const { key, student } = getStudentForRequest(db, req);
    const { token, chatId, telegramHandle } = req.body as {
      token?: string;
      chatId?: string;
      telegramHandle?: string;
    };
    if (token && token !== student.telegramDeepLinkToken) {
      return res.status(400).json({ error: 'Invalid one-time Telegram deep link token.' });
    }
    student.telegramConnected = true;
    if (chatId && String(chatId).trim()) {
      student.telegramChatId = String(chatId).trim().slice(0, 64);
    }
    if (telegramHandle && String(telegramHandle).trim()) {
      const cleanHandle = String(telegramHandle).trim().replace(/^@+/, '');
      student.telegramHandle = `@${cleanHandle}`.slice(0, 64);
    }
    db.students[key] = student;
    db.notifications.unshift({
      id: `notif-tg-connect-${Date.now()}`,
      userId: student.id,
      eventId: 'system',
      eventTitle: 'Connectus Bot Connected',
      kind: 'followed_college',
      channel: 'telegram',
      title: 'Telegram Bot Linked',
      body: `Connected ${student.displayName} (${student.telegramHandle || '@student'}) to @ConnectusBot.\nAlerts enabled for ${student.followedCollegeIds.length} followed colleges · Quiet hours ${student.quietHours.start}–${student.quietHours.end} IST.\n\nReply /mute anytime to pause alerts.`,
      sendAfter: new Date().toISOString(),
      sentAt: new Date().toISOString(),
      status: 'sent',
      dedupeKey: `tg_connect:${Date.now()}`,
    });
    saveDb(db);
    if (student.telegramChatId) {
      void dispatchRealTelegramIfConfigured(
        `Connectus Bot Linked!\nHi ${student.displayName}, you'll receive verified campus alerts, 24h/2h event reminders, and priority low-seat warnings here.`,
        student.telegramChatId
      );
    }
    res.json({
      student,
      notifications: db.notifications.filter((n) => n.userId === student.id || n.eventId === 'system'),
    });
  });

  app.post('/api/telegram/webhook', async (req, res) => {
    const update = (req.body || {}) as {
      message?: {
        chat?: { id?: number | string; username?: string };
        from?: { username?: string; first_name?: string };
        text?: string;
      };
    };
    const msg = update.message;
    const chatId = msg?.chat?.id !== undefined ? String(msg.chat.id) : '';
    const text = (msg?.text || '').trim();
    if (!chatId || !text) {
      return res.json({ ok: true });
    }

    const db = loadDb();
    const parts = text.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const arg = parts[1]?.trim() || '';

    let matchedKey: string | null = null;
    let matchedStudent: StudentProfile | null = null;

    if (cmd === '/start' && arg) {
      for (const [k, stu] of Object.entries(db.students || {})) {
        if (stu.telegramDeepLinkToken === arg) {
          matchedKey = k;
          matchedStudent = stu;
          break;
        }
      }
      if (matchedKey && matchedStudent) {
        matchedStudent.telegramConnected = true;
        matchedStudent.telegramChatId = chatId;
        const tgUsername = msg?.chat?.username || msg?.from?.username;
        if (tgUsername) {
          matchedStudent.telegramHandle = `@${tgUsername}`;
        }
        db.students[matchedKey] = matchedStudent;
        saveDb(db);
        await dispatchRealTelegramIfConfigured(
          `Welcome ${matchedStudent.displayName}! Your Telegram is now linked to Connectus.\nUse /status to check alert settings or /mute to pause.`,
          chatId
        );
      } else {
        await dispatchRealTelegramIfConfigured(
          'Token not recognized. Open Connectus -> Telegram Drawer and tap Open Bot to generate your personal deep link.',
          chatId
        );
      }
      return res.json({ ok: true, linked: Boolean(matchedStudent) });
    }

    for (const [k, stu] of Object.entries(db.students || {})) {
      if (stu.telegramChatId === chatId) {
        matchedKey = k;
        matchedStudent = stu;
        break;
      }
    }

    if (matchedKey && matchedStudent) {
      if (cmd === '/mute') {
        matchedStudent.mutedAll = true;
        db.students[matchedKey] = matchedStudent;
        saveDb(db);
        await dispatchRealTelegramIfConfigured(
          'Non-critical Connectus alerts are muted. Send /unmute anytime to resume.',
          chatId
        );
      } else if (cmd === '/unmute') {
        matchedStudent.mutedAll = false;
        db.students[matchedKey] = matchedStudent;
        saveDb(db);
        await dispatchRealTelegramIfConfigured(
          'Connectus alerts resumed (quiet hours and 3/day cap respected).',
          chatId
        );
      } else if (cmd === '/status') {
        const areaName = HYDERABAD_AREAS.find((a) => a.id === matchedStudent!.areaId)?.name || 'Hyderabad';
        await dispatchRealTelegramIfConfigured(
          `Connectus Status (${matchedStudent.displayName}):\nArea: ${areaName} (${matchedStudent.radiusKm} km)\nFollowed campuses: ${matchedStudent.followedCollegeIds.length}\nQuiet hours: ${matchedStudent.quietHours.enabled ? `${matchedStudent.quietHours.start}–${matchedStudent.quietHours.end} IST` : 'Off'}\nMuted: ${matchedStudent.mutedAll ? 'Yes' : 'No'}`,
          chatId
        );
      }
    }

    return res.json({ ok: true });
  });

  app.post('/api/student/telegram-command', (req, res) => {
    const db = loadDb();
    const { key, student } = getStudentForRequest(db, req);
    const { command } = req.body as { command: string };
    const clean = (command || '').trim().toLowerCase();
    let replyTitle = 'Bot Command';
    let replyBody = '';

    if (clean === '/mute') {
      student.mutedAll = true;
      replyTitle = 'Alerts Muted';
      replyBody = 'All non-critical Telegram alerts are paused. Reply /unmute to resume.';
    } else if (clean === '/unmute') {
      student.mutedAll = false;
      replyTitle = 'Alerts Resumed';
      replyBody = 'Connectus notifications are active again (capped at 3/day, quiet hours respected).';
    } else if (clean === '/status') {
      replyTitle = 'Subscription Status';
      replyBody = `Area: ${HYDERABAD_AREAS.find((a) => a.id === student.areaId)?.name} (${student.radiusKm} km)\nFollowed colleges: ${student.followedCollegeIds.length}\nQuiet hours: ${student.quietHours.enabled ? `${student.quietHours.start}–${student.quietHours.end} IST` : 'Off'}\nMuted: ${student.mutedAll ? 'Yes' : 'No'}`;
    } else {
      replyTitle = 'Connectus Bot Help';
      replyBody = 'Available commands:\n/status — View your area, radius & quiet hours\n/mute — Pause non-critical alerts\n/unmute — Resume alerts';
    }

    db.students[key] = student;
    db.notifications.unshift({
      id: `notif-cmd-${Date.now()}`,
      userId: student.id,
      eventId: 'system',
      eventTitle: replyTitle,
      kind: 'followed_college',
      channel: 'telegram',
      title: replyTitle,
      body: replyBody,
      sendAfter: new Date().toISOString(),
      sentAt: new Date().toISOString(),
      status: 'sent',
      dedupeKey: `cmd:${Date.now()}`,
    });
    saveDb(db);
    res.json({
      student,
      notifications: db.notifications.filter((n) => n.userId === student.id || n.eventId === 'system'),
    });
  });

  app.get('/api/student/export-data', (req: AuthenticatedRequest, res) => {
    const db = loadDb();
    const { student } = getStudentForRequest(db, req);
    const registrations = db.registrations.filter((r) => r.userId === student.id);
    const squads = db.squads
      .filter((s) => s.memberIds.includes(student.id))
      .map((s) => sanitizeSquadForMember(s, student.id));
    const partnerPosts = db.partnerPosts.filter((p) => p.userId === student.id);
    const notifications = db.notifications.filter((n) => n.userId === student.id);
    const teamUpCalls = db.teamUpCalls
      .filter((c) => c.creatorId === student.id)
      .map((c) => sanitizeTeamUpCallForViewer(c, student.id));

    res.json({
      exportedAt: new Date().toISOString(),
      standard: 'DPDP Act Personal Data Portability Export',
      student: {
        ...student,
        gender: normalizeStudentGender(student.gender),
        languages: normalizeStudentLanguages(student.languages),
      },
      registrations,
      squads,
      partnerPosts,
      teamUpCalls,
      notifications,
    });
  });

  app.post('/api/student/delete-account', (req, res) => {
    const db = loadDb();
    const { key, student } = getStudentForRequest(db, req);
    const wiped = createGuestStudent(student.id);
    wiped.mutedAll = true;
    wiped.gender = 'unset';
    wiped.languages = [];
    db.students[key] = wiped;
    db.registrations = db.registrations.filter((r) => r.userId !== student.id);
    db.partnerPosts = db.partnerPosts.filter((p) => p.userId !== student.id);
    db.teamUpCalls = db.teamUpCalls
      .filter((c) => c.creatorId !== student.id)
      .map((c) => ({
        ...c,
        recipientUserIds: (c.recipientUserIds || []).filter((uid) => uid !== student.id),
        responses: (c.responses || []).filter((r) => r.userId !== student.id),
      }));
    db.connectionRequests = db.connectionRequests.filter(
      (r) => r.fromUserId !== student.id && r.toUserId !== student.id
    );
    db.joinRequests = db.joinRequests.filter((r) => r.applicantId !== student.id);
    db.squads = db.squads
      .filter((s) => s.ownerId !== student.id)
      .map((s) => ({
        ...s,
        memberIds: s.memberIds.filter((uid) => uid !== student.id),
        members: s.members.filter((m) => m.userId !== student.id),
      }));
    db.eventFeedback = (db.eventFeedback || []).filter((f) => f.userId !== student.id);
    db.surveyResponses = (db.surveyResponses || []).filter((r) => r.userId !== student.id);
    db.notifications = db.notifications.filter((n) => n.userId !== student.id);
    db.auditLog.unshift({
      id: `aud-${Date.now()}`,
      actor: 'Student Self-Service',
      action: 'ACCOUNT_DATA_ERASED',
      target: 'Personal profile, appeal preferences & registrations cleared (DPDP compliance)',
      createdAt: new Date().toISOString(),
    });
    saveDb(db);
    res.json({ student: wiped, message: 'Personal data erased.' });
  });

  app.post('/api/extract-poster', async (req, res) => {
    try {
      if (!checkUploadRateLimit()) {
        return res.status(429).json({
          error: 'Rate limit reached (max 10 poster extractions per minute). Please wait a moment.',
        });
      }

      const { imageDataUrl, samplePosterId, organizerCollegeId } = req.body as {
        imageDataUrl?: string;
        samplePosterId?: string;
        organizerCollegeId?: string;
      };

      let base64Image = '';
      let mimeType = 'image/jpeg';

      if (samplePosterId) {
        const sample = SAMPLE_POSTERS.find((s) => s.id === samplePosterId);
        if (!sample) {
          return res.status(400).json({ error: 'Sample poster not found.' });
        }
        const loaded = resolveLocalPosterToBase64(sample.imagePath);
        base64Image = loaded.base64;
        mimeType = loaded.mimeType;
      } else if (imageDataUrl) {
        const match = imageDataUrl.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,(.+)$/i);
        if (!match) {
          return res.status(400).json({
            error: 'Unsupported image format. Upload JPG, PNG, or WEBP up to 5 MB.',
          });
        }
        mimeType = match[1].toLowerCase() === 'image/jpg' ? 'image/jpeg' : match[1].toLowerCase();
        base64Image = match[2];
        const approxBytes = (base64Image.length * 3) / 4;
        if (approxBytes > 5 * 1024 * 1024) {
          return res.status(400).json({ error: 'Poster exceeds 5 MB limit.' });
        }
      } else {
        return res.status(400).json({ error: 'Provide either an uploaded poster or a sample poster.' });
      }

      const college = HYDERABAD_COLLEGES.find((c) => c.id === organizerCollegeId);
      const uploadDateIso = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
      }).format(new Date());

      const extraction = await extractPosterWithGemini({
        base64Image,
        mimeType,
        uploadDateIso,
        organizerCollegeName: college?.name || 'Campus India',
      });

      res.json({ extraction });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Poster extraction failed.';
      res.status(500).json({ error: msg });
    }
  });

  app.post(
    '/api/upload-promo-video',
    express.raw({
      type: ['video/mp4', 'video/webm', 'video/quicktime', 'application/octet-stream'],
      limit: '30mb',
    }),
    (req, res) => {
      try {
        const db = loadDb();
        const orgId = (req.headers['x-organizer-id'] as string) || db.activeOrganizerId;
        const org = findApprovedOfficialForRequest(db, req, orgId);
        if (!org || org.status !== 'approved') {
          return res.status(403).json({
            error: 'Only verified College Officials and invited Club Leaders can upload promo reels.',
          });
        }

        const buf = req.body as Buffer;
        if (!Buffer.isBuffer(buf) || buf.length === 0) {
          return res.status(400).json({ error: 'Empty video file received.' });
        }
        if (buf.length > 30 * 1024 * 1024) {
          return res.status(400).json({ error: 'Promo video exceeds the 30 MB upload limit.' });
        }

        const rawContentType = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
        const rawFileName = String(req.headers['x-file-name'] || '').toLowerCase();

        let ext = '';
        let mimeType = rawContentType;
        if (rawContentType === 'video/mp4' || rawFileName.endsWith('.mp4')) {
          ext = 'mp4';
          mimeType = 'video/mp4';
        } else if (rawContentType === 'video/webm' || rawFileName.endsWith('.webm')) {
          ext = 'webm';
          mimeType = 'video/webm';
        } else if (rawContentType === 'video/quicktime' || rawFileName.endsWith('.mov')) {
          ext = 'mov';
          mimeType = 'video/quicktime';
        } else {
          return res.status(400).json({
            error: 'Unsupported video format. Please upload an MP4, WebM, or MOV reel.',
          });
        }

        if (!fs.existsSync(VIDEO_UPLOADS_DIR)) {
          fs.mkdirSync(VIDEO_UPLOADS_DIR, { recursive: true });
        }

        const filename = `reel-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const destPath = path.join(VIDEO_UPLOADS_DIR, filename);
        fs.writeFileSync(destPath, buf);

        res.json({
          videoUrl: `/uploads/videos/${filename}`,
          mimeType,
          sizeBytes: buf.length,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Promo video upload failed.';
        res.status(500).json({ error: msg });
      }
    }
  );

  app.post('/api/events/check-duplicate', (req, res) => {
    const db = loadDb();
    const { title, collegeId, startDatetimeIst } = req.body as {
      title: string;
      collegeId: string;
      startDatetimeIst: string;
    };
    const startUtc = istInputToUtcIso(startDatetimeIst);
    const duplicate = findDuplicateEvent(db.events, title, collegeId, startUtc);
    res.json({ duplicate });
  });

  app.post('/api/events/publish', async (req, res) => {
    const db = loadDb();
    const orgId = (req.body?.organizerId as string) || db.activeOrganizerId;
    const org = findApprovedOfficialForRequest(db, req, orgId);
    if (!org || org.status !== 'approved') {
      return res.status(403).json({
        error:
          'Only verified Campus Officials, invited Club Leaders, or approved External Organizers can submit events.',
      });
    }

    const payload = req.body as {
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
      mode: 'In-Person' | 'Hybrid' | 'Online';
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
      submitForReview?: boolean;
      draftEventId?: string;
      isSponsored?: boolean;
      sponsorLabel?: string;
    };

    if (!payload.title?.trim()) {
      return res.status(400).json({ error: 'Event title is required.' });
    }
    if (!payload.startDatetimeIst || !payload.regDeadlineIst) {
      return res.status(400).json({ error: 'Start date/time and registration deadline are required.' });
    }

    const startAt = istInputToUtcIso(payload.startDatetimeIst);
    const endAt = payload.endDatetimeIst
      ? istInputToUtcIso(payload.endDatetimeIst)
      : new Date(new Date(startAt).getTime() + 3 * 3600 * 1000).toISOString();
    const regDeadline = istInputToUtcIso(payload.regDeadlineIst);

    if (new Date(startAt).getTime() <= Date.now()) {
      return res.status(400).json({ error: 'Start date/time must be in the future (IST).' });
    }
    if (new Date(regDeadline).getTime() > new Date(startAt).getTime()) {
      return res.status(400).json({ error: 'Registration deadline must be before the event start time.' });
    }
    if (payload.regLink && !payload.regLink.startsWith('https://')) {
      return res.status(400).json({ error: 'Registration link must use https://.' });
    }
    if (payload.promoVideoUrl && !isValidPromoVideoUrl(payload.promoVideoUrl)) {
      return res.status(400).json({ error: 'Promo reel URL must be an uploaded reel or an https:// video URL.' });
    }
    if (!Number.isInteger(payload.capacity) || payload.capacity <= 0) {
      return res.status(400).json({ error: 'Capacity must be a positive whole number.' });
    }

    if (!payload.ignoreDuplicate && !payload.draftEventId) {
      const dup = findDuplicateEvent(db.events, payload.title, org.collegeId, startAt);
      if (dup) {
        return res.status(409).json({
          error: `Possible duplicate event already listed: "${dup.title}" on ${formatIstDateTime(dup.startAt)} IST.`,
          duplicate: dup,
        });
      }
    }

    const isClubLeader = org.memberRole === 'club_leader';
    const isExternal = org.memberRole === 'external_organizer' || org.accountType === 'external_organizer';
    const targetStatus: EventStatus = isClubLeader
      ? payload.saveAsDraft
        ? 'draft'
        : 'pending_review'
      : payload.saveAsDraft
        ? 'draft'
        : 'published';

    const resolvedSourceType: CampusEvent['sourceType'] = isExternal
      ? 'external_verified'
      : isClubLeader
        ? 'club_approved'
        : 'campus_official';

    const nowIso = new Date().toISOString();
    const area = HYDERABAD_AREAS.find((a) => a.id === payload.areaId) || HYDERABAD_AREAS[0];

    const historyEntry: EventApprovalEntry = {
      id: `hist-${Date.now()}`,
      reviewerId: org.id,
      reviewerName: org.contactName,
      reviewerRole: isExternal
        ? 'external_organizer'
        : isClubLeader
          ? 'club_leader'
          : 'college_official',
      decision: targetStatus === 'draft' ? 'draft_saved' : targetStatus === 'pending_review' ? 'submitted' : 'published',
      note:
        targetStatus === 'draft'
          ? 'Saved event draft in My Club workspace.'
          : targetStatus === 'pending_review'
            ? 'Submitted club event draft for Campus Official approval.'
            : 'Published directly to campus feed.',
      createdAt: nowIso,
    };

    if (payload.draftEventId) {
      const existingDraft = db.events.find((e) => e.id === payload.draftEventId);
      if (!existingDraft) {
        return res.status(404).json({ error: 'Draft event not found.' });
      }
      if (existingDraft.clubId !== org.id) {
        return res.status(403).json({ error: 'You can only update drafts belonging to your own club.' });
      }
      if (existingDraft.status === 'published') {
        return res.status(400).json({ error: 'Use event edit controls to modify a published event.' });
      }
      existingDraft.title = payload.title.trim();
      existingDraft.description = payload.description.trim();
      existingDraft.type = payload.type;
      existingDraft.startAt = startAt;
      existingDraft.endAt = endAt;
      existingDraft.venueName = payload.venueName.trim();
      existingDraft.areaId = area.id;
      existingDraft.placeId = payload.placeId;
      existingDraft.formattedAddress = payload.formattedAddress;
      existingDraft.lat = typeof payload.lat === 'number' ? payload.lat : area.lat;
      existingDraft.lng = typeof payload.lng === 'number' ? payload.lng : area.lng;
      existingDraft.mode = payload.mode;
      existingDraft.audience = payload.audience;
      existingDraft.branches = payload.branches.length ? payload.branches : ['All'];
      existingDraft.years = payload.years.length ? payload.years : ['All'];
      existingDraft.feeInr = Number(payload.feeInr) || 0;
      existingDraft.capacity = payload.capacity;
      existingDraft.regDeadline = regDeadline;
      existingDraft.regLink = payload.regLink || existingDraft.regLink;
      existingDraft.googleFormUrl = payload.googleFormUrl?.trim() || undefined;
      existingDraft.whatsappGroupUrl = payload.whatsappGroupUrl?.trim() || undefined;
      existingDraft.telegramGroupUrl = payload.telegramGroupUrl?.trim() || undefined;
      existingDraft.paymentInfo = payload.paymentInfo;
      existingDraft.rules = payload.rules?.filter((r) => r.trim());
      existingDraft.teamSize = payload.teamSize?.trim() || undefined;
      existingDraft.prizesAndPerks = payload.prizesAndPerks?.filter((p) => p.trim());
      existingDraft.prerequisites = payload.prerequisites?.filter((p) => p.trim());
      if (payload.schedule !== undefined) {
        existingDraft.schedule = sanitizeEventSchedule(payload.schedule);
      }
      if (payload.coordinatorContact !== undefined) {
        existingDraft.coordinatorContact = payload.coordinatorContact;
      }
      existingDraft.posterUrl = payload.posterUrl;
      existingDraft.promoVideoUrl = payload.promoVideoUrl?.trim() || undefined;
      existingDraft.promoVideoCaption = payload.promoVideoCaption?.trim() || undefined;
      existingDraft.status = targetStatus;
      existingDraft.submissionFeedback = undefined;
      existingDraft.approvalHistory = [historyEntry, ...(existingDraft.approvalHistory || [])];

      db.auditLog.unshift({
        id: `aud-${Date.now()}`,
        actor: org.clubName,
        action: targetStatus === 'draft' ? 'UPDATED_CLUB_DRAFT' : 'SUBMITTED_CLUB_EVENT',
        target: existingDraft.title,
        createdAt: nowIso,
      });
      saveDb(db);
      const { student: callerStu } = getStudentForRequest(db, req);
      let createdNotifs: NotificationItem[] = [];
      if (targetStatus === 'published') {
        createdNotifs = await triggerPublishNotifications(existingDraft);
        broadcastNotificationsAndRefresh({
          notifications: createdNotifs,
          refreshFeed: true,
        });
      } else if (targetStatus === 'pending_review') {
        const subNotice = await notifyCollegeOfficialsOfSubmission({
          event: existingDraft,
          clubName: org.clubName,
          submitterName: org.contactName,
          isRevision: false,
        });
        createdNotifs = subNotice.notifications;
        broadcastNotificationsAndRefresh({
          notifications: createdNotifs,
          refreshOfficialsCollegeId: existingDraft.collegeId,
          extraOfficialUserIds: subNotice.officialUserIds,
        });
      }
      const callerNotif = createdNotifs.find((n) => n.userId === callerStu.id) || createdNotifs[0] || null;
      return res.json({
        event: existingDraft,
        notification: callerNotif,
        notifications: loadDb().notifications.filter(
          (n) => n.userId === callerStu.id || n.eventId === 'system'
        ),
      });
    }

    const evtId = `evt-${Date.now()}`;
    const newEvent: CampusEvent = {
      id: evtId,
      clubId: org.id,
      clubName: org.clubName,
      collegeId: org.collegeId,
      title: payload.title.trim(),
      description: payload.description.trim(),
      type: payload.type,
      startAt,
      endAt,
      venueName: payload.venueName.trim(),
      areaId: area.id,
      placeId: payload.placeId,
      formattedAddress: payload.formattedAddress,
      lat: typeof payload.lat === 'number' ? payload.lat : area.lat,
      lng: typeof payload.lng === 'number' ? payload.lng : area.lng,
      mode: payload.mode,
      audience: payload.audience,
      regStatus: 'open',
      branches: payload.branches.length ? payload.branches : ['All'],
      years: payload.years.length ? payload.years : ['All'],
      feeInr: Number(payload.feeInr) || 0,
      capacity: payload.capacity,
      confirmedCount: 0,
      waitlistCount: 0,
      regDeadline,
      regLink: payload.regLink || `https://connectus.in/register/${evtId}`,
      googleFormUrl: payload.googleFormUrl?.trim() || undefined,
      whatsappGroupUrl: payload.whatsappGroupUrl?.trim() || undefined,
      telegramGroupUrl: payload.telegramGroupUrl?.trim() || undefined,
      paymentInfo: payload.paymentInfo,
      rules: payload.rules?.filter((r) => r.trim()),
      teamSize: payload.teamSize?.trim() || undefined,
      prizesAndPerks: payload.prizesAndPerks?.filter((p) => p.trim()),
      prerequisites: payload.prerequisites?.filter((p) => p.trim()),
      schedule: sanitizeEventSchedule(payload.schedule),
      coordinatorContact: payload.coordinatorContact?.name?.trim()
        ? payload.coordinatorContact
        : {
            name: org.contactName,
            role: org.designation || org.clubName,
            email: org.email,
          },
      posterUrl: payload.posterUrl,
      promoVideoUrl: payload.promoVideoUrl?.trim() || undefined,
      promoVideoCaption: payload.promoVideoCaption?.trim() || undefined,
      source: 'organizer',
      sourceType: resolvedSourceType,
      isSponsored: isExternal ? Boolean(payload.isSponsored) : false,
      sponsorLabel:
        isExternal && payload.isSponsored
          ? (payload.sponsorLabel?.trim() || `Sponsored · ${org.organizationName || org.clubName}`)
          : undefined,
      submittedById: org.id,
      submittedByName: org.contactName,
      approvedById: targetStatus === 'published' && !isClubLeader ? org.id : undefined,
      approvedByName: targetStatus === 'published' && !isClubLeader ? org.contactName : undefined,
      approvalHistory: [historyEntry],
      aiConfidence: payload.aiConfidence,
      status: targetStatus,
      createdAt: nowIso,
    };

    db.events.unshift(newEvent);
    db.auditLog.unshift({
      id: `aud-${Date.now()}`,
      actor: org.clubName,
      action:
        targetStatus === 'draft'
          ? 'SAVED_CLUB_DRAFT'
          : targetStatus === 'pending_review'
            ? 'SUBMITTED_CLUB_EVENT_FOR_REVIEW'
            : 'PUBLISHED_EVENT',
      target: newEvent.title,
      createdAt: nowIso,
    });
    saveDb(db);

    const { student: callerStu } = getStudentForRequest(db, req);
    let createdNotifs: NotificationItem[] = [];
    if (targetStatus === 'published') {
      createdNotifs = await triggerPublishNotifications(newEvent);
      broadcastNotificationsAndRefresh({
        notifications: createdNotifs,
        refreshFeed: true,
      });
    } else if (targetStatus === 'pending_review') {
      const subNotice = await notifyCollegeOfficialsOfSubmission({
        event: newEvent,
        clubName: org.clubName,
        submitterName: org.contactName,
        isRevision: false,
      });
      createdNotifs = subNotice.notifications;
      broadcastNotificationsAndRefresh({
        notifications: createdNotifs,
        refreshOfficialsCollegeId: newEvent.collegeId,
        extraOfficialUserIds: subNotice.officialUserIds,
      });
    }

    const callerNotif = createdNotifs.find((n) => n.userId === callerStu.id) || createdNotifs[0] || null;
    res.json({
      event: newEvent,
      notification: callerNotif,
      createdNotifications: createdNotifs,
      notifications: loadDb().notifications.filter(
        (n) => n.userId === callerStu.id || n.eventId === 'system'
      ),
    });
  });

  app.post('/api/events/:id/update', async (req, res) => {
    const db = loadDb();
    const evt = db.events.find((e) => e.id === req.params.id);
    if (!evt) return res.status(404).json({ error: 'Event not found.' });

    const {
      action,
      title,
      venueName,
      formattedAddress,
      description,
      startDatetimeIst,
      endDatetimeIst,
      regDeadlineIst,
      feeInr,
      capacity,
      mode,
      regStatus,
      regLink,
      posterUrl,
      googleFormUrl,
      whatsappGroupUrl,
      telegramGroupUrl,
      paymentInfo,
      rules,
      teamSize,
      prizesAndPerks,
      prerequisites,
      schedule,
      coordinatorContact,
      promoVideoUrl,
      promoVideoCaption,
      organizerId,
      submitForReview,
    } = req.body as {
      action: 'edit' | 'cancel' | 'submit';
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
      regLink?: string;
      posterUrl?: string;
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
      organizerId?: string;
      submitForReview?: boolean;
    };

    const org = findApprovedOfficialForRequest(db, req, organizerId);

    const isScopedClubLeader = Boolean(org && org.memberRole === 'club_leader');
    const isScopedExternal = Boolean(org && org.memberRole === 'external_organizer');

    const authorized = Boolean(
      org &&
        org.status === 'approved' &&
        (isScopedClubLeader || isScopedExternal
          ? evt.clubId === org.id
          : org.collegeId === evt.collegeId)
    );
    if (!authorized) {
      return res.status(403).json({
        error:
          'You do not have permission to edit this event. Club Leaders and External Organizers can only edit their own club events.',
      });
    }

    const nowIso = new Date().toISOString();

    if (action === 'submit' && isScopedClubLeader) {
      if (evt.status === 'published' || evt.status === 'cancelled') {
        return res.status(400).json({ error: 'Only draft or change-requested events can be submitted for review.' });
      }
      evt.status = 'pending_review';
      evt.submissionFeedback = undefined;
      evt.approvalHistory = [
        {
          id: `hist-${Date.now()}`,
          reviewerId: org!.id,
          reviewerName: org!.contactName,
          reviewerRole: 'club_leader',
          decision: 'submitted',
          note: 'Resubmitted to Campus Official for review.',
          createdAt: nowIso,
        },
        ...(evt.approvalHistory || []),
      ];
      db.auditLog.unshift({
        id: `aud-${Date.now()}`,
        actor: `${org!.contactName} (${org!.clubName})`,
        action: 'SUBMITTED_CLUB_EVENT_FOR_REVIEW',
        target: evt.title,
        createdAt: nowIso,
      });
      saveDb(db);
      const subNotice = await notifyCollegeOfficialsOfSubmission({
        event: evt,
        clubName: org!.clubName,
        submitterName: org!.contactName,
        isRevision: false,
      });
      broadcastNotificationsAndRefresh({
        notifications: subNotice.notifications,
        refreshOfficialsCollegeId: evt.collegeId,
        extraOfficialUserIds: subNotice.officialUserIds,
      });
      return res.json({ event: evt, auditLog: db.auditLog });
    }

    if (action === 'cancel' && isScopedClubLeader && evt.status === 'published') {
      return res.status(403).json({
        error: 'Only a Campus Official can cancel an already-published event. Contact your Official or submit a schedule change.',
      });
    }

    // Significant edits by Club Leaders on already-published events stage a pendingRevision instead of mutating live data silently
    if (action === 'edit' && isScopedClubLeader && evt.status === 'published') {
      const nextStartAt = startDatetimeIst ? istInputToUtcIso(startDatetimeIst) : evt.startAt;
      const nextEndAt = endDatetimeIst ? istInputToUtcIso(endDatetimeIst) : evt.endAt;
      const nextDeadline = regDeadlineIst ? istInputToUtcIso(regDeadlineIst) : evt.regDeadline;
      const changedFields: string[] = [];
      if (typeof title === 'string' && title.trim() && title.trim() !== evt.title) changedFields.push('title');
      if (typeof venueName === 'string' && venueName.trim() && venueName.trim() !== evt.venueName) changedFields.push('venue');
      if (typeof formattedAddress === 'string' && formattedAddress.trim() !== (evt.formattedAddress || '').trim()) changedFields.push('address');
      if (typeof description === 'string' && description.trim() !== evt.description.trim()) changedFields.push('description');
      if (startDatetimeIst && nextStartAt !== evt.startAt) changedFields.push('start_time');
      if (endDatetimeIst && nextEndAt !== evt.endAt) changedFields.push('end_time');
      if (regDeadlineIst && nextDeadline !== evt.regDeadline) changedFields.push('deadline');
      if (typeof feeInr === 'number' && Math.round(feeInr) !== evt.feeInr) changedFields.push('fee');
      if (typeof capacity === 'number' && capacity !== evt.capacity) changedFields.push('capacity');
      if (mode && mode !== evt.mode) changedFields.push('mode');
      if (typeof posterUrl === 'string' && posterUrl.trim() && posterUrl.trim() !== evt.posterUrl) changedFields.push('poster');
      if (typeof regLink === 'string' && regLink.trim() && regLink.trim() !== evt.regLink) changedFields.push('reg_link');
      if (typeof teamSize === 'string' && teamSize.trim() !== (evt.teamSize || '')) changedFields.push('team_size');
      if (Array.isArray(rules) && JSON.stringify(rules.map((r) => r.trim()).filter(Boolean)) !== JSON.stringify(evt.rules || [])) changedFields.push('rules');
      const cleanedScheduleRev = schedule !== undefined ? sanitizeEventSchedule(schedule) : undefined;
      if (cleanedScheduleRev !== undefined && JSON.stringify(cleanedScheduleRev) !== JSON.stringify(evt.schedule || [])) {
        changedFields.push('schedule');
      }

      if (changedFields.length > 0) {
        evt.revisionPendingReview = true;
        evt.pendingRevision = {
          ...(typeof title === 'string' && title.trim() ? { title: title.trim() } : {}),
          ...(typeof venueName === 'string' && venueName.trim() ? { venueName: venueName.trim() } : {}),
          ...(typeof formattedAddress === 'string' ? { formattedAddress: formattedAddress.trim() || undefined } : {}),
          ...(typeof description === 'string' ? { description: description.trim() } : {}),
          ...(startDatetimeIst ? { startAt: nextStartAt } : {}),
          ...(endDatetimeIst ? { endAt: nextEndAt } : {}),
          ...(regDeadlineIst ? { regDeadline: nextDeadline } : {}),
          ...(typeof feeInr === 'number' && feeInr >= 0 ? { feeInr: Math.round(feeInr) } : {}),
          ...(typeof capacity === 'number' && Number.isInteger(capacity) && capacity > 0
            ? { capacity: Math.max(evt.confirmedCount, capacity) }
            : {}),
          ...(mode ? { mode } : {}),
          ...(typeof posterUrl === 'string' && posterUrl.trim() ? { posterUrl: posterUrl.trim() } : {}),
          ...(typeof regLink === 'string' && regLink.trim() ? { regLink: regLink.trim() } : {}),
          ...(typeof teamSize === 'string' ? { teamSize: teamSize.trim() || undefined } : {}),
          ...(Array.isArray(rules) ? { rules: rules.map((r) => r.trim()).filter(Boolean) } : {}),
          ...(cleanedScheduleRev !== undefined ? { schedule: cleanedScheduleRev } : {}),
          submittedById: org!.id,
          submittedByName: org!.contactName,
          submittedAt: nowIso,
          changedFields,
        };
        evt.approvalHistory = [
          {
            id: `hist-${Date.now()}`,
            reviewerId: org!.id,
            reviewerName: org!.contactName,
            reviewerRole: 'club_leader',
            decision: 'revision_submitted',
            changedFields,
            note: `Significant edits queued for Campus Official review (${changedFields.join(', ')}).`,
            createdAt: nowIso,
          },
          ...(evt.approvalHistory || []),
        ];
        db.auditLog.unshift({
          id: `aud-${Date.now()}`,
          actor: `${org!.contactName} (${org!.clubName})`,
          action: 'QUEUED_MATERIAL_EVENT_REVISION',
          target: `${evt.title} (${changedFields.join(', ')})`,
          createdAt: nowIso,
        });
        saveDb(db);
        const revNotice = await notifyCollegeOfficialsOfSubmission({
          event: evt,
          clubName: org!.clubName,
          submitterName: org!.contactName,
          isRevision: true,
        });
        broadcastNotificationsAndRefresh({
          notifications: revNotice.notifications,
          refreshOfficialsCollegeId: evt.collegeId,
          extraOfficialUserIds: revNotice.officialUserIds,
        });
        const { student: callerStu } = getStudentForRequest(db, req);
        return res.json({
          event: evt,
          revisionQueued: true,
          auditLog: db.auditLog,
          notifications: loadDb().notifications.filter(
            (n) => n.userId === callerStu.id || n.eventId === 'system'
          ),
        });
      }
    }

    if (action === 'cancel') {
      evt.status = 'cancelled';
      evt.regStatus = 'closed';
      evt.changeNotice = `Event cancelled by ${org?.contactName || 'College Official'} — all registrants notified.`;
    } else {
      if (typeof title === 'string' && title.trim()) evt.title = title.trim();
      if (typeof venueName === 'string' && venueName.trim()) evt.venueName = venueName.trim();
      if (typeof formattedAddress === 'string') evt.formattedAddress = formattedAddress.trim() || undefined;
      if (typeof description === 'string') evt.description = description.trim();
      if (startDatetimeIst) evt.startAt = istInputToUtcIso(startDatetimeIst);
      if (endDatetimeIst) evt.endAt = istInputToUtcIso(endDatetimeIst);
      if (regDeadlineIst) evt.regDeadline = istInputToUtcIso(regDeadlineIst);
      if (typeof feeInr === 'number' && !Number.isNaN(feeInr) && feeInr >= 0) {
        evt.feeInr = Math.round(feeInr);
      }
      if (typeof capacity === 'number' && Number.isInteger(capacity) && capacity > 0) {
        evt.capacity = Math.max(evt.confirmedCount, capacity);
      }
      if (mode) evt.mode = mode;
      if (regStatus) evt.regStatus = regStatus;
      if (typeof regLink === 'string' && regLink.trim().startsWith('https://')) {
        evt.regLink = regLink.trim();
      }
      if (typeof posterUrl === 'string' && posterUrl.trim()) {
        evt.posterUrl = posterUrl.trim();
      }
      if (typeof googleFormUrl === 'string') {
        evt.googleFormUrl = googleFormUrl.trim() || undefined;
      }
      if (typeof whatsappGroupUrl === 'string') {
        evt.whatsappGroupUrl = whatsappGroupUrl.trim() || undefined;
      }
      if (typeof telegramGroupUrl === 'string') {
        evt.telegramGroupUrl = telegramGroupUrl.trim() || undefined;
      }
      if (paymentInfo !== undefined) {
        evt.paymentInfo = paymentInfo;
      }
      if (Array.isArray(rules)) {
        evt.rules = rules.map((r) => r.trim()).filter(Boolean);
      }
      if (typeof teamSize === 'string') {
        evt.teamSize = teamSize.trim() || undefined;
      }
      if (Array.isArray(prizesAndPerks)) {
        evt.prizesAndPerks = prizesAndPerks.map((p) => p.trim()).filter(Boolean);
      }
      if (Array.isArray(prerequisites)) {
        evt.prerequisites = prerequisites.map((p) => p.trim()).filter(Boolean);
      }
      if (schedule !== undefined) {
        evt.schedule = sanitizeEventSchedule(schedule);
      }
      if (coordinatorContact !== undefined) {
        evt.coordinatorContact = coordinatorContact;
      }
      if (typeof promoVideoUrl === 'string') {
        const trimmedVideo = promoVideoUrl.trim();
        if (trimmedVideo && !isValidPromoVideoUrl(trimmedVideo)) {
          return res.status(400).json({ error: 'Promo reel URL must be an uploaded reel or an https:// video URL.' });
        }
        evt.promoVideoUrl = trimmedVideo || undefined;
      }
      if (typeof promoVideoCaption === 'string') {
        evt.promoVideoCaption = promoVideoCaption.trim() || undefined;
      }
      if (submitForReview && isScopedClubLeader && (evt.status === 'draft' || evt.status === 'changes_requested')) {
        evt.status = 'pending_review';
        evt.submissionFeedback = undefined;
      }
      if (evt.status === 'published') {
        evt.changeNotice = `Details updated by ${org?.contactName || 'Official'} on ${formatIstDateTime(nowIso)} IST.`;
      }
    }

    db.auditLog.unshift({
      id: `aud-${Date.now()}`,
      actor: org ? `${org.contactName} (${org.clubName})` : 'College Official',
      action: action === 'cancel' ? 'CANCELLED_EVENT' : 'UPDATED_EVENT_DETAILS',
      target: evt.title,
      createdAt: nowIso,
    });
    saveDb(db);

    const hoursToStart = (new Date(evt.startAt).getTime() - Date.now()) / (1000 * 60 * 60);
    const { student: callerStu } = getStudentForRequest(db, req);
    let createdNotifs: NotificationItem[] = [];
    if (evt.status === 'published' || evt.status === 'cancelled') {
      createdNotifs = await triggerEventChangeNotifications({
        event: evt,
        title: action === 'cancel' ? `Cancelled: ${evt.title}` : `Updated: ${evt.title}`,
        customMessage: `${evt.changeNotice}\nEvent: ${evt.title}\nWhen: ${formatIstDateTime(evt.startAt)} IST\nVenue: ${evt.venueName}`,
        critical: hoursToStart <= 12 || action === 'cancel',
      });
      broadcastNotificationsAndRefresh({
        notifications: createdNotifs,
        refreshFeed: true,
      });
    } else if (evt.status === 'pending_review') {
      const subNotice = await notifyCollegeOfficialsOfSubmission({
        event: evt,
        clubName: org?.clubName || evt.clubName,
        submitterName: org?.contactName || evt.submittedByName || 'Club Leader',
        isRevision: false,
      });
      createdNotifs = subNotice.notifications;
      broadcastNotificationsAndRefresh({
        notifications: createdNotifs,
        refreshOfficialsCollegeId: evt.collegeId,
        extraOfficialUserIds: subNotice.officialUserIds,
      });
    }

    const callerNotif = createdNotifs.find((n) => n.userId === callerStu.id) || createdNotifs[0] || null;
    res.json({
      event: evt,
      notification: callerNotif,
      createdNotifications: createdNotifs,
      notifications: loadDb().notifications.filter(
        (n) => n.userId === callerStu.id || n.eventId === 'system'
      ),
      auditLog: loadDb().auditLog,
    });
  });

  app.post('/api/officials/submissions/:id/review', async (req: AuthenticatedRequest, res) => {
    const db = loadDb();
    const evt = db.events.find((e) => e.id === req.params.id);
    if (!evt) return res.status(404).json({ error: 'Submitted event not found.' });

    const { decision, feedback, organizerId } = (req.body || {}) as {
      decision: 'approve' | 'request_changes' | 'reject' | 'approve_revision' | 'reject_revision';
      feedback?: string;
      organizerId?: string;
    };

    const org = findApprovedOfficialForRequest(db, req, organizerId);

    if (
      !org ||
      org.status !== 'approved' ||
      org.memberRole !== 'college_official' ||
      org.collegeId !== evt.collegeId
    ) {
      return res.status(403).json({
        error: 'Only an approved Campus Official of this institution can approve or request changes on club submissions.',
      });
    }

    const reviewerName = org.contactName || 'Campus Official';
    const reviewerId = org.id;
    const nowIso = new Date().toISOString();

    const findSubmittingClubStudent = (): StudentProfile | undefined => {
      const clubOrg = db.organizers.find((o) => o.id === (evt.submittedById || evt.clubId));
      if (!clubOrg) return undefined;
      if (clubOrg.authUid && db.students[`uid:${clubOrg.authUid}`]) {
        return db.students[`uid:${clubOrg.authUid}`];
      }
      const cleanOrgEmail = clubOrg.email.trim().toLowerCase();
      return Object.values(db.students || {}).find(
        (s) => s.email && s.email.trim().toLowerCase() === cleanOrgEmail
      );
    };

    if (decision === 'approve_revision' || decision === 'reject_revision') {
      if (!evt.revisionPendingReview || !evt.pendingRevision) {
        return res.status(400).json({ error: 'No pending revision exists on this event.' });
      }
      if (decision === 'reject_revision' && !feedback?.trim()) {
        return res.status(400).json({ error: 'Please provide a clear reason when declining a live event revision.' });
      }
      const rev = evt.pendingRevision;
      if (decision === 'approve_revision') {
        if (rev.title) evt.title = rev.title;
        if (rev.venueName) evt.venueName = rev.venueName;
        if (rev.formattedAddress !== undefined) evt.formattedAddress = rev.formattedAddress;
        if (rev.description !== undefined) evt.description = rev.description;
        if (rev.startAt) evt.startAt = rev.startAt;
        if (rev.endAt) evt.endAt = rev.endAt;
        if (rev.regDeadline) evt.regDeadline = rev.regDeadline;
        if (typeof rev.feeInr === 'number') evt.feeInr = rev.feeInr;
        if (typeof rev.capacity === 'number') evt.capacity = rev.capacity;
        if (rev.mode) evt.mode = rev.mode;
        if (rev.posterUrl) evt.posterUrl = rev.posterUrl;
        if (rev.regLink) evt.regLink = rev.regLink;
        if (rev.teamSize !== undefined) evt.teamSize = rev.teamSize;
        if (rev.rules !== undefined) evt.rules = rev.rules;
        if (rev.schedule !== undefined) evt.schedule = rev.schedule;
        evt.changeNotice = `Updated details approved by ${reviewerName} on ${formatIstDateTime(nowIso)} IST.`;
        evt.approvalHistory = [
          {
            id: `hist-${Date.now()}`,
            reviewerId,
            reviewerName,
            reviewerRole: 'college_official',
            decision: 'revision_approved',
            changedFields: rev.changedFields,
            note: feedback?.trim() || `Approved material changes (${rev.changedFields.join(', ')}).`,
            createdAt: nowIso,
          },
          ...(evt.approvalHistory || []),
        ];
      } else {
        evt.approvalHistory = [
          {
            id: `hist-${Date.now()}`,
            reviewerId,
            reviewerName,
            reviewerRole: 'college_official',
            decision: 'revision_rejected',
            changedFields: rev.changedFields,
            note: feedback!.trim(),
            createdAt: nowIso,
          },
          ...(evt.approvalHistory || []),
        ];
      }
      evt.revisionPendingReview = false;
      evt.pendingRevision = undefined;
      saveDb(db);
      if (decision === 'approve_revision') {
        const revNotifs = await triggerEventChangeNotifications({
          event: evt,
          title: `Updated: ${evt.title}`,
          customMessage: `${evt.changeNotice}\nVenue: ${evt.venueName}`,
          critical: false,
        });
        broadcastNotificationsAndRefresh({
          notifications: revNotifs,
          refreshFeed: true,
          refreshOfficialsCollegeId: evt.collegeId,
        });
      } else {
        broadcastNotificationsAndRefresh({ refreshOfficialsCollegeId: evt.collegeId });
      }
      const { student: callerStu } = getStudentForRequest(db, req);
      return res.json({
        event: evt,
        notifications: loadDb().notifications.filter(
          (n) => n.userId === callerStu.id || n.eventId === 'system'
        ),
        auditLog: db.auditLog,
      });
    }

    if (decision === 'approve') {
      evt.status = 'published';
      evt.approvedById = reviewerId;
      evt.approvedByName = reviewerName;
      evt.submissionFeedback = feedback?.trim() || undefined;
      evt.sourceType = evt.sourceType || 'club_approved';
      evt.approvalHistory = [
        {
          id: `hist-${Date.now()}`,
          reviewerId,
          reviewerName,
          reviewerRole: 'college_official',
          decision: 'approved',
          note: feedback?.trim() || 'Approved & published to Campus Feed by Campus Official.',
          createdAt: nowIso,
        },
        ...(evt.approvalHistory || []),
      ];
      db.auditLog.unshift({
        id: `aud-${Date.now()}`,
        actor: reviewerName,
        action: 'APPROVED_CLUB_EVENT',
        target: evt.title,
        createdAt: nowIso,
      });
      saveDb(db);
      const createdNotifs = await triggerPublishNotifications(evt);
      const submitterStu = findSubmittingClubStudent();
      if (submitterStu) {
        const leaderNotif = await queueAndDispatchNotification({
          event: evt,
          kind: 'submission_approved',
          title: `Submission Approved · ${evt.title}`,
          customMessage: `${reviewerName} approved and published "${evt.title}" to Discover & My Campus.`,
          critical: true,
          targetStudent: submitterStu,
        });
        if (leaderNotif) createdNotifs.push(leaderNotif);
      }
      broadcastNotificationsAndRefresh({
        notifications: createdNotifs,
        refreshFeed: true,
        refreshOfficialsCollegeId: evt.collegeId,
      });
      const { student: callerStu } = getStudentForRequest(db, req);
      return res.json({
        event: evt,
        notification: createdNotifs.find((n) => n.userId === callerStu.id) || createdNotifs[0] || null,
        createdNotifications: createdNotifs,
        notifications: loadDb().notifications.filter(
          (n) => n.userId === callerStu.id || n.eventId === 'system'
        ),
        auditLog: db.auditLog,
      });
    }

    if ((decision === 'request_changes' || decision === 'reject') && !feedback?.trim()) {
      return res.status(400).json({
        error:
          decision === 'request_changes'
            ? 'Clear revision feedback is required when requesting changes from a Club Leader.'
            : 'A rejection reason must be recorded so the Club Leader can see why the submission was declined.',
      });
    }

    evt.status = decision === 'request_changes' ? 'changes_requested' : 'rejected';
    evt.submissionFeedback = feedback!.trim();
    evt.approvalHistory = [
      {
        id: `hist-${Date.now()}`,
        reviewerId,
        reviewerName,
        reviewerRole: 'college_official',
        decision: decision === 'request_changes' ? 'changes_requested' : 'rejected',
        note: evt.submissionFeedback,
        createdAt: nowIso,
      },
      ...(evt.approvalHistory || []),
    ];
    db.auditLog.unshift({
      id: `aud-${Date.now()}`,
      actor: reviewerName,
      action:
        decision === 'request_changes' ? 'REQUESTED_CLUB_EVENT_CHANGES' : 'REJECTED_CLUB_EVENT',
      target: evt.title,
      createdAt: nowIso,
    });
    saveDb(db);
    const submitterStu = findSubmittingClubStudent();
    const leaderNotifs: NotificationItem[] = [];
    if (submitterStu) {
      const ln = await queueAndDispatchNotification({
        event: evt,
        kind: decision === 'request_changes' ? 'submission_changes_requested' : 'submission_rejected',
        title:
          decision === 'request_changes'
            ? `Changes Requested · ${evt.title}`
            : `Submission Declined · ${evt.title}`,
        customMessage: `${reviewerName}: ${evt.submissionFeedback}`,
        critical: true,
        targetStudent: submitterStu,
      });
      if (ln) leaderNotifs.push(ln);
    }
    broadcastNotificationsAndRefresh({
      notifications: leaderNotifs,
      refreshOfficialsCollegeId: evt.collegeId,
    });
    res.json({ event: evt, auditLog: db.auditLog });
  });

  app.post('/api/officials/announcements', (req: AuthenticatedRequest, res) => {
    const db = loadDb();
    const { title, body, pinned, organizerId } = (req.body || {}) as {
      title?: string;
      body?: string;
      pinned?: boolean;
      organizerId?: string;
    };

    const org = findApprovedOfficialForRequest(db, req, organizerId);

    if (!org || org.status !== 'approved' || org.memberRole !== 'college_official') {
      return res.status(403).json({
        error: 'Only approved Campus Officials can publish campus-wide announcements.',
      });
    }
    if (!title?.trim() || !body?.trim()) {
      return res.status(400).json({ error: 'Announcement title and message are required.' });
    }

    const college = HYDERABAD_COLLEGES.find((c) => c.id === org.collegeId);
    const announcement: CampusAnnouncement = {
      id: `ann-${Date.now()}`,
      collegeId: org.collegeId,
      collegeShortName: college?.shortName || 'CAMPUS',
      authorId: org.id,
      authorName: org.contactName,
      authorDesignation: org.designation || org.clubName,
      title: title.trim().slice(0, 140),
      body: body.trim().slice(0, 600),
      pinned: pinned !== false,
      createdAt: new Date().toISOString(),
    };

    db.announcements = [announcement, ...(db.announcements || [])];
    db.auditLog.unshift({
      id: `aud-${Date.now()}`,
      actor: `${org.contactName} (${college?.shortName || org.collegeId})`,
      action: 'PUBLISHED_CAMPUS_ANNOUNCEMENT',
      target: announcement.title,
      createdAt: announcement.createdAt,
    });
    saveDb(db);
    res.json({ announcement, announcements: db.announcements, auditLog: db.auditLog });
  });

  app.delete('/api/officials/announcements/:id', (req: AuthenticatedRequest, res) => {
    const db = loadDb();
    const target = (db.announcements || []).find((a) => a.id === req.params.id);
    if (!target) return res.status(404).json({ error: 'Announcement not found.' });

    const org = findApprovedOfficialForRequest(db, req);
    if (!org || org.memberRole !== 'college_official' || org.collegeId !== target.collegeId) {
      return res.status(403).json({ error: 'Only a Campus Official of this college can remove announcements.' });
    }

    db.announcements = db.announcements.filter((a) => a.id !== target.id);
    saveDb(db);
    res.json({ announcements: db.announcements });
  });

  app.post('/api/events/:id/register', async (req, res) => {
    const db = loadDb();
    const evt = db.events.find((e) => e.id === req.params.id);
    if (!evt) return res.status(404).json({ error: 'Event not found.' });
    if (evt.status !== 'published' || evt.regStatus === 'closed') {
      return res.status(400).json({ error: 'Registrations are closed for this event.' });
    }

    const { key, student } = getStudentForRequest(db, req);
    const eligibility = evaluateEventEligibility(student, evt);
    if (!eligibility.eligibleToRegister) {
      return res.status(403).json({
        error: eligibility.ineligibilityReasons[0] || 'You do not meet the eligibility criteria for this event.',
        ineligibilityReasons: eligibility.ineligibilityReasons,
      });
    }
    const existing = db.registrations.find(
      (r) => r.eventId === evt.id && r.userId === student.id && r.status !== 'cancelled'
    );
    if (existing) {
      return res.status(409).json({ error: 'You are already registered or waitlisted for this event.' });
    }

    const body = (req.body || {}) as {
      userName?: string;
      collegeShortName?: string;
      rollNumber?: string;
      branch?: string;
      year?: string;
      participationType?: 'individual' | 'team';
      needsTeammates?: boolean;
      squadId?: string;
      teamName?: string;
      teamMembers?: string;
      pitchNote?: string;
      paymentMethod?: 'UPI' | 'College Portal' | 'Free Pass';
      paymentRef?: string;
      userPhone?: string;
      userEmail?: string;
      attendeePhotoUrl?: string;
      emergencyContact?: string;
      savePhotoToProfile?: boolean;
    };

    const applicantName = (body.userName || student.displayName || '').trim().slice(0, 120);
    if (!applicantName) {
      return res.status(400).json({ error: 'Applicant full name is required.' });
    }

    const selectedSquad = body.squadId
      ? db.squads.find((s) => s.id === body.squadId && s.memberIds.includes(student.id))
      : undefined;
    if (body.squadId && !selectedSquad) {
      return res.status(403).json({ error: 'You can only register using a squad you belong to.' });
    }

    const status: Registration['status'] =
      evt.confirmedCount < evt.capacity ? 'confirmed' : 'waitlisted';

    const regId = `reg-${Date.now()}`;
    const evtTag = evt.title
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .slice(0, 6)
      .padEnd(4, 'X');
    const randCode = Math.random().toString(36).slice(2, 8).toUpperCase();
    const passCode = `CP-${evtTag}-${randCode}`;
    const qrPayload = `CONNECTUS:V1:${evt.id}:${regId}:${passCode}`;

    const studentCollege =
      (body.collegeShortName || '').trim().slice(0, 80) ||
      resolveCollegeShortName(student);

    let paymentStatus: Registration['paymentStatus'] = 'free';
    let amountPaidInr = 0;
    let paymentMethod: Registration['paymentMethod'] = 'Free Pass';
    let paymentRef: string | undefined;

    if (evt.feeInr > 0) {
      if (status === 'waitlisted') {
        paymentStatus = 'pending_verification';
        amountPaidInr = 0;
        paymentMethod = body.paymentMethod === 'College Portal' ? 'College Portal' : 'UPI';
      } else {
        const cleanRef = (body.paymentRef || '').trim().slice(0, 64);
        paymentMethod = body.paymentMethod === 'College Portal' ? 'College Portal' : 'UPI';
        amountPaidInr = evt.feeInr;
        if (cleanRef.length >= 4) {
          paymentStatus = 'paid_verified';
          paymentRef = cleanRef;
        } else {
          paymentStatus = 'pending_verification';
        }
      }
    }

    const cleanRoll = (body.rollNumber || '').trim().slice(0, 48);
    const cleanBranch = (body.branch || student.branch || '').trim().slice(0, 64);
    const cleanYear = (body.year || student.year || '').trim().slice(0, 32);
    const derivedTeamName = (body.teamName || selectedSquad?.name || '').trim().slice(0, 80);
    const derivedMembers =
      (body.teamMembers || '').trim().slice(0, 240) ||
      (selectedSquad ? selectedSquad.members.map((m) => `${m.name} (${m.collegeShortName})`).join(', ').slice(0, 240) : '');
    const cleanPitchNote = (body.pitchNote || '').trim().slice(0, 400);
    const cleanEmergencyContact = (body.emergencyContact || '').trim().slice(0, 40);
    const uploadedPhoto = sanitizeAttendeePhoto(body.attendeePhotoUrl);
    const resolvedAttendeePhoto = uploadedPhoto || sanitizeAttendeePhoto(student.photoUrl);

    const reg: Registration = {
      id: regId,
      eventId: evt.id,
      userId: student.id,
      userName: applicantName,
      userEmail: (body.userEmail || student.email || '').trim().slice(0, 180) || undefined,
      userPhone: (body.userPhone || student.phoneNumber || '').trim().slice(0, 24) || undefined,
      collegeShortName: studentCollege,
      ...(cleanRoll ? { rollNumber: cleanRoll } : {}),
      ...(cleanBranch ? { branch: cleanBranch } : {}),
      ...(cleanYear ? { year: cleanYear } : {}),
      ...(body.participationType ? { participationType: body.participationType } : {}),
      ...(body.needsTeammates ? { needsTeammates: true } : {}),
      ...(selectedSquad ? { squadId: selectedSquad.id } : {}),
      passCode,
      qrPayload,
      paymentStatus,
      amountPaidInr,
      paymentMethod,
      ...(paymentRef ? { paymentRef } : {}),
      ...(derivedTeamName ? { teamName: derivedTeamName } : {}),
      ...(derivedMembers ? { teamMembers: derivedMembers } : {}),
      ...(cleanPitchNote ? { pitchNote: cleanPitchNote } : {}),
      ...(resolvedAttendeePhoto ? { attendeePhotoUrl: resolvedAttendeePhoto } : {}),
      ...(cleanEmergencyContact ? { emergencyContact: cleanEmergencyContact } : {}),
      status,
      createdAt: new Date().toISOString(),
    };
    db.registrations.push(reg);

    if (status === 'confirmed') {
      evt.confirmedCount += 1;
    } else {
      evt.waitlistCount += 1;
    }

    let createdOrUpdatedSnapshot: SquadRegistrationSnapshot | undefined;
    if (selectedSquad) {
      const snapId = `snap-${selectedSquad.id}-${evt.id}`;
      const existingSnap = db.registrationSnapshots.find((s) => s.id === snapId);
      const nowIso = new Date().toISOString();
      const nextSnap: SquadRegistrationSnapshot = {
        id: snapId,
        squadId: selectedSquad.id,
        squadName: selectedSquad.name,
        eventId: evt.id,
        eventTitle: evt.title,
        submittedByUserId: existingSnap?.submittedByUserId || student.id,
        submittedByName: existingSnap?.submittedByName || applicantName,
        primaryRegistrationId: existingSnap?.primaryRegistrationId || reg.id,
        members: buildMemberRegistrationStatuses(selectedSquad, db.registrations),
        status: existingSnap ? 'amended' : 'submitted',
        rosterHash: computeRosterHash(selectedSquad.memberIds),
        submittedAt: existingSnap?.submittedAt || nowIso,
        ...(existingSnap ? { amendedAt: nowIso } : {}),
      };
      reg.squadSnapshotId = snapId;
      if (existingSnap) {
        db.registrationSnapshots = db.registrationSnapshots.map((s) =>
          s.id === snapId ? nextSnap : s
        );
      } else {
        db.registrationSnapshots.unshift(nextSnap);
      }
      createdOrUpdatedSnapshot = nextSnap;
    }

    // Refresh member registration statuses for any other snapshots containing this student for this event
    const touchedOtherSnapshots: { snap: SquadRegistrationSnapshot; memberIds: string[] }[] = [];
    for (const snap of db.registrationSnapshots) {
      if (snap.eventId !== evt.id || snap.id === createdOrUpdatedSnapshot?.id) continue;
      const sq = db.squads.find((s) => s.id === snap.squadId);
      if (sq && sq.memberIds.includes(student.id)) {
        snap.members = buildMemberRegistrationStatuses(sq, db.registrations);
        touchedOtherSnapshots.push({ snap, memberIds: sq.memberIds });
      }
    }

    // Persist contact & academic identity entered during registration back to student's saved profile
    const cleanSubmittedPhone = (body.userPhone || '').trim().slice(0, 24);
    const cleanSubmittedEmail = (body.userEmail || '').trim().slice(0, 180);
    if (
      applicantName &&
      applicantName !== 'Guest Student' &&
      applicantName !== 'Student' &&
      (!student.displayName ||
        student.displayName === 'Guest Student' ||
        student.displayName === 'Student')
    ) {
      student.displayName = applicantName;
    }
    if (cleanSubmittedPhone) {
      student.phoneNumber = cleanSubmittedPhone;
    }
    if (cleanSubmittedEmail && !student.email) {
      student.email = cleanSubmittedEmail;
    }
    if (cleanRoll) {
      student.rollNumber = cleanRoll;
    }
    if (cleanBranch) {
      student.branch = cleanBranch;
    }
    if (cleanYear) {
      student.year = cleanYear;
    }
    if (uploadedPhoto && (!student.photoUrl || body.savePhotoToProfile)) {
      student.photoUrl = uploadedPhoto;
    }
    db.students[key] = student;

    saveDb(db);

    if (createdOrUpdatedSnapshot && selectedSquad) {
      broadcastToUsers(selectedSquad.memberIds, {
        type: 'snapshot:upserted',
        snapshot: createdOrUpdatedSnapshot,
      });
    }
    for (const entry of touchedOtherSnapshots) {
      broadcastToUsers(entry.memberIds, {
        type: 'snapshot:upserted',
        snapshot: entry.snap,
      });
    }

    const lowSeatAlerts = await triggerPriorityLowSeatAlertsForEvent(evt);
    if (lowSeatAlerts.length > 0) {
      broadcastNotificationsAndRefresh({ notifications: lowSeatAlerts });
    }
    const updatedNotifications = loadDb().notifications.filter(
      (n) => n.userId === student.id || n.eventId === 'system'
    );

    res.json({
      registration: reg,
      event: evt,
      student,
      snapshot: createdOrUpdatedSnapshot,
      notifications: updatedNotifications,
    });
  });

  app.post('/api/events/:id/amend-squad-registration', (req: AuthenticatedRequest, res) => {
    const db = loadDb();
    const evt = db.events.find((e) => e.id === req.params.id);
    if (!evt) return res.status(404).json({ error: 'Event not found.' });

    const { student } = getStudentForRequest(db, req);
    const { squadId } = (req.body || {}) as { squadId?: string };
    const squad = db.squads.find((s) => s.id === squadId);
    if (!squad || !squad.memberIds.includes(student.id)) {
      return res.status(403).json({ error: 'Only a current squad member can amend the squad roster.' });
    }

    const snap = db.registrationSnapshots.find(
      (s) => s.squadId === squad.id && s.eventId === evt.id
    );
    if (!snap) {
      return res.status(404).json({ error: 'No existing squad registration found to amend.' });
    }

    snap.squadName = squad.name;
    snap.rosterHash = computeRosterHash(squad.memberIds);
    snap.members = buildMemberRegistrationStatuses(squad, db.registrations);
    snap.status = 'amended';
    snap.amendedAt = new Date().toISOString();
    saveDb(db);

    broadcastToUsers(squad.memberIds, {
      type: 'snapshot:upserted',
      snapshot: snap,
    });
    res.json({ snapshot: snap });
  });

  app.post('/api/events/:id/cancel-registration', async (req, res) => {
    const db = loadDb();
    const evt = db.events.find((e) => e.id === req.params.id);
    if (!evt) return res.status(404).json({ error: 'Event not found.' });

    const { student } = getStudentForRequest(db, req);
    const myReg = db.registrations.find(
      (r) => r.eventId === evt.id && r.userId === student.id && r.status !== 'cancelled'
    );
    if (!myReg) {
      return res.status(404).json({ error: 'No active registration found.' });
    }

    const wasConfirmed = myReg.status === 'confirmed';
    myReg.status = 'cancelled';

    let promotedName: string | null = null;
    if (wasConfirmed) {
      evt.confirmedCount = Math.max(0, evt.confirmedCount - 1);
      // Promote first waitlisted student atomically (Loophole #16)
      const nextWaitlisted = db.registrations
        .filter((r) => r.eventId === evt.id && r.status === 'waitlisted')
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];

      if (nextWaitlisted) {
        nextWaitlisted.status = 'confirmed';
        evt.confirmedCount += 1;
        evt.waitlistCount = Math.max(0, evt.waitlistCount - 1);
        promotedName = nextWaitlisted.userName;
        const waitlistedStudent =
          db.students?.[`uid:${nextWaitlisted.userId}`] ||
          db.students?.[nextWaitlisted.userId] ||
          Object.values(db.students || {}).find((s) => s.id === nextWaitlisted.userId);
        const promoNotif = await queueAndDispatchNotification({
          event: evt,
          kind: 'waitlist_promoted',
          title: `Seat Confirmed from Waitlist`,
          customMessage: `A seat opened up for ${evt.title}! ${nextWaitlisted.userName} was promoted from waitlist to Confirmed.\nWhen: ${formatIstDateTime(evt.startAt)} IST\nVenue: ${evt.venueName}`,
          critical: true,
          targetStudent: waitlistedStudent,
        });
        if (promoNotif) {
          broadcastNotificationsAndRefresh({
            notifications: [promoNotif],
            refreshFeed: true,
          });
        }
      }
    } else {
      evt.waitlistCount = Math.max(0, evt.waitlistCount - 1);
    }

    saveDb(db);
    res.json({
      event: evt,
      registration: myReg,
      promotedName,
      notifications: loadDb().notifications.filter(
        (n) => n.userId === student.id || n.eventId === 'system'
      ),
    });
  });

  app.post('/api/events/:id/pass-photo', (req, res) => {
    const db = loadDb();
    const evt = db.events.find((e) => e.id === req.params.id);
    if (!evt) return res.status(404).json({ error: 'Event not found.' });

    const { key, student } = getStudentForRequest(db, req);
    const { registrationId, photoUrl, saveToProfile } = (req.body || {}) as {
      registrationId?: string;
      photoUrl?: string | null;
      saveToProfile?: boolean;
    };

    const reg = db.registrations.find(
      (r) =>
        r.eventId === evt.id &&
        r.userId === student.id &&
        r.status !== 'cancelled' &&
        (!registrationId || r.id === registrationId)
    );
    if (!reg) {
      return res.status(404).json({ error: 'Active registration pass not found for this event.' });
    }

    if (photoUrl === '' || photoUrl === null) {
      delete reg.attendeePhotoUrl;
    } else {
      const cleaned = sanitizeAttendeePhoto(photoUrl);
      if (!cleaned) {
        return res.status(400).json({
          error: 'Photo must be a valid JPG, PNG, or WEBP image under 70 KB.',
        });
      }
      reg.attendeePhotoUrl = cleaned;
      if (!student.photoUrl || saveToProfile) {
        student.photoUrl = cleaned;
        db.students[key] = student;
      }
    }

    saveDb(db);
    res.json({ registration: reg, student });
  });

  app.post('/api/events/:id/checkin', (req, res) => {
    const db = loadDb();
    const evt = db.events.find((e) => e.id === req.params.id);
    if (!evt) return res.status(404).json({ error: 'Event not found.' });

    const {
      registrationId,
      passCode,
      qrPayload,
      status,
      verifyPayment,
      organizerId,
      allowReviewer,
    } = req.body as {
      registrationId?: string;
      passCode?: string;
      qrPayload?: string;
      status?: 'checked_in' | 'confirmed';
      verifyPayment?: boolean;
      organizerId?: string;
      allowReviewer?: boolean;
    };

    const org = findApprovedOfficialForRequest(db, req, organizerId);
    const authorized = Boolean(org && org.status === 'approved' && org.collegeId === evt.collegeId);
    if (!authorized) {
      return res.status(403).json({
        error: 'Only approved College Officials or Club Leaders of this college can check in attendees.',
      });
    }

    let lookupCode = (passCode || '').trim().toUpperCase();
    let lookupRegId = (registrationId || '').trim();

    if (qrPayload?.trim()) {
      const raw = qrPayload.trim();
      if (raw.startsWith('CONNECTUS:V1:') || raw.startsWith('CAMPUSPULSE:V1:')) {
        const parts = raw.split(':');
        const qrEventId = parts[2];
        const qrRegId = parts[3];
        const qrPassCode = parts[4];
        if (qrEventId && qrEventId !== evt.id) {
          const otherEvt = db.events.find((e) => e.id === qrEventId);
          return res.status(400).json({
            error: `This QR pass belongs to "${otherEvt?.title || qrEventId}", not "${evt.title}".`,
          });
        }
        if (qrRegId) lookupRegId = qrRegId;
        if (qrPassCode) lookupCode = qrPassCode.toUpperCase();
      } else {
        lookupCode = raw.toUpperCase();
      }
    }

    const reg = db.registrations.find(
      (r) =>
        r.eventId === evt.id &&
        r.status !== 'cancelled' &&
        ((lookupRegId && r.id === lookupRegId) ||
          (lookupCode && r.passCode.toUpperCase() === lookupCode) ||
          (qrPayload?.trim() && r.qrPayload === qrPayload.trim()))
    );

    if (!reg) {
      return res.status(404).json({
        error: 'Pass not found for this event. Check the Pass Code or scan a valid Connectus QR pass.',
      });
    }

    if (reg.status === 'waitlisted') {
      return res.status(400).json({
        error: `${reg.userName} is currently on the waitlist and cannot be checked in until promoted.`,
      });
    }

    if (verifyPayment) {
      reg.paymentStatus = 'paid_verified';
      reg.amountPaidInr = evt.feeInr;
      if (!reg.paymentMethod || reg.paymentMethod === 'Free Pass') {
        reg.paymentMethod = 'UPI';
      }
    }

    if (status === 'checked_in') {
      reg.status = 'checked_in';
      reg.checkedInAt = new Date().toISOString();
      reg.checkedInBy = org?.contactName || 'College Official';
    } else if (status === 'confirmed') {
      reg.status = 'confirmed';
      reg.checkedInAt = undefined;
      reg.checkedInBy = undefined;
    }

    db.auditLog.unshift({
      id: `aud-${Date.now()}`,
      actor: org ? `${org.contactName} (${org.clubName})` : 'College Official',
      action: verifyPayment && !status ? 'VERIFIED_PASS_PAYMENT' : status === 'checked_in' ? 'CHECKED_IN_ATTENDEE' : 'UPDATED_CHECKIN_STATUS',
      target: `${reg.userName} · ${reg.passCode} (${evt.title})`,
      createdAt: new Date().toISOString(),
    });

    saveDb(db);
    res.json({ registration: reg, registrations: db.registrations, event: evt });
  });

  app.post('/api/events/suggest', (req, res) => {
    const db = loadDb();
    const {
      title,
      collegeId,
      venueName,
      startDatetimeIst,
      endDatetimeIst,
      regDeadlineIst,
      regLink,
      description,
      type,
      mode,
      feeInr,
      capacity,
      teamSize,
      rules,
      prizesAndPerks,
      prerequisites,
      coordinatorContact,
      whatsappGroupUrl,
      telegramGroupUrl,
      schedule,
      lat,
      lng,
      placeId,
      formattedAddress,
    } = req.body as {
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
    };
    const college = HYDERABAD_COLLEGES.find((c) => c.id === collegeId) || HYDERABAD_COLLEGES[0];
    const area = HYDERABAD_AREAS.find((a) => a.id === college.areaId) || HYDERABAD_AREAS[0];
    const startAt = istInputToUtcIso(startDatetimeIst);
    const endAt = endDatetimeIst
      ? istInputToUtcIso(endDatetimeIst)
      : new Date(new Date(startAt).getTime() + 3 * 3600 * 1000).toISOString();
    const regDeadline = regDeadlineIst
      ? istInputToUtcIso(regDeadlineIst)
      : new Date(new Date(startAt).getTime() - 24 * 3600 * 1000).toISOString();

    const { student } = getStudentForRequest(db, req);
    const cleanSchedule = sanitizeEventSchedule(schedule);
    const suggested: CampusEvent = {
      id: `evt-sug-${Date.now()}`,
      clubId: 'student-suggestion',
      clubName: `${student.displayName} (Student Suggestion)`,
      collegeId: college.id,
      title: title.trim(),
      description: description.trim() || 'Student-submitted campus event awaiting admin review.',
      type: type || 'Workshop',
      startAt,
      endAt,
      venueName: venueName.trim(),
      areaId: area.id,
      placeId,
      formattedAddress,
      lat: typeof lat === 'number' ? lat : area.lat,
      lng: typeof lng === 'number' ? lng : area.lng,
      mode: mode || 'In-Person',
      audience: 'open_to_all',
      regStatus: 'open',
      branches: ['All'],
      years: ['All'],
      feeInr: typeof feeInr === 'number' && feeInr >= 0 ? Math.round(feeInr) : 0,
      capacity:
        typeof capacity === 'number' && Number.isInteger(capacity) && capacity > 0
          ? capacity
          : 100,
      confirmedCount: 0,
      waitlistCount: 0,
      regDeadline,
      regLink: regLink?.trim() || 'https://connectus.in/suggested',
      whatsappGroupUrl: whatsappGroupUrl?.trim() || undefined,
      telegramGroupUrl: telegramGroupUrl?.trim() || undefined,
      teamSize: teamSize?.trim() || undefined,
      rules: Array.isArray(rules) ? rules.map((r) => r.trim()).filter(Boolean) : undefined,
      prizesAndPerks: Array.isArray(prizesAndPerks)
        ? prizesAndPerks.map((p) => p.trim()).filter(Boolean)
        : undefined,
      prerequisites: Array.isArray(prerequisites)
        ? prerequisites.map((p) => p.trim()).filter(Boolean)
        : undefined,
      schedule: cleanSchedule,
      coordinatorContact:
        coordinatorContact && coordinatorContact.name?.trim()
          ? coordinatorContact
          : undefined,
      posterUrl: '/src/assets/images/poster_design_summit_1795081969848.jpg',
      source: 'student_suggested',
      status: 'pending_review',
      createdAt: new Date().toISOString(),
    };
    db.events.unshift(suggested);
    saveDb(db);
    res.json({ event: suggested, pendingSuggestions: db.events.filter((e) => e.status === 'pending_review') });
  });

  app.post('/api/events/:id/report', (req, res) => {
    const db = loadDb();
    const evt = db.events.find((e) => e.id === req.params.id);
    if (!evt) return res.status(404).json({ error: 'Event not found.' });
    const { student } = getStudentForRequest(db, req);
    const { reason } = req.body as { reason: string };
    db.reports.unshift({
      id: `rep-${Date.now()}`,
      eventId: evt.id,
      eventTitle: evt.title,
      reporterName: student.displayName,
      reason: reason.trim() || 'Suspicious or inaccurate event details.',
      status: 'open',
      createdAt: new Date().toISOString(),
    });
    saveDb(db);
    res.json({ reports: db.reports });
  });

  app.post('/api/organizer/signin', (req, res) => {
    const db = loadDb();
    const {
      clubName,
      contactName,
      designation,
      email,
      facultyEmail,
      collegeId,
      proofNote,
      organizationName,
      organizationWebsite,
      organizationCategory,
      authUid,
    } = req.body as {
      clubName: string;
      contactName: string;
      designation?: string;
      email: string;
      facultyEmail?: string;
      collegeId: string;
      proofNote: string;
      organizationName?: string;
      organizationWebsite?: string;
      organizationCategory?: string;
      authUid?: string;
    };
    const college = HYDERABAD_COLLEGES.find((c) => c.id === collegeId);
    const domain = (email.split('@')[1] || '').toLowerCase();
    const domainMatched = Boolean(college && domain === college.emailDomain.toLowerCase());

    // Self-registration creates an External Organizer application reviewed by Campus Officials.
    const verifiedAuthUid = (req as AuthenticatedRequest).verifiedAuth?.uid;
    const newOrg: OrganizerAccount = {
      id: `org-ext-${Date.now()}`,
      clubName: (organizationName?.trim() || clubName).trim(),
      contactName: contactName.trim(),
      designation: designation || 'External Event Organizer',
      email: email.trim(),
      facultyEmail: facultyEmail?.trim() || undefined,
      collegeId: collegeId || 'col-iiith',
      domainMatched,
      proofNote:
        proofNote.trim() ||
        'External organizer verification submitted for Campus Official review.',
      status: 'pending',
      memberRole: 'external_organizer',
      accountType: 'external_organizer',
      organizationName: (organizationName?.trim() || clubName).trim(),
      organizationWebsite: organizationWebsite?.trim() || undefined,
      organizationCategory: organizationCategory?.trim() || 'Student Opportunity Partner',
      authUid: verifiedAuthUid || authUid,
      createdAt: new Date().toISOString(),
    };

    db.organizers.unshift(newOrg);
    saveDb(db);
    res.json({ organizers: db.organizers, submitted: newOrg });
  });

  app.post('/api/organizer/select', (req, res) => {
    const db = loadDb();
    const { organizerId } = req.body as { organizerId: string };
    const matchedOfficial = findApprovedOfficialForRequest(db, req, organizerId);
    if (!matchedOfficial) {
      return res.status(403).json({
        error: 'Only verified officials can switch official profiles.',
      });
    }
    db.activeOrganizerId = organizerId;
    saveDb(db);
    res.json({ activeOrganizerId: db.activeOrganizerId });
  });

  app.post('/api/officials/invites', (req, res) => {
    const db = loadDb();
    const { clubName, targetEmail, maxUses, singleUse, expiresInDays, organizerId } = req.body as {
      clubName: string;
      targetEmail?: string;
      maxUses?: number;
      singleUse?: boolean;
      expiresInDays?: number;
      organizerId?: string;
    };

    const org = findApprovedOfficialForRequest(db, req, organizerId);
    if (!org || org.status !== 'approved') {
      return res.status(403).json({
        error: 'Only approved Campus Officials can generate club leader invite links.',
      });
    }
    if (org.memberRole === 'club_leader' || org.memberRole === 'external_organizer') {
      return res.status(403).json({
        error: 'Only Campus Officials can invite Club Leaders for their institution.',
      });
    }
    if (!clubName?.trim()) {
      return res.status(400).json({ error: 'Club or society name is required for the invite.' });
    }

    const college = HYDERABAD_COLLEGES.find((c) => c.id === org.collegeId);
    const shortTag = (college?.shortName || 'CAMPUS')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .slice(0, 6);
    const randSuffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    const token = `inv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const code = `CP-${shortTag}-${randSuffix}`;

    const isSingleUse = singleUse !== false && (!maxUses || Number(maxUses) <= 1);
    const resolvedMaxUses = isSingleUse ? 1 : Math.min(25, Math.max(1, Number(maxUses) || 1));
    const daysValid = Math.min(90, Math.max(1, Number(expiresInDays) || 14));

    const invite: OfficialInvite = {
      token,
      code,
      collegeId: org.collegeId,
      clubName: clubName.trim().slice(0, 140),
      createdByOfficialId: org.id,
      createdByName: org.contactName,
      createdByEmail: org.email,
      ...(targetEmail?.trim() ? { targetEmail: targetEmail.trim().toLowerCase() } : {}),
      singleUse: isSingleUse,
      maxUses: resolvedMaxUses,
      usedCount: 0,
      status: 'active',
      acceptedByNames: [],
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + daysValid * 24 * 3600 * 1000).toISOString(),
    };

    db.officialInvites.unshift(invite);
    db.auditLog.unshift({
      id: `aud-${Date.now()}`,
      actor: `${org.contactName} (${college?.shortName || org.collegeId})`,
      action: 'CREATED_CLUB_INVITE',
      target: `${invite.clubName} · ${invite.code} (${isSingleUse ? 'single-use' : `${resolvedMaxUses} uses`})`,
      createdAt: new Date().toISOString(),
    });
    saveDb(db);
    res.json({
      invite,
      officialInvites: db.officialInvites,
      auditLog: db.auditLog,
    });
  });

  app.post('/api/officials/invites/:token/revoke', (req, res) => {
    const db = loadDb();
    const invite = db.officialInvites.find((i) => i.token === req.params.token);
    if (!invite) {
      return res.status(404).json({ error: 'Invite not found.' });
    }
    const official = findApprovedOfficialForRequest(db, req);
    if (!official || official.memberRole !== 'college_official' || official.collegeId !== invite.collegeId) {
      return res.status(403).json({
        error: 'Only approved Campus Officials of this college can revoke invite links.',
      });
    }
    invite.status = 'revoked';
    invite.revokedAt = new Date().toISOString();
    db.auditLog.unshift({
      id: `aud-${Date.now()}`,
      actor: official?.contactName || 'Campus Official',
      action: 'REVOKED_CLUB_INVITE',
      target: `${invite.clubName} (${invite.code})`,
      createdAt: new Date().toISOString(),
    });
    saveDb(db);
    res.json({
      officialInvites: db.officialInvites,
      auditLog: db.auditLog,
    });
  });

  app.get('/api/officials/invites/:tokenOrCode', (req, res) => {
    const db = loadDb();
    const key = req.params.tokenOrCode.trim().toLowerCase();
    const invite = db.officialInvites.find(
      (i) => i.token.toLowerCase() === key || i.code.toLowerCase() === key
    );
    if (!invite) {
      return res.status(404).json({ error: 'Invite link or code was not found.' });
    }
    const college = HYDERABAD_COLLEGES.find((c) => c.id === invite.collegeId) || null;
    res.json({ invite, college });
  });

  app.post('/api/officials/invites/:tokenOrCode/accept', (req: AuthenticatedRequest, res) => {
    const db = loadDb();
    const key = req.params.tokenOrCode.trim().toLowerCase();
    const invite = db.officialInvites.find(
      (i) => i.token.toLowerCase() === key || i.code.toLowerCase() === key
    );
    if (!invite) {
      return res.status(404).json({ error: 'Invite link or code was not found.' });
    }
    if (invite.status !== 'active') {
      return res.status(400).json({
        error:
          invite.status === 'revoked'
            ? 'This invite link has been revoked by the Campus Official.'
            : 'This single-use invite link has already been redeemed.',
      });
    }
    if (new Date(invite.expiresAt).getTime() <= Date.now()) {
      return res.status(400).json({ error: 'This invite link has expired.' });
    }
    if (invite.usedCount >= invite.maxUses) {
      invite.status = 'used';
      saveDb(db);
      return res.status(400).json({ error: 'This invite link has reached its maximum uses.' });
    }

    const { contactName, email, clubName } = req.body as {
      contactName: string;
      email: string;
      clubName?: string;
    };

    if (!contactName?.trim() || !email?.trim()) {
      return res.status(400).json({ error: 'Your full name and email are required to join.' });
    }
    if (
      invite.targetEmail &&
      email.trim().toLowerCase() !== invite.targetEmail.trim().toLowerCase()
    ) {
      return res.status(403).json({
        error: `This invite link is locked to ${invite.targetEmail}. Please sign in or enter that email.`,
      });
    }

    const college = HYDERABAD_COLLEGES.find((c) => c.id === invite.collegeId);
    const domain = (email.split('@')[1] || '').toLowerCase();
    const domainMatched = Boolean(college && domain === college.emailDomain.toLowerCase());

    const newMember: OrganizerAccount = {
      id: `org-cl-${Date.now()}`,
      clubName: (clubName?.trim() || invite.clubName).slice(0, 140),
      contactName: contactName.trim().slice(0, 120),
      designation: 'Invited Club Leader',
      email: email.trim().slice(0, 180),
      collegeId: invite.collegeId,
      domainMatched,
      proofNote: `Joined via invite ${invite.code} from ${invite.createdByName}`,
      status: 'approved',
      memberRole: 'club_leader',
      accountType: 'club_leader',
      invitedByOfficialId: invite.createdByOfficialId,
      invitedByName: invite.createdByName,
      inviteToken: invite.token,
      authUid: req.verifiedAuth?.uid,
      createdAt: new Date().toISOString(),
    };

    const verifiedAuthEmail = req.verifiedAuth?.emailVerified
      ? req.verifiedAuth.email.trim().toLowerCase()
      : '';
    if (db.betaAccess?.enabled) {
      if (!verifiedAuthEmail) {
        return res.status(401).json({
          error: 'Sign in with a verified Google account to accept this invite.',
        });
      }
      if (!isEmailBetaAllowed(db, verifiedAuthEmail, true)) {
        if (db.betaAccess.allowedEmails.length >= db.betaAccess.maxSeats) {
          return res.status(403).json({
            error: `All ${db.betaAccess.maxSeats} private testing seats are currently occupied. Ask a Campus Official to free a seat.`,
          });
        }
        db.betaAccess.allowedEmails.push(verifiedAuthEmail);
      }
    }

    invite.usedCount += 1;
    invite.acceptedByNames.push(newMember.contactName);
    if (invite.usedCount >= invite.maxUses) {
      invite.status = 'used';
    }

    db.organizers.unshift(newMember);
    db.activeOrganizerId = newMember.id;
    db.auditLog.unshift({
      id: `aud-${Date.now()}`,
      actor: newMember.contactName,
      action: 'ACCEPTED_CLUB_INVITE',
      target: `${newMember.clubName} (${college?.shortName || invite.collegeId}) invited by ${invite.createdByName}`,
      createdAt: new Date().toISOString(),
    });
    saveDb(db);
    broadcastNotificationsAndRefresh({ refreshOfficialsCollegeId: invite.collegeId });

    res.json({
      organizer: newMember,
      organizers: db.organizers,
      activeOrganizerId: db.activeOrganizerId,
      officialInvites: db.officialInvites,
      auditLog: db.auditLog,
    });
  });

  app.post('/api/officials/members/:id/revoke', (req, res) => {
    const db = loadDb();
    const target = db.organizers.find((o) => o.id === req.params.id);
    if (!target) {
      return res.status(404).json({ error: 'Official team member not found.' });
    }
    const official = findApprovedOfficialForRequest(db, req);
    if (!official || official.memberRole !== 'college_official' || official.collegeId !== target.collegeId) {
      return res.status(403).json({
        error: 'Only approved Campus Officials of this college can revoke team members.',
      });
    }
    target.status = 'rejected';
    if (db.activeOrganizerId === target.id) {
      const fallback =
        db.organizers.find(
          (o) => o.id !== target.id && o.collegeId === target.collegeId && o.status === 'approved'
        ) || db.organizers.find((o) => o.id !== target.id && o.status === 'approved');
      if (fallback) {
        db.activeOrganizerId = fallback.id;
      }
    }
    db.auditLog.unshift({
      id: `aud-${Date.now()}`,
      actor: official.contactName || 'Campus Official',
      action: 'REVOKED_OFFICIAL_MEMBER',
      target: `${target.contactName} (${target.clubName})`,
      createdAt: new Date().toISOString(),
    });
    saveDb(db);
    res.json({
      organizers: db.organizers,
      activeOrganizerId: db.activeOrganizerId,
      auditLog: db.auditLog,
    });
  });

  app.post('/api/officials/members/:id/replace', (req: AuthenticatedRequest, res) => {
    const db = loadDb();
    const target = db.organizers.find((o) => o.id === req.params.id);
    if (!target) {
      return res.status(404).json({ error: 'Club Leader record not found.' });
    }
    const official = findApprovedOfficialForRequest(db, req);
    if (!official || official.memberRole !== 'college_official' || official.collegeId !== target.collegeId) {
      return res.status(403).json({
        error: 'Only approved Campus Officials of this college can replace a Club Leader.',
      });
    }
    if (target.memberRole !== 'club_leader') {
      return res.status(400).json({ error: 'Only Club Leader assignments can be replaced here.' });
    }

    const { newLeaderEmail, clubName } = (req.body || {}) as {
      newLeaderEmail?: string;
      clubName?: string;
    };

    target.status = 'rejected';
    const college = HYDERABAD_COLLEGES.find((c) => c.id === official.collegeId);
    const shortTag = (college?.shortName || 'CAMPUS')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .slice(0, 6);
    const randSuffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    const token = `inv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const code = `CP-${shortTag}-${randSuffix}`;

    const replacementInvite: OfficialInvite = {
      token,
      code,
      collegeId: official.collegeId,
      clubName: (clubName?.trim() || target.clubName).slice(0, 140),
      createdByOfficialId: official.id,
      createdByName: official.contactName,
      createdByEmail: official.email,
      ...(newLeaderEmail?.trim() ? { targetEmail: newLeaderEmail.trim().toLowerCase() } : {}),
      singleUse: true,
      maxUses: 1,
      usedCount: 0,
      status: 'active',
      acceptedByNames: [],
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString(),
    };

    db.officialInvites.unshift(replacementInvite);
    db.auditLog.unshift({
      id: `aud-${Date.now()}`,
      actor: official.contactName,
      action: 'REPLACED_CLUB_LEADER',
      target: `${target.clubName}: revoked ${target.contactName}, issued invite ${code}`,
      createdAt: new Date().toISOString(),
    });
    saveDb(db);
    broadcastNotificationsAndRefresh({ refreshOfficialsCollegeId: official.collegeId });
    res.json({
      organizers: db.organizers,
      officialInvites: db.officialInvites,
      invite: replacementInvite,
      auditLog: db.auditLog,
    });
  });

  // --- Event Feedback, Campus Surveys & Gemini AI Feedback Analysis ---
  app.get('/api/events/:id/feedback', (req: AuthenticatedRequest, res) => {
    const db = loadDb();
    const evt = db.events.find((e) => e.id === req.params.id);
    if (!evt) return res.status(404).json({ error: 'Event not found.' });
    const { student } = getStudentForRequest(db, req);
    const rawItems = (db.eventFeedback || []).filter((f) => f.eventId === evt.id);
    const sanitized = rawItems.map((fb) => sanitizeFeedbackForViewer(fb, student.id));
    const avg =
      rawItems.length > 0
        ? Number((rawItems.reduce((sum, f) => sum + f.rating, 0) / rawItems.length).toFixed(1))
        : null;
    res.json({
      feedback: sanitized,
      averageRating: avg,
      feedbackCount: rawItems.length,
    });
  });

  app.post('/api/events/:id/feedback', (req: AuthenticatedRequest, res) => {
    const db = loadDb();
    const evt = db.events.find((e) => e.id === req.params.id);
    if (!evt) return res.status(404).json({ error: 'Event not found.' });

    const { student } = getStudentForRequest(db, req);
    const hasParticipation = db.registrations.some(
      (r) => r.eventId === evt.id && r.userId === student.id && r.status !== 'cancelled'
    );
    if (!hasParticipation) {
      return res.status(403).json({
        error: 'Only students who registered or attended this event can submit event feedback.',
      });
    }

    const {
      rating,
      comment,
      suggestion,
      complaint,
      requestedCategory,
      isAnonymous,
    } = (req.body || {}) as {
      rating?: number;
      comment?: string;
      suggestion?: string;
      complaint?: string;
      requestedCategory?: string;
      isAnonymous?: boolean;
    };

    const cleanRating = Math.round(Number(rating));
    if (!Number.isInteger(cleanRating) || cleanRating < 1 || cleanRating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5 stars.' });
    }
    const cleanComment = (comment || '').trim().slice(0, 600);
    if (!cleanComment) {
      return res.status(400).json({ error: 'Please write a short review or feedback comment.' });
    }

    const nowIso = new Date().toISOString();
    const existing = (db.eventFeedback || []).find(
      (f) => f.eventId === evt.id && f.userId === student.id
    );
    let savedItem: EventFeedback;
    if (existing) {
      existing.rating = cleanRating;
      existing.comment = cleanComment;
      existing.suggestion = suggestion?.trim().slice(0, 400) || undefined;
      existing.complaint = complaint?.trim().slice(0, 400) || undefined;
      existing.requestedCategory = requestedCategory?.trim().slice(0, 60) || undefined;
      existing.isAnonymous = Boolean(isAnonymous);
      existing.authorName = student.displayName || 'Student';
      existing.updatedAt = nowIso;
      savedItem = existing;
    } else {
      savedItem = {
        id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        eventId: evt.id,
        eventTitle: evt.title,
        eventType: evt.type,
        collegeId: evt.collegeId,
        clubId: evt.clubId,
        clubName: evt.clubName,
        userId: student.id,
        authorName: student.displayName || 'Student',
        isAnonymous: Boolean(isAnonymous),
        rating: cleanRating,
        requestedCategory: requestedCategory?.trim().slice(0, 60) || undefined,
        comment: cleanComment,
        suggestion: suggestion?.trim().slice(0, 400) || undefined,
        complaint: complaint?.trim().slice(0, 400) || undefined,
        createdAt: nowIso,
      };
      db.eventFeedback = [savedItem, ...(db.eventFeedback || [])];
    }

    saveDb(db);
    broadcastNotificationsAndRefresh({ refreshOfficialsCollegeId: evt.collegeId });
    res.json({
      feedbackItem: sanitizeFeedbackForViewer(savedItem, student.id),
      feedback: db.eventFeedback
        .filter((f) => f.eventId === evt.id)
        .map((f) => sanitizeFeedbackForViewer(f, student.id)),
    });
  });

  app.post('/api/officials/surveys', (req: AuthenticatedRequest, res) => {
    const db = loadDb();
    const {
      title,
      description,
      questionPrompt,
      options,
      allowAnonymous,
      surveyId,
      status,
      organizerId,
    } = (req.body || {}) as {
      title?: string;
      description?: string;
      questionPrompt?: string;
      options?: string[];
      allowAnonymous?: boolean;
      surveyId?: string;
      status?: 'active' | 'closed';
      organizerId?: string;
    };

    const org = findApprovedOfficialForRequest(db, req, organizerId);
    if (!org || org.status !== 'approved' || org.memberRole !== 'college_official') {
      return res.status(403).json({
        error: 'Only approved Campus Officials can create or manage campus surveys.',
      });
    }

    if (surveyId && status) {
      const existing = (db.surveys || []).find(
        (s) => s.id === surveyId && s.collegeId === org.collegeId
      );
      if (!existing) return res.status(404).json({ error: 'Survey not found.' });
      existing.status = status;
      saveDb(db);
      return res.json({ survey: existing, surveys: db.surveys });
    }

    if (!title?.trim() || !questionPrompt?.trim()) {
      return res.status(400).json({ error: 'Survey title and question prompt are required.' });
    }

    const college = HYDERABAD_COLLEGES.find((c) => c.id === org.collegeId);
    const cleanOptions = Array.isArray(options)
      ? options.map((o) => o.trim()).filter(Boolean).slice(0, 8)
      : undefined;

    const survey: CampusSurvey = {
      id: `srv-${Date.now()}`,
      collegeId: org.collegeId,
      collegeShortName: college?.shortName || 'CAMPUS',
      createdById: org.id,
      createdByName: org.contactName,
      title: title.trim().slice(0, 140),
      description: (description || '').trim().slice(0, 400),
      questionPrompt: questionPrompt.trim().slice(0, 300),
      allowAnonymous: allowAnonymous !== false,
      ...(cleanOptions && cleanOptions.length > 0 ? { options: cleanOptions } : {}),
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    db.surveys = [survey, ...(db.surveys || [])];
    db.auditLog.unshift({
      id: `aud-${Date.now()}`,
      actor: org.contactName,
      action: 'CREATED_CAMPUS_SURVEY',
      target: survey.title,
      createdAt: survey.createdAt,
    });
    saveDb(db);
    broadcastNotificationsAndRefresh({ refreshOfficialsCollegeId: org.collegeId });
    res.json({ survey, surveys: db.surveys, auditLog: db.auditLog });
  });

  app.post('/api/surveys/:id/respond', (req: AuthenticatedRequest, res) => {
    const db = loadDb();
    const survey = (db.surveys || []).find((s) => s.id === req.params.id);
    if (!survey) return res.status(404).json({ error: 'Survey not found.' });
    if (survey.status !== 'active') {
      return res.status(400).json({ error: 'This campus survey is closed.' });
    }

    const { student } = getStudentForRequest(db, req);
    if (student.collegeId !== 'other' && student.collegeId !== survey.collegeId) {
      return res.status(403).json({ error: 'This survey is scoped to host campus students.' });
    }

    const { rating, selectedOption, responseText, isAnonymous } = (req.body || {}) as {
      rating?: number;
      selectedOption?: string;
      responseText?: string;
      isAnonymous?: boolean;
    };

    const cleanText = (responseText || '').trim().slice(0, 600);
    if (!cleanText && !selectedOption?.trim()) {
      return res.status(400).json({ error: 'Please select an option or share your survey response.' });
    }

    const anon = survey.allowAnonymous ? Boolean(isAnonymous) : false;
    const nowIso = new Date().toISOString();
    const existing = (db.surveyResponses || []).find(
      (r) => r.surveyId === survey.id && r.userId === student.id
    );
    let responseItem: SurveyResponse;
    if (existing) {
      existing.rating = typeof rating === 'number' && rating >= 1 && rating <= 5 ? Math.round(rating) : undefined;
      existing.selectedOption = selectedOption?.trim().slice(0, 120) || undefined;
      existing.responseText = cleanText;
      existing.isAnonymous = anon;
      existing.respondentName = student.displayName || 'Student';
      responseItem = existing;
    } else {
      responseItem = {
        id: `sresp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        surveyId: survey.id,
        collegeId: survey.collegeId,
        userId: student.id,
        respondentName: student.displayName || 'Student',
        isAnonymous: anon,
        ...(typeof rating === 'number' && rating >= 1 && rating <= 5 ? { rating: Math.round(rating) } : {}),
        ...(selectedOption?.trim() ? { selectedOption: selectedOption.trim().slice(0, 120) } : {}),
        responseText: cleanText,
        createdAt: nowIso,
      };
      db.surveyResponses = [responseItem, ...(db.surveyResponses || [])];
    }

    saveDb(db);
    res.json({ response: responseItem });
  });

  app.post('/api/officials/feedback/analyze', async (req: AuthenticatedRequest, res) => {
    try {
      const db = loadDb();
      const { eventId, organizerId } = (req.body || {}) as {
        eventId?: string;
        organizerId?: string;
      };
      const org = findApprovedOfficialForRequest(db, req, organizerId);
      if (!org || org.status !== 'approved' || org.memberRole !== 'college_official') {
        return res.status(403).json({
          error: 'Only approved Campus Officials can run campus-wide AI feedback analysis.',
        });
      }

      const college = HYDERABAD_COLLEGES.find((c) => c.id === org.collegeId);
      const evtMap = new Map(db.events.map((e) => [e.id, e]));
      const targetEvt = eventId ? evtMap.get(eventId) : undefined;
      if (eventId && (!targetEvt || targetEvt.collegeId !== org.collegeId)) {
        return res.status(403).json({ error: 'Selected event does not belong to your institution.' });
      }

      const scopedFeedback = (db.eventFeedback || [])
        .filter((f) => f.collegeId === org.collegeId && (!eventId || f.eventId === eventId))
        .map((f) => {
          const ev = evtMap.get(f.eventId);
          return {
            eventTitle: f.eventTitle || ev?.title || 'Campus Event',
            eventType: f.eventType || ev?.type || 'Workshop',
            rating: f.rating,
            requestedCategory: f.requestedCategory,
            comment: f.comment,
            suggestion: f.suggestion,
            complaint: f.complaint,
          };
        });

      const surveyMap = new Map((db.surveys || []).map((s) => [s.id, s]));
      const scopedSurveyResponses = eventId
        ? []
        : (db.surveyResponses || [])
            .filter((sr) => sr.collegeId === org.collegeId)
            .map((sr) => ({
              surveyTitle: surveyMap.get(sr.surveyId)?.title || 'Campus Survey',
              rating: sr.rating,
              selectedOption: sr.selectedOption,
              responseText: sr.responseText,
            }));

      const report = await analyzeCampusFeedbackWithGemini({
        scope: eventId ? 'event' : 'campus',
        scopeLabel: targetEvt
          ? `${targetEvt.title} (${college?.shortName || 'Campus'})`
          : `${college?.shortName || 'Campus'} Institution-Wide Feedback`,
        feedbackItems: scopedFeedback,
        surveyResponses: scopedSurveyResponses,
      });

      res.json({ report });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Feedback analysis failed.';
      res.status(500).json({ error: msg });
    }
  });

  app.post('/api/club/feedback/analyze', async (req: AuthenticatedRequest, res) => {
    try {
      const db = loadDb();
      const { eventId, organizerId } = (req.body || {}) as {
        eventId?: string;
        organizerId?: string;
      };
      const org = findApprovedOfficialForRequest(db, req, organizerId);
      if (!org || org.status !== 'approved') {
        return res.status(403).json({ error: 'Approved Club Leader or Official account required.' });
      }

      const evtMap = new Map(db.events.map((e) => [e.id, e]));
      if (eventId) {
        const targetEvt = evtMap.get(eventId);
        if (!targetEvt || targetEvt.clubId !== org.id) {
          return res.status(403).json({ error: 'You can only analyze feedback for your own club events.' });
        }
      }

      const scopedFeedback = (db.eventFeedback || [])
        .filter((f) => f.clubId === org.id && (!eventId || f.eventId === eventId))
        .map((f) => {
          const ev = evtMap.get(f.eventId);
          return {
            eventTitle: f.eventTitle || ev?.title || 'Club Event',
            eventType: f.eventType || ev?.type || 'Workshop',
            rating: f.rating,
            requestedCategory: f.requestedCategory,
            comment: f.comment,
            suggestion: f.suggestion,
            complaint: f.complaint,
          };
        });

      const report = await analyzeCampusFeedbackWithGemini({
        scope: eventId ? 'event' : 'club',
        scopeLabel: eventId
          ? `${evtMap.get(eventId)?.title || 'Club Event'} · ${org.clubName}`
          : `${org.clubName} Events`,
        feedbackItems: scopedFeedback,
        surveyResponses: [],
      });

      res.json({ report });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Club feedback analysis failed.';
      res.status(500).json({ error: msg });
    }
  });

  // --- Teams v2: Discover -> Connect -> Discuss -> Confirm -> Form Squad -> WhatsApp -> Register ---
  app.get('/api/teams/partners', (req, res) => {
    const db = loadDb();
    if (expireStaleTeamItems(db)) saveDb(db);
    const eventId = (req.query.eventId as string) || '';
    const eventType = (req.query.eventType as string) || '';
    const visiblePosts = db.partnerPosts.filter((p) => p.discoveryEnabled !== false);
    const sameEvent = eventId ? visiblePosts.filter((p) => p.eventId === eventId) : visiblePosts;
    const similarEvent = eventId
      ? visiblePosts.filter(
          (p) => p.eventId !== eventId && (eventType ? p.eventType === eventType : true)
        )
      : [];
    res.json({ sameEvent, similarEvent, partnerPosts: visiblePosts });
  });

  app.post('/api/teams/partners', (req: AuthenticatedRequest, res) => {
    const db = loadDb();
    const {
      eventId,
      roleSkill,
      lookingFor,
      teamSlotsNeeded,
      note,
      whatsappReady,
    } = req.body as {
      eventId: string;
      roleSkill: string;
      lookingFor: string;
      teamSlotsNeeded?: number;
      note: string;
      whatsappReady?: boolean;
    };

    const evt = db.events.find((e) => e.id === eventId);
    if (!evt) return res.status(404).json({ error: 'Event not found.' });
    if (!roleSkill?.trim() || !lookingFor?.trim()) {
      return res.status(400).json({ error: 'Your role/skills and who you are looking for are required.' });
    }

    const { student: stu } = getStudentForRequest(db, req);
    const stuCollege = resolveCollegeShortName(stu);
    const existing = db.partnerPosts.find((p) => p.eventId === evt.id && p.userId === stu.id);
    const post: PartnerPost = {
      id: existing?.id || `pp-${Date.now()}`,
      eventId: evt.id,
      eventTitle: evt.title,
      eventType: evt.type,
      userId: stu.id,
      userName: stu.displayName,
      collegeId: stu.collegeId,
      collegeShortName: stuCollege,
      branch: stu.branch,
      year: stu.year,
      skills: Array.isArray(stu.skills) ? stu.skills.slice(0, 12) : [],
      roleSkill: roleSkill.trim().slice(0, 80),
      lookingFor: lookingFor.trim().slice(0, 100),
      teamSlotsNeeded: Math.min(5, Math.max(1, Number(teamSlotsNeeded) || 1)),
      note: (note || '').trim().slice(0, 260),
      whatsappReady: Boolean(whatsappReady),
      discoveryEnabled: stu.teamDiscoveryEnabled !== false,
      createdAt: new Date().toISOString(),
    };

    if (existing) {
      db.partnerPosts = db.partnerPosts.map((p) => (p.id === post.id ? post : p));
    } else {
      db.partnerPosts.unshift(post);
    }
    saveDb(db);
    broadcastPublicTeamsEvent({ type: 'partner:created', post });
    res.json({ post, partnerPosts: db.partnerPosts.filter((p) => p.discoveryEnabled !== false || p.userId === stu.id) });
  });

  app.delete('/api/teams/partners/:id', (req: AuthenticatedRequest, res) => {
    const db = loadDb();
    const { student: stu } = getStudentForRequest(db, req);
    const target = db.partnerPosts.find((p) => p.id === req.params.id);
    if (!target) {
      return res.status(404).json({ error: 'Availability post not found.' });
    }
    if (target.userId !== stu.id) {
      return res.status(403).json({ error: 'You can only remove your own availability post.' });
    }
    db.partnerPosts = db.partnerPosts.filter((p) => p.id !== target.id);
    saveDb(db);
    broadcastPublicTeamsEvent({ type: 'partner:removed', id: target.id });
    res.json({ ok: true, partnerPosts: db.partnerPosts.filter((p) => p.discoveryEnabled !== false || p.userId === stu.id) });
  });

  app.post('/api/teams/connection-requests', (req: AuthenticatedRequest, res) => {
    const db = loadDb();
    if (expireStaleTeamItems(db)) saveDb(db);
    const { student: stu } = getStudentForRequest(db, req);
    const { toUserId, eventId, note } = (req.body || {}) as {
      toUserId?: string;
      eventId?: string;
      note?: string;
    };

    const targetId = (toUserId || '').trim();
    if (!targetId) return res.status(400).json({ error: 'Target student is required.' });
    if (targetId === stu.id) return res.status(400).json({ error: 'You cannot connect with yourself.' });

    const evt = db.events.find((e) => e.id === eventId) || db.events[0];
    if (!evt || evt.status === 'cancelled') {
      return res.status(404).json({ error: 'Event not found or cancelled.' });
    }

    const oneHourAgo = Date.now() - 3600 * 1000;
    const recentCount = db.connectionRequests.filter(
      (r) => r.fromUserId === stu.id && Date.parse(r.createdAt) >= oneHourAgo
    ).length;
    if (recentCount >= 12) {
      return res.status(429).json({ error: 'Hourly connection request limit reached (12/hr). Please wait before sending more.' });
    }

    const candidates = collectDiscoverableCandidates(db, stu.id);
    const targetCandidate = candidates.find((c) => c.userId === targetId);
    if (!targetCandidate || !targetCandidate.discoveryEnabled) {
      return res.status(403).json({ error: 'This student has paused teammate discovery or is unavailable.' });
    }

    const duplicatePending = db.connectionRequests.find(
      (r) =>
        r.eventId === evt.id &&
        r.status === 'pending' &&
        ((r.fromUserId === stu.id && r.toUserId === targetId) ||
          (r.fromUserId === targetId && r.toUserId === stu.id))
    );
    if (duplicatePending) {
      return res.status(409).json({ error: 'A pending connection request already exists for this event.' });
    }

    const existingConv = db.conversations.find(
      (c) =>
        c.eventId === evt.id &&
        c.status === 'active' &&
        c.participantIds.includes(stu.id) &&
        c.participantIds.includes(targetId)
    );
    if (existingConv) {
      return res.status(409).json({
        error: 'You already have an active conversation with this student for this event.',
        conversationId: existingConv.id,
      });
    }

    const nowIso = new Date().toISOString();
    const stuCollege = resolveCollegeShortName(stu);
    const requestItem: ConnectionRequest = {
      id: `cr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      eventId: evt.id,
      eventTitle: evt.title,
      eventType: evt.type,
      fromUserId: stu.id,
      fromName: stu.displayName,
      fromCollege: stuCollege,
      fromBranch: stu.branch,
      fromYear: stu.year,
      fromSkills: (stu.skills || []).slice(0, 8),
      toUserId: targetCandidate.userId,
      toName: targetCandidate.name,
      toCollege: targetCandidate.collegeShortName,
      note: (note || '').trim().slice(0, 280),
      status: 'pending',
      createdAt: nowIso,
      expiresAt: computeCallOrRequestExpiry(evt),
      updatedAt: nowIso,
    };

    const notif: NotificationItem = {
      id: `notif-cr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: targetCandidate.userId,
      eventId: evt.id,
      eventTitle: evt.title,
      kind: 'connection_request',
      channel: 'in_app',
      title: `Connection Request from ${stu.displayName}`,
      body: `${stu.displayName} (${stuCollege}) wants to connect for ${evt.title}${requestItem.note ? `: "${requestItem.note}"` : '.'}`,
      sendAfter: nowIso,
      sentAt: nowIso,
      status: 'sent',
      dedupeKey: `cr:${requestItem.id}`,
    };

    db.connectionRequests.unshift(requestItem);
    db.notifications.unshift(notif);
    saveDb(db);

    broadcastToUsers([stu.id, targetCandidate.userId], {
      type: 'connectionRequest:upserted',
      request: requestItem,
    });
    broadcastToUsers([targetCandidate.userId], {
      type: 'notification:created',
      notification: notif,
    });

    res.json({ request: requestItem });
  });

  app.post('/api/teams/connection-requests/:id/respond', (req: AuthenticatedRequest, res) => {
    const db = loadDb();
    if (expireStaleTeamItems(db)) saveDb(db);
    const { student: stu } = getStudentForRequest(db, req);
    const requestItem = db.connectionRequests.find((r) => r.id === req.params.id);
    if (!requestItem) return res.status(404).json({ error: 'Connection request not found.' });
    if (requestItem.toUserId !== stu.id) {
      return res.status(403).json({ error: 'Only the recipient can respond to this request.' });
    }
    if (requestItem.status !== 'pending') {
      return res.status(400).json({ error: `This request is already ${requestItem.status}.` });
    }

    const { action } = (req.body || {}) as { action?: 'start_conversation' | 'decline' };
    const nowIso = new Date().toISOString();

    if (action === 'decline') {
      requestItem.status = 'declined';
      requestItem.updatedAt = nowIso;
      saveDb(db);
      broadcastToUsers([requestItem.fromUserId, requestItem.toUserId], {
        type: 'connectionRequest:upserted',
        request: requestItem,
      });
      return res.json({ request: requestItem });
    }

    requestItem.status = 'accepted';
    requestItem.updatedAt = nowIso;

    let conv = db.conversations.find(
      (c) =>
        c.eventId === requestItem.eventId &&
        c.status === 'active' &&
        c.participantIds.includes(requestItem.fromUserId) &&
        c.participantIds.includes(requestItem.toUserId)
    );
    let sysMsg: TeamChatMessage | null = null;

    if (!conv) {
      const stuCollege = resolveCollegeShortName(stu);
      const fromPart: ChatParticipant = {
        userId: requestItem.fromUserId,
        name: requestItem.fromName,
        collegeShortName: requestItem.fromCollege,
        branch: requestItem.fromBranch,
        year: requestItem.fromYear,
        roleSkill: requestItem.fromSkills.slice(0, 3).join(', ') || requestItem.fromBranch,
      };
      const toPart: ChatParticipant = {
        userId: stu.id,
        name: stu.displayName,
        collegeShortName: stuCollege,
        branch: stu.branch,
        year: stu.year,
        roleSkill: (stu.skills || []).slice(0, 3).join(', ') || stu.branch,
      };

      const evt = db.events.find((e) => e.id === requestItem.eventId);
      conv = {
        id: `conv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        eventId: requestItem.eventId,
        eventTitle: requestItem.eventTitle,
        eventType: requestItem.eventType,
        sourceType: 'connection_request',
        sourceId: requestItem.id,
        participantIds: [requestItem.fromUserId, requestItem.toUserId],
        participants: [fromPart, toPart],
        confirmedByUserIds: [],
        status: 'active',
        createdAt: nowIso,
        updatedAt: nowIso,
        expiresAt: computeCallOrRequestExpiry(evt),
      };
      sysMsg = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        roomId: conv.id,
        roomScope: 'conversation',
        senderId: 'system',
        senderName: 'Connectus',
        kind: 'system',
        body: `${stu.displayName} started a 1-on-1 conversation with ${requestItem.fromName} for ${requestItem.eventTitle}. Discuss roles first, then mutually confirm when ready to form a squad.`,
        createdAt: nowIso,
      };
      db.conversations.unshift(conv);
      db.chatMessages.push(sysMsg);
    }

    requestItem.conversationId = conv.id;
    saveDb(db);

    broadcastToUsers(conv.participantIds, {
      type: 'connectionRequest:upserted',
      request: requestItem,
    });
    broadcastToUsers(conv.participantIds, {
      type: 'conversation:upserted',
      conversation: conv,
    });
    if (sysMsg) {
      broadcastToUsers(conv.participantIds, {
        type: 'message:created',
        message: sysMsg,
      });
    }

    res.json({ request: requestItem, conversation: conv });
  });

  app.post('/api/teams/calls/estimate', (req: AuthenticatedRequest, res) => {
    const db = loadDb();
    const { student: stu } = getStudentForRequest(db, req);
    const {
      preferredCollege,
      preferredYear,
      preferredSkills,
      rolesNeeded,
      preferredAreas,
      preferredLanguages,
      genderPreference,
      audienceMode,
    } = (req.body || {}) as {
      preferredCollege?: string;
      preferredYear?: string;
      preferredSkills?: string[];
      rolesNeeded?: string[];
      preferredAreas?: string[];
      preferredLanguages?: SupportedLanguage[];
      genderPreference?: CallGenderFilter;
      audienceMode?: 'active_only' | 'all_matching';
    };

    const matched = matchCandidatesForTeamUpCall(db, {
      creatorId: stu.id,
      preferredCollege,
      preferredYear,
      preferredSkills: Array.isArray(preferredSkills) ? preferredSkills : [],
      rolesNeeded: Array.isArray(rolesNeeded) ? rolesNeeded : [],
      preferredAreas: normalizeCallAreaIds(preferredAreas),
      preferredLanguages: normalizeCallLanguages(preferredLanguages),
      genderPreference: normalizeCallGenderFilter(genderPreference),
      audienceMode: audienceMode === 'active_only' ? 'active_only' : 'all_matching',
      activeUserIds: getActiveOnlineUserIds(),
    });

    if (matched.length < 3) {
      return res.json({ eligibleCount: 'fewer than 3', masked: true });
    }
    res.json({ eligibleCount: matched.length, masked: false });
  });

  app.post('/api/teams/calls', (req: AuthenticatedRequest, res) => {
    const db = loadDb();
    if (expireStaleTeamItems(db)) saveDb(db);
    const { student: stu } = getStudentForRequest(db, req);

    const {
      eventId,
      eventIds,
      teammatesNeeded,
      preferredCollege,
      preferredYear,
      preferredSkills,
      rolesNeeded,
      preferredAreas,
      preferredLanguages,
      genderPreference,
      audienceMode,
      note,
    } = (req.body || {}) as {
      eventId?: string;
      eventIds?: string[];
      teammatesNeeded?: number;
      preferredCollege?: string;
      preferredYear?: string;
      preferredSkills?: string[];
      rolesNeeded?: string[];
      preferredAreas?: string[];
      preferredLanguages?: SupportedLanguage[];
      genderPreference?: string;
      audienceMode?: 'active_only' | 'all_matching';
      note?: string;
    };

    const rawEventIds =
      Array.isArray(eventIds) && eventIds.length > 0
        ? eventIds
        : eventId
          ? [eventId]
          : [];
    const requestedEventIds = Array.from(
      new Set(rawEventIds.map((id) => String(id || '').trim()).filter(Boolean))
    );

    if (requestedEventIds.length < 1) {
      return res.status(400).json({ error: 'Select at least 1 event for this Team-up Call.' });
    }
    if (requestedEventIds.length > 3) {
      return res.status(400).json({ error: 'A Team-up Call can target at most 3 events.' });
    }

    const targetEvents: CampusEvent[] = [];
    for (const id of requestedEventIds) {
      const found = db.events.find((e) => e.id === id);
      if (!found || found.status === 'cancelled' || found.status !== 'published') {
        return res.status(404).json({
          error: 'One or more selected events were not found or are unavailable.',
        });
      }
      targetEvents.push(found);
    }
    const primaryEvt = targetEvents[0];

    const nowMs = Date.now();
    const oneHourAgo = nowMs - 3600 * 1000;
    const recentCalls = db.teamUpCalls.filter(
      (c) => c.creatorId === stu.id && Date.parse(c.createdAt) >= oneHourAgo
    );
    if (recentCalls.length >= 3) {
      return res.status(429).json({
        error: 'Rate limit: maximum 3 Team-up Calls per hour (counts per appeal).',
      });
    }

    const requestedKey = [...requestedEventIds].sort().join('|');
    const thirtyMinsAgo = nowMs - 30 * 60 * 1000;
    const dupCall = db.teamUpCalls.find((c) => {
      if (c.creatorId !== stu.id || c.status !== 'active') return false;
      if (Date.parse(c.createdAt) < thirtyMinsAgo) return false;
      const existingIds =
        Array.isArray(c.eventIds) && c.eventIds.length > 0
          ? c.eventIds
          : c.eventId
            ? [c.eventId]
            : [];
      return [...existingIds].sort().join('|') === requestedKey;
    });
    if (dupCall) {
      return res.status(409).json({
        error: 'You already published an active Team-up Call for this exact event selection recently.',
      });
    }

    const cleanSkills = Array.isArray(preferredSkills)
      ? Array.from(new Set(preferredSkills.map((s) => s.trim()).filter(Boolean))).slice(0, 10)
      : [];
    const cleanRoles = Array.isArray(rolesNeeded)
      ? Array.from(new Set(rolesNeeded.map((s) => s.trim()).filter(Boolean))).slice(0, 10)
      : [];
    const cleanAreas = normalizeCallAreaIds(preferredAreas);
    const cleanLanguages = normalizeCallLanguages(preferredLanguages);
    const cleanGenderPref = normalizeCallGenderFilter(genderPreference);
    const mode = audienceMode === 'active_only' ? 'active_only' : 'all_matching';

    const matched = matchCandidatesForTeamUpCall(db, {
      creatorId: stu.id,
      preferredCollege,
      preferredYear,
      preferredSkills: cleanSkills,
      rolesNeeded: cleanRoles,
      preferredAreas: cleanAreas,
      preferredLanguages: cleanLanguages,
      genderPreference: cleanGenderPref,
      audienceMode: mode,
      activeUserIds: getActiveOnlineUserIds(),
    });

    const nowIso = new Date(nowMs).toISOString();
    const stuCollege = resolveCollegeShortName(stu);
    const maxSlots = Math.max(
      1,
      ...targetEvents.map((e) => Math.max(1, parseEventMaxTeamSize(e.teamSize) - 1))
    );
    const eventRefs: TeamUpCallEventRef[] = targetEvents.map((e) => ({
      id: e.id,
      title: e.title,
      type: e.type,
      regDeadline: e.regDeadline,
    }));

    const call: TeamUpCall = {
      id: `call-${nowMs}-${Math.random().toString(36).slice(2, 6)}`,
      eventId: primaryEvt.id,
      eventTitle: primaryEvt.title,
      eventType: primaryEvt.type,
      eventIds: targetEvents.map((e) => e.id),
      events: eventRefs,
      creatorId: stu.id,
      creatorName: stu.displayName,
      creatorCollege: stuCollege,
      creatorBranch: stu.branch,
      creatorYear: stu.year,
      teammatesNeeded: Math.min(maxSlots, Math.max(1, Number(teammatesNeeded) || 1)),
      preferredCollege: (preferredCollege || 'Any').trim().slice(0, 80) || 'Any',
      preferredYear: (preferredYear || 'Any').trim().slice(0, 40) || 'Any',
      preferredSkills: cleanSkills,
      rolesNeeded: cleanRoles,
      preferredAreas: cleanAreas,
      preferredLanguages: cleanLanguages,
      genderPreference: cleanGenderPref,
      audienceMode: mode,
      note: (note || '').trim().slice(0, 280),
      eligibleCount: matched.length,
      recipientUserIds: matched.map((m) => m.userId),
      responses: [],
      status: 'active',
      createdAt: nowIso,
      expiresAt: computeCallOrRequestExpiry(targetEvents),
      updatedAt: nowIso,
    };

    db.teamUpCalls.unshift(call);

    const summaryEventTitle =
      targetEvents.length > 1
        ? `${primaryEvt.title} +${targetEvents.length - 1} more`
        : primaryEvt.title;
    const allEventTitles = targetEvents.map((e) => e.title).join(', ');

    const createdNotifs: NotificationItem[] = [];
    for (const cand of matched) {
      const notif: NotificationItem = {
        id: `notif-call-${nowMs}-${cand.userId.slice(0, 12)}-${Math.random().toString(36).slice(2, 5)}`,
        userId: cand.userId,
        eventId: primaryEvt.id,
        eventTitle: summaryEventTitle,
        kind: 'team_up_call',
        channel: 'in_app',
        title: `Team-up Call · ${summaryEventTitle}`,
        body: `${stu.displayName} from ${stuCollege} wants to team up for ${allEventTitles}. Review in Teams.`,
        sendAfter: nowIso,
        sentAt: nowIso,
        status: 'sent',
        dedupeKey: `tuc:${call.id}:${cand.userId}`,
      };
      db.notifications.unshift(notif);
      createdNotifs.push(notif);
    }

    saveDb(db);

    broadcastTeamUpCallUpserted(call, [stu.id, ...call.recipientUserIds]);
    for (const n of createdNotifs) {
      broadcastToUsers([n.userId], {
        type: 'notification:created',
        notification: n,
      });
    }

    const sanitizedCall = sanitizeTeamUpCallForViewer(call, stu.id);
    const notifiedCount =
      matched.length === 0 ? 0 : matched.length < 3 ? 'fewer than 3' : matched.length;
    res.json({ call: sanitizedCall, notifiedCount });
  });

  app.post('/api/teams/calls/:id/respond', (req: AuthenticatedRequest, res) => {
    const db = loadDb();
    if (expireStaleTeamItems(db)) saveDb(db);
    const { student: stu } = getStudentForRequest(db, req);
    const call = db.teamUpCalls.find((c) => c.id === req.params.id);
    if (!call) return res.status(404).json({ error: 'Team-up Call not found.' });
    if (call.creatorId === stu.id) {
      return res.status(400).json({ error: 'You cannot respond to your own Team-up Call.' });
    }
    if (!call.recipientUserIds.includes(stu.id)) {
      return res.status(403).json({ error: 'You are not in the recipient list for this Team-up Call.' });
    }
    if (call.status !== 'active') {
      return res.status(400).json({ error: `This Team-up Call is ${call.status}.` });
    }

    const { decision, note } = (req.body || {}) as {
      decision?: 'interested' | 'dismissed';
      note?: string;
    };
    const nextStatus = decision === 'dismissed' ? 'dismissed' : 'interested';
    const nowIso = new Date().toISOString();
    const stuCollege = resolveCollegeShortName(stu);
    const existing = call.responses.find((r) => r.userId === stu.id);

    if (existing) {
      existing.status = existing.status === 'invited' ? 'invited' : nextStatus;
      if (note?.trim()) existing.note = note.trim().slice(0, 200);
      existing.respondedAt = nowIso;
    } else {
      call.responses.unshift({
        userId: stu.id,
        name: stu.displayName,
        collegeShortName: stuCollege,
        branch: stu.branch,
        year: stu.year,
        skills: (stu.skills || []).slice(0, 8),
        ...(note?.trim() ? { note: note.trim().slice(0, 200) } : {}),
        status: nextStatus,
        respondedAt: nowIso,
      });
    }
    call.updatedAt = nowIso;

    let creatorNotif: NotificationItem | null = null;
    if (nextStatus === 'interested') {
      const eventSummary =
        (call.events?.length || 0) > 1
          ? `${call.eventTitle} (+${call.events.length - 1} more)`
          : call.eventTitle;
      creatorNotif = {
        id: `notif-call-resp-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        userId: call.creatorId,
        eventId: call.eventId,
        eventTitle: call.eventTitle,
        kind: 'team_up_call',
        channel: 'in_app',
        title: `${stu.displayName} is interested`,
        body: `${stu.displayName} (${stuCollege}) expressed interest in your Team-up Call for ${eventSummary}. Review & invite them to chat.`,
        sendAfter: nowIso,
        sentAt: nowIso,
        status: 'sent',
        dedupeKey: `tuc_resp:${call.id}:${stu.id}`,
      };
      db.notifications.unshift(creatorNotif);
    }

    saveDb(db);

    broadcastTeamUpCallUpserted(call, [call.creatorId, stu.id]);
    if (creatorNotif) {
      broadcastToUsers([call.creatorId], {
        type: 'notification:created',
        notification: creatorNotif,
      });
    }

    res.json({ call: sanitizeTeamUpCallForViewer(call, stu.id) });
  });

  app.post('/api/teams/calls/:id/invite', (req: AuthenticatedRequest, res) => {
    const db = loadDb();
    if (expireStaleTeamItems(db)) saveDb(db);
    const { student: stu } = getStudentForRequest(db, req);
    const call = db.teamUpCalls.find((c) => c.id === req.params.id);
    if (!call) return res.status(404).json({ error: 'Team-up Call not found.' });
    if (call.creatorId !== stu.id) {
      return res.status(403).json({ error: 'Only the creator of this Team-up Call can invite respondents to chat.' });
    }

    const { targetUserId, eventId } = (req.body || {}) as {
      targetUserId?: string;
      eventId?: string;
    };
    const resp = call.responses.find((r) => r.userId === targetUserId);
    if (!resp || resp.status === 'dismissed') {
      return res.status(404).json({ error: 'Interested respondent not found on this Team-up Call.' });
    }

    const allowedIds =
      Array.isArray(call.eventIds) && call.eventIds.length > 0
        ? call.eventIds
        : [call.eventId];
    let targetEventId = (eventId || '').trim();
    if (targetEventId) {
      if (!allowedIds.includes(targetEventId)) {
        return res.status(400).json({ error: 'Selected event does not belong to this Team-up Call.' });
      }
    } else {
      targetEventId =
        allowedIds.find((id) => {
          const e = db.events.find((ev) => ev.id === id);
          return e && e.status !== 'cancelled';
        }) || call.eventId;
    }

    const evt = db.events.find((e) => e.id === targetEventId);
    if (!evt || evt.status === 'cancelled') {
      return res.status(404).json({ error: 'Target event for this invitation is no longer active.' });
    }

    const nowIso = new Date().toISOString();
    resp.status = 'invited';
    call.updatedAt = nowIso;

    let conv = db.conversations.find(
      (c) =>
        c.eventId === evt.id &&
        c.status === 'active' &&
        c.participantIds.includes(stu.id) &&
        c.participantIds.includes(resp.userId)
    );
    let sysMsg: TeamChatMessage | null = null;

    if (!conv) {
      const stuCollege = resolveCollegeShortName(stu);
      conv = {
        id: `conv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        eventId: evt.id,
        eventTitle: evt.title,
        eventType: evt.type,
        sourceType: 'team_up_call',
        sourceId: call.id,
        participantIds: [stu.id, resp.userId],
        participants: [
          {
            userId: stu.id,
            name: stu.displayName,
            collegeShortName: stuCollege,
            branch: stu.branch,
            year: stu.year,
            roleSkill: (stu.skills || []).slice(0, 3).join(', ') || stu.branch,
          },
          {
            userId: resp.userId,
            name: resp.name,
            collegeShortName: resp.collegeShortName,
            branch: resp.branch,
            year: resp.year,
            roleSkill: resp.skills.slice(0, 3).join(', ') || resp.branch,
          },
        ],
        confirmedByUserIds: [],
        status: 'active',
        createdAt: nowIso,
        updatedAt: nowIso,
        expiresAt: computeCallOrRequestExpiry(evt),
      };
      sysMsg = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        roomId: conv.id,
        roomScope: 'conversation',
        senderId: 'system',
        senderName: 'Connectus',
        kind: 'system',
        body: `${stu.displayName} invited ${resp.name} from Team-up Call to discuss teaming up for ${evt.title}.`,
        createdAt: nowIso,
      };
      db.conversations.unshift(conv);
      db.chatMessages.push(sysMsg);
    }

    resp.conversationId = conv.id;
    saveDb(db);

    broadcastTeamUpCallUpserted(call, [stu.id, resp.userId]);
    broadcastToUsers(conv.participantIds, {
      type: 'conversation:upserted',
      conversation: conv,
    });
    if (sysMsg) {
      broadcastToUsers(conv.participantIds, {
        type: 'message:created',
        message: sysMsg,
      });
    }

    res.json({ call: sanitizeTeamUpCallForViewer(call, stu.id), conversation: conv });
  });

  app.post('/api/teams/calls/:id/close', (req: AuthenticatedRequest, res) => {
    const db = loadDb();
    const { student: stu } = getStudentForRequest(db, req);
    const call = db.teamUpCalls.find((c) => c.id === req.params.id);
    if (!call) return res.status(404).json({ error: 'Team-up Call not found.' });
    if (call.creatorId !== stu.id) {
      return res.status(403).json({ error: 'Only the creator can close this Team-up Call.' });
    }
    call.status = 'closed';
    call.updatedAt = new Date().toISOString();
    saveDb(db);
    broadcastTeamUpCallUpserted(call, [call.creatorId, ...call.recipientUserIds]);
    res.json({ call: sanitizeTeamUpCallForViewer(call, stu.id) });
  });

  app.post('/api/teams/conversations/:id/messages', (req: AuthenticatedRequest, res) => {
    const db = loadDb();
    const { student: stu } = getStudentForRequest(db, req);
    const conv = db.conversations.find((c) => c.id === req.params.id);
    if (!conv) return res.status(404).json({ error: 'Conversation not found.' });
    if (!conv.participantIds.includes(stu.id)) {
      return res.status(403).json({ error: 'You are not a participant in this conversation.' });
    }
    if (conv.status === 'archived') {
      return res.status(400).json({ error: 'This conversation has been archived.' });
    }

    const { body } = (req.body || {}) as { body?: string };
    if (!body?.trim()) {
      return res.status(400).json({ error: 'Message text cannot be empty.' });
    }

    const nowIso = new Date().toISOString();
    const message: TeamChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      roomId: conv.id,
      roomScope: 'conversation',
      senderId: stu.id,
      senderName: stu.displayName,
      kind: 'text',
      body: body.trim().slice(0, 1000),
      createdAt: nowIso,
    };
    conv.updatedAt = nowIso;
    db.chatMessages.push(message);
    saveDb(db);

    broadcastToUsers(conv.participantIds, {
      type: 'conversation:upserted',
      conversation: conv,
    });
    broadcastToUsers(conv.participantIds, {
      type: 'message:created',
      message,
    });

    res.json({ message, conversation: conv });
  });

  app.post('/api/teams/conversations/:id/confirm-squad', (req: AuthenticatedRequest, res) => {
    const db = loadDb();
    const { student: stu } = getStudentForRequest(db, req);
    const conv = db.conversations.find((c) => c.id === req.params.id);
    if (!conv) return res.status(404).json({ error: 'Conversation not found.' });
    if (!conv.participantIds.includes(stu.id)) {
      return res.status(403).json({ error: 'You are not a participant in this conversation.' });
    }
    if (conv.status === 'confirmed_to_squad' && conv.createdSquadId) {
      const existingSquad = db.squads.find((s) => s.id === conv.createdSquadId);
      return res.json({
        conversation: conv,
        squad: existingSquad ? sanitizeSquadForMember(existingSquad, stu.id) : null,
      });
    }
    if (conv.status === 'archived') {
      return res.status(400).json({ error: 'Cannot form a squad from an archived conversation.' });
    }

    const { squadName, targetSize } = (req.body || {}) as {
      squadName?: string;
      targetSize?: number;
    };
    const evt = db.events.find((e) => e.id === conv.eventId);
    const maxAllowed = parseEventMaxTeamSize(evt?.teamSize);
    const cleanName = (
      squadName?.trim() ||
      conv.proposedSquadName ||
      `${conv.eventTitle.split(' ')[0]} Builders`
    ).slice(0, 60);
    const cleanTargetSize = Math.min(
      maxAllowed,
      Math.max(2, Number(targetSize) || conv.proposedTargetSize || Math.min(4, maxAllowed))
    );

    if (!conv.proposedByUserId) {
      conv.proposedByUserId = stu.id;
    }
    conv.proposedSquadName = cleanName;
    conv.proposedTargetSize = cleanTargetSize;
    if (!conv.confirmedByUserIds.includes(stu.id)) {
      conv.confirmedByUserIds.push(stu.id);
    }

    const nowIso = new Date().toISOString();
    conv.updatedAt = nowIso;

    const allConfirmed = conv.participantIds.every((pid) =>
      conv.confirmedByUserIds.includes(pid)
    );

    if (!allConfirmed) {
      const proposeMsg: TeamChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        roomId: conv.id,
        roomScope: 'conversation',
        senderId: 'system',
        senderName: 'Connectus',
        kind: 'system',
        body: `${stu.displayName} confirmed forming squad "${cleanName}" (${cleanTargetSize} seats). Waiting for teammate confirmation.`,
        createdAt: nowIso,
      };
      db.chatMessages.push(proposeMsg);
      saveDb(db);
      broadcastToUsers(conv.participantIds, {
        type: 'conversation:upserted',
        conversation: conv,
      });
      broadcastToUsers(conv.participantIds, {
        type: 'message:created',
        message: proposeMsg,
      });
      return res.json({ conversation: conv, squad: null });
    }

    const ownerId = conv.proposedByUserId || conv.participantIds[0];
    const members = conv.participants.map((p) =>
      toSquadMember(p, p.userId === ownerId ? 'owner' : 'member')
    );

    const newSquad: Squad = {
      id: `sq-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      name: cleanName,
      eventId: conv.eventId,
      eventTitle: conv.eventTitle,
      eventType: conv.eventType,
      ownerId,
      targetSize: cleanTargetSize,
      requiredRoles: [],
      recruitmentStatus: members.length >= cleanTargetSize ? 'closed' : 'open',
      isLocked: false,
      memberIds: members.map((m) => m.userId),
      members,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    conv.status = 'confirmed_to_squad';
    conv.createdSquadId = newSquad.id;

    const convDoneMsg: TeamChatMessage = {
      id: `msg-${Date.now()}-c`,
      roomId: conv.id,
      roomScope: 'conversation',
      senderId: 'system',
      senderName: 'Connectus',
      kind: 'system',
      body: `Both sides confirmed! Squad "${newSquad.name}" is now live in My Squads.`,
      createdAt: nowIso,
    };
    const sqWelcomeMsg: TeamChatMessage = {
      id: `msg-${Date.now()}-s`,
      roomId: newSquad.id,
      roomScope: 'squad',
      senderId: 'system',
      senderName: 'Connectus',
      kind: 'system',
      body: `Squad "${newSquad.name}" formed for ${newSquad.eventTitle}. Coordinate here or share WhatsApp details voluntarily, then register together.`,
      createdAt: nowIso,
    };

    db.squads.unshift(newSquad);
    db.chatMessages.push(convDoneMsg, sqWelcomeMsg);

    const notifs: NotificationItem[] = newSquad.memberIds.map((uid) => ({
      id: `notif-sq-${Date.now()}-${uid.slice(0, 10)}`,
      userId: uid,
      eventId: newSquad.eventId,
      eventTitle: newSquad.eventTitle,
      kind: 'squad_confirmed',
      channel: 'in_app',
      title: `Squad Formed · ${newSquad.name}`,
      body: `Both teammates confirmed! "${newSquad.name}" is now ready in My Squads for ${newSquad.eventTitle}.`,
      sendAfter: nowIso,
      sentAt: nowIso,
      status: 'sent',
      dedupeKey: `sq_formed:${newSquad.id}:${uid}`,
    }));
    db.notifications.unshift(...notifs);

    saveDb(db);

    broadcastToUsers(conv.participantIds, {
      type: 'conversation:upserted',
      conversation: conv,
    });
    broadcastToUsers(conv.participantIds, {
      type: 'message:created',
      message: convDoneMsg,
    });
    broadcastToUsers(newSquad.memberIds, {
      type: 'message:created',
      message: sqWelcomeMsg,
    });
    for (const n of notifs) {
      broadcastToUsers([n.userId], { type: 'notification:created', notification: n });
    }
    broadcastSquadUpdated(db, newSquad);

    res.json({
      conversation: conv,
      squad: sanitizeSquadForMember(newSquad, stu.id),
    });
  });

  app.post('/api/teams/conversations/:id/archive', (req: AuthenticatedRequest, res) => {
    const db = loadDb();
    const { student: stu } = getStudentForRequest(db, req);
    const conv = db.conversations.find((c) => c.id === req.params.id);
    if (!conv) return res.status(404).json({ error: 'Conversation not found.' });
    if (!conv.participantIds.includes(stu.id)) {
      return res.status(403).json({ error: 'Only conversation participants can archive this chat.' });
    }
    conv.status = 'archived';
    conv.updatedAt = new Date().toISOString();
    saveDb(db);
    broadcastToUsers(conv.participantIds, {
      type: 'conversation:upserted',
      conversation: conv,
    });
    res.json({ conversation: conv });
  });

  app.post('/api/teams/squads', (req: AuthenticatedRequest, res) => {
    const db = loadDb();
    const { student: stu } = getStudentForRequest(db, req);
    const { name, eventId, targetSize, requiredRoles } = (req.body || {}) as {
      name?: string;
      eventId?: string;
      targetSize?: number;
      requiredRoles?: string[];
    };

    const evt = db.events.find((e) => e.id === eventId) || db.events[0];
    if (!evt || evt.status === 'cancelled') {
      return res.status(404).json({ error: 'Event not found or cancelled.' });
    }
    const maxAllowed = parseEventMaxTeamSize(evt.teamSize);
    const cleanTargetSize = Math.min(maxAllowed, Math.max(2, Number(targetSize) || Math.min(4, maxAllowed)));
    const cleanName = (name?.trim() || `${evt.title.split(' ')[0]} Squad`).slice(0, 60);
    const cleanRoles = Array.isArray(requiredRoles)
      ? requiredRoles.map((r) => r.trim()).filter(Boolean).slice(0, 10)
      : [];

    const nowIso = new Date().toISOString();
    const stuCollege = resolveCollegeShortName(stu);
    const ownerMember = toSquadMember(
      {
        userId: stu.id,
        name: stu.displayName,
        collegeShortName: stuCollege,
        branch: stu.branch,
        year: stu.year,
        roleSkill: (stu.skills || []).slice(0, 3).join(', ') || stu.branch,
      },
      'owner'
    );

    const squad: Squad = {
      id: `sq-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      name: cleanName,
      eventId: evt.id,
      eventTitle: evt.title,
      eventType: evt.type,
      ownerId: stu.id,
      targetSize: cleanTargetSize,
      requiredRoles: cleanRoles,
      recruitmentStatus: 'open',
      isLocked: false,
      memberIds: [stu.id],
      members: [ownerMember],
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const sysMsg: TeamChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      roomId: squad.id,
      roomScope: 'squad',
      senderId: 'system',
      senderName: 'Connectus',
      kind: 'system',
      body: `${stu.displayName} created recruiting squad "${squad.name}" for ${evt.title} (${squad.targetSize} seats).`,
      createdAt: nowIso,
    };

    db.squads.unshift(squad);
    db.chatMessages.push(sysMsg);
    saveDb(db);

    broadcastToUsers([stu.id], { type: 'message:created', message: sysMsg });
    broadcastSquadUpdated(db, squad);
    res.json({ squad: sanitizeSquadForMember(squad, stu.id) });
  });

  app.patch('/api/teams/squads/:id', (req: AuthenticatedRequest, res) => {
    const db = loadDb();
    const { student: stu } = getStudentForRequest(db, req);
    const squad = db.squads.find((s) => s.id === req.params.id);
    if (!squad) return res.status(404).json({ error: 'Squad not found.' });
    if (squad.ownerId !== stu.id) {
      return res.status(403).json({ error: 'Only the squad owner can update squad settings.' });
    }

    const evt = db.events.find((e) => e.id === squad.eventId);
    const {
      name,
      targetSize,
      requiredRoles,
      recruitmentStatus,
      archived,
    } = (req.body || {}) as {
      name?: string;
      targetSize?: number;
      requiredRoles?: string[];
      recruitmentStatus?: SquadRecruitmentStatus;
      archived?: boolean;
    };

    if (typeof name === 'string' && name.trim()) {
      squad.name = name.trim().slice(0, 60);
    }
    if (typeof targetSize === 'number' && !Number.isNaN(targetSize)) {
      const maxAllowed = parseEventMaxTeamSize(evt?.teamSize);
      if (targetSize < squad.members.length) {
        return res.status(400).json({
          error: `Target size cannot be smaller than current member count (${squad.members.length}).`,
        });
      }
      squad.targetSize = Math.min(maxAllowed, Math.max(squad.members.length, Math.round(targetSize)));
    }
    if (Array.isArray(requiredRoles)) {
      squad.requiredRoles = requiredRoles.map((r) => r.trim()).filter(Boolean).slice(0, 10);
    }
    if (recruitmentStatus === 'locked') {
      if (evt) {
        if (evt.status !== 'published' || new Date(evt.regDeadline).getTime() < Date.now()) {
          return res.status(400).json({
            error: 'Cannot lock squad because event registration deadline has passed or event was cancelled.',
          });
        }
        const maxAllowed = parseEventMaxTeamSize(evt.teamSize);
        if (squad.members.length > maxAllowed) {
          return res.status(400).json({
            error: `Roster exceeds event limit of ${maxAllowed} members.`,
          });
        }
      }
      squad.recruitmentStatus = 'locked';
      squad.isLocked = true;
    } else if (recruitmentStatus === 'open' || recruitmentStatus === 'closed') {
      squad.recruitmentStatus = recruitmentStatus;
      squad.isLocked = false;
    }
    if (typeof archived === 'boolean') {
      squad.archivedAt = archived ? new Date().toISOString() : undefined;
    }

    squad.updatedAt = new Date().toISOString();
    saveDb(db);
    broadcastSquadUpdated(db, squad);
    res.json({ squad: sanitizeSquadForMember(squad, stu.id) });
  });

  app.post('/api/teams/squads/:id/leave', (req: AuthenticatedRequest, res) => {
    const db = loadDb();
    const { student: stu } = getStudentForRequest(db, req);
    const squad = db.squads.find((s) => s.id === req.params.id);
    if (!squad) return res.status(404).json({ error: 'Squad not found.' });
    if (!squad.memberIds.includes(stu.id)) {
      return res.status(403).json({ error: 'You are not a member of this squad.' });
    }
    const activePass = db.registrations.find(
      (r) =>
        r.eventId === squad.eventId &&
        r.userId === stu.id &&
        r.squadId === squad.id &&
        (r.status === 'confirmed' || r.status === 'checked_in')
    );
    if (activePass) {
      return res.status(409).json({
        error:
          'You already have an active entry pass issued for this squad. Cancel your event registration first before switching or leaving squads.',
      });
    }
    if (squad.ownerId === stu.id && squad.members.length > 1) {
      return res.status(400).json({
        error: 'Transfer squad ownership to another teammate before leaving.',
      });
    }

    const nowIso = new Date().toISOString();
    if (squad.members.length <= 1) {
      db.squads = db.squads.filter((s) => s.id !== squad.id);
      saveDb(db);
      broadcastToUsers([stu.id], { type: 'squad:removed', id: squad.id });
      broadcastPublicTeamsEvent({ type: 'publicSquad:removed', id: squad.id });
      return res.json({ removed: true, id: squad.id });
    }

    squad.members = squad.members.filter((m) => m.userId !== stu.id);
    squad.memberIds = squad.members.map((m) => m.userId);
    squad.updatedAt = nowIso;

    const sysMsg: TeamChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      roomId: squad.id,
      roomScope: 'squad',
      senderId: 'system',
      senderName: 'Connectus',
      kind: 'system',
      body: `${stu.displayName} left the squad.`,
      createdAt: nowIso,
    };
    db.chatMessages.push(sysMsg);
    markSnapshotsNeedsUpdateIfRosterChanged(db, squad);
    saveDb(db);

    broadcastToUsers([stu.id], { type: 'squad:removed', id: squad.id });
    broadcastToUsers(squad.memberIds, { type: 'message:created', message: sysMsg });
    broadcastSquadUpdated(db, squad);
    res.json({ left: true, id: squad.id });
  });

  app.post('/api/teams/squads/:id/remove-member', (req: AuthenticatedRequest, res) => {
    const db = loadDb();
    const { student: stu } = getStudentForRequest(db, req);
    const squad = db.squads.find((s) => s.id === req.params.id);
    if (!squad) return res.status(404).json({ error: 'Squad not found.' });
    if (squad.ownerId !== stu.id) {
      return res.status(403).json({ error: 'Only the squad owner can remove members.' });
    }

    const { memberUserId } = (req.body || {}) as { memberUserId?: string };
    if (!memberUserId || memberUserId === stu.id || !squad.memberIds.includes(memberUserId)) {
      return res.status(400).json({ error: 'Valid teammate userId is required.' });
    }
    const memberHasPass = db.registrations.find(
      (r) =>
        r.eventId === squad.eventId &&
        r.userId === memberUserId &&
        r.squadId === squad.id &&
        (r.status === 'confirmed' || r.status === 'checked_in')
    );
    if (memberHasPass) {
      return res.status(409).json({
        error:
          'This teammate already holds an active entry pass bound to your squad. They must cancel their registration first before leaving the roster.',
      });
    }

    const removed = squad.members.find((m) => m.userId === memberUserId);
    squad.members = squad.members.filter((m) => m.userId !== memberUserId);
    squad.memberIds = squad.members.map((m) => m.userId);
    const nowIso = new Date().toISOString();
    squad.updatedAt = nowIso;

    const sysMsg: TeamChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      roomId: squad.id,
      roomScope: 'squad',
      senderId: 'system',
      senderName: 'Connectus',
      kind: 'system',
      body: `${removed?.name || 'A teammate'} was removed from the squad by the owner.`,
      createdAt: nowIso,
    };
    db.chatMessages.push(sysMsg);
    markSnapshotsNeedsUpdateIfRosterChanged(db, squad);
    saveDb(db);

    broadcastToUsers([memberUserId], { type: 'squad:removed', id: squad.id });
    broadcastToUsers(squad.memberIds, { type: 'message:created', message: sysMsg });
    broadcastSquadUpdated(db, squad);
    res.json({ squad: sanitizeSquadForMember(squad, stu.id) });
  });

  app.post('/api/teams/squads/:id/transfer-owner', (req: AuthenticatedRequest, res) => {
    const db = loadDb();
    const { student: stu } = getStudentForRequest(db, req);
    const squad = db.squads.find((s) => s.id === req.params.id);
    if (!squad) return res.status(404).json({ error: 'Squad not found.' });
    if (squad.ownerId !== stu.id) {
      return res.status(403).json({ error: 'Only the current owner can transfer squad ownership.' });
    }

    const { nextOwnerId } = (req.body || {}) as { nextOwnerId?: string };
    const nextOwner = squad.members.find((m) => m.userId === nextOwnerId);
    if (!nextOwner || nextOwner.userId === stu.id) {
      return res.status(400).json({ error: 'Choose another current member as new owner.' });
    }

    squad.ownerId = nextOwner.userId;
    squad.members = squad.members.map((m) => ({
      ...m,
      role: m.userId === nextOwner.userId ? 'owner' : 'member',
    }));
    const nowIso = new Date().toISOString();
    squad.updatedAt = nowIso;

    const sysMsg: TeamChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      roomId: squad.id,
      roomScope: 'squad',
      senderId: 'system',
      senderName: 'Connectus',
      kind: 'system',
      body: `Squad ownership transferred to ${nextOwner.name}.`,
      createdAt: nowIso,
    };
    db.chatMessages.push(sysMsg);
    saveDb(db);

    broadcastToUsers(squad.memberIds, { type: 'message:created', message: sysMsg });
    broadcastSquadUpdated(db, squad);
    res.json({ squad: sanitizeSquadForMember(squad, stu.id) });
  });

  app.post('/api/teams/squads/:id/join-requests', (req: AuthenticatedRequest, res) => {
    const db = loadDb();
    if (expireStaleTeamItems(db)) saveDb(db);
    const { student: stu } = getStudentForRequest(db, req);
    const squad = db.squads.find((s) => s.id === req.params.id);
    if (!squad) return res.status(404).json({ error: 'Squad not found.' });
    if (squad.memberIds.includes(stu.id)) {
      return res.status(400).json({ error: 'You are already a member of this squad.' });
    }
    if (
      squad.archivedAt ||
      squad.isLocked ||
      squad.recruitmentStatus !== 'open' ||
      squad.members.length >= squad.targetSize
    ) {
      return res.status(400).json({ error: 'This squad is not currently recruiting new members.' });
    }

    const dup = db.joinRequests.find(
      (r) => r.squadId === squad.id && r.applicantId === stu.id && r.status === 'pending'
    );
    if (dup) {
      return res.status(409).json({ error: 'You already sent a pending join request to this squad.' });
    }

    const { roleApplied, note } = (req.body || {}) as { roleApplied?: string; note?: string };
    const evt = db.events.find((e) => e.id === squad.eventId);
    const nowIso = new Date().toISOString();
    const stuCollege = resolveCollegeShortName(stu);

    const joinReq: SquadJoinRequest = {
      id: `jr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      squadId: squad.id,
      squadName: squad.name,
      squadOwnerId: squad.ownerId,
      eventId: squad.eventId,
      eventTitle: squad.eventTitle,
      applicantId: stu.id,
      applicantName: stu.displayName,
      applicantCollege: stuCollege,
      applicantBranch: stu.branch,
      applicantYear: stu.year,
      applicantSkills: (stu.skills || []).slice(0, 8),
      roleApplied: (roleApplied || (stu.skills || [])[0] || stu.branch).trim().slice(0, 60),
      note: (note || '').trim().slice(0, 280),
      status: 'pending',
      createdAt: nowIso,
      expiresAt: computeCallOrRequestExpiry(evt),
      updatedAt: nowIso,
    };

    const notif: NotificationItem = {
      id: `notif-jr-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      userId: squad.ownerId,
      eventId: squad.eventId,
      eventTitle: squad.eventTitle,
      kind: 'squad_request',
      channel: 'in_app',
      title: `Squad Join Request · ${squad.name}`,
      body: `${stu.displayName} (${stuCollege}) requested to join "${squad.name}" as ${joinReq.roleApplied}.`,
      sendAfter: nowIso,
      sentAt: nowIso,
      status: 'sent',
      dedupeKey: `jr:${joinReq.id}`,
    };

    db.joinRequests.unshift(joinReq);
    db.notifications.unshift(notif);
    saveDb(db);

    broadcastToUsers([stu.id, squad.ownerId], {
      type: 'joinRequest:upserted',
      request: joinReq,
    });
    broadcastToUsers([squad.ownerId], {
      type: 'notification:created',
      notification: notif,
    });
    res.json({ request: joinReq });
  });

  app.post('/api/teams/join-requests/:id/respond', (req: AuthenticatedRequest, res) => {
    const db = loadDb();
    if (expireStaleTeamItems(db)) saveDb(db);
    const { student: stu } = getStudentForRequest(db, req);
    const joinReq = db.joinRequests.find((r) => r.id === req.params.id);
    if (!joinReq) return res.status(404).json({ error: 'Join request not found.' });
    if (joinReq.squadOwnerId !== stu.id) {
      return res.status(403).json({ error: 'Only the squad owner can approve or decline join requests.' });
    }
    if (joinReq.status !== 'pending') {
      return res.status(400).json({ error: `This join request is already ${joinReq.status}.` });
    }

    const { decision } = (req.body || {}) as { decision?: 'approve' | 'decline' };
    const nowIso = new Date().toISOString();

    if (decision === 'decline') {
      joinReq.status = 'declined';
      joinReq.updatedAt = nowIso;
      saveDb(db);
      broadcastToUsers([joinReq.applicantId, stu.id], {
        type: 'joinRequest:upserted',
        request: joinReq,
      });
      return res.json({ request: joinReq });
    }

    const squad = db.squads.find((s) => s.id === joinReq.squadId);
    if (!squad) return res.status(404).json({ error: 'Squad no longer exists.' });
    if (squad.isLocked) {
      return res.status(400).json({ error: 'Squad is locked. Unlock recruitment before approving new members.' });
    }
    if (squad.members.length >= squad.targetSize) {
      return res.status(400).json({ error: 'Squad is already at target size. Increase target size first.' });
    }

    joinReq.status = 'approved';
    joinReq.updatedAt = nowIso;

    if (!squad.memberIds.includes(joinReq.applicantId)) {
      squad.members.push({
        userId: joinReq.applicantId,
        name: joinReq.applicantName,
        collegeShortName: joinReq.applicantCollege,
        branch: joinReq.applicantBranch,
        year: joinReq.applicantYear,
        roleSkill: joinReq.roleApplied || joinReq.applicantSkills.slice(0, 3).join(', ') || joinReq.applicantBranch,
        role: 'member',
        joinedAt: nowIso,
      });
      squad.memberIds = squad.members.map((m) => m.userId);
    }
    if (squad.members.length >= squad.targetSize) {
      squad.recruitmentStatus = 'closed';
    }
    squad.updatedAt = nowIso;

    const sysMsg: TeamChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      roomId: squad.id,
      roomScope: 'squad',
      senderId: 'system',
      senderName: 'Connectus',
      kind: 'system',
      body: `${joinReq.applicantName} (${joinReq.applicantCollege}) joined the squad as ${joinReq.roleApplied}.`,
      createdAt: nowIso,
    };
    db.chatMessages.push(sysMsg);
    markSnapshotsNeedsUpdateIfRosterChanged(db, squad);

    const notif: NotificationItem = {
      id: `notif-jr-acc-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      userId: joinReq.applicantId,
      eventId: squad.eventId,
      eventTitle: squad.eventTitle,
      kind: 'squad_confirmed',
      channel: 'in_app',
      title: `Joined ${squad.name}!`,
      body: `${stu.displayName} approved your request to join "${squad.name}" for ${squad.eventTitle}.`,
      sendAfter: nowIso,
      sentAt: nowIso,
      status: 'sent',
      dedupeKey: `jr_acc:${joinReq.id}`,
    };
    db.notifications.unshift(notif);
    saveDb(db);

    broadcastToUsers([joinReq.applicantId, stu.id], {
      type: 'joinRequest:upserted',
      request: joinReq,
    });
    broadcastToUsers([joinReq.applicantId], {
      type: 'notification:created',
      notification: notif,
    });
    broadcastToUsers(squad.memberIds, {
      type: 'message:created',
      message: sysMsg,
    });
    broadcastSquadUpdated(db, squad);

    res.json({ request: joinReq, squad: sanitizeSquadForMember(squad, stu.id) });
  });

  app.post('/api/teams/squads/:id/messages', (req: AuthenticatedRequest, res) => {
    const db = loadDb();
    const { student: stu } = getStudentForRequest(db, req);
    const squad = db.squads.find((s) => s.id === req.params.id);
    if (!squad) return res.status(404).json({ error: 'Squad not found.' });
    if (!squad.memberIds.includes(stu.id)) {
      return res.status(403).json({ error: 'Only squad members can post messages here.' });
    }

    const { body } = (req.body || {}) as { body?: string };
    if (!body?.trim()) {
      return res.status(400).json({ error: 'Message text cannot be empty.' });
    }

    const nowIso = new Date().toISOString();
    const message: TeamChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      roomId: squad.id,
      roomScope: 'squad',
      senderId: stu.id,
      senderName: stu.displayName,
      kind: 'text',
      body: body.trim().slice(0, 1000),
      createdAt: nowIso,
    };
    squad.updatedAt = nowIso;
    db.chatMessages.push(message);
    saveDb(db);

    broadcastToUsers(squad.memberIds, { type: 'message:created', message });
    broadcastSquadUpdated(db, squad);
    res.json({ message, squad: sanitizeSquadForMember(squad, stu.id) });
  });

  app.post('/api/teams/squads/:id/whatsapp', (req: AuthenticatedRequest, res) => {
    const db = loadDb();
    const { student: stu } = getStudentForRequest(db, req);
    const squad = db.squads.find((s) => s.id === req.params.id);
    if (!squad) return res.status(404).json({ error: 'Squad not found.' });
    if (!squad.memberIds.includes(stu.id)) {
      return res.status(403).json({ error: 'Only squad members can share WhatsApp handoff info.' });
    }

    const { mode, whatsappNumber, whatsappGroupUrl } = (req.body || {}) as {
      mode: 'contact' | 'group';
      whatsappNumber?: string;
      whatsappGroupUrl?: string;
    };
    const nowIso = new Date().toISOString();

    if (mode === 'group') {
      const cleanUrl = (whatsappGroupUrl || '').trim();
      if (!cleanUrl.startsWith('https://')) {
        return res.status(400).json({ error: 'WhatsApp group link must start with https://' });
      }
      squad.whatsappGroupUrl = cleanUrl.slice(0, 280);
      squad.updatedAt = nowIso;
      const msg: TeamChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        roomId: squad.id,
        roomScope: 'squad',
        senderId: stu.id,
        senderName: stu.displayName,
        kind: 'whatsapp_group',
        body: `${stu.displayName} linked the squad WhatsApp group for coordination.`,
        whatsappUrl: squad.whatsappGroupUrl,
        createdAt: nowIso,
      };
      db.chatMessages.push(msg);
      saveDb(db);
      broadcastToUsers(squad.memberIds, { type: 'message:created', message: msg });
      broadcastSquadUpdated(db, squad);
      return res.json({ squad: sanitizeSquadForMember(squad, stu.id), message: msg });
    }

    const rawPhone = (whatsappNumber || stu.phoneNumber || '').trim();
    const waUrl = buildWaMeUrl(rawPhone);
    if (!waUrl) {
      return res.status(400).json({ error: 'Enter a valid 10+ digit WhatsApp phone number to share.' });
    }

    squad.members = squad.members.map((m) =>
      m.userId === stu.id ? { ...m, whatsappShared: true, whatsappNumber: rawPhone } : m
    );
    squad.updatedAt = nowIso;

    const msg: TeamChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      roomId: squad.id,
      roomScope: 'squad',
      senderId: stu.id,
      senderName: stu.displayName,
      kind: 'whatsapp_contact',
      body: `Shared WhatsApp contact (${rawPhone}) with squad members.`,
      whatsappNumber: rawPhone,
      whatsappUrl: waUrl,
      createdAt: nowIso,
    };
    db.chatMessages.push(msg);
    saveDb(db);
    broadcastToUsers(squad.memberIds, { type: 'message:created', message: msg });
    broadcastSquadUpdated(db, squad);
    res.json({ squad: sanitizeSquadForMember(squad, stu.id), message: msg });
  });

  app.post('/api/notifications/flush-digest', (req: AuthenticatedRequest, res) => {
    const db = loadDb();
    const { student } = getStudentForRequest(db, req);
    const nowIso = new Date().toISOString();
    let flushedCount = 0;
    const flushed: NotificationItem[] = [];
    for (const n of db.notifications) {
      if (
        (n.userId === student.id || n.eventId === 'system') &&
        (n.status === 'queued' || n.status === 'held_quiet_hours')
      ) {
        n.status = 'sent';
        n.sentAt = nowIso;
        flushedCount += 1;
        flushed.push(n);
      }
    }
    saveDb(db);
    broadcastNotificationsAndRefresh({ notifications: flushed });
    res.json({
      flushedCount,
      notifications: db.notifications.filter(
        (n) => n.userId === student.id || n.eventId === 'system'
      ),
    });
  });

  app.post('/api/notifications/run-scheduler', async (req: AuthenticatedRequest, res) => {
    const { student } = getStudentForRequest(loadDb(), req);
    const { created, flushed } = await runScheduledNotificationChecks();
    if (created.length > 0 || flushed.length > 0) {
      broadcastNotificationsAndRefresh({ notifications: [...created, ...flushed] });
    }
    const latest = loadDb();
    res.json({
      createdCount: created.length,
      flushedCount: flushed.length,
      notifications: latest.notifications.filter(
        (n) => n.userId === student.id || n.eventId === 'system'
      ),
    });
  });

  app.post('/api/sync/reconcile', (req: AuthenticatedRequest, res) => {
    const db = loadDb();
    const { student } = getStudentForRequest(db, req);
    const officialCaller = findApprovedOfficialForRequest(db, req);
    const body = (req.body || {}) as {
      events?: CampusEvent[];
      registrations?: Registration[];
      announcements?: CampusAnnouncement[];
      notifications?: NotificationItem[];
      eventFeedback?: EventFeedback[];
      surveys?: CampusSurvey[];
      surveyResponses?: SurveyResponse[];
      partnerPosts?: PartnerPost[];
      squads?: Squad[];
      connectionRequests?: ConnectionRequest[];
      joinRequests?: SquadJoinRequest[];
      teamUpCalls?: TeamUpCall[];
      conversations?: TeamConversation[];
      chatMessages?: TeamChatMessage[];
      registrationSnapshots?: SquadRegistrationSnapshot[];
    };

    let changed = false;
    const knownOrgById = new Map(db.organizers.map((o) => [o.id, o]));

    if (Array.isArray(body.events)) {
      const existingById = new Map(db.events.map((e) => [e.id, e]));
      for (const incomingEvt of body.events) {
        if (!incomingEvt?.id || !incomingEvt.title || !incomingEvt.collegeId) continue;
        const creatorOrg = knownOrgById.get(incomingEvt.clubId);
        if (!creatorOrg || creatorOrg.status !== 'approved') continue;
        const canBePublished =
          incomingEvt.status !== 'published' ||
          creatorOrg.memberRole === 'college_official' ||
          creatorOrg.memberRole === 'external_organizer' ||
          Boolean(incomingEvt.approvedById);
        if (!canBePublished) continue;

        const existing = existingById.get(incomingEvt.id);
        if (!existing) {
          db.events.unshift(incomingEvt);
          existingById.set(incomingEvt.id, incomingEvt);
          changed = true;
        } else {
          const existingHistLen = existing.approvalHistory?.length || 0;
          const incomingHistLen = incomingEvt.approvalHistory?.length || 0;
          if (
            (incomingEvt.status !== existing.status &&
              (incomingHistLen >= existingHistLen || officialCaller?.collegeId === existing.collegeId)) ||
            Boolean(incomingEvt.revisionPendingReview) !== Boolean(existing.revisionPendingReview)
          ) {
            Object.assign(existing, incomingEvt);
            changed = true;
          }
        }
      }
    }

    if (Array.isArray(body.registrations)) {
      const existingRegIds = new Set(db.registrations.map((r) => r.id));
      for (const incomingReg of body.registrations) {
        if (!incomingReg?.id || !incomingReg.eventId || !incomingReg.userId) continue;
        if (existingRegIds.has(incomingReg.id)) continue;
        const evt = db.events.find((e) => e.id === incomingReg.eventId);
        const canAcceptReg =
          incomingReg.userId === student.id ||
          (officialCaller && evt && evt.collegeId === officialCaller.collegeId);
        if (!canAcceptReg) continue;
        db.registrations.push(incomingReg);
        existingRegIds.add(incomingReg.id);
        changed = true;
      }

      for (const evt of db.events) {
        const activeRegs = db.registrations.filter(
          (r) => r.eventId === evt.id && r.status !== 'cancelled'
        );
        const confirmedRegs = activeRegs.filter(
          (r) => r.status === 'confirmed' || r.status === 'checked_in'
        ).length;
        const waitlistedRegs = activeRegs.filter((r) => r.status === 'waitlisted').length;
        if (evt.source === 'seeded' || evt.id === 'evt-iqx24-hackathon' || evt.id === 'evt-deccan-hack' || evt.id === 'evt-robotics-rover') {
          if (confirmedRegs > evt.confirmedCount) {
            evt.confirmedCount = confirmedRegs;
            changed = true;
          }
        } else if (confirmedRegs > evt.confirmedCount || waitlistedRegs > evt.waitlistCount) {
          evt.confirmedCount = Math.max(evt.confirmedCount, confirmedRegs);
          evt.waitlistCount = Math.max(evt.waitlistCount, waitlistedRegs);
          changed = true;
        }
      }
    }

    if (Array.isArray(body.announcements)) {
      const existingAnnIds = new Set((db.announcements || []).map((a) => a.id));
      for (const ann of body.announcements) {
        if (!ann?.id || !ann.title || existingAnnIds.has(ann.id)) continue;
        const author = knownOrgById.get(ann.authorId);
        if (!author || author.memberRole !== 'college_official') continue;
        db.announcements = [ann, ...(db.announcements || [])];
        existingAnnIds.add(ann.id);
        changed = true;
      }
    }

    if (Array.isArray(body.notifications)) {
      const existingNotifIds = new Set(db.notifications.map((n) => n.id));
      const callerEmail = (req.verifiedAuth?.email || student.email || '').trim().toLowerCase();
      for (const notif of body.notifications) {
        if (!notif?.id || existingNotifIds.has(notif.id)) continue;
        const belongsToCaller =
          notif.userId === student.id ||
          (callerEmail && notif.userId === `email:${callerEmail}`);
        if (!belongsToCaller) continue;
        db.notifications.unshift({
          ...notif,
          userId: student.id,
        });
        existingNotifIds.add(notif.id);
        changed = true;
      }
    }

    if (Array.isArray(body.eventFeedback)) {
      const existingFbIds = new Set((db.eventFeedback || []).map((f) => f.id));
      for (const fb of body.eventFeedback) {
        if (!fb?.id || !fb.eventId || existingFbIds.has(fb.id)) continue;
        if (fb.userId !== student.id && officialCaller?.collegeId !== fb.collegeId) continue;
        db.eventFeedback = [fb, ...(db.eventFeedback || [])];
        existingFbIds.add(fb.id);
        changed = true;
      }
    }

    if (Array.isArray(body.surveys)) {
      const existingSurveyIds = new Set((db.surveys || []).map((s) => s.id));
      for (const srv of body.surveys) {
        if (!srv?.id || !srv.title || existingSurveyIds.has(srv.id)) continue;
        const author = knownOrgById.get(srv.createdById);
        if (!author || author.memberRole !== 'college_official') continue;
        db.surveys = [srv, ...(db.surveys || [])];
        existingSurveyIds.add(srv.id);
        changed = true;
      }
    }

    if (Array.isArray(body.surveyResponses)) {
      const existingRespIds = new Set((db.surveyResponses || []).map((r) => r.id));
      for (const resp of body.surveyResponses) {
        if (!resp?.id || !resp.surveyId || existingRespIds.has(resp.id)) continue;
        if (resp.userId !== student.id && officialCaller?.collegeId !== resp.collegeId) continue;
        db.surveyResponses = [resp, ...(db.surveyResponses || [])];
        existingRespIds.add(resp.id);
        changed = true;
      }
    }

    if (Array.isArray(body.partnerPosts)) {
      const existingIds = new Set(db.partnerPosts.map((p) => p.id));
      for (const post of body.partnerPosts) {
        if (!post?.id || !post.eventId || existingIds.has(post.id)) continue;
        db.partnerPosts.unshift(post);
        existingIds.add(post.id);
        changed = true;
      }
    }

    if (Array.isArray(body.squads)) {
      const existingById = new Map(db.squads.map((s) => [s.id, s]));
      for (const sq of body.squads) {
        if (!sq?.id || !sq.eventId) continue;
        const isCallerMember = Array.isArray(sq.memberIds) && sq.memberIds.includes(student.id);
        if (!isCallerMember && !isBetaManagerRequest(req)) continue;
        const cur = existingById.get(sq.id);
        if (!cur) {
          db.squads.unshift({
            ...sq,
            members:
              Array.isArray(sq.members) && sq.members.length > 0
                ? sq.members
                : sq.memberIds.map((uid) => {
                    const stu = db.students?.[uid] || createGuestStudent(uid);
                    return toSquadMember(
                      {
                        userId: stu.id,
                        name: stu.displayName,
                        collegeShortName: resolveCollegeShortName(stu),
                        branch: stu.branch,
                        year: stu.year,
                        roleSkill: sq.requiredRoles?.[0] || stu.branch || 'Builder',
                      },
                      uid === sq.ownerId ? 'owner' : 'member'
                    );
                  }),
          });
          existingById.set(sq.id, db.squads[0]);
          changed = true;
        }
      }
    }

    if (Array.isArray(body.connectionRequests)) {
      const existingIds = new Set(db.connectionRequests.map((r) => r.id));
      for (const reqItem of body.connectionRequests) {
        if (!reqItem?.id || existingIds.has(reqItem.id)) continue;
        if (reqItem.fromUserId !== student.id && reqItem.toUserId !== student.id && !isBetaManagerRequest(req)) {
          continue;
        }
        db.connectionRequests.unshift(reqItem);
        existingIds.add(reqItem.id);
        changed = true;
      }
    }

    if (Array.isArray(body.joinRequests)) {
      const existingIds = new Set(db.joinRequests.map((r) => r.id));
      for (const jr of body.joinRequests) {
        if (!jr?.id || existingIds.has(jr.id)) continue;
        if (jr.applicantId !== student.id && jr.squadOwnerId !== student.id && !isBetaManagerRequest(req)) {
          continue;
        }
        db.joinRequests.unshift(jr);
        existingIds.add(jr.id);
        changed = true;
      }
    }

    if (Array.isArray(body.teamUpCalls)) {
      const existingIds = new Set(db.teamUpCalls.map((c) => c.id));
      for (const call of body.teamUpCalls) {
        if (!call?.id || existingIds.has(call.id)) continue;
        const isRel =
          call.creatorId === student.id ||
          (Array.isArray(call.recipientUserIds) && call.recipientUserIds.includes(student.id));
        if (!isRel && !isBetaManagerRequest(req)) continue;
        db.teamUpCalls.unshift({
          ...call,
          responses: Array.isArray(call.responses) ? call.responses : [],
        });
        existingIds.add(call.id);
        changed = true;
      }
    }

    if (Array.isArray(body.conversations)) {
      const existingIds = new Set(db.conversations.map((c) => c.id));
      for (const conv of body.conversations) {
        if (!conv?.id || existingIds.has(conv.id)) continue;
        if (!Array.isArray(conv.participantIds) || (!conv.participantIds.includes(student.id) && !isBetaManagerRequest(req))) {
          continue;
        }
        db.conversations.unshift({
          ...conv,
          participants:
            Array.isArray(conv.participants) && conv.participants.length > 0
              ? conv.participants
              : conv.participantIds.map((uid) => {
                  const stu = db.students?.[uid] || createGuestStudent(uid);
                  return {
                    userId: uid,
                    name: stu.displayName || 'Student',
                    collegeShortName: resolveCollegeShortName(stu),
                  };
                }),
        });
        existingIds.add(conv.id);
        changed = true;
      }
    }

    if (Array.isArray(body.chatMessages)) {
      const existingIds = new Set(db.chatMessages.map((m) => m.id));
      for (const msg of body.chatMessages) {
        if (!msg?.id || existingIds.has(msg.id)) continue;
        db.chatMessages.push(msg);
        existingIds.add(msg.id);
        changed = true;
      }
    }

    if (Array.isArray(body.registrationSnapshots)) {
      const existingIds = new Set(db.registrationSnapshots.map((s) => s.id));
      for (const snap of body.registrationSnapshots) {
        if (!snap?.id || existingIds.has(snap.id)) continue;
        db.registrationSnapshots.unshift({
          ...snap,
          members: Array.isArray(snap.members) ? snap.members : [],
        });
        existingIds.add(snap.id);
        changed = true;
      }
    }

    if (changed) {
      saveDb(db);
    }

    res.json({ ok: true, changed });
  });

  app.post('/api/reset-demo', (req: AuthenticatedRequest, res) => {
    if (!isBetaManagerRequest(req)) {
      return res.status(403).json({ error: 'Campus Official authentication required.' });
    }
    const db = resetDb();
    const { student } = getStudentForRequest(db, req);
    broadcastScopedTeamsReset(db);
    res.json({ ok: true, student });
  });

  // Vite dev middleware or production static assets
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT || 3000);
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Connectus server running on http://localhost:${PORT}`);
    // Run notification scheduler (24h/2h reminders, closing deadlines, 8 AM digest) every 5 minutes
    const timer = setInterval(() => {
      void runScheduledNotificationChecks()
        .then(({ created, flushed }) => {
          if (created.length > 0 || flushed.length > 0) {
            broadcastNotificationsAndRefresh({ notifications: [...created, ...flushed] });
          }
        })
        .catch(() => {});
    }, 5 * 60 * 1000);
    (timer as unknown as NodeJS.Timeout).unref();
  });
}

startServer();
