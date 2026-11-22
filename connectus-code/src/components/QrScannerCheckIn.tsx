import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import {
  Camera,
  CheckCircle2,
  CreditCard,
  ImageUp,
  QrCode,
  Search,
  UserCheck,
  XCircle,
} from 'lucide-react';
import type { CampusEvent, Registration } from '../types';
import { formatFee, formatIstFull } from '../utils/format';

export interface CheckInPayload {
  registrationId?: string;
  passCode?: string;
  qrPayload?: string;
  status?: 'checked_in' | 'confirmed';
  verifyPayment?: boolean;
}

interface QrScannerCheckInProps {
  event: CampusEvent;
  registrations: Registration[];
  onCheckIn: (eventId: string, payload: CheckInPayload) => Promise<Registration | null>;
}

export function QrScannerCheckIn({
  event,
  registrations,
  onCheckIn,
}: QrScannerCheckInProps) {
  const [codeInput, setCodeInput] = useState('');
  const [rosterSearch, setRosterSearch] = useState('');
  const [onlyPendingFees, setOnlyPendingFees] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [scanResult, setScanResult] = useState<{
    ok: boolean;
    message: string;
    reg?: Registration;
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const confirmedCount = registrations.filter(
    (r) => r.status === 'confirmed' || r.status === 'checked_in'
  ).length;
  const checkedInCount = registrations.filter((r) => r.status === 'checked_in').length;
  const waitlistCount = registrations.filter((r) => r.status === 'waitlisted').length;
  const pendingPaymentCount = registrations.filter(
    (r) => r.status === 'confirmed' && r.paymentStatus === 'pending_verification'
  ).length;

  function stopCamera() {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
    setCameraOpen(false);
  }

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) track.stop();
      }
    };
  }, []);

  async function processScannedOrEntered(rawValue: string) {
    const trimmed = rawValue.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setScanResult(null);
    try {
      const payload: CheckInPayload =
        trimmed.startsWith('CONNECTUS:V1:') || trimmed.startsWith('CAMPUSPULSE:V1:')
          ? { qrPayload: trimmed, status: 'checked_in' }
          : { passCode: trimmed.toUpperCase(), status: 'checked_in' };

      const updated = await onCheckIn(event.id, payload);
      if (updated) {
        setScanResult({
          ok: true,
          message: `Checked in ${updated.userName} (${updated.passCode})`,
          reg: updated,
        });
        setCodeInput('');
      }
    } catch (err) {
      setScanResult({
        ok: false,
        message: err instanceof Error ? err.message : 'Could not verify pass.',
      });
    } finally {
      setBusy(false);
    }
  }

  async function startCameraScanner() {
    setScanResult(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setScanResult({
        ok: false,
        message: 'Camera access is unavailable in this browser. Upload a QR pass image or enter the Pass Code instead.',
      });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      setCameraOpen(true);

      requestAnimationFrame(() => {
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        void video.play();

        const tick = () => {
          const v = videoRef.current;
          const canvas = canvasRef.current;
          if (!v || !canvas || !streamRef.current) return;
          if (v.readyState === v.HAVE_ENOUGH_DATA && v.videoWidth > 0) {
            canvas.width = v.videoWidth;
            canvas.height = v.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
              const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const decoded = jsQR(imgData.data, imgData.width, imgData.height);
              if (decoded?.data) {
                stopCamera();
                void processScannedOrEntered(decoded.data);
                return;
              }
            }
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      });
    } catch {
      stopCamera();
      setScanResult({
        ok: false,
        message: 'Camera permission was blocked or unavailable. Use "Scan QR Image" or type the Pass Code.',
      });
    }
  }

  function handleQrImageUpload(file: File | undefined) {
    if (!file) return;
    setScanResult(null);
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const decoded = jsQR(imageData.data, imageData.width, imageData.height);
        if (!decoded?.data) {
          setScanResult({
            ok: false,
            message: 'No Connectus QR code detected in that image. Try a clearer pass screenshot or enter the Pass Code.',
          });
          return;
        }
        void processScannedOrEntered(decoded.data);
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  }

  const normalizedQuery = rosterSearch.trim().toLowerCase();
  const baseRegs = onlyPendingFees
    ? registrations.filter((r) => r.paymentStatus === 'pending_verification')
    : registrations;
  const visibleRegistrations = normalizedQuery
    ? baseRegs.filter(
        (r) =>
          r.userName.toLowerCase().includes(normalizedQuery) ||
          r.passCode.toLowerCase().includes(normalizedQuery) ||
          (r.teamName || '').toLowerCase().includes(normalizedQuery) ||
          (r.collegeShortName || '').toLowerCase().includes(normalizedQuery)
      )
    : baseRegs;

  return (
    <div className="p-4 rounded-[14px] bg-[var(--paper-raised)] border border-[var(--border-ink)] space-y-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink)] flex items-center gap-1.5">
          <QrCode className="w-4 h-4 text-[var(--crimson)]" />
          <span>Event-Day QR Gate &amp; Check-In Roster</span>
        </div>
        <div className="text-[11px] font-mono tabular-nums text-[var(--ink-2)]">
          <strong className="text-[var(--ink)]">{checkedInCount}</strong>/{confirmedCount} checked in ·{' '}
          <strong className={pendingPaymentCount > 0 ? 'text-[var(--amber-ink)]' : 'text-[var(--ink)]'}>
            {pendingPaymentCount}
          </strong>{' '}
          fee pending · {waitlistCount} waitlisted
        </div>
      </div>

      {/* Scanner Controls */}
      <div className="p-3 bg-[var(--paper-app)] border border-[var(--border-warm)] rounded-[12px] space-y-2.5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void processScannedOrEntered(codeInput);
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-[var(--ink-2)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              placeholder="Enter Pass Code (e.g. CP-DECCAN-84K2M1) or paste QR payload..."
              className="paper-input w-full min-h-[38px] pl-8 pr-3 py-1.5 text-xs font-mono"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="submit"
              disabled={busy || !codeInput.trim()}
              className="paper-btn-primary min-h-[38px] px-3.5 py-1.5 text-xs"
            >
              {busy ? 'Checking...' : 'Verify & Check In'}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                handleQrImageUpload(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="paper-btn-secondary min-h-[38px] px-3 py-1.5 text-xs inline-flex items-center gap-1.5"
            >
              <ImageUp className="w-3.5 h-3.5" />
              <span>Scan QR Image</span>
            </button>

            <button
              type="button"
              onClick={() => (cameraOpen ? stopCamera() : void startCameraScanner())}
              className={`min-h-[38px] px-3 py-1.5 text-xs inline-flex items-center gap-1.5 ${
                cameraOpen
                  ? 'paper-btn-crimson'
                  : 'paper-btn-secondary'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>{cameraOpen ? 'Stop Camera' : 'Camera Scan'}</span>
            </button>
          </div>
        </form>

        {cameraOpen && (
          <div className="relative rounded-[10px] overflow-hidden border border-[var(--border-ink)] bg-[var(--ink)] max-w-xs mx-auto">
            <video ref={videoRef} playsInline muted className="w-full h-48 object-cover" />
            <canvas ref={canvasRef} className="hidden" />
            <div className="px-2.5 py-1.5 text-[11px] font-mono text-center text-[var(--on-ink)] bg-[var(--ink)]">
              Point camera at student&apos;s Connectus QR Pass
            </div>
          </div>
        )}

        {scanResult && (
          <div
            className={`p-3 rounded-[10px] border text-xs flex items-start gap-2 ${
              scanResult.ok
                ? 'bg-[var(--olive-tint)] border-[var(--olive-border)] text-[var(--ink)]'
                : 'bg-[var(--crimson-tint)] border-[var(--crimson)] text-[var(--crimson)]'
            }`}
          >
            {scanResult.ok ? (
              <CheckCircle2 className="w-4 h-4 text-[var(--olive)] shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-4 h-4 text-[var(--crimson)] shrink-0 mt-0.5" />
            )}
            <div className="space-y-0.5">
              <div className="font-semibold">{scanResult.message}</div>
              {scanResult.reg && (
                <div className="text-[11px] font-mono text-[var(--olive)]">
                  {scanResult.reg.collegeShortName || 'Student'} ·{' '}
                  {scanResult.reg.paymentStatus === 'free'
                    ? 'Free Pass'
                    : scanResult.reg.paymentStatus === 'paid_verified'
                      ? `Paid ${formatFee(scanResult.reg.amountPaidInr)} Verified`
                      : `Payment Pending (${formatFee(event.feeInr)})`}
                  {scanResult.reg.teamName ? ` · Team: ${scanResult.reg.teamName}` : ''}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Attendee Search + List */}
      {registrations.length === 0 ? (
        <div className="text-xs text-[var(--ink-2)]">
          No active student registrations for this event yet.
        </div>
      ) : (
        <div className="space-y-2.5">
          {(registrations.length > 3 || pendingPaymentCount > 0) && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              {registrations.length > 3 && (
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-[var(--ink-2)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="search"
                    value={rosterSearch}
                    onChange={(e) => setRosterSearch(e.target.value)}
                    placeholder="Filter roster by student name, team, college, or pass code..."
                    className="paper-input w-full min-h-[36px] pl-8 pr-3 py-1 text-xs"
                  />
                </div>
              )}
              {pendingPaymentCount > 0 && (
                <button
                  type="button"
                  aria-pressed={onlyPendingFees}
                  onClick={() => setOnlyPendingFees((prev) => !prev)}
                  className={`min-h-[36px] px-3 py-1 text-xs font-semibold inline-flex items-center gap-1.5 border shrink-0 ${
                    onlyPendingFees
                      ? 'bg-[var(--ink)] text-[var(--on-ink)] border-[var(--ink)]'
                      : 'border-[var(--amber-border)] bg-[var(--amber-tint)] text-[var(--amber-ink)] hover:bg-[var(--feel-tint)]'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>
                    {onlyPendingFees
                      ? `Showing Pending Fees (${pendingPaymentCount})`
                      : `Verify Pending Fees (${pendingPaymentCount})`}
                  </span>
                </button>
              )}
            </div>
          )}

          <div className="divide-y divide-[var(--border-warm)] bg-[var(--paper-input)] border border-[var(--border-ink)] rounded-[12px] overflow-hidden">
            {visibleRegistrations.length === 0 ? (
              <div className="px-3.5 py-4 text-xs text-[var(--ink-2)]">
                No attendees match &ldquo;{rosterSearch}&rdquo;.
              </div>
            ) : (
              visibleRegistrations.map((reg) => (
                <div
                  key={reg.id}
                  className="px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="font-semibold text-[var(--ink)] flex flex-wrap items-center gap-x-2">
                      <span>{reg.userName}</span>
                      {reg.collegeShortName && (
                        <span className="text-[11px] font-normal text-[var(--ink-2)]">
                          ({reg.collegeShortName})
                        </span>
                      )}
                      {reg.teamName && (
                        <span className="text-[11px] font-medium text-[var(--crimson)]">
                          · Team: {reg.teamName}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-mono tabular-nums text-[var(--ink-2)] flex flex-wrap items-center gap-x-2">
                      <span>{reg.passCode}</span>
                      <span aria-hidden="true">·</span>
                      <span>{reg.status.replace('_', ' ')}</span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={
                          reg.paymentStatus === 'pending_verification'
                            ? 'text-[var(--amber-ink)] font-semibold'
                            : 'text-[var(--olive)] font-medium'
                        }
                      >
                        {reg.paymentStatus === 'free'
                          ? 'Free'
                          : reg.paymentStatus === 'paid_verified'
                            ? `Paid ${formatFee(reg.amountPaidInr)}${reg.paymentRef ? ` (${reg.paymentRef})` : ''}`
                            : `Fee Pending (${formatFee(event.feeInr)})`}
                      </span>
                      {reg.checkedInAt && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>In at {formatIstFull(reg.checkedInAt)} IST</span>
                        </>
                      )}
                    </div>
                  </div>

                  {reg.status !== 'waitlisted' && (
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {reg.paymentStatus === 'pending_verification' && event.feeInr > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            void onCheckIn(event.id, {
                              registrationId: reg.id,
                              verifyPayment: true,
                            })
                          }
                          className="min-h-[34px] px-2.5 py-1 border border-[var(--amber-border)] bg-[var(--amber-tint)] hover:bg-[var(--feel-tint)] text-[var(--amber-ink)] font-semibold inline-flex items-center gap-1"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Verify Fee</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          void onCheckIn(event.id, {
                            registrationId: reg.id,
                            status: reg.status === 'checked_in' ? 'confirmed' : 'checked_in',
                          })
                        }
                        className={`min-h-[34px] px-3 py-1 font-semibold inline-flex items-center gap-1.5 border ${
                          reg.status === 'checked_in'
                            ? 'bg-[var(--olive-tint)] text-[var(--olive)] border-[var(--olive-border)]'
                            : 'paper-btn-ink'
                        }`}
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>
                          {reg.status === 'checked_in' ? 'Checked In' : 'Mark Checked In'}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
