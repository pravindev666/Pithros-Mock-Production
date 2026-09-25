import React from 'react';
import { PithrosLogo } from '../visual/PithrosLogo';
import {
  ShieldAlert,
  FileCheck,
  Flag,
  Users,
  Building2,
  Activity,
  History,
  Scale,
  CreditCard,
  Heart,
  Server,
  ExternalLink,
  Menu,
  X,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { ThemeToggle } from '../common/ThemeToggle';
import { PageTransition } from '../../lib/motion';
import { useTheme } from '../../context/ThemeContext';

interface AdminLayoutProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  pendingVerificationCount?: number;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  currentRoute,
  onNavigate,
  pendingVerificationCount = 1,
  children,
}) => {
  const { isDark } = useTheme();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const menuItems = [
    { label: 'Operational Overview', route: '/admin', icon: Activity },
    {
      label: 'Verification Queue',
      route: '/admin/verification',
      icon: FileCheck,
      badge: pendingVerificationCount > 0 ? `${pendingVerificationCount}` : undefined,
    },
    { label: 'Memorial Registry', route: '/admin/memorials', icon: Heart },
    { label: 'Users & Stewards', route: '/admin/users', icon: Users },
    { label: 'Payments & Gateway', route: '/admin/payments', icon: CreditCard },
    { label: 'Refund Operations', route: '/admin/refunds', icon: History },
    { label: 'Payment Disputes', route: '/admin/payment-disputes', icon: Scale },
    { label: 'Moderation & Reports', route: '/admin/moderation', icon: Flag },
    { label: 'Content Review Desk', route: '/admin/content', icon: FileCheck },
    { label: 'Family Disputes', route: '/admin/disputes', icon: Scale },
    { label: 'Farewell Providers', route: '/admin/providers', icon: Building2 },
    { label: 'Endowment Plans', route: '/admin/plans', icon: CreditCard },
    { label: 'Preservation Census', route: '/admin/analytics', icon: Activity },
    { label: 'Audit Trail & Logs', route: '/admin/audit', icon: History },
    { label: 'System Health', route: '/admin/system', icon: Server },
  ];

  return (
    <div
      className={`min-h-screen font-sans flex flex-col md:flex-row antialiased transition-colors ${
        isDark ? 'bg-[#0D0B09] text-[#F8F5EE]' : 'bg-[#F3EEE4] text-[#20242A]'
      }`}
    >
      {/* Mobile Top Header */}
      <div
        className={`md:hidden flex items-center justify-between px-4 py-2.5 border-b ${
          isDark
            ? 'border-[#202C40] bg-[#14100C]'
            : 'border-[#E5DED2] bg-[#FCFAF5]'
        }`}
      >
        <div onClick={() => onNavigate('/')} className="cursor-pointer">
          <PithrosLogo variant="small" />
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle variant="compact" />
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`p-1.5 rounded ${
              isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
            }`}
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Admin Sidebar */}
      <aside
        className={`fixed md:sticky top-0 z-40 h-screen w-64 flex-shrink-0 flex flex-col justify-between border-r transition-transform duration-300 md:translate-x-0 ${
          isDark
            ? 'border-[#202C40] bg-[#120F0C]'
            : 'border-[#E5DED2] bg-[#FCFAF5]'
        } ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="p-4 flex-1 overflow-y-auto">
          {/* Header */}
          <div
            className={`pb-4 border-b ${
              isDark ? 'border-[#202C40]' : 'border-[#E5DED2]'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div onClick={() => onNavigate('/')} className="cursor-pointer">
                <PithrosLogo variant="small" />
              </div>
              <ThemeToggle variant="compact" />
            </div>
            <div
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border ${
                isDark
                  ? 'bg-[#182337] border-[#2E2720]'
                  : 'bg-[#E5DED2] border-[#E5DED2]'
              }`}
            >
              <span
                className={`text-[10px] font-semibold tracking-wider uppercase ${
                  isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                }`}
              >
                Trust & Operations
              </span>
              <span
                className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                  isDark
                    ? 'bg-[#2D7A5F]/20 text-[#6EE7B7] border-[#2D7A5F]/40'
                    : 'bg-[#EAF5EF] text-[#245C45] border-[#96CBB4]'
                }`}
              >
                ACTIVE
              </span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="mt-3 space-y-0.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentRoute === item.route;
              return (
                <button
                  key={item.route}
                  onClick={() => {
                    onNavigate(item.route);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-sans transition-colors cursor-pointer ${
                    isActive
                      ? isDark
                        ? 'bg-[#202C40] text-[#F8F5EE] font-semibold border border-[#2D3D56]'
                        : 'bg-[#E5DED2] text-[#8C5C0F] font-semibold border border-[#D9941E]/40'
                      : isDark
                      ? 'text-[#9EA3AA] hover:text-[#F8F5EE] hover:bg-[#1A1410]'
                      : 'text-[#554F48] hover:text-[#20242A] hover:bg-[#E5DED2]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={`w-3.5 h-3.5 ${
                        isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                        isDark
                          ? 'bg-[#B99452] text-[#111820]'
                          : 'bg-[#23324A] text-white'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer info */}
        <div
          className={`p-3 border-t text-[11px] space-y-2 ${
            isDark
              ? 'border-[#202C40] bg-[#111820]/50 text-[#9EA3AA]'
              : 'border-[#E5DED2] bg-[#F3EEE4] text-[#554F48]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px]">Officer: Deepa Rao</span>
            <span
              className={`text-[9px] ${
                isDark ? 'text-[#737982]' : 'text-[#7D766D]'
              }`}
            >
              Role: Sr. Reviewer
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-[11px] h-7 justify-start"
            onClick={() => onNavigate('/')}
            icon={ExternalLink}
          >
            Exit to Public Site
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-7 max-w-7xl w-full mx-auto overflow-y-auto">
        {/* Demo banner indicator */}
        <div
          className={`mb-4 px-3 py-1.5 rounded-lg border flex items-center justify-between text-[11px] ${
            isDark
              ? 'bg-[#202C40]/80 border-[#2D3D56] text-[#9EA3AA]'
              : 'bg-[#E5DED2] border-[#E5DED2] text-[#554F48]'
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertCircle
              className={`w-3.5 h-3.5 ${
                isDark ? 'text-[#B99452]' : 'text-[#23324A]'
              }`}
            />
            <span>Pithros Internal Administration Console • Simulated Trust & Safety Sandbox</span>
          </div>
          <span
            className={`font-mono text-[10px] ${
              isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
            }`}
          >
            Demo Environment
          </span>
        </div>
        <PageTransition routeKey={currentRoute}>
          {children}
        </PageTransition>
      </main>
    </div>
  );
};

