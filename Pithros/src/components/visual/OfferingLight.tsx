import React from 'react';
import { motion } from 'motion/react';
import { useTheme } from '../../context/ThemeContext';

interface OfferingLightProps {
  size?: number;
  className?: string;
}

export const OfferingLight: React.FC<OfferingLightProps> = ({
  size = 48,
  className = '',
}) => {
  const { isDark } = useTheme();
  const flameId = React.useId();

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      {/* Outer Halo — Soft Pulse */}
      <motion.div
        className={`absolute rounded-full blur-md pointer-events-none ${
          isDark ? 'bg-[#B99452]/20' : 'bg-[#B99452]/15'
        }`}
        style={{ width: size * 1.45, height: size * 1.45 }}
        animate={{ scale: [0.95, 1.12, 0.95], opacity: [0.35, 0.65, 0.35] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Middle Golden Warmth */}
      <motion.div
        className={`absolute rounded-full blur-sm pointer-events-none ${
          isDark ? 'bg-[#D1B477]/25' : 'bg-[#D1B477]/20'
        }`}
        style={{ width: size * 0.85, height: size * 0.85 }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.55, 0.85, 0.55] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Center Radiant Flame Core — Non-religious symbolic flame */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 select-none"
        aria-hidden="true"
      >
        <path
          d="M16 4C14 10 9 14 9 19C9 23 12 26 16 26C20 26 23 23 23 19C23 14 18 10 16 4Z"
          fill={`url(#${flameId})`}
        />
        <ellipse
          cx="16"
          cy="20"
          rx="3.2"
          ry="5.2"
          fill={isDark ? '#F8F5EE' : '#FCFAF5'}
        />
        <defs>
          <radialGradient
            id={flameId}
            cx="0.5"
            cy="0.65"
            r="0.5"
          >
            {isDark ? (
              <>
                <stop offset="0%" stopColor="#F8F5EE" />
                <stop offset="35%" stopColor="#D1B477" />
                <stop offset="85%" stopColor="#B99452" />
                <stop offset="100%" stopColor="#182337" stopOpacity="0.4" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#FCFAF5" />
                <stop offset="35%" stopColor="#D1B477" />
                <stop offset="85%" stopColor="#B99452" />
                <stop offset="100%" stopColor="#182337" stopOpacity="0.4" />
              </>
            )}
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
};
