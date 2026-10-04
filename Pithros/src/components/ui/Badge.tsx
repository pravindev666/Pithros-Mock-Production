import React from 'react';
import { ShieldCheck, Lock, Users, Globe, EyeOff, Clock, AlertCircle } from 'lucide-react';
import { PrivacyLevel, VerificationStatus } from '../../types';
import { useTheme } from '../../context/ThemeContext';

interface BadgeProps {
  children?: React.ReactNode;
  variant?: 'amber' | 'neutral' | 'sage' | 'muted' | 'outline' | 'danger';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
}) => {
  const { isDark } = useTheme();

  const sizeClasses = {
    sm: 'text-[11px] px-2.5 py-0.5 tracking-wider font-medium',
    md: 'text-xs px-3 py-1 tracking-wide font-medium',
  };

  const getVariantClasses = () => {
    switch (variant) {
      case 'amber':
        return isDark
          ? 'bg-[#B99452]/15 text-[#D1B477] border border-[#B99452]/30'
          : 'bg-[#E5DED2] text-[#23324A] border border-[#A66B76]/30';
      case 'neutral':
        return isDark
          ? 'bg-[#202C40] text-[#D9D2C6] border border-[#2D3D56]'
          : 'bg-[#E5DED2] text-[#20242A] border border-[#E5DED2]';
      case 'sage':
        return isDark
          ? 'bg-[#4C8A6A]/20 text-[#86EFAC] border border-[#4C8A6A]/40'
          : 'bg-[#EAF5EF] text-[#245C45] border border-[#397A5E]/30';
      case 'muted':
        return isDark
          ? 'bg-[#182337] text-[#9EA3AA] border border-[#202C40]'
          : 'bg-[#ECE4D8] text-[#554F48] border border-[#E5DED2]';
      case 'outline':
        return isDark
          ? 'bg-transparent text-[#D9D2C6] border border-[#2D3D56]'
          : 'bg-transparent text-[#554F48] border border-[#E5DED2]';
      case 'danger':
        return isDark
          ? 'bg-[#C75B63]/20 text-[#FCA5A5] border border-[#C75B63]/40'
          : 'bg-red-50 text-[#B85B63] border border-red-200';
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-sans rounded-full transition-colors select-none ${sizeClasses[size]} ${getVariantClasses()} ${className}`}
    >
      {children}
    </span>
  );
};

export const PrivacyBadge: React.FC<{ privacy: PrivacyLevel; className?: string }> = ({
  privacy,
  className = '',
}) => {
  const configs = {
    private: { icon: Lock, label: 'Private (Invited Only)', variant: 'neutral' as const },
    family: { icon: Users, label: 'Family Circle', variant: 'amber' as const },
    unlisted: { icon: EyeOff, label: 'Unlisted (Link Only)', variant: 'muted' as const },
    public: { icon: Globe, label: 'Public Memorial', variant: 'sage' as const },
  };

  const conf = configs[privacy] || configs.private;
  const Icon = conf.icon;

  return (
    <Badge variant={conf.variant} size="sm" className={className}>
      <Icon className="w-3 h-3 flex-shrink-0" />
      <span>{conf.label}</span>
    </Badge>
  );
};

export const VerificationBadge: React.FC<{
  type?: 'Family Managed' | 'Document Reviewed' | 'Enhanced Verification';
  status: VerificationStatus;
  className?: string;
  onClick?: () => void;
}> = ({ type, status, className = '', onClick }) => {
  const { isDark } = useTheme();

  let content: React.ReactNode;

  if (status === 'draft' || status === 'pending') {
    content = (
      <Badge variant="muted" size="sm" className={className}>
        <Clock className={`w-3 h-3 ${isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}`} />
        <span>Verification Pending</span>
      </Badge>
    );
  } else if (status === 'under_review') {
    content = (
      <Badge variant="amber" size="sm" className={className}>
        <Clock className={`w-3 h-3 animate-pulse ${isDark ? 'text-[#B99452]' : 'text-[#23324A]'}`} />
        <span>Under Document Review</span>
      </Badge>
    );
  } else if (status === 'needs_info') {
    content = (
      <Badge variant="amber" size="sm" className={className}>
        <AlertCircle className={`w-3 h-3 ${isDark ? 'text-[#B99452]' : 'text-[#23324A]'}`} />
        <span>Information Requested</span>
      </Badge>
    );
  } else if (status === 'rejected') {
    content = (
      <Badge variant="danger" size="sm" className={className}>
        <AlertCircle className="w-3 h-3" />
        <span>Verification Rejected</span>
      </Badge>
    );
  } else {
    content = (
      <Badge variant="sage" size="sm" className={className}>
        <ShieldCheck className={`w-3.5 h-3.5 ${isDark ? 'text-[#86EFAC]' : 'text-[#397A5E]'}`} />
        <span>{type || 'Document Reviewed'}</span>
      </Badge>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="cursor-pointer rounded-full transition-opacity hover:opacity-85"
      >
        {content}
      </button>
    );
  }

  return content;
};
