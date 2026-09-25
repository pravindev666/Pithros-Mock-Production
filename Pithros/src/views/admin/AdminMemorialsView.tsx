import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Heart,
  Search,
  Filter,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Globe,
  ExternalLink,
  ChevronRight,
  MoreVertical,
  CheckCircle2,
  AlertTriangle,
  X,
  FileCheck,
  Eye,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../../components/ui/Button';

interface MemorialRecord {
  id: string;
  fullName: string;
  slug: string;
  stewardName: string;
  stewardEmail: string;
  createdDate: string;
  verificationStatus: 'approved' | 'pending' | 'rejected' | 'unverified';
  privacy: 'public' | 'unlisted' | 'private';
  memoriesCount: number;
  tributesCount: number;
  status: 'active' | 'suspended' | 'disputed';
}

export const AdminMemorialsView: React.FC = () => {
  const { isDark } = useTheme();

  const [memorials, setMemorials] = useState<MemorialRecord[]>([
    {
      id: 'mem-1',
      fullName: 'Dr. Arun Krishnan',
      slug: 'arun-krishnan',
      stewardName: 'Anita Krishnan',
      stewardEmail: 'anita.k@example.com',
      createdDate: '2025-01-15',
      verificationStatus: 'approved',
      privacy: 'public',
      memoriesCount: 14,
      tributesCount: 28,
      status: 'active',
    },
    {
      id: 'mem-2',
      fullName: 'Mary Thomas',
      slug: 'mary-thomas',
      stewardName: 'Joseph Thomas',
      stewardEmail: 'j.thomas@example.com',
      createdDate: '2025-02-10',
      verificationStatus: 'approved',
      privacy: 'public',
      memoriesCount: 9,
      tributesCount: 15,
      status: 'active',
    },
    {
      id: 'mem-3',
      fullName: 'Mohammed Rahman',
      slug: 'mohammed-rahman',
      stewardName: 'Amina Rahman',
      stewardEmail: 'amina.r@example.com',
      createdDate: '2025-03-01',
      verificationStatus: 'pending',
      privacy: 'unlisted',
      memoriesCount: 6,
      tributesCount: 11,
      status: 'active',
    },
    {
      id: 'mem-4',
      fullName: 'Gurpreet Singh',
      slug: 'gurpreet-singh',
      stewardName: 'Harpreet Singh',
      stewardEmail: 'h.singh@example.com',
      createdDate: '2025-03-12',
      verificationStatus: 'approved',
      privacy: 'public',
      memoriesCount: 18,
      tributesCount: 42,
      status: 'active',
    },
    {
      id: 'mem-5',
      fullName: 'Devraj Kapoor',
      slug: 'devraj-kapoor',
      stewardName: 'Rohit Kapoor',
      stewardEmail: 'rohit.k@example.com',
      createdDate: '2025-03-18',
      verificationStatus: 'unverified',
      privacy: 'private',
      memoriesCount: 2,
      tributesCount: 3,
      status: 'disputed',
    },
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterVerification, setFilterVerification] = useState('all');
  const [selectedMemorial, setSelectedMemorial] = useState<MemorialRecord | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const filtered = memorials.filter((m) => {
    const matchesSearch =
      m.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.stewardName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesVerif =
      filterVerification === 'all' || m.verificationStatus === filterVerification;
    return matchesSearch && matchesVerif;
  });

  const handleToggleStatus = (id: string, currentStatus: MemorialRecord['status']) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    setMemorials((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: nextStatus } : m))
    );
    setActionSuccess(`Memorial status toggled to ${nextStatus}. Audit event logged.`);
    setTimeout(() => setActionSuccess(null), 3000);
    if (selectedMemorial && selectedMemorial.id === id) {
      setSelectedMemorial((prev) => (prev ? { ...prev, status: nextStatus } : null));
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
            Memorial Sanctuaries Registry
          </h1>
          <p
            className={`text-xs sm:text-sm mt-1 ${
              isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
            }`}
          >
            Operational ledger of all registered memorials, stewardships, and verification statuses.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-3 py-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-400">
            {memorials.length} Total Registered Sanctuaries
          </span>
        </div>
      </div>

      {actionSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{actionSuccess}</span>
        </motion.div>
      )}

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-stone-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, slug, or steward…"
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
          {['all', 'approved', 'pending', 'unverified'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilterVerification(st)}
              className={`px-3 py-1.5 rounded-lg text-xs capitalize transition-all whitespace-nowrap ${
                filterVerification === st
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

      {/* Memorials Data Table */}
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
                <th className="py-3 px-4">Memorial Name</th>
                <th className="py-3 px-4">Steward</th>
                <th className="py-3 px-4">Verification</th>
                <th className="py-3 px-4">Privacy</th>
                <th className="py-3 px-4">Content</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-inherit">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-stone-500">
                    No memorial records match your query.
                  </td>
                </tr>
              ) : (
                filtered.map((m) => (
                  <tr
                    key={m.id}
                    className={`transition-colors ${
                      isDark ? 'hover:bg-[#1A150F]' : 'hover:bg-[#F9F4EB]'
                    }`}
                  >
                    <td className="py-3.5 px-4 font-medium">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-serif text-sm ${
                            isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                          }`}
                        >
                          {m.fullName}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono opacity-60">/m/{m.slug}</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="block font-medium">{m.stewardName}</span>
                      <span className="text-[10px] opacity-60 font-mono">{m.stewardEmail}</span>
                    </td>

                    <td className="py-3.5 px-4">
                      {m.verificationStatus === 'approved' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <ShieldCheck className="w-3 h-3" />
                          Approved
                        </span>
                      ) : m.verificationStatus === 'pending' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Pending
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-stone-500/10 text-stone-400 border border-stone-500/20">
                          Unverified
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-mono capitalize text-[11px]">
                      {m.privacy}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px]">
                      {m.memoriesCount} memories • {m.tributesCount} tributes
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                          m.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : m.status === 'disputed'
                            ? 'bg-amber-500/10 text-amber-400'
                            : 'bg-red-500/10 text-red-400'
                        }`}
                      >
                        {m.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedMemorial(m)}
                          className={`p-1.5 rounded-lg border text-xs transition-colors ${
                            isDark
                              ? 'border-[#202C40] text-[#9EA3AA] hover:text-[#F8F5EE]'
                              : 'border-[#E5DED2] text-[#7D766D] hover:text-[#20242A]'
                          }`}
                          title="View detail"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(m.id, m.status)}
                          className={`p-1.5 rounded-lg border text-xs transition-colors ${
                            m.status === 'active'
                              ? 'border-red-500/20 text-red-400 hover:bg-red-500/10'
                              : 'border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10'
                          }`}
                          title={m.status === 'active' ? 'Suspend memorial' : 'Reactivate'}
                        >
                          {m.status === 'active' ? 'Suspend' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedMemorial && (
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
                    {selectedMemorial.fullName}
                  </h2>
                  <p
                    className={`text-xs mt-0.5 ${
                      isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                    }`}
                  >
                    Permanent URL: /m/{selectedMemorial.slug}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedMemorial(null)}
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
                  <span className="text-stone-400">Primary Steward:</span>
                  <span className="font-medium">{selectedMemorial.stewardName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Steward Email:</span>
                  <span className="font-mono">{selectedMemorial.stewardEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Registration Date:</span>
                  <span>{selectedMemorial.createdDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Total Tributes:</span>
                  <span>{selectedMemorial.tributesCount}</span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <a
                  href={`/m/${selectedMemorial.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-amber-400 hover:underline flex items-center gap-1"
                >
                  Inspect Public Sanctuary
                  <ExternalLink className="w-3 h-3" />
                </a>

                <Button variant="outline" size="sm" onClick={() => setSelectedMemorial(null)}>
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
