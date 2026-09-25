import React from 'react';
import { PithrosLogo } from '../visual/PithrosLogo';
import {
  Building2,
  Users,
  CalendarCheck,
  CheckCircle,
  FileCheck,
  CreditCard,
  Settings,
  Clock,
  PhoneCall,
  Menu,
  X,
  ExternalLink,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { ThemeToggle } from '../common/ThemeToggle';
import { PageTransition } from '../../lib/motion';
import { useTheme } from '../../context/ThemeContext';

interface PartnerLayoutProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  children: React.ReactNode;
}

export const PartnerLayout: React.FC<PartnerLayoutProps> = ({
  currentRoute,
  onNavigate,
  children,
}) => {
  const { isDark } = useTheme();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const menuItems = [
    { label: 'Overview', route: '/partner/dashboard', icon: Building2 },
    { label: 'Family Requests & Leads', route: '/partner/leads', icon: Users },
    { label: 'Services & Pricing', route: '/partner/services', icon: CalendarCheck },
    { label: 'Company Profile', route: '/partner/profile', icon: Settings },
    { label: 'Verified Badges & Docs', route: '/partner/verification', icon: FileCheck },
    { label: 'Bereavement Feedback', route: '/partner/reviews', icon: Users },
    { label: 'Payouts & Invoices', route: '/partner/billing', icon: CreditCard },
    { label: 'Dispatch Settings', route: '/partner/settings', icon: Settings },
  ];

  return (
    <div
      className={`min-h-screen flex flex-col md:flex-row transition-colors ${
        isDark ? 'bg-[#111820] text-[#F8F5EE]' : 'bg-[#F3EEE4] text-[#20242A]'
      }`}
    >
      {/* Mobile Header */}
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
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`p-1.5 rounded-lg ${
              isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
            }`}
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed md:sticky top-0 z-40 h-screen w-64 flex-shrink-0 flex flex-col justify-between border-r transition-transform duration-300 md:translate-x-0 ${
          isDark
            ? 'border-[#202C40] bg-[#182337]'
            : 'border-[#E5DED2] bg-[#FCFAF5]'
        } ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="p-5 flex-1 overflow-y-auto">
          <div
            className={`pb-5 border-b ${
              isDark ? 'border-[#202C40]' : 'border-[#E5DED2]'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div onClick={() => onNavigate('/')} className="cursor-pointer">
                <PithrosLogo />
              </div>
              <ThemeToggle variant="compact" />
            </div>
            <div
              className={`p-2.5 rounded-xl border ${
                isDark
                  ? 'bg-[#182337] border-[#202C40]'
                  : 'bg-[#E5DED2] border-[#E5DED2]'
              }`}
            >
              <span
                className={`text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1.5 ${
                  isDark ? 'text-[#6EE7B7]' : 'text-[#2D7A5F]'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isDark ? 'bg-[#6EE7B7]' : 'bg-[#2D7A5F]'
                  }`}
                />
                Farewell Partner
              </span>
              <div
                className={`text-xs font-serif font-medium truncate mt-1 ${
                  isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                }`}
              >
                Serene Transitions Concierge
              </div>
              <div
                className={`flex items-center gap-1.5 text-[10px] mt-1 ${
                  isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'
                }`}
              >
                <Clock
                  className={`w-3 h-3 ${
                    isDark ? 'text-[#B99452]' : 'text-[#23324A]'
                  }`}
                />
                <span>Avg response: &lt; 15 mins</span>
              </div>
            </div>
          </div>

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
                        ? 'bg-[#2D7A5F]/20 text-[#6EE7B7] font-medium border border-[#2D7A5F]/40'
                        : 'bg-[#EAF5EF] text-[#245C45] font-semibold border border-[#96CBB4]'
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

        <div
          className={`p-4 border-t ${
            isDark
              ? 'border-[#202C40] bg-[#111820]/60'
              : 'border-[#E5DED2] bg-[#F3EEE4]'
          }`}
        >
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={() => onNavigate('/farewell')}
            icon={ExternalLink}
          >
            Public Marketplace
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto">
        <PageTransition routeKey={currentRoute}>
          {children}
        </PageTransition>
      </main>
    </div>
  );
};

