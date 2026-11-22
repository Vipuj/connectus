import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'qrcode';
import {
  Camera,
  Check,
  Copy,
  Download,
  Loader2,
  MapPin,
  Phone,
  Printer,
  ShieldAlert,
  UserCheck,
  X,
} from 'lucide-react';
import type { FeedEvent, Registration, StudentProfile } from '../types';
import {
  formatFee,
  formatIstDate,
  formatIstTime,
  resizeAvatarImage,
} from '../utils/format';
import { ConnectusLogo } from './ConnectusLogo';

interface QrPassModalProps {
  open: boolean;
  event: FeedEvent | null;
  registration: Registration | null;
  waitlistPosition?: number | null;
  student?: StudentProfile | null;
  onUpdatePassPhoto?: (
    eventId: string,
    registrationId: string,
    photoUrl: string
  ) => Promise<void>;
  onClose: () => void;
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let current = words[0];
  for (let i = 1; i < words.length; i += 1) {
    const candidate = `${current} ${words[i]}`;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = words[i];
    }
  }
  lines.push(current);
  return lines;
}

function loadCanvasImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = src;
  });
}

export function QrPassModal({
  open,
  event,
  registration,
  waitlistPosition,
  student,
  onUpdatePassPhoto,
  onClose,
}: QrPassModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [printCycle, setPrintCycle] = useState(0);
  const [isPrinting, setIsPrinting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [downloadingPass, setDownloadingPass] = useState(false);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (!open || !registration?.qrPayload) {
      setQrDataUrl('');
      setIsPrinting(false);
      return;
    }

    let cancelled = false;
    QRCode.toDataURL(registration.qrPayload, {
      width: 360,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#251911',
        light: '#fef9ef',
      },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl('');
      });

    setPhotoError(null);
    setPrintCycle((c) => c + 1);
    setIsPrinting(!reducedMotion);

    return () => {
      cancelled = true;
    };
  }, [open, registration?.qrPayload, reducedMotion]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open || !event || !registration) return null;

  const isCheckedIn = registration.status === 'checked_in';
  const isWaitlisted = registration.status === 'waitlisted';
  const resolvedPhoto = registration.attendeePhotoUrl || student?.photoUrl || '';

  const initials = (registration.userName || 'ST')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');

  const statusText = isPrinting
    ? 'Printing E-Ticket…'
    : isWaitlisted
      ? `Waitlist Pass #${waitlistPosition || 1}`
      : isCheckedIn
        ? 'Checked In · Valid'
        : 'Official Entry Pass Ready';

  const badgeLabel = isWaitlisted
    ? `WAITLIST #${waitlistPosition || 1}`
    : isCheckedIn
      ? 'CHECKED IN'
      : 'CONFIRMED PASS';

  const entryFeeText =
    registration.paymentStatus === 'free' || event.feeInr === 0
      ? 'Free Entry'
      : registration.paymentStatus === 'paid_verified'
        ? `Paid (${formatFee(registration.amountPaidInr || event.feeInr)})`
        : `${formatFee(event.feeInr)} · Verify at Gate`;

  const academicParts = [
    registration.rollNumber,
    registration.branch,
    registration.year,
  ].filter(Boolean);

  const attendeeAcademic = academicParts.join(' · ');
  const attendeeCollege =
    registration.collegeShortName || student?.customCollegeName || '';

  const teamLabel = registration.teamName
    ? `Team: ${registration.teamName}`
    : registration.participationType === 'team'
      ? 'Team Entry'
      : 'Individual Entry';

  const prerequisitesList = (event.prerequisites || [])
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, 3);

  function handleCopyCode() {
    if (!registration) return;
    navigator.clipboard?.writeText(registration.passCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownloadQrOnly() {
    if (!qrDataUrl || !registration) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `${registration.passCode}-QR.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function handleDownloadCompositePass() {
    if (!qrDataUrl || !registration || !event || downloadingPass) return;
    setDownloadingPass(true);
    try {
      const W = 760;
      const H = 1120;
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        handleDownloadQrOnly();
        return;
      }

      // Warm-paper official pass sheet background
      ctx.fillStyle = '#fbf6ed';
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = '#251911';
      ctx.lineWidth = 4;
      ctx.strokeRect(18, 18, W - 36, H - 36);

      // Header crimson strip
      ctx.fillStyle = '#a31c24';
      ctx.fillRect(18, 18, W - 36, 74);

      ctx.fillStyle = '#fef9ef';
      ctx.font = '800 24px sans-serif';
      ctx.fillText('CONNECTUS · OFFICIAL ENTRY PASS', 42, 64);

      ctx.font = '700 16px monospace';
      const badgeW = ctx.measureText(badgeLabel).width;
      ctx.fillText(badgeLabel, W - 42 - badgeW, 63);

      // Attendee Photo Box
      const photoX = 42;
      const photoY = 120;
      const photoSize = 132;
      ctx.fillStyle = '#efe5d4';
      ctx.fillRect(photoX, photoY, photoSize, photoSize);
      ctx.strokeStyle = '#251911';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(photoX, photoY, photoSize, photoSize);

      if (resolvedPhoto) {
        try {
          const pImg = await loadCanvasImage(resolvedPhoto);
          const scale = Math.max(photoSize / pImg.width, photoSize / pImg.height);
          const sw = photoSize / scale;
          const sh = photoSize / scale;
          const sx = (pImg.width - sw) / 2;
          const sy = (pImg.height - sh) / 2;
          ctx.drawImage(pImg, sx, sy, sw, sh, photoX, photoY, photoSize, photoSize);
          ctx.strokeRect(photoX, photoY, photoSize, photoSize);
        } catch {
          ctx.fillStyle = '#251911';
          ctx.font = '800 36px sans-serif';
          ctx.fillText(initials || 'ID', photoX + 40, photoY + 78);
        }
      } else {
        ctx.fillStyle = '#251911';
        ctx.font = '800 36px sans-serif';
        ctx.fillText(initials || 'ID', photoX + 40, photoY + 78);
      }

      // Attendee Identity Text
      const idX = photoX + photoSize + 24;
      const idMaxW = W - idX - 42;
      ctx.fillStyle = '#6f5c4d';
      ctx.font = '700 13px monospace';
      ctx.fillText('ATTENDEE IDENTITY', idX, 138);

      ctx.fillStyle = '#251911';
      ctx.font = '800 28px sans-serif';
      const nameLines = wrapCanvasText(ctx, registration.userName, idMaxW).slice(0, 2);
      let cursorY = 172;
      for (const line of nameLines) {
        ctx.fillText(line, idX, cursorY);
        cursorY += 32;
      }

      ctx.fillStyle = '#4e3e33';
      ctx.font = '600 16px sans-serif';
      if (attendeeCollege) {
        ctx.fillText(attendeeCollege, idX, cursorY + 4);
        cursorY += 24;
      }
      if (attendeeAcademic) {
        ctx.font = '700 15px monospace';
        ctx.fillText(attendeeAcademic.toUpperCase(), idX, cursorY + 4);
        cursorY += 24;
      }
      ctx.font = '600 15px sans-serif';
      ctx.fillText(teamLabel, idX, cursorY + 4);
      if (registration.emergencyContact) {
        cursorY += 22;
        ctx.fillStyle = '#6f5c4d';
        ctx.font = '600 13px monospace';
        ctx.fillText(`EMERGENCY: ${registration.emergencyContact}`, idX, cursorY + 4);
      }

      // Rule divider
      let y = 284;
      ctx.strokeStyle = '#d3c4ad';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(42, y);
      ctx.lineTo(W - 42, y);
      ctx.stroke();

      // Important Event Entry Details Box
      y += 24;
      ctx.fillStyle = '#f3ebdc';
      ctx.fillRect(42, y, W - 84, 344);
      ctx.strokeStyle = '#251911';
      ctx.lineWidth = 2;
      ctx.strokeRect(42, y, W - 84, 344);

      ctx.fillStyle = '#a31c24';
      ctx.font = '700 13px monospace';
      ctx.fillText('EVENT ENTRY DETAILS', 64, y + 30);

      ctx.fillStyle = '#251911';
      ctx.font = '800 24px sans-serif';
      const evtTitleLines = wrapCanvasText(ctx, event.title, W - 128).slice(0, 2);
      let detailY = y + 64;
      for (const line of evtTitleLines) {
        ctx.fillText(line, 64, detailY);
        detailY += 28;
      }

      ctx.fillStyle = '#4e3e33';
      ctx.font = '600 15px sans-serif';
      ctx.fillText(`${event.clubName} · ${event.collegeName}`, 64, detailY + 2);
      detailY += 32;

      const rows: Array<[string, string]> = [
        [
          'DATE & TIME',
          `${formatIstDate(event.startAt)} · ${formatIstTime(event.startAt)} – ${formatIstTime(event.endAt)} IST`,
        ],
        [
          'VENUE',
          event.formattedAddress
            ? `${event.venueName} — ${event.formattedAddress}`
            : event.venueName,
        ],
        ['ENTRY & FEE', `${event.mode} · ${entryFeeText}`],
      ];

      if (prerequisitesList.length > 0) {
        rows.push(['BRING ALONG', prerequisitesList.join(' · ')]);
      }
      if (event.coordinatorContact?.name) {
        rows.push([
          'GATE DESK',
          [event.coordinatorContact.name, event.coordinatorContact.phone]
            .filter(Boolean)
            .join(' · '),
        ]);
      }

      for (const [label, value] of rows) {
        ctx.fillStyle = '#6f5c4d';
        ctx.font = '700 12px monospace';
        ctx.fillText(label, 64, detailY);
        ctx.fillStyle = '#251911';
        ctx.font = '600 15px sans-serif';
        const wrapped = wrapCanvasText(ctx, value, W - 260).slice(0, 2);
        wrapped.forEach((wLine, idx) => {
          ctx.fillText(wLine, 200, detailY + idx * 19);
        });
        detailY += Math.max(28, wrapped.length * 20 + 8);
      }

      // Prominent Bottom QR Section
      const qrSectionY = 682;
      ctx.fillStyle = '#6f5c4d';
      ctx.font = '700 13px monospace';
      const scanHint = 'SCAN AT EVENT ENTRY GATE';
      const hintW = ctx.measureText(scanHint).width;
      ctx.fillText(scanHint, (W - hintW) / 2, qrSectionY);

      const qrImg = await loadCanvasImage(qrDataUrl);
      const qrSize = 276;
      const qrX = (W - qrSize) / 2;
      const qrY = qrSectionY + 18;
      ctx.fillStyle = '#fef9ef';
      ctx.fillRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);
      ctx.strokeStyle = '#251911';
      ctx.lineWidth = 3;
      ctx.strokeRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

      // Pass code bar at bottom
      const barY = qrY + qrSize + 28;
      ctx.fillStyle = '#251911';
      ctx.fillRect(140, barY, W - 280, 50);
      ctx.fillStyle = '#fef9ef';
      ctx.font = '700 22px monospace';
      const codeW = ctx.measureText(registration.passCode).width;
      ctx.fillText(registration.passCode, (W - codeW) / 2, barY + 32);

      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = url;
      link.download = `${registration.passCode}-PASS.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      handleDownloadQrOnly();
    } finally {
      setDownloadingPass(false);
    }
  }

  async function handlePhotoFileChange(file: File | undefined) {
    if (!file || !onUpdatePassPhoto || !event || !registration) return;
    setPhotoError(null);
    setUploadingPhoto(true);
    try {
      const resized = await resizeAvatarImage(file);
      await onUpdatePassPhoto(event.id, registration.id, resized);
    } catch (err) {
      setPhotoError(
        err instanceof Error ? err.message : 'Could not update pass photo.'
      );
    } finally {
      setUploadingPhoto(false);
    }
  }

  function handleReprint() {
    setPrintCycle((c) => c + 1);
    setIsPrinting(!reducedMotion);
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[70] paper-scrim flex items-start sm:items-center justify-center p-3 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={`E-Ticket Entry Pass for ${event.title}`}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[500px] my-auto bg-[var(--paper)] border border-[var(--border-ink)] rounded-[20px] shadow-[8px_8px_0_var(--crimson)] overflow-hidden"
      >
        {/* Top Close Strip */}
        <div className="px-4 py-3 border-b border-[var(--border-warm)] bg-[var(--paper-raised)] flex items-center justify-between gap-3">
          <div className="text-xs font-bold uppercase tracking-[0.09em] text-[var(--ink)] flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-[var(--crimson)] shrink-0" />
            <span>Official Event Entry Pass</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close E-Ticket modal"
            className="paper-btn-secondary min-w-[34px] min-h-[34px] flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Thermal Receipt Printer Stage */}
        <div className="p-4 sm:p-5 space-y-4">
          <div className="relative">
            {/* Printer Casing */}
            <div
              className={`cp-printer-shell ${
                isPrinting ? 'is-printing' : 'is-done'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <ConnectusLogo variant="dark" size={22} wordmark={true} />
                <div className="cp-printer-keys" aria-hidden="true">
                  <i />
                  <i />
                </div>
              </div>

              <div className="cp-printer-screen" role="status" aria-live="polite">
                <span className="cp-printer-led" aria-hidden="true" />
                <span>{statusText}</span>
                <span className="ml-auto font-mono text-[11px] uppercase tracking-[0.06em] text-[var(--crimson)] shrink-0">
                  {event.collegeShortName}
                </span>
              </div>

              <div className="cp-printer-mouth" aria-hidden="true" />
            </div>

            {/* Sliding Thermal Entry Pass */}
            <div className="cp-receipt-feed">
              <div
                key={printCycle}
                onAnimationEnd={(e) => {
                  if (e.animationName === 'cpReceiptPrint') {
                    setIsPrinting(false);
                  }
                }}
                className={`cp-receipt ${
                  reducedMotion || !isPrinting ? 'is-static' : 'is-printing'
                }`}
              >
                {/* Ticket Header */}
                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-dashed border-[var(--border-ink)]">
                  <ConnectusLogo variant="light" size={20} wordmark={true} />
                  <span
                    className={`font-mono text-[10.5px] font-bold uppercase tracking-[0.08em] px-2 py-0.5 border ${
                      isWaitlisted
                        ? 'border-[var(--amber-border)] bg-[var(--amber-tint)] text-[var(--amber-ink)]'
                        : 'border-[var(--olive-border)] bg-[var(--olive-tint)] text-[var(--olive)]'
                    }`}
                  >
                    {badgeLabel}
                  </span>
                </div>

                {/* 1. Attendee Photo + Basics */}
                <div className="mt-3 flex items-start gap-3.5">
                  <div className="shrink-0 flex flex-col items-center gap-1.5">
                    <div className="w-20 h-20 rounded-[10px] border-2 border-[var(--border-ink)] bg-[var(--paper-input)] overflow-hidden flex items-center justify-center">
                      {resolvedPhoto ? (
                        <img
                          src={resolvedPhoto}
                          alt={registration.userName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="font-display text-lg font-extrabold text-[var(--ink-2)]">
                          {initials || 'ID'}
                        </span>
                      )}
                    </div>
                    {onUpdatePassPhoto && (
                      <>
                        <input
                          ref={photoInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            void handlePhotoFileChange(e.target.files?.[0]);
                            e.target.value = '';
                          }}
                        />
                        <button
                          type="button"
                          disabled={uploadingPhoto}
                          onClick={() => photoInputRef.current?.click()}
                          className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] border border-[var(--border-ink)] bg-[var(--paper-input)] hover:bg-[var(--feel-tint)] text-[var(--ink)] inline-flex items-center gap-1 whitespace-nowrap"
                        >
                          {uploadingPhoto ? (
                            <Loader2 className="w-2.5 h-2.5 animate-spin" />
                          ) : (
                            <Camera className="w-2.5 h-2.5 text-[var(--crimson)]" />
                          )}
                          <span>
                            {uploadingPhoto
                              ? 'Saving…'
                              : resolvedPhoto
                                ? 'Change Photo'
                                : 'Upload Photo'}
                          </span>
                        </button>
                      </>
                    )}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="text-[10px] font-mono font-bold uppercase tracking-[0.08em] text-[var(--ink-2)]">
                      Attendee Identity
                    </div>
                    <div className="font-display text-base sm:text-lg font-extrabold tracking-[-0.02em] text-[var(--ink)] leading-tight break-words">
                      {registration.userName}
                    </div>
                    {attendeeCollege && (
                      <div className="text-xs font-semibold text-[var(--ink)]">
                        {attendeeCollege}
                      </div>
                    )}
                    {attendeeAcademic && (
                      <div className="font-mono text-[11px] font-semibold text-[var(--crimson)] uppercase break-words">
                        {attendeeAcademic}
                      </div>
                    )}
                    <div className="text-[11.5px] text-[var(--ink-2)]">
                      <strong className="text-[var(--ink)]">{teamLabel}</strong>
                      {registration.teamMembers ? ` · ${registration.teamMembers}` : ''}
                    </div>
                    {(registration.userPhone || registration.emergencyContact) && (
                      <div className="text-[11px] font-mono text-[var(--ink-2)] flex flex-wrap gap-x-2.5 gap-y-0.5 pt-0.5">
                        {registration.userPhone && (
                          <span>Ph: {registration.userPhone}</span>
                        )}
                        {registration.emergencyContact && (
                          <span className="text-[var(--amber-ink)] font-semibold">
                            SOS: {registration.emergencyContact}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {photoError && (
                  <div className="mt-2 p-2 border border-[var(--crimson)] bg-[var(--crimson-tint)] text-[11px] text-[var(--crimson)]">
                    {photoError}
                  </div>
                )}

                <div className="cp-receipt-rule" />

                {/* 2. Important Event Entry Details */}
                <div className="rounded-[10px] border border-[var(--border-ink)] bg-[var(--paper-input)] p-3 space-y-2 text-[12px]">
                  <div>
                    <div className="text-[10px] font-mono font-bold uppercase tracking-[0.08em] text-[var(--crimson)]">
                      Event &amp; Entry Details
                    </div>
                    <div className="font-display text-[15px] font-extrabold tracking-[-0.02em] text-[var(--ink)] leading-snug mt-0.5">
                      {event.title}
                    </div>
                    <div className="text-[11px] text-[var(--ink-2)]">
                      {event.clubName} · {event.collegeName}
                    </div>
                  </div>

                  <div className="pt-1.5 border-t border-[var(--border-warm)] space-y-1.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[var(--ink-2)] shrink-0">Date &amp; IST</span>
                      <span className="font-semibold text-[var(--ink)] text-right tabular-nums">
                        {formatIstDate(event.startAt)} · {formatIstTime(event.startAt)}–
                        {formatIstTime(event.endAt)} IST
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-[var(--ink-2)] shrink-0 inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[var(--crimson)]" />
                        <span>Venue</span>
                      </span>
                      <span className="font-semibold text-[var(--ink)] text-right break-words">
                        {event.venueName}
                        {event.formattedAddress ? (
                          <span className="block text-[10.5px] font-normal text-[var(--ink-2)]">
                            {event.formattedAddress}
                          </span>
                        ) : null}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[var(--ink-2)] shrink-0">Mode &amp; Fee</span>
                      <span className="font-semibold text-[var(--ink)] text-right tabular-nums">
                        {event.mode} · {entryFeeText}
                      </span>
                    </div>
                    {prerequisitesList.length > 0 && (
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-[var(--ink-2)] shrink-0 inline-flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3 text-[var(--amber-ink)]" />
                          <span>Bring</span>
                        </span>
                        <span className="text-[11px] font-medium text-[var(--ink)] text-right break-words">
                          {prerequisitesList.join(' · ')}
                        </span>
                      </div>
                    )}
                    {event.coordinatorContact?.name && (
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-[var(--ink-2)] shrink-0 inline-flex items-center gap-1">
                          <Phone className="w-3 h-3 text-[var(--olive)]" />
                          <span>Gate Desk</span>
                        </span>
                        <span className="font-mono text-[11px] font-semibold text-[var(--ink)] text-right">
                          {event.coordinatorContact.name}
                          {event.coordinatorContact.phone
                            ? ` · ${event.coordinatorContact.phone}`
                            : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="cp-receipt-rule" />

                {/* 3. Large Prominent QR Code at the Bottom */}
                <div className="flex flex-col items-center gap-2.5 pt-0.5">
                  <div className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-[var(--ink-2)]">
                    Present QR Code at Entry Gate
                  </div>
                  {qrDataUrl ? (
                    <div className="p-2 bg-[#fef9ef] border-2 border-[var(--border-ink)] rounded-[8px]">
                      <img
                        src={qrDataUrl}
                        alt={`QR pass ${registration.passCode}`}
                        className={`w-44 h-44 block ${
                          isWaitlisted ? 'opacity-45 grayscale' : ''
                        }`}
                      />
                    </div>
                  ) : (
                    <div className="w-44 h-44 border-2 border-[var(--border-warm)] flex items-center justify-center text-xs text-[var(--ink-2)]">
                      Generating QR…
                    </div>
                  )}

                  <div className="w-full bg-[var(--ink)] text-[var(--on-ink)] px-3 py-2 flex items-center justify-between gap-2">
                    <span className="font-mono text-xs sm:text-sm font-bold tracking-wider break-all tabular-nums">
                      {registration.passCode}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="px-2 py-0.5 bg-[var(--paper-input)] text-[var(--ink)] hover:bg-[var(--feel-tint)] text-[11px] font-semibold inline-flex items-center gap-1 shrink-0"
                    >
                      {copied ? (
                        <Check className="w-3 h-3 text-[var(--olive)]" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                <div className="cp-receipt-bars" role="img" aria-label="Ticket barcode" />
                <div className="text-center text-[11px] font-medium text-[var(--ink-2)] mt-2">
                  Carry your college ID card · See you on campus.
                </div>
              </div>
            </div>
          </div>

          {/* All Action Options Shown Unclipped */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              disabled={!qrDataUrl || downloadingPass}
              onClick={() => void handleDownloadCompositePass()}
              className="paper-btn-primary flex-1 min-h-[40px] px-3.5 py-2 text-xs inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloadingPass ? 'Rendering Pass…' : 'Download Full Pass'}</span>
            </button>
            <button
              type="button"
              onClick={handleReprint}
              className="paper-btn-tint min-h-[40px] px-3 py-2 text-xs inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Reprint</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="paper-btn-secondary min-h-[40px] px-3.5 py-2 text-xs whitespace-nowrap"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
