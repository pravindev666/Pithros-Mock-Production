import React from 'react';

export interface SymbolProps {
  className?: string;
  size?: number | string;
  title?: string;
  ariaHidden?: boolean;
  isDark?: boolean;
}

/**
 * Pithros Visual Gestures System
 * 
 * High-resolution illustrated heirloom gesture assets:
 * - Dove: Peaceful soaring white dove holding an olive sprig
 * - Flower: Blooming velvety red crimson rose on thorny stem
 * - Folded Hands: Reverent prayer & namaste hands with formal suit cuffs
 * - Light: Sacred ceremonial golden brass diya with warm glowing flame
 * - Star: Two celestial golden four-point sparkle stars
 * - With Love: Classic solid crimson red devotion heart
 * - In Honor: Lush memorial floral wreath with white lilies, cream roses & dark ribbon
 * - Memory: Open antique botanical journal folio with pressed flower & memoir lines
 */

export const DoveSymbol: React.FC<SymbolProps> = ({
  className = '',
  size = 24,
  title = 'Peaceful soaring dove with olive sprig',
  ariaHidden = false,
}) => {
  const pixelSize = typeof size === 'number' ? `${size}px` : size;
  return (
    <img
      src="/gestures/dove.png"
      alt={ariaHidden ? '' : title}
      aria-hidden={ariaHidden}
      loading="eager"
      draggable={false}
      className={`object-contain inline-block drop-shadow-sm select-none transition-transform pointer-events-none ${className}`}
      style={{ width: pixelSize, height: pixelSize }}
    />
  );
};

export const FlowerSymbol: React.FC<SymbolProps> = ({
  className = '',
  size = 24,
  title = 'Memorial blooming red rose offering',
  ariaHidden = false,
}) => {
  const pixelSize = typeof size === 'number' ? `${size}px` : size;
  return (
    <img
      src="/gestures/flower.png"
      alt={ariaHidden ? '' : title}
      aria-hidden={ariaHidden}
      loading="eager"
      draggable={false}
      className={`object-contain inline-block drop-shadow-sm select-none transition-transform pointer-events-none ${className}`}
      style={{ width: pixelSize, height: pixelSize }}
    />
  );
};

export const FoldedHandsSymbol: React.FC<SymbolProps> = ({
  className = '',
  size = 24,
  title = 'Folded hands in prayer & remembrance',
  ariaHidden = false,
}) => {
  const pixelSize = typeof size === 'number' ? `${size}px` : size;
  return (
    <img
      src="/gestures/folded_hands.png"
      alt={ariaHidden ? '' : title}
      aria-hidden={ariaHidden}
      loading="eager"
      draggable={false}
      className={`object-contain inline-block drop-shadow-sm select-none transition-transform pointer-events-none ${className}`}
      style={{ width: pixelSize, height: pixelSize }}
    />
  );
};

export const OfferingLightSymbol: React.FC<SymbolProps> = ({
  className = '',
  size = 24,
  title = 'Sanctuary eternal flame & brass diya',
  ariaHidden = false,
}) => {
  const pixelSize = typeof size === 'number' ? `${size}px` : size;
  return (
    <img
      src="/gestures/light.png"
      alt={ariaHidden ? '' : title}
      aria-hidden={ariaHidden}
      loading="eager"
      draggable={false}
      className={`object-contain inline-block drop-shadow-sm select-none transition-transform pointer-events-none ${className}`}
      style={{ width: pixelSize, height: pixelSize }}
    />
  );
};

export const StarSymbol: React.FC<SymbolProps> = ({
  className = '',
  size = 24,
  title = 'Celestial guiding star',
  ariaHidden = false,
}) => {
  const pixelSize = typeof size === 'number' ? `${size}px` : size;
  return (
    <img
      src="/gestures/star.png"
      alt={ariaHidden ? '' : title}
      aria-hidden={ariaHidden}
      loading="eager"
      draggable={false}
      className={`object-contain inline-block drop-shadow-sm select-none transition-transform pointer-events-none ${className}`}
      style={{ width: pixelSize, height: pixelSize }}
    />
  );
};

export const HeartSymbol: React.FC<SymbolProps> = ({
  className = '',
  size = 24,
  title = 'Enduring devotion sacred heart',
  ariaHidden = false,
}) => {
  const pixelSize = typeof size === 'number' ? `${size}px` : size;
  return (
    <img
      src="/gestures/heart.png"
      alt={ariaHidden ? '' : title}
      aria-hidden={ariaHidden}
      loading="eager"
      draggable={false}
      className={`object-contain inline-block drop-shadow-sm select-none transition-transform pointer-events-none ${className}`}
      style={{ width: pixelSize, height: pixelSize }}
    />
  );
};

export const WreathSymbol: React.FC<SymbolProps> = ({
  className = '',
  size = 24,
  title = 'Memorial laurel wreath of dignity & honor',
  ariaHidden = false,
}) => {
  const pixelSize = typeof size === 'number' ? `${size}px` : size;
  return (
    <img
      src="/gestures/wreath.png"
      alt={ariaHidden ? '' : title}
      aria-hidden={ariaHidden}
      loading="eager"
      draggable={false}
      className={`object-contain inline-block drop-shadow-sm select-none transition-transform pointer-events-none ${className}`}
      style={{ width: pixelSize, height: pixelSize }}
    />
  );
};

export const MemorySymbol: React.FC<SymbolProps> = ({
  className = '',
  size = 24,
  title = 'Preserved life chronicle and heirloom ledger',
  ariaHidden = false,
}) => {
  const pixelSize = typeof size === 'number' ? `${size}px` : size;
  return (
    <img
      src="/gestures/memory.png"
      alt={ariaHidden ? '' : title}
      aria-hidden={ariaHidden}
      loading="eager"
      draggable={false}
      className={`object-contain inline-block drop-shadow-sm select-none transition-transform pointer-events-none ${className}`}
      style={{ width: pixelSize, height: pixelSize }}
    />
  );
};
