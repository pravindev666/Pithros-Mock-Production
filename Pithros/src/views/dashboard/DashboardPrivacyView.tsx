import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Lock,
  Globe,
  Users,
  Shield,
  Eye,
  EyeOff,
  Key,
  Search,
  CheckCircle2,
  AlertCircle,
  Copy,
  History,
} from 'lucide-react';
import { Memorial, PrivacyLevel } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../../components/ui/Button';

interface DashboardPrivacyViewProps {
  memorial: Memorial;
  onUpdate?: () => void;
}

export const DashboardPrivacyView: React.FC<DashboardPrivacyViewProps> = ({
  memorial,
}) => {
  const { isDark } = useTheme();

  const [accessMode, setAccessMode] = useState<PrivacyLevel>(
    memorial.privacy || 'public'
  );
  const [allowIndexing, setAllowIndexing] = useState(true);
  const [requireTributeApproval, setRequireTributeApproval] = useState(true);
  const [allowPublicFloralOfferings, setAllowPublicFloralOfferings] = useState(true);
  const [passcode, setPasscode] = useState('');
  const [passcodeHint, setPasscodeHint] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(
      `${window.location.origin}/m/${memorial.slug}${
        accessMode === 'unlisted' ? '?access=unlisted' : ''
      }`
    );
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const securityLogs = [
    {
      event: 'Privacy level verified',
      time: 'March 14, 2026 at 11:20 AM',
      actor: 'Anita Krishnan (Steward)',
    },
    {
      event: 'Contributor invitation accepted',
      time: 'March 12, 2026 at 03:45 PM',
      actor: 'Vikram Krishnan (Brother)',
    },
    {
      event: 'Identity verification document submitted',
      time: 'March 08, 2026 at 09:12 AM',
      actor: 'Anita Krishnan (Steward)',
    },
  ];

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
            Sanctuary Privacy & Access Controls
          </h1>
          <p
            className={`text-xs sm:text-sm mt-1 ${
              isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
            }`}
          >
            Control who can discover, view, and contribute to {memorial.fullName}’s memorial.
          </p>
        </div>

        <Button variant="outline" size="sm" icon={Copy} onClick={handleCopyLink}>
          {copiedLink ? 'Link Copied' : 'Copy Sanctuary Link'}
        </Button>
      </div>

      {saveSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>Privacy preferences updated and propagated across the sanctuary.</span>
        </motion.div>
      )}

      {/* Access Mode Selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            key: 'public' as const,
            title: 'Public Sanctuary',
            desc: 'Accessible to all family, friends, and colleagues. Can be found via search.',
            icon: Globe,
          },
          {
            key: 'unlisted' as const,
            title: 'Family Unlisted',
            desc: 'Hidden from search engines and public directories. Only accessible via secret direct link.',
            icon: EyeOff,
          },
          {
            key: 'private' as const,
            title: 'Private Vault',
            desc: 'Restricted strictly to invited family contributors. Requires authentication and approval.',
            icon: Lock,
          },
        ].map((tier) => {
          const isSelected = accessMode === tier.key;
          const Icon = tier.icon;
          return (
            <div
              key={tier.key}
              onClick={() => setAccessMode(tier.key)}
              className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                isSelected
                  ? isDark
                    ? 'border-[#B99452] bg-[#1A150F] ring-1 ring-[#B99452]/30 shadow-lg'
                    : 'border-[#23324A] bg-[#F7F1E6] ring-1 ring-[#23324A]/30 shadow-md'
                  : isDark
                  ? 'border-[#202C40] bg-[#182337] hover:border-[#382F24]'
                  : 'border-[#E5DED2] bg-[#FCFAF5] hover:border-[#C4B9A8]'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  className={`p-2.5 rounded-xl border ${
                    isSelected
                      ? isDark
                        ? 'border-[#B99452]/40 bg-[#B99452]/10 text-[#B99452]'
                        : 'border-[#23324A]/40 bg-[#23324A]/10 text-[#23324A]'
                      : isDark
                      ? 'border-[#202C40] bg-[#182337] text-[#9EA3AA]'
                      : 'border-[#E5DED2] bg-white text-[#7D766D]'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                {isSelected && (
                  <span
                    className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      isDark
                        ? 'bg-[#B99452]/20 text-[#B99452]'
                        : 'bg-[#23324A]/20 text-[#23324A]'
                    }`}
                  >
                    Active
                  </span>
                )}
              </div>
              <h3
                className={`text-sm font-medium ${
                  isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                }`}
              >
                {tier.title}
              </h3>
              <p
                className={`text-xs mt-1.5 leading-relaxed ${
                  isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                }`}
              >
                {tier.desc}
              </p>
            </div>
          );
        })}
      </div>

      {/* Detailed Protection Preferences */}
      <form onSubmit={handleSave} className="space-y-6">
        <div
          className={`p-6 rounded-2xl border space-y-5 ${
            isDark ? 'border-[#202C40] bg-[#182337]' : 'border-[#E5DED2] bg-[#FCFAF5]'
          }`}
        >
          <h2
            className={`text-base font-serif ${
              isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
            }`}
          >
            Contribution & Indexing Governance
          </h2>

          <div className="space-y-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={requireTributeApproval}
                onChange={(e) => setRequireTributeApproval(e.target.checked)}
                className="mt-1 w-4 h-4 rounded text-amber-500 border-stone-600 focus:ring-amber-500"
              />
              <div>
                <span
                  className={`text-xs font-medium block ${
                    isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                  }`}
                >
                  Require steward approval for tributes & condolence notes
                </span>
                <span
                  className={`text-[11px] block mt-0.5 ${
                    isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                  }`}
                >
                  Submissions will wait in your review queue before appearing on the public memorial.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={allowPublicFloralOfferings}
                onChange={(e) => setAllowPublicFloralOfferings(e.target.checked)}
                className="mt-1 w-4 h-4 rounded text-amber-500 border-stone-600 focus:ring-amber-500"
              />
              <div>
                <span
                  className={`text-xs font-medium block ${
                    isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                  }`}
                >
                  Allow visitors to light virtual sanctuary lamps & floral gestures
                </span>
                <span
                  className={`text-[11px] block mt-0.5 ${
                    isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                  }`}
                >
                  Friends and relatives can leave custom remembrance gestures without creating an account.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={allowIndexing}
                onChange={(e) => setAllowIndexing(e.target.checked)}
                className="mt-1 w-4 h-4 rounded text-amber-500 border-stone-600 focus:ring-amber-500"
              />
              <div>
                <span
                  className={`text-xs font-medium block ${
                    isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                  }`}
                >
                  Allow search engine indexing (Google, Bing)
                </span>
                <span
                  className={`text-[11px] block mt-0.5 ${
                    isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                  }`}
                >
                  Enable colleagues and distant family to discover Arun's memorial when searching his name.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Optional Passcode Gate */}
        <div
          className={`p-6 rounded-2xl border space-y-4 ${
            isDark ? 'border-[#202C40] bg-[#182337]' : 'border-[#E5DED2] bg-[#FCFAF5]'
          }`}
        >
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-amber-400" />
            <h2
              className={`text-base font-serif ${
                isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
              }`}
            >
              Optional Sanctuary Passcode
            </h2>
          </div>
          <p
            className={`text-xs ${
              isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
            }`}
          >
            Protect the memorial with a private family secret code. Visitors must input this code before viewing photos and audio memories.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label
                className={`block text-xs font-medium mb-1.5 ${
                  isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                }`}
              >
                Passcode (Leave blank to disable)
              </label>
              <div className="relative">
                <input
                  type={showPasscode ? 'text' : 'password'}
                  placeholder="e.g. Wayanad1954"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border text-xs transition-colors focus:outline-none ${
                    isDark
                      ? 'border-[#202C40] bg-[#16120D] text-[#F8F5EE] focus:border-[#B99452]'
                      : 'border-[#E5DED2] bg-white text-[#20242A] focus:border-[#23324A]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPasscode(!showPasscode)}
                  className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-200"
                >
                  {showPasscode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label
                className={`block text-xs font-medium mb-1.5 ${
                  isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                }`}
              >
                Passcode Hint for Family
              </label>
              <input
                type="text"
                placeholder="e.g. Grandfather's birthplace and birth year"
                value={passcodeHint}
                onChange={(e) => setPasscodeHint(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border text-xs transition-colors focus:outline-none ${
                  isDark
                    ? 'border-[#202C40] bg-[#16120D] text-[#F8F5EE] focus:border-[#B99452]'
                    : 'border-[#E5DED2] bg-white text-[#20242A] focus:border-[#23324A]'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Security Audit Trail */}
        <div
          className={`p-6 rounded-2xl border space-y-4 ${
            isDark ? 'border-[#202C40] bg-[#182337]' : 'border-[#E5DED2] bg-[#FCFAF5]'
          }`}
        >
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-stone-400" />
            <h2
              className={`text-base font-serif ${
                isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
              }`}
            >
              Sanctuary Access Audit Trail
            </h2>
          </div>

          <div className="space-y-2">
            {securityLogs.map((log, i) => (
              <div
                key={i}
                className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                  isDark
                    ? 'border-[#202C40] bg-[#16120D] text-[#D9D2C6]'
                    : 'border-[#E5DED2] bg-white text-[#20242A]'
                }`}
              >
                <div>
                  <span className="font-medium">{log.event}</span>
                  <span
                    className={`block text-[11px] ${
                      isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                    }`}
                  >
                    by {log.actor}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-mono ${
                    isDark ? 'text-[#6E5F4E]' : 'text-[#A09585]'
                  }`}
                >
                  {log.time}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" variant="primary">
            Save Privacy Settings
          </Button>
        </div>
      </form>
    </div>
  );
};
