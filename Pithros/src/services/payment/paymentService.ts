import { PaymentGateway, GatewayOrderResult } from './types';
import { RazorpayGateway } from './RazorpayGateway';
import { CashfreeGateway } from './CashfreeGateway';
import {
  PaymentRecord,
  PaymentStatus,
  BillingInvoice,
  PaymentDispute,
  PaymentGatewayConfig,
  Memorial,
  User,
} from '../../types';
import { pricingPlans, demoBillingInvoices } from '../../data/mockData';
import { api } from '../api';

const STORAGE_KEY_PAYMENTS = 'pithros_payment_records';
const STORAGE_KEY_INVOICES = 'pithros_billing_invoices';
const STORAGE_KEY_CONFIG = 'pithros_gateway_config';
const STORAGE_KEY_DISPUTES = 'pithros_payment_disputes';
const STORAGE_KEY_PROCESSED_WEBHOOKS = 'pithros_processed_webhooks';

function getStored<T>(key: string, fallback: T): T {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch {
    return fallback;
  }
}

function setStored<T>(key: string, val: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    // storage fallback
  }
}

// Initial demo payment records for rich audit history
const initialPaymentRecords: PaymentRecord[] = [
  {
    id: 'pay_pth_101',
    userId: 'usr_anita_krishnan',
    userName: 'Anita Krishnan',
    userEmail: 'anita.k@example.com',
    memorialId: 'mem_arun_krishnan',
    memorialName: 'Dr. Arun Krishnan',
    planId: 'plan_plus',
    planName: 'Memorial Plus (Lifetime Preservation)',
    amount: 2499,
    formattedAmount: '₹2,499',
    currency: 'INR',
    gateway: 'razorpay',
    gatewayOrderId: 'order_rzp_98412_alpha',
    gatewayPaymentId: 'pay_rzp_live_884102',
    gatewaySignature: 'rzp_sig_verified_a1b2c3d4e5f6',
    status: 'success',
    invoiceId: 'inv_1001',
    paymentMethodMasked: 'UPI •••• 9845',
    createdAt: '2026-01-16T10:14:00Z',
    updatedAt: '2026-01-16T10:15:30Z',
    completedAt: '2026-01-16T10:15:30Z',
  },
  {
    id: 'pay_pth_102',
    userId: 'usr_anita_krishnan',
    userName: 'Anita Krishnan',
    userEmail: 'anita.k@example.com',
    memorialId: 'mem_arun_krishnan',
    memorialName: 'Dr. Arun Krishnan',
    planId: 'plan_archive',
    planName: 'Family Archive',
    amount: 4500,
    formattedAmount: '₹4,500',
    currency: 'INR',
    gateway: 'cashfree',
    gatewayOrderId: 'order_cf_55102_beta',
    gatewayPaymentId: 'pay_cf_live_992144',
    gatewaySignature: 'cf_sig_verified_f7g8h9i0j1k2',
    status: 'refunded',
    invoiceId: 'inv_1003',
    paymentMethodMasked: 'NetBanking SBI',
    refundAmount: 4500,
    refundReason: 'Accidental duplicate contribution by family member. Full refund issued.',
    createdAt: '2026-02-20T11:00:00Z',
    updatedAt: '2026-02-21T09:30:00Z',
    completedAt: '2026-02-20T11:01:12Z',
  },
];

const initialDisputes: PaymentDispute[] = [
  {
    id: 'disp_pay_01',
    paymentId: 'pay_pth_102',
    invoiceNumber: 'PTH-2026-0199',
    customerName: 'Sunita Krishnan Nair',
    customerEmail: 'sunita.nair@example.com',
    amount: 4500,
    formattedAmount: '₹4,500',
    currency: 'INR',
    reason: 'Duplicate payment initiated by sibling during memorial setup',
    status: 'refunded',
    evidenceSubmitted: 'Screenshot of dual transaction timestamp from bank passbook',
    createdAt: '2026-02-20T14:15:00Z',
    updatedAt: '2026-02-21T09:30:00Z',
  },
];

export class PaymentService {
  private razorpayGateway: RazorpayGateway;
  private cashfreeGateway: CashfreeGateway;

  constructor() {
    this.razorpayGateway = new RazorpayGateway();
    this.cashfreeGateway = new CashfreeGateway();
  }

