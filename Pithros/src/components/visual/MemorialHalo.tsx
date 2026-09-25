import React from 'react';
import { useTheme } from '../../context/ThemeContext';

interface MemorialHaloProps {
  className?: string;
  size?: number;
}

export const MemorialHalo: React.FC<MemorialHaloProps> = ({
  className = '',
  size = 460,
}) => {
  const { isDark } = useTheme();

  const primaryStroke = isDark ? '#B99452' : '#23324A';
  const secondaryStroke = isDark ? '#D1B477' : '#B99452';
  const centerStroke = isDark ? '#F8F5EE' : '#20242A';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 500 500"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={`pointer-events-none select-none transition-opacity duration-1000 ${
        isDark ? 'opacity-40' : 'opacity-30'
      } ${className}`}
    >
      <circle cx="250" cy="250" r="230" stroke={primaryStroke} strokeWidth="0.75" strokeOpacity={isDark ? "0.15" : "0.2"} strokeDasharray="3 6" />
      <circle cx="250" cy="250" r="190" stroke={secondaryStroke} strokeWidth="0.8" strokeOpacity={isDark ? "0.2" : "0.22"} />
      <circle cx="250" cy="250" r="150" stroke={primaryStroke} strokeWidth="1" strokeOpacity={isDark ? "0.28" : "0.25"} />
      <circle cx="250" cy="250" r="110" stroke={centerStroke} strokeWidth="0.6" strokeOpacity={isDark ? "0.35" : "0.25"} strokeDasharray="1 8" />
      
      {/* 4 subtle cardinal markers */}
      <circle cx="250" cy="20" r="1.5" fill={primaryStroke} fillOpacity="0.5" />
      <circle cx="250" cy="480" r="1.5" fill={primaryStroke} fillOpacity="0.5" />
      <circle cx="20" cy="250" r="1.5" fill={primaryStroke} fillOpacity="0.5" />
      <circle cx="480" cy="250" r="1.5" fill={primaryStroke} fillOpacity="0.5" />
    </svg>
  );
};
