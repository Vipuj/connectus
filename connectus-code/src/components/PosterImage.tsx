import { useEffect, useState } from 'react';
import { CalendarDays } from 'lucide-react';

interface PosterImageProps {
  src: string;
  alt: string;
  title: string;
  className?: string;
}

export function PosterImage({ src, alt, title, className = '' }: PosterImageProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (failed || !src) {
    return (
      <div
        className={`flex flex-col items-center justify-center min-w-[75%] min-h-[75%] bg-[var(--feel-tint)] border border-[var(--ink)] text-[var(--ink)] p-6 text-center ${className}`}
      >
        <CalendarDays className="w-8 h-8 mb-2 text-[var(--crimson)]" strokeWidth={1.5} />
        <span className="font-bold text-sm tracking-[-0.02em] text-[var(--ink)] line-clamp-2">
          {title}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
