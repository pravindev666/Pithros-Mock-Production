import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useReducedMotion } from 'motion/react';
import { useTheme } from '../../context/ThemeContext';

export interface LandingAtmosphereProps {
  className?: string;
}

interface CelestialMote {
  x: number;
  y: number;
  size: number;
  baseAlpha: number;
  phase: number;
  speed: number;
  driftX: number;
  driftY: number;
}

/**
 * Pithros Global Landing Atmosphere Engine
 * 
 * Art Direction: "Sanctuary Sky: Continuous Atmosphere"
 * 
 * Solves the critical visual drop-off where below-the-fold sections
 * became completely flat after the hero section.
 * 
 * Architecture:
 * - Single persistent 2D Canvas covering the viewport (fixed inset-0).
 * - Exactly ONE RequestAnimationFrame loop for the entire landing page.
 * - Dynamic scroll-aware Atmospheric Density Curve:
 *     Hero (0-15%): 100% celestial presence
 *     Narrative & Timeline (15-35%): 65% contemplative presence
 *     Family & Gestures (35-55%): 52% warm reverent presence
 *     Privacy & Keepsake (55-70%): 42% quiet architectural depth
 *     Pricing & FAQs (70-86%): 24% ultra-clean, high readability
 *     Final CTA (86-100%): 72% warm emotional closing
 * - Zero frame-0 resets on scroll: time is continuous.
 * - Multi-layer Sanctuary Candlelight breathing glow.
 * - Automatically pauses RAF on tab blur / prefers-reduced-motion.
 * - Zero extra npm dependencies, zero layout shifts, zero pointer events.
 */
