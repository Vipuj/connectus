import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { CampusNetworkCanvas } from './CampusNetworkCanvas';

export type LoadingStage = 'auth' | 'profile' | 'feed' | 'ready';

interface LoadingSplashProps {
  stage?: LoadingStage;
  progress?: number;
}

const EASE_SMOOTH: [number, number, number, number] = [0.22, 0.61, 0.36, 1];
const SPRING_BRAND = { type: 'spring' as const, stiffness: 125, damping: 24, mass: 0.9 };

const STAGE_COPY: Record<LoadingStage, string> = {
  auth: 'Connecting to Connectus',
  profile: 'Syncing your profile',
  feed: 'Loading campus events',
  ready: 'Ready',
};

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

export function LoadingSplash({ stage = 'auth', progress = 12 }: LoadingSplashProps) {
  const prefersReducedMotion = Boolean(useReducedMotion());
  const logoSize = useLogoSize();
  const symbolSize = Math.round(logoSize * 1.15 * 100) / 100;
  const gapSize = Math.round(logoSize * 0.28 * 100) / 100;

  const clampedProgress = Math.min(100, Math.max(0, progress));
  const displayPercent = Math.round(clampedProgress);
  const fillWidth = Math.min(100, Math.max(6, clampedProgress));

  return (
    <div
      className="min-h-screen bg-[var(--paper)] text-[var(--ink)] relative overflow-hidden flex items-center justify-center px-6 py-10 cp-paper-grid-bg selection:bg-[var(--feel-tint)] selection:text-[var(--ink)]"
      role="status"
      aria-live="polite"
      aria-label="Loading Connectus"
    >
      <CampusNetworkCanvas className="opacity-65" />

      {/* Soft radial paper vignette */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 opacity-45"
        style={{
          background: 'radial-gradient(circle at 50% 45%, transparent 0%, var(--paper) 100%)',
        }}
      />

      {/* Centered Stage: Horizontal Logo + Wordmark + Continuous Progress Rail */}
      <main className="relative z-10 w-full max-w-[420px] mx-auto flex flex-col items-center">
        {/* Shared-element Connectus horizontal lockup: glides smoothly into WelcomeAuthPage middle hero */}
        <motion.div
          layoutId={prefersReducedMotion ? undefined : 'connectus-brand-lockup'}
          transition={{
            layout: SPRING_BRAND,
          }}
          className="inline-flex items-center justify-center select-none"
          style={{ gap: gapSize }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 64 64"
            width={symbolSize}
            height={symbolSize}
            fill="none"
            aria-hidden="true"
            className="block overflow-visible shrink-0"
          >
            <g transform="translate(32 32) rotate(-45) scale(.92) translate(-32 -32)" strokeWidth="8">
              <motion.rect
                x="8"
                y="19"
                width="30"
                height="26"
                rx="13"
                stroke="var(--ink)"
                initial={prefersReducedMotion ? false : { x: -8, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.28, ease: EASE_SMOOTH }}
              />
              <motion.rect
                x="26"
                y="19"
                width="30"
                height="26"
                rx="13"
                stroke="var(--orange)"
                initial={prefersReducedMotion ? false : { x: 8, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.28, delay: 0.04, ease: EASE_SMOOTH }}
              />
              <motion.path
                d="M25 19A13 13 0 0 1 38 32"
                stroke="var(--ink)"
                initial={prefersReducedMotion ? false : { pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.24, delay: 0.12, ease: EASE_SMOOTH }}
              />
            </g>
          </svg>

          <motion.span
            initial={prefersReducedMotion ? false : { opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.26, delay: 0.05, ease: EASE_SMOOTH }}
            style={{
              font: `800 ${logoSize}px/1 "Plus Jakarta Sans", system-ui, sans-serif`,
              letterSpacing: '-0.05em',
              color: 'var(--ink)',
              whiteSpace: 'nowrap',
            }}
          >
            connectus
          </motion.span>
        </motion.div>

        {/* Continuous Progress Rail — driven 1:1 from App.tsx's single RAF loop */}
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.12, ease: EASE_SMOOTH }}
          className="w-full mt-8 space-y-3"
        >
          <div className="w-full h-3 bg-[var(--paper-input)] border border-[var(--border-ink)] shadow-[4px_4px_0_var(--crimson)] overflow-hidden">
            <div
              className="h-full bg-[var(--ink)] relative flex justify-end"
              style={{ width: `${fillWidth}%` }}
            >
              <span className="h-full w-2.5 bg-[var(--orange)] block shrink-0" aria-hidden="true" />
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 pt-0.5">
            <div className="h-5 overflow-hidden flex-1">
              <AnimatePresence mode="wait" initial={false}>
                <motion.p
                  key={stage}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={prefersReducedMotion ? undefined : { opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: EASE_SMOOTH }}
                  className="m-0 text-xs sm:text-sm font-normal text-[var(--ink-2)] truncate"
                >
                  {STAGE_COPY[stage]}
                </motion.p>
              </AnimatePresence>
            </div>
            <span className="font-mono text-xs font-medium tabular-nums text-[var(--crimson)] shrink-0">
              {displayPercent}%
            </span>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
