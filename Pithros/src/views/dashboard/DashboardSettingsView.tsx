import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Settings,
  Globe,
  Sliders,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Memorial } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { useLocale, SUPPORTED_LOCALES, SupportedLocale } from '../../context/LocaleContext';
import { Button } from '../../components/ui/Button';

interface DashboardSettingsViewProps {
  memorial: Memorial;
  onUpdate?: () => void;
  onNavigate?: (route: string) => void;
}

export const DashboardSettingsView: React.FC<DashboardSettingsViewProps> = ({
  memorial,
  onUpdate,
  onNavigate,
}) => {
  const { isDark } = useTheme();
  const { locale, setLocale, metadata } = useLocale();

  const [slug, setSlug] = useState(memorial.slug);
  const [calendarSystem, setCalendarSystem] = useState('gregorian');
  const [ambientAudio, setAmbientAudio] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div
      data-ui-component="form"
      style={{ fontFamily: metadata.uiFontFamily }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-inherit">
        <div>
          <h1
            className={`text-2xl sm:text-3xl font-serif ${
              isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
            }`}
          >
            Sanctuary Settings & Traditions
          </h1>
          <p
            className={`text-xs sm:text-sm mt-1 ${
              isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
            }`}
          >
            Configure custom domain, remembrance calendar systems, and cultural traditions for {memorial.fullName}.
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
          <span>Sanctuary settings updated successfully.</span>
        </motion.div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Custom URL */}
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
            Sanctuary Web Address
          </h2>
          <div className="max-w-lg">
            <label
              className={`block text-xs font-medium mb-1.5 ${
                isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
              }`}
            >
              Public Vanity Slug
            </label>
            <div className="flex items-center">
              <span
                className={`px-3 py-2 rounded-l-xl border border-r-0 text-xs ${
                  isDark
                    ? 'border-[#202C40] bg-[#182337] text-[#9EA3AA]'
                    : 'border-[#E5DED2] bg-[#E5DED2] text-[#7D766D]'
                }`}
              >
                pithros.org/m/
              </span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                required
                className={`flex-1 px-3 py-2 rounded-r-xl border text-xs focus:outline-none ${
                  isDark
                    ? 'border-[#202C40] bg-[#16120D] text-[#F8F5EE] focus:border-[#B99452]'
                    : 'border-[#E5DED2] bg-white text-[#20242A] focus:border-[#23324A]'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Cultural Customs and Calendar */}
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
            Cultural Customs & Calendar Observance
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                className={`block text-xs font-medium mb-1.5 ${
                  isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                }`}
              >
                Anniversary Calendar Calculation
              </label>
              <select
                value={calendarSystem}
                onChange={(e) => setCalendarSystem(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${
                  isDark
                    ? 'border-[#202C40] bg-[#16120D] text-[#F8F5EE]'
                    : 'border-[#E5DED2] bg-white text-[#20242A]'
                }`}
              >
                <option value="gregorian">Solar / Gregorian (Standard Solar Date)</option>
                <option value="lunar_tithi">Vedic Lunar Tithi (Waxing/Waning phase calculation)</option>
                <option value="hijri">Hijri Islamic Lunar Calendar</option>
                <option value="hebrew">Hebrew Yahrzeit Observance</option>
              </select>
            </div>

            <div>
              <label
                className={`block text-xs font-medium mb-1.5 ${
                  isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                }`}
              >
                Primary Sanctuary Language
              </label>
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value as SupportedLocale)}
                style={{ fontFamily: metadata.uiFontFamily }}
                className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${
                  isDark
                    ? 'border-[#202C40] bg-[#182337] text-[#F8F5EE]'
                    : 'border-[#E5DED2] bg-white text-[#20242A]'
                }`}
              >
                {Object.values(SUPPORTED_LOCALES).map((loc) => (
                  <option key={loc.code} value={loc.code} className={isDark ? 'bg-[#182337]' : 'bg-white'}>
                    {loc.nativeName} ({loc.name}) — {loc.tagline}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label className="flex items-center gap-3 pt-2 cursor-pointer">
            <input
              type="checkbox"
              checked={ambientAudio}
              onChange={(e) => setAmbientAudio(e.target.checked)}
              className="w-4 h-4 rounded text-amber-500 border-stone-600 focus:ring-amber-500"
            />
            <span
              className={`text-xs ${
                isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
              }`}
            >
              Enable quiet contemplative background soundscape when visitors browse the memorial
            </span>
          </label>
        </div>

        {/* Danger Zone */}
        <div
          className={`p-6 rounded-2xl border border-red-500/20 space-y-4 ${
            isDark ? 'bg-red-950/10' : 'bg-red-50/50'
          }`}
        >
          <div className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="w-4 h-4" />
            <h2 className="text-base font-serif">Sanctuary Archival & Transfer</h2>
          </div>
          <p
            className={`text-xs leading-relaxed ${
              isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
            }`}
          >
            Archiving places the sanctuary in permanent read-only mode. All media, condolence messages, and timeline stories remain preserved perpetually.
          </p>

          <div className="flex items-center gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onNavigate && onNavigate('/dashboard/archive')}
            >
              Open Digital Archive Center
            </Button>
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
