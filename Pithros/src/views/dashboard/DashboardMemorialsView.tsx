import React from 'react';
import { motion } from 'motion/react';
import {
  Heart,
  Plus,
  ExternalLink,
  ShieldCheck,
  Lock,
  Globe,
  Users,
  Settings,
  Calendar,
  Flame,
} from 'lucide-react';
import { Memorial } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../../components/ui/Button';
import { VerificationBadge, PrivacyBadge } from '../../components/ui/Badge';

interface DashboardMemorialsViewProps {
  memorials: Memorial[];
  activeMemorial: Memorial;
  onSelectMemorial: (m: Memorial) => void;
  onNavigate: (route: string) => void;
}

export const DashboardMemorialsView: React.FC<DashboardMemorialsViewProps> = ({
  memorials,
  activeMemorial,
  onSelectMemorial,
  onNavigate,
}) => {
  const { isDark } = useTheme();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-inherit">
        <div>
          <h1
            className={`text-2xl sm:text-3xl font-serif ${
              isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
            }`}
          >
            My Memorial Sanctuaries
          </h1>
          <p
            className={`text-xs sm:text-sm mt-1 ${
              isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
            }`}
          >
            Manage the sacred spaces and legacy records under your stewardship.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={Plus}
          onClick={() => onNavigate('/create-memorial')}
        >
          Create New Memorial
        </Button>
      </div>

      {/* Grid of Memorials */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {memorials.map((m) => {
          const isActive = m.id === activeMemorial.id;
          return (
            <motion.div
              key={m.id}
              whileHover={{ y: -3 }}
              transition={{ duration: 0.2 }}
              className={`p-5 rounded-2xl border flex flex-col justify-between transition-all ${
                isActive
                  ? isDark
                    ? 'border-[#B99452] bg-[#16120D] ring-1 ring-[#B99452]/30 shadow-xl'
                    : 'border-[#23324A] bg-[#FCFAF5] ring-1 ring-[#23324A]/30 shadow-md'
                  : isDark
                  ? 'border-[#202C40] bg-[#182337] hover:border-[#382F24]'
                  : 'border-[#E5DED2] bg-white hover:border-[#C4B9A8]'
              }`}
            >
              <div>
                <div className="flex items-start gap-3.5 mb-4">
                  <img
                    src={m.portraitUrl}
                    alt={m.fullName}
                    className="w-16 h-16 rounded-xl object-cover border border-amber-500/20 flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h2
                        className={`text-base font-serif font-medium truncate ${
                          isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                        }`}
                      >
                        {m.fullName}
                      </h2>
                    </div>
                    <p
                      className={`text-xs font-mono mt-0.5 ${
                        isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                      }`}
                    >
                      {m.birthDate ? m.birthDate.slice(0, 4) : ''} — {m.deathDate ? m.deathDate.slice(0, 4) : ''}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <VerificationBadge status={m.verificationStatus} />
                      <PrivacyBadge privacy={m.privacy} />
                    </div>
                  </div>
                </div>

                <div
                  className={`py-3 px-3.5 rounded-xl border text-xs grid grid-cols-3 gap-2 text-center my-3 ${
                    isDark
                      ? 'border-[#202C40] bg-[#1A150F]'
                      : 'border-[#EAE1D3] bg-[#F7F2E8]'
                  }`}
                >
                  <div>
                    <span className="block font-medium">{m.timeline?.length || 0}</span>
                    <span className="text-[10px] opacity-70">Milestones</span>
                  </div>
                  <div>
                    <span className="block font-medium">
                      {(m.media?.length || 0) + (m.voiceMemories?.length || 0)}
                    </span>
                    <span className="text-[10px] opacity-70">Memories</span>
                  </div>
                  <div>
                    <span className="block font-medium">{m.family?.length || 1}</span>
                    <span className="text-[10px] opacity-70">Stewards</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-inherit flex items-center justify-between gap-2">
                {isActive ? (
                  <span
                    className={`text-xs font-medium px-3 py-1 rounded-full ${
                      isDark
                        ? 'bg-[#B99452]/15 text-[#B99452]'
                        : 'bg-[#23324A]/15 text-[#23324A]'
                    }`}
                  >
                    Current Active Space
                  </span>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSelectMemorial(m)}
                  >
                    Select Space
                  </Button>
                )}

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onNavigate(`/m/${m.slug}`)}
                    className={`p-2 rounded-lg border text-xs transition-colors ${
                      isDark
                        ? 'border-[#202C40] text-[#9EA3AA] hover:text-[#F8F5EE]'
                        : 'border-[#E5DED2] text-[#7D766D] hover:text-[#20242A]'
                    }`}
                    title="View public memorial"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectMemorial(m);
                      onNavigate('/dashboard/editor');
                    }}
                    className={`p-2 rounded-lg border text-xs transition-colors ${
                      isDark
                        ? 'border-[#202C40] text-[#9EA3AA] hover:text-[#F8F5EE]'
                        : 'border-[#E5DED2] text-[#7D766D] hover:text-[#20242A]'
                    }`}
                    title="Open editor"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
