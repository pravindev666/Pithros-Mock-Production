import React, { useState, useEffect } from 'react';
import { Receipt, ArrowLeft, Download, Printer, Shield } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useTheme } from '../../context/ThemeContext';
import { paymentService } from '../../services/payment/paymentService';
import { billingApi, type BillingInvoiceOut } from '../../services/api/billing';
import { DEMO_MODE } from '../../lib/config';
import { BillingInvoice, Memorial } from '../../types';

function toInvoice(inv: BillingInvoiceOut): BillingInvoice {
  const total = inv.totalMinor ?? inv.amountMinor;
  const tax = inv.taxMinor ?? 0;
  return {
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    planName: inv.planName || 'Memorial Care',
    amount: `₹${(total / 100).toLocaleString('en-IN')}`,
    currency: inv.currency,
    date: inv.issuedAt ? inv.issuedAt.split('T')[0] : '',
    status: (inv.status === 'paid' ? 'success' : inv.status) as BillingInvoice['status'],
    paymentMethodMasked: inv.paymentMethodMasked || 'Cashfree Payments',
    receiptUrl: inv.pdfUrl || undefined,
    subtotal: `₹${(inv.amountMinor / 100).toLocaleString('en-IN')}`,
    taxAmount: tax ? `₹${(tax / 100).toLocaleString('en-IN')}` : undefined,
  };
}

interface DashboardBillingInvoicesViewProps {
  memorial: Memorial;
  onNavigate: (route: string) => void;
}

export const DashboardBillingInvoicesView: React.FC<DashboardBillingInvoicesViewProps> = ({
  memorial,
  onNavigate,
}) => {
  const { isDark } = useTheme();
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (DEMO_MODE) {
      setInvoices(paymentService.getInvoices());
      return;
    }
    billingApi
      .getInvoices()
      .then((invs) => {
        if (!cancelled) setInvoices(invs.map(toInvoice));
      })
      .catch(() => {
        if (!cancelled) setInvoices([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('/dashboard/billing')}
            icon={ArrowLeft}
          >
            Billing
          </Button>
          <h1
            className={`text-xl font-serif ${
              isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
            }`}
          >
            Preservation Tax Invoices & Records
          </h1>
        </div>
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
              <th className="py-3 px-4">Subtotal</th>
              <th className="py-3 px-4">Total (Incl. Tax)</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Receipt</th>
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
                <td className="py-3.5 px-4 font-mono font-medium">{inv.invoiceNumber}</td>
                <td className="py-3.5 px-4 font-medium">{inv.planName}</td>
                <td className="py-3.5 px-4 text-[#9EA3AA]">{inv.date}</td>
                <td className="py-3.5 px-4">{inv.subtotal || inv.amount}</td>
                <td className="py-3.5 px-4 font-serif font-bold">{inv.amount}</td>
                <td className="py-3.5 px-4">
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono border uppercase bg-emerald-500/15 text-emerald-500 border-emerald-500/30">
                    {inv.status}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      onNavigate(inv.receiptUrl || `/payment/receipt/${inv.invoiceNumber}`)
                    }
                    icon={Receipt}
                  >
                    View
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
