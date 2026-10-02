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
  Plus,
  X,
  Award,
  Calendar,
  ShieldCheck,
  UserCheck,
  Heart,
  FileText,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useTheme } from '../../context/ThemeContext';
import { paymentService } from '../../services/payment/paymentService';
import { billingApi } from '../../services/api/billing';
import { DEMO_MODE } from '../../lib/config';
import { PaymentRecord, PaymentStatus, PaymentGatewayConfig } from '../../types';

interface AdminPaymentsViewProps {
  onNavigate?: (route: string) => void;
}

export interface AdminSubscriptionRecord {
  id: string;
  userEmail: string;
  userName: string;
  planName: string;
  planCode: string;
  status: string;
  gateway: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  maxMemorials: number;
  assignedMemorialsCount: number;
  memorialName?: string;
  auditReason?: string;
}

function mapAdminPayment(p: any): PaymentRecord {
  const amountMinor = typeof p?.amountMinor === 'number' ? p.amountMinor : 0;
  return {
    id: p?.id ?? '',
    userId: '',
    userName: p?.userName ?? '',
    userEmail: p?.userEmail ?? '',
    memorialId: p?.memorialId ?? '',
    planId: p?.planPriceId ?? '',
    planName: p?.planPriceId ?? '',
    amount: amountMinor / 100,
    formattedAmount: `₹${(amountMinor / 100).toLocaleString('en-IN')}`,
    currency: p?.currency ?? 'INR',
    gateway: p?.gateway === 'cashfree' ? 'cashfree' : 'razorpay',
    gatewayOrderId: p?.gatewayOrderId ?? p?.internalOrderId ?? '',
    status: (p?.status ?? 'pending') as PaymentStatus,
    createdAt: p?.createdAt ?? new Date().toISOString(),
    updatedAt: p?.paidAt ?? p?.createdAt ?? new Date().toISOString(),
    completedAt: p?.paidAt ?? undefined,
  };
}

