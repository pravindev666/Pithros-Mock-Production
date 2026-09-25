import React, { useState } from 'react';
import { Memorial } from '../../types';
import { Button } from '../../components/ui/Button';
import { MediaUploader } from '../../components/ui/MediaUploader';
import { VerificationBadge } from '../../components/ui/Badge';
import { ShieldCheck, Lock, CheckCircle2, Clock, AlertCircle, FileText } from 'lucide-react';
import { api } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

interface DashboardVerificationViewProps {
  memorial: Memorial;
  onUpdate: () => void;
}

export const DashboardVerificationView: React.FC<DashboardVerificationViewProps> = ({
  memorial,
  onUpdate,
}) => {
  const { isDark } = useTheme();
  const [docUploaded, setDocUploaded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitForReview = async () => {
    setIsSubmitting(true);
    await api.submitVerification(memorial.id, {
      documentType: 'Death Certificate / Registration',
      documentUrl: 'https://example.com/vault/cert.pdf',
    });
    setIsSubmitting(false);
    onUpdate();
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div
        className={`pb-4 border-b ${
          isDark ? 'border-[#202C40]' : 'border-[#E5DED2]'
        }`}
      >
        <span
          className={`text-[11px] uppercase tracking-widest font-medium ${
            isDark ? 'text-[#B99452]' : 'text-[#23324A]'
          }`}
        >
          Trust & Authenticity
        </span>
        <h2
          className={`text-2xl font-serif mt-0.5 ${
            isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
          }`}
        >
          Verification Center
        </h2>
        <p
          className={`text-xs mt-1 ${
            isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'
          }`}
        >
          Verify the authenticity of this memorial with official municipal documentation.
        </p>
      </div>

      {/* Current Status Card */}
      <div
        className={`p-6 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors ${
          isDark
            ? 'border-[#202C40] bg-[#182337]'
            : 'border-[#E5DED2] bg-[#FCFAF5] shadow-xs'
        }`}
      >
        <div>
          <span
            className={`text-[10px] uppercase tracking-wider block mb-1 ${
              isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
            }`}
          >
            Current Verification Tier
          </span>
          <div className="flex items-center gap-3">
            <VerificationBadge
              type={memorial.verificationBadgeType}
              status={memorial.verificationStatus}
            />
            <span
              className={`text-xs ${
                isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
              }`}
            >
              {memorial.verificationStatus === 'approved'
                ? 'Official records verified by Pithros Trust Team'
                : memorial.verificationStatus === 'under_review'
                ? 'Our review officers are currently auditing the submitted records'
                : 'Managed directly by family custodian'}
            </span>
          </div>
        </div>

        {memorial.verificationStatus === 'approved' && (
          <div
            className={`flex items-center gap-1.5 text-xs ${
              isDark ? 'text-[#6EE7B7]' : 'text-[#2D7A5F]'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Badge Live on Public Page</span>
          </div>
        )}
      </div>

      {/* Zero Public Exposure Commitment */}
      <div
        className={`p-5 rounded-2xl border flex items-start gap-3.5 text-xs ${
          isDark
            ? 'bg-[#2D7A5F]/10 border-[#2D7A5F]/30 text-[#D9D2C6]'
            : 'bg-[#2D7A5F]/8 border-[#2D7A5F]/20 text-[#20242A]'
        }`}
      >
        <Lock
          className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
            isDark ? 'text-[#6EE7B7]' : 'text-[#2D7A5F]'
          }`}
        />
        <div className="space-y-1">
          <strong
            className={`block ${
              isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
            }`}
          >
            Absolute Privacy Guarantee: Certificates are NEVER Public
          </strong>
          <p
            className={`leading-relaxed ${
              isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'
            }`}
          >
            Pithros does not display death certificates, Aadhaar cards, or sensitive municipal records to the public. Uploaded files are encrypted in a restricted trust vault and accessed solely by credentialed verification officers.
          </p>
        </div>
      </div>

      {/* Document Upload & Action */}
      {memorial.verificationStatus !== 'approved' && (
        <div
          className={`p-6 rounded-2xl border space-y-5 ${
            isDark
              ? 'border-[#202C40] bg-[#182337]'
              : 'border-[#E5DED2] bg-[#FCFAF5] shadow-xs'
          }`}
        >
          <h3
            className={`text-base font-serif ${
              isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
            }`}
          >
            Submit Documents for "Document Reviewed" Badge
          </h3>

          <div className="space-y-3">
            <p
              className={`text-xs ${
                isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'
              }`}
            >
              Accepted documents: Municipal Death Certificate, Hospital Medical Summary, Cremation / Burial Certificate, or Gazette Notification.
            </p>

            <MediaUploader
              label="Select or drag municipal certificate file"
              accept=".pdf,.png,.jpg,.jpeg"
              isVerificationDocument={true}
              onUploadComplete={() => setDocUploaded(true)}
            />

            <div className="pt-3 flex justify-end">
              <Button
                variant="primary"
                size="md"
                onClick={handleSubmitForReview}
                isLoading={isSubmitting}
                disabled={memorial.verificationStatus === 'under_review'}
              >
                {memorial.verificationStatus === 'under_review'
                  ? 'Application Under Review'
                  : 'Submit for Discretionary Review'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

