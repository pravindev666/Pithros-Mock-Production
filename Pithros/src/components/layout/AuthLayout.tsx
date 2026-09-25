import React from 'react';
import { motion } from 'motion/react';
import { useTheme } from '../../context/ThemeContext';
import { PithrosLogo } from '../visual/PithrosLogo';
import { StarField } from '../visual/StarField';
import { MemoryOrbit } from '../visual/MemoryOrbit';
import { MemorialHalo } from '../visual/MemorialHalo';
import { Shield, Sparkles } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
  onNavigate?: (route: string) => void;
  title?: string;
  subtitle?: string;
  isOperationalAdmin?: boolean;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  onNavigate,
  isOperationalAdmin = false,
}) => {
  const { isDark } = useTheme();

  return (
    <div
      className={`min-h-screen flex flex-col justify-between relative overflow-hidden transition-colors selection:bg-[#B99452]/25 selection:text-[#B99452] ${
        isDark ? 'bg-[#111820] text-[#F8F5EE]' : 'bg-[#F3EEE4] text-[#20242A]'
      }`}
    >
      {/* 1. Atmospheric Ambient Background Gradients */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background: isDark
            ? 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(255, 184, 48, 0.08) 0%, rgba(255, 107, 0, 0.03) 40%, transparent 75%)'
            : 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(217, 148, 30, 0.12) 0%, rgba(178, 122, 30, 0.04) 45%, transparent 75%)',
        }}
      />

      {/* 2. Starfield Layer (Subtle Celestial Drift) */}
      <div className="absolute inset-0 pointer-events-none opacity-60" aria-hidden="true">
        <StarField count={36} />
      </div>

      {/* 3. Subtle Rotating Orbit Ring in Background */}
      <div
        className="absolute -top-32 -right-32 w-96 h-96 pointer-events-none opacity-20"
        aria-hidden="true"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 180, repeat: Infinity, ease: 'linear' }}
          className="w-full h-full"
        >
          <MemoryOrbit width="100%" height="100%" />
        </motion.div>
      </div>

      {/* 4. Minimal Header (Logo + Sanctuary Return only, NO Marketing Navigation) */}
      <header className="relative z-20 w-full px-6 py-6 md:px-12 flex items-center justify-between">
        <div
          onClick={() => onNavigate && onNavigate('/')}
          className="cursor-pointer group flex items-center gap-3"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onNavigate && onNavigate('/')}
          aria-label="Return to Pithros Sanctuary"
        >
          <PithrosLogo variant={isDark ? 'dark' : 'light'} />
          {isOperationalAdmin && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] uppercase font-mono tracking-widest bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <Shield className="w-3 h-3" />
              Console Auth
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => onNavigate && onNavigate('/')}
          className={`text-xs font-sans px-3.5 py-1.5 rounded-full border transition-all ${
            isDark
              ? 'border-[#202C40] text-[#9EA3AA] hover:text-[#F8F5EE] hover:border-[#B99452]/40 bg-[#182337]/60'
              : 'border-[#E5DED2] text-[#7D766D] hover:text-[#20242A] hover:border-[#23324A]/50 bg-[#FCFAF5]/80'
          }`}
          aria-label="Return to Pithros home"
        >
          ← Return to Pithros
        </button>
      </header>

      {/* 5. Main Authentication Surface */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 md:p-10">
        {children}
      </main>

      {/* 6. Minimal Footer (Zero Marketing, Only Dignified Legal & Trust Text) */}
      <footer className="relative z-20 w-full py-6 px-6 md:px-12 text-center text-xs border-t border-inherit/40 transition-colors">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px]">
          <p className={isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}>
            Pithros • A permanent digital place to remember a life.
          </p>
          <div className="flex items-center gap-4 text-[11px]">
            <span className={isDark ? 'text-[#6E5F4E]' : 'text-[#A09585]'}>
              Private Family Control
            </span>
            <span className={isDark ? 'text-[#382F24]' : 'text-[#E5DED2]'}>•</span>
            <span className={isDark ? 'text-[#6E5F4E]' : 'text-[#A09585]'}>
              Family Stewarded
            </span>
            <span className={isDark ? 'text-[#382F24]' : 'text-[#E5DED2]'}>•</span>
            <span className={isDark ? 'text-[#6E5F4E]' : 'text-[#A09585]'}>
              Zero Advertising
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};
