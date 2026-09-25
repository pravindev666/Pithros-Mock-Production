import React from 'react';
import { motion } from 'motion/react';
import { useTheme } from '../../context/ThemeContext';
import { StarField } from './StarField';
import { MemoryOrbit } from './MemoryOrbit';
import { MemorialHalo } from './MemorialHalo';
import { MemoryThread } from './MemoryThread';
import { PithrosLogo } from './PithrosLogo';

interface AuthAtmosphereVisualProps {
  className?: string;
  tagline?: string;
}

export const AuthAtmosphereVisual: React.FC<AuthAtmosphereVisualProps> = ({
  className = '',
  tagline = 'A sanctuary for what remains.',
}) => {
  const { isDark } = useTheme();

  return (
    <div
      className={`relative w-full h-full min-h-[520px] rounded-3xl overflow-hidden flex flex-col justify-between p-8 md:p-12 border select-none transition-colors ${
        isDark
          ? 'bg-[#0E0C09] border-[#202C40]'
          : 'bg-[#F4ECE1] border-[#E5DED2]'
      } ${className}`}
      aria-hidden="true"
    >
      {/* 1. Ambient Background Gradients */}
      <div
        className="absolute inset-0 pointer-events-none opacity-60"
        style={{
          background: isDark
            ? 'radial-gradient(ellipse at 50% 40%, rgba(255, 184, 48, 0.08) 0%, rgba(255, 107, 0, 0.03) 45%, transparent 75%)'
            : 'radial-gradient(ellipse at 50% 40%, rgba(217, 148, 30, 0.12) 0%, rgba(178, 122, 30, 0.05) 50%, transparent 80%)',
        }}
      />

      {/* 2. StarField Drift */}
      <StarField count={28} className="opacity-70" />

      {/* 3. Top Branding Anchor */}
      <div className="relative z-10">
        <PithrosLogo variant={isDark ? 'dark' : 'light'} />
      </div>

      {/* 4. Center Atmospheric Geometrics: Orbit, Halo, Constellation Nodes */}
      <div className="relative z-10 flex-1 flex items-center justify-center my-6">
        {/* Slow rotating orbit ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 160, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <MemoryOrbit width="100%" height="100%" className="scale-125 opacity-70" />
        </motion.div>

        {/* Gentle pulsing halo */}
        <motion.div
          animate={{ scale: [0.97, 1.03, 0.97], opacity: [0.35, 0.5, 0.35] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute flex items-center justify-center pointer-events-none"
        >
          <MemorialHalo size={380} />
        </motion.div>

        {/* Abstract Memory Constellation SVG */}
        <div className="relative w-64 h-64 flex items-center justify-center">
          <svg
            viewBox="0 0 240 240"
            fill="none"
            className="w-full h-full"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Constellation link lines */}
            <motion.path
              d="M120 40 L180 90 L160 170 L80 170 L60 90 Z"
              stroke={isDark ? '#D9D2C6' : '#7D766D'}
              strokeWidth="0.75"
              strokeDasharray="3 4"
              strokeOpacity={isDark ? '0.35' : '0.4'}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.8, ease: 'easeInOut' }}
            />
            <motion.path
              d="M120 40 L120 120 L180 90 M120 120 L160 170 M120 120 L80 170 M120 120 L60 90"
              stroke={isDark ? '#B99452' : '#23324A'}
              strokeWidth="0.75"
              strokeOpacity={isDark ? '0.4' : '0.45'}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 2.2, ease: 'easeInOut' }}
            />

            {/* Radiant Center Node */}
            <circle cx="120" cy="120" r="16" fill={isDark ? '#B99452' : '#D9941E'} fillOpacity={isDark ? '0.12' : '0.18'} />
            <circle cx="120" cy="120" r="7" fill={isDark ? '#B99452' : '#23324A'} fillOpacity={isDark ? '0.45' : '0.55'} />
            <circle cx="120" cy="120" r="2.5" fill={isDark ? '#F8F5EE' : '#FCFAF5'} />

            {/* Perimeter Constellation Nodes */}
            <g className="cursor-default">
              <circle cx="120" cy="40" r="3" fill={isDark ? '#F8F5EE' : '#23324A'} />
              <circle cx="180" cy="90" r="2.5" fill={isDark ? '#D9D2C6' : '#7D766D'} />
              <circle cx="160" cy="170" r="3" fill={isDark ? '#B99452' : '#23324A'} />
              <circle cx="80" cy="170" r="2.5" fill={isDark ? '#D9D2C6' : '#7D766D'} />
              <circle cx="60" cy="90" r="3" fill={isDark ? '#B99452' : '#23324A'} />
            </g>
          </svg>

          {/* Core remembrance caption pill */}
          <div
            className={`absolute bottom-2 px-3 py-1 rounded-full border text-[11px] font-sans tracking-wide backdrop-blur-md ${
              isDark
                ? 'border-[#202C40] bg-[#182337]/80 text-[#D9D2C6]'
                : 'border-[#E5DED2] bg-[#FCFAF5]/90 text-[#554F48]'
            }`}
          >
            Thread of Remembrance
          </div>
        </div>
      </div>

      {/* 5. MemoryThread & Bottom Quote */}
      <div className="relative z-10 space-y-4">
        <MemoryThread className="opacity-60" />
        <div className="space-y-1">
          <p
            className={`text-sm font-serif italic ${
              isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
            }`}
          >
            "{tagline}"
          </p>
          <p
            className={`text-[11px] font-sans ${
              isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
            }`}
          >
            Protected by cryptographic identity, permanent archiving, and family stewardship.
          </p>
        </div>
      </div>
    </div>
  );
};
