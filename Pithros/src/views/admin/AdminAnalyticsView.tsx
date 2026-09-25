import React from 'react';
import { motion } from 'motion/react';
import {
  TrendingUp,
  Heart,
  Mic,
  ShieldCheck,
  Building2,
  Users,
  Download,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';

export const AdminAnalyticsView: React.FC = () => {
  const { isDark } = useTheme();
  const { showToast } = useToast();

  const metrics = [
    {
      title: 'Sample Memorials (Simulated)',
      value: '24 Records',
      change: 'Local test sandbox records',
      icon: Heart,
      badge: 'DEMO DATA',
    },
    {
      title: 'Voice Archives (Sample Set)',
      value: '18 Clips',
      change: 'Simulated audio recordings',
      icon: Mic,
      badge: 'DEMO DATA',
    },
    {
      title: 'Stewards Registered (Demo)',
      value: '12 Accounts',
      change: 'Simulated next-of-kin personas',
      icon: ShieldCheck,
      badge: 'DEMO DATA',
    },
    {
      title: 'Farewell Partners (Directory)',
      value: '6 Partners',
      change: 'Verified test partner profiles',
      icon: Building2,
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
            Census reporting displays sample and simulated metrics for development and staging environments.
          </span>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-inherit">
        <div>
          <h1
            className={`text-2xl sm:text-3xl font-serif ${
              isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
            }`}
          >
            Preservation Census & Activity
          </h1>
          <p
            className={`text-xs sm:text-sm mt-1 ${
              isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
            }`}
          >
            Simulated counts of active memorial entries, voice archives, and authenticated steward lineages.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          icon={Download}
          onClick={() => showToast('Sample preservation census exported as CSV (Demo Data).', { type: 'info' })}
        >
          Export Census CSV (Demo)
        </Button>
      </div>

      {/* Grid of Real Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m, i) => {
          const Icon = m.icon;
          return (
            <div
              key={i}
              className={`p-5 rounded-2xl border ${
                isDark
                  ? 'border-[#202C40] bg-[#120F0C]'
                  : 'border-[#E5DED2] bg-[#FCFAF5] shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-amber-500/20 text-amber-500">
                  {m.badge}
                </span>
                <Icon
                  className={`w-4 h-4 ${
                    isDark ? 'text-[#B99452]' : 'text-[#23324A]'
                  }`}
                />
              </div>
              <div
                className={`text-2xl font-serif font-semibold ${
                  isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                }`}
              >
                {m.value}
              </div>
              <div className="text-xs font-medium mt-1">{m.title}</div>
              <div
                className={`text-[11px] mt-1 ${
                  isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                }`}
              >
                {m.change}
              </div>
            </div>
          );
        })}
      </div>

      {/* Local Storage & Cache Audit */}
      <div
        className={`p-6 rounded-2xl border space-y-4 ${
          isDark ? 'border-[#202C40] bg-[#182337]' : 'border-[#E5DED2] bg-[#FCFAF5]'
        }`}
      >
        <div className="flex items-center justify-between">
          <h2
            className={`text-base font-serif ${
              isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
            }`}
          >
            Client Storage & State Cache
          </h2>
          <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-amber-500/20 text-amber-500 font-bold">
            DEMO DATA
          </span>
        </div>
        <div className="space-y-3 text-xs">
          <div className="space-y-1">
            <div className="flex justify-between font-mono">
              <span>Local Browser State Ledger (pithros_*)</span>
              <span className="text-emerald-500">Persistent In Browser</span>
            </div>
            <div className="w-full bg-stone-700/30 h-1.5 rounded-full overflow-hidden">
              <div className="bg-emerald-400 h-full w-full" />
            </div>
          </div>
          <p className="text-[11px] text-[#9EA3AA]">
            Data is currently isolated to local browser storage and in-memory mock datasets. Server-side Cloud SQL / Firebase sync will activate in production deployments.
          </p>
        </div>
      </div>
    </div>
  );
};
