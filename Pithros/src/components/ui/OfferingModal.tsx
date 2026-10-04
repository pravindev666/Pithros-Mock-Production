import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Check, ArrowRight } from 'lucide-react';
import { OfferingType, RemembranceOffering } from '../../types';
import { Button } from './Button';
import { OfferingLight } from '../visual/VisualComponents';
import {
  DoveSymbol,
  FlowerSymbol,
  FoldedHandsSymbol,
  OfferingLightSymbol,
  StarSymbol,
  HeartSymbol,
  WreathSymbol,
  MemorySymbol,
} from '../visual/PithrosVisualSymbols';
import { useTheme } from '../../context/ThemeContext';
import { useDialogA11y } from '../../lib/useDialogA11y';
import {
  modalBackdropVariants,
  modalDialogVariants,
  MOTION_TIMING,
  MOTION_EASING,
} from '../../lib/motion';

interface OfferingModalProps {
  isOpen: boolean;
  memorialName: string;
  onClose: () => void;
  onSubmit: (offering: Omit<RemembranceOffering, 'id' | 'timestamp'>) => void;
  onNavigate?: (route: string) => void;
}

const GESTURE_ITEMS: {
  type: OfferingType;
  label: string;
  desc: string;
  component: React.FC<{ size?: number; className?: string; isDark?: boolean }>;
  placedText: string;
}[] = [
  {
    type: 'light',
    label: 'Light',
    desc: 'Enduring Warmth',
    component: OfferingLightSymbol,
    placedText: 'A light was left.',
  },
  {
    type: 'flower',
    label: 'Flower',
    desc: 'Gentle Remembrance',
    component: FlowerSymbol,
    placedText: 'A flower was placed.',
  },
  {
    type: 'dove',
    label: 'Dove',
    desc: 'Peace & Serenity',
    component: DoveSymbol,
    placedText: 'A dove of peace was offered.',
  },
  {
    type: 'hands',
    label: 'Folded Hands',
    desc: 'Gratitude & Prayer',
    component: FoldedHandsSymbol,
    placedText: 'A silent prayer of gratitude was offered.',
  },
  {
    type: 'star',
    label: 'Star',
    desc: 'Guiding Light',
    component: StarSymbol,
    placedText: 'A star of quiet remembrance was placed.',
  },
  {
    type: 'heart',
    label: 'With Love',
    desc: 'Enduring Affection',
    component: HeartSymbol,
    placedText: 'A thought of love was left.',
  },
  {
    type: 'honor',
    label: 'In Honor',
    desc: 'Life of Dignity',
    component: WreathSymbol,
    placedText: 'A gesture in honor was dedicated.',
  },
  {
    type: 'memory',
    label: 'Memory',
    desc: 'Cherished Moment',
    component: MemorySymbol,
    placedText: 'Someone shared a memory.',
  },
];

