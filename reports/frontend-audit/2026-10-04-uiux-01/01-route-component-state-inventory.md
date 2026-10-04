# Pithros frontend route, component, persona, and state inventory

**Run ID:** `2026-10-04-uiux-01`  
**Source:** frontend tree shared by local `fb94661` and VM `aba3d47`  
**Method:** code and navigation inspection only; runtime outcomes remain unverified until the browser audit

## Routing architecture

`Pithros/src/App.tsx` implements routing manually with `history.pushState`, local `currentRoute`, prefix classification, and conditional view dispatch. There is no React Router or nested-route fallback.

Known static risks requiring runtime reproduction:

- Initial load and `popstate` use `window.location.pathname`, dropping search parameters.
- `navigate()` stores the complete supplied route, so query-bearing exact routes can classify differently before and after reload.
- Unknown `/dashboard/*`, `/partner/*`, `/admin/*`, and `/account/*` children enter a shell but render no child fallback.
- Protected branches block only explicit `signed_out`; other non-authenticated auth states need runtime verification.
- Account routes are classified under `AuthShell` without a central authentication guard.
- Dashboard dispatch does not enforce family role or contributor route restrictions; backend authorization remains authoritative.

## Shells and shared navigation

| Shell | Main file | Personas | Responsive navigation |
|---|---|---|---|
| Public | `components/layout/PublicShell.tsx` | all | `PublicNavbar` desktop/mobile menu + `PublicFooter` |
| Auth | `components/layout/AuthShell.tsx`, `AuthLayout.tsx` | all/auth flows | centered auth layout |
| Family | `components/layout/DashboardLayout.tsx` | steward/contributor; admin links available | fixed/sticky 256 px sidebar, mobile translated drawer |
| Partner | `components/layout/PartnerLayout.tsx` | partner/admin | fixed/sticky 256 px sidebar, mobile translated drawer |
| Admin | `components/layout/AdminLayout.tsx` | admin | fixed/sticky 256 px sidebar, mobile translated drawer |

All three private sidebars require runtime checks for focus, overlay, scroll lock, backdrop, hidden drawer focusability, and Escape behavior. The current code translates closed drawers off-screen but does not render a backdrop or explicitly remove hidden links from keyboard flow.

## Public routes

| Route | View | Data/state | Runtime states to test |
|---|---|---|---|
| `/` | `LandingView` | mixed static marketing + API/public records | loading, empty/error records, carousel/motion, long/localized copy, SEO |
| `/memorials`, `/search` | `ExploreMemorialsView` | real public-search API; must not fall back to private/demo data | loading, empty, API error, search, sort, city chips, long names, badge states |
| `/m/:slug` | `PublicMemorialView` | real public memorial API | loading, 404/private, every tab, media states, long title, verification status, modal flows |
| `/m/:slug/remember` | `PublicMemorialView` | nested remembrance modal inferred from path | direct link, reload, modal focus/close, failed tribute |
| `/create-memorial` | `CreateMemorialView` | real API + user-scoped local draft | anonymous gate, draft restore, validation, long values, upload, slow/error/double-submit |
| `/how-it-works` | `HowItWorksView` | static | responsive/a11y/SEO |
| `/pricing` | `PricingView` | static `mockData.pricingPlans`; server remains charge authority | pricing drift disclosure, comparison table overflow, mobile interaction |
| `/farewell` | `FarewellNetworkView` | real provider API plus explicitly demo reviews | loading/empty/error, city selector, long provider/service, quote form |
| `/farewell/providers/:slug` | `FarewellNetworkView` provider mode | real provider detail | missing provider, long content, enquiry success/failure |
| `/invite/:token` | `AcceptInvitationView` | real invitation API | anonymous return URL, invalid/expired/reused token, success, network/error |
| `/checkout*` | `CheckoutView` | server catalog/order/payment; some guarded demo paths | missing query after reload, conflict, failure/cancel/success, long labels, duplicate submit |
| `/payment/receipt*` | `PaymentReceiptView` | real billing receipt API | missing/forbidden/not-found/loading/error/print/mobile |
| `/forbidden` | `ForbiddenView` | static | semantic status, recovery path |
| unknown public | inline 404 in `App.tsx` | static | direct/reload/SEO |

## Authentication and account routes