export const AdminPaymentsView: React.FC<AdminPaymentsViewProps> = ({ onNavigate }) => {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<'transactions' | 'entitlements'>('transactions');
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [subscriptions, setSubscriptions] = useState<AdminSubscriptionRecord[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [config, setConfig] = useState<PaymentGatewayConfig>(
    DEMO_MODE
      ? paymentService.getConfig()
      : {
          activeGateway: 'cashfree',
          mode: 'live',
          webhookSecretConfigured: true,
          signatureVerificationStrict: true,
        },
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Manual Grant Modal State
  const [isGrantModalOpen, setIsGrantModalOpen] = useState(false);
  const [grantEmail, setGrantEmail] = useState('');
  const [grantPlan, setGrantPlan] = useState<'MEMORIAL_CARE' | 'FAMILY_ARCHIVE'>('MEMORIAL_CARE');
  const [grantDurationMonths, setGrantDurationMonths] = useState<number>(12);
  const [grantReason, setGrantReason] = useState('');
  const [isSubmittingGrant, setIsSubmittingGrant] = useState(false);

  // Revoke confirmation modal
  const [revokingSub, setRevokingSub] = useState<AdminSubscriptionRecord | null>(null);
  const [revokeReason, setRevokeReason] = useState('');

  const loadData = async () => {
    try {
      const overview = await billingApi.adminGetOverview();
      const rows = Array.isArray(overview?.recentPayments) ? overview.recentPayments : [];
      setPayments(rows.map(mapAdminPayment));
      setSubscriptions(
        Array.isArray(overview?.recentSubscriptions) ? overview.recentSubscriptions : [],
      );
      setLoadError(null);
    } catch (err) {
      // No client-side ledger to fall back to: if the server cannot be read, the
      // operator must see an honest error, never a fabricated transaction list.
      setPayments([]);
      setSubscriptions([]);
      setLoadError(
        err instanceof Error ? err.message : 'Could not load billing data from the server.',
      );
    }
    if (DEMO_MODE) {
      setConfig(paymentService.getConfig());
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleGateway = (gateway: 'razorpay' | 'cashfree') => {
    if (!DEMO_MODE) return;
    const updated = paymentService.setConfig({ activeGateway: gateway });
    setConfig(updated);
    setActionSuccess(`Active runtime gateway switched to ${gateway.toUpperCase()}`);
    setTimeout(() => setActionSuccess(null), 3500);
  };

  const handleSimulateWebhook = async () => {
    if (!DEMO_MODE) return;
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

  // Submit Manual Admin Grant
  const handleExecuteGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantEmail || !grantReason) {
      alert('Please provide target user email and mandatory audit justification.');
      return;
    }

    setIsSubmittingGrant(true);
    try {
      await billingApi.adminGrantEntitlement({
        targetUserEmail: grantEmail.trim().toLowerCase(),
        planCode: grantPlan,
        durationMonths: grantDurationMonths,
        reason: grantReason.trim(),
      });
      // Re-read from the server; never assert a grant the backend did not confirm.
      await loadData();
      setIsGrantModalOpen(false);
      setGrantEmail('');
      setGrantReason('');
      setActionSuccess(
        `Complimentary preservation plan granted to ${grantEmail.trim().toLowerCase()} (${grantDurationMonths} mos).`,
      );
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      alert(err?.message || 'Failed to grant entitlement');
    } finally {
      setIsSubmittingGrant(false);
    }
  };

  // Extend Subscription
  const handleExtendSub = async (sub: AdminSubscriptionRecord) => {
    const reason = prompt(`Enter audit reason to extend ${sub.userEmail} by 12 months:`, 'Annual customer support partnership extension');
    if (!reason) return;

    try {
      await billingApi.adminExtendSubscription(sub.id, {
        additionalMonths: 12,
        reason,
      });
      await loadData();
      setActionSuccess(`Extended preservation subscription for ${sub.userEmail} by 12 months.`);
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err: any) {
      alert(err?.message || 'Failed to extend subscription');
    }
  };

  // Revoke Subscription
  const handleConfirmRevoke = async () => {
    if (!revokingSub || !revokeReason) {
      alert('Audit reason is required to revoke an entitlement.');
      return;
    }

    try {
      await billingApi.adminRevokeSubscription(revokingSub.id, { reason: revokeReason });
      await loadData();
      setActionSuccess(`Preservation subscription for ${revokingSub.userEmail} has been cancelled. Memorial data is safely retained.`);
      setRevokingSub(null);
      setRevokeReason('');
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      alert(err?.message || 'Failed to revoke subscription');
    }
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

  const filteredSubscriptions = subscriptions.filter((s) => {
    return (
      s.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.planName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.gateway.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const getStatusBadge = (status: PaymentStatus | string) => {
    switch (status) {
      case 'success':
      case 'active':
        return 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30';
      case 'pending':
      case 'processing':
      case 'grace':
        return 'bg-amber-500/15 text-amber-500 border-amber-500/30';
      case 'refunded':
      case 'partially_refunded':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      case 'refund_requested':
      case 'refund_processing':
        return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
      case 'failed':
      case 'cancelled':
      case 'expired_read_only':
        return 'bg-red-500/15 text-red-400 border-red-500/30';
      default:
        return 'bg-stone-500/15 text-stone-400 border-stone-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Honesty Operational Control Plane Banner */}
      <div
        className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs ${
          isDark
            ? 'bg-[#16120E] border-[#3D3328] text-[#D9D2C6]'
            : 'bg-[#FFF8EE] border-[#E8DEC8] text-[#5A4E3E]'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-amber-500/20 text-amber-500">
            CONTROL PLANE
          </span>
          <span>
            Financial Operations & Entitlement Desk. Both Cashfree automated payments and Admin manual grants converge on PostgreSQL.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSimulateWebhook}>
            <Zap className="w-3.5 h-3.5 mr-1 text-amber-500" />
            Simulate Cashfree Webhook
          </Button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {loadError && (
        <div className="p-3 rounded-xl bg-red-950/40 border border-red-800 text-red-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{loadError}</span>
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
            Financial & Entitlement Engine
          </span>
          <h1
            className={`text-xl font-serif mt-0.5 ${
              isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
            }`}
          >
            Billing Control & Gateway Reconciliation
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
              Primary Gateway:
            </span>
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
          </div>
        </div>
      </div>

      {/* Control Plane Mode Navigation Tabs */}
      <div className="flex items-center justify-between border-b pb-1 gap-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('transactions')}
            className={`px-4 py-2 text-xs font-medium rounded-xl border transition-all ${
              activeTab === 'transactions'
                ? isDark
                  ? 'bg-[#B99452] text-black border-[#B99452] font-semibold'
                  : 'bg-[#23324A] text-white border-[#23324A] font-semibold'
                : isDark
                ? 'border-transparent text-[#9EA3AA] hover:text-[#F8F5EE]'
                : 'border-transparent text-[#554F48] hover:text-[#20242A]'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 inline mr-1.5" />
            Transactions & Gateway Ledger ({payments.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('entitlements')}
            className={`px-4 py-2 text-xs font-medium rounded-xl border transition-all ${
              activeTab === 'entitlements'
                ? isDark
                  ? 'bg-[#B99452] text-black border-[#B99452] font-semibold'
                  : 'bg-[#23324A] text-white border-[#23324A] font-semibold'
                : isDark
                ? 'border-transparent text-[#9EA3AA] hover:text-[#F8F5EE]'
                : 'border-transparent text-[#554F48] hover:text-[#20242A]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 inline mr-1.5" />
            Entitlement Controls & Manual Grants ({subscriptions.length})
          </button>
        </div>

        {activeTab === 'entitlements' && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsGrantModalOpen(true)}
            className="flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Grant Complimentary Plan
          </Button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search
            className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${
              isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
            }`}
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              activeTab === 'transactions'
                ? 'Search by Payment ID, Order, Memorial…'
                : 'Search by User Email, Plan, or Gateway…'
            }
            className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs border transition-colors ${
              isDark
                ? 'bg-[#182337] border-[#202C40] text-[#F8F5EE] focus:border-[#B99452]'
                : 'bg-[#FCFAF5] border-[#E5DED2] text-[#20242A] focus:border-[#23324A]'
            } outline-none`}
          />
        </div>

        {activeTab === 'transactions' && (
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
        )}
      </div>

      {/* TAB 1: Transactions & Gateway Ledger */}
      {activeTab === 'transactions' && (
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
      )}

      {/* TAB 2: Entitlement Controls & Manual Grants */}
      {activeTab === 'entitlements' && (
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
                <th className="py-3 px-4">Steward Account</th>
                <th className="py-3 px-4">Preservation Plan</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4">Capacity / Slots</th>
                <th className="py-3 px-4">Expiry Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Admin Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-current/10">
              {filteredSubscriptions.map((s) => (
                <tr
                  key={s.id}
                  className={`transition-colors ${
                    isDark ? 'hover:bg-[#1A140E]' : 'hover:bg-[#FAF4EB]'
                  }`}
                >
                  <td className="py-3.5 px-4 font-medium">
                    <div className="font-semibold">{s.userName}</div>
                    <div className="text-[11px] font-mono text-[#9EA3AA]">{s.userEmail}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-serif font-bold text-sm block">{s.planName}</span>
                    {s.auditReason && (
                      <span className="text-[10px] text-amber-500 block truncate max-w-xs">
                        Audit Note: {s.auditReason}
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                        s.gateway === 'admin_grant'
                          ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {s.gateway === 'admin_grant' ? 'ADMIN COMP' : 'CASHFREE'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-[11px] font-mono">
                    {s.assignedMemorialsCount} / {s.maxMemorials} memorial slots
                    {s.memorialName && (
                      <div className="text-[10px] text-[#9EA3AA] truncate max-w-[150px]">
                        {s.memorialName}
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px]">
                    {new Date(s.currentPeriodEnd).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono border uppercase ${getStatusBadge(
                        s.status
                      )}`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-2">
                    <button
                      type="button"
                      onClick={() => handleExtendSub(s)}
                      className={`px-2.5 py-1 text-[11px] font-medium rounded-lg border transition-all ${
                        isDark
                          ? 'border-[#3D3328] hover:bg-[#3D3328] text-amber-400'
                          : 'border-[#E5DED2] hover:bg-[#E5DED2] text-[#8C5C0F]'
                      }`}
                      title="Extend duration by 12 months"
                    >
                      Extend (+12m)
                    </button>
                    {s.status === 'active' && (
                      <button
                        type="button"
                        onClick={() => {
                          setRevokingSub(s);
                          setRevokeReason('');
                        }}
                        className="px-2.5 py-1 text-[11px] font-medium rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all"
                        title="Revoke entitlement early"
                      >
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredSubscriptions.length === 0 && (
            <div className="p-8 text-center text-xs text-[#9EA3AA]">
              No entitlement records found matching the filter criteria.
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: Grant Complimentary Preservation Plan */}
      {isGrantModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div
            className={`w-full max-w-lg rounded-3xl border shadow-2xl p-6 sm:p-8 space-y-6 ${
              isDark ? 'bg-[#14100C] border-[#2E241A] text-[#F8F5EE]' : 'bg-[#FCFAF5] border-[#E5DED2] text-[#20242A]'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <span
                  className={`text-[9px] uppercase font-mono tracking-wider ${
                    isDark ? 'text-[#B99452]' : 'text-[#23324A]'
                  }`}
                >
                  Privileged Admin Action
                </span>
                <h2 className="text-xl font-serif mt-0.5">Grant Complimentary Plan</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsGrantModalOpen(false)}
                className="p-1 rounded-full hover:bg-white/10 text-[#9EA3AA]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteGrant} className="space-y-4 text-xs">
              {/* Target User Email */}
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider mb-1 opacity-75">
                  Target Steward Email *
                </label>
                <input
                  type="email"
                  required
                  value={grantEmail}
                  onChange={(e) => setGrantEmail(e.target.value)}
                  placeholder="steward@example.com"
                  className={`w-full px-3 py-2 rounded-xl border outline-none text-xs ${
                    isDark
                      ? 'bg-[#182337] border-[#202C40] text-[#F8F5EE] focus:border-[#B99452]'
                      : 'bg-[#FCFAF5] border-[#E5DED2] text-[#20242A] focus:border-[#23324A]'
                  }`}
                />
              </div>

              {/* Plan Choice & Duration */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider mb-1 opacity-75">
                    Plan Tier *
                  </label>
                  <select
                    value={grantPlan}
                    onChange={(e) => setGrantPlan(e.target.value as any)}
                    className={`w-full px-3 py-2 rounded-xl border outline-none text-xs ${
                      isDark ? 'bg-[#182337] border-[#202C40] text-[#F8F5EE]' : 'bg-[#FCFAF5] border-[#E5DED2] text-[#20242A]'
                    }`}
                  >
                    <option value="MEMORIAL_CARE">Memorial Care (1 Memorial)</option>
                    <option value="FAMILY_ARCHIVE">Family Archive (5 Memorials)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider mb-1 opacity-75">
                    Duration *
                  </label>
                  <select
                    value={grantDurationMonths}
                    onChange={(e) => setGrantDurationMonths(parseInt(e.target.value, 10))}
                    className={`w-full px-3 py-2 rounded-xl border outline-none text-xs ${
                      isDark ? 'bg-[#182337] border-[#202C40] text-[#F8F5EE]' : 'bg-[#FCFAF5] border-[#E5DED2] text-[#20242A]'
                    }`}
                  >
                    <option value={3}>3 Months</option>
                    <option value={6}>6 Months</option>
                    <option value={12}>12 Months (1 Year)</option>
                    <option value={24}>24 Months (2 Years)</option>
                  </select>
                </div>
              </div>

              {/* Mandatory Reason */}
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider mb-1 opacity-75">
                  Mandatory Audit Justification *
                </label>
                <textarea
                  required
                  rows={2}
                  value={grantReason}
                  onChange={(e) => setGrantReason(e.target.value)}
                  placeholder="e.g. Compassionate bereavement grant after support ticket #84102"
                  className={`w-full px-3 py-2 rounded-xl border outline-none text-xs resize-none ${
                    isDark
                      ? 'bg-[#182337] border-[#202C40] text-[#F8F5EE] focus:border-[#B99452]'
                      : 'bg-[#FCFAF5] border-[#E5DED2] text-[#20242A] focus:border-[#23324A]'
                  }`}
                />
              </div>

              {/* Real-time Audit Preview Box */}
              <div
                className={`p-3.5 rounded-2xl border space-y-1.5 font-mono text-[11px] ${
                  isDark ? 'bg-[#0E0B08] border-[#202C40] text-[#9EA3AA]' : 'bg-[#FCFAF5] border-[#E8DEC8] text-[#554F48]'
                }`}
              >
                <div className="flex justify-between">
                  <span>Authoritative Source:</span>
                  <span className="font-bold text-[#B99452]">ADMIN_GRANT</span>
                </div>
                <div className="flex justify-between">
                  <span>Customer Charge:</span>
                  <span className="text-emerald-500 font-bold">₹0.00 (Complimentary)</span>
                </div>
                <div className="flex justify-between">
                  <span>Preservation Term:</span>
                  <span>{grantDurationMonths} months from today</span>
                </div>
                <div className="flex justify-between">
                  <span>Audit Logging:</span>
                  <span>PostgreSQL Immutable Ledger</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsGrantModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isSubmittingGrant}
                >
                  Confirm & Grant Entitlement
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Revoke Confirmation Modal */}
      {revokingSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div
            className={`w-full max-w-md rounded-3xl border shadow-2xl p-6 sm:p-8 space-y-5 ${
              isDark ? 'bg-[#14100C] border-[#2E241A] text-[#F8F5EE]' : 'bg-[#FCFAF5] border-[#E5DED2] text-[#20242A]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/15 text-red-500 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-serif font-bold">Revoke Entitlement</h3>
                <p className="text-xs text-[#9EA3AA]">
                  Target: {revokingSub.userEmail} ({revokingSub.planName})
                </p>
              </div>
            </div>

            <p className="text-xs leading-relaxed opacity-85">
              Revoking will switch the preservation tier to cancelled.
              <strong> Zero Deletion Policy:</strong> All photographs, timeline milestones, and memorial content will be safely preserved in read-only status.
            </p>

            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider mb-1 opacity-75">
                Revocation Audit Reason *
              </label>
              <textarea
                required
                rows={2}
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder="Reason for early revocation…"
                className={`w-full px-3 py-2 rounded-xl border outline-none text-xs resize-none ${
                  isDark
                    ? 'bg-[#182337] border-[#202C40] text-[#F8F5EE]'
                    : 'bg-[#FCFAF5] border-[#E5DED2] text-[#20242A]'
                }`}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRevokingSub(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleConfirmRevoke}
              >
                Confirm Revocation
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
