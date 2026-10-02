/**
 * Real Billing and Subscription API client.
 *
 * Connects the frontend pricing, checkout, and billing dashboard to the authoritative
 * Python/FastAPI billing engine and Supabase PostgreSQL tables.
 */

import { http } from './client';

export interface PlanPrice {
  id: string;
  billingInterval: 'month' | 'year' | 'one_time';
  intervalCount: number;
  amountMinor: number;
  currency: string;
  isPrimary: boolean;
  savingsCopy?: string | null;
  monthlyEquivalentMinor?: number | null;
}

export interface BillingPlan {
  id: string;
  code: string;
  name: string;
  description: string;
  productType: string;
  prices: PlanPrice[];
}

export interface FreeTierLimits {
  maxMemorials: number;
  maxPhotos: number;
  maxMediaBytes: number;
  maxFileBytes: number;
  maxVideoBytes: number;
  maxAudioBytes: number;
  maxAudioFileBytes: number;
  maxContributors: number;
  maxTimelineEvents: number;
  maxDailyUploadAttempts: number;
  archiveExportEnabled: boolean;
}

export interface PricingCatalog {
  plans: BillingPlan[];
  freeTier: FreeTierLimits;
}

export interface CreateOrderResult {
  internalOrderId: string;
  amountMinor: number;
  currency: string;
  planName: string;
  planCode: string;
  priceId: string;
  gateway: string;
  gatewayOrderId?: string | null;
  paymentSessionId?: string | null;
  environment: string;
}

export interface VerifyPaymentResult {
  success: boolean;
  subscriptionId?: string | null;
  status?: string | null;
  currentPeriodEnd?: string | null;
  assignedMemorialId?: string | null;
  invoiceNumber?: string | null;
}

export interface UserSubscriptionSlot {
  id: string;
  slotNumber: number;
  memorialId: string;
  status: string;
  assignedAt: string;
}

export interface UserSubscription {
  id: string;
  planName: string;
  planCode: string;
  priceId: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  autoRenew: boolean;
  cancelAtPeriodEnd: boolean;
  maxMemorials: number;
  slots: UserSubscriptionSlot[];
}

export interface UserBillingStatus {
  billingAccount: {
    id: string;
    billingEmail: string;
    billingName: string;
    country: string;
    currency: string;
    status: string;
  };
  subscriptions: UserSubscription[];
}

export interface BillingInvoiceOut {
  id: string;
  invoiceNumber: string;
  amountMinor: number;
  taxMinor?: number;
  totalMinor?: number;
  currency: string;
  status: string;
  pdfUrl?: string | null;
  issuedAt: string;
  paidAt?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  planName?: string | null;
  memorialName?: string | null;
  billingName?: string | null;
  billingEmail?: string | null;
  paymentMethodMasked?: string | null;
}

export interface PaymentOut {
  id: string;
  internalOrderId: string;
  gateway: string;
  gatewayOrderId?: string | null;
  gatewayPaymentId?: string | null;
  amountMinor: number;
  currency: string;
  status: string;
  planName?: string | null;
  memorialName?: string | null;
  invoiceNumber?: string | null;
  createdAt: string;
  paidAt?: string | null;
}

export interface RefundOut {
  id: string;
  paymentId: string;
  internalOrderId?: string | null;
  userEmail?: string | null;
  userName?: string | null;
  amountMinor: number;
  currency: string;
  status: string;
  reason?: string | null;
  gatewayRefundId?: string | null;
  createdAt: string;
  processedAt?: string | null;
}

export const billingApi = {
  /**
   * Fetch the authoritative server-side pricing catalog.
   */
  async getCatalog(): Promise<PricingCatalog> {
    return http.get<PricingCatalog>('/billing/plans', { anonymous: true });
  },

  /**
   * Fetch active billing profile, subscriptions, and assigned memorial slots.
   */
  async getMyBilling(): Promise<UserBillingStatus> {
    return http.get<UserBillingStatus>('/billing/me');
  },

  /**
   * Create an authoritative server checkout order.
   */
  async createOrder(params: {
    planPriceId: string;
    memorialId?: string;
    sponsorshipToken?: string;
  }): Promise<CreateOrderResult> {
    return http.post<CreateOrderResult>('/billing/orders', params);
  },

  /**
   * Verify and activate payment and entitlements.
   */
  async verifyPayment(params: {
    internalOrderId: string;
    gatewayPaymentId?: string;
    gatewayOrderId?: string;
    paymentMethodType?: string;
  }): Promise<VerifyPaymentResult> {
    return http.post<VerifyPaymentResult>('/billing/verify', params);
  },

  /**
   * Fetch list of immutable billing invoices.
   */
  async getInvoices(): Promise<BillingInvoiceOut[]> {
    return http.get<BillingInvoiceOut[]>('/billing/invoices');
  },

  /**
   * Fetch one invoice / tax receipt by its number.
   */
  async getInvoice(invoiceNumber: string): Promise<BillingInvoiceOut> {
    return http.get<BillingInvoiceOut>(`/billing/invoices/${encodeURIComponent(invoiceNumber)}`);
  },

  /**
   * Fetch the caller's own payments (server-scoped).
   */
  async getMyPayments(): Promise<PaymentOut[]> {
    return http.get<PaymentOut[]>('/billing/payments');
  },

  /**
   * Request a refund for one of the caller's own payments (admin approves).
   */
  async requestRefund(paymentId: string, params: { reason: string }): Promise<RefundOut> {
    return http.post<RefundOut>(`/billing/payments/${paymentId}/refund-request`, params);
  },

  /**
   * Admin: refund queue.
   */
  async adminListRefunds(): Promise<RefundOut[]> {
    return http.get<RefundOut[]>('/billing/admin/refunds');
  },

  /**
   * Admin: issue an approved refund at the gateway.
   */
  async adminApproveRefund(refundId: string): Promise<RefundOut> {
    return http.post<RefundOut>(`/billing/admin/refunds/${refundId}/approve`);
  },

  /**
   * Cancel subscription auto-renewal at period end.
   */
  async cancelSubscription(subscriptionId: string): Promise<{ success: boolean; currentPeriodEnd: string }> {
    return http.post(`/billing/subscriptions/${subscriptionId}/cancel`);
  },

  /**
   * Resume cancelled subscription.
   */
  async resumeSubscription(subscriptionId: string): Promise<{ success: boolean }> {
    return http.post(`/billing/subscriptions/${subscriptionId}/resume`);
  },

  /**
   * Admin: Manually grant complimentary entitlement with audit reason.
   */
  async adminGrantEntitlement(params: {
    targetUserEmail?: string;
    targetUserId?: string;
    planCode: string;
    durationMonths: number;
    reason: string;
    memorialId?: string;
  }): Promise<any> {
    return http.post('/billing/admin/grant', params);
  },

  /**
   * Admin: Extend active subscription.
   */
  async adminExtendSubscription(subscriptionId: string, params: {
    additionalMonths: number;
    reason: string;
  }): Promise<any> {
    return http.post(`/billing/admin/subscriptions/${subscriptionId}/extend`, params);
  },

  /**
   * Admin: Revoke subscription early (safely preserves memorial media).
   */
  async adminRevokeSubscription(subscriptionId: string, params: {
    reason: string;
  }): Promise<any> {
    return http.post(`/billing/admin/subscriptions/${subscriptionId}/revoke`, params);
  },

  /**
   * Admin: Fetch billing and entitlement overview.
   */
  async adminGetOverview(): Promise<any> {
    return http.get('/billing/admin/overview');
  },
};

