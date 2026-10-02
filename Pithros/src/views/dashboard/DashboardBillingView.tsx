import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  Receipt,
  Download,
  Shield,
  Sparkles,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useTheme } from '../../context/ThemeContext';
import { Memorial, BillingInvoice, PaymentRecord } from '../../types';
import {
  billingApi,
  type BillingInvoiceOut,
  type PaymentOut,
  type UserBillingStatus,
} from '../../services/api/billing';

function toInvoice(inv: BillingInvoiceOut, memorialName: string): BillingInvoice {
  const total = inv.totalMinor ?? inv.amountMinor;
  return {
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    date: inv.issuedAt ? inv.issuedAt.split('T')[0] : '',
    planName: inv.planName || 'Memorial Care',
    amount: `₹${(total / 100).toLocaleString('en-IN')}`,
    currency: inv.currency,
    status: (inv.status === 'paid' ? 'success' : inv.status) as BillingInvoice['status'],
    receiptUrl: inv.pdfUrl || undefined,
    paymentMethodMasked: inv.paymentMethodMasked || 'Cashfree Payments',
    memorialName: inv.memorialName || memorialName,
  };
}

function toPayment(p: PaymentOut): PaymentRecord {
  return {
    id: p.id,
    userId: '',
    memorialId: '',
    memorialName: p.memorialName ?? undefined,
    planId: '',
    planName: p.planName || 'Memorial Care',
    amount: p.amountMinor / 100,
    formattedAmount: `₹${(p.amountMinor / 100).toLocaleString('en-IN')}`,
    currency: p.currency,
    gateway: p.gateway === 'cashfree' ? 'cashfree' : 'razorpay',
    gatewayOrderId: p.gatewayOrderId ?? '',
    status: p.status as PaymentRecord['status'],
    invoiceId: p.invoiceNumber ?? undefined,
    createdAt: p.createdAt,
    updatedAt: p.paidAt ?? p.createdAt,
    completedAt: p.paidAt ?? undefined,
  };
}

interface DashboardBillingViewProps {
  memorial: Memorial;
  onNavigate?: (route: string) => void;
}

