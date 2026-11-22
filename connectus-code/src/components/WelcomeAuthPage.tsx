import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  Building2,
  Check,
  GraduationCap,
  KeyRound,
  Loader2,
  Moon,
  ShieldCheck,
  Sun,
  X,
} from 'lucide-react';
import { focusAndFollowTarget } from '../utils/scroll';
import {
  applyThemePreference,
  getGuestStoredTheme,
  resolveIsDark,
  THEME_CHANGE_EVENT,
} from '../utils/theme';
import type { AuthModalMode, AuthRoleIntent } from './AuthModal';
import { CampusNetworkCanvas } from './CampusNetworkCanvas';
import { ConnectusLogo } from './ConnectusLogo';

interface WelcomeAuthPageProps {
  eventCount: number;
  collegeCount: number;
  hasPendingInvite?: boolean;
  betaLocked?: boolean;
  betaUsedSeats?: number;
  betaMaxSeats?: number;
  onGoogleSignUp: (role?: AuthRoleIntent) => Promise<void>;
  onGoogleLogin: (role?: AuthRoleIntent) => Promise<void>;
  onContinueAsGuest: () => void;
  onOpenInviteAccept?: () => void;
}

const EASE_OUT_EXPO: [number, number, number, number] = [0.22, 0.61, 0.36, 1];
const EASE_SPRING_OVERSHOOT: [number, number, number, number] = [0.3, 1.6, 0.4, 1];
const SPRING_BRAND = { type: 'spring' as const, stiffness: 125, damping: 24, mass: 0.9 };

function useLogoSize(): number {
  const [isSmall, setIsSmall] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : false
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => setIsSmall(window.innerWidth < 640);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return isSmall ? 38 : 48;
}