export const OfferingModal: React.FC<OfferingModalProps> = ({
  isOpen,
  memorialName,
  onClose,
  onSubmit,
  onNavigate,
}) => {
  const { isDark } = useTheme();
  const [selectedType, setSelectedType] = useState<OfferingType>('light');
  const [senderName, setSenderName] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [completedText, setCompletedText] = useState('A gesture of remembrance was placed.');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!senderName.trim()) return;

    const matchedGesture = GESTURE_ITEMS.find((g) => g.type === selectedType);
    setCompletedText(matchedGesture ? matchedGesture.placedText : 'A gesture was placed.');
    setSubmitted(true);

    onSubmit({
      type: selectedType,
      senderName: senderName.trim(),
      message: message.trim() || undefined,
    });
  };

  const handleFinishAndClose = () => {
    setSubmitted(false);
    setSenderName('');
    setMessage('');
    onClose();
  };

  const dialogRef = useDialogA11y(isOpen, handleFinishAndClose);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          className={`fixed inset-0 backdrop-blur-sm ${
            isDark ? 'bg-[#111820]/85' : 'bg-[#20242A]/40'
          }`}
          variants={modalBackdropVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          onClick={handleFinishAndClose}
        />

        {/* Dialog Window */}
        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="offering-modal-title"
          tabIndex={-1}
          className={`relative z-10 w-full max-w-lg max-h-[92vh] max-h-[92dvh] overflow-y-auto rounded-3xl border p-6 sm:p-7 shadow-2xl transition-colors focus:outline-none my-6 ${
            isDark
              ? 'border-[#202C40] bg-[#182337]'
              : 'border-[#E5DED2] bg-[#FCFAF5]'
          }`}
          variants={modalDialogVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          {/* Header */}
          <div
            className={`flex items-start justify-between pb-4 border-b ${
              isDark ? 'border-[#202C40]' : 'border-[#E5DED2]'
            }`}
          >
            <div>
              <span
                className={`text-[11px] uppercase tracking-widest font-medium ${
                  isDark ? 'text-[#B99452]' : 'text-[#23324A]'
                }`}
              >
                Remembrance Gesture
              </span>
              <h3
                id="offering-modal-title"
                className={`text-xl font-serif mt-0.5 ${
                  isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                }`}
              >
                {submitted ? 'Remembrance Placed' : 'Leave a Gesture of Remembrance'}
              </h3>
              <p
                className={`text-xs mt-1 ${
                  isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'
                }`}
              >
                In quiet honor of {memorialName}.
              </p>
            </div>
            <button
              onClick={handleFinishAndClose}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isDark
                  ? 'text-[#9EA3AA] hover:text-[#F8F5EE] hover:bg-[#182337]'
                  : 'text-[#7D766D] hover:text-[#20242A] hover:bg-[#E5DED2]'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {submitted ? (
            /* Calm gesture confirmation with optional continuation */
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-5">
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: MOTION_TIMING.emotional, ease: MOTION_EASING.easeOut }}
                className="w-20 h-20 rounded-full flex items-center justify-center shadow-inner"
                style={{
                  backgroundColor: isDark ? 'rgba(255, 184, 48, 0.12)' : 'rgba(178, 122, 30, 0.1)',
                }}
              >
                {(() => {
                  const ChosenComponent = GESTURE_ITEMS.find((i) => i.type === selectedType)?.component || FlowerSymbol;
                  return <ChosenComponent size={48} />;
                })()}
              </motion.div>

              <div className="space-y-1.5 max-w-sm mx-auto">
                <p
                  className={`text-lg font-serif ${
                    isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                  }`}
                >
                  {completedText}
                </p>
                <p className={`text-xs ${isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'}`}>
                  Your remembrance has been recorded quietly. No counts, rankings, or public metrics are displayed.
                </p>
              </div>

              {/* Optional guest continuation (No forced signup) */}
              <div
                className={`w-full p-4 rounded-2xl border text-xs text-left space-y-2.5 ${
                  isDark ? 'bg-[#182337]/70 border-[#202C40]' : 'bg-[#FCFAF5] border-[#E8DEC8]'
                }`}
              >
                <span className={`font-medium block ${isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'}`}>
                  Keep connected with this memorial
                </span>
                <p className={`text-[11px] leading-relaxed ${isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'}`}>
                  You can create a free family account anytime to save this memorial, receive quiet anniversary reflections, or create a remembrance for someone in your family.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      handleFinishAndClose();
                      onNavigate?.('/signup');
                    }}
                  >
                    Create Free Account
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleFinishAndClose}
                  >
                    Done
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {/* Gesture Grid (8 Pithros remembrance symbols) */}
              <div>
                <label
                  className={`block text-xs font-medium mb-2 ${
                    isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                  }`}
                >
                  Choose a quiet gesture
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {GESTURE_ITEMS.map((item) => {
                    const SymbolComponent = item.component;
                    const isSelected = selectedType === item.type;
                    return (
                      <button
                        type="button"
                        key={item.type}
                        onClick={() => setSelectedType(item.type)}
                        className={`group flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all cursor-pointer relative overflow-hidden ${
                          isSelected
                            ? isDark
                              ? 'border-[#B99452] bg-[#B99452]/15 text-[#B99452] shadow-[0_0_16px_rgba(255,184,48,0.2)] ring-1 ring-[#B99452]/40'
                              : 'border-[#23324A] bg-[#EDE6DA] text-[#8C5C0F] shadow-[0_2px_12px_rgba(178,122,30,0.15)] ring-1 ring-[#23324A]/30'
                            : isDark
                            ? 'border-[#202C40] bg-[#182337]/70 text-[#9EA3AA] hover:border-[#B99452]/40 hover:text-[#D9D2C6] hover:bg-[#1A253A]'
                            : 'border-[#E5DED2] bg-[#FCFAF5] text-[#554F48] hover:border-[#23324A]/40 hover:text-[#20242A] hover:bg-[#F7F2E8]'
                        }`}
                      >
                        <div className="w-11 h-11 flex items-center justify-center mb-1 transition-transform group-hover:scale-110">
                          <SymbolComponent size={34} />
                        </div>
                        <span className="text-xs font-serif font-medium leading-tight">{item.label}</span>
                        <span className="text-[10px] text-[#9EA3AA] leading-tight mt-0.5">{item.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sender Name */}
              <div>
                <label
                  className={`block text-xs font-medium mb-1.5 ${
                    isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                  }`}
                >
                  Your name or family relationship{' '}
                  <span className={isDark ? 'text-[#B99452]' : 'text-[#23324A]'}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="e.g. Anand Sharma, Former Student"
                  className={`w-full px-3.5 py-2 rounded-xl border text-xs focus:outline-none transition-colors ${
                    isDark
                      ? 'bg-[#182337] border-[#202C40] text-[#F8F5EE] placeholder-[#737982] focus:border-[#B99452]'
                      : 'bg-[#E5DED2] border-[#E5DED2] text-[#20242A] placeholder-[#9EA3AA] focus:border-[#23324A]'
                  }`}
                />
              </div>

              {/* Optional Note */}
              <div>
                <label
                  className={`block text-xs font-medium mb-1.5 ${
                    isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                  }`}
                >
                  A quiet thought or reflection (optional)
                </label>
                <textarea
                  rows={2}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="e.g. Always remembered for your generous guidance."
                  className={`w-full px-3.5 py-2 rounded-xl border text-xs focus:outline-none transition-colors resize-none ${
                    isDark
                      ? 'bg-[#182337] border-[#202C40] text-[#F8F5EE] placeholder-[#737982] focus:border-[#B99452]'
                      : 'bg-[#E5DED2] border-[#E5DED2] text-[#20242A] placeholder-[#9EA3AA] focus:border-[#23324A]'
                  }`}
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" size="sm" onClick={handleFinishAndClose}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="md">
                  Place Gesture
                </Button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};


