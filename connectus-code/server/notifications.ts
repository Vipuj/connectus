import type { CampusEvent, NotificationItem, StudentProfile } from '../src/types';
import { evaluateStudentEventMatch } from '../src/utils/skills';
import { createGuestStudent, HYDERABAD_AREAS, HYDERABAD_COLLEGES, loadDb, saveDb } from './store';

export function formatIstDateTime(isoUtc: string): string {
  const date = new Date(isoUtc);
  if (isNaN(date.getTime())) return isoUtc;
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

export function getIstHourMinute(date = new Date()): { hour: number; minute: number; dateKey: string } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return {
    hour: Number(map.hour ?? 12),
    minute: Number(map.minute ?? 0),
    dateKey: `${map.year}-${map.month}-${map.day}`,
  };
}

export function isWithinQuietHours(student: StudentProfile, now = new Date()): boolean {
  if (!student.quietHours.enabled) return false;
  const { hour, minute } = getIstHourMinute(now);
  const currentMins = hour * 60 + minute;

  const [sh, sm] = student.quietHours.start.split(':').map(Number);
  const [eh, em] = student.quietHours.end.split(':').map(Number);
  const startMins = sh * 60 + sm;
  const endMins = eh * 60 + em;

  if (startMins > endMins) {
    // Spans midnight (e.g. 22:00 -> 07:00)
    return currentMins >= startMins || currentMins < endMins;
  }
  return currentMins >= startMins && currentMins < endMins;
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export async function dispatchRealTelegramIfConfigured(
  text: string,
  targetChatId?: string
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = (targetChatId || process.env.TELEGRAM_DEMO_CHAT_ID || '').trim();
  if (!token || !chatId) return false;
  try {
    const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
    });
    return resp.ok;
  } catch {
    return false;
  }
}

export async function queueAndDispatchNotification(params: {
  event: CampusEvent;
  kind: NotificationItem['kind'];
  title: string;
  customMessage?: string;
  critical?: boolean;
  targetStudent?: StudentProfile;
}): Promise<NotificationItem | null> {
  const db = loadDb();
  const student = params.targetStudent || db.student;
  const dedupeKey = `${params.kind}:${student.id}:${params.event.id}`;

  // Dedupe check (unless it's a change notice which can occur multiple times)
  if (
    params.kind !== 'event_change' &&
    db.notifications.some((n) => n.dedupeKey === dedupeKey)
  ) {
    return null;
  }

  const college = HYDERABAD_COLLEGES.find((c) => c.id === params.event.collegeId);
  const area = HYDERABAD_AREAS.find((a) => a.id === params.event.areaId);
  const istStart = formatIstDateTime(params.event.startAt);
  const istDeadline = formatIstDateTime(params.event.regDeadline);
  const eligibility =
    params.event.audience === 'host_college_only'
      ? `${college?.shortName || 'Host college'} only`
      : `Open to all · ${params.event.branches.join(', ')}`;

  const body =
    params.customMessage ||
    `${params.event.title}\nWhen: ${istStart} IST\nWhere: ${params.event.venueName} (${area?.name || 'India'})\nEligibility: ${eligibility}\nDeadline: ${istDeadline} IST\nRegister: ${params.event.regLink}\n\nReply /mute to pause non-urgent alerts.`;

  const now = new Date();
  const todayKey = getIstHourMinute(now).dateKey;
  const nonCriticalSentToday = db.notifications.filter(
    (n) =>
      n.userId === student.id &&
      n.status === 'sent' &&
      n.kind !== 'event_change' &&
      n.kind !== 'waitlist_promoted' &&
      n.kind !== 'priority_skill_low_seats' &&
      n.sentAt &&
      getIstHourMinute(new Date(n.sentAt)).dateKey === todayKey
  ).length;

  let status: NotificationItem['status'] = 'sent';
  let sentAt: string | null = now.toISOString();

  if (student.mutedAll || student.mutedEventIds.includes(params.event.id)) {
    status = 'muted';
    sentAt = null;
  } else if (!params.critical && isWithinQuietHours(student, now)) {
    status = 'held_quiet_hours';
    sentAt = null;
  } else if (!params.critical && nonCriticalSentToday >= 3) {
    status = 'capped_daily';
    sentAt = null;
  } else if (params.kind === 'morning_digest') {
    status = 'queued';
    sentAt = null;
  }

  const item: NotificationItem = {
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    userId: student.id,
    eventId: params.event.id,
    eventTitle: params.event.title,
    kind: params.kind,
    channel: 'telegram',
    title: params.title,
    body,
    sendAfter: now.toISOString(),
    sentAt,
    status,
    dedupeKey: params.kind === 'event_change' ? `${dedupeKey}:${Date.now()}` : dedupeKey,
  };

  db.notifications.unshift(item);
  saveDb(db);

  if (status === 'sent' && student.telegramConnected) {
    await dispatchRealTelegramIfConfigured(`${item.title}\n\n${item.body}`, student.telegramChatId);
  }

  return item;
}

