import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  ShieldCheck,
  ShieldAlert,
  Clock,
  MapPin,
  CheckCircle2,
  X,
  Eye,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../../components/ui/Button';
import { providersApi, type AdminProvider } from '../../services/api/providers';

const STATUS_LABELS: Record<string, string> = {
  approved: 'Approved Partner',
  pending: 'Pending Review',
  suspended: 'Suspended',
  rejected: 'Declined',
};

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export const AdminProvidersView: React.FC = () => {
  const { isDark } = useTheme();

  const [providers, setProviders] = useState<AdminProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedProvider, setSelectedProvider] = useState<AdminProvider | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const { providers: rows } = await providersApi.listAdminProviders();
      setProviders(rows);
      setLoadError(null);
    } catch {
      setLoadError('The provider queue could not be loaded.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredProviders = providers.filter((p) => {
    const matchesSearch =
      !searchQuery.trim() ||
      p.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.city.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const applyDecision = async (
    provider: AdminProvider,
    action: 'approve' | 'suspend' | 'request-info',
  ) => {
    setBusyId(provider.id);
    try {
      const updated =
        action === 'approve'
          ? await providersApi.approveProvider(provider.id, 'Credentials verified.')
          : action === 'suspend'
          ? await providersApi.suspendProvider(provider.id, 'Paused by the provider desk.')
          : await providersApi.requestProviderInfo(
              provider.id,
              'Additional credentials are required.',
            );
      setProviders((prev) => prev.map((p) => (p.id === provider.id ? updated : p)));
      setSelectedProvider((prev) => (prev && prev.id === provider.id ? updated : prev));
      setNotice(
        action === 'approve'
          ? `${updated.businessName} approved and published.`
          : action === 'suspend'
          ? `${updated.businessName} suspended and hidden from the directory.`
          : `More information requested from ${updated.businessName}.`,
      );
      setTimeout(() => setNotice(null), 4000);
    } catch {
      setNotice('That change could not be saved. Please try again.');
      setTimeout(() => setNotice(null), 4000);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-inherit">
        <div>
          <h1
            className={`text-2xl sm:text-3xl font-serif ${
              isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
            }`}
          >
            Farewell Network Providers Desk
          </h1>
          <p
            className={`text-xs sm:text-sm mt-1 ${
              isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
            }`}
          >
            Vet licenses, enforce strict bereavement standards, and audit provider credentials.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-3 py-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-400">
            {providers.length} Registered Care Partners
          </span>
        </div>
      </div>

      {notice && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{notice}</span>
        </motion.div>
      )}

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-stone-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search provider, contact, or city…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-9 pr-4 py-2 rounded-xl border text-xs focus:outline-none ${
              isDark
                ? 'border-[#202C40] bg-[#16120D] text-[#F8F5EE] focus:border-[#B99452]'
                : 'border-[#E5DED2] bg-white text-[#20242A] focus:border-[#23324A]'
            }`}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {['all', 'approved', 'pending', 'suspended'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs capitalize transition-all whitespace-nowrap ${
                statusFilter === st
                  ? isDark
                    ? 'bg-[#B99452] text-[#111820] font-medium'
                    : 'bg-[#23324A] text-white font-medium'
                  : isDark
                  ? 'border border-[#202C40] text-[#9EA3AA] hover:text-[#F8F5EE]'
                  : 'border border-[#E5DED2] text-[#7D766D] hover:text-[#20242A]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Providers Table */}
      <div
        className={`rounded-2xl border overflow-hidden ${
          isDark ? 'border-[#202C40] bg-[#182337]' : 'border-[#E5DED2] bg-[#FCFAF5]'
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr
                className={`border-b font-mono uppercase tracking-wider text-[10px] ${
                  isDark
                    ? 'border-[#202C40] bg-[#16120D] text-[#9EA3AA]'
                    : 'border-[#E5DED2] bg-[#F4ECE1] text-[#7D766D]'
                }`}
              >
                <th className="py-3 px-4">Provider Organization</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Region</th>
                <th className="py-3 px-4">Catalogue</th>
                <th className="py-3 px-4">Trust Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-inherit">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-stone-500">
                    Loading the partner queue…
                  </td>
                </tr>
              ) : loadError ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-stone-500">
                    {loadError}
                  </td>
                </tr>
              ) : filteredProviders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-stone-500">
                    No providers match your search.
                  </td>
                </tr>
              ) : (
                filteredProviders.map((p) => (
                  <tr
                    key={p.id}
                    className={`transition-colors ${
                      isDark ? 'hover:bg-[#1A150F]' : 'hover:bg-[#F9F4EB]'
                    }`}
                  >
                    <td className="py-3.5 px-4 font-medium">
                      <span className={isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'}>
                        {p.businessName}
                      </span>
                      <span className="text-[10px] font-mono opacity-60 block mt-0.5">
                        {p.category || 'Uncategorised'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span>{p.contactName || '—'}</span>
                      <span className="text-[10px] opacity-60 font-mono block mt-0.5">
                        {p.phone || p.email || '—'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-stone-400" />
                        <span>{p.city || '—'}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono">
                      {p.serviceCount} services
                      {p.openLeadCount > 0 && (
                        <span className="block text-[10px] text-amber-400">
                          {p.openLeadCount} open enquiries
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {p.status === 'approved' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <ShieldCheck className="w-3 h-3" />
                          {STATUS_LABELS.approved}
                        </span>
                      ) : p.status === 'pending' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <Clock className="w-3 h-3" />
                          {STATUS_LABELS.pending}
                        </span>
                      ) : p.status === 'suspended' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                          <ShieldAlert className="w-3 h-3" />
                          {STATUS_LABELS.suspended}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-stone-500/10 text-stone-400 border border-stone-500/20">
                          {STATUS_LABELS.rejected}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedProvider(p)}
                          className={`p-1.5 rounded-lg border text-xs transition-colors ${
                            isDark
                              ? 'border-[#202C40] text-[#9EA3AA] hover:text-[#F8F5EE]'
                              : 'border-[#E5DED2] text-[#7D766D] hover:text-[#20242A]'
                          }`}
                          title="Inspect credentials"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {p.status !== 'approved' ? (
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={busyId === p.id}
                            onClick={() => applyDecision(p, 'approve')}
                          >
                            Approve
                          </Button>
                        ) : (
                          <button
                            type="button"
                            disabled={busyId === p.id}
                            onClick={() => applyDecision(p, 'suspend')}
                            className="p-1.5 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                            title="Suspend partner"
                          >
                            Suspend
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Provider Detail Modal */}
      <AnimatePresence>
        {selectedProvider && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-lg rounded-3xl border shadow-2xl p-6 sm:p-8 space-y-5 ${
                isDark ? 'bg-[#182337] border-[#202C40]' : 'bg-[#FCFAF5] border-[#E5DED2]'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2
                    className={`text-lg font-serif ${
                      isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                    }`}
                  >
                    {selectedProvider.businessName}
                  </h2>
                  <p
                    className={`text-xs mt-0.5 ${
                      isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                    }`}
                  >
                    {selectedProvider.contactName || 'Contact not supplied'} •{' '}
                    {selectedProvider.city || 'Location not supplied'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedProvider(null)}
                  className="p-1 text-stone-400 hover:text-stone-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div
                className={`p-4 rounded-xl border text-xs space-y-2 ${
                  isDark ? 'border-[#202C40] bg-[#16120D]' : 'border-[#E5DED2] bg-white'
                }`}
              >
                <div className="flex justify-between">
                  <span className="text-stone-400">Contact phone:</span>
                  <span className="font-mono">{selectedProvider.phone || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Dispatch email:</span>
                  <span className="font-mono">{selectedProvider.email || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Credential review:</span>
                  <span className="capitalize">
                    {selectedProvider.verificationState.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Submitted:</span>
                  <span>
                    {selectedProvider.submittedAt
                      ? formatDate(selectedProvider.submittedAt)
                      : 'Not submitted'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Applied:</span>
                  <span>{formatDate(selectedProvider.createdAt)}</span>
                </div>
                {selectedProvider.statusReason && (
                  <div className="pt-2 border-t border-inherit">
                    <span className="text-stone-400 block">Last decision note:</span>
                    <span>{selectedProvider.statusReason}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedProvider(null)}>
                  Close
                </Button>
                {selectedProvider.status === 'pending' && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busyId === selectedProvider.id}
                    onClick={() => applyDecision(selectedProvider, 'request-info')}
                  >
                    Request more info
                  </Button>
                )}
                {selectedProvider.status !== 'approved' ? (
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={busyId === selectedProvider.id}
                    onClick={() => applyDecision(selectedProvider, 'approve')}
                  >
                    Approve &amp; publish
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busyId === selectedProvider.id}
                    onClick={() => applyDecision(selectedProvider, 'suspend')}
                  >
                    Suspend listing
                  </Button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
