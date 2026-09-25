import React from 'react';
import { ShieldCheck, Lock, EyeOff, FileText } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface DocumentSecurityBadgeProps {
  documentTitle?: string;
  variant?: 'compact' | 'full';
  showAuditNotice?: boolean;
}

export const DocumentSecurityBadge: React.FC<DocumentSecurityBadgeProps> = ({
  documentTitle,
  variant = 'full',
  showAuditNotice = true,
}) => {
  const { isDark } = useTheme();

  if (variant === 'compact') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border ${
          isDark
            ? 'bg-[#182337] text-[#D9D2C6] border-[#202C40]'
            : 'bg-[#E5DED2] text-[#554F48] border-[#E5DED2]'
        }`}
        title="Sensitive document: encrypted, restricted, and never indexed in public registry."
      >
        <Lock className={`w-3 h-3 ${isDark ? 'text-[#B99452]' : 'text-[#23324A]'}`} />
        <span>Restricted • Private • Access Logged</span>
      </span>
    );
  }

  return (
    <div
      className={`p-3.5 rounded-xl border text-xs space-y-2 transition-colors ${
        isDark
          ? 'bg-[#14100C] border-[#202C40] text-[#D9D2C6]'
          : 'bg-[#E5DED2] border-[#E5DED2] text-[#554F48]'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className={`w-6 h-6 rounded-md flex items-center justify-center ${
              isDark ? 'bg-[#182337] text-[#B99452]' : 'bg-[#EFE1C5] text-[#23324A]'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="font-semibold text-xs block">
              {documentTitle ? documentTitle : 'Sensitive Verification Document'}
            </span>
            <span className={`text-[10px] ${isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}`}>
              Never public • Never indexed • Stored in encrypted vault
            </span>
          </div>
        </div>
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold tracking-wider ${
            isDark
              ? 'bg-[#2D7A5F]/20 text-[#6EE7B7] border border-[#2D7A5F]/40'
              : 'bg-[#397A5E]/15 text-[#1B4D3E] border border-[#397A5E]/30'
          }`}
        >
          Confidential
        </span>
      </div>

      {showAuditNotice && (
        <div
          className={`pt-2 border-t flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono ${
            isDark ? 'border-[#202C40] text-[#9EA3AA]' : 'border-[#E5DED2] text-[#7D766D]'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3 h-3 text-[#2D7A5F]" />
            Access is cryptographically logged to the audit stream
          </span>
          <span className="flex items-center gap-1.5">
            <EyeOff className="w-3 h-3 text-[#B85B55]" />
            Excluded from search engines & public memorials
          </span>
        </div>
      )}
    </div>
  );
};