export async function evaluatePriorityLowSeatAlertsForStudent(
  student: StudentProfile
): Promise<NotificationItem[]> {
  if (student.priorityLowSeatAlerts === false) return [];
  const hasSkills =
    (Array.isArray(student.skills) && student.skills.length > 0) ||
    (Array.isArray(student.learningGoals) && student.learningGoals.length > 0);
  if (!hasSkills) return [];

  const db = loadDb();
  const nowMs = Date.now();
  const created: NotificationItem[] = [];

  for (const evt of db.events) {
    if (evt.status !== 'published' || evt.regStatus !== 'open') continue;
    if (new Date(evt.endAt).getTime() < nowMs) continue;
    if (
      evt.audience === 'host_college_only' &&
      (student.collegeId !== evt.collegeId || !student.collegeVerified)
    ) {
      continue;
    }

    const alreadyRegistered = db.registrations.some(
      (r) => r.eventId === evt.id && r.userId === student.id && r.status !== 'cancelled'
    );
    if (alreadyRegistered) continue;

    const match = evaluateStudentEventMatch(student, evt);
    if (match.matchedSkills.length === 0 && match.matchedGoals.length === 0) continue;
    if (!match.isFillingFast) continue;

    const college = HYDERABAD_COLLEGES.find((c) => c.id === evt.collegeId);
    const matchedLabels = [...match.matchedSkills, ...match.matchedGoals].slice(0, 2);
    const istStart = formatIstDateTime(evt.startAt);
    const title = `Priority · ${match.seatsLeft} ${match.seatsLeft === 1 ? 'seat' : 'seats'} left`;
    const body = `Skill match (${matchedLabels.join(', ')}): ${evt.title} at ${college?.shortName || 'Campus India'}.\n${match.urgencyLabel || 'Seats filling quickly!'}\nWhen: ${istStart} IST\nVenue: ${evt.venueName}`;

    const notif = await queueAndDispatchNotification({
      event: evt,
      kind: 'priority_skill_low_seats',
      title,
      customMessage: body,
      critical: match.seatsLeft <= 15,
      targetStudent: student,
    });
    if (notif) {
      created.push(notif);
    }
  }

  return created;
}

