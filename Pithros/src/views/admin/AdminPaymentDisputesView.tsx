import React, { useState, useEffect } from 'react';
import {
  Scale,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldAlert,
  FileText,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useTheme } from '../../context/ThemeContext';
import { paymentService } from '../../services/payment/paymentService';
import { PaymentDispute } from '../../types';

export const AdminPaymentDisputesView: React.FC = () => {
  const { isDark } = useTheme();
  const [disputes, setDisputes] = useState<PaymentDispute[]>([]);
  const [selectedDispute, setSelectedDispute] = useState<PaymentDispute | null>(null);

  const loadData = () => {
    setDisputes(paymentService.getDisputes());
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateStatus = async (id: string, status: PaymentDispute['status']) => {
    await paymentService.updateDisputeStatus(id, status);
    loadData();
  };

  return (
    <div className="space-y-6">
      {/* Honesty Demo Data Banner */}
      <div
        className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs ${
          isDark
            ? 'bg-[#16120E] border-[#3D3328] text-[#D9D2C6]'
            : 'bg-[#FFF8EE] border-[#E8DEC8] text-[#5A4E3E]'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-amber-500/20 text-amber-500">
            DEMO DATA
          </span>
          <span>
            Payment disputes & chargeback defense ledger. Review evidence submitted by stewards and banking partners.
          </span>
        </div>
      </div>

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
            Trust & Financial Arbitration
          </span>
          <h1
            className={`text-xl font-serif mt-0.5 ${
              isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
            }`}
          >
            Payment Disputes & Claims
          </h1>
        </div>
      </div>

      {/* Disputes Table */}
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
              <th className="py-3 px-4">Dispute ID</th>
              <th className="py-3 px-4">Claimant / Customer</th>
              <th className="py-3 px-4">Invoice / Amount</th>
              <th className="py-3 px-4">Dispute Reason</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-current/10">
            {disputes.map((d) => (
              <tr
                key={d.id}
                className={`transition-colors ${
                  isDark ? 'hover:bg-[#1A140E]' : 'hover:bg-[#FAF4EB]'
                }`}
              >
                <td className="py-3.5 px-4 font-mono font-medium">
                  {d.id}
                  <div className="text-[10px] text-[#9EA3AA]">{d.paymentId}</div>
                </td>
                <td className="py-3.5 px-4">
                  <div className="font-medium">{d.customerName}</div>
                  <div className="text-[11px] text-[#9EA3AA]">{d.customerEmail}</div>
                </td>
                <td className="py-3.5 px-4">
                  <div className="font-serif font-bold">{d.formattedAmount}</div>
                  <div className="text-[10px] font-mono text-[#9EA3AA]">{d.invoiceNumber}</div>
                </td>
                <td className="py-3.5 px-4 max-w-xs text-[11px]">
                  <div>{d.reason}</div>
                  {d.evidenceSubmitted && (
                    <div className="text-[10px] text-emerald-500 mt-0.5">
                      Evidence: {d.evidenceSubmitted}
                    </div>
                  )}
                </td>
                <td className="py-3.5 px-4">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono border uppercase ${
                      d.status === 'refunded'
                        ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                        : d.status === 'won'
                        ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                    }`}
                  >
                    {d.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-right space-x-2">
                  {d.status !== 'refunded' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUpdateStatus(d.id, 'refunded')}
                    >
                      Resolve by Refund
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
