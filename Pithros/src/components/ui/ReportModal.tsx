import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertTriangle, CheckCircle2, Shield } from 'lucide-react';
import { Button } from './Button';
import { useTheme } from '../../context/ThemeContext';
import { modalBackdropVariants, modalDialogVariants } from '../../lib/motion';
import { api } from '../../services/api';

export type ReportTargetType = 'memorial' | 'tribute' | 'media' | 'provider' | 'review';

interface ReportModalProps {
  isOpen: boolean;
  targetTitle: string;
  targetType?: ReportTargetType;
  targetId?: string;
  onClose: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  targetTitle,
  targetType = 'memorial',
  targetId = 'target_unknown',
  onClose,
}) => {
  const { isDark } = useTheme();
  const reasons = [
    'Inappropriate / Nudity / Explicit content',
    'Violence or Graphic content',
    'Harassment or Defamation',
    'Impersonation',
    'Privacy concern',
    'Incorrect information',
    'Fraudulent content',
    'Other',
  ] as const;

  type ReportReason = typeof reasons[number];

  const [reason, setReason] = useState<ReportReason>('Inappropriate / Nudity / Explicit content');
  const [details, setDetails] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !details.trim()) return;

    setSubmitting(true);
    await api.submitReport({
      targetType,
      targetId,
      targetTitle,
      reason,
      details: details.trim(),
      reporterEmail: email.trim(),
    });
    setSubmitting(false);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 2000);
  };

  const targetLabel = {
    memorial: 'Memorial Profile',
    tribute: 'Tribute Message',
    media: 'Archival Photograph / Media',
    provider: 'Farewell Service Provider',
    review: 'Provider Recommendation',
  }[targetType];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          className={`fixed inset-0 backdrop-blur-sm ${
            isDark ? 'bg-[#111820]/85' : 'bg-[#20242A]/40'
          }`}
          variants={modalBackdropVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          onClick={onClose}
        />

        <motion.div
          className={`relative z-10 w-full max-w-md rounded-2xl border p-6 shadow-2xl transition-colors ${
            isDark
              ? 'border-[#202C40] bg-[#182337]'
              : 'border-[#E5DED2] bg-[#FCFAF5]'
          }`}
          variants={modalDialogVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <div
            className={`flex items-start justify-between pb-3 border-b ${
              isDark ? 'border-[#202C40]' : 'border-[#E5DED2]'
            }`}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle
                className={`w-5 h-5 ${
                  isDark ? 'text-[#B99452]' : 'text-[#23324A]'
                }`}
              />
              <div>
                <h3
                  className={`text-lg font-serif ${
                    isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                  }`}
                >
                  Report Content
                </h3>
                <span
                  className={`text-[11px] font-mono ${
                    isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                  }`}
                >
                  Target: {targetLabel}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isDark
                  ? 'text-[#9EA3AA] hover:text-[#F8F5EE] hover:bg-[#182337]'
                  : 'text-[#7D766D] hover:text-[#20242A] hover:bg-[#E5DED2]'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {submitted ? (
            <div className="py-8 text-center space-y-3">
              <CheckCircle2
                className={`w-10 h-10 mx-auto ${
                  isDark ? 'text-[#2D7A5F]' : 'text-[#397A5E]'
                }`}
              />
              <h4
                className={`text-base font-serif ${
                  isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                }`}
              >
                Report Received in Trust Desk
              </h4>
              <p
                className={`text-xs max-w-xs mx-auto leading-relaxed ${
                  isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'
                }`}
              >
                Thank you for safeguarding the reverence of Pithros. Our trust and moderation officers review all reported items confidentially.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div
                className={`p-2.5 rounded-xl border text-xs ${
                  isDark
                    ? 'bg-[#182337] border-[#202C40] text-[#D9D2C6]'
                    : 'bg-[#E5DED2] border-[#E5DED2] text-[#554F48]'
                }`}
              >
                <span className="font-semibold block mb-0.5">{targetTitle}</span>
                <span className={`text-[11px] ${isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}`}>
                  Flagged items are quarantined if violation of family dignity or truthfulness is identified.
                </span>
              </div>

              <div>
                <label
                  className={`block text-xs font-medium mb-1.5 ${
                    isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                  }`}
                >
                  Primary Concern *
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value as any)}
                  className={`w-full px-3 py-2 rounded-xl border text-xs transition-colors focus:outline-none ${
                    isDark
                      ? 'bg-[#182337] border-[#202C40] text-[#F8F5EE] focus:border-[#B99452]'
                      : 'bg-[#FCFAF5] border-[#E5DED2] text-[#20242A] focus:border-[#23324A]'
                  }`}
                >
                  {reasons.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  className={`block text-xs font-medium mb-1.5 ${
                    isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                  }`}
                >
                  Specific Details *
                </label>
                <textarea
                  rows={3}
                  required
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Please describe why this content does not belong or what factual correction is needed..."
                  className={`w-full px-3 py-2 rounded-xl border text-xs transition-colors focus:outline-none resize-none ${
                    isDark
                      ? 'bg-[#182337] border-[#202C40] text-[#F8F5EE] focus:border-[#B99452]'
                      : 'bg-[#FCFAF5] border-[#E5DED2] text-[#20242A] focus:border-[#23324A]'
                  }`}
                />
              </div>

              <div>
                <label
                  className={`block text-xs font-medium mb-1.5 ${
                    isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                  }`}
                >
                  Your Contact Email *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="For confidential follow-up if needed"
                  className={`w-full px-3 py-2 rounded-xl border text-xs transition-colors focus:outline-none ${
                    isDark
                      ? 'bg-[#182337] border-[#202C40] text-[#F8F5EE] focus:border-[#B99452]'
                      : 'bg-[#FCFAF5] border-[#E5DED2] text-[#20242A] focus:border-[#23324A]'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" type="button" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  disabled={submitting}
                  icon={AlertTriangle}
                >
                  {submitting ? 'Submitting...' : 'Submit Report'}
                </Button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
