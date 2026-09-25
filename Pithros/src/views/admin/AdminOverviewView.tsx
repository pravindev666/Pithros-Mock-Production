import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Memorial } from '../../types';
import { Button } from '../../components/ui/Button';
import {
  Activity,
  FileCheck,
  Flag,
  Users,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface AdminOverviewViewProps {
  onNavigate: (route: string) => void;
}

export const AdminOverviewView: React.FC<AdminOverviewViewProps> = ({ onNavigate }) => {
  const { isDark } = useTheme();
  const [memorials, setMemorials] = useState<Memorial[]>([]);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const list = await api.getMemorials();
    setMemorials(list);
    const pending = list.filter((m) => m.verificationStatus === 'under_review');
    setPendingCount(pending.length);
  };

  const verifiedCount = memorials.filter((m) => m.verificationStatus === 'approved').length;

  const metrics = [
    {
      label: 'Active Sandbox Memorials',
      val: `${memorials.length}`,
      change: 'Local Sandbox State',
      icon: Users,
      badge: 'DEMO DATA',
    },
    {
      label: 'Verified Records',
      val: `${verifiedCount}`,
      change: `${memorials.length > 0 ? Math.round((verifiedCount / memorials.length) * 100) : 0}% of loaded`,
      icon: ShieldCheck,
      badge: 'DEMO DATA',
    },
    {
      label: 'Pending Review',
      val: pendingCount > 0 ? `${pendingCount}` : '0',
      change: 'Steward submissions',
      icon: FileCheck,
      alert: pendingCount > 0,
      badge: 'DEMO DATA',
    },
    {
      label: 'Active Reports',
      val: '0',
      change: 'Queue clear',
      icon: Flag,
      badge: 'DEMO DATA',
    },
  ];

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
            Operations dashboard operating in development mode with simulated stewardship records.
          </span>
        </div>
      </div>

      {/* Top Welcome */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b ${
          isDark ? 'border-[#202C40]' : 'border-[#E5DED2]'
        }`}
      >
        <div>
          <span
            className={`text-[10px] font-mono uppercase tracking-wider ${
              isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
            }`}
          >
            Console Overview • Trust & Safety
          </span>
          <h1
            className={`text-xl font-serif mt-0.5 ${
              isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
            }`}
          >
            Platform Operations Registry
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => onNavigate('/admin/verification')}
            icon={FileCheck}
          >
            Open Verification Queue ({pendingCount})
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {metrics.map((m, idx) => {
          const Icon = m.icon;
          return (
            <div
              key={idx}
              className={`p-4 rounded-xl border transition-colors ${
                m.alert
                  ? isDark
                    ? 'border-[#B99452]/40 bg-[#14100C]'
                    : 'border-[#23324A]/40 bg-[#E5DED2]'
                  : isDark
                  ? 'border-[#202C40] bg-[#14100C]'
                  : 'border-[#E5DED2] bg-[#FCFAF5] shadow-xs'
              }`}
            >
              <div
                className={`flex items-center justify-between text-xs mb-2 ${
                  isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span>{m.label}</span>
                  {m.badge && (
                    <span className="px-1.5 py-0.2 rounded text-[8px] font-mono bg-amber-500/20 text-amber-500 uppercase font-bold">
                      {m.badge}
                    </span>
                  )}
                </div>
                <Icon
                  className={`w-4 h-4 ${
                    m.alert
                      ? isDark
                        ? 'text-[#B99452]'
                        : 'text-[#23324A]'
                      : isDark
                      ? 'text-[#D9D2C6]'
                      : 'text-[#554F48]'
                  }`}
                />
              </div>
              <div
                className={`text-2xl font-serif font-semibold ${
                  isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                }`}
              >
                {m.val}
              </div>
              <span
                className={`text-[10px] mt-1 block ${
                  isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                }`}
              >
                {m.change}
              </span>
            </div>
          );
        })}
      </div>

      {/* Main Split: Memorials Registry & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Memorials Registry */}
        <div
          className={`lg:col-span-8 rounded-xl border p-5 space-y-4 transition-colors ${
            isDark
              ? 'border-[#202C40] bg-[#14100C]'
              : 'border-[#E5DED2] bg-[#FCFAF5] shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <h3
              className={`text-sm font-serif ${
                isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
              }`}
            >
              Recent Memorial Registrations
            </h3>
            <span
              className={`text-[11px] ${
                isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
              }`}
            >
              {memorials.length} entries shown
            </span>
          </div>

          <div
            className={`divide-y text-xs ${
              isDark ? 'divide-[#202C40]' : 'divide-[#E5DED2]'
            }`}
          >
            {memorials.map((m) => (
              <div key={m.id} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 truncate">
                  <div
                    className={`w-8 h-8 rounded-full overflow-hidden flex-shrink-0 ${
                      isDark ? 'bg-[#182337]' : 'bg-[#EFE8DC]'
                    }`}
                  >
                    <img src={m.portraitUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="truncate">
                    <span
                      className={`font-medium block truncate ${
                        isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                      }`}
                    >
                      {m.fullName}
                    </span>
                    <span
                      className={`text-[10px] ${
                        isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                      }`}
                    >
                      Steward: {m.stewardName} • Privacy: {m.privacy}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                      m.verificationStatus === 'approved'
                        ? isDark
                          ? 'bg-[#2D7A5F]/20 text-[#6EE7B7] border border-[#2D7A5F]/30'
                          : 'bg-[#2D7A5F]/15 text-[#1B4D3E] border border-[#2D7A5F]/25'
                        : m.verificationStatus === 'under_review'
                        ? isDark
                          ? 'bg-[#B99452]/20 text-[#B99452] border border-[#B99452]/30 animate-pulse'
                          : 'bg-[#E5DED2] text-[#8C5C0F] border border-[#D9941E]/30 animate-pulse'
                        : isDark
                        ? 'bg-[#202C40] text-[#9EA3AA]'
                        : 'bg-[#E5DED2] text-[#554F48]'
                    }`}
                  >
                    {m.verificationStatus}
                  </span>
                  <button
                    onClick={() => onNavigate('/admin/verification')}
                    className={`p-1 rounded cursor-pointer ${
                      isDark
                        ? 'text-[#9EA3AA] hover:text-[#F8F5EE]'
                        : 'text-[#7D766D] hover:text-[#20242A]'
                    }`}
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Audit Log / Operational Stream */}
        <div
          className={`lg:col-span-4 rounded-xl border p-5 space-y-4 transition-colors ${
            isDark
              ? 'border-[#202C40] bg-[#14100C]'
              : 'border-[#E5DED2] bg-[#FCFAF5] shadow-xs'
          }`}
        >
          <h3
            className={`text-sm font-serif ${
              isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
            }`}
          >
            Trust & Safety Audit Stream
          </h3>
          <div className="space-y-3 text-xs">
            {[
              {
                text: 'Dr. Anita Shah verification document submitted by family',
                time: '12m ago',
                type: 'review',
              },
              {
                text: 'Memorial created: Capt. David Joseph (Private tier)',
                time: '1h ago',
                type: 'create',
              },
              {
                text: 'New farewell request dispatched to Serene Transitions',
                time: '3h ago',
                type: 'partner',
              },
              {
                text: 'Document Reviewed badge approved for Dr. Arun Krishnan',
                time: '1d ago',
                type: 'verified',
              },
            ].map((ev, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg border space-y-1 ${
                  isDark
                    ? 'bg-[#182337]/70 border-[#202C40]'
                    : 'bg-[#E5DED2]/60 border-[#E5DED2]'
                }`}
              >
                <p
                  className={`leading-tight text-[11px] ${
                    isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                  }`}
                >
                  {ev.text}
                </p>
                <span
                  className={`text-[9px] font-mono block ${
                    isDark ? 'text-[#737982]' : 'text-[#9EA3AA]'
                  }`}
                >
                  {ev.time}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

