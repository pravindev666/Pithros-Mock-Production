import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { MOTION_TIMING, MOTION_EASING } from '../../lib/motion';

interface ThemeToggleProps {
  variant?: 'navbar' | 'compact' | 'drawer';
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ variant = 'navbar', className = '' }) => {
  const { theme, toggleTheme, isDark } = useTheme();

  const label = isDark ? 'Switch to archive theme (Light)' : 'Switch to remembrance theme (Dark)';

  if (variant === 'drawer') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={label}
        title={label}
        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-colors cursor-pointer text-xs font-medium ${
          isDark
            ? 'bg-[#182337] border-[#202C40] text-[#D9D2C6] hover:text-[#F8F5EE] hover:border-[#2D3D56]'
            : 'bg-[#E5DED2] border-[#E5DED2] text-[#554F48] hover:text-[#20242A] hover:border-[#C5B9A6]'
        } ${className}`}
      >
        <div className="flex items-center gap-2.5">
          {isDark ? (
            <Moon className="w-4 h-4 text-[#B99452]" />
          ) : (
            <Sun className="w-4 h-4 text-[#23324A]" />
          )}
          <span>{isDark ? 'Remembrance (Dark)' : 'Archive (Light)'}</span>
        </div>
        <span className="text-[11px] opacity-70">Toggle</span>
      </button>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      whileHover={{ scale: 1.05, transition: { duration: MOTION_TIMING.microFast, ease: MOTION_EASING.easeOut } }}
      whileTap={{ scale: 0.95, transition: { duration: MOTION_TIMING.microFast, ease: MOTION_EASING.easeOut } }}
      className={`relative inline-flex items-center justify-center w-9 h-9 rounded-full border transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B99452] ${
        isDark
          ? 'bg-[#182337]/90 border-[#202C40] text-[#D9D2C6] hover:text-[#F8F5EE] hover:border-[#2D3D56] hover:bg-[#202C40]'
          : 'bg-[#FCFAF5] border-[#E5DED2] text-[#554F48] hover:text-[#20242A] hover:border-[#23324A] hover:bg-[#E5DED2]'
      } ${className}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.div
            key="moon"
            initial={{ opacity: 0, rotate: -30, scale: 0.8 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 30, scale: 0.8 }}
            transition={{ duration: MOTION_TIMING.micro, ease: MOTION_EASING.easeOut }}
          >
            <Moon className="w-4 h-4 text-[#B99452]" />
          </motion.div>
        ) : (
          <motion.div
            key="sun"
            initial={{ opacity: 0, rotate: 30, scale: 0.8 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: -30, scale: 0.8 }}
            transition={{ duration: MOTION_TIMING.micro, ease: MOTION_EASING.easeOut }}
          >
            <Sun className="w-4 h-4 text-[#23324A]" />
          </motion.div>
        )}
      </AnimatePresence>
      <span className="sr-only">{label}</span>
    </motion.button>
  );
};
