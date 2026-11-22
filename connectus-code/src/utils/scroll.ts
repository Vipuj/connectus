export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function smoothScrollPageTop(): void {
  if (typeof window === 'undefined') return;
  window.scrollTo({
    top: 0,
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
  });
}

export interface FollowTargetOptions {
  block?: ScrollLogicalPosition;
  highlight?: boolean;
  focusInput?: boolean;
  delayMs?: number;
}

/**
 * Smoothly scrolls the viewport (or enclosing modal/scroll container) to a newly opened
 * form or target section, pulses a brief crimson spotlight outline so the user's eye
 * follows the redirect, and optionally focuses the first input without jumping.
 */
export function focusAndFollowTarget(
  target: HTMLElement | string | null | undefined,
  options: FollowTargetOptions = {}
): void {
  if (typeof window === 'undefined' || !target) return;

  const {
    block = 'center',
    highlight = true,
    focusInput = true,
    delayMs = 70,
  } = options;

  window.setTimeout(() => {
    const el =
      typeof target === 'string'
        ? (document.querySelector(target) as HTMLElement | null)
        : target;
    if (!el || !el.isConnected) return;

    el.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block,
      inline: 'nearest',
    });

    if (highlight && !prefersReducedMotion()) {
      el.classList.remove('cp-spotlight');
      // Force reflow so rapid repeated clicks replay the spotlight cleanly
      void el.offsetWidth;
      el.classList.add('cp-spotlight');
      window.setTimeout(() => {
        el.classList.remove('cp-spotlight');
      }, 1250);
    }

    if (focusInput) {
      const firstInput = el.querySelector<HTMLElement>(
        'input:not([type="hidden"]):not([disabled]):not([readonly]), select:not([disabled]), textarea:not([disabled])'
      );
      if (firstInput) {
        window.setTimeout(() => {
          firstInput.focus({ preventScroll: true });
        }, prefersReducedMotion() ? 0 : 280);
      }
    }
  }, delayMs);
}
