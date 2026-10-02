import React, { useCallback, useEffect, useState } from 'react';
import { Memorial } from '../../types';
import { Button } from '../../components/ui/Button';
import { MediaUploader } from '../../components/ui/MediaUploader';
import { VerificationBadge } from '../../components/ui/Badge';
import {
  ShieldCheck,
  Lock,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  ExternalLink,
} from 'lucide-react';
import {
  DOCUMENT_TYPE_LABELS,
  verificationApi,
  type VerificationEvidenceItem,
  type VerificationSubmissionOut,
} from '../../services/api/verification';
import { useTheme } from '../../context/ThemeContext';

interface DashboardVerificationViewProps {
  memorial: Memorial;
  onUpdate: () => void;
}

function humanState(state: string): string {
  switch (state) {
    case 'submitted':
    case 'verification_pending':
      return 'Submitted — being prepared for review';
    case 'verification_review':
      return 'In review — a reviewer is examining the documents';
    case 'needs_more_information':
      return 'More information requested';
    case 'approved':
      return 'Verified by the Pithros Trust team';
    case 'rejected':
      return 'Not approved — you can appeal';
    case 'appeal':
      return 'Appeal under review';
    default:
      return 'Awaiting documents';
  }
}

export const DashboardVerificationView: React.FC<DashboardVerificationViewProps> = ({
  memorial,
  onUpdate,
}) => {
  const { isDark } = useTheme();
  const [submission, setSubmission] = useState<VerificationSubmissionOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDocFile, setSelectedDocFile] = useState<File | null>(null);
  const [docType, setDocType] =
    useState<VerificationEvidenceItem['documentType']>('death_certificate');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [showAppeal, setShowAppeal] = useState(false);
  const [appealReason, setAppealReason] = useState('');
  const [isAppealing, setIsAppealing] = useState(false);

  const refresh = useCallback(async () => {
    const status = await verificationApi.getStatus(memorial.id);
    setSubmission(status);
    setLoading(false);
  }, [memorial.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const state =
    submission?.state ??
    (memorial.verificationStatus === 'approved' ? 'approved' : 'draft');
  const canSubmit = state === 'draft' || state === 'needs_more_information';

  const handleSubmitForReview = async () => {
    if (!selectedDocFile) {
      setSubmitError('Please choose a document to upload first.');
      return;
    }
    setSubmitError(null);
    setSubmitSuccess(null);
    setIsSubmitting(true);
    try {
      await verificationApi.submitDocument(memorial.id, selectedDocFile, {
        documentType: docType,
        label: DOCUMENT_TYPE_LABELS[docType],
      });
      setSelectedDocFile(null);
      setSubmitSuccess(
        'Your document was submitted. You will receive a notification when a decision is ready.',
      );
      await refresh();
      onUpdate();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'The submission could not be completed. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAppeal = async () => {
    if (!submission || !appealReason.trim()) return;
    setIsAppealing(true);
    setSubmitError(null);
    try {
      await verificationApi.appeal(submission.id, appealReason.trim());
      setShowAppeal(false);
      setAppealReason('');
      await refresh();
      onUpdate();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'The appeal could not be submitted.');
    } finally {
      setIsAppealing(false);
    }
  };

  const openEvidence = async (evidenceId: string) => {
    try {
      const access = await verificationApi.getEvidenceUrl(evidenceId);
      window.open(access.url, '_blank', 'noopener');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'The document could not be opened.');
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div className={`pb-4 border-b ${isDark ? 'border-[#202C40]' : 'border-[#E5DED2]'}`}>
        <span
          className={`text-[11px] uppercase tracking-widest font-medium ${
            isDark ? 'text-[#B99452]' : 'text-[#23324A]'
          }`}
        >
          Trust & Authenticity
        </span>
        <h2
          className={`text-2xl font-serif mt-0.5 ${isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'}`}
        >
          Verification Center
        </h2>
        <p className={`text-xs mt-1 ${isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'}`}>
          Submit evidence of passing for review. A reviewer checks it against the memorial
          details, and you are notified of the decision here.
        </p>
      </div>

      {submitSuccess && (
        <div className="flex items-center gap-2 p-3 rounded-xl border text-xs bg-[#122A1E] border-[#2D7A5F] text-[#6EE7B7]">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{submitSuccess}</span>
        </div>
      )}

      {submitError && (
        <div className="flex items-center gap-2 p-3 rounded-xl border text-xs bg-[#3A1414] border-[#7F1D1D] text-[#FCA5A5]">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

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
            <span className={`text-xs ${isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'}`}>
              {loading ? 'Loading status…' : humanState(state)}
            </span>
          </div>
        </div>

        {state === 'approved' && (
          <div
            className={`flex items-center gap-1.5 text-xs ${
              isDark ? 'text-[#6EE7B7]' : 'text-[#2D7A5F]'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Badge Active on Public Memorial</span>
          </div>
        )}

        {(state === 'submitted' ||
          state === 'verification_pending' ||
          state === 'verification_review' ||
          state === 'appeal') && (
          <div
            className={`flex items-center gap-1.5 text-xs ${
              isDark ? 'text-[#B99452]' : 'text-[#8C5C0F]'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>You will be notified when a decision is ready</span>
          </div>
        )}
      </div>

      {/* Decision reason + appeal (when applicable) */}
      {(state === 'needs_more_information' || state === 'rejected') && submission?.decisionReason && (
        <div
          className={`p-4 rounded-xl border text-xs space-y-1 ${
            isDark ? 'border-[#B99452]/40 bg-[#1A150F]' : 'border-[#D4C3A3] bg-[#FAF6EE]'
          }`}
        >
          <strong className={isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'}>
            Reviewer note
          </strong>
          <p className={`leading-relaxed ${isDark ? 'text-[#D9D2C6]' : 'text-[#4A4237]'}`}>
            {submission.decisionReason}
          </p>
        </div>
      )}

      {state === 'rejected' && submission && (
        <div
          className={`p-5 rounded-2xl border space-y-3 ${
            isDark ? 'border-[#202C40] bg-[#182337]' : 'border-[#E5DED2] bg-[#FCFAF5]'
          }`}
        >
          <h3 className={`text-sm font-serif ${isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'}`}>
            Appeal this decision
          </h3>
          {!showAppeal ? (
            <Button variant="outline" size="sm" onClick={() => setShowAppeal(true)}>
              Write an appeal
            </Button>
          ) : (
            <div className="space-y-3">
              <textarea
                value={appealReason}
                onChange={(e) => setAppealReason(e.target.value)}
                rows={3}
                placeholder="Explain what should be reconsidered, or what additional document you can provide."
                className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${
                  isDark
                    ? 'bg-[#111820] border-[#202C40] text-[#F8F5EE]'
                    : 'bg-white border-[#E5DED2] text-[#20242A]'
                }`}
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowAppeal(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleAppeal}
                  isLoading={isAppealing}
                  disabled={!appealReason.trim()}
                >
                  Submit Appeal
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Security Vault Banner */}
      <div
        className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${
          isDark ? 'bg-[#182337] border-[#202C40]' : 'bg-[#FCFAF5] border-[#E5DED2]'
        }`}
      >
        <Lock
          className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
            isDark ? 'text-[#6EE7B7]' : 'text-[#2D7A5F]'
          }`}
        />
        <div className="space-y-1">
          <strong className={`block ${isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'}`}>
            Certificates are never public
          </strong>
          <p className={`leading-relaxed ${isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'}`}>
            Uploaded documents are stored in a restricted vault and can be opened only by
            credentialed reviewers — never displayed on the public memorial.
          </p>
        </div>
      </div>

      {/* Uploaded documents */}
      {submission && submission.evidence.length > 0 && (
        <div
          className={`p-5 rounded-2xl border space-y-3 ${
            isDark ? 'border-[#202C40] bg-[#182337]' : 'border-[#E5DED2] bg-[#FCFAF5]'
          }`}
        >
          <h3 className={`text-sm font-serif ${isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'}`}>
            Documents you submitted
          </h3>
          <div className="space-y-2">
            {submission.evidence.map((item) => (
              <div
                key={item.id}
                className={`flex items-center justify-between p-3 rounded-xl border text-xs ${
                  isDark ? 'border-[#202C40] bg-[#14100C]' : 'border-[#E5DED2] bg-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 opacity-70" />
                  <span className={isDark ? 'text-[#D9D2C6]' : 'text-[#4A4237]'}>
                    {DOCUMENT_TYPE_LABELS[item.documentType as keyof typeof DOCUMENT_TYPE_LABELS] ??
                      item.label ??
                      item.documentType}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => openEvidence(item.id)}
                  className={`flex items-center gap-1 text-[11px] hover:underline ${
                    isDark ? 'text-[#B99452]' : 'text-[#23324A]'
                  }`}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Document Upload Section */}
      {canSubmit && (
        <div
          className={`p-6 rounded-2xl border space-y-5 ${
            isDark
              ? 'border-[#202C40] bg-[#182337]'
              : 'border-[#E5DED2] bg-[#FCFAF5] shadow-xs'
          }`}
        >
          <h3 className={`text-base font-serif ${isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'}`}>
            {state === 'needs_more_information'
              ? 'Upload the additional document'
              : 'Submit Documents for the "Document Reviewed" badge'}
          </h3>

          <div className="space-y-3">
            <p className={`text-xs ${isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'}`}>
              A death certificate, a newspaper obituary or funeral notice, or another official
              document works. PDF, JPG or PNG.
            </p>

            <div className="space-y-1.5">
              <label
                htmlFor="verification-doc-type"
                className={`block text-xs font-medium ${
                  isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                }`}
              >
                What kind of document is this?
              </label>
              <select
                id="verification-doc-type"
                value={docType}
                onChange={(e) =>
                  setDocType(e.target.value as VerificationEvidenceItem['documentType'])
                }
                className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${
                  isDark
                    ? 'border-[#202C40] bg-[#111820] text-[#F8F5EE]'
                    : 'border-[#E5DED2] bg-white text-[#20242A]'
                }`}
              >
                {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <MediaUploader
              label="Select or drag the document (PDF, JPG, PNG)"
              accept=".pdf,.png,.jpg,.jpeg"
              isVerificationDocument={true}
              onUploadComplete={(fileInfo) => {
                if (fileInfo.file) setSelectedDocFile(fileInfo.file);
              }}
            />

            <p className={`text-[11px] ${isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}`}>
              Only credentialed reviewers can see this document. If something is unclear, they
              will ask you for one more document — you will receive a notification either way.
            </p>

            <div className="pt-3 flex justify-end">
              <Button
                variant="primary"
                size="md"
                onClick={handleSubmitForReview}
                isLoading={isSubmitting}
                disabled={!selectedDocFile}
              >
                Submit for review
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
