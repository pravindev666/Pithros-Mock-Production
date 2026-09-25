import React from 'react';
import { useTheme } from '../../context/ThemeContext';

interface SymbolProps {
  className?: string;
  size?: number | string;
  title?: string;
  ariaHidden?: boolean;
}

/**
 * Coherent Pithros SVG Asset System
 * 
 * Every symbol supports:
 * - Sanctuary (Dark) & Archive (Light) theme harmony
 * - Responsive vector scaling
 * - Accessibility (role="img" + title or aria-hidden)
 * - Strict antique gold / warm bronze accents
 */

export const DoveSymbol: React.FC<SymbolProps> = ({
  className = '',
  size = 24,
  title = 'Peaceful dove',
  ariaHidden = false,
}) => {
  const { isDark } = useTheme();
  const strokeColor = isDark ? '#D9D2C6' : '#23324A';
  const fillColor = isDark ? 'rgba(217, 210, 198, 0.12)' : 'rgba(35, 50, 74, 0.1)';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`transition-colors ${className}`}
      role={ariaHidden ? undefined : 'img'}
      aria-hidden={ariaHidden}
      aria-label={ariaHidden ? undefined : title}
    >
      {!ariaHidden && title && <title>{title}</title>}
      <path
        d="M12 28C8 26 6 22 7 18C8 14 12 13 16 15C19 12 23 10 28 10C35 10 39 15 41 20C42 22.5 41.5 25 39 26C35 27.5 32 26 29 24C28 27 25 31 20 33C17 34.2 13 32 12 28Z"
        stroke={strokeColor}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={fillColor}
      />
      <path
        d="M20 23C22 19 26 17 31 18"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="34" cy="16" r="1.5" fill={strokeColor} />
      <path
        d="M14 29C11 33 8 36 5 37"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
};

export const FlowerSymbol: React.FC<SymbolProps> = ({
  className = '',
  size = 24,
  title = 'Memorial flower offering',
  ariaHidden = false,
}) => {
  const { isDark } = useTheme();
  const strokeColor = '#A66B76';
  const fillColor = isDark ? 'rgba(166, 107, 118, 0.2)' : 'rgba(166, 107, 118, 0.14)';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`transition-colors ${className}`}
      role={ariaHidden ? undefined : 'img'}
      aria-hidden={ariaHidden}
      aria-label={ariaHidden ? undefined : title}
    >
      {!ariaHidden && title && <title>{title}</title>}
      {/* 5 Petals */}
      <circle cx="24" cy="14" r="7" stroke={strokeColor} strokeWidth="1.5" fill={fillColor} />
      <circle cx="33.5" cy="20.9" r="7" stroke={strokeColor} strokeWidth="1.5" fill={fillColor} />
      <circle cx="29.9" cy="32.1" r="7" stroke={strokeColor} strokeWidth="1.5" fill={fillColor} />
      <circle cx="18.1" cy="32.1" r="7" stroke={strokeColor} strokeWidth="1.5" fill={fillColor} />
      <circle cx="14.5" cy="20.9" r="7" stroke={strokeColor} strokeWidth="1.5" fill={fillColor} />
      {/* Center core */}
      <circle cx="24" cy="24" r="4.5" fill={strokeColor} />
      <circle
        cx="24"
        cy="24"
        r="7.5"
        stroke={strokeColor}
        strokeWidth="1"
        strokeDasharray="2 2"
      />
    </svg>
  );
};

export const FoldedHandsSymbol: React.FC<SymbolProps> = ({
  className = '',
  size = 24,
  title = 'Folded hands in prayer & remembrance',
  ariaHidden = false,
}) => {
  const { isDark } = useTheme();
  const strokeColor = isDark ? '#D9D2C6' : '#23324A';
  const fillColor = isDark ? 'rgba(217, 210, 198, 0.1)' : 'rgba(35, 50, 74, 0.08)';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`transition-colors ${className}`}
      role={ariaHidden ? undefined : 'img'}
      aria-hidden={ariaHidden}
      aria-label={ariaHidden ? undefined : title}
    >
      {!ariaHidden && title && <title>{title}</title>}
      <path
        d="M20 38L18 24C17.5 20 18.5 16 21 12C21.8 10.7 22.8 10 24 10C25.2 10 26.2 10.7 27 12C29.5 16 30.5 20 30 24L28 38"
        stroke={strokeColor}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={fillColor}
      />
      <path
        d="M24 10V38"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M15 36C12 34 11 30 12 26L14 20"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M33 36C36 34 37 30 36 26L34 20"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M17 40H31"
        stroke={strokeColor}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
};

export const OfferingLightSymbol: React.FC<SymbolProps> = ({
  className = '',
  size = 24,
  title = 'Sanctuary eternal flame',
  ariaHidden = false,
}) => {
  const { isDark } = useTheme();
  const strokeColor = '#B99452';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`transition-colors ${className}`}
      role={ariaHidden ? undefined : 'img'}
      aria-hidden={ariaHidden}
      aria-label={ariaHidden ? undefined : title}
    >
      {!ariaHidden && title && <title>{title}</title>}
      {/* Bowl */}
      <path
        d="M10 26C10 33.7 16.3 40 24 40C31.7 40 38 33.7 38 26H10Z"
        stroke={strokeColor}
        strokeWidth="1.8"
        fill={isDark ? 'rgba(185, 148, 82, 0.15)' : 'rgba(185, 148, 82, 0.1)'}
      />
      <path
        d="M6 26H42"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Flame */}
      <path
        d="M24 7C24 7 19 14 19 19C19 21.8 21.2 24 24 24C26.8 24 29 21.8 29 19C29 14 24 7 24 7Z"
        fill={isDark ? '#D1B477' : '#B99452'}
      />
      <circle cx="24" cy="18" r="2" fill={isDark ? '#F8F5EE' : '#FCFAF5'} />
      {/* Radiance rays */}
      <path
        d="M24 2V4M14 6L15.5 7.5M34 6L32.5 7.5"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
};

