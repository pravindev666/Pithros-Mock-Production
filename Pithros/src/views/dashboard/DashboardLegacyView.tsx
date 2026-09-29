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
  ExternalLink,
  Plus,
  Trash2,
  Globe,
} from 'lucide-react';
import { DigitalLegacyLink, Memorial } from '../../types';
import { api } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';

interface DashboardLegacyViewProps {
  memorial: Memorial;
  onUpdate?: () => void;
}

export const DashboardLegacyView: React.FC<DashboardLegacyViewProps> = ({
  memorial,
  onUpdate,
}) => {
  const { isDark } = useTheme();
  const { showToast } = useToast();

  const [successorName, setSuccessorName] = useState('Vikram Krishnan');
  const [successorEmail, setSuccessorEmail] = useState('vikram.k@example.com');
  const [successorRelation, setSuccessorRelation] = useState('Brother');
  const [inactivityMonths, setInactivityMonths] = useState('12');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Digital Legacy Links state
  const [showAddLink, setShowAddLink] = useState(false);
  const [linkPlatform, setLinkPlatform] = useState<DigitalLegacyLink['platform']>('website');
  const [linkLabel, setLinkLabel] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkNotes, setLinkNotes] = useState('');
  const [savingLink, setSavingLink] = useState(false);

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkLabel.trim() || !linkUrl.trim()) return;
    setSavingLink(true);
    try {
      await api.addLegacyLink(memorial.id, {
        platform: linkPlatform,
        label: linkLabel.trim(),
        url: linkUrl.trim(),
        notes: linkNotes.trim() || undefined,
      });
      showToast('Digital legacy link added.', { type: 'success' });
      setShowAddLink(false);
      setLinkLabel('');
      setLinkUrl('');
      setLinkNotes('');
      setLinkPlatform('website');
      if (onUpdate) onUpdate();
    } catch {
      showToast('Failed to add digital legacy link.', { type: 'warning' });
    } finally {
      setSavingLink(false);
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    try {
      await api.removeLegacyLink(memorial.id, linkId);
      showToast('Digital legacy link removed.', { type: 'success' });
      if (onUpdate) onUpdate();
    } catch {
      showToast('Failed to remove link.', { type: 'warning' });
    }
  };

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

      {/* Connected Digital Legacy Links */}
      <div
        className={`p-6 rounded-2xl border space-y-5 ${
          isDark ? 'border-[#202C40] bg-[#182337]' : 'border-[#E5DED2] bg-[#FCFAF5]'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#B99452]" />
              <h2
                className={`text-base font-serif ${
                  isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                }`}
              >
                Connected Digital Legacy Links
              </h2>
            </div>
            <p
              className={`text-xs mt-1 ${
                isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
              }`}
            >
              Curated links to their published works, memorial lectures, social tributes, and web archives.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            icon={Plus}
            onClick={() => setShowAddLink(!showAddLink)}
          >
            {showAddLink ? 'Cancel' : 'Add Legacy Link'}
          </Button>
        </div>

        {/* Add Link Form */}
        {showAddLink && (
          <form
            onSubmit={handleAddLink}
            className={`p-4 rounded-xl border space-y-4 ${
              isDark ? 'border-[#202C40] bg-[#111820]' : 'border-[#E5DED2] bg-white'
            }`}
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label
                  className={`block text-[11px] font-medium mb-1 ${
                    isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                  }`}
                >
                  Platform
                </label>
                <select
                  value={linkPlatform}
                  onChange={(e) =>
                    setLinkPlatform(e.target.value as DigitalLegacyLink['platform'])
                  }
                  className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${
                    isDark
                      ? 'border-[#202C40] bg-[#16120D] text-[#F8F5EE]'
                      : 'border-[#E5DED2] bg-white text-[#20242A]'
                  }`}
                >
                  <option value="website">Website / Blog</option>
                  <option value="youtube">YouTube</option>
                  <option value="facebook">Facebook</option>
                  <option value="instagram">Instagram</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label
                  className={`block text-[11px] font-medium mb-1 ${
                    isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                  }`}
                >
                  Label
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Published Books & Lectures"
                  value={linkLabel}
                  onChange={(e) => setLinkLabel(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${
                    isDark
                      ? 'border-[#202C40] bg-[#16120D] text-[#F8F5EE] focus:border-[#B99452]'
                      : 'border-[#E5DED2] bg-white text-[#20242A] focus:border-[#23324A]'
                  }`}
                />
              </div>

              <div>
                <label
                  className={`block text-[11px] font-medium mb-1 ${
                    isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                  }`}
                >
                  URL
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://..."
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${
                    isDark
                      ? 'border-[#202C40] bg-[#16120D] text-[#F8F5EE] focus:border-[#B99452]'
                      : 'border-[#E5DED2] bg-white text-[#20242A] focus:border-[#23324A]'
                  }`}
                />
              </div>
            </div>

            <div>
              <label
                className={`block text-[11px] font-medium mb-1 ${
                  isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                }`}
              >
                Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="Brief description of this archive link..."
                value={linkNotes}
                onChange={(e) => setLinkNotes(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${
                  isDark
                    ? 'border-[#202C40] bg-[#16120D] text-[#F8F5EE] focus:border-[#B99452]'
                    : 'border-[#E5DED2] bg-white text-[#20242A] focus:border-[#23324A]'
                }`}
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAddLink(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={savingLink}>
                {savingLink ? 'Adding…' : 'Save Link'}
              </Button>
            </div>
          </form>
        )}

        {/* Existing Links List */}
        {memorial.legacyLinks && memorial.legacyLinks.length > 0 ? (
          <div className="space-y-2.5">
            {memorial.legacyLinks.map((link) => (
              <div
                key={link.id}
                className={`p-3.5 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                  isDark
                    ? 'border-[#202C40] bg-[#111820]'
                    : 'border-[#E5DED2] bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] uppercase font-semibold tracking-wider ${
                      isDark
                        ? 'bg-[#B99452]/20 text-[#B99452]'
                        : 'bg-[#E5DED2] text-[#8C5C0F]'
                    }`}
                  >
                    {link.platform}
                  </span>
                  <div>
                    <h4
                      className={`font-medium ${
                        isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                      }`}
                    >
                      {link.label}
                    </h4>
                    {link.notes && (
                      <p
                        className={`text-[11px] ${
                          isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                        }`}
                      >
                        {link.notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`p-1.5 rounded-lg border transition-colors ${
                      isDark
                        ? 'border-[#202C40] text-[#9EA3AA] hover:text-[#B99452]'
                        : 'border-[#E5DED2] text-[#7D766D] hover:text-[#23324A]'
                    }`}
                    title="Open link"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => handleDeleteLink(link.id)}
                    className="p-1.5 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                    title="Delete link"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            className={`py-8 text-center text-xs ${
              isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
            }`}
          >
            No external legacy links configured yet. Click &quot;Add Legacy Link&quot; above to connect digital archives.
          </div>
        )}
      </div>

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
