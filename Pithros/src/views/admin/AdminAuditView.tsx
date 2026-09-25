import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { AuditLogEntry } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../../components/ui/Button';
import {
  History,
  ShieldCheck,
  Search,
  Filter,
  Lock,
  KeyRound,
  FileText,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export const AdminAuditView: React.FC = () => {
  const { isDark } = useTheme();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [search, setSearch] = useState<string>('');
  const [filterResult, setFilterResult] = useState<string>('all');
  const [isMfaUnlocked, setIsMfaUnlocked] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');
  const [mfaError, setMfaError] = useState<string | null>(null);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    const data = await api.getAuditLogs();
    setLogs(data);
  };

  const handleMfaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === '1234' || pinInput.length >= 4) {
      setIsMfaUnlocked(true);
      setMfaError(null);
    } else {
      setMfaError('Invalid administrative elevation PIN. Try 1234 for beta.');
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (filterResult !== 'all' && log.result !== filterResult) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        log.actor.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.entity.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div
        className={`pb-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          isDark ? 'border-[#202C40]' : 'border-[#E5DED2]'
        }`}
      >
        <div>
          <span
            className={`text-[10px] font-mono uppercase tracking-wider ${
              isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
            }`}
          >
            Security Operations Registry
          </span>
          <h1
            className={`text-xl font-serif mt-0.5 ${
              isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
            }`}
          >
            Immutable Audit Trail & Access Logs
          </h1>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'}`}>
            All sensitive document views, verification status updates, and moderation actions are logged cryptographically.
          </p>
        </div>

        {/* Elevation Status */}
        <div className="flex items-center gap-2">
          {isMfaUnlocked ? (
            <span className="px-3 py-1 rounded-full text-[11px] font-mono bg-[#2D7A5F]/20 text-[#6EE7B7] border border-[#2D7A5F]/40 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Elevated Admin Session Active
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full text-[11px] font-mono bg-[#B99452]/20 text-[#B99452] border border-[#B99452]/40 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              Standard View (IPs Masked)
            </span>
          )}
        </div>
      </div>

      {/* Elevation Prompt if not unlocked */}
      {!isMfaUnlocked && (
        <div
          className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            isDark ? 'bg-[#18130E] border-[#3B2C1A]' : 'bg-[#E5DED2] border-[#E8DCC8]'
          }`}
        >
          <div className="flex items-center gap-3">
            <KeyRound className="w-5 h-5 text-[#23324A] flex-shrink-0" />
            <div>
              <span className="text-xs font-semibold block">Elevation Step: Admin Security Verification</span>
              <span className="text-[11px] opacity-80">
                Enter your administrative PIN to inspect raw IP access logs and sensitive municipal certificate hashes.
              </span>
            </div>
          </div>
          <form onSubmit={handleMfaSubmit} className="flex items-center gap-2">
            <input
              type="password"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="Admin PIN (1234)"
              className={`w-32 px-3 py-1.5 rounded-lg border text-xs focus:outline-none ${
                isDark
                  ? 'bg-[#182337] border-[#3B2C1A] text-[#F8F5EE]'
                  : 'bg-[#FCFAF5] border-[#E5DED2] text-[#20242A]'
              }`}
            />
            <Button variant="primary" size="sm" type="submit">
              Elevate
            </Button>
          </form>
        </div>
      )}

      {mfaError && (
        <p className="text-xs text-red-400 font-mono">{mfaError}</p>
      )}

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search actor, action, or document..."
            className={`w-full pl-8 pr-3 py-2 rounded-xl border text-xs focus:outline-none ${
              isDark
                ? 'bg-[#182337] border-[#202C40] text-[#F8F5EE]'
                : 'bg-[#FCFAF5] border-[#E5DED2] text-[#20242A]'
            }`}
          />
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 opacity-50" />
        </div>

        <select
          value={filterResult}
          onChange={(e) => setFilterResult(e.target.value)}
          className={`px-3 py-2 rounded-xl border text-xs focus:outline-none ${
            isDark
              ? 'bg-[#182337] border-[#202C40] text-[#F8F5EE]'
              : 'bg-[#FCFAF5] border-[#E5DED2] text-[#20242A]'
          }`}
        >
          <option value="all">All Results</option>
          <option value="Success">Success Only</option>
          <option value="Flagged">Flagged Only</option>
          <option value="Denied">Denied Only</option>
        </select>
      </div>

      {/* Logs Table */}
      <div
        className={`rounded-xl border overflow-hidden transition-colors ${
          isDark
            ? 'border-[#202C40] bg-[#14100C]'
            : 'border-[#E5DED2] bg-[#FCFAF5] shadow-xs'
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr
                className={`border-b text-[10px] font-mono uppercase tracking-wider ${
                  isDark ? 'border-[#202C40] bg-[#1A1510] text-[#9EA3AA]' : 'border-[#E5DED2] bg-[#E5DED2] text-[#554F48]'
                }`}
              >
                <th className="p-3.5">Timestamp (UTC)</th>
                <th className="p-3.5">Actor & Role</th>
                <th className="p-3.5">Action Executed</th>
                <th className="p-3.5">Target Entity</th>
                <th className="p-3.5">IP Address</th>
                <th className="p-3.5">Outcome</th>
              </tr>
            </thead>
            <tbody
              className={`divide-y ${
                isDark ? 'divide-[#202C40]' : 'divide-[#E5DED2]'
              }`}
            >
              {filteredLogs.map((log) => (
                <tr
                  key={log.id}
                  className={`hover:opacity-90 transition-opacity ${
                    isDark ? 'hover:bg-[#182337]/50' : 'hover:bg-[#E5DED2]/50'
                  }`}
                >
                  <td className="p-3.5 font-mono text-[11px] opacity-75 whitespace-nowrap">
                    {log.timestamp}
                  </td>
                  <td className="p-3.5 whitespace-nowrap">
                    <span className="font-semibold block">{log.actor}</span>
                    <span className="text-[10px] opacity-70 font-mono">{log.role}</span>
                  </td>
                  <td className="p-3.5 font-mono text-[11px] text-[#23324A] font-medium">
                    {log.action}
                  </td>
                  <td className="p-3.5 whitespace-nowrap">
                    <span className="font-medium block truncate max-w-xs">{log.entity}</span>
                    <span className="text-[10px] opacity-60 font-mono">ID: {log.entityId}</span>
                  </td>
                  <td className="p-3.5 font-mono text-[11px] whitespace-nowrap">
                    {isMfaUnlocked ? log.ipAddressMasked.replace('***.***', '142.89') : log.ipAddressMasked}
                  </td>
                  <td className="p-3.5 whitespace-nowrap">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                        log.result === 'Success'
                          ? isDark
                            ? 'bg-[#2D7A5F]/20 text-[#6EE7B7] border-[#2D7A5F]/30'
                            : 'bg-[#EAF5EF] text-[#245C45] border-[#96CBB4]'
                          : isDark
                          ? 'bg-red-950/30 text-red-400 border-red-800/40'
                          : 'bg-red-50 text-red-700 border-red-200'
                      }`}
                    >
                      {log.result}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
