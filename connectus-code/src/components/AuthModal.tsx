import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  GraduationCap,
  KeyRound,
  Loader2,
  ShieldCheck,
  X,
} from 'lucide-react';

export type AuthModalMode = 'login' | 'signup';
export type AuthRoleIntent = 'student' | 'official';

interface AuthModalProps {
  open: boolean;
  initialMode: AuthModalMode;
  onClose: () => void;
  onGoogleLogin: (role?: AuthRoleIntent) => Promise<void>;
  onGoogleSignUp: (role?: AuthRoleIntent) => Promise<void>;
  onOpenInviteAccept?: () => void;
}

export function AuthModal({
  open,
  initialMode,
  onClose,
  onGoogleLogin,
  onGoogleSignUp,
  onOpenInviteAccept,
}: AuthModalProps) {
  const [role, setRole] = useState<AuthRoleIntent | null>(null);
  const [mode, setMode] = useState<AuthModalMode>(initialMode);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setRole(null);
      setMode(initialMode);
      setErrorMsg(null);
      setBusy(false);
    }
  }, [open, initialMode]);

  if (!open) return null;

  async function handleAction() {
    if (!role) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      if (mode === 'login') {
        await onGoogleLogin(role);
      } else {
        await onGoogleSignUp(role);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Authentication failed.';
      if (msg.includes('popup-closed-by-user')) {
        setErrorMsg('Google sign-in popup was closed before finishing. Please try again.');
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setBusy(false);
    }
  }

  const isOfficial = role === 'official';

  return (
    <div
      className="fixed inset-0 z-50 paper-scrim flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={mode === 'login' ? 'Log in to Connectus' : 'Sign up for Connectus'}
    >
      <div className="paper-modal w-full max-w-lg overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-[var(--border-warm)] bg-[var(--paper-raised)] flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="font-mono text-xs uppercase tracking-[0.08em] text-[var(--crimson)]">
              {mode === 'login' ? 'Log In' : 'Sign Up'}
            </div>
            <h2 className="font-display text-xl font-extrabold tracking-[-0.03em] text-[var(--ink)]">
              {mode === 'login' ? 'Log in as Student or Official' : 'Sign up as Student or Official'}
            </h2>
            <p className="text-xs text-[var(--ink-2)]">
              Choose your role below, then continue directly with Google.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close authentication modal"
            className="paper-btn-secondary min-w-[40px] min-h-[40px] flex items-center justify-center shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="space-y-3" role="group" aria-label="Choose your role">
            <button
              type="button"
              aria-pressed={role === 'student'}
              onClick={() => {
                setRole('student');
                setErrorMsg(null);
              }}
              className={`w-full text-left p-4 rounded-[var(--radius-card)] transition-colors flex items-start justify-between gap-3 ${
                role === 'student'
                  ? 'border-2 border-[var(--crimson)] bg-[var(--feel-tint)] shadow-[3px_3px_0_var(--crimson)]'
                  : 'border border-[var(--border-ink)] bg-[var(--paper-input)] hover:bg-[var(--paper-raised)]'
              }`}
            >
              <div className="flex items-start gap-3">
                <GraduationCap className="w-5 h-5 text-[var(--crimson)] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-display text-base font-bold text-[var(--ink)]">
                    Student
                  </div>
                  <p className="text-xs text-[var(--ink-2)] leading-relaxed">
                    Discover events, register in one tap, get QR passes, and join a squad.
                  </p>
                </div>
              </div>
              {role === 'student' && (
                <CheckCircle2 className="w-5 h-5 text-[var(--crimson)] shrink-0 mt-0.5" />
              )}
            </button>

            <button
              type="button"
              aria-pressed={role === 'official'}
              onClick={() => {
                setRole('official');
                setErrorMsg(null);
              }}
              className={`w-full text-left p-4 rounded-[var(--radius-card)] transition-colors flex items-start justify-between gap-3 ${
                role === 'official'
                  ? 'border-2 border-[var(--crimson)] bg-[var(--feel-tint)] shadow-[3px_3px_0_var(--crimson)]'
                  : 'border border-[var(--border-ink)] bg-[var(--paper-input)] hover:bg-[var(--paper-raised)]'
              }`}
            >
              <div className="flex items-start gap-3">
                <Building2 className="w-5 h-5 text-[var(--crimson)] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-display text-base font-bold text-[var(--ink)]">
                    Campus official
                  </div>
                  <p className="text-xs text-[var(--ink-2)] leading-relaxed">
                    Post events, review club drafts, and track attendance. Requires an appointed
                    official or club invite account.
                  </p>
                </div>
              </div>
              {role === 'official' && (
                <CheckCircle2 className="w-5 h-5 text-[var(--crimson)] shrink-0 mt-0.5" />
              )}
            </button>
          </div>

          {role && (
            isOfficial ? (
              <div className="p-3.5 rounded-[var(--radius-card)] bg-[var(--paper-raised)] border border-[var(--border-warm)] space-y-2">
                <div className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--ink)] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[var(--crimson)]" />
                  <span>Server verification required</span>
                </div>
                <p className="text-xs text-[var(--ink-2)] leading-relaxed">
                  Checks for an appointed Campus Official record, redeemed Club Leader invite, or
                  External Partner verification.
                </p>
                {mode === 'signup' && (
                  <p className="text-xs text-[var(--amber-ink)] bg-[var(--amber-tint)] border border-[var(--amber-border)] px-3 py-2">
                    Campus Officials cannot self-register. Use a Club Leader invite code below or
                    continue to apply as an External Partner.
                  </p>
                )}
              </div>
            ) : mode === 'signup' ? (
              <div className="p-3.5 rounded-[var(--radius-card)] bg-[var(--paper-raised)] border border-[var(--border-warm)] space-y-1">
                <div className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--ink)]">
                  Fresh student setup
                </div>
                <p className="text-xs text-[var(--ink-2)] leading-relaxed">
                  Add your phone number, course/branch, and pin your campus radar right after
                  signing up with Google.
                </p>
              </div>
            ) : (
              <div className="p-3.5 rounded-[var(--radius-card)] bg-[var(--paper-raised)] border border-[var(--border-warm)] space-y-1">
                <div className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--ink)]">
                  Returning student sign-in
                </div>
                <p className="text-xs text-[var(--ink-2)] leading-relaxed">
                  Restores your saved profile, QR passes, squads, and followed colleges.
                </p>
              </div>
            )
          )}

          {errorMsg && (
            <div className="p-3 border border-[var(--crimson)] bg-[var(--crimson-tint)] text-xs font-medium text-[var(--crimson)]">
              {errorMsg}
            </div>
          )}

          <div className="space-y-3">
            <button
              type="button"
              disabled={!role || busy}
              onClick={handleAction}
              className={`${
                mode === 'signup' ? 'paper-btn-crimson' : 'paper-btn-primary'
              } w-full min-h-[48px] px-5 py-2.5 text-sm inline-flex items-center justify-center gap-2`}
            >
              {busy ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Checking your account...</span>
                </>
              ) : !role ? (
                <span>
                  {mode === 'signup'
                    ? 'Select Student or Official to Sign Up'
                    : 'Select Student or Official to Log In'}
                </span>
              ) : (
                <>
                  <span>
                    {mode === 'signup'
                      ? `Sign up as ${isOfficial ? 'Official' : 'Student'} with Google`
                      : `Log in as ${isOfficial ? 'Official' : 'Student'} with Google`}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {isOfficial && onOpenInviteAccept && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenInviteAccept();
                }}
                className="paper-btn-secondary w-full min-h-[42px] px-4 py-2 text-xs sm:text-sm inline-flex items-center justify-center gap-2"
              >
                <KeyRound className="w-4 h-4 text-[var(--crimson)]" />
                <span>Have a Club Leader Invite Code?</span>
              </button>
            )}
          </div>

          <div className="pt-2 border-t border-[var(--border-warm)] text-center text-xs text-[var(--ink-2)]">
            {mode === 'login' ? (
              <>
                New to Connectus?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setErrorMsg(null);
                  }}
                  className="font-semibold text-[var(--crimson)] hover:underline underline-offset-4 py-1"
                >
                  Switch to Sign Up
                </button>
              </>
            ) : (
              <>
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMsg(null);
                  }}
                  className="font-semibold text-[var(--crimson)] hover:underline underline-offset-4 py-1"
                >
                  Switch to Log In
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
