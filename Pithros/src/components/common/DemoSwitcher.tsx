import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserRole } from '../../types';
import { UserCheck, Shield, Building2, Eye, ChevronUp, ChevronDown, Sparkles } from 'lucide-react';
import { MOTION_TIMING, MOTION_EASING } from '../../lib/motion';

interface DemoSwitcherProps {
  currentRole: UserRole;
  currentRoute: string;
  onSelectRole: (role: UserRole) => void;
  onNavigate: (route: string) => void;
}

export const DemoSwitcher: React.FC<DemoSwitcherProps> = ({
  currentRole,
  currentRoute,
  onSelectRole,
  onNavigate,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // 1. Never show DemoSwitcher on authentication, checkout, or receipt pages
  const isExcludedRoute =
    currentRoute === '/signin' ||
    currentRoute === '/signup' ||
    currentRoute === '/forgot-password' ||
    currentRoute === '/reset-password' ||
    currentRoute === '/verify-email' ||
    currentRoute.startsWith('/auth/phone') ||
    currentRoute === '/admin/signin' ||
    currentRoute.startsWith('/account/') ||
    currentRoute.startsWith('/checkout') ||
    currentRoute.startsWith('/payment/receipt');

  // 2. Compile-time / environment check for Demo Mode (disabled in production unless explicitly enabled)
  const isDemoModeEnabled =
    !import.meta.env.PROD &&
    import.meta.env.VITE_DEMO_MODE !== 'false' &&
    (typeof window === 'undefined' || (window as any).__PITHROS_DEMO_MODE !== false);

  if (isExcludedRoute || !isDemoModeEnabled) {
    return null;
  }

  const personas = [
    {
      role: 'visitor' as UserRole,
      label: 'Public Visitor',
      desc: 'Browsing public memorials & farewell network',
      icon: Eye,
      defaultRoute: '/',
    },
    {
      role: 'family_steward' as UserRole,
      label: 'Family Steward',
      desc: 'Anita Krishnan (Managing Arun Krishnan’s memorial)',
      icon: UserCheck,
      defaultRoute: '/dashboard',
    },
    {
      role: 'partner' as UserRole,
      label: 'Farewell Partner',
      desc: 'Serene Transitions Concierge Portal',
      icon: Building2,
      defaultRoute: '/partner/dashboard',
    },
    {
      role: 'admin' as UserRole,
      label: 'Admin Trust Officer',
      desc: 'Document verification & moderation desk',
      icon: Shield,
      defaultRoute: '/admin',
    },
  ];

  const quickMemorials = [
    { name: 'Dr. Arun Krishnan', slug: 'arun-krishnan', tag: 'Western Ghats Botanist' },
    { name: 'Mary Thomas', slug: 'mary-thomas', tag: 'Literature Teacher & Choir' },
    { name: 'Mohammed Rahman', slug: 'mohammed-rahman', tag: 'Heritage Architect' },
    { name: 'Gurpreet Singh', slug: 'gurpreet-singh', tag: 'Community Seva Elder' },
    { name: 'Dr. Anita Shah', slug: 'anita-shah', tag: 'Paediatrician & Vocalist' },
    { name: 'Capt. David Joseph', slug: 'david-joseph', tag: 'Master Mariner' },
  ];

  const activePersona = personas.find((p) => p.role === currentRole) || personas[0];
  const Icon = activePersona.icon;

  return (
    <div className="fixed bottom-4 right-4 z-50 select-none">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: MOTION_TIMING.standard, ease: MOTION_EASING.easeOut }}
            className="mb-2 w-80 rounded-2xl border border-[#2D3D56] bg-[#182337]/95 backdrop-blur-xl p-4 shadow-2xl text-xs space-y-3.5"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#202C40]">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#B99452] animate-pulse" />
                <span className="font-semibold uppercase tracking-wider text-[10px] text-[#B99452]">
                  DEMO MODE • Persona Switcher
                </span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-[#9EA3AA] hover:text-[#F8F5EE] p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Role selector */}
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase tracking-wider text-[#9EA3AA]">
                Switch User Perspective
              </span>
              {personas.map((p) => {
                const PIcon = p.icon;
                const isSelected = p.role === currentRole;
                return (
                  <motion.button
                    key={p.role}
                    onClick={() => {
                      onSelectRole(p.role);
                      onNavigate(p.defaultRoute);
                      setIsOpen(false);
                    }}
                    whileHover={{ scale: 1.015, transition: { duration: MOTION_TIMING.micro, ease: MOTION_EASING.easeOut } }}
                    whileTap={{ scale: 0.98, transition: { duration: MOTION_TIMING.microFast, ease: MOTION_EASING.easeOut } }}
                    className={`w-full text-left p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer ${
                      isSelected
                        ? 'border-[#B99452] bg-[#B99452]/10 text-[#B99452]'
                        : 'border-[#202C40] bg-[#182337]/60 text-[#D9D2C6] hover:border-[#2D3D56]'
                    }`}
                  >
                    <PIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-xs leading-none">{p.label}</div>
                      <div className="text-[10px] text-[#9EA3AA] mt-0.5">{p.desc}</div>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Auth Testing Controls */}
            <div className="pt-2 border-t border-[#202C40] space-y-1.5">
              <span className="text-[10px] uppercase tracking-wider text-[#9EA3AA] block">
                Authentication Views
              </span>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    onNavigate('/signin');
                    setIsOpen(false);
                  }}
                  className="p-1.5 rounded-lg bg-[#182337] hover:bg-[#202C40] text-left text-[#D9D2C6]"
                >
                  Sign In View
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onNavigate('/signup');
                    setIsOpen(false);
                  }}
                  className="p-1.5 rounded-lg bg-[#182337] hover:bg-[#202C40] text-left text-[#D9D2C6]"
                >
                  Sign Up View
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onNavigate('/auth/phone');
                    setIsOpen(false);
                  }}
                  className="p-1.5 rounded-lg bg-[#182337] hover:bg-[#202C40] text-left text-[#D9D2C6]"
                >
                  Phone OTP
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onNavigate('/account/security');
                    setIsOpen(false);
                  }}
                  className="p-1.5 rounded-lg bg-[#182337] hover:bg-[#202C40] text-left text-[#D9D2C6]"
                >
                  Account Security
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onNavigate('/account/profile');
                    setIsOpen(false);
                  }}
                  className="p-1.5 rounded-lg bg-[#182337] hover:bg-[#202C40] text-left text-[#D9D2C6]"
                >
                  Account Profile
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onNavigate('/admin/signin');
                    setIsOpen(false);
                  }}
                  className="p-1.5 rounded-lg bg-[#182337] hover:bg-[#202C40] text-left text-[#D9D2C6]"
                >
                  Admin Sign In
                </button>
              </div>
            </div>

            {/* Quick Memorial Jump */}
            <div className="pt-2 border-t border-[#202C40]">
              <span className="text-[10px] uppercase tracking-wider text-[#9EA3AA] block mb-1.5">
                Jump to Demo Memorial
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {quickMemorials.map((m) => (
                  <motion.button
                    key={m.slug}
                    onClick={() => {
                      onNavigate(`/m/${m.slug}`);
                      setIsOpen(false);
                    }}
                    whileHover={{ scale: 1.02, transition: { duration: MOTION_TIMING.micro, ease: MOTION_EASING.easeOut } }}
                    whileTap={{ scale: 0.98, transition: { duration: MOTION_TIMING.microFast, ease: MOTION_EASING.easeOut } }}
                    className="p-1.5 rounded-lg bg-[#182337] hover:bg-[#202C40] border border-[#202C40] text-left cursor-pointer"
                  >
                    <div className="text-[11px] font-medium text-[#F8F5EE] truncate">{m.name}</div>
                    <div className="text-[9px] text-[#9EA3AA] truncate">{m.tag}</div>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Pill Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.03, transition: { duration: MOTION_TIMING.micro, ease: MOTION_EASING.easeOut } }}
        whileTap={{ scale: 0.97, transition: { duration: MOTION_TIMING.microFast, ease: MOTION_EASING.easeOut } }}
        className="flex items-center gap-2 px-3.5 py-2 rounded-full border border-[#B99452]/40 bg-[#182337]/95 text-[#F8F5EE] shadow-lg shadow-black/60 hover:border-[#B99452] hover:bg-[#182337] cursor-pointer"
        aria-label="Toggle Demo Controls"
      >
        <span className="w-2 h-2 rounded-full bg-[#B99452]" />
        <span className="text-xs font-semibold text-[#B99452]">DEMO MODE:</span>
        <span className="text-xs font-medium text-[#D9D2C6]">{activePersona.label}</span>
        {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-[#9EA3AA]" /> : <ChevronUp className="w-3.5 h-3.5 text-[#9EA3AA]" />}
      </motion.button>
    </div>
  );
};
