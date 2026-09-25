import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { modalBackdropVariants, modalDialogVariants } from '../../lib/motion';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-md',
}) => {
  const { isDark } = useTheme();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            variants={modalBackdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
          />

          <motion.div
            variants={modalDialogVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={`relative w-full ${maxWidth} rounded-2xl border p-6 shadow-2xl transition-colors ${
              isDark
                ? 'border-[#202C40] bg-[#182337] text-[#F8F5EE]'
                : 'border-[#E5DED2] bg-[#FCFAF5] text-[#20242A]'
            }`}
          >
            {title && (
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-inherit">
                <h3 className="text-base font-serif font-semibold">{title}</h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1 rounded-lg hover:opacity-75 transition-opacity cursor-pointer"
                >
                  <X className="w-4 h-4 opacity-70" />
                </button>
              </div>
            )}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