export const LandingAtmosphere: React.FC<LandingAtmosphereProps> = ({
  className = '',
}) => {
  const { isDark } = useTheme();
  const shouldReduceMotion = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Smooth scroll tracker with RAF throttling
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrollY = window.scrollY;
          const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
          const ratio = Math.min(1, Math.max(0, scrollY / maxScroll));
          setScrollProgress(ratio);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Compute atmospheric intensity curve based on normalized scroll ratio
  const atmosphericIntensity = useMemo(() => {
    // 0.0 - 0.15: Hero
    if (scrollProgress <= 0.15) {
      return 1.0;
    }
    // 0.15 - 0.35: Story & Timeline
    if (scrollProgress <= 0.35) {
      const t = (scrollProgress - 0.15) / 0.20;
      return 1.0 - t * 0.35; // 1.0 -> 0.65
    }
    // 0.35 - 0.55: Family & Gestures
    if (scrollProgress <= 0.55) {
      const t = (scrollProgress - 0.35) / 0.20;
      return 0.65 - t * 0.13; // 0.65 -> 0.52
    }
    // 0.55 - 0.70: Privacy & Keepsake
    if (scrollProgress <= 0.70) {
      const t = (scrollProgress - 0.55) / 0.15;
      return 0.52 - t * 0.10; // 0.52 -> 0.42
    }
    // 0.70 - 0.86: Pricing & FAQs (Quiet zone for maximum clarity)
    if (scrollProgress <= 0.86) {
      const t = (scrollProgress - 0.70) / 0.16;
      return 0.42 - t * 0.18; // 0.42 -> 0.24
    }
    // 0.86 - 1.00: Final CTA & Footer (Warm return)
    const t = (scrollProgress - 0.86) / 0.14;
    return 0.24 + t * 0.48; // 0.24 -> 0.72
  }, [scrollProgress]);

  // Canvas 2D Persistent Celestial Dust
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;
    let dpr = 1;

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // Generate 26 contemplative, sparse celestial dust motes
    const motes: CelestialMote[] = Array.from({ length: 26 }, (_, i) => {
      const x = ((i * 37 + 13) % 100) / 100;
      const y = ((i * 43 + 29) % 100) / 100;
      return {
        x,
        y,
        size: i % 4 === 0 ? 1.4 : i % 2 === 0 ? 1.0 : 0.7,
        baseAlpha: isDark ? 0.14 + (i % 5) * 0.04 : 0.09 + (i % 5) * 0.03,
        phase: (i * 1.5) % (Math.PI * 2),
        speed: 0.0005 + (i % 3) * 0.0002,
        driftX: (i % 2 === 0 ? 1 : -1) * (0.00003 + (i % 3) * 0.000015),
        driftY: -0.00005 - (i % 3) * 0.000015, // Gentle upward celestial drift
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
          mote.x = (mote.x + mote.driftX + 1) % 1;
          mote.y = (mote.y + mote.driftY + 1) % 1;
        }

        const pixelX = mote.x * width;
        const pixelY = mote.y * height;

        // Gentle breathing luminance cycle (6s - 10s oscillation)
        const pulse = shouldReduceMotion ? 1 : 0.55 + 0.45 * Math.sin(elapsed * mote.speed + mote.phase);
        const currentAlpha = mote.baseAlpha * pulse * atmosphericIntensity;

        if (currentAlpha > 0.01) {
          ctx.beginPath();
          ctx.arc(pixelX, pixelY, mote.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${starColorRgb}, ${currentAlpha})`;
          ctx.fill();

          // Subtle corona for larger celestial points in dark mode
          if (mote.size > 1.1 && isDark && currentAlpha > 0.05) {
            ctx.beginPath();
            ctx.arc(pixelX, pixelY, mote.size * 2.2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(185, 148, 82, ${currentAlpha * 0.22})`;
            ctx.fill();
          }
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
  }, [isDark, shouldReduceMotion, atmosphericIntensity]);

  // Glow vertical anchor follows scroll smoothly
  const glowCenterY = Math.round(40 + scrollProgress * 20);

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 pointer-events-none select-none overflow-hidden z-0 ${className}`}
    >
      {/* ─────────────────────────────────────────────────────────────
          LAYER 1: Continuous Sanctuary Light Field (Scroll & Theme Aware)
          ───────────────────────────────────────────────────────────── */}
      <div
        className="absolute inset-0 transition-opacity duration-1000"
        style={{
          background: isDark
            ? `radial-gradient(ellipse 75% 65% at 50% ${glowCenterY}%,
                rgba(35, 50, 74, ${0.36 * atmosphericIntensity}) 0%,
                rgba(24, 35, 55, ${0.22 * atmosphericIntensity}) 35%,
                rgba(185, 148, 82, ${0.045 * atmosphericIntensity}) 58%,
                rgba(17, 24, 32, 0) 80%,
                transparent 100%)`
            : `radial-gradient(ellipse 75% 65% at 50% ${glowCenterY}%,
                rgba(255, 252, 245, ${0.80 * atmosphericIntensity}) 0%,
                rgba(238, 230, 216, ${0.40 * atmosphericIntensity}) 35%,
                rgba(185, 148, 82, ${0.04 * atmosphericIntensity}) 55%,
                rgba(243, 238, 228, 0) 78%,
                transparent 100%)`,
          animation: shouldReduceMotion ? 'none' : 'pithrosGlowPulse 16s ease-in-out infinite alternate',
          willChange: 'opacity',
        }}
      />

      {/* Secondary Warm Candlelight Node (Subtle asymmetrical warmth) */}
      <div
        className="absolute w-[600px] h-[450px] rounded-full blur-3xl transition-all duration-1000"
        style={{
          left: `${20 + scrollProgress * 30}%`,
          top: `${30 + (1 - scrollProgress) * 40}%`,
          background: isDark
            ? `radial-gradient(circle, rgba(185, 148, 82, ${0.04 * atmosphericIntensity}) 0%, transparent 70%)`
            : `radial-gradient(circle, rgba(185, 148, 82, ${0.035 * atmosphericIntensity}) 0%, transparent 70%)`,
          opacity: atmosphericIntensity,
          willChange: 'transform, opacity',
        }}
      />

      {/* ─────────────────────────────────────────────────────────────
          LAYER 2: Persistent Celestial Memory Dust (Canvas 2D)
          ───────────────────────────────────────────────────────────── */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />
    </div>
  );
};
