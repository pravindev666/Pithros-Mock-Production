import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../../context/ThemeContext';
import { MOTION_TIMING, MOTION_EASING } from '../../lib/motion';
import {
  FlowerSymbol,
  OfferingLightSymbol,
  DoveSymbol,
  StarSymbol,
  MemorySymbol,
} from '../visual/PithrosVisualSymbols';

export interface AmbientOfferingEvent {
  id: string;
  type: 'flower' | 'light' | 'dove' | 'star' | 'memory';
  message: string;
  author: string;
  timeAgo: string;
}

const defaultEvents: AmbientOfferingEvent[] = [
  { id: '1', type: 'flower', message: 'placed a flower in remembrance', author: 'Priya', timeAgo: 'A moment ago' },
  { id: '2', type: 'light', message: 'kindled a light of peace', author: 'Daniel', timeAgo: '3m ago' },
  { id: '3', type: 'dove', message: 'offered a wish of quiet rest', author: 'Meera', timeAgo: '8m ago' },
  { id: '4', type: 'star', message: 'dedicated a guiding star', author: 'Vikram', timeAgo: '14m ago' },
  { id: '5', type: 'memory', message: 'shared a cherished story', author: 'Ananya', timeAgo: '22m ago' },
];

interface AmbientOfferingStreamProps {
  events?: AmbientOfferingEvent[];
  className?: string;
}

export const AmbientOfferingStream: React.FC<AmbientOfferingStreamProps> = ({
  events = defaultEvents,
  className = '',
}) => {
  const { isDark } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (events.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % events.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [events.length]);

  const activeEvent = events[currentIndex] || events[0];

  const renderIcon = (type: string) => {
    switch (type) {
      case 'flower':
        return <FlowerSymbol size={16} ariaHidden />;
      case 'light':
        return <OfferingLightSymbol size={16} ariaHidden />;
      case 'dove':
        return <DoveSymbol size={16} ariaHidden />;
      case 'star':
        return <StarSymbol size={16} ariaHidden />;
      case 'memory':
      default:
        return <MemorySymbol size={16} ariaHidden />;
    }
  };

  return (
    <div className={`relative flex items-center justify-center pointer-events-none select-none ${className}`}>
      <AnimatePresence mode="wait">
        <motion.div
          key={activeEvent.id}
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.98 }}
          transition={{ duration: MOTION_TIMING.emotional, ease: MOTION_EASING.easeOut }}
          className={`inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border text-xs backdrop-blur-md transition-colors ${
            isDark
              ? 'bg-[#182337]/80 border-[#2D3D56] text-[#D9D2C6] shadow-[0_4px_16px_rgba(0,0,0,0.4)]'
              : 'bg-[#FCFAF5]/90 border-[#E5DED2] text-[#20242A] shadow-[0_4px_16px_rgba(0,0,0,0.06)]'
          }`}
        >
          <span className="flex items-center justify-center flex-shrink-0">
            {renderIcon(activeEvent.type)}
          </span>
          <span className="font-serif">
            <strong className="font-medium">{activeEvent.author}</strong>{' '}
            <span className="opacity-90">{activeEvent.message}</span>
          </span>
          <span
            className={`text-[10px] pl-1 font-sans ${
              isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
            }`}
          >
            {activeEvent.timeAgo}
          </span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