| Route | View | Authority | States to test |
|---|---|---|---|
| `/signin` | `auth/SignInView` | Firebase + backend `/me` | empty/invalid/rate-limit/network/session return URL/keyboard |
| `/signup` | `auth/SignUpView` | Firebase + backend provisioning | validation, long names/email, duplicate/rate-limit, query `role=partner`, reload |
| `/verify-email` | `auth/VerifyEmailView` | Firebase | unverified/verified/rate-limit/network/reload |
| `/forgot-password` | `auth/ForgotPasswordView` | Firebase | valid/invalid/rate-limit/network |
| `/reset-password` | `auth/ResetPasswordView` | Firebase | invalid/expired code, mismatch, success |
| `/auth/phone`, `/auth/phone/verify` | `auth/PhoneAuthView` | Firebase phone auth | country code, OTP validation/resend/rate-limit |
| `/admin/signin` | `auth/AdminSignInView` | Firebase/backend role; demo MFA guarded out of live mode | wrong role, failure, keyboard, password visibility |
| `/account/profile` | `account/AccountProfileView` | real backend | signed-out direct route, load/save error, long identity fields |
| `/account/security` | `account/AccountSecurityView` | Firebase/backend account lifecycle | signed-out direct route, reauth, MFA honesty, deletion states, modal accessibility |

## Family workspace

All routes require an authenticated account plus an active memorial in the current dispatcher. No family-role check exists at dispatch level.

| Route | View | Main states |
|---|---|---|
| `/dashboard` | `DashboardOverviewView` | loading, no memorial, populated, feature limits |
| `/dashboard/memorials` | `DashboardMemorialsView` | empty/multiple memorials, long title, selection persistence |
| `/dashboard/editor` | `DashboardEditorView` | load/save, 409 conflict, validation, long copy |
| `/dashboard/media` | `DashboardMediaVoiceView` | empty/upload/progress/failure/limits/delete, image/audio/media controls |
| `/dashboard/contributors` | `DashboardContributorsView` | empty/invite/error/revoke/long email/role restrictions |
| `/dashboard/timeline` | `DashboardTimelineView` | empty/add/edit/delete/error/long description |
| `/dashboard/tributes`, `/dashboard/offerings` | `DashboardTributesView` | empty/pending/approved/rejected/moderation failure |
| `/dashboard/verification` | `DashboardVerificationView` | draft/pending/under-review/needs-info/approved/rejected/upload failure |
| `/dashboard/privacy` | `DashboardPrivacyView` | visibility changes, save/error, contributor direct URL |
| `/dashboard/legacy` | `DashboardLegacyView` | empty/save/error/delete, contributor direct URL |
| `/dashboard/archive` | `DashboardArchiveView` | generation states, download failure |
| `/dashboard/billing` | `DashboardBillingView` | free/active/expired/read-only/error, contributor direct URL |
| `/dashboard/billing/invoices` | `DashboardBillingInvoicesView` | loading/empty/error/long IDs |
| `/dashboard/billing/payment/:id` | `DashboardPaymentDetailView` | loading/not-found/forbidden/error |
| `/dashboard/notifications` | `DashboardNotificationsView` | loading/empty/error/read/unread |
| `/dashboard/settings` | `DashboardSettingsView` | save/error/destructive actions, contributor direct URL |

Contributor navigation hides verification/privacy/legacy/billing/settings, but direct dispatch is possible. Test API refusal separately; frontend hiding is not security.

## Partner workspace

Guard: signed out → sign-in; role must be partner or admin.

| Route | View | Data honesty and states |
|---|---|---|
| `/partner`, `/partner/dashboard` | `PartnerDashboardView` | real provider/lead API; loading/error/empty |
| `/partner/leads` | `PartnerLeadsView` | real lead API; loading/empty/error/status mutation/long contact data |
| `/partner/services` | `PartnerServicesView` | real service API; empty/error/toggle/delete/long service |
| `/partner/profile` | `PartnerProfileView` | real profile API; load/save/error/long business fields |
| `/partner/verification`, `/partner/documents` | `PartnerVerificationView` | real verification status/documents; loading/error |
| `/partner/reviews` | `PartnerReviewsView` | review display requires data-source verification; empty/long review |
| `/partner/billing` | `PartnerBillingView` | hardcoded/sample payout ledger; must remain clearly identified as non-live |
| `/partner/settings` | `PartnerSettingsView` | local component state only; save is not persisted |

