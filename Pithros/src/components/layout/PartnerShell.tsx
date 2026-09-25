import React from 'react';
import { PartnerLayout } from './PartnerLayout';

interface PartnerShellProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  children: React.ReactNode;
}

export const PartnerShell: React.FC<PartnerShellProps> = ({
  currentRoute,
  onNavigate,
  children,
}) => {
  return (
    <PartnerLayout currentRoute={currentRoute} onNavigate={onNavigate}>
      {children}
    </PartnerLayout>
  );
};
