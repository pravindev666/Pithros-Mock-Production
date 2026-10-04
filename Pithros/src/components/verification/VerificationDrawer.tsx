import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, X, FileText, CheckCircle2, AlertTriangle, Lock } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { MOTION_TIMING, MOTION_EASING } from '../../lib/motion';
import { useDialogA11y } from '../../lib/useDialogA11y';

interface VerificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  badgeType?: 'Family Managed' | 'Document Reviewed' | 'Enhanced Verification';
  verifiedDate?: string;
  reviewerNotes?: string;
}

export const VerificationDrawer: React.FC<VerificationDrawerProps> = ({
  isOpen,
  onClose,
  badgeType = 'Document Reviewed',
  verifiedDate = 'Verified on file',
  reviewerNotes,
}) => {
  const { isDark } = useTheme();
  const dialogRef = useDialogA11y(isOpen, onClose);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: MOTION_TIMING.microSlow }}
            onClick={onClose}
            className={`fixed inset-0 backdrop-blur-xs ${
              isDark ? 'bg-black/70' : 'bg-black/40'
            }`}
          />

          {/* Drawer Panel */}
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="verification-drawer-title"
            tabIndex={-1}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: MOTION_TIMING.standard, ease: MOTION_EASING.cinematicEaseOut }}
            className={`relative z-10 w-full max-w-md h-full overflow-y-auto focus:outline-none border-l p-6 sm:p-8 flex flex-col justify-between shadow-2xl transition-colors ${
              isDark ? 'bg-[#182337] border-[#202C40] text-[#F8F5EE]' : 'bg-[#FCFAF5] border-[#E5DED2] text-[#20242A]'
            }`}
          >
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-inherit">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center ${
                      isDark ? 'bg-[#2D7A5F]/20 text-[#6EE7B7]' : 'bg-[#EAF5EF] text-[#245C45]'
                    }`}
                  >
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 id="verification-drawer-title" className="text-base font-serif font-medium">About this Review</h3>
                    <p className={`text-[11px] ${isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}`}>
                      Pithros Trust & Authenticity Architecture
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                    isDark
                      ? 'border-[#202C40] text-[#9EA3AA] hover:text-[#F8F5EE] hover:bg-[#182337]'
                      : 'border-[#E5DED2] text-[#7D766D] hover:text-[#20242A] hover:bg-[#E5DED2]'
                  }`}
                  aria-label="Close review details"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Status Banner */}
              <div
                className={`p-4 rounded-xl border space-y-1.5 ${
                  isDark ? 'border-[#2D7A5F]/40 bg-[#2D7A5F]/10' : 'border-[#96CBB4] bg-[#EAF5EF]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-serif font-semibold ${
                      isDark ? 'text-[#6EE7B7]' : 'text-[#245C45]'
                    }`}
                  >
                    Review Status: {badgeType}
                  </span>
                  <span
                    className={`text-[11px] font-sans ${
                      isDark ? 'text-[#6EE7B7]/80' : 'text-[#245C45]/80'
                    }`}
                  >
                    {verifiedDate}
                  </span>
                </div>
                <p className={`text-xs leading-relaxed ${isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'}`}>
                  Submitted documentation was reviewed according to Pithros standard verification guidelines.
                </p>
              </div>

              {/* Reviewed Material */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className={`w-4 h-4 ${isDark ? 'text-[#B99452]' : 'text-[#23324A]'}`} />
                  <h4 className="text-xs font-semibold uppercase tracking-wider">Reviewed Material</h4>
                </div>
                <p className={`text-xs leading-relaxed pl-6 ${isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'}`}>
                  Death documentation and family relationship confirmation were submitted for administrative review prior to issuing this badge.
                </p>
              </div>

              {/* What this means */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className={`w-4 h-4 ${isDark ? 'text-[#6EE7B7]' : 'text-[#2D7A5F]'}`} />
                  <h4 className="text-xs font-semibold uppercase tracking-wider">What this means</h4>
                </div>
                <p className={`text-xs leading-relaxed pl-6 ${isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'}`}>
                  Pithros reviewed the submitted documentation against the platform’s verification process to ensure the memorial is managed by an authorized family custodian or verified memorial steward.
                </p>
              </div>

              {/* What this does NOT mean */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className={`w-4 h-4 ${isDark ? 'text-[#B99452]' : 'text-[#23324A]'}`} />
                  <h4 className="text-xs font-semibold uppercase tracking-wider">What this does not mean</h4>
                </div>
                <div
                  className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
                    isDark
                      ? 'border-[#2D3D56] bg-[#182337]/70 text-[#D9D2C6]'
                      : 'border-[#E5DED2] bg-[#F3EEE4] text-[#554F48]'
                  }`}
                >
                  <p>
                    <strong>Important distinction:</strong> This badge does not represent a government certification, legal court determination, or probate ruling. It reflects private verification under Pithros community and platform standards.
                  </p>
                </div>
              </div>

              {/* Privacy Shield Notice */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2">
                  <Lock className={`w-4 h-4 ${isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}`} />
                  <h4 className="text-xs font-semibold uppercase tracking-wider">Document Privacy Guarantee</h4>
                </div>
                <p className={`text-xs leading-relaxed pl-6 ${isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'}`}>
                  Original municipal death certificates, identification numbers, and family records are stored in an encrypted vault accessible solely to trained verification staff. They are never published or made visible on the public web.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-6 border-t border-inherit text-center">
              <button
                type="button"
                onClick={onClose}
                className={`w-full py-2.5 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
                  isDark
                    ? 'border-[#2D3D56] bg-[#182337] text-[#F8F5EE] hover:bg-[#202C40]'
                    : 'border-[#E5DED2] bg-[#E5DED2] text-[#20242A] hover:bg-[#EAE2D5]'
                }`}
              >
                Close Verification Details
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
