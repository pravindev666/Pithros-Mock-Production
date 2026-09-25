import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldCheck,
  Search,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useTheme } from '../../context/ThemeContext';
import { paymentService } from '../../services/payment/paymentService';
import { PaymentRecord } from '../../types';

export const AdminRefundsView: React.FC = () => {
  const { isDark } = useTheme();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [successNote, setSuccessNote] = useState<string | null>(null);

  const loadData = () => {
    const list = paymentService.getPayments();
    setPayments(list);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleProcessRefund = async (paymentId: string) => {
    setProcessingId(paymentId);
    try {
      await paymentService.processRefund(paymentId, undefined, 'Admin authorized compassionate refund');
      loadData();
      setSuccessNote(`Refund for ${paymentId} completed successfully via gateway adapter.`);
      setTimeout(() => setSuccessNote(null), 4000);
    } catch (err: any) {
      setSuccessNote(`Error: ${err.message || 'Refund failed'}`);
      setTimeout(() => setSuccessNote(null), 5000);
    } finally {
      setProcessingId(null);
    }
  };

  const refundList = payments.filter(
    (p) =>
      p.status === 'refund_requested' ||
      p.status === 'refund_processing' ||
      p.status === 'refunded' ||
      p.status === 'partially_refunded' ||
      p.status === 'success' // Allow admin to trigger refund on any success record
  );

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
            Refund management desk. Gateway reversals execute server-side HMAC verified payloads.
          </span>
        </div>
      </div>

      {successNote && (
        <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs">
          {successNote}
        </div>
      )}

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
            Steward Care & Disputes
          </span>
          <h1
            className={`text-xl font-serif mt-0.5 ${
              isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
            }`}
          >
            Refund Operations & Dispatches
          </h1>
        </div>
      </div>

      {/* Refund Queue Table */}
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
              <th className="py-3 px-4">Payment Ref</th>
              <th className="py-3 px-4">Customer & Memorial</th>
              <th className="py-3 px-4">Amount</th>
              <th className="py-3 px-4">Refund Reason / Notes</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-current/10">
            {refundList.map((p) => {
              const isEligible = p.status === 'success' || p.status === 'refund_requested';
              const isAlreadyRefunded = p.status === 'refunded' || p.status === 'partially_refunded';

              return (
                <tr
                  key={p.id}
                  className={`transition-colors ${
                    isDark ? 'hover:bg-[#1A140E]' : 'hover:bg-[#FAF4EB]'
                  }`}
                >
                  <td className="py-3.5 px-4 font-mono font-medium">
                    {p.id}
                    <div className="text-[10px] text-[#9EA3AA]">{p.gatewayOrderId}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-medium">{p.userName || 'Family Steward'}</div>
                    <div className="text-[11px] text-[#9EA3AA]">{p.memorialName}</div>
                  </td>
                  <td className="py-3.5 px-4 font-serif font-bold text-sm">
                    {p.formattedAmount}
                  </td>
                  <td className="py-3.5 px-4 max-w-xs text-[11px] text-[#9EA3AA]">
                    {p.refundReason || 'Family requested preservation refund / plan modification'}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono border uppercase ${
                        isAlreadyRefunded
                          ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                          : p.status === 'refund_requested'
                          ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                          : 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                      }`}
                    >
                      {p.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {isEligible ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleProcessRefund(p.id)}
                        isLoading={processingId === p.id}
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1" />
                        Execute Reversal
                      </Button>
                    ) : (
                      <span className="text-[10px] font-mono text-[#9EA3AA]">
                        Reversal Completed
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
