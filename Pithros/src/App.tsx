import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { api } from './services/api';
import { Memorial, UserRole } from './types';

// Shell Architecture
import { PublicShell } from './components/layout/PublicShell';
import { AuthShell } from './components/layout/AuthShell';
import { FamilyShell } from './components/layout/FamilyShell';
import { PartnerShell } from './components/layout/PartnerShell';
import { AdminShell } from './components/layout/AdminShell';

// Common Components
import { DemoSwitcher } from './components/common/DemoSwitcher';
import { SessionExpiredModal } from './components/common/SessionExpiredModal';
import { SEOHead } from './components/common/SEOHead';
import { Button } from './components/ui/Button';
import { PageTransition } from './lib/motion';
import { useTheme } from './context/ThemeContext';
import { useAuth } from './context/AuthContext';

// Public & Feature Views
import { LandingView } from './views/LandingView';
import { PublicMemorialView } from './views/PublicMemorialView';
import { ExploreMemorialsView } from './views/ExploreMemorialsView';
import { CreateMemorialView } from './views/CreateMemorialView';
import { FarewellNetworkView } from './views/FarewellNetworkView';
import { HowItWorksView } from './views/HowItWorksView';
import { PricingView } from './views/PricingView';

// Family Dashboard Views
import { DashboardOverviewView } from './views/dashboard/DashboardOverviewView';
import { DashboardMemorialsView } from './views/dashboard/DashboardMemorialsView';
import { DashboardEditorView } from './views/dashboard/DashboardEditorView';
import { DashboardMediaVoiceView } from './views/dashboard/DashboardMediaVoiceView';
import { DashboardContributorsView } from './views/dashboard/DashboardContributorsView';
import { DashboardTimelineView } from './views/dashboard/DashboardTimelineView';
import { DashboardTributesView } from './views/dashboard/DashboardTributesView';
import { DashboardVerificationView } from './views/dashboard/DashboardVerificationView';
import { DashboardPrivacyView } from './views/dashboard/DashboardPrivacyView';
import { DashboardLegacyView } from './views/dashboard/DashboardLegacyView';
import { DashboardArchiveView } from './views/dashboard/DashboardArchiveView';
import { DashboardBillingView } from './views/dashboard/DashboardBillingView';
import { DashboardNotificationsView } from './views/dashboard/DashboardNotificationsView';
import { DashboardSettingsView } from './views/dashboard/DashboardSettingsView';

// Partner Platform Views
import { PartnerDashboardView } from './views/partner/PartnerDashboardView';
import { PartnerLeadsView } from './views/partner/PartnerLeadsView';
import { PartnerServicesView } from './views/partner/PartnerServicesView';
import { PartnerProfileView } from './views/partner/PartnerProfileView';
import { PartnerVerificationView } from './views/partner/PartnerVerificationView';
import { PartnerReviewsView } from './views/partner/PartnerReviewsView';
import { PartnerBillingView } from './views/partner/PartnerBillingView';
import { PartnerSettingsView } from './views/partner/PartnerSettingsView';

// Admin Console Views
import { AdminOverviewView } from './views/admin/AdminOverviewView';
import { AdminVerificationQueueView } from './views/admin/AdminVerificationQueueView';
import { AdminModerationView } from './views/admin/AdminModerationView';
import { AdminDisputesView } from './views/admin/AdminDisputesView';
import { AdminAuditView } from './views/admin/AdminAuditView';
import { AdminMemorialsView } from './views/admin/AdminMemorialsView';
import { AdminUsersView } from './views/admin/AdminUsersView';
import { AdminProvidersView } from './views/admin/AdminProvidersView';
import { AdminLeadsView } from './views/admin/AdminLeadsView';
import { AdminSystemHealthView } from './views/admin/AdminSystemHealthView';
import { AdminPlansView } from './views/admin/AdminPlansView';
import { AdminContentView } from './views/admin/AdminContentView';
import { AdminAnalyticsView } from './views/admin/AdminAnalyticsView';
import { AdminSettingsView } from './views/admin/AdminSettingsView';

