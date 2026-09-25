import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Building2,
  Search,
  Filter,
  ShieldCheck,
  ShieldAlert,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  X,
  FileText,
  Eye,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../../components/ui/Button';

interface ProviderRecord {
  id: string;
  name: string;
  category: string;
  directorName: string;
  email: string;
  phone: string;
  location: string;
  verificationStatus: 'verified' | 'pending' | 'suspended';
  activeListingsCount: number;
  joinedDate: string;
}

export const AdminProvidersView: React.FC = () => {
  const { isDark } = useTheme();

  const [providers, setProviders] = useState<ProviderRecord[]>([
    {
      id: 'prov-1',
      name: 'Shanti Memorial Care & Sacred Groves',
      category: 'Funeral Care & Grove Planting',
      directorName: 'Rajesh Varma',
      email: 'partner@pithros.org',
      phone: '+91 80 2345 6789',
      location: 'Bengaluru, Karnataka',
      verificationStatus: 'verified',
      activeListingsCount: 3,
      joinedDate: 'Jan 2025',
    },
    {
      id: 'prov-2',
      name: 'Sahyadri Ecological Remembrance Trust',
      category: 'Native Tree Memorials',
      directorName: 'Dr. Anand Joshi',
      email: 'anand.j@sahyadri.org',
      phone: '+91 82 1234 5678',
      location: 'Wayanad / Coorg',
      verificationStatus: 'verified',
      activeListingsCount: 2,
      joinedDate: 'Feb 2025',
    },
    {
      id: 'prov-3',
      name: 'Deccan Granite Memorial Craft',
      category: 'Stone Masonry & Keepsakes',
      directorName: 'K. Srinivasan',
      email: 'srinivasan@deccangranite.in',
      phone: '+91 40 4455 6677',
      location: 'Hyderabad, Telangana',
      verificationStatus: 'pending',
      activeListingsCount: 1,
      joinedDate: 'Mar 2025',
    },
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedProvider, setSelectedProvider] = useState<ProviderRecord | null>(null);
  const [auditNotice, setAuditNotice] = useState<string | null>(null);

  const filteredProviders = providers.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.directorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.verificationStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleUpdateStatus = (id: string, status: ProviderRecord['verificationStatus']) => {
    setProviders((prev) =>
      prev.map((p) => (p.id === id ? { ...p, verificationStatus: status } : p))
    );
    setAuditNotice(`Provider status updated to ${status}. Recorded in Trust Ledger.`);
    setTimeout(() => setAuditNotice(null), 3000);
    if (selectedProvider && selectedProvider.id === id) {
      setSelectedProvider((prev) => (prev ? { ...prev, verificationStatus: status } : null));
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

      {auditNotice && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{auditNotice}</span>
        </motion.div>
      )}

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-stone-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search provider, director, or city…"
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
          {['all', 'verified', 'pending', 'suspended'].map((st) => (
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
                <th className="py-3 px-4">Director / Contact</th>
                <th className="py-3 px-4">Region</th>
                <th className="py-3 px-4">Listings</th>
                <th className="py-3 px-4">Trust Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-inherit">
              {filteredProviders.length === 0 ? (
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
                        {p.name}
                      </span>
                      <span className="text-[10px] font-mono opacity-60 block mt-0.5">
                        {p.category}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span>{p.directorName}</span>
                      <span className="text-[10px] opacity-60 font-mono block mt-0.5">
                        {p.phone}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-stone-400" />
                        <span>{p.location}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono">
                      {p.activeListingsCount} services
                    </td>

                    <td className="py-3.5 px-4">
                      {p.verificationStatus === 'verified' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <ShieldCheck className="w-3 h-3" />
                          Verified Partner
                        </span>
                      ) : p.verificationStatus === 'pending' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <Clock className="w-3 h-3" />
                          Pending Review
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                          Suspended
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
                        {p.verificationStatus !== 'verified' ? (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleUpdateStatus(p.id, 'verified')}
                          >
                            Approve
                          </Button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(p.id, 'suspended')}
                            className="p-1.5 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10"
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
                    {selectedProvider.name}
                  </h2>
                  <p
                    className={`text-xs mt-0.5 ${
                      isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                    }`}
                  >
                    Director: {selectedProvider.directorName} • {selectedProvider.location}
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
                  <span className="text-stone-400">Official Helpline:</span>
                  <span className="font-mono">{selectedProvider.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Dispatch Email:</span>
                  <span className="font-mono">{selectedProvider.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Partnership Inception:</span>
                  <span>{selectedProvider.joinedDate}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedProvider(null)}>
                  Close
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
