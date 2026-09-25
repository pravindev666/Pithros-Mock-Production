import React from 'react';
import { useTheme } from '../../context/ThemeContext';

interface MemoryOrbitProps {
  className?: string;
  width?: number | string;
  height?: number | string;
}

export const MemoryOrbit: React.FC<MemoryOrbitProps> = ({
  className = '',
  width = '100%',
  height = '100%',
}) => {
  const { isDark } = useTheme();

  const outerStroke = isDark ? '#9EA3AA' : '#7D766D';
  const innerStroke = isDark ? '#B99452' : '#23324A';

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 800 500"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={`pointer-events-none select-none ${className}`}
    >
      <ellipse
        cx="400"
        cy="250"
        rx="380"
        ry="190"
        stroke={outerStroke}
        strokeWidth="0.8"
        strokeOpacity={isDark ? '0.1' : '0.18'}
        strokeDasharray="4 8"
        transform="rotate(-8 400 250)"
      />
      <ellipse
        cx="400"
        cy="250"
        rx="290"
        ry="120"
        stroke={innerStroke}
        strokeWidth="0.75"
        strokeOpacity={isDark ? '0.14' : '0.22'}
        transform="rotate(6 400 250)"
      />
      <circle cx="210" cy="180" r="1.5" fill={innerStroke} fillOpacity={isDark ? 0.4 : 0.5} />
      <circle cx="610" cy="310" r="2" fill={outerStroke} fillOpacity={isDark ? 0.3 : 0.4} />
    </svg>
  );
};

