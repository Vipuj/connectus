import assert from 'node:assert/strict';

const BASE_URL = process.env.CONNECTUS_BASE_URL || 'http://127.0.0.1:3000';
const TEST_GUEST_KEY = `guest:smoke-${Date.now()}`;

async function jsonFetch<T>(path: string, init: RequestInit = {}): Promise<{ status: number; data: T }> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Connectus-Guest': TEST_GUEST_KEY,
      ...(init.headers || {}),
    },
  });
  const data = (await res.json()) as T;
  return { status: res.status, data };
}

async function main() {
  console.log(`Running Connectus flow verification against ${BASE_URL}...`);

  // 1. Bootstrap & Open-Beta Default Check
  const boot = await jsonFetch<{
    student: { id: string; telegramDeepLinkToken: string };
    colleges: Array<{ id: string }>;
    betaAccessSummary?: { enabled: boolean; maxSeats: number; usedSeats: number };
  }>('/api/bootstrap');
  assert.equal(boot.status, 200, 'Bootstrap must return 200');
  assert.equal(
    boot.data.betaAccessSummary?.enabled,
    false,
    'Beta gate must default to disabled so testers can sign in'
  );
  assert.ok(boot.data.colleges.length > 0, 'Colleges must be populated');
  console.log('✓ Bootstrap & open-access checks passed');

  // 2. Profile Persistence Check
  const savedProfile = await jsonFetch<{
    student: { displayName: string; phoneNumber?: string; collegeId: string; branch: string };
  }>('/api/student/profile', {
    method: 'POST',
    body: JSON.stringify({
      displayName: 'Smoke Test Student',
      phoneNumber: '+91 9876543210',
      collegeId: boot.data.colleges[0].id,
      branch: 'CSE',
      year: '2nd Year',
      course: 'B.Tech',
      semester: 'Sem 4',
      areaId: 'area-gachibowli',
      radiusKm: 20,
      interests: ['Hackathon', 'Workshop'],
      followedCollegeIds: [boot.data.colleges[0].id],
      onboardingCompleted: true,
      consentAccepted: true,
    }),
  });
  assert.equal(savedProfile.status, 200);
  assert.equal(savedProfile.data.student.displayName, 'Smoke Test Student');
  assert.equal(savedProfile.data.student.phoneNumber, '+91 9876543210');

  // Re-fetch bootstrap under same session and verify persisted fields survive
  const bootAfterProfile = await jsonFetch<{
    student: { displayName: string; phoneNumber?: string; telegramDeepLinkToken: string };
  }>('/api/bootstrap');
  assert.equal(bootAfterProfile.data.student.displayName, 'Smoke Test Student');
  assert.equal(bootAfterProfile.data.student.phoneNumber, '+91 9876543210');
  console.log('✓ Student profile persistence check passed');

  // 3. Feed Check & Poster Integrity
  const feed = await jsonFetch<{
    events: Array<{ id: string; status: string; posterUrl: string; regStatus: string; feeInr: number }>;
  }>('/api/feed?showAll=true');
  assert.equal(feed.status, 200);
  assert.ok(Array.isArray(feed.data.events) && feed.data.events.length > 0, 'Feed must return live events');
  for (const evt of feed.data.events) {
    if (evt.posterUrl.startsWith('data:image/')) {
      assert.ok(evt.posterUrl.length <= 350000, `Poster for ${evt.id} exceeds 350KB Firestore budget`);
      assert.ok(evt.posterUrl.includes(';base64,'), `Poster for ${evt.id} is malformed data URL`);
    }
  }
  console.log(`✓ Feed returned ${feed.data.events.length} events with intact posters`);

  // 4. Event Registration & Cancel Flow
  const targetEvt = feed.data.events.find((e) => e.status === 'published' && e.regStatus === 'open');
  if (targetEvt) {
    const regRes = await jsonFetch<{
      registration?: { id: string; passCode: string; qrPayload: string; status: string };
    }>(`/api/events/${encodeURIComponent(targetEvt.id)}/register`, {
      method: 'POST',
      body: JSON.stringify({
        participationType: 'individual',
        paymentMethod: targetEvt.feeInr > 0 ? 'UPI' : 'Free Pass',
        paymentRef: targetEvt.feeInr > 0 ? 'UTRSMOKE123456' : undefined,
      }),
    });
    assert.equal(regRes.status, 200, 'Registration should succeed');
    assert.ok(regRes.data.registration?.passCode, 'Pass code must be generated');
    assert.ok(
      regRes.data.registration?.qrPayload.startsWith('CONNECTUS:V1:'),
      'QR payload must use CONNECTUS:V1 scheme'
    );

    const cancelRes = await jsonFetch<{ registration?: { status: string } }>(
      `/api/events/${encodeURIComponent(targetEvt.id)}/cancel-registration`,
      { method: 'POST' }
    );
    assert.equal(cancelRes.status, 200);
    assert.equal(cancelRes.data.registration?.status, 'cancelled');
    console.log(`✓ Registration + QR pass + cancel flow passed on ${targetEvt.id}`);
  }

  // 5. Telegram Webhook & Notification Scheduler Check
  const token = bootAfterProfile.data.student.telegramDeepLinkToken;
  const webhookRes = await jsonFetch<{ ok: boolean; linked?: boolean }>('/api/telegram/webhook', {
    method: 'POST',
    body: JSON.stringify({
      message: {
        chat: { id: 99887766, username: 'smoke_tester' },
        text: `/start ${token}`,
      },
    }),
  });
  assert.equal(webhookRes.status, 200);
  assert.equal(webhookRes.data.ok, true);
  assert.equal(webhookRes.data.linked, true);

  const schedRes = await jsonFetch<{ createdCount: number; flushedCount: number }>(
    '/api/notifications/run-scheduler',
    { method: 'POST' }
  );
  assert.equal(schedRes.status, 200);
  assert.equal(typeof schedRes.data.createdCount, 'number');
  console.log('✓ Telegram webhook binding & scheduler endpoints passed');

  // 6. DPDP Self-Erasure Cleanup
  const eraseRes = await jsonFetch<{ student: { onboardingCompleted: boolean; mutedAll: boolean } }>(
    '/api/student/delete-account',
    { method: 'POST' }
  );
  assert.equal(eraseRes.status, 200);
  assert.equal(eraseRes.data.student.onboardingCompleted, false);
  assert.equal(eraseRes.data.student.mutedAll, true);
  console.log('✓ DPDP account deletion cleanup passed');

  console.log('All Connectus automated checks succeeded!');
}

main().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
