import React from 'react';
import { useTheme } from '../../context/ThemeContext';

interface PithrosLogoProps {
  variant?: 'default' | 'small' | 'monochrome' | 'light' | 'dark';
  className?: string;
  showSubtitle?: boolean;
}

export const PithrosLogo: React.FC<PithrosLogoProps> = ({
  variant = 'default',
  className = '',
  showSubtitle = true,
}) => {
  const { isDark } = useTheme();

  const effectiveMode =
    variant === 'light' ? 'light' : variant === 'dark' ? 'dark' : variant === 'monochrome' ? 'monochrome' : isDark ? 'dark' : 'light';

  const isSmall = variant === 'small';

  const markId = React.useId();

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Abstract remembrance light / star mark */}
      <svg
        width={isSmall ? '22' : '28'}
        height={isSmall ? '22' : '28'}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="flex-shrink-0"
      >
        {effectiveMode === 'monochrome' ? (
          <>
            <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="1" strokeOpacity="0.25" />
            <circle cx="16" cy="16" r="8" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" />
            <path
              d="M16 4C16 11 11 16 4 16C11 16 16 21 16 28C16 21 21 16 28 16C21 16 16 11 16 4Z"
              fill="currentColor"
            />
            <circle cx="16" cy="16" r="2.2" fill="var(--color-canvas, #111820)" />
          </>
        ) : effectiveMode === 'light' ? (
          <>
            <circle cx="16" cy="16" r="14" stroke="#23324A" strokeWidth="1" strokeOpacity="0.35" />
            <circle cx="16" cy="16" r="8" stroke="#23324A" strokeWidth="1" strokeOpacity="0.5" />
            <path
              d="M16 4C16 11 11 16 4 16C11 16 16 21 16 28C16 21 21 16 28 16C21 16 16 11 16 4Z"
              fill={`url(#${markId}-light)`}
            />
            <circle cx="16" cy="16" r="2.2" fill="#FCFAF5" />
            <defs>
              <radialGradient id={`${markId}-light`} cx="0.5" cy="0.5" r="0.5" fx="0.5" fy="0.5">
                <stop offset="0%" stopColor="#F8F5EE" />
                <stop offset="35%" stopColor="#A66B76" />
                <stop offset="85%" stopColor="#23324A" />
                <stop offset="100%" stopColor="#23324A" />
              </radialGradient>
            </defs>
          </>
        ) : (
          <>
            <circle cx="16" cy="16" r="14" stroke="#B99452" strokeWidth="1" strokeOpacity="0.3" />
            <circle cx="16" cy="16" r="8" stroke="#B99452" strokeWidth="1" strokeOpacity="0.45" />
            <path
              d="M16 4C16 11 11 16 4 16C11 16 16 21 16 28C16 21 21 16 28 16C21 16 16 11 16 4Z"
              fill={`url(#${markId}-dark)`}
            />
            <circle cx="16" cy="16" r="2.2" fill="#F8F5EE" />
            <defs>
              <radialGradient id={`${markId}-dark`} cx="0.5" cy="0.5" r="0.5" fx="0.5" fy="0.5">
                <stop offset="0%" stopColor="#F8F5EE" />
                <stop offset="30%" stopColor="#D1B477" />
                <stop offset="85%" stopColor="#B99452" />
                <stop offset="100%" stopColor="#182337" />
              </radialGradient>
            </defs>
          </>
        )}
      </svg>

      {/* Wordmark */}
      <div className="flex flex-col">
        <span
          className={`font-serif tracking-wide transition-colors ${
            effectiveMode === 'light'
              ? 'text-[#20242A]'
              : effectiveMode === 'monochrome'
              ? 'text-current'
              : 'text-[#F8F5EE]'
          } ${isSmall ? 'text-lg leading-tight' : 'text-xl leading-none'}`}
        >
          Pithros
        </span>
        {!isSmall && showSubtitle && (
          <span
            className={`text-[10px] uppercase tracking-[0.25em] font-sans font-medium mt-1 transition-colors ${
              effectiveMode === 'light' ? 'text-[#7D766D]' : 'text-[#9EA3AA]'
            }`}
          >
            Remembrance
          </span>
        )}
      </div>
    </div>
  );
};