## Admin workspace

Guard: signed out → admin sign-in; role must equal admin. `AdminSubRole` is not enforced at frontend route level.

| Route | View | Data honesty and states |
|---|---|---|
| `/admin` | `AdminOverviewView` | marked simulated/sandbox metrics |
| `/admin/verification` | `AdminVerificationQueueView` | real queue; loading/empty/error/review modal |
| `/admin/moderation` | `AdminModerationView` | unavailable backend paths must show honest state |
| `/admin/disputes` | `AdminDisputesView` | unavailable backend paths must show honest state |
| `/admin/audit` | `AdminAuditView` | real audit API where available; pagination/error/long rows |
| `/admin/memorials` | `AdminMemorialsView` | real admin list; loading/empty/error/table overflow |
| `/admin/users`, `/admin/admin-users` | `AdminUsersView` | real bounded list; loading/empty/error/search/table overflow |
| `/admin/providers` | `AdminProvidersView` | real provider admin API; loading/empty/error/actions |
| `/admin/leads` | `AdminLeadsView` | real lead API; loading/empty/error |
| `/admin/payments` | `AdminPaymentsView` | real billing API plus any simulator actions must be labelled/gated |
| `/admin/refunds` | `AdminRefundsView` | real refund API; empty/error/actions |
| `/admin/payment-disputes` | `AdminPaymentDisputesView` | explicit placeholder: no connected case source |
| `/admin/system` | `AdminSystemHealthView` | real health API; slow/degraded/error |
| `/admin/plans` | `AdminPlansView` | catalog/admin behavior requires runtime verification |
| `/admin/content` | `AdminContentView` | content source requires runtime verification |
| `/admin/analytics` | `AdminAnalyticsView` | explicitly simulated census metrics |
| `/admin/settings` | `AdminSettingsView` | local component state only; not sidebar-linked |

`AdminLayout` globally labels the console as a simulated sandbox even when child screens use real APIs. Runtime review must determine whether that creates a truthful caution or misleading inconsistency.

## Shared primitives and cross-route audit surface

| Primitive | File | Required checks |
|---|---|---|
| Buttons | `components/ui/Button.tsx` | size, disabled/loading width, accessible names, touch target |
| Badges | `components/ui/Badge.tsx` | truthful status, wrapping, keyboard semantics when clickable |
| Modal | `components/ui/Modal.tsx` | role/name, focus entry/trap/restore, Escape, scroll lock, max-height/mobile |
| Toasts | `components/ui/Toast.tsx` | live-region semantics, stacking, timeout, reduced motion |
| Media uploader | `components/ui/MediaUploader.tsx` | label, drag/drop keyboard alternative, progress/error, long filename |
| Audio player | `components/ui/AudioPlayer.tsx` | keyboard controls, names, mobile width, missing media |
| Lightbox | `components/ui/Lightbox.tsx` | focus trap, close, navigation, image alt/loading |
| Share/report/dispute/offering/anniversary modals | `components/ui/*Modal.tsx` | shared modal defects plus form/error states |
| Verification drawer | `components/verification/VerificationDrawer.tsx` | drawer focus/scroll/layering/status honesty |
| SEO | `components/common/SEOHead.tsx` | title/meta/canonical/noindex/OG/privacy |
| Motion | `lib/motion.tsx`, visual components | reduced motion, layout shift, mobile cost |
| API errors | `services/api/client.ts` | distinct 401/403/404/409/422/429/500/network handling |
| Auth cleanup | `context/AuthContext.tsx` | Firebase sign-out and Pithros storage isolation |
| PWA caching | `vite.config.ts` | public-only API cache, private NetworkOnly, warm-cache behavior |

## Personas and isolation matrix

- Anonymous public visitor
- Family steward
- Family contributor in an isolated browser context
- Farewell partner
- Admin / super-admin
- Wrong-role authenticated account for each protected shell
- Same-browser sequential User A → logout → User B leakage test

## Inventory verdict

**COMPLETE FOR AUDIT EXECUTION.**

This inventory identifies what exists and what must be tested; it does not claim runtime correctness. Explicitly non-live/local-only areas are partner billing, partner settings, admin settings, simulated admin overview/analytics, and the unconnected admin payment-disputes source. Pricing presentation is static while server-side billing remains authoritative.
