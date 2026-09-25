import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  CreditCard,
  Download,
  Building,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Shield,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';

interface PayoutTransaction {
  id: string;
  family: string;
  service: string;
  amount: string;
  date: string;
  status: 'transferred' | 'escrow_held' | 'processing';
  referenceNo: string;
}

export const PartnerBillingView: React.FC = () => {
  const { isDark } = useTheme();
  const { showToast } = useToast();

  const [transactions] = useState<PayoutTransaction[]>([
    {
      id: 'tx-801',
      family: 'Roy Family',
      service: 'Granite Keepsake Urn',
      amount: '₹42,750',
      date: 'March 19, 2026',
      status: 'transferred',
      referenceNo: 'UTR-88291048',
    },
    {
      id: 'tx-802',
      family: 'Krishnan Family',
      service: 'Western Ghats Tree Planting Memorial',
      amount: '₹22,800',
      date: 'March 15, 2026',
      status: 'transferred',
      referenceNo: 'UTR-77319022',
    },
    {
      id: 'tx-803',
      family: 'Nair Family',
      service: 'Traditional Kerala Memorial Setup',
      amount: '₹33,250',
      date: 'March 22, 2026',
      status: 'escrow_held',
      referenceNo: 'ESC-991204',
    },
  ]);

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
            Payouts, Escrow & Invoices
          </h1>
          <p
            className={`text-xs sm:text-sm mt-1 ${
              isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
            }`}
          >
            Review direct deposit settlements, escrow releases, and tax receipts.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          icon={Download}
          onClick={() => showToast('Fiscal year settlement statement downloaded.', { type: 'success' })}
        >
          Download Fiscal Statement
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          className={`p-5 rounded-2xl border ${
            isDark ? 'border-[#202C40] bg-[#182337]' : 'border-[#E5DED2] bg-[#FCFAF5]'
          }`}
        >
          <span className="text-[11px] font-mono text-stone-400 uppercase tracking-wider block">
            Completed Payouts (March)
          </span>
          <p
            className={`text-2xl font-serif font-medium mt-1 ${
              isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
            }`}
          >
            ₹65,550
          </p>
          <span className="text-[10px] text-emerald-400 mt-1 block">
            Direct deposited to registered bank
          </span>
        </div>

        <div
          className={`p-5 rounded-2xl border ${
            isDark ? 'border-[#202C40] bg-[#182337]' : 'border-[#E5DED2] bg-[#FCFAF5]'
          }`}
        >
          <span className="text-[11px] font-mono text-stone-400 uppercase tracking-wider block">
            Held in Sacred Care Escrow
          </span>
          <p className="text-2xl font-serif font-medium mt-1 text-amber-400">
            ₹33,250
          </p>
          <span className="text-[10px] opacity-70 mt-1 block">
            Released upon service completion confirmation
          </span>
        </div>

        <div
          className={`p-5 rounded-2xl border ${
            isDark ? 'border-[#202C40] bg-[#182337]' : 'border-[#E5DED2] bg-[#FCFAF5]'
          }`}
        >
          <span className="text-[11px] font-mono text-stone-400 uppercase tracking-wider block">
            Platform Maintenance Fee
          </span>
          <p
            className={`text-2xl font-serif font-medium mt-1 ${
              isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
            }`}
          >
            5.0%
          </p>
          <span className="text-[10px] opacity-70 mt-1 block">
            Strict non-profit trust maintenance tier
          </span>
        </div>
      </div>

      {/* Transactions Table */}
      <div
        className={`p-5 rounded-2xl border space-y-4 ${
          isDark ? 'border-[#202C40] bg-[#182337]' : 'border-[#E5DED2] bg-[#FCFAF5]'
        }`}
      >
        <h2
          className={`text-sm font-medium ${
            isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
          }`}
        >
          Settlement Ledger
        </h2>

        <div className="space-y-3">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className={`p-4 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isDark ? 'border-[#202C40] bg-[#16120D]' : 'border-[#E5DED2] bg-white'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <h3
                    className={`font-medium ${
                      isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                    }`}
                  >
                    {tx.service}
                  </h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                      tx.status === 'transferred'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {tx.status === 'transferred' ? 'Settled' : 'In Escrow'}
                  </span>
                </div>
                <p
                  className={`text-[11px] mt-0.5 ${
                    isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                  }`}
                >
                  Family: {tx.family} • Ref: {tx.referenceNo} • {tx.date}
                </p>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4">
                <span
                  className={`text-sm font-mono font-medium ${
                    isDark ? 'text-[#B99452]' : 'text-[#23324A]'
                  }`}
                >
                  {tx.amount}
                </span>
                <button
                  type="button"
                  onClick={() => showToast(`Downloading Invoice for Ref ${tx.referenceNo}`, { type: 'info' })}
                  className="p-1.5 rounded-lg border border-stone-700 text-stone-400 hover:text-stone-200"
                  title="Download invoice"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
