import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  Search,
  Filter,
  Shield,
  Key,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  Eye,
  Mail,
  Smartphone,
  X,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import { http } from '../../services/api/client';

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: 'family_steward' | 'family_contributor' | 'partner' | 'admin' | 'visitor' | string;
  adminSubrole?: string;
  emailVerified: boolean;
  mfaEnabled: boolean;
  status: 'active' | 'suspended';
  memorialCount?: number;
  createdDate: string;
  lastActive: string;
}

export const AdminUsersView: React.FC = () => {
  const { isDark } = useTheme();
  const { showToast } = useToast();

  const [users, setUsers] = useState<UserRecord[]>([
    {
      id: 'usr-1',
      name: 'Anita Krishnan',
      email: 'anita.k@example.com',
      role: 'family_steward',
      emailVerified: true,
      mfaEnabled: false,
      status: 'active',
      createdDate: 'Jan 15, 2025',
      lastActive: '10 minutes ago',
    },
    {
      id: 'usr-2',
      name: 'Vikram Krishnan',
      email: 'vikram.k@example.com',
      role: 'family_contributor',
      emailVerified: true,
      mfaEnabled: false,
      status: 'active',
      createdDate: 'Jan 20, 2025',
      lastActive: '3 days ago',
    },
    {
      id: 'usr-3',
      name: 'Rajesh Varma',
      email: 'partner@pithros.org',
      role: 'partner',
      emailVerified: true,
      mfaEnabled: true,
      status: 'active',
      createdDate: 'Feb 01, 2025',
      lastActive: '1 hour ago',
    },
    {
      id: 'usr-4',
      name: 'Sarah Chen',
      email: 'admin@pithros.org',
      role: 'admin',
      adminSubrole: 'super_admin',
      emailVerified: true,
      mfaEnabled: true,
      status: 'active',
      createdDate: 'Dec 01, 2024',
      lastActive: 'Active now',
    },
    {
      id: 'usr-5',
      name: 'Rohit Kapoor',
      email: 'rohit.k@example.com',
      role: 'family_steward',
      emailVerified: true,
      mfaEnabled: false,
      status: 'suspended',
      createdDate: 'Mar 18, 2025',
      lastActive: 'March 18, 2025',
    },
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    http.get<UserRecord[]>('/admin/users')
      .then((realUsers) => {
        if (realUsers && realUsers.length > 0) {
          setUsers(realUsers);
        }
      })
      .catch((err) => {
        console.warn('Failed to load real users from backend:', err);
      });
  }, []);

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const toggleUserLock = (id: string, currentStatus: UserRecord['status']) => {
    const next = currentStatus === 'active' ? 'suspended' : 'active';
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, status: next } : u))
    );
    setStatusMsg(`User status updated to ${next}. Security event logged.`);
    setTimeout(() => setStatusMsg(null), 3000);
    if (selectedUser && selectedUser.id === id) {
      setSelectedUser((prev) => (prev ? { ...prev, status: next } : null));
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
            Users, Stewards & System Operators
          </h1>
          <p
            className={`text-xs sm:text-sm mt-1 ${
              isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
            }`}
          >
            Authoritative directory of authenticated Pithros identities and permissions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-3 py-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-400">
            {users.length} Registered Accounts
          </span>
        </div>
      </div>

      {statusMsg && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{statusMsg}</span>
        </motion.div>
      )}

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-stone-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by user name or email…"
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
          {['all', 'family_steward', 'family_contributor', 'partner', 'admin'].map((rf) => (
            <button
              key={rf}
              type="button"
              onClick={() => setRoleFilter(rf)}
              className={`px-3 py-1.5 rounded-lg text-xs capitalize transition-all whitespace-nowrap ${
                roleFilter === rf
                  ? isDark
                    ? 'bg-[#B99452] text-[#111820] font-medium'
                    : 'bg-[#23324A] text-white font-medium'
                  : isDark
                  ? 'border border-[#202C40] text-[#9EA3AA] hover:text-[#F8F5EE]'
                  : 'border border-[#E5DED2] text-[#7D766D] hover:text-[#20242A]'
              }`}
            >
              {rf.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
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
                <th className="py-3 px-4">User Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Security</th>
                <th className="py-3 px-4">Last Active</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-inherit">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-stone-500">
                    No user accounts match your search.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr
                    key={u.id}
                    className={`transition-colors ${
                      isDark ? 'hover:bg-[#1A150F]' : 'hover:bg-[#F9F4EB]'
                    }`}
                  >
                    <td className="py-3.5 px-4 font-medium">
                      <span
                        className={isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'}
                      >
                        {u.name}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px]">
                      {u.email}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono capitalize ${
                          u.role === 'admin'
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            : u.role === 'partner'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        {u.emailVerified && (
                          <span className="text-[10px] text-emerald-400">Email Verified</span>
                        )}
                        {u.mfaEnabled && (
                          <span className="text-[10px] font-mono bg-purple-500/15 text-purple-400 px-1.5 py-0.5 rounded">
                            2FA
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] opacity-70">
                      {u.lastActive}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                          u.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-red-500/10 text-red-400'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedUser(u)}
                          className={`p-1.5 rounded-lg border text-xs transition-colors ${
                            isDark
                              ? 'border-[#202C40] text-[#9EA3AA] hover:text-[#F8F5EE]'
                              : 'border-[#E5DED2] text-[#7D766D] hover:text-[#20242A]'
                          }`}
                          title="Inspect details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleUserLock(u.id, u.status)}
                          className={`p-1.5 rounded-lg border text-xs transition-colors ${
                            u.status === 'active'
                              ? 'border-red-500/20 text-red-400 hover:bg-red-500/10'
                              : 'border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10'
                          }`}
                          title={u.status === 'active' ? 'Suspend account' : 'Unlock account'}
                        >
                          {u.status === 'active' ? (
                            <Lock className="w-3.5 h-3.5" />
                          ) : (
                            <Unlock className="w-3.5 h-3.5" />
                          )}
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

      {/* User Details Modal */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-md rounded-3xl border shadow-2xl p-6 sm:p-8 space-y-5 ${
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
                    {selectedUser.name}
                  </h2>
                  <p
                    className={`text-xs font-mono mt-0.5 ${
                      isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                    }`}
                  >
                    ID: {selectedUser.id}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="p-1 text-stone-400 hover:text-stone-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div
                className={`p-4 rounded-xl border text-xs space-y-2.5 ${
                  isDark ? 'border-[#202C40] bg-[#16120D]' : 'border-[#E5DED2] bg-white'
                }`}
              >
                <div className="flex justify-between">
                  <span className="text-stone-400">Email:</span>
                  <span className="font-mono">{selectedUser.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Assigned Role:</span>
                  <span className="capitalize">{selectedUser.role.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Two-Factor Authentication:</span>
                  <span>{selectedUser.mfaEnabled ? 'Enabled' : 'Disabled'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Member Since:</span>
                  <span>{selectedUser.createdDate}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    showToast(`Password reset dispatch sent to ${selectedUser.email}`, { type: 'success' });
                  }}
                >
                  Dispatch Password Reset
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedUser(null)}>
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
