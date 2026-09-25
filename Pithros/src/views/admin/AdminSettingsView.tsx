import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Settings,
  Shield,
  Lock,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../../components/ui/Button';

export const AdminSettingsView: React.FC = () => {
  const { isDark } = useTheme();

  const [enforceMfaAdmin, setEnforceMfaAdmin] = useState(true);
  const [enforceMfaPartner, setEnforceMfaPartner] = useState(true);
  const [retentionYears, setRetentionYears] = useState('perpetual');
  const [requireDocUpload, setRequireDocUpload] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
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
            System Security & Trust Governance
          </h1>
          <p
            className={`text-xs sm:text-sm mt-1 ${
              isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
            }`}
          >
            Configure platform-wide authentication policies, MFA enforcement, and audit ledger parameters.
          </p>
        </div>
      </div>

      {savedSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>Security governance policies updated and enforced across active sessions.</span>
        </motion.div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div
          className={`p-6 rounded-2xl border space-y-4 ${
            isDark ? 'border-[#202C40] bg-[#182337]' : 'border-[#E5DED2] bg-[#FCFAF5]'
          }`}
        >
          <h2
            className={`text-base font-serif ${
              isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
            }`}
          >
            Authentication & Access Standards
          </h2>

          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={enforceMfaAdmin}
                onChange={(e) => setEnforceMfaAdmin(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 border-stone-600 focus:ring-amber-500"
              />
              <span
                className={`text-xs ${
                  isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                }`}
              >
                Enforce mandatory Multi-Factor Authentication (MFA) for all Trust Officers & Administrators
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={enforceMfaPartner}
                onChange={(e) => setEnforceMfaPartner(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 border-stone-600 focus:ring-amber-500"
              />
              <span
                className={`text-xs ${
                  isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                }`}
              >
                Require 2FA for Farewell Network Care Partners managing sensitive family records
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={requireDocUpload}
                onChange={(e) => setRequireDocUpload(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 border-stone-600 focus:ring-amber-500"
              />
              <span
                className={`text-xs ${
                  isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                }`}
              >
                Mandate death certificate or burial permit before granting Verified Sanctuary status
              </span>
            </label>
          </div>

          <div className="pt-2 max-w-sm">
            <label
              className={`block text-xs font-medium mb-1.5 ${
                isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
              }`}
            >
              Audit Log Retention Schedule
            </label>
            <select
              value={retentionYears}
              onChange={(e) => setRetentionYears(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${
                isDark
                  ? 'border-[#202C40] bg-[#16120D] text-[#F8F5EE]'
                  : 'border-[#E5DED2] bg-white text-[#20242A]'
              }`}
            >
              <option value="perpetual">Perpetual (Immutable Cryptographic Log)</option>
              <option value="10_years">10 Years Statutory Retention</option>
              <option value="7_years">7 Years Standard</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" variant="primary">
            Save Security Settings
          </Button>
        </div>
      </form>
    </div>
  );
};