function useAnimatedCounter(target: number, durationMs = 1500, delayMs = 450): number {
  const prefersReducedMotion = useReducedMotion();
  const [value, setValue] = useState<number>(() => (prefersReducedMotion ? target : 0));

  useEffect(() => {
    if (prefersReducedMotion || target <= 0) {
      setValue(target);
      return;
    }

    let rafId = 0;
    const timer = window.setTimeout(() => {
      const start = performance.now();
      const step = (now: number) => {
        const p = Math.min((now - start) / durationMs, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        setValue(Math.round(target * eased));
        if (p < 1) {
          rafId = window.requestAnimationFrame(step);
        }
      };
      rafId = window.requestAnimationFrame(step);
    }, delayMs);

    return () => {
      window.clearTimeout(timer);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [target, durationMs, delayMs, prefersReducedMotion]);

  return value;
}

function AnimatedTick({ active, reduced }: { active: boolean; reduced: boolean }) {
  return (
    <motion.span
      initial={false}
      animate={active ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
      transition={{ duration: reduced ? 0 : 0.34, ease: EASE_SPRING_OVERSHOOT }}
      className="w-7 h-7 rounded-full bg-[var(--crimson)] flex items-center justify-center shrink-0"
      aria-hidden="true"
    >
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <motion.path
          d="M3 8.5l3.2 3L13 4.5"
          stroke="#fef9ef"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: active ? 1 : 0 }}
          transition={{ duration: reduced ? 0 : 0.32, delay: active && !reduced ? 0.12 : 0, ease: 'easeOut' }}
        />
      </svg>
    </motion.span>
  );
}

export function WelcomeAuthPage({
  eventCount,
  collegeCount,
  hasPendingInvite = false,
  betaLocked = false,
  betaUsedSeats = 1,
  betaMaxSeats = 6,
  onGoogleSignUp,
  onGoogleLogin,
  onContinueAsGuest,
  onOpenInviteAccept,
}: WelcomeAuthPageProps) {
  const [activeMode, setActiveMode] = useState<AuthModalMode | null>(null);
  const [panelStep, setPanelStep] = useState<1 | 2>(1);
  const [role, setRole] = useState<AuthRoleIntent | null>(
    hasPendingInvite ? 'official' : null
  );
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDark, setIsDark] = useState<boolean>(() => resolveIsDark(getGuestStoredTheme()));
  const authCardRef = useRef<HTMLElement | null>(null);
  const prefersReducedMotion = Boolean(useReducedMotion());
  const logoSize = useLogoSize();

  const animatedEventCount = useAnimatedCounter(eventCount, 1400, 420);
  const animatedCollegeCount = useAnimatedCounter(collegeCount, 1400, 500);

  const isAuthOpen = activeMode !== null;

  useEffect(() => {
    const syncTheme = () => setIsDark(resolveIsDark(getGuestStoredTheme()));
    syncTheme();
    window.addEventListener(THEME_CHANGE_EVENT, syncTheme);
    return () => window.removeEventListener(THEME_CHANGE_EVENT, syncTheme);
  }, []);

  useEffect(() => {
    if (!isAuthOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) {
        setActiveMode(null);
        setPanelStep(1);
        setErrorMsg(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthOpen, busy]);

  function openMode(nextMode: AuthModalMode) {
    const wasClosed = activeMode === null;
    setActiveMode(nextMode);
    setErrorMsg(null);
    if (wasClosed) {
      setPanelStep(1);
      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
        focusAndFollowTarget(authCardRef.current, {
          block: 'center',
          highlight: true,
          focusInput: false,
          delayMs: prefersReducedMotion ? 40 : 420,
        });
      }
    }
  }

  function closeAuthPanel() {
    if (busy) return;
    setActiveMode(null);
    setPanelStep(1);
    setErrorMsg(null);
  }

  async function handleSubmit() {
    if (!role || !activeMode) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      if (activeMode === 'signup') {
        await onGoogleSignUp(role);
      } else {
        await onGoogleLogin(role);
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

  const fadeReveal = (delay: number, y = 12) =>
    prefersReducedMotion
      ? {}
      : {
          initial: { opacity: 0, y },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.7, delay, ease: EASE_OUT_EXPO },
        };

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] flex flex-col relative overflow-x-clip cp-paper-grid-bg">
      {/* Ambient Campus Network Canvas from reference HTML */}
      <CampusNetworkCanvas className="opacity-85" />

      {/* Soft radial vignette matching paper surface */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 opacity-45"
        style={{
          background: 'radial-gradient(circle at 50% 40%, transparent 0%, var(--paper) 100%)',
        }}
      />

      {/* Minimal Top-Right Controls: Theme Toggle + Log In + Sign Up (NO Connectus wordmark at top) */}
      <motion.header
        initial={prefersReducedMotion ? false : { opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.48, delay: 0.15, ease: EASE_OUT_EXPO }}
        className="relative z-20"
      >
        <div className="w-full max-w-[1320px] mx-auto px-4 sm:px-6 md:px-10 pt-5 pb-2 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={() => applyThemePreference(isDark ? 'light' : 'dark', null)}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Warm Paper (Light)' : 'Warm Espresso (Dark)'}
            className="paper-btn-secondary min-h-[40px] w-[40px] inline-flex items-center justify-center shrink-0"
          >
            {isDark ? <Sun className="w-4 h-4 text-[var(--orange)]" /> : <Moon className="w-4 h-4" />}
          </button>

          <div className="flex items-center gap-2.5 shrink-0" role="group" aria-label="Account access">
            <motion.button
              type="button"
              aria-pressed={activeMode === 'login'}
              whileHover={prefersReducedMotion ? undefined : { y: -1 }}
              whileTap={prefersReducedMotion ? undefined : { x: 2, y: 2 }}
              transition={{ duration: 0.14, ease: EASE_OUT_EXPO }}
              onClick={() => openMode('login')}
              className={`min-h-[40px] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.06em] whitespace-nowrap inline-flex items-center gap-1.5 transition-all ${
                activeMode === 'login'
                  ? 'paper-btn-primary ring-2 ring-[var(--crimson)] ring-offset-2 ring-offset-[var(--paper)]'
                  : 'paper-btn-secondary'
              }`}
            >
              {activeMode === 'login' && <Check className="w-3.5 h-3.5 shrink-0" />}
              <span>Log In</span>
            </motion.button>
            <motion.button
              type="button"
              aria-pressed={activeMode === 'signup'}
              whileHover={prefersReducedMotion ? undefined : { x: -1, y: -1 }}
              whileTap={prefersReducedMotion ? undefined : { x: 3, y: 3 }}
              transition={{ duration: 0.14, ease: EASE_OUT_EXPO }}
              onClick={() => openMode('signup')}
              className={`min-h-[40px] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.06em] whitespace-nowrap inline-flex items-center gap-1.5 transition-all ${
                activeMode === 'signup'
                  ? 'paper-btn-crimson ring-2 ring-[var(--ink)] ring-offset-2 ring-offset-[var(--paper)]'
                  : activeMode === 'login'
                    ? 'paper-btn-secondary'
                    : 'paper-btn-crimson'
              }`}
            >
              {activeMode === 'signup' && <Check className="w-3.5 h-3.5 shrink-0" />}
              <span>Sign Up</span>
            </motion.button>
          </div>
        </div>
      </motion.header>

      <main className="relative z-10 flex-1 w-full max-w-[1320px] mx-auto px-4 sm:px-6 md:px-10 py-6 md:py-10 flex items-center justify-center">
        <div
          className={`w-full relative grid items-center ${
            isAuthOpen
              ? 'grid-cols-1 lg:grid-cols-[1.08fr_0.92fr] gap-10 lg:gap-16'
              : 'grid-cols-1 justify-items-center'
          }`}
        >
          {/* Editorial Hero: Centered initially, smoothly glides left when Log In / Sign Up is clicked */}
          <motion.section
            layout
            transition={{
              layout: SPRING_BRAND,
            }}
            className={`w-full ${isAuthOpen ? 'max-w-[600px]' : 'max-w-[660px]'}`}
          >
            <div className="space-y-6">
              {/* Single Middle-of-Screen Connectus Wordmark + Interlocking Chain Logo */}
              <div className="pb-5 border-b border-[var(--border-warm)] flex items-center justify-between gap-4">
                <motion.div
                  layoutId={prefersReducedMotion ? undefined : 'connectus-brand-lockup'}
                  transition={{
                    layout: SPRING_BRAND,
                  }}
                  className="inline-flex items-center"
                >
                  <ConnectusLogo variant="light" size={logoSize} layout="horizontal" />
                </motion.div>
                <motion.span
                  {...fadeReveal(0.25, 6)}
                  className="hidden sm:inline-block font-mono text-[12px] uppercase tracking-[0.18em] text-[var(--ink-2)]"
                >
                  Campus Network
                </motion.span>
              </div>

              {/* Masked Line-Rise Headline (inspired by reference HTML) */}
              <h1
                aria-label="Find the event. Find your squad."
                className="font-display text-[44px] sm:text-6xl lg:text-[76px] font-extrabold tracking-[-0.055em] leading-[0.98] text-[var(--ink)]"
              >
                <span className="block overflow-hidden pb-[0.06em]">
                  <motion.span
                    className="inline-block"
                    initial={prefersReducedMotion ? false : { y: '110%' }}
                    animate={{ y: '0%' }}
                    transition={{ duration: 0.9, delay: 0.16, ease: EASE_OUT_EXPO }}
                  >
                    Find the event.
                  </motion.span>
                </span>
                <span className="block overflow-hidden pb-[0.06em]">
                  <motion.span
                    className="inline-block"
                    initial={prefersReducedMotion ? false : { y: '110%' }}
                    animate={{ y: '0%' }}
                    transition={{ duration: 0.9, delay: 0.34, ease: EASE_OUT_EXPO }}
                  >
                    Find your squad
                    <motion.span
                      className="inline-block text-[var(--orange)]"
                      initial={prefersReducedMotion ? false : { opacity: 0 }}
                      animate={
                        prefersReducedMotion
                          ? { opacity: 1 }
                          : { opacity: 1, y: [0, -3, 0] }
                      }
                      transition={
                        prefersReducedMotion
                          ? { duration: 0 }
                          : {
                              opacity: { duration: 0.6, delay: 0.95 },
                              y: { duration: 5.5, delay: 1.5, repeat: Infinity, ease: 'easeInOut' },
                            }
                      }
                    >
                      .
                    </motion.span>
                  </motion.span>
                </span>
              </h1>

              <motion.p
                {...fadeReveal(0.45, 10)}
                className="text-base sm:text-xl text-[var(--ink-2)] max-w-[46ch] leading-relaxed tracking-[-0.01em]"
              >
                Hackathons, workshops and fests near your campus, with QR passes and teammate
                matching.
              </motion.p>

              {/* Interactive Square-Bulleted Role Points */}
              <motion.ul {...fadeReveal(0.55, 10)} className="space-y-3.5 max-w-[48ch] pt-1">
                <li className="group flex items-start gap-3.5 text-sm sm:text-base text-[var(--ink-2)] leading-relaxed">
                  <span
                    aria-hidden="true"
                    className="w-3 h-3 bg-[var(--crimson)] shrink-0 mt-1.5 transition-transform duration-300 ease-[cubic-bezier(0.3,1.6,0.4,1)] group-hover:rotate-90 group-hover:scale-125"
                  />
                  <span>
                    <strong className="font-semibold text-[var(--ink)]">Students</strong> discover
                    events, register in one tap, get QR entry passes, and join a squad.
                  </span>
                </li>
                <li className="group flex items-start gap-3.5 text-sm sm:text-base text-[var(--ink-2)] leading-relaxed">
                  <span
                    aria-hidden="true"
                    className="w-3 h-3 bg-[var(--orange)] shrink-0 mt-1.5 transition-transform duration-300 ease-[cubic-bezier(0.3,1.6,0.4,1)] group-hover:rotate-90 group-hover:scale-125"
                  />
                  <span>
                    <strong className="font-semibold text-[var(--ink)]">Campus officials</strong>{' '}
                    post campus events, approve club drafts, and track registrations after server
                    verification.
                  </span>
                </li>
              </motion.ul>

              {/* Live Pulsing Dot + Count-Up Stats Strip */}
              <motion.div
                {...fadeReveal(0.65, 8)}
                className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-4 border-t border-[var(--border-warm)] text-xs sm:text-sm font-mono text-[var(--ink-2)] tabular-nums"
              >
                <span className="inline-flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="w-2 h-2 rounded-full bg-[var(--orange)] shadow-[0_0_0_0_rgba(232,80,14,0.55)] animate-pulse"
                  />
                  <span>
                    <strong className="font-semibold text-[var(--ink)]">
                      {eventCount > 0 ? animatedEventCount : 'Live'}
                    </strong>{' '}
                    {eventCount > 0 ? 'live upcoming events' : 'upcoming events'}
                  </span>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  <strong className="font-semibold text-[var(--ink)]">
                    {collegeCount > 0 ? `${animatedCollegeCount}+` : 'Pan-India'}
                  </strong>{' '}
                  verified campuses
                </span>
                <span aria-hidden="true">·</span>
                <span>Private Google sessions</span>
              </motion.div>

              {!isAuthOpen && (!betaLocked || (hasPendingInvite && onOpenInviteAccept)) && (
                <motion.div
                  initial={prefersReducedMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.72 }}
                  className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1 text-xs sm:text-sm"
                >
                  {!betaLocked && (
                    <button
                      type="button"
                      onClick={onContinueAsGuest}
                      className="font-medium text-[var(--ink)] underline underline-offset-4 py-1 px-1 bg-gradient-to-r from-[var(--orange)] to-[var(--orange)] bg-[length:0%_100%] bg-no-repeat hover:bg-[length:100%_100%] hover:text-[#fef9ef] hover:no-underline transition-[background-size,color] duration-300"
                    >
                      Explore events as guest
                    </button>
                  )}
                  {hasPendingInvite && onOpenInviteAccept && (
                    <button
                      type="button"
                      onClick={onOpenInviteAccept}
                      className="font-semibold text-[var(--crimson)] hover:underline underline-offset-4 py-1 inline-flex items-center gap-1.5"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Redeem Club Invite</span>
                    </button>
                  )}
                </motion.div>
              )}
            </div>
          </motion.section>

          {/* Right Auth Card: Delayed crimson shadow + 2-step sliding panel inspired by reference HTML */}
          <AnimatePresence mode="popLayout">
            {isAuthOpen && activeMode && (
              <motion.section
                key="welcome-auth-card"
                id="welcome-auth-card"
                ref={authCardRef}
                aria-live="polite"
                aria-label={activeMode === 'login' ? 'Log in to Connectus' : 'Sign up for Connectus'}
                initial={
                  prefersReducedMotion
                    ? false
                    : { opacity: 0, y: 24, scale: 0.97 }
                }
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: {
                    duration: prefersReducedMotion ? 0 : 0.65,
                    delay: prefersReducedMotion ? 0 : 0.14,
                    ease: EASE_OUT_EXPO,
                  },
                }}
                exit={
                  prefersReducedMotion
                    ? undefined
                    : {
                        opacity: 0,
                        y: 12,
                        scale: 0.96,
                        transition: { duration: 0.2, ease: EASE_OUT_EXPO },
                      }
                }
                className="relative w-full cp-scroll-target"
              >
                {/* Solid offset shadow layer that slides out diagonally behind the rounded card */}
                <motion.div
                  aria-hidden="true"
                  initial={prefersReducedMotion ? { x: 10, y: 10 } : { x: 0, y: 0 }}
                  animate={{ x: 10, y: 10 }}
                  transition={{
                    duration: prefersReducedMotion ? 0 : 0.7,
                    delay: prefersReducedMotion ? 0 : 0.38,
                    ease: EASE_OUT_EXPO,
                  }}
                  className="absolute inset-0 rounded-[28px] bg-[var(--crimson)]"
                />

                <div className="relative bg-[var(--paper-app)] border-[1.5px] border-[var(--ink)] rounded-[28px] p-6 sm:p-8 overflow-hidden">
                  {/* Top Step Header + Close + 3px Orange Progress Rail */}
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-mono text-xs sm:text-sm font-medium tracking-[0.06em] text-[var(--ink-2)]">
                      Step {panelStep} of 2
                    </span>
                    <motion.button
                      type="button"
                      onClick={closeAuthPanel}
                      disabled={busy}
                      whileTap={prefersReducedMotion ? undefined : { x: 1, y: 1 }}
                      aria-label="Close sign-in panel"
                      className="paper-btn-secondary min-w-[36px] min-h-[36px] flex items-center justify-center shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </motion.button>
                  </div>

                  {/* 3px Orange Progress Bar (50% -> 100%) */}
                  <div className="h-[3px] bg-[var(--border-warm)] mt-2.5 mb-5 relative overflow-hidden">
                    <motion.div
                      className="h-full bg-[var(--orange)]"
                      initial={false}
                      animate={{ width: panelStep === 1 ? '50%' : '100%' }}
                      transition={{
                        duration: prefersReducedMotion ? 0 : 0.45,
                        ease: [0.7, 0, 0.2, 1],
                      }}
                    />
                  </div>

                  {betaLocked && (
                    <div className="mb-4 p-3.5 rounded-[18px] border border-[var(--amber-border)] bg-[var(--amber-tint)] text-xs font-medium text-[var(--amber-ink)]">
                      Invite-only closed beta ({betaUsedSeats}/{betaMaxSeats} seats occupied). Sign
                      in with an invited Google email or enter a tester/club code right after signing
                      in.
                    </div>
                  )}

                  {hasPendingInvite && (
                    <div className="mb-4 p-3.5 rounded-[18px] border border-[var(--crimson)] bg-[var(--crimson-tint)] text-xs font-medium text-[var(--ink)]">
                      Club Leader invite link detected. Choose <strong>Campus official</strong>{' '}
                      below or open the invite code directly.
                    </div>
                  )}

                  {/* 2-Panel Sliding Stage */}
                  <AnimatePresence mode="wait" initial={false}>
                    {panelStep === 1 ? (
                      <motion.div
                        key="panel-step-1"
                        initial={prefersReducedMotion ? false : { opacity: 0, x: -36 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={prefersReducedMotion ? undefined : { opacity: 0, x: -48 }}
                        transition={{ duration: 0.34, ease: EASE_OUT_EXPO }}
                        className="space-y-4"
                      >
                        <div className="space-y-1.5">
                          <h2 className="font-display text-2xl sm:text-[32px] font-extrabold tracking-[-0.04em] leading-[1.08] text-[var(--ink)]">
                            {activeMode === 'login'
                              ? 'Who is logging in?'
                              : 'Who is signing up?'}
                          </h2>
                          <p className="text-sm sm:text-base text-[var(--ink-2)] leading-snug">
                            Choose your role. Next you&apos;ll confirm your account type and continue
                            with Google.
                          </p>
                        </div>

                        <div className="space-y-3 pt-1" role="group" aria-label="Select your role">
                          <motion.button
                            type="button"
                            aria-pressed={role === 'student'}
                            whileHover={prefersReducedMotion ? undefined : { y: -3 }}
                            whileTap={prefersReducedMotion ? undefined : { scale: 0.985 }}
                            transition={{ duration: 0.2, ease: EASE_SPRING_OVERSHOOT }}
                            onClick={() => {
                              setRole('student');
                              setErrorMsg(null);
                            }}
                            className={`group relative w-full text-left rounded-[22px] p-5 transition-colors flex items-start justify-between gap-3 ${
                              role === 'student'
                                ? 'border-[1.5px] border-[var(--crimson)] bg-[var(--paper-app)] shadow-[6px_6px_0_var(--crimson)] -translate-x-[3px] -translate-y-[3px]'
                                : 'border-[1.5px] border-[var(--ink)] bg-[var(--paper-input)] hover:bg-[var(--paper-raised)]'
                            }`}
                          >
                            <div className="space-y-1 pr-2">
                              <div className="flex items-center gap-3 font-display text-xl font-semibold tracking-[-0.02em] text-[var(--ink)]">
                                <GraduationCap
                                  className={`w-6 h-6 text-[var(--crimson)] shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.3,1.8,0.4,1)] ${
                                    role === 'student'
                                      ? 'scale-115 rotate-[8deg]'
                                      : 'group-hover:-rotate-[10deg] group-hover:scale-110'
                                  }`}
                                />
                                <span>Student</span>
                              </div>
                              <p className="text-sm text-[var(--ink-2)] leading-snug pl-9">
                                Discover events, register, get QR passes, find a squad.
                              </p>
                            </div>
                            <AnimatedTick active={role === 'student'} reduced={prefersReducedMotion} />
                          </motion.button>

                          <motion.button
                            type="button"
                            aria-pressed={role === 'official'}
                            whileHover={prefersReducedMotion ? undefined : { y: -3 }}
                            whileTap={prefersReducedMotion ? undefined : { scale: 0.985 }}
                            transition={{ duration: 0.2, ease: EASE_SPRING_OVERSHOOT }}
                            onClick={() => {
                              setRole('official');
                              setErrorMsg(null);
                            }}
                            className={`group relative w-full text-left rounded-[22px] p-5 transition-colors flex items-start justify-between gap-3 ${
                              role === 'official'
                                ? 'border-[1.5px] border-[var(--crimson)] bg-[var(--paper-app)] shadow-[6px_6px_0_var(--crimson)] -translate-x-[3px] -translate-y-[3px]'
                                : 'border-[1.5px] border-[var(--ink)] bg-[var(--paper-input)] hover:bg-[var(--paper-raised)]'
                            }`}
                          >
                            <div className="space-y-1 pr-2">
                              <div className="flex items-center gap-3 font-display text-xl font-semibold tracking-[-0.02em] text-[var(--ink)]">
                                <Building2
                                  className={`w-6 h-6 text-[var(--crimson)] shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.3,1.8,0.4,1)] ${
                                    role === 'official'
                                      ? 'scale-115 rotate-[8deg]'
                                      : 'group-hover:-rotate-[10deg] group-hover:scale-110'
                                  }`}
                                />
                                <span>Campus official</span>
                              </div>
                              <p className="text-sm text-[var(--ink-2)] leading-snug pl-9">
                                Post events, review club drafts &amp; see registration stats.
                                Requires a verified official or invited club account.
                              </p>
                            </div>
                            <AnimatedTick active={role === 'official'} reduced={prefersReducedMotion} />
                          </motion.button>
                        </div>

                        <motion.button
                          type="button"
                          disabled={!role}
                          animate={
                            role && !prefersReducedMotion
                              ? { scale: [0.97, 1.02, 1] }
                              : { scale: 1 }
                          }
                          whileHover={
                            role && !prefersReducedMotion ? { x: -2, y: -2 } : undefined
                          }
                          whileTap={
                            role && !prefersReducedMotion ? { x: 4, y: 4 } : undefined
                          }
                          transition={{ duration: 0.28, ease: EASE_SPRING_OVERSHOOT }}
                          onClick={() => {
                            if (role) {
                              setErrorMsg(null);
                              setPanelStep(2);
                            }
                          }}
                          className={`group w-full min-h-[54px] px-5 py-3.5 text-base sm:text-lg font-medium inline-flex items-center justify-center gap-2.5 transition-all ${
                            role
                              ? 'bg-[var(--crimson)] text-[var(--on-crimson)] border-[1.5px] border-[var(--crimson)] shadow-[5px_5px_0_var(--ink)] hover:shadow-[7px_7px_0_var(--ink)] cursor-pointer'
                              : 'bg-transparent text-[var(--ink-2)]/60 border-[1.5px] border-dashed border-[var(--border-warm)] cursor-not-allowed'
                          }`}
                        >
                          <span>Continue</span>
                          <ArrowRight className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1.5" />
                        </motion.button>

                        {!betaLocked && (
                          <div className="pt-4 border-t border-[var(--border-warm)] text-center">
                            <button
                              type="button"
                              onClick={onContinueAsGuest}
                              className="text-sm font-medium text-[var(--ink)] underline underline-offset-4 py-1 px-1.5 bg-gradient-to-r from-[var(--orange)] to-[var(--orange)] bg-[length:0%_100%] bg-no-repeat hover:bg-[length:100%_100%] hover:text-[#fef9ef] hover:no-underline transition-[background-size,color] duration-300"
                            >
                              Explore events as guest
                            </button>
                          </div>
                        )}
                      </motion.div>
                    ) : (
                      <motion.div
                        key="panel-step-2"
                        initial={prefersReducedMotion ? false : { opacity: 0, x: 44 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={prefersReducedMotion ? undefined : { opacity: 0, x: 44 }}
                        transition={{ duration: 0.34, ease: EASE_OUT_EXPO }}
                        className="space-y-4"
                      >
                        <div className="space-y-1.5">
                          <h2 className="font-display text-2xl sm:text-[32px] font-extrabold tracking-[-0.04em] leading-[1.08] text-[var(--ink)]">
                            New or returning?
                          </h2>
                          <p className="text-sm sm:text-base text-[var(--ink-2)] leading-snug">
                            Signing in as{' '}
                            <strong className="font-semibold text-[var(--ink)]">
                              {isOfficial ? 'Campus official' : 'Student'}
                            </strong>
                            .
                          </p>
                        </div>

                        <div className="space-y-3 pt-1" role="group" aria-label="Account status">
                          <motion.button
                            type="button"
                            aria-pressed={activeMode === 'signup'}
                            whileHover={prefersReducedMotion ? undefined : { y: -3 }}
                            whileTap={prefersReducedMotion ? undefined : { scale: 0.985 }}
                            transition={{ duration: 0.2, ease: EASE_SPRING_OVERSHOOT }}
                            onClick={() => openMode('signup')}
                            className={`relative w-full text-left rounded-[22px] p-5 transition-colors flex items-start justify-between gap-3 ${
                              activeMode === 'signup'
                                ? 'border-[1.5px] border-[var(--crimson)] bg-[var(--paper-app)] shadow-[6px_6px_0_var(--crimson)] -translate-x-[3px] -translate-y-[3px]'
                                : 'border-[1.5px] border-[var(--ink)] bg-[var(--paper-input)] hover:bg-[var(--paper-raised)]'
                            }`}
                          >
                            <div className="space-y-1 pr-2">
                              <span className="block font-display text-xl font-semibold tracking-[-0.02em] text-[var(--ink)]">
                                New user
                              </span>
                              <span className="block text-sm text-[var(--ink-2)] leading-snug">
                                Create your account with Google in a few seconds.
                              </span>
                            </div>
                            <AnimatedTick
                              active={activeMode === 'signup'}
                              reduced={prefersReducedMotion}
                            />
                          </motion.button>

                          <motion.button
                            type="button"
                            aria-pressed={activeMode === 'login'}
                            whileHover={prefersReducedMotion ? undefined : { y: -3 }}
                            whileTap={prefersReducedMotion ? undefined : { scale: 0.985 }}
                            transition={{ duration: 0.2, ease: EASE_SPRING_OVERSHOOT }}
                            onClick={() => openMode('login')}
                            className={`relative w-full text-left rounded-[22px] p-5 transition-colors flex items-start justify-between gap-3 ${
                              activeMode === 'login'
                                ? 'border-[1.5px] border-[var(--crimson)] bg-[var(--paper-app)] shadow-[6px_6px_0_var(--crimson)] -translate-x-[3px] -translate-y-[3px]'
                                : 'border-[1.5px] border-[var(--ink)] bg-[var(--paper-input)] hover:bg-[var(--paper-raised)]'
                            }`}
                          >
                            <div className="space-y-1 pr-2">
                              <span className="block font-display text-xl font-semibold tracking-[-0.02em] text-[var(--ink)]">
                                Already registered
                              </span>
                              <span className="block text-sm text-[var(--ink-2)] leading-snug">
                                Pick up where you left off.
                              </span>
                            </div>
                            <AnimatedTick
                              active={activeMode === 'login'}
                              reduced={prefersReducedMotion}
                            />
                          </motion.button>
                        </div>

                        {isOfficial ? (
                          <div className="p-3.5 rounded-[18px] bg-[var(--paper-raised)] border border-[var(--border-warm)] space-y-1.5 text-xs text-[var(--ink-2)]">
                            <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--ink)] flex items-center gap-1.5">
                              <ShieldCheck className="w-4 h-4 text-[var(--crimson)]" />
                              <span>The server verifies</span>
                            </div>
                            <p className="leading-relaxed">
                              Checks for an appointed Campus Official record, redeemed Club Leader
                              invite, or External Partner governance approval.
                            </p>
                          </div>
                        ) : activeMode === 'signup' ? (
                          <div className="p-3.5 rounded-[18px] bg-[var(--paper-raised)] border border-[var(--border-warm)] text-xs text-[var(--ink-2)] leading-relaxed">
                            You&apos;ll add your phone number, branch, and campus right after
                            signing up with Google.
                          </div>
                        ) : null}

                        {errorMsg && (
                          <motion.div
                            initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-3 border border-[var(--crimson)] bg-[var(--crimson-tint)] text-xs font-medium text-[var(--crimson)]"
                          >
                            {errorMsg}
                          </motion.div>
                        )}

                        <div className="space-y-2.5 pt-1">
                          <motion.button
                            type="button"
                            disabled={busy}
                            whileHover={
                              !busy && !prefersReducedMotion ? { x: -2, y: -2 } : undefined
                            }
                            whileTap={
                              !busy && !prefersReducedMotion ? { x: 4, y: 4 } : undefined
                            }
                            transition={{ duration: 0.14, ease: EASE_OUT_EXPO }}
                            onClick={handleSubmit}
                            className="group w-full min-h-[54px] px-5 py-3.5 text-base sm:text-lg font-semibold bg-[var(--crimson)] text-[var(--on-crimson)] border-[1.5px] border-[var(--crimson)] shadow-[5px_5px_0_var(--ink)] hover:shadow-[7px_7px_0_var(--ink)] inline-flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60"
                          >
                            {busy ? (
                              <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Checking your account...</span>
                              </>
                            ) : (
                              <>
                                <span>
                                  {activeMode === 'signup'
                                    ? 'Sign up with Google'
                                    : 'Log in with Google'}
                                </span>
                                <ArrowRight className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1.5" />
                              </>
                            )}
                          </motion.button>

                          {isOfficial && onOpenInviteAccept && (
                            <button
                              type="button"
                              onClick={onOpenInviteAccept}
                              className="paper-btn-secondary w-full min-h-[44px] px-4 py-2 text-xs sm:text-sm inline-flex items-center justify-center gap-2"
                            >
                              <KeyRound className="w-4 h-4 text-[var(--crimson)]" />
                              <span>Have a Club Leader Invite Code?</span>
                            </button>
                          )}
                        </div>

                        <div className="pt-4 border-t border-[var(--border-warm)] text-center">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              setPanelStep(1);
                              setErrorMsg(null);
                            }}
                            className="text-sm font-medium text-[var(--ink)] underline underline-offset-4 py-1 px-1.5 bg-gradient-to-r from-[var(--orange)] to-[var(--orange)] bg-[length:0%_100%] bg-no-repeat hover:bg-[length:100%_100%] hover:text-[#fef9ef] hover:no-underline transition-[background-size,color] duration-300"
                          >
                            Back to role
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
