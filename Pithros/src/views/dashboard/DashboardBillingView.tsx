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
import { paymentService } from '../../services/payment/paymentService';
import { pricingPlans } from '../../data/mockData';

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
  const [refundRequestModalOpen, setRefundRequestModalOpen] = useState(false);
  const [selectedPaymentForRefund, setSelectedPaymentForRefund] = useState<PaymentRecord | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadData = () => {
    setInvoices(paymentService.getInvoices());
    setPayments(paymentService.getPayments());
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenRefundModal = (payment: PaymentRecord) => {
    setSelectedPaymentForRefund(payment);
    setRefundReason('Plan change / family preservation modification');
    setRefundRequestModalOpen(true);
  };

  const handleConfirmRefundRequest = async () => {
    if (!selectedPaymentForRefund) return;
    try {
      await paymentService.requestRefund(selectedPaymentForRefund.id, refundReason);
      setRefundRequestModalOpen(false);
      setActionMessage('Compassionate refund request recorded. Processing via payment gateway within 1-2 business days.');
      loadData();
      setTimeout(() => setActionMessage(null), 5000);
    } catch (err: any) {
      setActionMessage(err.message || 'Refund request could not be registered.');
      setTimeout(() => setActionMessage(null), 5000);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
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
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
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
            Memorial Plus Preservation
          </h2>
          <p
            className={`text-xs max-w-lg leading-relaxed ${
              isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'
            }`}
          >
            Permanently assigned to <strong>{memorial.fullName}</strong>. Includes unlimited photos, voice notes, Family Constellation access, and formal Document Reviewed verification.
          </p>
        </div>
        <div className="flex flex-col sm:items-end gap-2 text-xs">
          <span className="font-mono text-[11px] opacity-75">Status: Lifetime Paid</span>
          <span className="font-mono text-[11px] text-emerald-500 font-semibold">
            Zero Recurring Charges
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
                  <td className="py-3.5 px-4 font-medium">{inv.planName}</td>
                  <td className="py-3.5 px-4 text-[#9EA3AA]">{inv.date}</td>
                  <td className="py-3.5 px-4 font-serif font-bold">{inv.amount}</td>
                  <td className="py-3.5 px-4 text-[11px] text-[#9EA3AA]">
                    {inv.paymentMethodMasked}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono border uppercase ${getStatusBadge(
                        inv.status
                      )}`}
                    >
                      {inv.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        onNavigate?.(inv.receiptUrl || `/payment/receipt/${inv.invoiceNumber}`)
                      }
                      icon={Receipt}
                    >
                      Receipt
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 14-Day Compassionate Guarantee Card */}
      <div
        className={`p-6 rounded-3xl border flex items-start gap-4 ${
          isDark ? 'bg-[#182337] border-[#202C40]' : 'bg-[#FCFAF5] border-[#E5DED2]'
        }`}
      >
        <Shield
          className={`w-6 h-6 flex-shrink-0 mt-0.5 ${
            isDark ? 'text-[#B99452]' : 'text-[#23324A]'
          }`}
        />
        <div className="space-y-1 text-xs">
          <h4
            className={`font-serif text-sm ${
              isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
            }`}
          >
            Family First Guarantee & Cancellation Policy
          </h4>
          <p
            className={`leading-relaxed ${
              isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'
            }`}
          >
            If your family ever wishes to reverse a preservation contribution or adjust plans, our support team honours full refunds within 14 days of upgrade. We believe family memories must always be governed by love, not contractual friction.
          </p>
        </div>
      </div>
    </div>
  );
};
