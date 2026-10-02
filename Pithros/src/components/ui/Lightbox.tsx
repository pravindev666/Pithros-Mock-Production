import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, ChevronRight, Flag } from 'lucide-react';
import { MediaItem } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { MOTION_TIMING, MOTION_EASING, modalBackdropVariants } from '../../lib/motion';

interface LightboxProps {
  isOpen: boolean;
  images: MediaItem[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
  onReport?: (image: MediaItem) => void;
}

export const Lightbox: React.FC<LightboxProps> = ({
  isOpen,
  images,
  currentIndex,
  onClose,
  onNavigate,
  onReport,
}) => {
  const { isDark } = useTheme();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') {
        onNavigate((currentIndex - 1 + images.length) % images.length);
      }
      if (e.key === 'ArrowRight') {
        onNavigate((currentIndex + 1) % images.length);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, images.length, onClose, onNavigate]);

  const currentItem = images[currentIndex];
  if (!isOpen || !currentItem) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
        {/* Backdrop */}
        <motion.div
          className={`fixed inset-0 backdrop-blur-md ${
            isDark ? 'bg-[#111820]/92' : 'bg-[#182337]/80'
          }`}
          variants={modalBackdropVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          onClick={onClose}
        />

        {/* Modal Window */}
        <motion.div
          className="relative z-10 max-w-4xl w-full flex flex-col items-center"
          initial={{ opacity: 0, scale: 0.97, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 12 }}
          transition={{ duration: MOTION_TIMING.standard, ease: MOTION_EASING.easeOut }}
        >
          {/* Top Bar with counter & close */}
          <div className="w-full flex items-center justify-between mb-3 px-2">
            <span
              className={`text-xs uppercase tracking-widest font-medium ${
                isDark ? 'text-[#9EA3AA]' : 'text-[#E5DED2]'
              }`}
            >
              {currentIndex + 1} of {images.length}
            </span>
            <div className="flex items-center gap-2">
              {onReport && (
                <button
                  type="button"
                  onClick={() => onReport(currentItem)}
                  className={`px-3 py-1 rounded-full text-xs flex items-center gap-1.5 transition-colors cursor-pointer border ${
                    isDark
                      ? 'bg-[#182337] border-[#202C40] text-[#9EA3AA] hover:text-[#F87171] hover:border-[#EF4444]/40'
                      : 'bg-[#20242A]/80 border-[#2D3D56] text-[#E5DED2] hover:text-[#FCA5A5] hover:border-[#F87171]/40'
                  }`}
                  title="Report inappropriate photograph (nudity, explicit, or policy violation)"
                  aria-label="Report photograph"
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-medium">Report Photo</span>
                </button>
              )}
              <button
                onClick={onClose}
                className={`p-2 rounded-full transition-colors cursor-pointer ${
                  isDark
                    ? 'bg-[#182337] text-[#F8F5EE] hover:bg-[#202C40]'
                    : 'bg-[#20242A]/80 text-[#F8F5EE] hover:bg-[#20242A]'
                }`}
                aria-label="Close image viewer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Image Container with Nav buttons */}
          <div
            className={`relative w-full max-h-[75vh] flex items-center justify-center overflow-hidden rounded-2xl border ${
              isDark
                ? 'border-[#202C40] bg-[#182337]'
                : 'border-[#2D3D56] bg-[#182337]'
            }`}
          >
            <img
              src={currentItem.url}
              alt={currentItem.title}
              className="max-h-[72vh] max-w-full object-contain select-none"
            />

            {/* Previous */}
            {images.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate((currentIndex - 1 + images.length) % images.length);
                }}
                className={`absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full backdrop-blur-sm transition-colors border cursor-pointer ${
                  isDark
                    ? 'bg-[#111820]/80 text-[#F8F5EE] hover:bg-[#B99452] hover:text-[#111820] border-[#202C40]'
                    : 'bg-[#111820]/75 text-[#F8F5EE] hover:bg-[#23324A] hover:text-white border-[#2D3D56]'
                }`}
                aria-label="Previous photograph"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            {/* Next */}
            {images.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate((currentIndex + 1) % images.length);
                }}
                className={`absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full backdrop-blur-sm transition-colors border cursor-pointer ${
                  isDark
                    ? 'bg-[#111820]/80 text-[#F8F5EE] hover:bg-[#B99452] hover:text-[#111820] border-[#202C40]'
                    : 'bg-[#111820]/75 text-[#F8F5EE] hover:bg-[#23324A] hover:text-white border-[#2D3D56]'
                }`}
                aria-label="Next photograph"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Caption */}
          <div className="w-full mt-3 px-2 text-center">
            <h5 className="text-sm font-medium text-[#F8F5EE]">{currentItem.title}</h5>
            {currentItem.caption && (
              <p
                className={`text-xs mt-1 max-w-xl mx-auto ${
                  isDark ? 'text-[#9EA3AA]' : 'text-[#E5DED2]'
                }`}
              >
                {currentItem.caption}
              </p>
            )}
            {currentItem.year && (
              <span
                className={`inline-block mt-1 text-[11px] font-mono ${
                  isDark ? 'text-[#B99452]' : 'text-[#D9D2C6]'
                }`}
              >
                {currentItem.year}
              </span>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

