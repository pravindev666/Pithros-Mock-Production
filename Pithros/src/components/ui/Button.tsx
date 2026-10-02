import React from 'react';
import { motion, HTMLMotionProps } from 'motion/react';
import { LucideIcon } from 'lucide-react';
import { MOTION_TIMING, MOTION_EASING } from '../../lib/motion';
import { useTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  isLoading = false,
  className = '',
  disabled,
  style,
  ...props
}) => {
  const { isDark } = useTheme();
  const { metadata } = useLocale();

  const baseClasses =
    'inline-flex items-center justify-center font-medium rounded-xl transition-all select-none cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#23324A] dark:focus-visible:ring-[#B99452]';

  const sizeClasses = {
    sm: 'text-xs px-3.5 py-2 gap-1.5 min-h-[34px] h-auto',
    md: 'text-sm px-5 py-2.5 gap-2 min-h-[42px] h-auto',
    lg: 'text-base px-6 py-3.5 gap-2.5 min-h-[48px] h-auto',
  };

  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return isDark
          ? 'bg-[#B99452] text-[#111820] font-semibold hover:bg-[#D1B477] border border-[#B99452] shadow-sm'
          : 'bg-[#23324A] text-[#F8F5EE] font-semibold hover:bg-[#182337] border border-[#23324A] shadow-sm';
      case 'secondary':
        return isDark
          ? 'bg-[#202C40] text-[#F8F5EE] hover:bg-[#283750] border border-[#182337]/50 hover:border-[#B99452]/60'
          : 'bg-[#E5DED2] text-[#20242A] hover:bg-[#ECE4D8] border border-[#23324A]/30 hover:border-[#23324A]/60';
      case 'outline':
        return isDark
          ? 'bg-transparent text-[#D9D2C6] border border-[#182337]/40 hover:border-[#B99452]/60 hover:bg-[#182337]/60 hover:text-[#F8F5EE]'
          : 'bg-transparent text-[#20242A] border border-[#23324A]/30 hover:border-[#23324A] hover:bg-[#E5DED2] hover:text-[#20242A]';
      case 'ghost':
        return isDark
          ? 'bg-transparent text-[#9EA3AA] hover:text-[#F8F5EE] hover:bg-[#182337]/60'
          : 'bg-transparent text-[#7D766D] hover:text-[#20242A] hover:bg-[#E5DED2]';
      case 'danger':
        return isDark
          ? 'bg-[#C75B63]/20 text-[#FCA5A5] border border-[#C75B63]/40 hover:bg-[#C75B63]/30'
          : 'bg-red-50 text-[#B85B63] border border-red-200 hover:bg-red-100';
    }
  };

  return (
    <motion.button
      className={`${baseClasses} ${sizeClasses[size]} ${getVariantClasses()} ${className}`}
      disabled={disabled || isLoading}
      whileHover={
        disabled || isLoading
          ? undefined
          : { scale: 1.01, transition: { duration: MOTION_TIMING.microFast, ease: MOTION_EASING.easeOut } }
      }
      whileTap={
        disabled || isLoading
          ? undefined
          : { scale: 0.985, transition: { duration: MOTION_TIMING.microFast, ease: MOTION_EASING.easeOut } }
      }
      style={{ fontFamily: metadata.uiFontFamily, ...style }}
      {...props}
    >
      {isLoading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          {Icon && iconPosition === 'left' && <Icon className="w-4 h-4 flex-shrink-0" />}
          <span>{children}</span>
          {Icon && iconPosition === 'right' && <Icon className="w-4 h-4 flex-shrink-0" />}
        </>
      )}
    </motion.button>
  );
};
