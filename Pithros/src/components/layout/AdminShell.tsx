import React from 'react';
import { AdminLayout } from './AdminLayout';

interface AdminShellProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  pendingVerificationCount?: number;
  children: React.ReactNode;
}

export const AdminShell: React.FC<AdminShellProps> = ({
  currentRoute,
  onNavigate,
  pendingVerificationCount,
  children,
}) => {
  return (
    <AdminLayout
      currentRoute={currentRoute}
      onNavigate={onNavigate}
      pendingVerificationCount={pendingVerificationCount}
    >
      {children}
    </AdminLayout>
  );
};