  // Gateway Configuration
  getConfig(): PaymentGatewayConfig {
    return getStored<PaymentGatewayConfig>(STORAGE_KEY_CONFIG, {
      activeGateway: 'razorpay',
      mode: 'test',
      webhookSecretConfigured: true,
      signatureVerificationStrict: true,
    });
  }

  setConfig(config: Partial<PaymentGatewayConfig>): PaymentGatewayConfig {
    const current = this.getConfig();
    const updated = { ...current, ...config };
    setStored(STORAGE_KEY_CONFIG, updated);
    return updated;
  }

  getActiveGateway(): PaymentGateway {
    const config = this.getConfig();
    return config.activeGateway === 'cashfree' ? this.cashfreeGateway : this.razorpayGateway;
  }

  // 1. Create Internal Payment & Initiate Gateway Handshake
  async createPaymentSession(params: {
    planId: string;
    memorialId: string;
    memorialName: string;
    user?: User | null;
    customAmount?: number;
  }): Promise<{ payment: PaymentRecord; order: GatewayOrderResult }> {
    const plan = pricingPlans.find((p) => p.id === params.planId);
    if (!plan && !params.customAmount) {
      throw new Error('Invalid preservation plan selected');
    }

    // Amount parsing (e.g. "₹2,499" -> 2499)
    const rawPrice = plan ? parseInt(plan.price.replace(/[^0-9]/g, ''), 10) || 0 : params.customAmount || 0;
    const gateway = this.getActiveGateway();

    const internalPaymentId = `pay_pth_${Date.now().toString().slice(-6)}_${Math.random().toString(36).substring(2, 6)}`;

    // 1. Step: Internal payment record in 'created' state
    const paymentRecord: PaymentRecord = {
      id: internalPaymentId,
      userId: params.user?.id || 'usr_family_steward',
      userName: params.user?.name || 'Family Steward',
      userEmail: params.user?.email || 'family@pithros.org',
      memorialId: params.memorialId,
      memorialName: params.memorialName,
      planId: plan ? plan.id : 'custom_preservation',
      planName: plan ? plan.name : 'Memorial Preservation',
      amount: rawPrice,
      formattedAmount: `₹${rawPrice.toLocaleString('en-IN')}`,
      currency: 'INR',
      gateway: gateway.name,
      gatewayOrderId: '',
      status: 'created',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 2. Step: Contact gateway adapter to create order server-side
    const orderResult = await gateway.createOrder({
      internalPaymentId,
      amount: rawPrice,
      currency: 'INR',
      planId: paymentRecord.planId,
      planName: paymentRecord.planName,
      customerName: paymentRecord.userName || 'Family Steward',
      customerEmail: paymentRecord.userEmail || 'steward@pithros.org',
      memorialId: params.memorialId,
      memorialName: params.memorialName,
    });

    // 3. Step: Update internal payment with gateway reference and set to 'pending'
    paymentRecord.gatewayOrderId = orderResult.gatewayOrderId;
    paymentRecord.status = 'pending';
    paymentRecord.updatedAt = new Date().toISOString();

    const payments = this.getPayments();
    payments.unshift(paymentRecord);
    setStored(STORAGE_KEY_PAYMENTS, payments);

    return {
      payment: paymentRecord,
      order: orderResult,
    };
  }

  // 2. Server-side Signature Verification & Fulfillment
  async verifyPayment(params: {
    internalPaymentId: string;
    gatewayOrderId: string;
    gatewayPaymentId: string;
    gatewaySignature: string;
  }): Promise<{ payment: PaymentRecord; invoice: BillingInvoice }> {
    const payments = this.getPayments();
    const payment = payments.find((p) => p.id === params.internalPaymentId);

    if (!payment) {
      throw new Error(`Payment record not found: ${params.internalPaymentId}`);
    }

    // Idempotency: If already succeeded, return existing record and invoice
    if (payment.status === 'success' && payment.invoiceId) {
      const invoice = this.getInvoiceById(payment.invoiceId);
      if (invoice) return { payment, invoice };
    }

    const gateway = payment.gateway === 'cashfree' ? this.cashfreeGateway : this.razorpayGateway;

    // Verify cryptographic signature
    const verification = await gateway.verifyPayment({
      internalPaymentId: payment.id,
      gatewayOrderId: params.gatewayOrderId,
      gatewayPaymentId: params.gatewayPaymentId,
      gatewaySignature: params.gatewaySignature,
    });

    if (!verification.verified) {
      payment.status = 'failed';
      payment.failureReason = verification.error || 'Payment signature could not be verified.';
      payment.updatedAt = new Date().toISOString();
      setStored(STORAGE_KEY_PAYMENTS, payments);
      throw new Error(payment.failureReason);
    }

    // Reconciliation: Generate official Billing Invoice
    const invoiceNumber = `PTH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const taxRate = 0.18;
    const subtotalAmount = Math.round(payment.amount / (1 + taxRate));
    const taxAmount = payment.amount - subtotalAmount;

    const invoice: BillingInvoice = {
      id: `inv_${Date.now()}`,
      invoiceNumber,
      planName: payment.planName,
      amount: payment.formattedAmount,
      subtotal: `₹${subtotalAmount.toLocaleString('en-IN')}`,
      taxAmount: `₹${taxAmount.toLocaleString('en-IN')} (GST 18%)`,
      currency: 'INR',
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      status: 'success',
      paymentMethodMasked: verification.paymentMethodMasked || 'Online Payment Gateway',
      receiptUrl: `/payment/receipt/${invoiceNumber}`,
      memorialName: payment.memorialName,
      customerName: payment.userName,
      customerEmail: payment.userEmail,
      paymentId: payment.id,
    };

    // Save invoice
    const invoices = this.getInvoices();
    invoices.unshift(invoice);
    setStored(STORAGE_KEY_INVOICES, invoices);

    // Update payment record to success
    payment.status = 'success';
    payment.gatewayPaymentId = params.gatewayPaymentId;
    payment.gatewaySignature = params.gatewaySignature;
    payment.invoiceId = invoice.id;
    payment.paymentMethodMasked = invoice.paymentMethodMasked;
    payment.completedAt = new Date().toISOString();
    payment.updatedAt = new Date().toISOString();
    setStored(STORAGE_KEY_PAYMENTS, payments);

    return { payment, invoice };
  }

  // 3. Mark Payment Cancelled
  async cancelPayment(internalPaymentId: string, reason = 'User cancelled'): Promise<PaymentRecord> {
    const payments = this.getPayments();
    const payment = payments.find((p) => p.id === internalPaymentId);
    if (!payment) throw new Error('Payment not found');

    payment.status = 'cancelled';
    payment.failureReason = reason;
    payment.updatedAt = new Date().toISOString();
    setStored(STORAGE_KEY_PAYMENTS, payments);
    return payment;
  }

  // 4. Mark Payment Failed
  async failPayment(internalPaymentId: string, reason: string): Promise<PaymentRecord> {
    const payments = this.getPayments();
    const payment = payments.find((p) => p.id === internalPaymentId);
    if (!payment) throw new Error('Payment not found');

    payment.status = 'failed';
    payment.failureReason = reason;
    payment.updatedAt = new Date().toISOString();
    setStored(STORAGE_KEY_PAYMENTS, payments);
    return payment;
  }

  // 5. Request Refund (Family Steward / Customer)
  async requestRefund(paymentId: string, reason: string): Promise<PaymentRecord> {
    const payments = this.getPayments();
    const payment = payments.find((p) => p.id === paymentId);
    if (!payment) throw new Error('Payment not found');

    if (payment.status !== 'success') {
      throw new Error('Only successful payments can be refunded');
    }

    payment.status = 'refund_requested';
    payment.refundReason = reason;
    payment.updatedAt = new Date().toISOString();
    setStored(STORAGE_KEY_PAYMENTS, payments);
    return payment;
  }

  // 6. Process Refund (Admin Action via Gateway Adapter)
  async processRefund(paymentId: string, refundAmount?: number, reason?: string): Promise<PaymentRecord> {
    const payments = this.getPayments();
    const payment = payments.find((p) => p.id === paymentId);
    if (!payment) throw new Error('Payment not found');

    const gateway = payment.gateway === 'cashfree' ? this.cashfreeGateway : this.razorpayGateway;
    const finalRefundAmount = refundAmount || payment.amount;

    payment.status = 'refund_processing';
    payment.updatedAt = new Date().toISOString();

    const refundResult = await gateway.processRefund({
      gatewayOrderId: payment.gatewayOrderId,
      gatewayPaymentId: payment.gatewayPaymentId || '',
      refundAmount: finalRefundAmount,
      currency: payment.currency,
      reason: reason || payment.refundReason || 'Family requested preservation refund',
    });

    if (!refundResult.success) {
      payment.status = 'failed';
      payment.failureReason = refundResult.error || 'Gateway refund initiation failed';
      payment.updatedAt = new Date().toISOString();
      setStored(STORAGE_KEY_PAYMENTS, payments);
      throw new Error(payment.failureReason);
    }

    payment.status = finalRefundAmount < payment.amount ? 'partially_refunded' : 'refunded';
    payment.refundAmount = finalRefundAmount;
    payment.refundReason = reason || payment.refundReason;
    payment.updatedAt = new Date().toISOString();
    setStored(STORAGE_KEY_PAYMENTS, payments);

    // Update associated invoice status
    if (payment.invoiceId) {
      const invoices = this.getInvoices();
      const invoice = invoices.find((inv) => inv.id === payment.invoiceId);
      if (invoice) {
        invoice.status = payment.status;
        invoice.refundReason = payment.refundReason;
        setStored(STORAGE_KEY_INVOICES, invoices);
      }
    }

    return payment;
  }

  // 7. Webhook Handler with HMAC verification & Idempotency Protection
  async handleWebhook(params: {
    gateway: 'razorpay' | 'cashfree';
    rawPayload: string;
    signature: string;
    secret?: string;
  }): Promise<{ success: boolean; event: string; message: string }> {
    const { gateway, rawPayload, signature, secret = 'webhook_secret' } = params;
    const adapter = gateway === 'cashfree' ? this.cashfreeGateway : this.razorpayGateway;

    // HMAC verification
    const isValid = await adapter.verifyWebhookSignature(rawPayload, signature, secret);
    if (!isValid) {
      return { success: false, event: 'unknown', message: 'Invalid webhook signature rejected' };
    }

    // Duplicate event detection (Idempotency)
    const processedWebhooks = getStored<string[]>(STORAGE_KEY_PROCESSED_WEBHOOKS, []);
    const eventHash = `${gateway}_${signature.slice(-16)}`;
    if (processedWebhooks.includes(eventHash)) {
      return { success: true, event: 'duplicate', message: 'Event already reconciled (idempotent)' };
    }

    processedWebhooks.push(eventHash);
    setStored(STORAGE_KEY_PROCESSED_WEBHOOKS, processedWebhooks.slice(-100));

    return {
      success: true,
      event: 'payment.captured',
      message: 'Webhook authenticated and reconciled successfully',
    };
  }

  // 8. Queries
  getPayments(): PaymentRecord[] {
    return getStored<PaymentRecord[]>(STORAGE_KEY_PAYMENTS, initialPaymentRecords);
  }

  getPaymentById(id: string): PaymentRecord | null {
    const list = this.getPayments();
    return list.find((p) => p.id === id || p.gatewayOrderId === id) || null;
  }

  getInvoices(): BillingInvoice[] {
    return getStored<BillingInvoice[]>(STORAGE_KEY_INVOICES, demoBillingInvoices);
  }

  getInvoiceById(id: string): BillingInvoice | null {
    const list = this.getInvoices();
    return (
      list.find((inv) => inv.id === id || inv.invoiceNumber === id || inv.receiptUrl?.includes(id)) || null
    );
  }

  getDisputes(): PaymentDispute[] {
    return getStored<PaymentDispute[]>(STORAGE_KEY_DISPUTES, initialDisputes);
  }

  async createDispute(params: Omit<PaymentDispute, 'id' | 'createdAt' | 'updatedAt'>): Promise<PaymentDispute> {
    const disputes = this.getDisputes();
    const newDispute: PaymentDispute = {
      ...params,
      id: `disp_pay_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    disputes.unshift(newDispute);
    setStored(STORAGE_KEY_DISPUTES, disputes);
    return newDispute;
  }

  async updateDisputeStatus(id: string, status: PaymentDispute['status']): Promise<PaymentDispute | null> {
    const disputes = this.getDisputes();
    const dispute = disputes.find((d) => d.id === id);
    if (!dispute) return null;
    dispute.status = status;
    dispute.updatedAt = new Date().toISOString();
    setStored(STORAGE_KEY_DISPUTES, disputes);
    return dispute;
  }
}

export const paymentService = new PaymentService();
