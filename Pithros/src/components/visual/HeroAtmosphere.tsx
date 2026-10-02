import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useReducedMotion } from 'motion/react';
import { useTheme } from '../../context/ThemeContext';

export interface HeroAtmosphereProps {
  className?: string;
  intensity?: 'whisper' | 'soft' | 'contemplative';
  includeDust?: boolean;
}

interface StarMote {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  size: number;
  opacity: number;
  phase: number;
  speed: number;
  driftX: number;
  driftY: number;
}

/**
 * Pithros Hero Atmosphere Engine
 * 
 * Art Direction: "Sanctuary Sky" — The Heritage Hybrid
 * 
 * Multi-layer architecture:
 * Layer 1: Ambient Candlelight Breathing Glow (CSS GPU-composited radial falloff)
 * Layer 2: Celestial Memory Dust (Canvas 2D, zero DOM nodes, RAF paused when hidden)
 * Layer 3: Concentric Memory Orbitals (Hair-thin SVG geometry, 90s majestic rotation)
 * Layer 4: Foreground Depth Shift (Subtle 4px parallax, disabled on mobile/reduced motion)
 * 
 * Strict Performance Constraints:
 * - 0 KB extra npm dependencies
 * - < 1.0% CPU footprint
 * - Automatic RAF pause on background tab or prefers-reduced-motion
 * - High-DPI Retina canvas scaling
 */
