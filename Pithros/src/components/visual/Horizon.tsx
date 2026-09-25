import React from 'react';
import { useTheme } from '../../context/ThemeContext';

interface HorizonProps {
  className?: string;
}

export const Horizon: React.FC<HorizonProps> = ({ className = '' }) => {
  const { isDark } = useTheme();
  const gradId = React.useId();
  const accentColor = isDark ? '#B99452' : '#23324A';

  return (
    <svg
      viewBox="0 0 1440 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={`w-full pointer-events-none select-none ${className}`}
    >
      <path
        d="M0 120C360 40 1080 40 1440 120"
        stroke={`url(#${gradId})`}
        strokeWidth="1.2"
      />
      <defs>
        <linearGradient
          id={gradId}
          x1="0"
          y1="80"
          x2="1440"
          y2="80"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor={accentColor} stopOpacity="0" />
          <stop offset="0.5" stopColor={accentColor} stopOpacity={isDark ? '0.25' : '0.35'} />
          <stop offset="1" stopColor={accentColor} stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
};
