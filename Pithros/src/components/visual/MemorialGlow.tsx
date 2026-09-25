import React from 'react';
import { motion } from 'motion/react';
import { useTheme } from '../../context/ThemeContext';

export interface MemorialGlowProps {
  className?: string;
  size?: string;
  intensity?: 'subtle' | 'soft' | 'normal';
}

export const MemorialGlow: React.FC<MemorialGlowProps> = ({
  className = '',
  size = 'w-[750px] h-[480px] max-w-[92vw]',
  intensity = 'soft',
}) => {
  const { isDark } = useTheme();

  // Fine-tuned opacity multipliers to prevent concentrated patches
  const multiplier = intensity === 'subtle' ? 0.6 : intensity === 'normal' ? 1.2 : 1.0;

  // Isotropic elliptical falloffs with multiple smooth easing stops.
  // Both gradients gracefully reach 0% opacity (complete transparency) by 68% of the radius,
  // ensuring that the element boundaries contain zero color and cannot produce rectangular box clipping.
  //
  // Light mode: Luminous warm sand & soft brass bloom that harmonizes with background canvas (#F3EEE4)
  const lightGradient = `radial-gradient(ellipse 55% 45% at 50% 50%, 
    rgba(252, 250, 245, ${0.45 * multiplier}) 0%, 
    rgba(229, 222, 210, ${0.25 * multiplier}) 28%, 
    rgba(185, 148, 82, ${0.035 * multiplier}) 48%, 
    rgba(243, 238, 228, 0.005) 65%,
    rgba(243, 238, 228, 0) 75%,
    transparent 100%
  )`;

  // Dark mode: Subtle deep indigo and restrained antique brass atmosphere (#111820 / #182337 / #B99452)
  const darkGradient = `radial-gradient(ellipse 55% 45% at 50% 50%, 
    rgba(35, 50, 74, ${0.07 * multiplier}) 0%, 
    rgba(24, 35, 55, ${0.05 * multiplier}) 30%, 
    rgba(185, 148, 82, ${0.02 * multiplier}) 50%, 
    rgba(17, 24, 32, 0) 68%,
    transparent 100%
  )`;

  return (
    <motion.div
      aria-hidden="true"
      className={`absolute rounded-full blur-3xl pointer-events-none transition-all duration-700 select-none ${size} ${className}`}
      style={{
        background: isDark ? darkGradient : lightGradient,
        willChange: 'transform, opacity',
      }}
      animate={{
        scale: [0.98, 1.02, 0.98],
        opacity: [0.8, 0.95, 0.8],
      }}
      transition={{
        duration: 10,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
};
