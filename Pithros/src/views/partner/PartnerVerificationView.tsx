import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  FileCheck,
  ShieldCheck,
  ShieldAlert,
  Upload,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Download,
  Building,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../../components/ui/Button';

interface DocumentRecord {
  id: string;
  name: string;
  category: string;
  status: 'verified' | 'under_review' | 'action_required';
  uploadedDate: string;
  expiryDate?: string;
  fileSize: string;
}

export const PartnerVerificationView: React.FC = () => {
  const { isDark } = useTheme();

  const [partnerVerificationStatus, setPartnerVerificationStatus] = useState<
    'verified' | 'under_review' | 'action_required'
  >('verified');

  const [documents, setDocuments] = useState<DocumentRecord[]>([
    {
      id: 'doc-1',
      name: 'Trade_License_Bereavement_2025_2027.pdf',
      category: 'Municipal Trade & Mortuary License',
      status: 'verified',
      uploadedDate: 'January 12, 2026',
      expiryDate: 'December 31, 2027',
      fileSize: '2.4 MB',
    },
    {
      id: 'doc-2',
      name: 'Professional_Indemnity_Insurance_Policy.pdf',
      category: 'Commercial Liability & Indemnity',
      status: 'verified',
      uploadedDate: 'February 04, 2026',
      expiryDate: 'February 03, 2027',
      fileSize: '4.1 MB',
    },
    {
      id: 'doc-3',
      name: 'Environmental_Sacred_Grove_Permit.pdf',
      category: 'Environmental Forestry Clearance',
      status: 'verified',
      uploadedDate: 'March 01, 2026',
      fileSize: '1.8 MB',
    },
  ]);

  const [uploadSuccess, setUploadSuccess] = useState(false);

  const handleSimulateUpload = () => {
    setUploadSuccess(true);
    setTimeout(() => setUploadSuccess(false), 3000);
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
            Verification & Accreditation Credentials
          </h1>
          <p
            className={`text-xs sm:text-sm mt-1 ${
              isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
            }`}
          >
            Pithros enforces strict verification standards before granting the Farewell Network trust mark.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {partnerVerificationStatus === 'verified' ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="w-3.5 h-3.5" />
              Verified Partner Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <Clock className="w-3.5 h-3.5" />
              Under Trust Review
            </span>
          )}
        </div>
      </div>

      {uploadSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>Document received and dispatched to Pithros Trust & Safety officers.</span>
        </motion.div>
      )}

      {/* Trust Status Card */}
      <div
        className={`p-6 rounded-2xl border space-y-3 ${
          partnerVerificationStatus === 'verified'
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
            Verified Care Partner Accreditation
          </h2>
        </div>
        <p
          className={`text-xs leading-relaxed max-w-3xl ${
            isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
          }`}
        >
          Your license and professional indemnity credentials have been independently validated by Pithros Trust Officers. Families viewing your profile on the Farewell Network can see your verified status badge and certified service offerings.
        </p>
      </div>

      {/* Upload New Document Box */}
      <div
        className={`p-6 rounded-2xl border border-dashed text-center space-y-3 ${
          isDark
            ? 'border-[#382F24] bg-[#182337]'
            : 'border-[#C4B9A8] bg-[#FCFAF5]'
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
            Upload Renewal or Additional Certification
          </h3>
          <p
            className={`text-xs mt-1 ${
              isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
            }`}
          >
            PDF, PNG, or JPEG format (Up to 10MB). Verified by Pithros within 24 business hours.
          </p>
        </div>
        <div className="pt-1">
          <Button variant="outline" size="sm" onClick={handleSimulateUpload}>
            Select Document File
          </Button>
        </div>
      </div>

      {/* Verified Documents List */}
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
            Active Document Records
          </h3>
          <span className="text-[11px] font-mono opacity-60">
            {documents.length} verified documents
          </span>
        </div>

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
                    {doc.category} • Uploaded {doc.uploadedDate}
                  </p>
                  {doc.expiryDate && (
                    <span className="text-[10px] font-mono text-emerald-400 block mt-0.5">
                      Valid through: {doc.expiryDate}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Verified
                </span>
                <button
                  type="button"
                  onClick={() => alert(`Downloading verified record: ${doc.name}`)}
                  className="p-1.5 rounded-lg border border-stone-700 text-stone-400 hover:text-stone-200"
                  title="Download file"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
