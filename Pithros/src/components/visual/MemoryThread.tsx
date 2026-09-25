import React from 'react';
import { useTheme } from '../../context/ThemeContext';
export { Horizon } from './Horizon';

interface MemoryThreadProps {
  className?: string;
}

export const MemoryThread: React.FC<MemoryThreadProps> = ({ className = '' }) => {
  const { isDark } = useTheme();
  const gradId = React.useId();
  const accent = isDark ? '#B99452' : '#23324A';
  const secondary = isDark ? '#D1B477' : '#B99452';

  return (
    <svg
      viewBox="0 0 1200 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={`w-full pointer-events-none select-none ${className}`}
    >
      <path
        d="M0 80C240 20 380 140 600 80C820 20 960 140 1200 80"
        stroke={`url(#${gradId})`}
        strokeWidth="1"
        strokeDasharray="2 6"
      />
      <circle cx="600" cy="80" r="2.5" fill={accent} fillOpacity={isDark ? 0.6 : 0.75} />
      <circle cx="280" cy="50" r="1.5" fill={secondary} fillOpacity={isDark ? 0.4 : 0.5} />
      <circle cx="920" cy="110" r="1.5" fill={secondary} fillOpacity={isDark ? 0.4 : 0.5} />
      <defs>
        <linearGradient id={gradId} x1="0" y1="80" x2="1200" y2="80" gradientUnits="userSpaceOnUse">
          <stop stopColor={accent} stopOpacity="0" />
          <stop offset="0.3" stopColor={accent} stopOpacity={isDark ? 0.25 : 0.35} />
          <stop offset="0.7" stopColor={secondary} stopOpacity={isDark ? 0.25 : 0.35} />
          <stop offset="1" stopColor={accent} stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
};

