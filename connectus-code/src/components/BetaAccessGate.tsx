import { useState } from 'react';
import type { User } from 'firebase/auth';
import {
  ArrowRight,
  KeyRound,
  Loader2,
  Lock,
  LogOut,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import { ConnectusLogo } from './ConnectusLogo';

interface BetaAccessGateProps {
  firebaseUser: User;
  usedSeats: number;
  maxSeats: number;
  onRedeemBetaCode: (code: string) => Promise<void>;
  onRefreshAccess: () => Promise<void>;
  onOpenInviteAccept: () => void;
  onSignOut: () => Promise<void>;
}

export function BetaAccessGate({
  firebaseUser,
  usedSeats,
  maxSeats,
  onRedeemBetaCode,
  onRefreshAccess,
  onOpenInviteAccept,
  onSignOut,
}: BetaAccessGateProps) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      await onRedeemBetaCode(trimmed);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Could not redeem invite access code.'
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    setErrorMsg(null);
    try {
      await onRefreshAccess();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not refresh seat status.');
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] flex flex-col">
      <header className="border-b border-[var(--border-warm)] bg-[var(--paper-raised)]">
        <div className="w-full max-w-[1120px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <ConnectusLogo variant="light" size={22} />
            <span className="h-4 w-px bg-[var(--border-warm)]" aria-hidden="true" />
            <span className="text-xs font-medium text-[var(--ink-2)] truncate">
              Invite-Only Testing Server
            </span>
          </div>

          <button
            type="button"
            onClick={onSignOut}
            className="paper-btn-secondary min-h-[38px] px-3.5 py-1.5 text-xs inline-flex items-center gap-1.5 shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Switch Google Account</span>
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="paper-modal w-full max-w-lg p-6 sm:p-8 space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 text-xs font-mono text-[var(--crimson)]">
              <span className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-[0.08em]">
                <Lock className="w-3.5 h-3.5" />
                <span>Private Closed Beta</span>
              </span>
              <span className="tabular-nums font-semibold">
                {usedSeats} / {maxSeats} seats occupied
              </span>
            </div>

            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-[-0.03em] text-[var(--ink)]">
              This testing server is invite-only
            </h1>

            <p className="text-sm text-[var(--ink-2)] leading-relaxed">
              Signed in as{' '}
              <strong className="font-mono text-[var(--ink)]">
                {firebaseUser.email || firebaseUser.displayName || 'Google user'}
              </strong>
              . Only up to {maxSeats} approved accounts can view events, notifications, or campus
              tools right now.
            </p>
          </div>

          <div className="p-4 rounded-[var(--radius-card)] bg-[var(--amber-tint)] border border-[var(--amber-border)] text-xs text-[var(--amber-ink)] flex items-start gap-2.5 leading-relaxed">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Ask your Campus Official to add your Google email in{' '}
              <strong>Officials → Beta Access</strong>, OR enter a single-use{' '}
              <strong className="font-mono">BETA-XXXX</strong> tester code below. If you received a
              Club Leader invite (<strong className="font-mono">CP-...</strong>), redeem it below
              to claim a seat automatically.
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-2)]">
                Beta Tester Access Code
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase());
                    setErrorMsg(null);
                  }}
                  placeholder="BETA-XXXX"
                  className="paper-input flex-1 min-h-[44px] px-3.5 py-2 text-sm font-mono uppercase tracking-[0.06em]"
                />
                <button
                  type="submit"
                  disabled={busy || !code.trim()}
                  className="paper-btn-crimson min-h-[44px] px-5 py-2 text-xs sm:text-sm uppercase tracking-[0.05em] inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  {busy ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <span>Unlock Access</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </label>

            {errorMsg && (
              <div className="p-3 border border-[var(--crimson)] bg-[var(--crimson-tint)] text-xs font-medium text-[var(--crimson)]">
                {errorMsg}
              </div>
            )}
          </form>

          <div className="pt-3 border-t border-[var(--border-warm)] flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={onOpenInviteAccept}
              className="paper-btn-secondary flex-1 min-h-[42px] px-4 py-2 text-xs sm:text-sm inline-flex items-center justify-center gap-2"
            >
              <KeyRound className="w-4 h-4 text-[var(--crimson)]" />
              <span>Redeem Club Invite (CP-...)</span>
            </button>

            <button
              type="button"
              disabled={refreshing}
              onClick={handleRefresh}
              className="paper-btn-ink flex-1 min-h-[42px] px-4 py-2 text-xs sm:text-sm inline-flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Checking...' : 'Check Allowlist Again'}</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
