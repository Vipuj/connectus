import { useState } from 'react';
import { BellOff, CheckCircle2, Clock, Send, Smartphone, X } from 'lucide-react';
import type { NotificationItem, StudentProfile } from '../types';
import { formatIstTime } from '../utils/format';

interface TelegramDrawerProps {
  open: boolean;
  onClose: () => void;
  student: StudentProfile;
  notifications: NotificationItem[];
  onConnectTelegram: () => Promise<void>;
  onSendCommand: (cmd: string) => Promise<void>;
  onFlushDigest: () => Promise<void>;
  onToggleQuietHours: (enabled: boolean) => Promise<void>;
}

export function TelegramDrawer({
  open,
  onClose,
  student,
  notifications,
  onConnectTelegram,
  onSendCommand,
  onFlushDigest,
  onToggleQuietHours,
}: TelegramDrawerProps) {
  const [cmdInput, setCmdInput] = useState('');
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const sentTodayCount = notifications.filter(
    (n) => n.status === 'sent' && n.kind !== 'event_change' && n.kind !== 'waitlist_promoted'
  ).length;

  const queuedCount = notifications.filter(
    (n) => n.status === 'queued' || n.status === 'held_quiet_hours'
  ).length;

  async function handleRunCommand(cmd: string) {
    if (!cmd.trim()) return;
    setBusy(true);
    try {
      await onSendCommand(cmd.trim());
      setCmdInput('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end paper-scrim"
      role="dialog"
      aria-modal="true"
      aria-label="Telegram Bot Alerts Preview"
    >
      <div className="paper-drawer w-full max-w-md bg-[var(--paper-app)] h-full flex flex-col border-l border-[var(--border-ink)] shadow-[-8px_0_0_var(--feel-shadow)]">
        <div className="px-5 py-4 border-b border-[var(--border-warm)] bg-[var(--paper-raised)] flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="font-display text-lg font-extrabold tracking-[-0.03em] text-[var(--ink)] truncate">
              @ConnectusBot
            </h2>
            <p className="text-xs text-[var(--ink-2)]">
              {student.telegramConnected
                ? `Connected as ${student.telegramHandle}`
                : 'Tap deep link below to connect phone alerts'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Telegram drawer"
            className="paper-btn-secondary min-w-[40px] min-h-[40px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-3 bg-[var(--paper)] border-b border-[var(--border-warm)] flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--ink-2)]">
          <div className="flex items-center gap-3 font-mono tabular-nums">
            <span>
              Daily cap: <strong className="text-[var(--ink)]">{Math.min(sentTodayCount, 3)} / 3</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Queued: <strong className="text-[var(--ink)]">{queuedCount}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onToggleQuietHours(!student.quietHours.enabled)}
              className="paper-btn-secondary px-2.5 py-1.5 text-xs whitespace-nowrap"
            >
              Quiet {student.quietHours.enabled ? `${student.quietHours.start}–${student.quietHours.end}` : 'Off'}
            </button>
            {queuedCount > 0 && (
              <button
                type="button"
                onClick={onFlushDigest}
                className="paper-btn-ink px-2.5 py-1.5 text-xs whitespace-nowrap"
              >
                Send 8 AM Digest
              </button>
            )}
          </div>
        </div>

        {!student.telegramConnected && (
          <div className="m-5 p-4 border border-[var(--border-ink)] rounded-[14px] bg-[var(--paper-raised)] space-y-3 shadow-[4px_4px_0_var(--feel-shadow)]">
            <div className="flex items-start gap-3">
              <Smartphone className="w-5 h-5 text-[var(--crimson)] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-[var(--ink)]">
                  Link your Telegram in one tap
                </p>
                <p className="text-xs text-[var(--ink-2)] leading-relaxed">
                  Students must start the bot once via a one-time deep link so Telegram allows alerts.
                </p>
              </div>
            </div>
            <div className="paper-terminal font-mono text-xs px-3 py-2 break-all">
              https://t.me/ConnectusBot?start={student.telegramDeepLinkToken}
            </div>
            <button
              type="button"
              onClick={onConnectTelegram}
              className="paper-btn-primary w-full min-h-[44px] px-4 py-2 text-sm"
            >
              Open Bot &amp; Send /start {student.telegramDeepLinkToken}
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3.5 bg-[var(--paper)]">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-sm font-light text-[var(--ink-2)]">
              No Telegram messages yet. Publish an event from a followed college to watch an alert arrive here.
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                className="paper-card-soft p-4 space-y-2 border border-[var(--border-ink)]"
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-[var(--ink)] truncate">
                    {item.kind === 'priority_skill_low_seats' ? `⚡ ${item.title}` : item.title}
                  </span>
                  <span className="inline-flex items-center gap-1 font-mono tabular-nums text-[var(--ink-2)] shrink-0">
                    {item.status === 'sent' && (
                      <>
                        <CheckCircle2
                          className={`w-3.5 h-3.5 ${
                            item.kind === 'priority_skill_low_seats'
                              ? 'text-[var(--crimson)]'
                              : 'text-[var(--olive)]'
                          }`}
                        />
                        <span
                          className={`font-medium ${
                            item.kind === 'priority_skill_low_seats'
                              ? 'text-[var(--crimson)]'
                              : 'text-[var(--olive)]'
                          }`}
                        >
                          {item.kind === 'priority_skill_low_seats'
                            ? `Priority · ${item.sentAt ? formatIstTime(item.sentAt) : 'Sent'}`
                            : item.sentAt
                              ? formatIstTime(item.sentAt)
                              : 'Sent'}
                        </span>
                      </>
                    )}
                    {item.status === 'queued' && (
                      <>
                        <Clock className="w-3.5 h-3.5 text-[var(--ink-2)]" />
                        <span>8 AM Digest</span>
                      </>
                    )}
                    {item.status === 'held_quiet_hours' && (
                      <>
                        <Clock className="w-3.5 h-3.5 text-[var(--amber-ink)]" />
                        <span className="text-[var(--amber-ink)] font-medium">Held (Quiet)</span>
                      </>
                    )}
                    {item.status === 'capped_daily' && (
                      <>
                        <BellOff className="w-3.5 h-3.5 text-[var(--ink-2)]" />
                        <span>Daily Cap</span>
                      </>
                    )}
                    {item.status === 'muted' && (
                      <>
                        <BellOff className="w-3.5 h-3.5 text-[var(--crimson)]" />
                        <span className="text-[var(--crimson)]">Muted</span>
                      </>
                    )}
                  </span>
                </div>
                <p className="text-xs text-[var(--ink-2)] whitespace-pre-line leading-relaxed">
                  {item.body}
                </p>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-[var(--border-warm)] bg-[var(--paper-raised)] space-y-2.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => handleRunCommand('/status')}
              className="paper-btn-secondary px-3 py-1.5 text-xs font-mono"
            >
              /status
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => handleRunCommand(student.mutedAll ? '/unmute' : '/mute')}
              className="paper-btn-secondary px-3 py-1.5 text-xs font-mono"
            >
              {student.mutedAll ? '/unmute' : '/mute'}
            </button>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleRunCommand(cmdInput);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={cmdInput}
              onChange={(e) => setCmdInput(e.target.value)}
              placeholder="Send bot command (/mute, /status)..."
              className="paper-input flex-1 min-h-[40px] px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={busy || !cmdInput.trim()}
              aria-label="Send Telegram command"
              className="paper-btn-ink min-w-[44px] min-h-[40px] flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