// Auth & Account Views
import { SignInView } from './views/auth/SignInView';
import { SignUpView } from './views/auth/SignUpView';
import { ForgotPasswordView } from './views/auth/ForgotPasswordView';
import { ResetPasswordView } from './views/auth/ResetPasswordView';
import { VerifyEmailView } from './views/auth/VerifyEmailView';
import { PhoneAuthView } from './views/auth/PhoneAuthView';
import { AdminSignInView } from './views/auth/AdminSignInView';
import { ForbiddenView } from './views/auth/ForbiddenView';
import { AcceptInvitationView } from './views/auth/AcceptInvitationView';
import { AccountSecurityView } from './views/account/AccountSecurityView';
import { AccountProfileView } from './views/account/AccountProfileView';

// Payments & Checkout Views
import { CheckoutView } from './views/checkout/CheckoutView';
import { PaymentReceiptView } from './views/payment/PaymentReceiptView';
import { AdminPaymentsView } from './views/admin/AdminPaymentsView';
import { AdminRefundsView } from './views/admin/AdminRefundsView';
import { AdminPaymentDisputesView } from './views/admin/AdminPaymentDisputesView';
import { DashboardBillingInvoicesView } from './views/dashboard/DashboardBillingInvoicesView';
import { DashboardPaymentDetailView } from './views/dashboard/DashboardPaymentDetailView';

/** Routes the public shell knows how to render (everything else is a 404). */
const KNOWN_PUBLIC_ROUTES = new Set([
  '/',
  '/memorials',
  '/search',
  '/create-memorial',
  '/how-it-works',
  '/pricing',
  '/forbidden',
]);

const KNOWN_PUBLIC_PREFIXES = ['/farewell', '/invite', '/checkout', '/payment/receipt'];

function isKnownPublicRoute(route: string): boolean {
  if (KNOWN_PUBLIC_ROUTES.has(route)) return true;
  return KNOWN_PUBLIC_PREFIXES.some(
    (prefix) =>
      route === prefix || route.startsWith(`${prefix}/`) || route.startsWith(`${prefix}?`),
  );
}

