import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Upload, Clock, CheckCircle2, FileText, Download } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../../components/ui/Button';
import {
  providersApi,
  type PartnerProfile,
  type PartnerVerification,
} from '../../services/api/providers';

interface DocumentRecord {
  id: string;
  name: string;
  url: string;
  uploadedDate: string;
}

const STATE_COPY: Record<string, { label: string; blurb: string }> = {
  draft: {
    label: 'Not submitted',
    blurb:
      'Upload at least one credential — a trade licence, registration certificate, or equivalent — then submit for review.',
  },
  submitted: {
    label: 'Under Trust Review',
    blurb:
      'Your credentials are with the review team. You will be notified here as soon as a decision is made.',
  },
  verification_pending: {
    label: 'Under Trust Review',
    blurb: 'Your credentials are being prepared for review.',
  },
  verification_review: {
    label: 'Under Trust Review',
    blurb: 'A Trust officer is reviewing your credentials now.',
  },
  approved: {
    label: 'Verified Partner Active',
    blurb:
      'Your credentials have been validated. Families viewing your profile can see your reviewed status and certified service offerings.',
  },
  needs_more_information: {
    label: 'Action required',
    blurb:
      'The review team needs an additional document. Read the note below, upload it, and submit again.',
  },
  rejected: {
    label: 'Application declined',
    blurb: 'Your application was declined. The reviewer note below explains why.',
  },
};

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

export const PartnerVerificationView: React.FC = () => {
  const { isDark } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<PartnerProfile | null>(null);
  const [verification, setVerification] = useState<PartnerVerification | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    try {
      const [partner, record] = await Promise.all([
        providersApi.getProfile(),
        providersApi.getVerification(),
      ]);
      setProfile(partner);
      setVerification(record);
      setLoadError(null);
    } catch {
      setLoadError('Your verification record could not be loaded right now.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const intent = await providersApi.createMediaIntent({
        filename: file.name,
        contentType: file.type || undefined,
        sizeBytes: file.size,
        kind: 'document',
        title: file.name,
      });
      const upload = await fetch(intent.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      });
      if (!upload.ok) throw new Error('upload rejected');
      await providersApi.completeMedia(intent.mediaId);
      await load();
      setNotice('Document received. Submit for review when your uploads are complete.');
    } catch {
      setError('That document could not be uploaded. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await providersApi.submitVerification();
      await load();
      setNotice(result.message);
    } catch (submitError) {
      setError(
        submitError instanceof Error && submitError.message
          ? submitError.message
          : 'Your credentials could not be submitted right now.',
      );
    } finally {
      setBusy(false);
    }
  };

  const state = verification?.state ?? 'draft';
  const copy = STATE_COPY[state] ?? STATE_COPY.draft;
  const documents: DocumentRecord[] = (verification?.documents ?? []).map((doc) => ({
    id: doc.id,
    name: doc.title || 'Credential document',
    url: doc.url,
    uploadedDate: formatDate(doc.createdAt),
  }));
  const isApproved = state === 'approved';
  const canSubmit = state === 'draft' || state === 'needs_more_information';

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
            Verification &amp; Accreditation Credentials
          </h1>
          <p
            className={`text-xs sm:text-sm mt-1 ${
              isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
            }`}
          >
            Pithros reviews credentials before granting the Farewell Network trust mark.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isApproved ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="w-3.5 h-3.5" />
              {copy.label}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <Clock className="w-3.5 h-3.5" />
              {copy.label}
            </span>
          )}
        </div>
      </div>

      {(notice || error) && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
            error
              ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
              : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
          }`}
        >
          {error ? (
            <FileText className="w-4 h-4 flex-shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          )}
          <span>{error ?? notice}</span>
        </motion.div>
      )}

      {/* Trust Status Card */}
      <div
        className={`p-6 rounded-2xl border space-y-3 ${
          isApproved
            ? isDark
              ? 'border-emerald-500/30 bg-emerald-950/10'
              : 'border-emerald-600/30 bg-emerald-50/50'
            : isDark
            ? 'border-amber-500/30 bg-amber-950/10'
            : 'border-amber-600/30 bg-amber-50/50'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <h2
            className={`text-base font-serif font-medium ${
              isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
            }`}
          >
            {profile?.businessName || 'Your organisation'} — credential review
          </h2>
        </div>
        <p
          className={`text-xs leading-relaxed max-w-3xl ${
            isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
          }`}
        >
          {copy.blurb}
        </p>
        {verification?.decisionReason && (
          <p
            className={`text-xs leading-relaxed max-w-3xl ${
              isDark ? 'text-[#D9D2C6]' : 'text-[#3E3831]'
            }`}
          >
            Reviewer note: {verification.decisionReason}
          </p>
        )}
        {verification?.submittedAt && (
          <p className="text-[11px] font-mono opacity-60">
            Submitted {formatDate(verification.submittedAt)}
          </p>
        )}
      </div>

      {/* Upload New Document Box */}
      <div
        className={`p-6 rounded-2xl border border-dashed text-center space-y-3 ${
          isDark ? 'border-[#382F24] bg-[#182337]' : 'border-[#C4B9A8] bg-[#FCFAF5]'
        }`}
      >
        <div className="w-10 h-10 mx-auto rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center">
          <Upload className="w-5 h-5" />
        </div>
        <div>
          <h3
            className={`text-sm font-medium ${
              isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
            }`}
          >
            Upload licence or registration certificate
          </h3>
          <p
            className={`text-xs mt-1 ${
              isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
            }`}
          >
            PDF or image up to 10MB. Reviewed by Pithros Trust officers.
          </p>
        </div>
        <div className="pt-1">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            className="hidden"
            onChange={handleFileSelected}
          />
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
          >
            {busy ? 'Uploading…' : 'Select Document File'}
          </Button>
        </div>
      </div>

      {/* Document Records */}
      <div
        className={`p-5 rounded-2xl border space-y-4 ${
          isDark ? 'border-[#202C40] bg-[#182337]' : 'border-[#E5DED2] bg-[#FCFAF5]'
        }`}
      >
        <div className="flex items-center justify-between">
          <h3
            className={`text-sm font-medium ${
              isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
            }`}
          >
            Uploaded documents
          </h3>
          <span className="text-[11px] font-mono opacity-60">
            {documents.length} {documents.length === 1 ? 'document' : 'documents'}
          </span>
        </div>

        {isLoading ? (
          <p className="text-xs text-stone-400">Loading your documents…</p>
        ) : loadError ? (
          <p className="text-xs text-amber-500">{loadError}</p>
        ) : documents.length === 0 ? (
          <p className="text-xs text-stone-400">
            No documents uploaded yet. You need at least one before you can submit for review.
          </p>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className={`p-4 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isDark ? 'border-[#202C40] bg-[#16120D]' : 'border-[#E5DED2] bg-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4
                      className={`font-medium ${
                        isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                      }`}
                    >
                      {doc.name}
                    </h4>
                    <p
                      className={`text-[11px] mt-0.5 ${
                        isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                      }`}
                    >
                      Uploaded {doc.uploadedDate}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg border border-stone-700 text-stone-400 hover:text-stone-200"
                    title="Open document"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {canSubmit && (
          <div className="pt-2 flex justify-end">
            <Button
              variant="primary"
              size="sm"
              disabled={busy || documents.length === 0}
              onClick={handleSubmit}
            >
              {busy ? 'Submitting…' : 'Submit for review'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
