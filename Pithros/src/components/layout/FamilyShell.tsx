import React from 'react';
import { DashboardLayout } from './DashboardLayout';
import { Memorial } from '../../types';

interface FamilyShellProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  activeMemorial: Memorial;
  children: React.ReactNode;
}

export const FamilyShell: React.FC<FamilyShellProps> = ({
  currentRoute,
  onNavigate,
  activeMemorial,
  children,
}) => {
  return (
    <DashboardLayout
      currentRoute={currentRoute}
      onNavigate={onNavigate}
      activeMemorial={activeMemorial}
    >
      {children}
    </DashboardLayout>
  );
};