export async function triggerPriorityLowSeatAlertsForEvent(
  evt: CampusEvent
): Promise<NotificationItem[]> {
  if (evt.status !== 'published' || evt.regStatus !== 'open') return [];
  const db = loadDb();
  const seatsLeft = Math.max(0, evt.capacity - evt.confirmedCount);
  const fillRatio = evt.capacity > 0 ? evt.confirmedCount / evt.capacity : 0;
  if (seatsLeft === 0 || (fillRatio < 0.7 && seatsLeft > 15)) {
    return [];
  }

  const allStudents = Object.values(db.students || {});
  const targets = allStudents.length > 0 ? allStudents : [db.student];
  const created: NotificationItem[] = [];
  const college = HYDERABAD_COLLEGES.find((c) => c.id === evt.collegeId);
  const istStart = formatIstDateTime(evt.startAt);

  for (const stu of targets) {
    if (stu.priorityLowSeatAlerts === false) continue;
    const alreadyRegistered = db.registrations.some(
      (r) => r.eventId === evt.id && r.userId === stu.id && r.status !== 'cancelled'
    );
    if (alreadyRegistered) continue;

    const match = evaluateStudentEventMatch(stu, evt);
    if (match.matchedSkills.length === 0 && match.matchedGoals.length === 0) continue;

    const matchedLabels = [...match.matchedSkills, ...match.matchedGoals].slice(0, 2);
    const notif = await queueAndDispatchNotification({
      event: evt,
      kind: 'priority_skill_low_seats',
      title: `Priority · ${match.seatsLeft} ${match.seatsLeft === 1 ? 'seat' : 'seats'} left`,
      customMessage: `Skill match (${matchedLabels.join(', ')}): ${evt.title} at ${college?.shortName || 'Campus India'}.\n${match.urgencyLabel || 'Seats filling quickly!'}\nWhen: ${istStart} IST\nVenue: ${evt.venueName}`,
      critical: match.seatsLeft <= 15,
      targetStudent: stu,
    });
    if (notif) {
      created.push(notif);
    }
  }

  return created;
}

export async function triggerPublishNotifications(event: CampusEvent): Promise<NotificationItem[]> {
  const db = loadDb();
  const college = HYDERABAD_COLLEGES.find((c) => c.id === event.collegeId);
  const allStudents = Object.values(db.students || {});
  const targets = allStudents.length > 0 ? allStudents : [db.student];
  const created: NotificationItem[] = [];

  const lowSeatAlerts = await triggerPriorityLowSeatAlertsForEvent(event);
  created.push(...lowSeatAlerts);

  for (const stu of targets) {
    if (
      event.audience === 'host_college_only' &&
      (stu.collegeId !== event.collegeId || !stu.collegeVerified)
    ) {
      continue;
    }

    const stuArea = HYDERABAD_AREAS.find((a) => a.id === stu.areaId);
    const originLat = typeof stu.locationLat === 'number' ? stu.locationLat : stuArea?.lat;
    const originLng = typeof stu.locationLng === 'number' ? stu.locationLng : stuArea?.lng;
    const distanceKm =
      typeof originLat === 'number' && typeof originLng === 'number'
        ? haversineKm(originLat, originLng, event.lat, event.lng)
        : 999;

    const isFollowed = stu.followedCollegeIds.includes(event.collegeId);
    const matchesInterest = stu.interests.includes(event.type);

    if (isFollowed) {
      const notif = await queueAndDispatchNotification({
        event,
        kind: 'followed_college',
        title: `New from ${college?.shortName || 'Followed College'}`,
        critical: false,
        targetStudent: stu,
      });
      if (notif) created.push(notif);
    } else if (distanceKm <= stu.radiusKm && matchesInterest) {
      const notif = await queueAndDispatchNotification({
        event,
        kind: 'morning_digest',
        title: `Queued for 8:00 AM Digest (${distanceKm} km away)`,
        critical: false,
        targetStudent: stu,
      });
      if (notif) created.push(notif);
    }
  }

  return created;
}

