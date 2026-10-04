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
      className={`relative w-full h-full min-h-[190px] sm:min-h-[220px] md:min-h-[250px] lg:min-h-[520px] xl:min-h-[580px] rounded-3xl overflow-hidden flex flex-col justify-between p-5 sm:p-7 md:p-8 lg:p-10 xl:p-12 select-none border transition-all duration-300 shadow-2xl ${
        isDark
          ? 'bg-[#0A0D14] border-[#B99452]/35 shadow-[0_16px_50px_rgba(0,0,0,0.6)]'
          : 'bg-[#0B101B] border-[#B99452]/30 shadow-[0_16px_45px_rgba(20,28,40,0.22)]'
      } ${className}`}
      aria-hidden="true"
    >
      {/* 1. Full-bleed Stretched Celestial Galaxy Constellation Artwork (Edge-to-Edge) */}
      <img
        src="/images/constellation_sanctuary.jpg"
        alt="Celestial Constellation Sanctuary"
        className="absolute inset-0 w-full h-full object-cover object-center filter contrast-[1.08] brightness-[0.92] scale-[1.02]"
      />

      {/* 2. Atmospheric Gradient Vignettes for Text Legibility & Celestial Depth */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-[#080B10]/85 via-[#080B10]/25 to-transparent h-32 sm:h-36" />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[#080B10]/95 via-[#080B10]/60 to-transparent top-auto h-36 sm:h-48 lg:h-60" />
      <div className="absolute inset-0 pointer-events-none bg-[#080B10]/15" />

      {/* 3. StarField Subtle Twinkle Drift */}
      <StarField count={22} className="opacity-40" />

      {/* 4. Ambient Orbit & Halo Effects */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 200, repeat: Infinity, ease: 'linear' }}
          className="w-full h-full flex items-center justify-center"
        >
          <MemoryOrbit width="90%" height="90%" className="scale-110 opacity-30" />
        </motion.div>
        <motion.div
          animate={{ scale: [0.96, 1.05, 0.96], opacity: [0.25, 0.45, 0.25] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute flex items-center justify-center"
        >
          <MemorialHalo size={320} />
        </motion.div>
      </div>

      {/* 5. Top Branding Anchor */}
      <div className="relative z-10 flex items-center justify-between">
        <PithrosLogo variant="dark" />
        <div className="lg:hidden px-3 py-1 rounded-full border border-[#B99452]/40 bg-[#0B0F17]/80 backdrop-blur-md text-[#F8F5EE] text-[11px] font-sans tracking-wider flex items-center gap-1.5 shadow">
          <span className="w-1.5 h-1.5 rounded-full bg-[#E5B869] animate-pulse" />
          Sanctuary
        </div>
      </div>

      {/* 6. Center Celestial Space (Unobstructed View of the Constellation Sanctuary) */}
      <div className="relative z-10 flex-1 min-h-[30px]" />

      {/* 7. MemoryThread & Bottom Quote (Responsive: full on sm+, compact on mobile) */}
      <div className="relative z-10 space-y-2 sm:space-y-3">
        <MemoryThread className="opacity-60 text-[#B99452]" />
        <div className="space-y-1">
          <p className="text-sm sm:text-base lg:text-lg font-serif italic text-[#F8F5EE] drop-shadow-md">
            "{tagline}"
          </p>
          <p className="hidden sm:block text-xs font-sans text-[#D4CBBF] drop-shadow-sm leading-relaxed">
            Protected by cryptographic identity, permanent archiving, and family stewardship.
          </p>
        </div>
      </div>
    </div>
  );
};
