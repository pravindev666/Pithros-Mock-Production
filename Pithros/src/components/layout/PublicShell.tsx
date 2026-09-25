import React from 'react';
import { PublicNavbar } from './PublicNavbar';
import { PublicFooter } from './PublicFooter';
import { UserRole } from '../../types';
import { useTheme } from '../../context/ThemeContext';

interface PublicShellProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  currentUserRole?: UserRole;
  children: React.ReactNode;
}

export const PublicShell: React.FC<PublicShellProps> = ({
  currentRoute,
  onNavigate,
  currentUserRole,
  children,
}) => {
  const { isDark } = useTheme();

  return (
    <div
      className={`min-h-screen flex flex-col justify-between transition-colors ${
        isDark ? 'bg-[#111820]' : 'bg-[#F3EEE4]'
      }`}
    >
      <PublicNavbar
        currentRoute={currentRoute}
        onNavigate={onNavigate}
        currentUserRole={currentUserRole}
      />
      <main className="flex-1">{children}</main>
      <PublicFooter onNavigate={onNavigate} />
    </div>
  );
};
