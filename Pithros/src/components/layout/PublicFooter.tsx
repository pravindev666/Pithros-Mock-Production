import React, { useState } from 'react';
import { PithrosLogo } from '../visual/PithrosLogo';
import { ShieldCheck, HeartHandshake, Lock, Flag, Mail, X, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useLocale } from '../../context/LocaleContext';
import { api } from '../../services/api';

interface PublicFooterProps {
  onNavigate: (route: string) => void;
}

export const PublicFooter: React.FC<PublicFooterProps> = ({ onNavigate }) => {
  const { isDark } = useTheme();
  const { metadata } = useLocale();
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [supportEmail, setSupportEmail] = useState('');
  const [supportReason, setSupportReason] = useState('Inappropriate / Nudity / Explicit content');
  const [supportDetails, setSupportDetails] = useState('');
  const [supportSubmitting, setSupportSubmitting] = useState(false);
  const [supportSuccess, setSupportSuccess] = useState(false);
  const [supportError, setSupportError] = useState<string | null>(null);

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportEmail.trim() || !supportDetails.trim()) return;

    setSupportSubmitting(true);
    setSupportError(null);
    try {
      await api.submitReport({
        targetType: 'media',
        targetId: 'media_footer_report',
        targetTitle: 'Report via Footer Safety Desk',
        reason: supportReason,
        details: supportDetails.trim(),
        reporterEmail: supportEmail.trim(),
      });
      setSupportSuccess(true);
      setTimeout(() => {
        setSupportSuccess(false);
        setSupportModalOpen(false);
        setSupportEmail('');
        setSupportDetails('');
      }, 2500);
    } catch {
      setSupportError(
        'Reporting is not available yet — your report was not recorded. Please email the Trust Desk directly.',
      );
    } finally {
      setSupportSubmitting(false);
    }
  };

  return (
    <footer
      data-ui-component="navigation"
      style={{ fontFamily: metadata.uiFontFamily }}
      className={`w-full border-t transition-colors text-xs pt-16 pb-12 ${
        isDark
          ? 'border-[#202C40] bg-[#111820] text-[#9EA3AA]'
          : 'border-[#E5DED2] bg-[#F3EEE4] text-[#554F48]'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className={`grid grid-cols-1 md:grid-cols-5 gap-10 pb-12 border-b ${
            isDark ? 'border-[#202C40]' : 'border-[#E5DED2]'
          }`}
        >
          {/* Brand info */}
          <div className="md:col-span-2 space-y-4">
            <PithrosLogo />
            <p
              className={`text-sm font-serif italic max-w-sm mt-3 ${
                isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
              }`}
            >
              “A place to remember a life.”
            </p>
            <p className="text-xs leading-relaxed max-w-sm opacity-90">
              Pithros is a quiet, permanent digital remembrance platform where families preserve stories, photographs, voices, and milestones with dignity and uncompromised privacy.
            </p>
            <div
              className={`flex items-center gap-4 text-[12px] pt-2 ${
                isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
              }`}
            >
              <span className="flex items-center gap-1.5 font-medium">
                <Lock className={`w-3.5 h-3.5 ${isDark ? 'text-[#B99452]' : 'text-[#23324A]'}`} />
                Private by Default
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className={`w-3.5 h-3.5 ${isDark ? 'text-[#2D7A5F]' : 'text-[#397A5E]'}`} />
                Family Governed
              </span>
            </div>
          </div>

          {/* Platform */}
          <div>
            <h4
              className={`text-xs font-sans font-semibold uppercase tracking-widest mb-4 ${
                isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
              }`}
            >
              Platform
            </h4>
            <ul className="space-y-2.5">
              <li>
                <button
                  onClick={() => onNavigate('/memorials')}
                  className={`transition-colors hover:underline cursor-pointer ${
                    isDark ? 'hover:text-[#B99452]' : 'hover:text-[#23324A]'
                  }`}
                >
                  Explore Memorials
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/how-it-works')}
                  className={`transition-colors hover:underline cursor-pointer ${
                    isDark ? 'hover:text-[#B99452]' : 'hover:text-[#23324A]'
                  }`}
                >
                  How It Works
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/create-memorial')}
                  className={`transition-colors hover:underline cursor-pointer ${
                    isDark ? 'hover:text-[#B99452]' : 'hover:text-[#23324A]'
                  }`}
                >
                  Create a Memorial
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/pricing')}
                  className={`transition-colors hover:underline cursor-pointer ${
                    isDark ? 'hover:text-[#B99452]' : 'hover:text-[#23324A]'
                  }`}
                >
                  Family Plans & Archives
                </button>
              </li>
            </ul>
          </div>

          {/* Farewell Network */}
          <div>
            <h4
              className={`text-xs font-sans font-semibold uppercase tracking-widest mb-4 ${
                isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
              }`}
            >
              Farewell Network
            </h4>
            <ul className="space-y-2.5">
              <li>
                <button
                  onClick={() => onNavigate('/farewell')}
                  className={`transition-colors hover:underline cursor-pointer ${
                    isDark ? 'hover:text-[#B99452]' : 'hover:text-[#23324A]'
                  }`}
                >
                  Trusted Service Providers
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/farewell')}
                  className={`transition-colors hover:underline cursor-pointer ${
                    isDark ? 'hover:text-[#B99452]' : 'hover:text-[#23324A]'
                  }`}
                >
                  Service Directory
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/partner')}
                  className={`transition-colors hover:underline cursor-pointer ${
                    isDark ? 'hover:text-[#B99452]' : 'hover:text-[#23324A]'
                  }`}
                >
                  Provider Partner Portal
                </button>
              </li>
            </ul>
          </div>

          {/* Trust & Safety */}
          <div>
            <h4
              className={`text-xs font-sans font-semibold uppercase tracking-widest mb-4 ${
                isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
              }`}
            >
              Trust & Safety
            </h4>
            <ul className="space-y-2.5">
              <li>
                <button
                  onClick={() => onNavigate('/how-it-works')}
                  className={`transition-colors hover:underline cursor-pointer ${
                    isDark ? 'hover:text-[#B99452]' : 'hover:text-[#23324A]'
                  }`}
                >
                  Document Verification
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/pricing')}
                  className={`transition-colors hover:underline cursor-pointer ${
                    isDark ? 'hover:text-[#B99452]' : 'hover:text-[#23324A]'
                  }`}
                >
                  Zero Advertising Guarantee
                </button>
              </li>
              <li>
                <button
                  onClick={() => setSupportModalOpen(true)}
                  className={`transition-colors hover:underline cursor-pointer flex items-center gap-1.5 ${
                    isDark ? 'hover:text-[#B99452] text-[#B99452]' : 'hover:text-[#23324A] text-[#8C5C0F]'
                  }`}
                >
                  <Flag className="w-3 h-3 shrink-0" />
                  Report Inappropriate Content
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className={`pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[12px] ${
            isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
          }`}
        >
          <p>© {new Date().getFullYear()} Pithros. All memories preserved with quiet reverence.</p>
          <div className="flex flex-wrap items-center gap-5">
            <span>Religion-Neutral Design</span>
            <span>Family-Controlled Privacy</span>
            <span>Permanent Digital Archive</span>
          </div>
        </div>
      </div>

      {/* Trust & Safety Desk / Contact Support Modal */}
      {supportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className={`w-full max-w-lg rounded-2xl border shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto ${
              isDark ? 'bg-[#182337] border-[#202C40] text-[#F8F5EE]' : 'bg-[#FCFAF5] border-[#E5DED2] text-[#20242A]'
            }`}
          >
            <div className="flex items-start justify-between border-b pb-3 border-inherit">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-serif font-semibold">Trust & Safety Desk</h3>
                  <p className={`text-xs ${isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}`}>
                    Report explicit, non-reverent, or unauthorized content directly to admins.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSupportModalOpen(false)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isDark ? 'hover:bg-[#202C40] text-[#9EA3AA]' : 'hover:bg-[#E5DED2] text-[#7D766D]'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {supportSuccess ? (
              <div
                className={`p-4 rounded-xl border text-center space-y-2 ${
                  isDark ? 'bg-[#2D7A5F]/20 border-[#2D7A5F]/50 text-[#6EE7B7]' : 'bg-[#EAF5EF] border-[#96CBB4] text-[#245C45]'
                }`}
              >
                <CheckCircle2 className="w-8 h-8 mx-auto" />
                <p className="font-semibold text-sm">Report Received by Safety Desk</p>
                <p className="text-xs opacity-90 leading-relaxed">
                  Our Trust & Safety moderators review explicit content flags with urgent priority. If verified, the item will be quarantined from public display immediately.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSupportSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-medium mb-1">Your Contact Email</label>
                  <input
                    type="email"
                    required
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                    placeholder="name@example.com"
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${
                      isDark
                        ? 'bg-[#111820] border-[#202C40] text-[#F8F5EE] focus:border-[#B99452]'
                        : 'bg-white border-[#E5DED2] text-[#20242A] focus:border-[#23324A]'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-medium mb-1">Reason for Report</label>
                  <select
                    value={supportReason}
                    onChange={(e) => setSupportReason(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${
                      isDark
                        ? 'bg-[#111820] border-[#202C40] text-[#F8F5EE] focus:border-[#B99452]'
                        : 'bg-white border-[#E5DED2] text-[#20242A] focus:border-[#23324A]'
                    }`}
                  >
                    <option value="Inappropriate / Nudity / Explicit content">Inappropriate / Nudity / Explicit content</option>
                    <option value="Violence or Graphic content">Violence or Graphic content</option>
                    <option value="Privacy Violation / Unconsented photo">Privacy Violation / Unconsented photo</option>
                    <option value="Defamation / Mockery / Desecration">Defamation / Mockery / Desecration</option>
                    <option value="Copyright or Intellectual Property">Copyright or Intellectual Property</option>
                    <option value="Other Policy Violation">Other Policy Violation</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium mb-1">
                    Details (Describe the image, memorial name, or URL)
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={supportDetails}
                    onChange={(e) => setSupportDetails(e.target.value)}
                    placeholder="Please provide the name of the memorial or link, and describe the photo or tribute that violates community guidelines..."
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none resize-none leading-relaxed ${
                      isDark
                        ? 'bg-[#111820] border-[#202C40] text-[#F8F5EE] focus:border-[#B99452]'
                        : 'bg-white border-[#E5DED2] text-[#20242A] focus:border-[#23324A]'
                    }`}
                  />
                </div>

                {supportError && (
                  <p className="text-[11px] leading-relaxed text-[#B91C1C]">{supportError}</p>
                )}

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-inherit">
                  <button
                    type="button"
                    onClick={() => setSupportModalOpen(false)}
                    className={`px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                      isDark ? 'border-[#202C40] hover:bg-[#202C40]' : 'border-[#E5DED2] hover:bg-[#E5DED2]'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={supportSubmitting}
                    className="px-4 py-1.5 rounded-lg bg-[#B99452] hover:bg-[#A37F3E] text-white font-medium cursor-pointer transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {supportSubmitting ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <Flag className="w-3.5 h-3.5" />
                        <span>Submit Urgent Report</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </footer>
  );
};
