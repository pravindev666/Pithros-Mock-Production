import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldAlert, CheckCircle2, Upload, FileText, AlertCircle } from 'lucide-react';
import { Button } from './Button';
import { useTheme } from '../../context/ThemeContext';
import { modalBackdropVariants, modalDialogVariants } from '../../lib/motion';
import { Memorial } from '../../types';
import { useDisputes } from '../../hooks/useDisputes';

interface DisputeModalProps {
  isOpen: boolean;
  memorial: Memorial;
  onClose: () => void;
}

export const DisputeModal: React.FC<DisputeModalProps> = ({
  isOpen,
  memorial,
  onClose,
}) => {
  const { isDark } = useTheme();
  const { submitDisputeClaim } = useDisputes();

  const [claimantName, setClaimantName] = useState('');
  const [claimantEmail, setClaimantEmail] = useState('');
  const [claimantRelation, setClaimantRelation] = useState('');
  const [summary, setSummary] = useState('');
  const [evidenceTitle, setEvidenceTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimantName.trim() || !claimantEmail.trim() || !summary.trim()) return;

    setSubmitting(true);
    await submitDisputeClaim({
      memorialId: memorial.id,
      memorialName: memorial.fullName,
      claimantName: claimantName.trim(),
      claimantEmail: claimantEmail.trim(),
      claimantRelation: claimantRelation.trim() || 'Immediate Family Member',
      respondentName: `${memorial.stewardName} (Current Steward)`,
      disputeSummary: summary.trim(),
      evidence: evidenceTitle
        ? [
            {
              id: `ev_${Date.now()}`,
              title: evidenceTitle.trim(),
              documentType: 'Legal Relationship Record',
              fileUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=800',
              submittedAt: new Date().toISOString(),
              notes: 'Uploaded by claimant for review by Trust & Safety Desk.',
            },
          ]
        : [],
    });

    setSubmitting(false);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 2400);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
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
          className={`relative z-10 w-full max-w-lg rounded-2xl border p-6 sm:p-7 shadow-2xl my-8 transition-colors ${
            isDark
              ? 'border-[#202C40] bg-[#182337]'
              : 'border-[#E5DED2] bg-[#FCFAF5]'
          }`}
          variants={modalDialogVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          {/* Header */}
          <div
            className={`flex items-start justify-between pb-4 border-b ${
              isDark ? 'border-[#202C40]' : 'border-[#E5DED2]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`p-2 rounded-xl ${
                  isDark ? 'bg-[#B99452]/10 text-[#B99452]' : 'bg-[#23324A]/10 text-[#23324A]'
                }`}
              >
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3
                  className={`text-lg font-serif ${
                    isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                  }`}
                >
                  Family Stewardship Claim & Dispute
                </h3>
                <p
                  className={`text-xs ${
                    isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                  }`}
                >
                  Pithros does not auto-decide ownership. Claims are reviewed with evidence.
                </p>
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
            <div className="py-10 text-center space-y-3">
              <CheckCircle2
                className={`w-12 h-12 mx-auto ${
                  isDark ? 'text-[#2D7A5F]' : 'text-[#397A5E]'
                }`}
              />
              <h4
                className={`text-lg font-serif ${
                  isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                }`}
              >
                Claim Filed with Trust Concierge
              </h4>
              <p
                className={`text-xs max-w-sm mx-auto leading-relaxed ${
                  isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'
                }`}
              >
                Your claim and relationship evidence have been registered under private review. Our Trust Desk will contact both family parties confidentially.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div
                className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                  isDark ? 'bg-[#182337] border-[#202C40] text-[#D9D2C6]' : 'bg-[#E5DED2] border-[#E5DED2] text-[#554F48]'
                }`}
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-[#23324A] mt-0.5" />
                <span className="leading-relaxed">
                  Stewardship disputes are handled through confidential mediation, evidence review, and consensus wherever possible.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label
                    className={`block text-xs font-medium mb-1 ${
                      isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                    }`}
                  >
                    Your Full Legal Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={claimantName}
                    onChange={(e) => setClaimantName(e.target.value)}
                    placeholder="e.g. Radhika Menon"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs transition-colors focus:outline-none ${
                      isDark
                        ? 'bg-[#182337] border-[#202C40] text-[#F8F5EE] focus:border-[#B99452]'
                        : 'bg-[#FCFAF5] border-[#E5DED2] text-[#20242A] focus:border-[#23324A]'
                    }`}
                  />
                </div>

                <div>
                  <label
                    className={`block text-xs font-medium mb-1 ${
                      isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                    }`}
                  >
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={claimantEmail}
                    onChange={(e) => setClaimantEmail(e.target.value)}
                    placeholder="name@example.com"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs transition-colors focus:outline-none ${
                      isDark
                        ? 'bg-[#182337] border-[#202C40] text-[#F8F5EE] focus:border-[#B99452]'
                        : 'bg-[#FCFAF5] border-[#E5DED2] text-[#20242A] focus:border-[#23324A]'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label
                  className={`block text-xs font-medium mb-1 ${
                    isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                  }`}
                >
                  Relationship to {memorial.fullName} *
                </label>
                <input
                  type="text"
                  required
                  value={claimantRelation}
                  onChange={(e) => setClaimantRelation(e.target.value)}
                  placeholder="e.g. Surviving spouse, eldest daughter, legal executor"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs transition-colors focus:outline-none ${
                    isDark
                      ? 'bg-[#182337] border-[#202C40] text-[#F8F5EE] focus:border-[#B99452]'
                      : 'bg-[#FCFAF5] border-[#E5DED2] text-[#20242A] focus:border-[#23324A]'
                  }`}
                />
              </div>

              <div>
                <label
                  className={`block text-xs font-medium mb-1 ${
                    isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                  }`}
                >
                  Nature of Dispute / Requested Resolution *
                </label>
                <textarea
                  rows={3}
                  required
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Describe your requested change (e.g., joint family co-stewardship, story revision, or transfer of administration)..."
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs transition-colors focus:outline-none resize-none ${
                    isDark
                      ? 'bg-[#182337] border-[#202C40] text-[#F8F5EE] focus:border-[#B99452]'
                      : 'bg-[#FCFAF5] border-[#E5DED2] text-[#20242A] focus:border-[#23324A]'
                  }`}
                />
              </div>

              <div>
                <label
                  className={`block text-xs font-medium mb-1 ${
                    isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                  }`}
                >
                  Supporting Evidence / Document Title
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={evidenceTitle}
                    onChange={(e) => setEvidenceTitle(e.target.value)}
                    placeholder="e.g. Legal Lineage Certificate, Court Order, Ration Card Extract"
                    className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl border text-xs transition-colors focus:outline-none ${
                      isDark
                        ? 'bg-[#182337] border-[#202C40] text-[#F8F5EE] focus:border-[#B99452]'
                        : 'bg-[#FCFAF5] border-[#E5DED2] text-[#20242A] focus:border-[#23324A]'
                    }`}
                  />
                  <FileText
                    className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${
                      isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                    }`}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-inherit">
                <Button variant="outline" size="sm" type="button" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  disabled={submitting}
                  icon={ShieldAlert}
                >
                  {submitting ? 'Submitting...' : 'File Confidential Claim'}
                </Button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