export default function App() {
  const { isDark } = useTheme();
  const {
    currentUser,
    authState,
    role: authRole,
    pithrosUser,
    isLoading: authLoading,
    switchRole,
    setReturnUrl,
  } = useAuth();

  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    return window.location.pathname || '/';
  });
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>(() => authRole || 'visitor');
  const [memorials, setMemorials] = useState<Memorial[]>([]);
  // The selected memorial, remembered as a convenience only. The server
  // re-authorizes every request, so this grants nothing on its own.
  const [activeMemorialSlug, setActiveMemorialSlug] = useState<string>(() => {
    try {
      return localStorage.getItem('pithros_active_memorial') || '';
    } catch {
      return '';
    }
  });
  const [loading, setLoading] = useState<boolean>(true);

  // Sync role whenever auth role changes
  useEffect(() => {
    if (authRole) {
      setCurrentUserRole(authRole);
    }
  }, [authRole]);

  // Load the signed-in user's memorials. Anonymous visitors have none that are
  // theirs to manage, so this is skipped rather than allowed to 401.
  useEffect(() => {
    if (authState === 'authenticated') {
      loadMemorials();
    } else if (authState === 'signed_out') {
      setMemorials([]);
      setActiveMemorialSlug('');
      setLoading(false);
    }
  }, [authState]);

  const loadMemorials = async () => {
    setLoading(true);
    try {
      const list = await api.getMemorials();
      setMemorials(list);
    } catch {
      // A failure here must not fabricate a memorial; the UI shows an empty state.
      setMemorials([]);
    } finally {
      setLoading(false);
    }
  };

  // Sync route with browser history
  useEffect(() => {
    const handlePopState = () => {
      setCurrentRoute(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (route: string) => {
    setCurrentRoute(route);
    window.history.pushState({}, '', route);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectRole = (role: UserRole) => {
    setCurrentUserRole(role);
    switchRole(role);
  };

  const handleOpenMemorial = (slug: string) => {
    setActiveMemorialSlug(slug);
    navigate(`/m/${slug}`);
  };

  // Find the selected memorial. The previous version fell back to a hardcoded
  // `arun-krishnan` record whenever nothing matched — which meant the dashboard
  // could render a memorial the user had no relationship with. There is no
  // fallback now: no memorial means an empty state.
  const activeMemorial: Memorial | null =
    memorials.find((m) => m.slug === activeMemorialSlug || m.id === activeMemorialSlug) ||
    memorials[0] ||
    null;

  // Remember the selection for the next visit (UI convenience only, scoped to user).
  useEffect(() => {
    if (!activeMemorial || !currentUser) return;
    try {
      localStorage.setItem(`pithros_active_memorial_${currentUser.uid}`, activeMemorial.slug);
    } catch {
      // ignore
    }
  }, [activeMemorial, currentUser]);

  // A public memorial page must work for signed-out visitors, who have no
  // memorials of their own — so it is fetched by slug rather than looked up in
  // the user's list.
  const [publicMemorial, setPublicMemorial] = useState<Memorial | null>(null);
  const [publicMemorialLoading, setPublicMemorialLoading] = useState(false);

  useEffect(() => {
    if (!currentRoute.startsWith('/m/')) {
      setPublicMemorial(null);
      return;
    }

    const slug = currentRoute.replace('/m/', '').split('/')[0];
    if (!slug) return;

    const known = memorials.find((m) => m.slug === slug);
    if (known) {
      setPublicMemorial(known);
      return;
    }

    let cancelled = false;
    setPublicMemorialLoading(true);
    api
      .getMemorialBySlug(slug)
      .then((found) => {
        if (!cancelled) setPublicMemorial(found);
      })
      .catch(() => {
        if (!cancelled) setPublicMemorial(null);
      })
      .finally(() => {
        if (!cancelled) setPublicMemorialLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentRoute, memorials]);

  // Route classifications
  const isAuthRoute =
    currentRoute === '/signin' ||
    currentRoute === '/signup' ||
    currentRoute === '/forgot-password' ||
    currentRoute === '/reset-password' ||
    currentRoute === '/verify-email' ||
    currentRoute.startsWith('/auth/phone') ||
    currentRoute === '/admin/signin' ||
    currentRoute.startsWith('/account/');

  const isDashboardRoute = currentRoute.startsWith('/dashboard');
  const isPartnerRoute = currentRoute.startsWith('/partner');
  const isAdminRoute = currentRoute.startsWith('/admin') && currentRoute !== '/admin/signin';
  const isMemorialDetail = currentRoute.startsWith('/m/');

  // Main View Dispatcher with Strict Shell Enforcement
  const renderShellContent = () => {
    // ─────────────────────────────────────────────────────────────
    // 1. AUTHENTICATION SHELL (No PublicNavbar, No PublicFooter)
    // ─────────────────────────────────────────────────────────────
    if (isAuthRoute) {
      const isOperationalAdmin = currentRoute === '/admin/signin';

      return (
        <AuthShell
          currentRoute={currentRoute}
          onNavigate={navigate}
          isOperationalAdmin={isOperationalAdmin}
        >
          <AnimatePresence mode="wait" initial={false}>
            <PageTransition key={currentRoute} routeKey={currentRoute}>
              {currentRoute === '/signin' && (
                <SignInView onNavigate={navigate} onSelectRole={handleSelectRole} />
              )}
              {currentRoute === '/signup' && (
                <SignUpView onNavigate={navigate} />
              )}
              {currentRoute === '/forgot-password' && (
                <ForgotPasswordView onNavigate={navigate} />
              )}
              {currentRoute === '/reset-password' && (
                <ResetPasswordView onNavigate={navigate} />
              )}
              {currentRoute === '/verify-email' && (
                <VerifyEmailView onNavigate={navigate} />
              )}
              {(currentRoute === '/auth/phone' || currentRoute === '/auth/phone/verify') && (
                <PhoneAuthView onNavigate={navigate} />
              )}
              {currentRoute === '/admin/signin' && (
                <AdminSignInView onNavigate={navigate} />
              )}
              {currentRoute === '/account/security' && (
                <AccountSecurityView onNavigate={navigate} />
              )}
              {currentRoute === '/account/profile' && (
                <AccountProfileView onNavigate={navigate} />
              )}
            </PageTransition>
          </AnimatePresence>
        </AuthShell>
      );
    }

    // ─────────────────────────────────────────────────────────────
    // Protected Routes & Creation Workflow: Wait for Firebase Auth initialization
    // ─────────────────────────────────────────────────────────────
    if (authLoading && (isAdminRoute || isPartnerRoute || isDashboardRoute || currentRoute === '/create-memorial')) {
      return (
        <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#0E0C0A]' : 'bg-[#FDFBF7]'}`}>
          <div className="w-8 h-8 rounded-full border-2 border-[#D9941E] border-t-transparent animate-spin" />
        </div>
      );
    }

    // Only block if loading memorials for dashboard or specific memorial details
    if (loading && memorials.length === 0 && (isDashboardRoute || isMemorialDetail)) {
      return (
        <div
          className={`min-h-screen flex items-center justify-center text-sm ${
            isDark ? 'bg-[#111820] text-[#D9D2C6]' : 'bg-[#F3EEE4] text-[#554F48]'
          }`}
        >
          <span
            className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin mr-3"
            style={{ borderColor: isDark ? '#B99452' : '#23324A', borderTopColor: 'transparent' }}
          />
          Opening Pithros Memorial…
        </div>
      );
    }

    // ─────────────────────────────────────────────────────────────
    // 2. ADMIN SHELL (RBAC Protected)
    // ─────────────────────────────────────────────────────────────
    if (isAdminRoute) {
      if (authState === 'signed_out') {
        return (
          <AuthShell
            currentRoute="/admin/signin"
            onNavigate={navigate}
            isOperationalAdmin={true}
          >
            <AdminSignInView onNavigate={navigate} />
          </AuthShell>
        );
      }

      if (authRole !== 'admin') {
        return (
          <PublicShell currentRoute={currentRoute} onNavigate={navigate} currentUserRole={currentUserRole}>
            <ForbiddenView onNavigate={navigate} />
          </PublicShell>
        );
      }

      return (
        <AdminShell
          currentRoute={currentRoute}
          onNavigate={navigate}
          pendingVerificationCount={
            memorials.filter((m) => m.verificationStatus === 'under_review').length
          }
        >
          <AnimatePresence mode="wait" initial={false}>
            <PageTransition key={currentRoute} routeKey={currentRoute}>
              {currentRoute === '/admin' && <AdminOverviewView onNavigate={navigate} />}
              {currentRoute === '/admin/verification' && <AdminVerificationQueueView />}
              {currentRoute === '/admin/moderation' && <AdminModerationView />}
              {currentRoute === '/admin/disputes' && <AdminDisputesView />}
              {currentRoute === '/admin/audit' && <AdminAuditView />}
              {currentRoute === '/admin/memorials' && <AdminMemorialsView />}
              {(currentRoute === '/admin/users' || currentRoute === '/admin/admin-users') && (
                <AdminUsersView />
              )}
              {currentRoute === '/admin/providers' && <AdminProvidersView />}
              {currentRoute === '/admin/leads' && <AdminLeadsView />}
              {currentRoute === '/admin/payments' && <AdminPaymentsView onNavigate={navigate} />}
              {currentRoute === '/admin/refunds' && <AdminRefundsView />}
              {currentRoute === '/admin/payment-disputes' && <AdminPaymentDisputesView />}
              {currentRoute === '/admin/system' && <AdminSystemHealthView />}
              {currentRoute === '/admin/plans' && <AdminPlansView />}
              {currentRoute === '/admin/content' && <AdminContentView />}
              {currentRoute === '/admin/analytics' && <AdminAnalyticsView />}
              {currentRoute === '/admin/settings' && <AdminSettingsView />}
            </PageTransition>
          </AnimatePresence>
        </AdminShell>
      );
    }

    // ─────────────────────────────────────────────────────────────
    // 3. FAREWELL PARTNER SHELL (Protected)
    // ─────────────────────────────────────────────────────────────
    if (isPartnerRoute) {
      if (authState === 'signed_out') {
        return (
          <AuthShell currentRoute="/signin" onNavigate={navigate}>
            <SignInView onNavigate={navigate} onSelectRole={handleSelectRole} />
          </AuthShell>
        );
      }

      if (authRole !== 'partner' && authRole !== 'admin') {
        return (
          <PublicShell currentRoute={currentRoute} onNavigate={navigate} currentUserRole={currentUserRole}>
            <ForbiddenView onNavigate={navigate} />
          </PublicShell>
        );
      }

      return (
        <PartnerShell currentRoute={currentRoute} onNavigate={navigate}>
          <AnimatePresence mode="wait" initial={false}>
            <PageTransition key={currentRoute} routeKey={currentRoute}>
              {(currentRoute === '/partner' || currentRoute === '/partner/dashboard') && (
                <PartnerDashboardView />
              )}
              {currentRoute === '/partner/leads' && <PartnerLeadsView />}
              {currentRoute === '/partner/services' && <PartnerServicesView />}
              {currentRoute === '/partner/profile' && <PartnerProfileView />}
              {(currentRoute === '/partner/documents' || currentRoute === '/partner/verification') && (
                <PartnerVerificationView />
              )}
              {currentRoute === '/partner/reviews' && <PartnerReviewsView />}
              {currentRoute === '/partner/billing' && <PartnerBillingView />}
              {currentRoute === '/partner/settings' && <PartnerSettingsView />}
            </PageTransition>
          </AnimatePresence>
        </PartnerShell>
      );
    }

    // ─────────────────────────────────────────────────────────────
    // 4. FAMILY STEWARD SHELL (Protected)
    // ─────────────────────────────────────────────────────────────
    if (isDashboardRoute) {
      if (authState === 'signed_out') {
        return (
          <AuthShell currentRoute="/signin" onNavigate={navigate}>
            <SignInView onNavigate={navigate} onSelectRole={handleSelectRole} />
          </AuthShell>
        );
      }

      if (loading) {
        return (
          <div className={`min-h-screen flex items-center justify-center text-sm ${isDark ? 'bg-[#111820] text-[#D9D2C6]' : 'bg-[#F3EEE4] text-[#554F48]'}`}>
            <span
              className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin mr-3"
              style={{ borderColor: isDark ? '#B99452' : '#23324A', borderTopColor: 'transparent' }}
            />
            Opening Pithros Memorial…
          </div>
        );
      }

      if (!activeMemorial) {
        // A real empty state. Previously a hardcoded memorial was substituted here.
        return (
          <PublicShell currentRoute={currentRoute} onNavigate={navigate} currentUserRole={currentUserRole}>
            <div className={`min-h-[60vh] flex flex-col items-center justify-center gap-4 px-6 text-center ${isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'}`}>
              <p className="text-lg font-medium">You have not created a memorial yet.</p>
              <p className="text-sm opacity-80 max-w-md">
                When you create one, it will appear here and you will be its steward.
              </p>
              <Button variant="primary" onClick={() => navigate('/create-memorial')}>
                Create a memorial
              </Button>
            </div>
          </PublicShell>
        );
      }

      return (
        <FamilyShell
          currentRoute={currentRoute}
          onNavigate={navigate}
          activeMemorial={activeMemorial}
        >
          <AnimatePresence mode="wait" initial={false}>
            <PageTransition key={currentRoute} routeKey={currentRoute}>
              {currentRoute === '/dashboard' && (
                <DashboardOverviewView
                  memorial={activeMemorial}
                  onNavigate={navigate}
                  onOpenMemorial={handleOpenMemorial}
                />
              )}
              {currentRoute === '/dashboard/memorials' && (
                <DashboardMemorialsView
                  memorials={memorials}
                  activeMemorial={activeMemorial}
                  onSelectMemorial={(m) => {
                    setActiveMemorialSlug(m.slug);
                    navigate('/dashboard');
                  }}
                  onNavigate={navigate}
                />
              )}
              {currentRoute === '/dashboard/editor' && (
                <DashboardEditorView memorial={activeMemorial} onUpdate={loadMemorials} />
              )}
              {currentRoute === '/dashboard/media' && (
                <DashboardMediaVoiceView memorial={activeMemorial} onUpdate={loadMemorials} onNavigate={navigate} />
              )}
              {currentRoute === '/dashboard/contributors' && (
                <DashboardContributorsView memorial={activeMemorial} onUpdate={loadMemorials} onNavigate={navigate} />
              )}
              {currentRoute === '/dashboard/timeline' && (
                <DashboardTimelineView memorial={activeMemorial} onUpdate={loadMemorials} onNavigate={navigate} />
              )}
              {(currentRoute === '/dashboard/tributes' || currentRoute === '/dashboard/offerings') && (
                <DashboardTributesView memorial={activeMemorial} onUpdate={loadMemorials} />
              )}
              {currentRoute === '/dashboard/verification' && (
                <DashboardVerificationView memorial={activeMemorial} onUpdate={loadMemorials} />
              )}
              {currentRoute === '/dashboard/privacy' && (
                <DashboardPrivacyView memorial={activeMemorial} onUpdate={loadMemorials} />
              )}
              {currentRoute === '/dashboard/legacy' && (
                <DashboardLegacyView memorial={activeMemorial} onUpdate={loadMemorials} />
              )}
              {currentRoute === '/dashboard/archive' && (
                <DashboardArchiveView memorial={activeMemorial} onNavigate={navigate} />
              )}
              {currentRoute === '/dashboard/billing' && (
                <DashboardBillingView memorial={activeMemorial} onNavigate={navigate} />
              )}
              {currentRoute === '/dashboard/billing/invoices' && (
                <DashboardBillingInvoicesView memorial={activeMemorial} onNavigate={navigate} />
              )}
              {currentRoute.startsWith('/dashboard/billing/payment/') && (
                <DashboardPaymentDetailView
                  paymentId={currentRoute}
                  memorial={activeMemorial}
                  onNavigate={navigate}
                />
              )}
              {currentRoute === '/dashboard/notifications' && (
                <DashboardNotificationsView memorial={activeMemorial} />
              )}
              {currentRoute === '/dashboard/settings' && (
                <DashboardSettingsView
                  memorial={activeMemorial}
                  onUpdate={loadMemorials}
                  onNavigate={navigate}
                />
              )}
            </PageTransition>
          </AnimatePresence>
        </FamilyShell>
      );
    }

    // ─────────────────────────────────────────────────────────────
    // 5. PUBLIC MEMORIAL VIEW
    // ─────────────────────────────────────────────────────────────
    if (isMemorialDetail) {
      if (publicMemorialLoading) {
        return (
          <PublicShell currentRoute={currentRoute} onNavigate={navigate} currentUserRole={currentUserRole}>
            <div className={`min-h-[60vh] flex items-center justify-center text-sm ${isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'}`}>
              Opening Pithros Memorial…
            </div>
          </PublicShell>
        );
      }

      if (!publicMemorial) {
        // Either the memorial does not exist, or the caller is not permitted to
        // know that it does — the API returns 404 for both, deliberately.
        return (
          <PublicShell currentRoute={currentRoute} onNavigate={navigate} currentUserRole={currentUserRole}>
            <div className={`min-h-[60vh] flex flex-col items-center justify-center gap-4 px-6 text-center ${isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'}`}>
              <p className="text-lg font-medium">This memorial is not available.</p>
              <p className="text-sm opacity-80 max-w-md">
                It may have been moved, set to private, or the link may be incorrect.
              </p>
              <Button variant="secondary" onClick={() => navigate('/memorials')}>
                Explore memorials
              </Button>
            </div>
          </PublicShell>
        );
      }

      return (
        <PublicShell
          currentRoute={currentRoute}
          onNavigate={navigate}
          currentUserRole={currentUserRole}
        >
          <AnimatePresence mode="wait" initial={false}>
            <PageTransition key={currentRoute} routeKey={currentRoute}>
              <PublicMemorialView
                memorial={publicMemorial}
                onRefreshMemorial={loadMemorials}
                onNavigate={navigate}
              />
            </PageTransition>
          </AnimatePresence>
        </PublicShell>
      );
    }

    // ─────────────────────────────────────────────────────────────
    // 6. PUBLIC PORTAL SHELL (Public pages with PublicNavbar & PublicFooter)
    // ─────────────────────────────────────────────────────────────
    return (
      <PublicShell
        currentRoute={currentRoute}
        onNavigate={navigate}
        currentUserRole={currentUserRole}
      >
        <AnimatePresence mode="wait" initial={false}>
          <PageTransition key={currentRoute} routeKey={currentRoute}>
            {currentRoute === '/' && (
              <LandingView onNavigate={navigate} onOpenMemorial={handleOpenMemorial} />
            )}
            {(currentRoute === '/memorials' || currentRoute === '/search') && (
              <ExploreMemorialsView
                memorials={memorials}
                onOpenMemorial={handleOpenMemorial}
                onNavigate={navigate}
              />
            )}
            {currentRoute === '/create-memorial' && (
              <CreateMemorialView
                onSuccess={(newMem) => {
                  loadMemorials();
                  setActiveMemorialSlug(newMem.slug);
                  navigate(`/m/${newMem.slug}`);
                }}
                onCancel={() => navigate('/')}
                onNavigate={navigate}
              />
            )}
            {currentRoute.startsWith('/farewell') && (
              <FarewellNetworkView onNavigate={navigate} currentRoute={currentRoute} />
            )}
            {currentRoute === '/how-it-works' && <HowItWorksView onNavigate={navigate} />}
            {currentRoute === '/pricing' && <PricingView onNavigate={navigate} />}

            {/* Checkout & Formal Tax Receipt Routes */}
            {currentRoute.startsWith('/invite') && (
              <AcceptInvitationView
                currentRoute={currentRoute}
                onNavigate={navigate}
                memorials={memorials}
                onAccepted={loadMemorials}
              />
            )}
            {currentRoute.startsWith('/checkout') && (
              <CheckoutView
                currentRoute={currentRoute}
                onNavigate={navigate}
                memorials={memorials}
              />
            )}
            {currentRoute.startsWith('/payment/receipt') && (
              <PaymentReceiptView
                receiptId={currentRoute}
                onNavigate={navigate}
              />
            )}

            {/* Access Control & Fallbacks */}
            {currentRoute === '/forbidden' && <ForbiddenView onNavigate={navigate} />}

            {!isKnownPublicRoute(currentRoute) && (
              <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 py-20">
                <span
                  className={`text-[10px] font-mono uppercase tracking-[0.2em] ${
                    isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                  }`}
                >
                  404
                </span>
                <h1
                  className={`mt-3 text-2xl sm:text-3xl font-serif ${
                    isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                  }`}
                >
                  This page could not be found
                </h1>
                <p
                  className={`mt-3 text-sm max-w-md leading-relaxed ${
                    isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'
                  }`}
                >
                  The link may be outdated, or the memorial may have been made private or removed.
                </p>
                <div className="mt-6">
                  <Button variant="primary" onClick={() => navigate('/')}>
                    Return home
                  </Button>
                </div>
              </div>
            )}
          </PageTransition>
        </AnimatePresence>
      </PublicShell>
    );
  };

  // SEO: determine dynamic meta props based on the current route
  const seoProps = (() => {
    // Memorial detail pages get dynamic OG tags
    if (isMemorialDetail && publicMemorial) {
      const name = publicMemorial.fullName || publicMemorial.preferredName || 'Memorial';
      const bio = publicMemorial.story?.overview;
      return {
        route: currentRoute,
        title: `${name} — Memorial on Pithros`,
        description: bio
          ? bio.substring(0, 160)
          : `Remembering ${name}. View their memorial, share tributes, and celebrate their life on Pithros.`,
        ogImage: publicMemorial.portraitUrl || undefined,
        ogType: 'profile' as const,
        memorialName: name,
      };
    }
    // Auth/dashboard/admin routes should not be indexed
    if (isAuthRoute || isDashboardRoute || isPartnerRoute || isAdminRoute) {
      return { route: currentRoute, noindex: true };
    }
    return { route: currentRoute };
  })();

  return (
    <div
      className={`min-h-screen font-sans antialiased selection:bg-[#B99452]/20 selection:text-[#B99452] transition-colors ${
        isDark ? 'bg-[#111820] text-[#F8F5EE]' : 'bg-[#F3EEE4] text-[#20242A]'
      }`}
    >
      {/* Dynamic SEO head — injects per-route meta tags, OG cards, JSON-LD */}
      <SEOHead {...seoProps} />
      {renderShellContent()}

      {/* Session Expired Modal */}
      <SessionExpiredModal
        onReauthenticated={() => navigate(currentRoute)}
        onNavigateToSignIn={() => navigate('/signin')}
      />

      {/* Floating Global Persona & Demo Switcher (Suppressed on Auth screens and in Production) */}
      <DemoSwitcher
        currentRole={currentUserRole}
        currentRoute={currentRoute}
        onSelectRole={handleSelectRole}
        onNavigate={navigate}
      />
    </div>
  );
}
