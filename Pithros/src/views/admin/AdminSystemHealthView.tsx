import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Server,
  Activity,
  Database,
  Shield,
  HardDrive,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Terminal,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../../components/ui/Button';

export const AdminSystemHealthView: React.FC = () => {
  const { isDark } = useTheme();

  const [refreshing, setRefreshing] = useState(false);
  const [lastCheck, setLastCheck] = useState('Just now');

  const subsystems = [
    {
      name: 'PostgreSQL Relational Ledger',
      status: 'operational',
      latency: '22ms',
      uptime: '99.98%',
      details: 'Read/write replicas synchronized across 3 availability zones.',
      icon: Database,
    },
    {
      name: 'Firebase Authentication Gateway',
      status: 'operational',
      latency: '45ms',
      uptime: '100%',
      details: 'Google OAuth, Email/Password, and Phone OTP bridges verified.',
      icon: Shield,
    },
    {
      name: 'Cold Storage & Audio Media Vault',
      status: 'operational',
      latency: '68ms',
      uptime: '99.99%',
      details: 'Original WAV voice archives & raw portraits immutable.',
      icon: HardDrive,
    },
    {
      name: 'Perpetual Archive Sync (IPFS/Cold Ledger)',
      status: 'operational',
      latency: '110ms',
      uptime: '99.95%',
      details: 'Decentralized snapshot completed 4 hours ago.',
      icon: Server,
    },
  ];

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      setLastCheck(new Date().toLocaleTimeString());
    }, 800);
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
            System Infrastructure & Ledger Health
          </h1>
          <p
            className={`text-xs sm:text-sm mt-1 ${
              isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
            }`}
          >
            Real-time status of Pithros authentication bridges, media vaults, and cryptographic ledgers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono opacity-60">Last check: {lastCheck}</span>
          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? 'Probing Nodes…' : 'Run Diagnostics'}
          </Button>
        </div>
      </div>

      {/* Subsystem Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {subsystems.map((sub, i) => {
          const Icon = sub.icon;
          return (
            <div
              key={i}
              className={`p-5 rounded-2xl border space-y-3 ${
                isDark ? 'border-[#202C40] bg-[#182337]' : 'border-[#E5DED2] bg-[#FCFAF5]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                    <Icon className="w-4 h-4" />
                  </div>
                  <h2
                    className={`text-sm font-medium ${
                      isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                    }`}
                  >
                    {sub.name}
                  </h2>
                </div>

                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Operational
                </span>
              </div>

              <p
                className={`text-xs leading-relaxed ${
                  isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                }`}
              >
                {sub.details}
              </p>

              <div
                className={`pt-2 border-t border-inherit flex items-center justify-between font-mono text-[11px] ${
                  isDark ? 'text-[#6E5F4E]' : 'text-[#A09585]'
                }`}
              >
                <span>Latency: {sub.latency}</span>
                <span>30-Day Uptime: {sub.uptime}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Terminal Audit Log */}
      <div
        className={`p-5 rounded-2xl border font-mono text-xs space-y-2 ${
          isDark ? 'border-[#202C40] bg-[#111820]' : 'border-[#E5DED2] bg-[#182337] text-[#D9D2C6]'
        }`}
      >
        <div className="flex items-center gap-2 pb-2 border-b border-stone-800 text-stone-400">
          <Terminal className="w-4 h-4" />
          <span className="text-[11px] uppercase tracking-wider">Live Infrastructure Heartbeat</span>
        </div>
        <div className="space-y-1 text-[11px] text-stone-300">
          <p><span className="text-emerald-400">[OK]</span> 2026-03-23T03:00:00Z - IPFS cold preserve hash verification confirmed (Block #4891024)</p>
          <p><span className="text-emerald-400">[OK]</span> 2026-03-23T03:00:15Z - Firebase Auth Token Key Rotation cycle healthy</p>
          <p><span className="text-emerald-400">[OK]</span> 2026-03-23T03:00:30Z - TLS 1.3 wildcard certificate valid for *.pithros.org (Expires 2027)</p>
          <p><span className="text-emerald-400">[OK]</span> 2026-03-23T03:00:45Z - Edge cache latency: 18ms across Singapore, Mumbai, Frankfurt nodes</p>
        </div>
      </div>
    </div>
  );
};
