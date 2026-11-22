import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'motion/react';
import { THEME_CHANGE_EVENT } from '../utils/theme';

interface NetworkNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  rotation: number;
  size: number;
}

interface PulsePacket {
  a: NetworkNode;
  b: NetworkNode;
  t: number;
}

export function CampusNetworkCanvas({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const getPalette = () => {
      const isDark = document.documentElement.classList.contains('dark');
      return {
        nodeColors: isDark
          ? ['240,128,152', '255,122,61', '205,185,172']
          : ['165,47,72', '232,80,14', '140,120,105'],
        lineRgb: isDark ? '240,128,152' : '165,47,72',
        lineAlpha: isDark ? 0.28 : 0.28,
        nodeAlpha: isDark ? 0.58 : 0.55,
      };
    };

    let width = 0;
    let height = 0;
    let nodes: NetworkNode[] = [];
    let pulse: PulsePacket | null = null;
    let rafId = 0;
    const maxRadius = 160;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const initNodes = () => {
      const palette = getPalette();
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.max(14, Math.min(34, Math.round((width * height) / 32000)));
      nodes = Array.from({ length: count }, (_, i) => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.38,
        vy: (Math.random() - 0.5) * 0.38,
        color: palette.nodeColors[i % palette.nodeColors.length],
        rotation: Math.random() * Math.PI * 2,
        size: 5 + Math.random() * 4,
      }));
    };

    const drawFrame = () => {
      const palette = getPalette();
      ctx.clearRect(0, 0, width, height);

      for (const n of nodes) {
        if (!prefersReducedMotion) {
          n.x += n.vx;
          n.y += n.vy;
          n.rotation += 0.004;
          if (n.x < -20) n.x = width + 20;
          if (n.x > width + 20) n.x = -20;
          if (n.y < -20) n.y = height + 20;
          if (n.y > height + 20) n.y = -20;
        }
      }

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist < maxRadius) {
            ctx.strokeStyle = `rgba(${palette.lineRgb},${(1 - dist / maxRadius) * palette.lineAlpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();

            if (!pulse && !prefersReducedMotion && Math.random() < 0.0035) {
              pulse = { a, b, t: 0 };
            }
          }
        }
      }

      for (const n of nodes) {
        ctx.save();
        ctx.translate(n.x, n.y);
        ctx.rotate(n.rotation);
        ctx.fillStyle = `rgba(${n.color},${palette.nodeAlpha})`;
        ctx.fillRect(-n.size / 2, -n.size / 2, n.size, n.size);
        ctx.restore();
      }

      if (pulse) {
        pulse.t += 0.018;
        const px = pulse.a.x + (pulse.b.x - pulse.a.x) * pulse.t;
        const py = pulse.a.y + (pulse.b.y - pulse.a.y) * pulse.t;
        ctx.fillStyle = 'rgba(232,80,14,0.92)';
        ctx.beginPath();
        ctx.arc(px, py, 3.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(232,80,14,${Math.max(0, (1 - pulse.t) * 0.6)})`;
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.arc(px, py, 4 + pulse.t * 14, 0, Math.PI * 2);
        ctx.stroke();

        if (pulse.t >= 1) {
          pulse = null;
        }
      }

      if (!prefersReducedMotion) {
        rafId = window.requestAnimationFrame(drawFrame);
      }
    };

    initNodes();
    drawFrame();

    const handleResize = () => {
      initNodes();
      if (prefersReducedMotion) drawFrame();
    };

    const handleThemeChange = () => {
      const palette = getPalette();
      nodes.forEach((n, i) => {
        n.color = palette.nodeColors[i % palette.nodeColors.length];
      });
      if (prefersReducedMotion) drawFrame();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange);

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange);
    };
  }, [prefersReducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 w-full h-full z-0 ${className}`}
    />
  );
}
