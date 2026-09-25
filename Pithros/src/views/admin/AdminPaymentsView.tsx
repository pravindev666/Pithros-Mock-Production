import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  RefreshCw,
  Search,
  Filter,
  ArrowUpRight,
  ShieldAlert,
  CheckCircle2,
  Clock,
  RotateCcw,
  AlertTriangle,
  Receipt,
  Download,
  Settings,
  Zap,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useTheme } from '../../context/ThemeContext';
import { paymentService } from '../../services/payment/paymentService';
import { PaymentRecord, PaymentStatus, PaymentGatewayConfig } from '../../types';

interface AdminPaymentsViewProps {
  onNavigate?: (route: string) => void;
}

export const AdminPaymentsView: React.FC<AdminPaymentsViewProps> = ({ onNavigate }) => {
  const { isDark } = useTheme();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [config, setConfig] = useState<PaymentGatewayConfig>(paymentService.getConfig());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadData = () => {
    setPayments(paymentService.getPayments());
    setConfig(paymentService.getConfig());
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleGateway = (gateway: 'razorpay' | 'cashfree') => {
    const updated = paymentService.setConfig({ activeGateway: gateway });
    setConfig(updated);
    setActionSuccess(`Active runtime gateway switched to ${gateway.toUpperCase()}`);
    setTimeout(() => setActionSuccess(null), 3500);
  };

  const handleSimulateWebhook = async () => {
    const samplePayload = JSON.stringify({
      event: 'payment.captured',
      timestamp: Date.now(),
      amount: 2499,
    });
    const res = await paymentService.handleWebhook({
      gateway: config.activeGateway,
      rawPayload: samplePayload,
      signature: `${config.activeGateway}_wh_sig_${Date.now()}`,
    });
    loadData();
    setActionSuccess(`Simulated Webhook verified & processed: ${res.message}`);
    setTimeout(() => setActionSuccess(null), 3500);
  };

  const filteredPayments = payments.filter((p) => {
    const matchSearch =
      p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.gatewayOrderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.memorialName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.userEmail?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const getStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case 'success':
        return 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30';
      case 'pending':
      case 'processing':
        return 'bg-amber-500/15 text-amber-500 border-amber-500/30';
      case 'refunded':
      case 'partially_refunded':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      case 'refund_requested':
      case 'refund_processing':
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
            Payment ledger contains simulated transactions and gateway sandboxes. No actual card or banking data is stored.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSimulateWebhook}>
            <Zap className="w-3.5 h-3.5 mr-1 text-amber-500" />
            Simulate Webhook Event
          </Button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs">
          {actionSuccess}
        </div>
      )}

      {/* Header & Gateway Switcher */}
      <div
        className={`pb-4 border-b flex flex-col md:flex-row md:items-center justify-between gap-4 ${
          isDark ? 'border-[#202C40]' : 'border-[#E5DED2]'
        }`}
      >
        <div>
          <span
            className={`text-[10px] font-mono uppercase tracking-wider ${
              isDark ? 'text-[#B99452]' : 'text-[#23324A]'
            }`}
          >
            Financial Operations Desk
          </span>
          <h1
            className={`text-xl font-serif mt-0.5 ${
              isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
            }`}
          >
            Payments & Gateway Reconciliation
          </h1>
        </div>

        {/* Runtime Gateway Selection */}
        <div className="flex items-center gap-3">
          <div
            className={`p-1 rounded-xl border flex items-center gap-1 text-xs ${
              isDark ? 'bg-[#182337] border-[#202C40]' : 'bg-[#FCFAF5] border-[#E5DED2]'
            }`}
          >
            <span className="text-[10px] uppercase font-mono px-2 text-[#9EA3AA]">
              Active Gateway:
            </span>
            <button
              type="button"
              onClick={() => handleToggleGateway('razorpay')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                config.activeGateway === 'razorpay'
                  ? 'bg-[#B99452] text-black font-semibold shadow'
                  : 'text-[#9EA3AA] hover:text-[#F8F5EE]'
              }`}
            >
              Razorpay
            </button>
            <button
              type="button"
              onClick={() => handleToggleGateway('cashfree')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                config.activeGateway === 'cashfree'
                  ? 'bg-[#B99452] text-black font-semibold shadow'
                  : 'text-[#9EA3AA] hover:text-[#F8F5EE]'
              }`}
            >
              Cashfree
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search
            className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${
              isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
            }`}
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Payment ID, Order, Memorial…"
            className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs border transition-colors ${
              isDark
                ? 'bg-[#182337] border-[#202C40] text-[#F8F5EE] focus:border-[#B99452]'
                : 'bg-[#FCFAF5] border-[#E5DED2] text-[#20242A] focus:border-[#23324A]'
            } outline-none`}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`px-3 py-2 rounded-xl text-xs border outline-none ${
              isDark
                ? 'bg-[#182337] border-[#202C40] text-[#F8F5EE]'
                : 'bg-[#FCFAF5] border-[#E5DED2] text-[#20242A]'
            }`}
          >
            <option value="all">All Payment States</option>
            <option value="success">Success</option>
            <option value="pending">Pending</option>
            <option value="refund_requested">Refund Requested</option>
            <option value="refunded">Refunded</option>
            <option value="failed">Failed / Cancelled</option>
          </select>
        </div>
      </div>

      {/* Payments Table */}
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
              <th className="py-3 px-4">Internal Payment ID</th>
              <th className="py-3 px-4">Gateway / Order ID</th>
              <th className="py-3 px-4">Amount</th>
              <th className="py-3 px-4">Customer & Memorial</th>
              <th className="py-3 px-4">Plan</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Created / Completed</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-current/10">
            {filteredPayments.map((p) => (
              <tr
                key={p.id}
                className={`transition-colors ${
                  isDark ? 'hover:bg-[#1A140E]' : 'hover:bg-[#FAF4EB]'
                }`}
              >
                <td className="py-3.5 px-4 font-mono font-medium">
                  {p.id}
                  {p.invoiceId && (
                    <div className="text-[10px] text-[#9EA3AA]">{p.invoiceId}</div>
                  )}
                </td>
                <td className="py-3.5 px-4 font-mono">
                  <div className="uppercase font-bold text-[10px] text-[#B99452]">
                    {p.gateway}
                  </div>
                  <div className="text-[11px] truncate max-w-[130px] opacity-75">
                    {p.gatewayOrderId}
                  </div>
                </td>
                <td className="py-3.5 px-4 font-serif font-bold text-sm">
                  {p.formattedAmount}
                </td>
                <td className="py-3.5 px-4">
                  <div className="font-medium">{p.memorialName || 'Memorial'}</div>
                  <div className="text-[11px] text-[#9EA3AA]">{p.userName}</div>
                </td>
                <td className="py-3.5 px-4 text-[11px]">{p.planName}</td>
                <td className="py-3.5 px-4">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono border uppercase ${getStatusBadge(
                      p.status
                    )}`}
                  >
                    {p.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-[11px] font-mono text-[#9EA3AA]">
                  <div>{new Date(p.createdAt).toLocaleDateString()}</div>
                  <div className="text-[9px]">
                    {p.completedAt ? new Date(p.completedAt).toLocaleTimeString() : 'Incomplete'}
                  </div>
                </td>
                <td className="py-3.5 px-4 text-right space-x-2">
                  {p.invoiceId && (
                    <button
                      type="button"
                      onClick={() => onNavigate?.(`/payment/receipt/${p.invoiceId}`)}
                      className={`p-1.5 rounded hover:bg-white/10 ${
                        isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                      }`}
                      title="View Tax Receipt"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredPayments.length === 0 && (
          <div className="p-8 text-center text-xs text-[#9EA3AA]">
            No payment records found matching the filter criteria.
          </div>
        )}
      </div>
    </div>
  );
};