export async function triggerEventChangeNotifications(params: {
  event: CampusEvent;
  title: string;
  customMessage: string;
  critical: boolean;
}): Promise<NotificationItem[]> {
  const db = loadDb();
  const byUserId = new Map<string, StudentProfile>();
  for (const stu of Object.values(db.students || {})) {
    byUserId.set(stu.id, stu);
  }

  const targetStudents = new Map<string, StudentProfile>();
  for (const reg of db.registrations) {
    if (reg.eventId === params.event.id && reg.status !== 'cancelled') {
      const stu = byUserId.get(reg.userId);
      if (stu) targetStudents.set(stu.id, stu);
    }
  }
  for (const stu of byUserId.values()) {
    if (stu.followedCollegeIds.includes(params.event.collegeId)) {
      targetStudents.set(stu.id, stu);
    }
  }

  if (targetStudents.size === 0) {
    const single = await queueAndDispatchNotification({
      event: params.event,
      kind: 'event_change',
      title: params.title,
      customMessage: params.customMessage,
      critical: params.critical,
    });
    return single ? [single] : [];
  }

  const created: NotificationItem[] = [];
  for (const stu of targetStudents.values()) {
    const notif = await queueAndDispatchNotification({
      event: params.event,
      kind: 'event_change',
      title: params.title,
      customMessage: params.customMessage,
      critical: params.critical,
      targetStudent: stu,
    });
    if (notif) created.push(notif);
  }
  return created;
}

export async function notifyCollegeOfficialsOfSubmission(params: {
  event: CampusEvent;
  clubName: string;
  submitterName: string;
  isRevision?: boolean;
}): Promise<{ notifications: NotificationItem[]; officialUserIds: string[] }> {
  const db = loadDb();
  const officials = db.organizers.filter(
    (o) =>
      o.status === 'approved' &&
      o.memberRole === 'college_official' &&
      o.collegeId === params.event.collegeId
  );

  const studentByEmail = new Map<string, StudentProfile>();
  for (const stu of Object.values(db.students || {})) {
    if (stu.email) {
      studentByEmail.set(stu.email.trim().toLowerCase(), stu);
    }
  }

  const targetStudents = new Map<string, StudentProfile>();
  const officialUserIds = new Set<string>();

  for (const off of officials) {
    let matchedAny = false;
    if (off.authUid) {
      officialUserIds.add(off.authUid);
      const byUid = db.students?.[`uid:${off.authUid}`] || db.students?.[off.authUid];
      if (byUid) {
        targetStudents.set(byUid.id, byUid);
        matchedAny = true;
      }
    }
    const cleanEmail = off.email.trim().toLowerCase();
    const byEmail = studentByEmail.get(cleanEmail);
    if (byEmail) {
      officialUserIds.add(byEmail.id);
      targetStudents.set(byEmail.id, byEmail);
      matchedAny = true;
    }
    if (!matchedAny && cleanEmail) {
      const pendingKey = `email:${cleanEmail}`;
      const syntheticOfficial = createGuestStudent(pendingKey);
      syntheticOfficial.email = cleanEmail;
      syntheticOfficial.displayName = off.contactName;
      syntheticOfficial.quietHours = { enabled: false, start: '22:00', end: '07:00' };
      syntheticOfficial.mutedAll = false;
      targetStudents.set(pendingKey, syntheticOfficial);
    }
  }

  const notifications: NotificationItem[] = [];
  const title = params.isRevision
    ? `Revision Needs Approval · ${params.event.title}`
    : `Club Submission Needs Approval · ${params.event.title}`;
  const customMessage = params.isRevision
    ? `${params.clubName} (${params.submitterName}) queued material edits on "${params.event.title}".\nOpen Officials Console -> Club Approvals to review.`
    : `${params.clubName} (${params.submitterName}) submitted "${params.event.title}" for Campus Official approval.\nOpen Officials Console -> Club Approvals to approve or request changes.`;

  for (const stu of targetStudents.values()) {
    const notif = await queueAndDispatchNotification({
      event: params.event,
      kind: 'event_change',
      title,
      customMessage,
      critical: true,
      targetStudent: stu,
    });
    if (notif) notifications.push(notif);
  }

  return {
    notifications,
    officialUserIds: Array.from(officialUserIds),
  };
}

