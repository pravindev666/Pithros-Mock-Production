import React from 'react';
import { PithrosLogo } from '../visual/PithrosLogo';
import { ShieldCheck, HeartHandshake, Lock } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

interface PublicFooterProps {
  onNavigate: (route: string) => void;
}

export const PublicFooter: React.FC<PublicFooterProps> = ({ onNavigate }) => {
  const { isDark } = useTheme();
  const { metadata } = useLocale();

  return (
    <footer
      data-ui-component="navigation"
      style={{ fontFamily: metadata.uiFontFamily }}
      className={`w-full border-t transition-colors text-xs pt-16 pb-12 ${
        isDark
          ? 'border-[#202C40] bg-[#111820] text-[#9EA3AA]'
          : 'border-[#E5DED2] bg-[#F3EEE4] text-[#554F48]'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className={`grid grid-cols-1 md:grid-cols-5 gap-10 pb-12 border-b ${
            isDark ? 'border-[#202C40]' : 'border-[#E5DED2]'
          }`}
        >
          {/* Brand info */}
          <div className="md:col-span-2 space-y-4">
            <PithrosLogo />
            <p
              className={`text-sm font-serif italic max-w-sm mt-3 ${
                isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
              }`}
            >
              “A place to remember a life.”
            </p>
            <p className="text-xs leading-relaxed max-w-sm opacity-90">
              Pithros is a quiet, permanent digital remembrance platform where families preserve stories, photographs, voices, and milestones with dignity and uncompromised privacy.
            </p>
            <div
              className={`flex items-center gap-4 text-[12px] pt-2 ${
                isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
              }`}
            >
              <span className="flex items-center gap-1.5 font-medium">
                <Lock className={`w-3.5 h-3.5 ${isDark ? 'text-[#B99452]' : 'text-[#23324A]'}`} />
                Private by Default
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className={`w-3.5 h-3.5 ${isDark ? 'text-[#2D7A5F]' : 'text-[#397A5E]'}`} />
                Family Governed
              </span>
            </div>
          </div>

          {/* Platform */}
          <div>
            <h4
              className={`text-xs font-sans font-semibold uppercase tracking-widest mb-4 ${
                isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
              }`}
            >
              Platform
            </h4>
            <ul className="space-y-2.5">
              <li>
                <button
                  onClick={() => onNavigate('/memorials')}
                  className={`transition-colors hover:underline cursor-pointer ${
                    isDark ? 'hover:text-[#B99452]' : 'hover:text-[#23324A]'
                  }`}
                >
                  Explore Memorials
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/how-it-works')}
                  className={`transition-colors hover:underline cursor-pointer ${
                    isDark ? 'hover:text-[#B99452]' : 'hover:text-[#23324A]'
                  }`}
                >
                  How It Works
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/create-memorial')}
                  className={`transition-colors hover:underline cursor-pointer ${
                    isDark ? 'hover:text-[#B99452]' : 'hover:text-[#23324A]'
                  }`}
                >
                  Create a Memorial
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/pricing')}
                  className={`transition-colors hover:underline cursor-pointer ${
                    isDark ? 'hover:text-[#B99452]' : 'hover:text-[#23324A]'
                  }`}
                >
                  Family Plans & Archives
                </button>
              </li>
            </ul>
          </div>

          {/* Farewell Network */}
          <div>
            <h4
              className={`text-xs font-sans font-semibold uppercase tracking-widest mb-4 ${
                isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
              }`}
            >
              Farewell Network
            </h4>
            <ul className="space-y-2.5">
              <li>
                <button
                  onClick={() => onNavigate('/farewell')}
                  className={`transition-colors hover:underline cursor-pointer ${
                    isDark ? 'hover:text-[#B99452]' : 'hover:text-[#23324A]'
                  }`}
                >
                  Trusted Service Providers
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/farewell')}
                  className={`transition-colors hover:underline cursor-pointer ${
                    isDark ? 'hover:text-[#B99452]' : 'hover:text-[#23324A]'
                  }`}
                >
                  Service Directory
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/partner')}
                  className={`transition-colors hover:underline cursor-pointer ${
                    isDark ? 'hover:text-[#B99452]' : 'hover:text-[#23324A]'
                  }`}
                >
                  Provider Partner Portal
                </button>
              </li>
            </ul>
          </div>

          {/* Trust & Safety */}
          <div>
            <h4
              className={`text-xs font-sans font-semibold uppercase tracking-widest mb-4 ${
                isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
              }`}
            >
              Trust & Safety
            </h4>
            <ul className="space-y-2.5">
              <li>
                <button
                  onClick={() => onNavigate('/how-it-works')}
                  className={`transition-colors hover:underline cursor-pointer ${
                    isDark ? 'hover:text-[#B99452]' : 'hover:text-[#23324A]'
                  }`}
                >
                  Document Verification
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/pricing')}
                  className={`transition-colors hover:underline cursor-pointer ${
                    isDark ? 'hover:text-[#B99452]' : 'hover:text-[#23324A]'
                  }`}
                >
                  Zero Advertising Guarantee
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/admin')}
                  className={`transition-colors hover:underline cursor-pointer ${
                    isDark ? 'hover:text-[#B99452]' : 'hover:text-[#23324A]'
                  }`}
                >
                  Admin Trust Console
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className={`pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[12px] ${
            isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
          }`}
        >
          <p>© {new Date().getFullYear()} Pithros. All memories preserved with quiet reverence.</p>
          <div className="flex flex-wrap items-center gap-5">
            <span>Religion-Neutral Design</span>
            <span>Family-Controlled Privacy</span>
            <span>Permanent Digital Archive</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
