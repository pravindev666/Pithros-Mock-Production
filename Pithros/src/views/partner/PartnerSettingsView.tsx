import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Settings,
  Bell,
  Clock,
  Phone,
  Shield,
  CheckCircle2,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../../components/ui/Button';

export const PartnerSettingsView: React.FC = () => {
  const { isDark } = useTheme();

  const [instantSms, setInstantSms] = useState(true);
  const [emergency24x7, setEmergency24x7] = useState(true);
  const [responseTargetHours, setResponseTargetHours] = useState('2');
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
            Care Partner Dispatch & Alert Settings
          </h1>
          <p
            className={`text-xs sm:text-sm mt-1 ${
              isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
            }`}
          >
            Configure family inquiry dispatch channels and bereavement response protocols.
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
          <span>Dispatch preferences updated.</span>
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
            Response Protocols
          </h2>

          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={instantSms}
                onChange={(e) => setInstantSms(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 border-stone-600 focus:ring-amber-500"
              />
              <span
                className={`text-xs ${
                  isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                }`}
              >
                Send high-priority SMS alert to on-duty director whenever a family submits an urgent inquiry
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={emergency24x7}
                onChange={(e) => setEmergency24x7(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 border-stone-600 focus:ring-amber-500"
              />
              <span
                className={`text-xs ${
                  isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                }`}
              >
                Indicate 24/7 immediate assistance availability on the Farewell Network
              </span>
            </label>
          </div>

          <div className="pt-2 max-w-sm">
            <label
              className={`block text-xs font-medium mb-1.5 ${
                isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
              }`}
            >
              Guaranteed First Response Window
            </label>
            <select
              value={responseTargetHours}
              onChange={(e) => setResponseTargetHours(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${
                isDark
                  ? 'border-[#202C40] bg-[#16120D] text-[#F8F5EE]'
                  : 'border-[#E5DED2] bg-white text-[#20242A]'
              }`}
            >
              <option value="1">Within 1 hour (Urgent bereavement care)</option>
              <option value="2">Within 2 hours (Recommended)</option>
              <option value="4">Within 4 hours</option>
              <option value="same_day">Same business day</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" variant="primary">
            Save Settings
          </Button>
        </div>
      </form>
    </div>
  );
};
