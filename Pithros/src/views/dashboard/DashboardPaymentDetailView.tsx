import React, { useState, useEffect } from 'react';
import { ArrowLeft, Receipt, CheckCircle2, ShieldCheck, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useTheme } from '../../context/ThemeContext';
import { paymentService } from '../../services/payment/paymentService';
import { billingApi } from '../../services/api/billing';
import { DEMO_MODE } from '../../lib/config';
import { PaymentRecord, Memorial } from '../../types';

function toPaymentRecord(p: {
  id: string;
  gateway: string;
  gatewayOrderId?: string | null;
  amountMinor: number;
  currency: string;
  status: string;
  planName?: string | null;
  memorialName?: string | null;
  invoiceNumber?: string | null;
  createdAt: string;
  paidAt?: string | null;
}): PaymentRecord {
  return {
    id: p.id,
    userId: '',
    memorialId: '',
    memorialName: p.memorialName ?? undefined,
    planId: '',
    planName: p.planName || 'Memorial Preservation',
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

interface DashboardPaymentDetailViewProps {
  paymentId: string;
  memorial: Memorial;
  onNavigate: (route: string) => void;
}

export const DashboardPaymentDetailView: React.FC<DashboardPaymentDetailViewProps> = ({
  paymentId,
  memorial,
  onNavigate,
}) => {
  const { isDark } = useTheme();
  const [payment, setPayment] = useState<PaymentRecord | null>(null);

  useEffect(() => {
    let cancelled = false;
    const cleanId = paymentId.replace('/dashboard/billing/payment/', '');

    if (DEMO_MODE) {
      setPayment(paymentService.getPaymentById(cleanId) || paymentService.getPayments()[0]);
      return;
    }

    // Live mode: read the caller's own payments from the server, nothing local.
    billingApi
      .getMyPayments()
      .then((payments) => {
        if (cancelled) return;
        const found = payments.find((p) => p.id === cleanId) ?? payments[0];
        setPayment(found ? toPaymentRecord(found) : null);
      })
      .catch(() => {
        if (!cancelled) setPayment(null);
      });
    return () => {
      cancelled = true;
    };
  }, [paymentId]);

  if (!payment) {
    return (
      <div className="p-8 text-center text-xs text-[#9EA3AA]">
        Payment record not found.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 pb-4 border-b">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigate('/dashboard/billing')}
          icon={ArrowLeft}
        >
          Back
        </Button>
        <h1
          className={`text-xl font-serif ${
            isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
          }`}
        >
          Payment Transaction Details
        </h1>
      </div>

      <div
        className={`p-6 sm:p-8 rounded-3xl border space-y-5 text-xs ${
          isDark ? 'bg-[#182337] border-[#202C40]' : 'bg-[#FCFAF5] border-[#E5DED2]'
        }`}
      >
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <span className="text-[10px] uppercase font-mono text-[#9EA3AA]">Internal Transaction</span>
            <div className="font-mono text-sm font-bold">{payment.id}</div>
          </div>
          <span className="px-3 py-1 rounded-full text-[10px] font-mono uppercase bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
            {payment.status}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-[#9EA3AA]">Plan:</span>
            <div className="font-medium text-sm mt-0.5">{payment.planName}</div>
          </div>
          <div>
            <span className="text-[#9EA3AA]">Total Amount:</span>
            <div className="font-serif font-bold text-sm mt-0.5">{payment.formattedAmount}</div>
          </div>
          <div>
            <span className="text-[#9EA3AA]">Gateway:</span>
            <div className="font-mono uppercase mt-0.5">{payment.gateway}</div>
          </div>
          <div>
            <span className="text-[#9EA3AA]">Gateway Order Ref:</span>
            <div className="font-mono mt-0.5 truncate">{payment.gatewayOrderId}</div>
          </div>
          <div>
            <span className="text-[#9EA3AA]">Created:</span>
            <div className="mt-0.5 font-mono">{new Date(payment.createdAt).toLocaleString()}</div>
          </div>
          <div>
            <span className="text-[#9EA3AA]">Completed:</span>
            <div className="mt-0.5 font-mono">
              {payment.completedAt ? new Date(payment.completedAt).toLocaleString() : 'Pending'}
            </div>
          </div>
        </div>

        {payment.invoiceId && (
          <div className="pt-4 border-t flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate(`/payment/receipt/${payment.invoiceId}`)}
              icon={Receipt}
            >
              View Official Receipt
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
