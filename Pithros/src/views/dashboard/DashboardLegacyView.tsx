import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Shield,
  Key,
  Users,
  Download,
  AlertTriangle,
  Clock,
  CheckCircle2,
  FileText,
  Lock,
  ArrowRight,
} from 'lucide-react';
import { Memorial } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';

interface DashboardLegacyViewProps {
  memorial: Memorial;
}

export const DashboardLegacyView: React.FC<DashboardLegacyViewProps> = ({
  memorial,
}) => {
  const { isDark } = useTheme();
  const { showToast } = useToast();

  const [successorName, setSuccessorName] = useState('Vikram Krishnan');
  const [successorEmail, setSuccessorEmail] = useState('vikram.k@example.com');
  const [successorRelation, setSuccessorRelation] = useState('Brother');
  const [inactivityMonths, setInactivityMonths] = useState('12');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    showToast('Legacy governance settings saved.', { type: 'success' });
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleExportFullSanctuary = () => {
    setExporting(true);
    setTimeout(() => {
      setExporting(false);
      showToast(
        `Digital Preservation Pack for "${memorial.fullName}" packaged: Photos, audio, JSON metadata, and offline reader ready.`,
        { type: 'success' }
      );
    }, 1800);
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
            Digital Legacy & Perpetual Succession
          </h1>
          <p
            className={`text-xs sm:text-sm mt-1 ${
              isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
            }`}
          >
            Ensure {memorial.fullName}’s digital sanctuary endures across generations through steward succession.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          icon={Download}
          onClick={handleExportFullSanctuary}
          disabled={exporting}
        >
          {exporting ? 'Packaging Archive…' : 'Export Full Preservation Pack'}
        </Button>
      </div>

      {savedSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>Successor steward provisions updated and recorded in the audit ledger.</span>
        </motion.div>
      )}

      {/* Succession Plan Form */}
      <form onSubmit={handleSave} className="space-y-6">
        <div
          className={`p-6 rounded-2xl border space-y-5 ${
            isDark ? 'border-[#202C40] bg-[#182337]' : 'border-[#E5DED2] bg-[#FCFAF5]'
          }`}
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-400" />
            <h2
              className={`text-base font-serif ${
                isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
              }`}
            >
              Designated Successor Steward
            </h2>
          </div>
          <p
            className={`text-xs leading-relaxed ${
              isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
            }`}
          >
            If the primary steward account becomes inactive or unavailable, stewardship will transfer to this designated family trustee.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label
                className={`block text-xs font-medium mb-1.5 ${
                  isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                }`}
              >
                Full Name
              </label>
              <input
                type="text"
                value={successorName}
                onChange={(e) => setSuccessorName(e.target.value)}
                required
                className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${
                  isDark
                    ? 'border-[#202C40] bg-[#16120D] text-[#F8F5EE] focus:border-[#B99452]'
                    : 'border-[#E5DED2] bg-white text-[#20242A] focus:border-[#23324A]'
                }`}
              />
            </div>

            <div>
              <label
                className={`block text-xs font-medium mb-1.5 ${
                  isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                }`}
              >
                Email Address
              </label>
              <input
                type="email"
                value={successorEmail}
                onChange={(e) => setSuccessorEmail(e.target.value)}
                required
                className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${
                  isDark
                    ? 'border-[#202C40] bg-[#16120D] text-[#F8F5EE] focus:border-[#B99452]'
                    : 'border-[#E5DED2] bg-white text-[#20242A] focus:border-[#23324A]'
                }`}
              />
            </div>

            <div>
              <label
                className={`block text-xs font-medium mb-1.5 ${
                  isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                }`}
              >
                Relationship to Deceased
              </label>
              <input
                type="text"
                value={successorRelation}
                onChange={(e) => setSuccessorRelation(e.target.value)}
                required
                className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${
                  isDark
                    ? 'border-[#202C40] bg-[#16120D] text-[#F8F5EE] focus:border-[#B99452]'
                    : 'border-[#E5DED2] bg-white text-[#20242A] focus:border-[#23324A]'
                }`}
              />
            </div>
          </div>

          <div className="pt-2">
            <label
              className={`block text-xs font-medium mb-1.5 ${
                isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
              }`}
            >
              Steward Inactivity Window
            </label>
            <select
              value={inactivityMonths}
              onChange={(e) => setInactivityMonths(e.target.value)}
              className={`px-3 py-2 rounded-xl border text-xs focus:outline-none ${
                isDark
                  ? 'border-[#202C40] bg-[#16120D] text-[#F8F5EE]'
                  : 'border-[#E5DED2] bg-white text-[#20242A]'
              }`}
            >
              <option value="6">6 months of inactivity</option>
              <option value="12">12 months of inactivity (Recommended)</option>
              <option value="24">24 months of inactivity</option>
              <option value="manual_only">Manual transfer only by family legal documentation</option>
            </select>
          </div>
        </div>

        {/* Perpetual Guarantee Card */}
        <div
          className={`p-6 rounded-2xl border space-y-4 ${
            isDark ? 'border-[#202C40] bg-[#182337]' : 'border-[#E5DED2] bg-[#FCFAF5]'
          }`}
        >
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <h2
              className={`text-base font-serif ${
                isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
              }`}
            >
              Perpetual Digital Guarantee
            </h2>
          </div>
          <p
            className={`text-xs leading-relaxed ${
              isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
            }`}
          >
            Pithros guarantees permanent preservation. Even if our operational services change in future decades, all text, photos, audio tracks, and condolence ledgers are redundantly stored across distributed cold archives and can be downloaded freely by verified family at any time.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
            <div
              className={`p-3 rounded-xl border flex items-center gap-2.5 ${
                isDark ? 'border-[#202C40] bg-[#16120D]' : 'border-[#E5DED2] bg-white'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Full offline HTML mirror included in exports</span>
            </div>
            <div
              className={`p-3 rounded-xl border flex items-center gap-2.5 ${
                isDark ? 'border-[#202C40] bg-[#16120D]' : 'border-[#E5DED2] bg-white'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Zero compression on master voice memories</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" variant="primary">
            Save Succession Settings
          </Button>
        </div>
      </form>
    </div>
  );
};