export const DashboardBillingView: React.FC<DashboardBillingViewProps> = ({
  memorial,
  onNavigate,
}) => {
  const { isDark } = useTheme();
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [billingStatus, setBillingStatus] = useState<UserBillingStatus | null>(null);
  const [refundRequestModalOpen, setRefundRequestModalOpen] = useState(false);
  const [selectedPaymentForRefund, setSelectedPaymentForRefund] = useState<PaymentRecord | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Live mode only: everything below is server-scoped to the caller.
      const [billingData, invs, pays] = await Promise.all([
        billingApi.getMyBilling().catch(() => null),
        billingApi.getInvoices().catch(() => [] as BillingInvoiceOut[]),
        billingApi.getMyPayments().catch(() => [] as PaymentOut[]),
      ]);

      if (billingData) {
        setBillingStatus(billingData);
      }
      setInvoices((invs ?? []).map((inv) => toInvoice(inv, memorial.fullName)));
      setPayments((pays ?? []).map(toPayment));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [memorial.id]);

  const handleOpenRefundModal = (payment: PaymentRecord) => {
    setSelectedPaymentForRefund(payment);
    setRefundReason('Plan change / family preservation modification');
    setRefundRequestModalOpen(true);
  };

  const handleConfirmRefundRequest = async () => {
    if (!selectedPaymentForRefund) return;
    try {
      await billingApi.requestRefund(selectedPaymentForRefund.id, { reason: refundReason });
      setRefundRequestModalOpen(false);
      setActionMessage('Refund request recorded. An administrator will review and issue it.');
      loadData();
      setTimeout(() => setActionMessage(null), 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Refund request could not be registered.';
      setActionMessage(msg);
      setTimeout(() => setActionMessage(null), 5000);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
      case 'paid':
        return 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30';
      case 'pending':
        return 'bg-amber-500/15 text-amber-500 border-amber-500/30';
      case 'refunded':
      case 'partially_refunded':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      case 'refund_requested':
        return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
      case 'failed':
      case 'cancelled':
        return 'bg-red-500/15 text-red-400 border-red-500/30';
      default:
        return 'bg-stone-500/15 text-stone-400 border-stone-500/30';
    }
  };

  const activeSubscription = billingStatus?.subscriptions?.[0];
  const activePlanName = activeSubscription?.planName || 'Memorial Care';
  const hasActiveSub = !!activeSubscription && activeSubscription.status === 'active';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div
        className={`pb-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          isDark ? 'border-[#202C40]' : 'border-[#E5DED2]'
        }`}
      >
        <div>
          <span
            className={`text-[10px] font-mono uppercase tracking-wider ${
              isDark ? 'text-[#B99452]' : 'text-[#23324A]'
            }`}
          >
            Preservation & Stewardship
          </span>
          <h1
            className={`text-xl font-serif mt-0.5 ${
              isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
            }`}
          >
            Plans, Invoices & Digital Longevity
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => onNavigate?.('/checkout')}
            icon={Sparkles}
          >
            Upgrade Preservation Tier
          </Button>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs">
          {actionMessage}
        </div>
      )}

      {/* Current Tier Overview Banner */}
      <div
        className={`p-6 sm:p-8 rounded-3xl border flex flex-col sm:flex-row sm:items-center justify-between gap-6 ${
          isDark ? 'bg-[#14100C] border-[#2E241A]' : 'bg-[#FCFAF5] border-[#E5DED2]'
        }`}
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${hasActiveSub ? 'bg-emerald-500 animate-pulse' : 'bg-[#B99452]'}`} />
            <span
              className={`text-xs font-mono uppercase tracking-wider ${
                isDark ? 'text-[#B99452]' : 'text-[#23324A]'
              }`}
            >
              Active Family Tier
            </span>
          </div>
          <h2
            className={`text-2xl font-serif ${
              isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
            }`}
          >
            {activePlanName}
          </h2>
          <p
            className={`text-xs max-w-lg leading-relaxed ${
              isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'
            }`}
          >
            Assigned to <strong>{memorial.fullName}</strong>. Includes 30 photographs (300 MB media), up to 60 minutes of voice memories (100 MB audio) & transcripts, complete archival PDF export, digital legacy, and family collaboration.
          </p>
        </div>
        <div className="flex flex-col sm:items-end gap-2 text-xs">
          <span className="font-mono text-[11px] opacity-75">
            Plan: {activePlanName} {activeSubscription?.autoRenew ? '(Auto-Renewing)' : '(Annual)'}
          </span>
          <span className="font-mono text-[11px] text-emerald-500 font-semibold">
            Status: {hasActiveSub ? 'Active Cloud Preservation' : 'Active Memorial'}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate?.('/pricing')}
          >
            Compare All Plans
          </Button>
        </div>
      </div>

      {/* Invoices and Payments Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3
            className={`text-base font-serif ${
              isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
            }`}
          >
            Official Invoices & Tax Receipts
          </h3>
          <span className="text-[11px] text-[#9EA3AA] font-mono">
            {invoices.length} Records Logged
          </span>
        </div>

        <div
          className={`rounded-2xl border overflow-x-auto ${
            isDark ? 'border-[#202C40] bg-[#182337]' : 'border-[#E5DED2] bg-[#FCFAF5]'
          }`}
        >
          <table className="w-full text-left text-xs">
            <thead>
              <tr
                className={`border-b text-[10px] font-mono uppercase tracking-wider ${
                  isDark ? 'border-[#202C40] text-[#9EA3AA]' : 'border-[#E5DED2] text-[#7D766D]'
                }`}
              >
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Preservation Plan</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Contribution</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-current/10">
              {invoices.map((inv) => (
                <tr
                  key={inv.id}
                  className={`transition-colors ${
                    isDark ? 'hover:bg-[#1A140E]' : 'hover:bg-[#FAF4EB]'
                  }`}
                >
                  <td className="py-3.5 px-4 font-mono font-medium">
                    {inv.invoiceNumber}
                  </td>
                  <td className="py-3.5 px-4">
                    {inv.planName}
                  </td>
                  <td className="py-3.5 px-4 text-[#9EA3AA] font-mono text-[11px]">
                    {inv.date}
                  </td>
                  <td className="py-3.5 px-4 font-semibold">
                    {inv.amount}
                  </td>
                  <td className="py-3.5 px-4 text-[#9EA3AA]">
                    {inv.paymentMethodMasked}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono border ${getStatusBadge(
                        inv.status
                      )}`}
                    >
                      {inv.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <a
                      href={inv.receiptUrl || '#'}
                      onClick={(e) => {
                        if (!inv.receiptUrl || inv.receiptUrl === '#') {
                          e.preventDefault();
                          alert(`Receipt ${inv.invoiceNumber} archived in Pithros cloud.`);
                        }
                      }}
                      className={`inline-flex items-center gap-1.5 text-[11px] font-medium transition-colors ${
                        isDark ? 'text-[#B99452] hover:text-[#D4AF37]' : 'text-[#23324A] hover:text-[#182337]'
                      }`}
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
