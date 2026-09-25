import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useTheme } from '../../context/ThemeContext';

interface StarFieldProps {
  count?: number;
  className?: string;
}

export const StarField: React.FC<StarFieldProps> = ({
  count = 20,
  className = '',
}) => {
  const { isDark } = useTheme();
  const shouldReduceMotion = useReducedMotion();

  // Keep star count modest (max 24) for optimal rendering performance
  const safeCount = Math.min(count, 24);

  // Generate deterministic stars/dust points
  const stars = React.useMemo(() => {
    return Array.from({ length: safeCount }, (_, i) => ({
      id: i,
      x: (i * 37 + 13) % 100,
      y: (i * 43 + 29) % 100,
      size: i % 3 === 0 ? 1.6 : i % 2 === 0 ? 1.1 : 0.8,
      opacity: isDark ? 0.12 + (i % 5) * 0.05 : 0.08 + (i % 5) * 0.03,
      duration: 4.0 + (i % 4) * 1.5,
    }));
  }, [safeCount, isDark]);

  return (
    <div
      className={`absolute inset-0 overflow-hidden pointer-events-none select-none ${className}`}
      aria-hidden="true"
    >
      {stars.map((s) => {
        const starColor = isDark ? '#F8F5EE' : '#B99452';

        // When reduced motion is preferred, render calm static points without infinite animation loops
        if (shouldReduceMotion) {
          return (
            <div
              key={s.id}
              className="absolute rounded-full"
              style={{
                left: `${s.x}%`,
                top: `${s.y}%`,
                width: `${s.size}px`,
                height: `${s.size}px`,
                backgroundColor: starColor,
                opacity: s.opacity * 0.8,
              }}
            />
          );
        }

        return (
          <motion.div
            key={s.id}
            className="absolute rounded-full"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: `${s.size}px`,
              height: `${s.size}px`,
              backgroundColor: starColor,
            }}
            animate={{
              opacity: [s.opacity * 0.4, s.opacity * 1.1, s.opacity * 0.4],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: s.duration,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        );
      })}
    </div>
  );
};
