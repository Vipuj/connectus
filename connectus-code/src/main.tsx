import { Component, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

(window as unknown as { gm_authFailure?: () => void }).gm_authFailure = () => {
  window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
};

const origError = console.error;
console.error = (...args: unknown[]) => {
  origError.apply(console, args);
  const msg = args.map((a) => String(a)).join(' ');
  if (msg.includes('OverQuotaMapError') || msg.includes('QuotaExceededError')) {
    window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
  }
};

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'An unexpected error occurred.',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Connectus ErrorBoundary caught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[var(--paper,#F7F2EC)] text-[var(--ink,#1E1915)] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[var(--paper-raised,#EFE6DB)] border border-[var(--border-ink,#1E1915)] rounded-[14px] p-6 space-y-4">
            <div className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--crimson,#B8293D)]">
              Connectus · Recovery Mode
            </div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight">
              Something interrupted your session
            </h1>
            <p className="text-xs text-[var(--ink-2,#5F554C)] leading-relaxed break-words">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2.5 text-xs font-bold uppercase tracking-[0.06em] bg-[var(--ink,#1E1915)] text-[var(--on-ink,#F7F2EC)] rounded-[10px]"
            >
              Reload Connectus
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
