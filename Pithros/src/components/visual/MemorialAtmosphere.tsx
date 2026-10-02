import React, { useEffect, useRef } from 'react';
import { useReducedMotion } from 'motion/react';
import { useTheme } from '../../context/ThemeContext';

export interface MemorialAtmosphereProps {
  className?: string;
  intensity?: 'whisper' | 'soft' | 'solemn';
}

/**
 * Pithros Memorial Atmosphere Engine
 * 
 * Art Direction: "Quiet Sacred Halo"
 * 
 * Specifically designed for the Public Memorial page (/m/:slug):
 * - Stationary, sacred focal backlight centered on the deceased's portrait
 * - 16s ultra-gentle candlelight breathing cycle
 * - Sparse, whisper-dim celestial starlight points (12-16 motes)
 * - Zero fast rotation or visual distraction to preserve complete reverence
 */
export const MemorialAtmosphere: React.FC<MemorialAtmosphereProps> = ({
  className = '',
  intensity = 'soft',
}) => {
  const { isDark } = useTheme();
  const shouldReduceMotion = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Canvas 2D ultra-dim ambient star points
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;

    const handleResize = () => {
      width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = canvas.parentElement?.clientHeight || 600;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // 14 fixed, gentle starlight points
    const count = intensity === 'whisper' ? 10 : intensity === 'solemn' ? 18 : 14;
    const stars = Array.from({ length: count }, (_, i) => ({
      x: ((i * 61 + 23) % 100) / 100,
      y: ((i * 47 + 17) % 100) / 100,
      size: i % 3 === 0 ? 1.3 : 0.8,
      baseOpacity: isDark ? 0.08 + (i % 4) * 0.03 : 0.05 + (i % 4) * 0.02,
      phase: i * 1.5,
      speed: 0.0004 + (i % 3) * 0.0002,
    }));

    let startTime = performance.now();
    let isVisible = !document.hidden;

    const handleVisibilityChange = () => {
      isVisible = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const render = (time: number) => {
      if (!isVisible) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, width, height);
      const starRgb = isDark ? '248, 245, 238' : '185, 148, 82';
      const elapsed = time - startTime;

      stars.forEach((star) => {
        const pulse = shouldReduceMotion ? 1 : 0.6 + 0.4 * Math.sin(elapsed * star.speed + star.phase);
        const alpha = star.baseOpacity * pulse;

        ctx.beginPath();
        ctx.arc(star.x * width, star.y * height, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${starRgb}, ${alpha})`;
        ctx.fill();
      });

      if (!shouldReduceMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    if (shouldReduceMotion) {
      render(startTime);
    } else {
      animationFrameId = requestAnimationFrame(render);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isDark, intensity, shouldReduceMotion]);

  return (
    <div
      aria-hidden="true"
      className={`absolute inset-0 overflow-hidden pointer-events-none select-none ${className}`}
    >
      {/* ─────────────────────────────────────────────────────────────
          PORTRAIT SANCTUARY BACKLIGHT
          Centered elliptical glow radiating warmth directly behind portrait
          ───────────────────────────────────────────────────────────── */}
      <div
        className="absolute top-12 left-1/2 -translate-x-1/2 w-[580px] h-[580px] max-w-[94vw] rounded-full blur-3xl pointer-events-none"
        style={{
          background: isDark
            ? `radial-gradient(circle at 50% 45%,
                rgba(35, 50, 74, 0.35) 0%,
                rgba(24, 35, 55, 0.22) 35%,
                rgba(185, 148, 82, 0.045) 55%,
                transparent 75%)`
            : `radial-gradient(circle at 50% 45%,
                rgba(255, 252, 245, 0.8) 0%,
                rgba(238, 230, 216, 0.38) 32%,
                rgba(185, 148, 82, 0.04) 55%,
                transparent 75%)`,
          animation: shouldReduceMotion ? 'none' : 'pithrosGlowPulse 16s ease-in-out infinite alternate',
          willChange: 'opacity',
        }}
      />

      {/* ─────────────────────────────────────────────────────────────
          CANVAS 2D AMBIENT STARFIELD
          ───────────────────────────────────────────────────────────── */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />
    </div>
  );
};
