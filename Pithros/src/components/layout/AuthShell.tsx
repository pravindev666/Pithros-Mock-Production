import React from 'react';
import { AuthLayout } from './AuthLayout';

interface AuthShellProps {
  currentRoute?: string;
  onNavigate?: (route: string) => void;
  isOperationalAdmin?: boolean;
  children: React.ReactNode;
}

export const AuthShell: React.FC<AuthShellProps> = ({
  onNavigate,
  isOperationalAdmin = false,
  children,
}) => {
  return (
    <AuthLayout onNavigate={onNavigate} isOperationalAdmin={isOperationalAdmin}>
      {children}
    </AuthLayout>
  );
};
