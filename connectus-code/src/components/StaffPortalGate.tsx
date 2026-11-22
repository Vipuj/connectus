import { useState } from 'react';
import type { User } from 'firebase/auth';
import {
  ArrowLeft,
  Building2,
  Globe,
  KeyRound,
  Lock,
  LogIn,
  LogOut,
} from 'lucide-react';
import { ConnectusLogo } from './ConnectusLogo';

interface StaffPortalGateProps {
  firebaseUser: User | null;
  onGoogleLogin: () => Promise<void>;
  onGoogleSignOut: () => Promise<void>;
  onBackToFeed: () => void;
  onOpenInviteAccept?: () => void;
  onOpenExternalPortal?: () => void;
  children?: React.ReactNode;
}

export function StaffPortalGate({
  firebaseUser,
  onGoogleLogin,
  onGoogleSignOut,
  onBackToFeed,
  onOpenInviteAccept,
  onOpenExternalPortal,
  children,
}: StaffPortalGateProps) {
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSignIn() {
    setBusy(true);
    setErrorMsg(null);
    try {
      await onGoogleLogin();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed.';
      if (msg.includes('popup-closed-by-user')) {
        setErrorMsg('Google sign-in popup was closed before finishing.');
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] flex flex-col">
      <header className="border-b border-[var(--border-warm)] bg-[var(--paper-raised)]">
        <div className="w-full px-3 sm:px-4 md:px-5 h-16 flex items-center justify-between gap-4">
          <div className="inline-flex items-center gap-3 shrink-0">
            <ConnectusLogo variant="light" size={22} />
            <span className="text-xs font-mono uppercase tracking-[0.08em] px-2 py-0.5 bg-[var(--ink)] text-[var(--on-ink)]">
              Officials
            </span>
          </div>

          <button
            type="button"
            onClick={onBackToFeed}
            className="paper-btn-secondary min-h-[38px] px-3.5 py-1.5 text-xs uppercase tracking-[0.06em] inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Public Student Feed</span>
          </button>
        </div>
      </header>

      <main className="flex-1 w-full px-3 sm:px-4 md:px-5 py-10 flex items-center justify-center">
        <div className="w-full max-w-2xl space-y-6">
          <section className="paper-modal p-6 sm:p-8 space-y-5">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-[12px] bg-[var(--feel-tint)] border border-[var(--border-ink)] text-[var(--crimson)] flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--crimson)]">
                  Private Operations Console
                </div>
                <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-[-0.03em] text-[var(--ink)]">
                  Campus Officials &amp; Invited Club Leaders
                </h1>
                <p className="text-sm text-[var(--ink-2)] leading-relaxed">
                  Campus Officials manage institutional event approvals, official announcements, and the 6-seat private beta roster. Invited Club Leaders join by redeeming a single-use invite link from their Campus Official.
                </p>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 border border-[var(--crimson)] bg-[var(--crimson-tint)] text-xs font-medium text-[var(--crimson)]">
                {errorMsg}
              </div>
            )}

            {firebaseUser ? (
              <div className="p-4 rounded-[12px] bg-[var(--paper-raised)] border border-[var(--border-ink)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5 text-xs">
                  <div className="font-bold text-[var(--ink)] flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[var(--crimson)]" />
                    <span>Signed in as {firebaseUser.email}</span>
                  </div>
                  <div className="text-[var(--ink-2)]">
                    This account is not registered as a Campus Official or linked to an approved Club Leader invite.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onGoogleSignOut}
                  className="paper-btn-secondary min-h-[38px] px-3.5 py-1.5 text-xs inline-flex items-center gap-1.5 shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Switch Account</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={handleSignIn}
                className="paper-btn-crimson w-full min-h-[46px] px-5 py-3 text-sm inline-flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>{busy ? 'Signing in with Google...' : 'Sign In with Google'}</span>
              </button>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {onOpenInviteAccept && (
                <button
                  type="button"
                  onClick={onOpenInviteAccept}
                  className="paper-btn-primary min-h-[42px] px-4 py-2 text-xs sm:text-sm inline-flex items-center justify-center gap-1.5"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Redeem Club Leader Invite</span>
                </button>
              )}
              {onOpenExternalPortal && (
                <button
                  type="button"
                  onClick={onOpenExternalPortal}
                  className="paper-btn-secondary min-h-[42px] px-4 py-2 text-xs sm:text-sm inline-flex items-center justify-center gap-1.5"
                >
                  <Globe className="w-4 h-4 text-[var(--crimson)]" />
                  <span>External Partner Portal</span>
                </button>
              )}
            </div>
          </section>

          {children}
        </div>
      </main>
    </div>
  );
}
