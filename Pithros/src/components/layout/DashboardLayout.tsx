import React from 'react';
import { PithrosLogo } from '../visual/PithrosLogo';
import {
  LayoutDashboard,
  Heart,
  Users,
  Image,
  Calendar,
  ShieldCheck,
  Lock,
  Archive,
  CreditCard,
  Bell,
  Settings,
  ExternalLink,
  PlusCircle,
  Menu,
  X,
  Flame,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { ThemeToggle } from '../common/ThemeToggle';
import { LanguageSelector } from '../common/LanguageSelector';
import { Memorial } from '../../types';
import { PageTransition } from '../../lib/motion';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../context/LocaleContext';

interface DashboardLayoutProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  activeMemorial: Memorial;
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  currentRoute,
  onNavigate,
  activeMemorial,
  children,
}) => {
  const { isDark } = useTheme();
  const { pithrosUser } = useAuth();
  const { metadata } = useLocale();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const menuItems = [
    { label: 'Overview', route: '/dashboard', icon: LayoutDashboard },
    { label: 'My Memorials', route: '/dashboard/memorials', icon: Heart },
    { label: 'Memorial Editor', route: '/dashboard/editor', icon: Settings },
    { label: 'Family Contributors', route: '/dashboard/contributors', icon: Users },
    { label: 'Media & Voice', route: '/dashboard/media', icon: Image },
    { label: 'Timeline Milestones', route: '/dashboard/timeline', icon: Calendar },
    { label: 'Tributes & Offerings', route: '/dashboard/tributes', icon: Flame },
    { label: 'Verification Center', route: '/dashboard/verification', icon: ShieldCheck },
    { label: 'Privacy & Security', route: '/dashboard/privacy', icon: Lock },
    { label: 'Digital Legacy & Succession', route: '/dashboard/legacy', icon: ShieldCheck },
    { label: 'Digital Archive', route: '/dashboard/archive', icon: Archive },
    { label: 'Plan & Billing', route: '/dashboard/billing', icon: CreditCard },
    { label: 'Remembrance Alerts', route: '/dashboard/notifications', icon: Bell },
    { label: 'Sanctuary Settings', route: '/dashboard/settings', icon: Settings },
  ];

  return (
    <div
      className={`min-h-screen flex flex-col md:flex-row transition-colors ${
        isDark ? 'bg-[#111820] text-[#F8F5EE]' : 'bg-[#F3EEE4] text-[#20242A]'
      }`}
    >
      {/* Mobile Top Header */}
      <div
        className={`md:hidden flex items-center justify-between px-4 py-3 border-b ${
          isDark
            ? 'border-[#202C40] bg-[#182337]'
            : 'border-[#E5DED2] bg-[#FCFAF5]'
        }`}
      >
        <div onClick={() => onNavigate('/')} className="cursor-pointer">
          <PithrosLogo variant="small" />
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle variant="compact" />
          <button
            onClick={() => onNavigate(`/m/${activeMemorial.slug}`)}
            className={`p-1.5 rounded-lg ${
              isDark
                ? 'text-[#9EA3AA] hover:text-[#F8F5EE]'
                : 'text-[#7D766D] hover:text-[#20242A]'
            }`}
            title="View public memorial"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`p-1.5 rounded-lg ${
              isDark
                ? 'text-[#F8F5EE] hover:bg-[#182337]'
                : 'text-[#20242A] hover:bg-[#E5DED2]'
            }`}
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Sidebar Desktop & Mobile Drawer */}
      <aside
        className={`fixed md:sticky top-0 z-40 h-screen w-64 flex-shrink-0 flex flex-col justify-between border-r transition-all duration-300 md:translate-x-0 ${
          isDark
            ? 'border-[#202C40] bg-[#182337]'
            : 'border-[#E5DED2] bg-[#FCFAF5]'
        } ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="p-5 flex-1 overflow-y-auto">
          {/* Logo & Current Memorial */}
          <div className={`pb-5 border-b ${isDark ? 'border-[#202C40]' : 'border-[#E5DED2]'}`}>
            <div onClick={() => onNavigate('/')} className="cursor-pointer mb-4">
              <PithrosLogo />
            </div>

            {/* Currently Selected Memorial Chip */}
            <div
              className={`p-2.5 rounded-xl border ${
                isDark
                  ? 'bg-[#182337] border-[#202C40]'
                  : 'bg-[#E5DED2] border-[#E5DED2]'
              }`}
            >
              <span
                className={`text-[10px] uppercase tracking-wider block ${
                  isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                }`}
              >
                Current Memorial
              </span>
              <div
                className={`text-xs font-serif font-medium truncate mt-0.5 ${
                  isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                }`}
              >
                {activeMemorial.fullName}
              </div>
              {/* Completeness bar */}
              <div className="mt-2">
                <div
                  className={`flex justify-between text-[10px] mb-1 ${
                    isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                  }`}
                >
                  <span>Completeness</span>
                  <span className={isDark ? 'text-[#B99452]' : 'text-[#23324A]'}>
                    {activeMemorial.completenessPercent}%
                  </span>
                </div>
                <div
                  className={`w-full h-1 rounded-full overflow-hidden ${
                    isDark ? 'bg-[#202C40]' : 'bg-[#E5DED2]'
                  }`}
                >
                  <div
                    className={`h-full ${isDark ? 'bg-[#B99452]' : 'bg-[#23324A]'}`}
                    style={{ width: `${activeMemorial.completenessPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="mt-4 space-y-1">
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
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-sans transition-all cursor-pointer ${
                    isActive
                      ? isDark
                        ? 'bg-[#B99452]/15 text-[#B99452] font-medium border border-[#B99452]/30 shadow-sm'
                        : 'bg-[#E5DED2] text-[#8C5C0F] font-medium border border-[#D9941E]/40 shadow-sm'
                      : isDark
                      ? 'text-[#9EA3AA] hover:text-[#F8F5EE] hover:bg-[#182337]/60'
                      : 'text-[#554F48] hover:text-[#20242A] hover:bg-[#E5DED2]'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom user card & public view */}
        <div
          className={`p-4 border-t space-y-2 ${
            isDark
              ? 'border-[#202C40] bg-[#111820]/60'
              : 'border-[#E5DED2] bg-[#F3EEE4]'
          }`}
        >
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-between"
            onClick={() => onNavigate(`/m/${activeMemorial.slug}`)}
            icon={ExternalLink}
            iconPosition="right"
          >
            View Public Memorial
          </Button>

          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => onNavigate('/account/profile')}
              className="flex items-center gap-2.5 text-xs text-left cursor-pointer group"
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] overflow-hidden ${
                  isDark
                    ? 'bg-[#B99452]/20 text-[#B99452]'
                    : 'bg-[#23324A]/20 text-[#23324A]'
                }`}
              >
                {pithrosUser?.avatar ? (
                  <img src={pithrosUser.avatar} alt={pithrosUser.name} className="w-full h-full object-cover" />
                ) : (
                  pithrosUser?.name ? pithrosUser.name.charAt(0) : 'S'
                )}
              </div>
              <div className="truncate">
                <p
                  className={`font-medium text-[11px] truncate leading-none group-hover:underline ${
                    isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                  }`}
                >
                  {pithrosUser?.name || 'Anita Krishnan'}
                </p>
                <p
                  className={`text-[10px] truncate ${
                    isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                  }`}
                >
                  {pithrosUser?.role === 'admin' ? 'Administrator' : 'Family Steward'}
                </p>
              </div>
            </button>
            <ThemeToggle variant="compact" />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Desktop Topbar */}
        <div
          className={`hidden md:flex items-center justify-between px-8 py-4 border-b backdrop-blur-md transition-colors ${
            isDark
              ? 'border-[#202C40] bg-[#111820]/80'
              : 'border-[#E5DED2] bg-[#FCFAF5]/90'
          }`}
        >
          <div className="flex items-center gap-4">
            <h2
              className={`text-base font-serif ${
                isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
              }`}
            >
              Family Remembrance Workspace
            </h2>
            <span className={isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}>•</span>
            <span
              className={`text-xs ${
                isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
              }`}
            >
              Memorial for {activeMemorial.fullName}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <LanguageSelector />
            <ThemeToggle />
            <button
              onClick={() => onNavigate('/dashboard/notifications')}
              className={`relative p-2 rounded-xl transition-colors ${
                isDark
                  ? 'text-[#9EA3AA] hover:text-[#F8F5EE] hover:bg-[#182337]'
                  : 'text-[#7D766D] hover:text-[#20242A] hover:bg-[#E5DED2]'
              }`}
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span
                className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
                style={{ backgroundColor: isDark ? '#B99452' : '#23324A' }}
              />
            </button>
            <Button
              variant="primary"
              size="sm"
              icon={PlusCircle}
              onClick={() => onNavigate('/create-memorial')}
            >
              New Memorial
            </Button>
          </div>
        </div>

        {/* Dynamic Child Page */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto">
          <PageTransition routeKey={currentRoute}>
            {children}
          </PageTransition>
        </div>
      </main>
    </div>
  );
};
