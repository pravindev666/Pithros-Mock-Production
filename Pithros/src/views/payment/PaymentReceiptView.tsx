import React, { useState, useEffect } from 'react';
import {
  Printer,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  Download,
  Building2,
  Receipt,
  RotateCcw,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useTheme } from '../../context/ThemeContext';
import { PithrosLogo } from '../../components/visual/PithrosLogo';
import { paymentService } from '../../services/payment/paymentService';
import { billingApi, type BillingInvoiceOut } from '../../services/api/billing';
import { DEMO_MODE } from '../../lib/config';
import { BillingInvoice, PaymentRecord } from '../../types';

function mapInvoice(inv: BillingInvoiceOut): BillingInvoice {
  const total = inv.totalMinor ?? inv.amountMinor;
  const tax = inv.taxMinor ?? 0;
  return {
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    planName: inv.planName || 'Memorial Preservation',
    amount: `₹${(total / 100).toLocaleString('en-IN')}`,
    currency: inv.currency,
    date: inv.issuedAt
      ? new Date(inv.issuedAt).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : '',
    status: (inv.status === 'paid' ? 'success' : inv.status) as BillingInvoice['status'],
    paymentMethodMasked: inv.paymentMethodMasked || 'Cashfree Payments',
    receiptUrl: inv.pdfUrl || undefined,
    memorialName: inv.memorialName || undefined,
    customerName: inv.billingName || undefined,
    customerEmail: inv.billingEmail || undefined,
    taxAmount: tax ? `₹${(tax / 100).toLocaleString('en-IN')}` : undefined,
    subtotal: `₹${(inv.amountMinor / 100).toLocaleString('en-IN')}`,
  };
}

interface PaymentReceiptViewProps {
  receiptId: string;
  onNavigate: (route: string) => void;
}

