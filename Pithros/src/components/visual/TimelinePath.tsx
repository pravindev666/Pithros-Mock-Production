import React from 'react';
import { motion } from 'motion/react';
import { MOTION_TIMING, MOTION_EASING } from '../../lib/motion';
import { useTheme } from '../../context/ThemeContext';

interface TimelinePathProps {
  totalHeight?: number | string;
  className?: string;
}

export const TimelinePath: React.FC<TimelinePathProps> = ({
  className = '',
}) => {
  const { isDark } = useTheme();

  return (
    <div
      className={`absolute top-0 bottom-0 left-6 md:left-1/2 -translate-x-1/2 w-8 pointer-events-none ${className}`}
      aria-hidden="true"
    >
      <svg
        width="32"
        height="100%"
        className="w-full h-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Base Track */}
        <line
          x1="16"
          y1="0"
          x2="16"
          y2="100%"
          stroke={isDark ? '#202C40' : '#E5DED2'}
          strokeWidth="2"
        />

        {/* Animated Drawing Path */}
        <motion.line
          x1="16"
          y1="0"
          x2="16"
          y2="100%"
          stroke={isDark ? '#B99452' : '#23324A'}
          strokeWidth="1.5"
          strokeOpacity={isDark ? 0.6 : 0.75}
          strokeDasharray="4 6"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{
            duration: MOTION_TIMING.emotionalSlow,
            ease: MOTION_EASING.easeOut,
          }}
        />
      </svg>
    </div>
  );
};
