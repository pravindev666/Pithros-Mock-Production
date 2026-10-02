import React, { useState } from 'react';
import { PithrosLogo } from '../visual/PithrosLogo';
import { Button } from '../ui/Button';
import { ThemeToggle } from '../common/ThemeToggle';
import { LanguageSelector } from '../common/LanguageSelector';
import { PlusCircle, Search, Menu, X, User as UserIcon, LogOut, Shield, Settings, Building2, LogIn } from 'lucide-react';
import { UserRole } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../context/LocaleContext';

interface PublicNavbarProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  currentUserRole?: UserRole;
  unreadCount?: number;
}

export const PublicNavbar: React.FC<PublicNavbarProps> = ({
  currentRoute,
  onNavigate,
  currentUserRole,
}) => {
  const { isDark } = useTheme();
  const { authState, pithrosUser, signOut } = useAuth();
  const { t, metadata } = useLocale();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  // Lock background scroll when mobile drawer is open
  React.useEffect(() => {
    if (mobileMenuOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [mobileMenuOpen]);

  const isAuthenticated = authState === 'authenticated' && Boolean(pithrosUser);

  const navLinks = [
    { label: t('nav_memorials', 'Memorials'), route: '/memorials' },
    { label: t('nav_how_it_works', 'How It Works'), route: '/how-it-works' },
    { label: t('nav_farewell_network', 'Farewell Network'), route: '/farewell' },
    { label: t('nav_pricing', 'Pricing'), route: '/pricing' },
  ];

  return (
    <header
      data-ui-component="navigation"
      style={{ fontFamily: metadata.uiFontFamily }}
      className={`sticky top-0 z-40 w-full border-b backdrop-blur-md transition-colors ${
        isDark
          ? 'border-[#202C40]/80 bg-[#111820]/90 text-[#F8F5EE]'
          : 'border-[#E5DED2] bg-[#FCFAF5]/95 text-[#20242A]'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Logo */}
        <div
          onClick={() => onNavigate('/')}
          className="cursor-pointer transition-opacity hover:opacity-90 py-2"
        >
          <PithrosLogo />
        </div>

        {/* Desktop Nav Items */}
        <nav data-ui-component="navigation" className="hidden md:flex items-center gap-7">
          {navLinks.map((link) => {
            const isActive = currentRoute === link.route;
            return (
              <button
                key={link.route}
                onClick={() => onNavigate(link.route)}
                style={{ fontFamily: metadata.uiFontFamily }}
                className={`text-sm tracking-wide transition-colors cursor-pointer py-1 ${
                  isActive
                    ? isDark
                      ? 'text-[#B99452] font-semibold border-b-2 border-[#B99452]'
                      : 'text-[#23324A] font-semibold border-b-2 border-[#23324A]'
                    : isDark
                    ? 'text-[#D9D2C6] hover:text-[#F8F5EE]'
                    : 'text-[#554F48] hover:text-[#20242A]'
                }`}
              >
                {link.label}
              </button>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="hidden sm:flex items-center gap-3">
          {/* Dynamic Indic Language Selector */}
          <LanguageSelector />

          {/* Theme Toggle */}
          <ThemeToggle />

          <button
            onClick={() => onNavigate('/memorials')}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              isDark
                ? 'text-[#9EA3AA] hover:text-[#F8F5EE] hover:bg-[#182337]'
                : 'text-[#7D766D] hover:text-[#20242A] hover:bg-[#E5DED2]'
            }`}
            aria-label={t('nav_search', 'Search memorial registry')}
            title={t('nav_search', 'Search memorial registry')}
          >
            <Search className="w-4 h-4" />
          </button>

          {isAuthenticated ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                style={{ fontFamily: metadata.uiFontFamily }}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-full border text-xs transition-all cursor-pointer ${
                  isDark
                    ? 'border-[#202C40] bg-[#182337] text-[#F8F5EE] hover:border-[#B99452]/40'
                    : 'border-[#E5DED2] bg-white text-[#20242A] hover:border-[#23324A]/50'
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-500 font-bold flex items-center justify-center text-[10px]">
                  {pithrosUser?.name ? pithrosUser.name.charAt(0) : 'S'}
                </div>
                <span className="font-medium max-w-[100px] truncate">{pithrosUser?.name || t('nav_dashboard', 'Steward')}</span>
              </button>


              {profileDropdownOpen && (
                <div
                  className={`absolute right-0 mt-2 w-52 rounded-2xl border shadow-xl p-2 z-50 text-xs space-y-1 ${
                    isDark
                      ? 'border-[#202C40] bg-[#182337] text-[#F8F5EE]'
                      : 'border-[#E5DED2] bg-[#FCFAF5] text-[#20242A]'
                  }`}
                >
                  {pithrosUser?.role === 'admin' && (
                    <button
                      onClick={() => {
                        onNavigate('/admin');
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-amber-500/10 flex items-center gap-2 font-medium text-amber-500"
                    >
                      <Shield className="w-3.5 h-3.5 text-amber-500" />
                      <span>Admin Console</span>
                    </button>
                  )}
                  {pithrosUser?.role === 'partner' ? (
                    <button
                      onClick={() => {
                        onNavigate('/partner/dashboard');
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-emerald-500/10 flex items-center gap-2 font-medium text-emerald-400"
                    >
                      <Building2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Partner Platform</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        onNavigate('/dashboard');
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-amber-500/10 flex items-center gap-2"
                    >
                      <UserIcon className="w-3.5 h-3.5 text-amber-500" />
                      <span>Steward Workspace</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      onNavigate('/account/profile');
                      setProfileDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-amber-500/10 flex items-center gap-2"
                  >
                    <Settings className="w-3.5 h-3.5 text-amber-500" />
                    <span>Account Profile</span>
                  </button>
                  <button
                    onClick={() => {
                      onNavigate('/account/security');
                      setProfileDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-amber-500/10 flex items-center gap-2"
                  >
                    <Shield className="w-3.5 h-3.5 text-amber-500" />
                    <span>Security & Keys</span>
                  </button>
                  <div className="my-1 border-t border-inherit" />
                  <button
                    onClick={async () => {
                      setProfileDropdownOpen(false);
                      await signOut();
                      onNavigate('/signin');
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-red-500/10 text-red-400 flex items-center gap-2"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => onNavigate('/signin')}
              className={`text-xs font-sans px-3.5 py-2 transition-colors cursor-pointer rounded-xl font-medium ${
                isDark
                  ? 'text-[#D9D2C6] hover:text-[#F8F5EE] hover:bg-[#182337]'
                  : 'text-[#554F48] hover:text-[#20242A] hover:bg-[#E5DED2]'
              }`}
            >
              Sign In
            </button>
          )}

          <Button
            variant="primary"
            size="sm"
            onClick={() => onNavigate('/create-memorial')}
            icon={PlusCircle}
          >
            Create Memorial
          </Button>
        </div>

        {/* Mobile Controls */}
        <div className="flex sm:hidden items-center gap-2">
          <ThemeToggle variant="compact" />
          <button
            onClick={() => onNavigate('/memorials')}
            className={`p-2 rounded-lg ${isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}`}
            aria-label="Search memorials"
          >
            <Search className="w-5 h-5" />
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`p-2 rounded-lg ${
              isDark
                ? 'text-[#F8F5EE] hover:bg-[#182337]'
                : 'text-[#20242A] hover:bg-[#E5DED2]'
            }`}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          className={`sm:hidden border-b px-4 pt-3 pb-6 space-y-4 max-h-[calc(100dvh-4.5rem)] overflow-y-auto overscroll-contain transition-colors ${
            isDark
              ? 'border-[#202C40] bg-[#182337]'
              : 'border-[#E5DED2] bg-[#FCFAF5]'
          }`}
        >
          {/* Main Navigation Links */}
          <div className="space-y-1">
            {navLinks.map((link) => {
              const isActive = currentRoute === link.route;
              return (
                <button
                  key={link.route}
                  onClick={() => {
                    onNavigate(link.route);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center justify-between w-full text-left py-2.5 px-3 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                    isActive
                      ? isDark
                        ? 'bg-[#202C40] text-[#B99452] font-semibold'
                        : 'bg-[#E5DED2]/60 text-[#23324A] font-semibold'
                      : isDark
                      ? 'text-[#D9D2C6] hover:text-[#F8F5EE] hover:bg-[#202C40]/40'
                      : 'text-[#554F48] hover:text-[#20242A] hover:bg-[#E5DED2]/40'
                  }`}
                >
                  <span>{link.label}</span>
                </button>
              );
            })}
          </div>

          {/* Preferences Section: Language & Theme */}
          <div
            className={`pt-3 border-t space-y-2.5 ${
              isDark ? 'border-[#202C40]' : 'border-[#E5DED2]'
            }`}
          >
            <LanguageSelector variant="drawer" />
            <ThemeToggle variant="drawer" />
          </div>

          {/* User Account & Actions Zone */}
          <div
            className={`pt-3 border-t space-y-2.5 ${
              isDark ? 'border-[#202C40]' : 'border-[#E5DED2]'
            }`}
          >
            {isAuthenticated ? (
              <div className="space-y-2.5">
                {/* User Status Card */}
                <div
                  className={`p-3 rounded-2xl border flex items-center justify-between ${
                    isDark ? 'bg-[#111820] border-[#202C40]' : 'bg-white border-[#E5DED2]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-500 font-bold flex items-center justify-center text-xs">
                      {pithrosUser?.name ? pithrosUser.name.charAt(0) : 'S'}
                    </div>
                    <div>
                      <div className="text-xs font-semibold">{pithrosUser?.name || 'Steward'}</div>
                      <div className="text-[10px] opacity-70 capitalize font-mono">
                        {pithrosUser?.role === 'admin'
                          ? 'Super Admin'
                          : pithrosUser?.role === 'partner'
                          ? 'Care Partner'
                          : 'Family Steward'}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      setMobileMenuOpen(false);
                      await signOut();
                      onNavigate('/signin');
                    }}
                    className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 flex items-center gap-1 text-[11px] cursor-pointer"
                    title="Sign Out"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>

                {/* Role-Specific Workspaces */}
                {pithrosUser?.role === 'admin' && (
                  <Button
                    variant="outline"
                    size="md"
                    className="w-full text-amber-500 border-amber-500/40"
                    onClick={() => {
                      onNavigate('/admin');
                      setMobileMenuOpen(false);
                    }}
                    icon={Shield}
                  >
                    Admin Console
                  </Button>
                )}
                {pithrosUser?.role === 'partner' ? (
                  <Button
                    variant="outline"
                    size="md"
                    className="w-full text-emerald-400 border-emerald-500/40"
                    onClick={() => {
                      onNavigate('/partner/dashboard');
                      setMobileMenuOpen(false);
                    }}
                    icon={Building2}
                  >
                    Partner Platform
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="md"
                    className="w-full"
                    onClick={() => {
                      onNavigate('/dashboard');
                      setMobileMenuOpen(false);
                    }}
                    icon={UserIcon}
                  >
                    Steward Workspace
                  </Button>
                )}

                <Button
                  variant="primary"
                  size="md"
                  className="w-full"
                  onClick={() => {
                    onNavigate('/create-memorial');
                    setMobileMenuOpen(false);
                  }}
                  icon={PlusCircle}
                >
                  Create Memorial
                </Button>
              </div>
            ) : (
              <div className="space-y-2.5">
                <Button
                  variant="primary"
                  size="md"
                  className="w-full"
                  onClick={() => {
                    onNavigate('/create-memorial');
                    setMobileMenuOpen(false);
                  }}
                  icon={PlusCircle}
                >
                  Create Memorial
                </Button>

                {/* Highly Visible, Dedicated Sign In Button */}
                <Button
                  variant="outline"
                  size="md"
                  className="w-full"
                  onClick={() => {
                    onNavigate('/signin');
                    setMobileMenuOpen(false);
                  }}
                  icon={LogIn}
                >
                  Sign In to Account
                </Button>

                <div className="text-center pt-1">
                  <button
                    onClick={() => {
                      onNavigate('/signup');
                      setMobileMenuOpen(false);
                    }}
                    className={`text-xs underline transition-colors cursor-pointer ${
                      isDark
                        ? 'text-[#D9D2C6] hover:text-[#B99452]'
                        : 'text-[#554F48] hover:text-[#23324A]'
                    }`}
                  >
                    New family? Create account free
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