export const StarSymbol: React.FC<SymbolProps> = ({
  className = '',
  size = 24,
  title = 'Remembrance star',
  ariaHidden = false,
}) => {
  const { isDark } = useTheme();
  const strokeColor = '#B99452';
  const fillColor = isDark ? 'rgba(185, 148, 82, 0.18)' : 'rgba(185, 148, 82, 0.12)';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`transition-colors ${className}`}
      role={ariaHidden ? undefined : 'img'}
      aria-hidden={ariaHidden}
      aria-label={ariaHidden ? undefined : title}
    >
      {!ariaHidden && title && <title>{title}</title>}
      <path
        d="M24 4L28.5 16.5L41.5 18L32 27L34.5 40L24 33.5L13.5 40L16 27L6.5 18L19.5 16.5L24 4Z"
        stroke={strokeColor}
        strokeWidth="1.8"
        strokeLinejoin="round"
        fill={fillColor}
      />
      <circle cx="24" cy="24" r="3" fill={strokeColor} />
    </svg>
  );
};

export const HeartSymbol: React.FC<SymbolProps> = ({
  className = '',
  size = 24,
  title = 'Enduring love and remembrance',
  ariaHidden = false,
}) => {
  const { isDark } = useTheme();
  const strokeColor = '#A66B76';
  const fillColor = isDark ? 'rgba(166, 107, 118, 0.2)' : 'rgba(166, 107, 118, 0.12)';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`transition-colors ${className}`}
      role={ariaHidden ? undefined : 'img'}
      aria-hidden={ariaHidden}
      aria-label={ariaHidden ? undefined : title}
    >
      {!ariaHidden && title && <title>{title}</title>}
      <path
        d="M24 40C24 40 7 28 7 16C7 10.5 11.5 6 17 6C20.5 6 23 8 24 10C25 8 27.5 6 31 6C36.5 6 41 10.5 41 16C41 28 24 40 24 40Z"
        stroke={strokeColor}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={fillColor}
      />
      <path
        d="M17 12C14.5 12 12.5 14 12.5 16.5"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
};

export const WreathSymbol: React.FC<SymbolProps> = ({
  className = '',
  size = 24,
  title = 'Memorial laurel wreath',
  ariaHidden = false,
}) => {
  const { isDark } = useTheme();
  const strokeColor = '#6C746D';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`transition-colors ${className}`}
      role={ariaHidden ? undefined : 'img'}
      aria-hidden={ariaHidden}
      aria-label={ariaHidden ? undefined : title}
    >
      {!ariaHidden && title && <title>{title}</title>}
      {/* Left branch */}
      <path
        d="M24 42C15 40 9 32 9 22C9 14 14 8 20 5"
        stroke={strokeColor}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {/* Right branch */}
      <path
        d="M24 42C33 40 39 32 39 22C39 14 34 8 28 5"
        stroke={strokeColor}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {/* Leaves */}
      <circle cx="12" cy="32" r="2.5" stroke={strokeColor} strokeWidth="1.2" />
      <circle cx="8" cy="22" r="2.5" stroke={strokeColor} strokeWidth="1.2" />
      <circle cx="12" cy="13" r="2.5" stroke={strokeColor} strokeWidth="1.2" />
      <circle cx="36" cy="32" r="2.5" stroke={strokeColor} strokeWidth="1.2" />
      <circle cx="40" cy="22" r="2.5" stroke={strokeColor} strokeWidth="1.2" />
      <circle cx="36" cy="13" r="2.5" stroke={strokeColor} strokeWidth="1.2" />
      {/* Ribbon at bottom */}
      <path
        d="M21 41L18 45M27 41L30 45"
        stroke={strokeColor}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
};

export const MemorySymbol: React.FC<SymbolProps> = ({
  className = '',
  size = 24,
  title = 'Preserved life story & memory ledger',
  ariaHidden = false,
}) => {
  const { isDark } = useTheme();
  const strokeColor = isDark ? '#D9D2C6' : '#23324A';
  const fillColor = isDark ? 'rgba(217, 210, 198, 0.1)' : 'rgba(35, 50, 74, 0.08)';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`transition-colors ${className}`}
      role={ariaHidden ? undefined : 'img'}
      aria-hidden={ariaHidden}
      aria-label={ariaHidden ? undefined : title}
    >
      {!ariaHidden && title && <title>{title}</title>}
      <rect
        x="10"
        y="8"
        width="28"
        height="32"
        rx="3"
        stroke={strokeColor}
        strokeWidth="1.8"
        fill={fillColor}
      />
      <line x1="16" y1="16" x2="32" y2="16" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="16" y1="22" x2="32" y2="22" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="16" y1="28" x2="26" y2="28" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="28.5" cy="31.5" r="1.5" fill={strokeColor} />
    </svg>
  );
};
