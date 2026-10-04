import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Sparkles, Lock, Palette, Crown, ExternalLink } from 'lucide-react';
import { MEMORIAL_THEMES, MemorialThemeId, MemorialThemeDefinition } from '../../lib/memorialThemes';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../ui/Button';
import { useDialogA11y } from '../../lib/useDialogA11y';

interface ThemeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeThemeId: MemorialThemeId;
  onSelectTheme: (themeId: MemorialThemeId) => void;
  canUsePremiumThemes?: boolean;
  onUpgradeClick?: () => void;
}

export const ThemeSelectorModal: React.FC<ThemeSelectorModalProps> = ({
  isOpen,
  onClose,
  activeThemeId,
  onSelectTheme,
  canUsePremiumThemes = false,
  onUpgradeClick,
}) => {
  const { isDark } = useTheme();
  const dialogRef = useDialogA11y(isOpen, onClose);

  if (!isOpen) return null;

  const themesList = Object.values(MEMORIAL_THEMES);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="theme-selector-title"
          tabIndex={-1}
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className={`relative w-full max-w-2xl max-h-[90vh] max-h-[92dvh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden focus:outline-none ${
            isDark
              ? 'bg-[#141B26] border-[#223048] text-[#F8F5EE]'
              : 'bg-[#FCFAF5] border-[#E5DED2] text-[#20242A]'
          }`}
        >
          {/* Header */}
          <div
            className={`px-6 py-5 border-b flex items-center justify-between ${
              isDark ? 'border-[#223048] bg-[#111721]' : 'border-[#E5DED2] bg-[#F7F3EA]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                  isDark ? 'bg-[#B99452]/15 text-[#B99452]' : 'bg-[#23324A]/10 text-[#23324A]'
                }`}
              >
                <Palette className="w-5 h-5" />
              </div>
              <div>
                <h3 id="theme-selector-title" className="text-lg font-serif font-medium">Memorial Appearance</h3>
                <p className={`text-xs ${isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}`}>
                  Choose how their memory and legacy are presented to the world
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                isDark ? 'hover:bg-[#1E2838] text-[#9EA3AA]' : 'hover:bg-[#EAE4D8] text-[#7D766D]'
              }`}
              aria-label="Close memorial appearance dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Theme Grid */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {themesList.map((theme: MemorialThemeDefinition) => {
                const isSelected = activeThemeId === theme.id;
                const isLocked = theme.isPremium && !canUsePremiumThemes;

                return (
                  <div
                    key={theme.id}
                    onClick={() => onSelectTheme(theme.id)}
                    className={`relative p-5 rounded-2xl border-2 cursor-pointer transition-all duration-200 group text-left ${
                      isSelected
                        ? isDark
                          ? 'border-[#B99452] bg-[#1A2332] shadow-lg shadow-[#B99452]/10 ring-1 ring-[#B99452]'
                          : 'border-[#23324A] bg-[#FFFFFF] shadow-lg shadow-[#23324A]/10 ring-1 ring-[#23324A]'
                        : isDark
                        ? 'border-[#202C40] bg-[#18212F] hover:border-[#2E3E58]'
                        : 'border-[#E5DED2] bg-[#FAF7F0] hover:border-[#C4B9A7]'
                    }`}
                  >
                    {/* Header Row: Swatches & Tier Badge */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-5 h-5 rounded-full border border-black/20 shadow-sm"
                          style={{ backgroundColor: theme.previewColor }}
                        />
                        <span className="font-serif font-medium text-sm tracking-wide">
                          {theme.name}
                        </span>
                      </div>

                      {theme.isPremium ? (
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-sans font-medium tracking-wider uppercase ${
                            canUsePremiumThemes
                              ? isDark
                                ? 'bg-[#B99452]/20 text-[#E0C078] border border-[#B99452]/30'
                                : 'bg-[#EAE4D8] text-[#23324A] border border-[#C4B9A7]'
                              : isDark
                              ? 'bg-amber-950/40 text-amber-300 border border-amber-800/40'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {!canUsePremiumThemes && <Lock className="w-2.5 h-2.5" />}
                          Memorial Care
                        </span>
                      ) : (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-sans font-medium uppercase tracking-wider ${
                            isDark
                              ? 'bg-white/10 text-white/70'
                              : 'bg-black/5 text-stone-600'
                          }`}
                        >
                          Free
                        </span>
                      )}
                    </div>

                    {/* Tagline */}
                    <p
                      className={`text-xs leading-relaxed mb-4 ${
                        isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                      }`}
                    >
                      {theme.tagline}
                    </p>

                    {/* Miniature Aesthetic Preview Card */}
                    <div
                      className={`p-3 rounded-xl border text-[11px] space-y-1 transition-colors ${
                        isDark ? theme.cardBgDark : theme.cardBgLight
                      } ${isDark ? theme.borderDark : theme.borderLight}`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`font-serif text-xs ${
                            isDark ? theme.textDark : theme.textLight
                          }`}
                        >
                          “A Life of Grace”
                        </span>
                        <span
                          className="text-[9px] uppercase tracking-widest font-mono"
                          style={{ color: theme.previewColor }}
                        >
                          1948 — 2025
                        </span>
                      </div>
                      <div
                        className="h-1 w-12 rounded-full"
                        style={{ backgroundColor: theme.previewColor }}
                      />
                    </div>

                    {/* Selection Checkmark */}
                    {isSelected && (
                      <div
                        className={`absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center shadow-md ${
                          isDark
                            ? 'bg-[#B99452] text-[#111820]'
                            : 'bg-[#23324A] text-white'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Premium Notice Banner */}
            {!canUsePremiumThemes && (
              <div
                className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs ${
                  isDark
                    ? 'bg-amber-950/20 border-amber-900/40 text-[#FAF0DE]'
                    : 'bg-amber-50/80 border-amber-200 text-[#3D2C12]'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Preview any theme freely</span>
                    <span className={isDark ? 'text-[#B8A490]' : 'text-[#785E3B]'}>
                      You can preview all 6 themes on this memorial now. Upgrade to Memorial Care (₹999/year) to save premium themes permanently.
                    </span>
                  </div>
                </div>
                {onUpgradeClick && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={onUpgradeClick}
                    icon={Crown}
                    className="flex-shrink-0"
                  >
                    Memorial Care
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className={`px-6 py-4 border-t flex items-center justify-between ${
              isDark ? 'border-[#223048] bg-[#111721]' : 'border-[#E5DED2] bg-[#F7F3EA]'
            }`}
          >
            <span className={`text-xs ${isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}`}>
              Theme changes are applied immediately to this memorial
            </span>
            <Button variant="primary" size="sm" onClick={onClose}>
              Done
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
