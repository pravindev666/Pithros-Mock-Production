import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Languages, Check, ChevronDown } from 'lucide-react';
import { useLocale, SUPPORTED_LOCALES, SupportedLocale } from '../../context/LocaleContext';
import { useTheme } from '../../context/ThemeContext';
import { MOTION_TIMING, MOTION_EASING } from '../../lib/motion';

interface LanguageSelectorProps {
  variant?: 'navbar' | 'compact' | 'drawer';
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  variant = 'navbar',
  className = '',
}) => {
  const { locale, setLocale, metadata } = useLocale();
  const { isDark } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (code: SupportedLocale) => {
    setLocale(code);
    setIsOpen(false);
  };

  const localeList = Object.values(SUPPORTED_LOCALES);

  const [drawerExpanded, setDrawerExpanded] = useState(false);

  if (variant === 'drawer') {
    return (
      <div className={`w-full ${className}`}>
        <button
          type="button"
          onClick={() => setDrawerExpanded(!drawerExpanded)}
          aria-expanded={drawerExpanded}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
            isDark
              ? 'bg-[#182337] border-[#202C40] text-[#D9D2C6] hover:text-[#F8F5EE] hover:border-[#2D3D56]'
              : 'bg-[#E5DED2] border-[#E5DED2] text-[#554F48] hover:text-[#20242A] hover:border-[#C5B9A6]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Languages className="w-4 h-4 text-[#B99452]" />
            <span>Language: <strong className="font-semibold">{metadata.nativeName}</strong> <span className="opacity-75">({metadata.name})</span></span>
          </div>
          <div className="flex items-center gap-1 text-[11px] opacity-75">
            <span>{drawerExpanded ? 'Close' : 'Change'}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${drawerExpanded ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {drawerExpanded && (
          <div className="grid grid-cols-2 gap-1.5 mt-2 pt-2 border-t border-inherit">
            {localeList.map((loc) => {
              const isSelected = loc.code === locale;
              return (
                <button
                  key={loc.code}
                  type="button"
                  onClick={() => {
                    setLocale(loc.code);
                    setDrawerExpanded(false);
                  }}
                  style={{ fontFamily: loc.uiFontFamily }}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs border transition-colors cursor-pointer text-left ${
                    isSelected
                      ? isDark
                        ? 'border-[#B99452] bg-[#23324A] text-[#F8F5EE] font-medium'
                        : 'border-[#23324A] bg-[#FCFAF5] text-[#23324A] font-semibold shadow-xs'
                      : isDark
                      ? 'border-[#202C40] bg-[#182337] text-[#D9D2C6] hover:border-[#2D3D56]'
                      : 'border-[#E5DED2] bg-white text-[#554F48] hover:border-[#23324A]/40'
                  }`}
                >
                  <div>
                    <div className="text-xs">{loc.nativeName}</div>
                    <div className="text-[10px] opacity-70">{loc.name}</div>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#B99452]" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      <motion.button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.02, transition: { duration: MOTION_TIMING.microFast, ease: MOTION_EASING.easeOut } }}
        whileTap={{ scale: 0.98, transition: { duration: MOTION_TIMING.microFast, ease: MOTION_EASING.easeOut } }}
        style={{ fontFamily: metadata.uiFontFamily }}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-xs transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B99452] ${
          isDark
            ? 'bg-[#182337]/90 border-[#202C40] text-[#D9D2C6] hover:text-[#F8F5EE] hover:border-[#2D3D56]'
            : 'bg-[#FCFAF5] border-[#E5DED2] text-[#554F48] hover:text-[#20242A] hover:border-[#23324A]'
        }`}
        aria-haspopup="true"
        aria-expanded={isOpen}
        title="Select Language & Indic UI Script"
      >
        <Languages className="w-3.5 h-3.5 text-[#B99452]" />
        <span className="font-medium">{metadata.nativeName}</span>
        <ChevronDown
          className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`absolute right-0 mt-2 w-64 rounded-2xl border shadow-xl p-2 z-50 overflow-hidden backdrop-blur-md ${
              isDark
                ? 'bg-[#182337]/95 border-[#202C40] text-[#F8F5EE] shadow-black/40'
                : 'bg-[#FCFAF5]/98 border-[#E5DED2] text-[#20242A] shadow-stone-400/20'
            }`}
          >
            <div className="px-2.5 py-1.5 border-b mb-1 border-inherit">
              <p
                className={`text-[11px] font-medium tracking-wider uppercase ${
                  isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                }`}
              >
                Indic Script Typography
              </p>
              <p className="text-[10px] opacity-75 mt-0.5">
                Renders with script-specific Noto Sans UI
              </p>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-0.5 py-1">
              {localeList.map((loc) => {
                const isSelected = loc.code === locale;
                return (
                  <button
                    key={loc.code}
                    type="button"
                    onClick={() => handleSelect(loc.code)}
                    style={{ fontFamily: loc.uiFontFamily }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer text-left ${
                      isSelected
                        ? isDark
                          ? 'bg-[#23324A] text-[#F8F5EE] font-medium'
                          : 'bg-[#E5DED2]/60 text-[#23324A] font-semibold'
                        : isDark
                        ? 'text-[#D9D2C6] hover:bg-[#202C40] hover:text-[#F8F5EE]'
                        : 'text-[#554F48] hover:bg-[#E5DED2]/40 hover:text-[#20242A]'
                    }`}
                  >
                    <div>
                      <div className="text-xs flex items-center gap-1.5">
                        <span>{loc.nativeName}</span>
                        <span className="text-[10px] opacity-65 font-sans">({loc.name})</span>
                      </div>
                      <div className="text-[10px] opacity-60 font-mono">
                        {loc.tagline}
                      </div>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#B99452] shrink-0" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