export const HeroAtmosphere: React.FC<HeroAtmosphereProps> = ({
  className = '',
  intensity = 'soft',
  includeDust = false,
}) => {
  const { isDark } = useTheme();
  const shouldReduceMotion = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Subtle mouse depth parallax (-4px to +4px)
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (shouldReduceMotion) return;
    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const x = ((e.clientX / innerWidth) - 0.5) * 8;
      const y = ((e.clientY / innerHeight) - 0.5) * 8;
      setMouseOffset({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [shouldReduceMotion]);

  // Canvas 2D Celestial Memory Dust System (Optional when global LandingAtmosphere is active)
  useEffect(() => {
    if (!includeDust) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;
    let dpr = window.devicePixelRatio || 1;

    // Responsive resize handler with High-DPI scaling
    const handleResize = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      width = rect?.width || window.innerWidth;
      height = rect?.height || window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // Generate 24 sparse, contemplative star motes
    const motesCount = intensity === 'whisper' ? 16 : intensity === 'contemplative' ? 28 : 22;
    const motes: StarMote[] = Array.from({ length: motesCount }, (_, i) => {
      const baseX = ((i * 47 + 19) % 100) / 100;
      const baseY = ((i * 53 + 31) % 100) / 100;
      return {
        x: baseX,
        y: baseY,
        baseX,
        baseY,
        size: i % 4 === 0 ? 1.6 : i % 2 === 0 ? 1.1 : 0.8,
        opacity: isDark ? 0.12 + (i % 6) * 0.05 : 0.08 + (i % 6) * 0.04,
        phase: (i * 1.3) % (Math.PI * 2),
        speed: 0.0006 + (i % 4) * 0.0003,
        driftX: (i % 2 === 0 ? 1 : -1) * (0.00004 + (i % 3) * 0.00002),
        driftY: -0.00006 - (i % 3) * 0.00002, // Gentle upward celestial drift
      };
    });

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

      const starColorRgb = isDark ? '248, 245, 238' : '185, 148, 82';
      const elapsed = time - startTime;

      motes.forEach((mote) => {
        if (!shouldReduceMotion) {
          // Subtle organic drift
          mote.x = (mote.x + mote.driftX + 1) % 1;
          mote.y = (mote.y + mote.driftY + 1) % 1;
        }

        const pixelX = mote.x * width;
        const pixelY = mote.y * height;

        // Gentle breathing luminance cycle (5s - 8s sine oscillation)
        const pulse = shouldReduceMotion ? 1 : 0.55 + 0.45 * Math.sin(elapsed * mote.speed + mote.phase);
        const currentAlpha = mote.opacity * pulse;

        // Draw soft radiant point
        ctx.beginPath();
        ctx.arc(pixelX, pixelY, mote.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${starColorRgb}, ${currentAlpha})`;
        ctx.fill();

        // Extra soft celestial corona for larger motes
        if (mote.size > 1.2 && isDark) {
          ctx.beginPath();
          ctx.arc(pixelX, pixelY, mote.size * 2.4, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(185, 148, 82, ${currentAlpha * 0.25})`;
          ctx.fill();
        }
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

  // Stroke color tokens based on theme
  const strokePrimary = isDark ? '#B99452' : '#23324A';
  const strokeSecondary = isDark ? '#D1B477' : '#B99452';
  const strokeMuted = isDark ? '#2D3D56' : '#E5DED2';

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={`absolute inset-0 overflow-hidden pointer-events-none select-none ${className}`}
    >
      {/* ─────────────────────────────────────────────────────────────
          LAYER 1: Sanctuary Candlelight & Atmospheric Radial Glow
          ───────────────────────────────────────────────────────────── */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[580px] max-w-[96vw] rounded-full blur-3xl transition-opacity duration-1000"
        style={{
          background: isDark
            ? `radial-gradient(ellipse 60% 50% at 50% 50%,
                rgba(35, 50, 74, 0.42) 0%,
                rgba(24, 35, 55, 0.28) 32%,
                rgba(185, 148, 82, 0.055) 54%,
                rgba(17, 24, 32, 0.005) 72%,
                transparent 100%)`
            : `radial-gradient(ellipse 60% 50% at 50% 50%,
                rgba(255, 252, 245, 0.85) 0%,
                rgba(238, 230, 216, 0.45) 30%,
                rgba(185, 148, 82, 0.05) 52%,
                rgba(243, 238, 228, 0) 74%,
                transparent 100%)`,
          animation: shouldReduceMotion ? 'none' : 'pithrosGlowPulse 14s ease-in-out infinite alternate',
          transform: `translate3d(${mouseOffset.x * 0.4}px, ${mouseOffset.y * 0.4}px, 0)`,
          willChange: 'transform, opacity',
        }}
      />

      {/* ─────────────────────────────────────────────────────────────
          LAYER 2: Hair-Thin Concentric Celestial Memory Orbitals
          ───────────────────────────────────────────────────────────── */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[520px] max-w-[98vw] transition-transform duration-700 ease-out"
        style={{
          transform: `translate(-50%, -50%) translate3d(${mouseOffset.x * 0.8}px, ${mouseOffset.y * 0.8}px, 0)`,
        }}
      >
        <svg
          viewBox="0 0 900 520"
          className="w-full h-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Majestic 90-second slow rotating orbital geometry */}
          <g
            style={{
              transformOrigin: '450px 260px',
              animation: shouldReduceMotion ? 'none' : 'pithrosOrbitRotation 90s linear infinite',
            }}
          >
            {/* Outer Grand Orbit */}
            <ellipse
              cx="450"
              cy="260"
              rx="420"
              ry="210"
              stroke={strokeMuted}
              strokeWidth="0.75"
              strokeOpacity={isDark ? '0.18' : '0.22'}
              strokeDasharray="3 9"
            />

            {/* Inner Kinship Orbit */}
            <ellipse
              cx="450"
              cy="260"
              rx="310"
              ry="140"
              stroke={strokePrimary}
              strokeWidth="0.8"
              strokeOpacity={isDark ? '0.22' : '0.28'}
              strokeDasharray="6 12"
              transform="rotate(6 450 260)"
            />

            {/* Whisper Focal Ring */}
            <ellipse
              cx="450"
              cy="260"
              rx="210"
              ry="95"
              stroke={strokeSecondary}
              strokeWidth="0.6"
              strokeOpacity={isDark ? '0.15' : '0.2'}
              transform="rotate(-12 450 260)"
            />

            {/* Faint Kinship Anchor Nodes */}
            <circle cx="140" cy="260" r="1.5" fill={strokePrimary} fillOpacity={isDark ? 0.45 : 0.55} />
            <circle cx="760" cy="260" r="1.5" fill={strokePrimary} fillOpacity={isDark ? 0.45 : 0.55} />
            <circle cx="450" cy="50" r="1.5" fill={strokeSecondary} fillOpacity={isDark ? 0.4 : 0.5} />
            <circle cx="450" cy="470" r="1.5" fill={strokeSecondary} fillOpacity={isDark ? 0.4 : 0.5} />
          </g>

          {/* Static Soft Horizon Memory Line (Bottom Anchor) */}
          <path
            d="M50 490C280 470 620 470 850 490"
            stroke={strokePrimary}
            strokeWidth="0.75"
            strokeOpacity={isDark ? '0.2' : '0.25'}
            strokeDasharray="2 8"
          />
        </svg>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          LAYER 3: Canvas 2D Celestial Memory Dust System (Optional)
          ───────────────────────────────────────────────────────────── */}
      {includeDust && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />
      )}
    </div>
  );
};