export async function runScheduledNotificationChecks(now = new Date()): Promise<{
  created: NotificationItem[];
  flushed: NotificationItem[];
}> {
  const db = loadDb();
  const nowMs = now.getTime();
  const { hour: istHour } = getIstHourMinute(now);
  const studentById = new Map<string, StudentProfile>();
  for (const stu of Object.values(db.students || {})) {
    studentById.set(stu.id, stu);
  }

  const created: NotificationItem[] = [];

  for (const evt of db.events) {
    if (evt.status !== 'published') continue;
    const startMs = new Date(evt.startAt).getTime();
    const deadlineMs = new Date(evt.regDeadline).getTime();
    const hoursToStart = (startMs - nowMs) / (3600 * 1000);
    const hoursToDeadline = (deadlineMs - nowMs) / (3600 * 1000);

    // 1. Registered attendees: 24h and 2h pre-event reminders
    const activeRegs = db.registrations.filter(
      (r) =>
        r.eventId === evt.id &&
        (r.status === 'confirmed' || r.status === 'checked_in')
    );

    if (hoursToStart > 0 && hoursToStart <= 24.5) {
      const is2hWindow = hoursToStart <= 2.25;
      const kind: NotificationItem['kind'] = is2hWindow ? 'reminder_2h' : 'reminder_24h';
      const title = is2hWindow
        ? `Starts in <2h · ${evt.title}`
        : `Tomorrow · ${evt.title}`;
      for (const reg of activeRegs) {
        const stu = studentById.get(reg.userId);
        if (!stu) continue;
        const notif = await queueAndDispatchNotification({
          event: evt,
          kind,
          title,
          customMessage: `Your pass (${reg.passCode}) is ready for ${evt.title}.\nVenue: ${evt.venueName}\nStarts: ${formatIstDateTime(evt.startAt)} IST\nOpen Connectus -> Tickets to show your QR code at the gate.`,
          critical: is2hWindow,
          targetStudent: stu,
        });
        if (notif) created.push(notif);
      }
    }

    // 2. Saved/followed un-registered students: 24h registration deadline alert
    if (evt.regStatus === 'open' && hoursToDeadline > 0 && hoursToDeadline <= 24.5) {
      for (const stu of studentById.values()) {
        if (
          evt.audience === 'host_college_only' &&
          (stu.collegeId !== evt.collegeId || !stu.collegeVerified)
        ) {
          continue;
        }
        const alreadyReg = db.registrations.some(
          (r) => r.eventId === evt.id && r.userId === stu.id && r.status !== 'cancelled'
        );
        if (alreadyReg) continue;
        const cares =
          (stu.savedEventIds || []).includes(evt.id) ||
          (stu.followedCollegeIds || []).includes(evt.collegeId);
        if (!cares) continue;
        const notif = await queueAndDispatchNotification({
          event: evt,
          kind: 'deadline_24h',
          title: `Closing Soon · ${evt.title}`,
          customMessage: `Registration closes ${formatIstDateTime(evt.regDeadline)} IST for ${evt.title}.\n${Math.max(0, evt.capacity - evt.confirmedCount)} seats remaining.`,
          critical: false,
          targetStudent: stu,
        });
        if (notif) created.push(notif);
      }
    }
  }

  // 3. Auto-flush morning digest at >= 8:00 IST & release held quiet-hour alerts once quiet hours end
  const latestDb = loadDb();
  const flushed: NotificationItem[] = [];
  for (const n of latestDb.notifications) {
    const stu = studentById.get(n.userId);
    if (!stu || stu.mutedAll) continue;
    if (n.status === 'queued' && istHour >= 8) {
      n.status = 'sent';
      n.sentAt = now.toISOString();
      flushed.push(n);
    } else if (n.status === 'held_quiet_hours' && !isWithinQuietHours(stu, now)) {
      n.status = 'sent';
      n.sentAt = now.toISOString();
      flushed.push(n);
    }
  }
  if (flushed.length > 0) {
    saveDb(latestDb);
    for (const item of flushed) {
      const stu = studentById.get(item.userId);
      if (stu?.telegramConnected) {
        await dispatchRealTelegramIfConfigured(
          `${item.title}\n\n${item.body}`,
          stu.telegramChatId
        );
      }
    }
  }

  return { created, flushed };
}

