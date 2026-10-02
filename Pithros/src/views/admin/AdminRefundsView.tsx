import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Search,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useTheme } from '../../context/ThemeContext';
import { billingApi, type RefundOut } from '../../services/api/billing';

export const AdminRefundsView: React.FC = () => {
  const { isDark } = useTheme();
  const [refunds, setRefunds] = useState<RefundOut[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [note, setNote] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setRefunds(await billingApi.adminListRefunds());
      setLoadError(null);
    } catch (err) {
      setRefunds([]);
      setLoadError(err instanceof Error ? err.message : 'Could not load the refund queue.');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (refund: RefundOut) => {
    setProcessingId(refund.id);
    setNote(null);
    try {
      await billingApi.adminApproveRefund(refund.id);
      await loadData();
      setNote({ type: 'success', text: `Refund ${refund.id} issued at the gateway.` });
    } catch (err) {
      setNote({
        type: 'error',
        text: err instanceof Error ? err.message : 'The refund could not be issued.',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const pendingCount = refunds.filter((r) => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div
        className={`p-3.5 rounded-2xl border flex items-center gap-2 text-xs ${
          isDark
            ? 'bg-[#16120E] border-[#3D3328] text-[#D9D2C6]'
            : 'bg-[#FFF8EE] border-[#E8DEC8] text-[#5A4E3E]'
        }`}
      >
        <ShieldCheck className="w-4 h-4 text-emerald-500" />
        <span>
          Refunds are created by stewards or admins and issued here. Money only moves when you
          approve a pending refund — every action is audited.
        </span>
      </div>

      {note && (
        <div
          className={`p-3 rounded-xl text-xs ${
            note.type === 'success'
              ? 'bg-emerald-950/40 border border-emerald-800 text-emerald-300'
              : 'bg-red-950/40 border border-red-800 text-red-300'
          }`}
        >
          {note.text}
        </div>
      )}

      {loadError && (
        <div className="p-3 rounded-xl bg-red-950/40 border border-red-800 text-red-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{loadError}</span>
        </div>
      )}

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
        <span className="text-[11px] font-mono text-[#9EA3AA]">
          {pendingCount} pending · {refunds.length} total
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
              <th className="py-3 px-4">Refund Ref</th>
              <th className="py-3 px-4">Customer</th>
              <th className="py-3 px-4">Amount</th>
              <th className="py-3 px-4">Reason</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-current/10">
            {refunds.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 px-4 text-center text-[#9EA3AA] text-xs">
                  No refunds on record.
                </td>
              </tr>
            )}
            {refunds.map((refund) => (
              <tr
                key={refund.id}
                className={`transition-colors ${
                  isDark ? 'hover:bg-[#1A140E]' : 'hover:bg-[#FAF4EB]'
                }`}
              >
                <td className="py-3.5 px-4 font-mono font-medium">
                  {refund.id.slice(0, 8)}
                  <div className="text-[10px] text-[#9EA3AA]">{refund.internalOrderId}</div>
                </td>
                <td className="py-3.5 px-4">
                  <div className="font-medium">{refund.userName || '—'}</div>
                  <div className="text-[11px] text-[#9EA3AA]">{refund.userEmail || '—'}</div>
                </td>
                <td className="py-3.5 px-4 font-serif font-bold text-sm">
                  ₹{(refund.amountMinor / 100).toLocaleString('en-IN')}
                </td>
                <td className="py-3.5 px-4 max-w-xs text-[11px] text-[#9EA3AA]">
                  {refund.reason || '—'}
                </td>
                <td className="py-3.5 px-4">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono border uppercase ${
                      refund.status === 'processed'
                        ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                        : refund.status === 'failed'
                          ? 'bg-red-500/15 text-red-400 border-red-500/30'
                          : 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                    }`}
                  >
                    {refund.status}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-right">
                  {refund.status === 'pending' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleApprove(refund)}
                      isLoading={processingId === refund.id}
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1" />
                      Approve &amp; Issue
                    </Button>
                  ) : (
                    <span className="text-[10px] font-mono text-[#9EA3AA]">
                      {refund.status === 'processed' ? 'Issued' : 'No action'}
                    </span>
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
