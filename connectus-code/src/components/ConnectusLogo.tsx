interface ConnectusLogoProps {
  variant?: 'light' | 'dark';
  size?: number;
  wordmark?: boolean;
  layout?: 'horizontal' | 'stacked';
  className?: string;
}

export function ConnectusLogo({
  variant = 'light',
  size = 32,
  wordmark = true,
  layout = 'horizontal',
  className = '',
}: ConnectusLogoProps) {
  const ink = 'var(--ink, #251911)';
  const cream = '#fef9ef';
  const orange = 'var(--orange, #e64706)';
  const a = variant === 'dark' ? cream : ink;
  const symbolSize = Math.round(size * 1.15 * 100) / 100;
  const gapSize = Math.round(size * 0.28 * 100) / 100;

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        flexDirection: layout === 'stacked' ? 'column' : 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: gapSize,
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 64 64"
        width={symbolSize}
        height={symbolSize}
        fill="none"
        role="img"
        aria-label={wordmark ? undefined : 'Connectus'}
        aria-hidden={wordmark ? true : undefined}
        style={{ flexShrink: 0, display: 'block' }}
      >
        <g transform="translate(32 32) rotate(-45) scale(.92) translate(-32 -32)" strokeWidth="8">
          <rect x="8" y="19" width="30" height="26" rx="13" stroke={a} />
          <rect x="26" y="19" width="30" height="26" rx="13" stroke={orange} />
          <path d="M25 19A13 13 0 0 1 38 32" stroke={a} />
        </g>
      </svg>
      {wordmark && (
        <span
          style={{
            font: `800 ${size}px/1 "Plus Jakarta Sans", system-ui, sans-serif`,
            letterSpacing: '-0.05em',
            color: a,
            whiteSpace: 'nowrap',
          }}
        >
          connectus
        </span>
      )}
    </span>
  );
}