export const PaymentReceiptView: React.FC<PaymentReceiptViewProps> = ({
  receiptId,
  onNavigate,
}) => {
  const { isDark } = useTheme();
  const [invoice, setInvoice] = useState<BillingInvoice | null>(null);
  const [paymentRecord, setPaymentRecord] = useState<PaymentRecord | null>(null);

  useEffect(() => {
    let cancelled = false;
    const cleanId = receiptId.replace('/payment/receipt/', '');

    if (DEMO_MODE) {
      const foundInvoice =
        paymentService.getInvoiceById(cleanId) || paymentService.getInvoices()[0];
      setInvoice(foundInvoice);
      if (foundInvoice?.paymentId) {
        setPaymentRecord(paymentService.getPaymentById(foundInvoice.paymentId));
      }
      return;
    }

    // Live mode: the receipt is the server's invoice record, nothing local.
    billingApi
      .getInvoice(cleanId)
      .then((inv) => {
        if (!cancelled) setInvoice(mapInvoice(inv));
      })
      .catch(() => {
        if (!cancelled) setInvoice(null);
      });
    return () => {
      cancelled = true;
    };
  }, [receiptId]);

  const handlePrint = () => {
    window.print();
  };

  if (!invoice) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-8">
        <div className="text-center space-y-3">
          <p className="text-sm text-[#9EA3AA]">Receipt record could not be located.</p>
          <Button variant="outline" size="sm" onClick={() => onNavigate('/dashboard/billing')}>
            Return to Billing
          </Button>
        </div>
      </div>
    );
  }

  const isRefunded = invoice.status === 'refunded' || invoice.status === 'partially_refunded';

  return (
    <div
      className={`min-h-[85vh] py-12 px-4 sm:px-6 lg:px-8 transition-colors ${
        isDark ? 'bg-[#111820] text-[#F8F5EE]' : 'bg-[#F3EEE4] text-[#20242A]'
      }`}
    >
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Navigation & Action Bar (Hidden on print) */}
        <div className="print:hidden flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('/dashboard/billing')}
            icon={ArrowLeft}
          >
            Back to Billing
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handlePrint}
            icon={Printer}
          >
            Print / Save as PDF
          </Button>
        </div>

        {/* The Receipt Document Card */}
        <div
          className={`p-8 sm:p-12 rounded-3xl border shadow-xl print:shadow-none print:border-none print:bg-white print:text-black ${
            isDark ? 'bg-[#182337] border-[#202C40]' : 'bg-[#FCFAF5] border-[#E5DED2]'
          }`}
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 border-b pb-8">
            <div>
              <PithrosLogo variant="default" />
              <p
                className={`text-[11px] font-mono mt-2 ${
                  isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                }`}
              >
                Pithros Living Memorial Registry
                <br />
                Bengaluru • Permanent Digital Preservation
              </p>
            </div>
            <div className="sm:text-right space-y-1">
              <span
                className={`inline-block px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider font-bold ${
                  isRefunded
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                }`}
              >
                {isRefunded ? 'Refund Processed' : 'Official Tax Receipt'}
              </span>
              <div className="font-mono text-sm font-semibold">{invoice.invoiceNumber}</div>
              <div
                className={`text-xs ${
                  isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                }`}
              >
                Date: {invoice.date}
              </div>
            </div>
          </div>

          {/* Parties & Memorial Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b text-xs">
            <div>
              <span
                className={`block font-mono uppercase text-[10px] tracking-wider mb-1 ${
                  isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                }`}
              >
                Billed To (Family Steward)
              </span>
              <div className="font-medium text-sm">{invoice.customerName || '—'}</div>
              <div className={isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'}>
                {invoice.customerEmail || '—'}
              </div>
              <div className={isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'}>
                Payment: {invoice.paymentMethodMasked}
              </div>
            </div>

            <div className="sm:text-right">
              <span
                className={`block font-mono uppercase text-[10px] tracking-wider mb-1 ${
                  isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                }`}
              >
                Dedicated Memorial
              </span>
              <div className="font-serif text-sm font-semibold">
                {invoice.memorialName || '—'}
              </div>
              <div className={isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'}>
                Preservation Status: Permanent Vault Active
              </div>
              <div className="text-[10px] font-mono text-emerald-500">
                Encrypted & Replicated
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="py-6 border-b">
            <table className="w-full text-xs">
              <thead>
                <tr
                  className={`border-b text-[10px] font-mono uppercase tracking-wider ${
                    isDark ? 'border-[#202C40] text-[#9EA3AA]' : 'border-[#E5DED2] text-[#7D766D]'
                  }`}
                >
                  <th className="text-left pb-3">Preservation Service</th>
                  <th className="text-center pb-3">Tenure</th>
                  <th className="text-right pb-3">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-current/10">
                <tr>
                  <td className="py-4">
                    <div className="font-medium text-sm">{invoice.planName}</div>
                    <div
                      className={`text-[11px] mt-0.5 ${
                        isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'
                      }`}
                    >
                      Unlimited media preservation, multi-family permissions, audio waveform archive & verification badge
                    </div>
                  </td>
                  <td className="py-4 text-center">Multi-decade / Lifetime</td>
                  <td className="py-4 text-right font-serif font-bold text-sm">
                    {invoice.amount}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Subtotals & Taxes */}
          <div className="py-6 border-b space-y-2 text-xs">
            <div className="flex justify-between">
              <span className={isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'}>Subtotal:</span>
              <span>{invoice.subtotal || invoice.amount}</span>
            </div>
            <div className="flex justify-between">
              <span className={isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'}>Applicable Taxes:</span>
              <span>{invoice.taxAmount || 'Included in total'}</span>
            </div>
            <div className="flex justify-between text-base font-serif font-bold pt-2 border-t">
              <span>Total Paid:</span>
              <span className={isDark ? 'text-[#B99452]' : 'text-[#23324A]'}>
                {invoice.amount}
              </span>
            </div>
            {isRefunded && (
              <div className="flex justify-between text-xs text-blue-400 font-mono pt-1">
                <span>Refund Issued:</span>
                <span>-{invoice.amount}</span>
              </div>
            )}
          </div>

          {/* Refund Notice if applicable */}
          {invoice.refundReason && (
            <div className="mt-4 p-3.5 rounded-xl bg-blue-950/20 border border-blue-800/30 text-xs text-blue-300">
              <strong>Refund Note:</strong> {invoice.refundReason}
            </div>
          )}

          {/* Trust Footnote */}
          <div
            className={`mt-8 pt-6 border-t text-[11px] leading-relaxed space-y-2 ${
              isDark ? 'border-[#202C40] text-[#9EA3AA]' : 'border-[#E5DED2] text-[#7D766D]'
            }`}
          >
            <div className="flex items-center gap-2 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Pithros Non-Commercial Preservation Guarantee</span>
            </div>
            <p>
              This memorial record is protected under our family privacy and non-commercial charter. No advertisements or sponsored interruptions will ever appear alongside your loved one’s memory.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
