import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  CreditCard,
  CheckCircle2,
  Shield,
  Edit2,
  Plus,
  Sparkles,
  Lock,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';

interface PlanTier {
  id: string;
  name: string;
  priceModel: string;
  priceAmount: string;
  tagline: string;
  features: string[];
  activeUsersCount: number;
}

export const AdminPlansView: React.FC = () => {
  const { isDark } = useTheme();
  const { showToast } = useToast();

  const [plans, setPlans] = useState<PlanTier[]>([
    {
      id: 'plan-free',
      name: 'Sacred Heritage Tier',
      priceModel: 'Perpetually Free',
      priceAmount: '₹0',
      tagline: 'Permanent digital memorial for every departed soul without barrier.',
      features: [
        '1 Verified Memorial Sanctuary',
        'Life Story & Milestones Timeline',
        'Guestbook & Remembrance Gestures',
        'Standard Quality Photo Gallery',
        'Direct Family Steward Access',
      ],
      activeUsersCount: 1420,
    },
    {
      id: 'plan-perpetual',
      name: 'Perpetual Sanctuary Endowment',
      priceModel: 'One-Time Eternal Endowment',
      priceAmount: '₹4,999',
      tagline: 'Guaranteed archival with lossless voice vault and physical brass plaque.',
      features: [
        'Everything in Sacred Heritage',
        'Lossless Original WAV Master Audio Memories',
        'Physical Handcrafted Brass QR Plaque Dispatch',
        'Digital Legacy Successor Steward Governance',
        'Offline Full HTML & JSON Archival Export Pack',
      ],
      activeUsersCount: 480,
    },
    {
      id: 'plan-dynasty',
      name: 'Family Dynasty Archive',
      priceModel: 'One-Time Endowment',
      priceAmount: '₹12,499',
      tagline: 'Multi-generational family sanctuary and ancestral lineage ledger.',
      features: [
        'Up to 10 Interlinked Memorial Sanctuaries',
        'Family Genealogy & Lineage Graph',
        'Dedicated Concierge Document Archival',
        'Priority Trust Officer Verification',
        'Custom Domain Binding (*.krishnanlegacy.org)',
      ],
      activeUsersCount: 95,
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
            Endowment Plans & Stewardship Tiers
          </h1>
          <p
            className={`text-xs sm:text-sm mt-1 ${
              isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
            }`}
          >
            Manage perpetual preservation endowments and memory capacity quotas.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => showToast('Endowment pricing parameters synchronized with gateway tiers.', { type: 'success' })}
        >
          Sync Gateway Tiers
        </Button>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {plans.map((p) => (
          <div
            key={p.id}
            className={`p-6 rounded-2xl border flex flex-col justify-between space-y-4 ${
              isDark ? 'border-[#202C40] bg-[#182337]' : 'border-[#E5DED2] bg-[#FCFAF5]'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {p.priceModel}
                </span>
                <span className="text-xs font-mono opacity-60">
                  {p.activeUsersCount} active
                </span>
              </div>

              <h2
                className={`text-lg font-serif font-medium ${
                  isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                }`}
              >
                {p.name}
              </h2>
              <p
                className={`text-2xl font-serif font-medium mt-2 ${
                  isDark ? 'text-[#B99452]' : 'text-[#23324A]'
                }`}
              >
                {p.priceAmount}
              </p>
              <p
                className={`text-xs mt-1 leading-relaxed ${
                  isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                }`}
              >
                {p.tagline}
              </p>

              <div className="mt-4 pt-4 border-t border-inherit space-y-2 text-xs">
                {p.features.map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className={isDark ? 'text-[#D9D2C6]' : 'text-[#3E3831]'}>
                      {feat}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-inherit">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => showToast(`Configuring quota rules for ${p.name}`, { type: 'info' })}
              >
                Configure Quotas
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
