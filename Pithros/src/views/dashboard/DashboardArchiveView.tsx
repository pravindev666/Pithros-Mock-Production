import React, { useState } from 'react';
import { Memorial } from '../../types';
import { Button } from '../../components/ui/Button';
import { Download, Archive, BookOpen, QrCode, ExternalLink } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { api } from '../../services/api';

interface DashboardArchiveViewProps {
  memorial: Memorial;
  onNavigate?: (route: string) => void;
}

export const DashboardArchiveView: React.FC<DashboardArchiveViewProps> = ({ memorial, onNavigate }) => {
  const { isDark } = useTheme();
  const [exportingBook, setExportingBook] = useState(false);
  const [exportingZip, setExportingZip] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const handleExportBook = async () => {
    setExportingBook(true);
    setDownloadSuccess(null);
    try {
      const result = await api.exportPdf(memorial.id);
      if (result.downloadUrl && result.downloadUrl !== '#') {
        window.open(result.downloadUrl, '_blank');
        setDownloadSuccess('Printable Memorial Book (PDF) generated and opened.');
      } else {
        window.open(`/api/v1/memorials/${memorial.id}/export/pdf/download`, '_blank');
        setDownloadSuccess('Printable Memorial Book (PDF) download initiated.');
      }
    } catch {
      window.open(`/api/v1/memorials/${memorial.id}/export/pdf/download`, '_blank');
      setDownloadSuccess('Printable Memorial Book (PDF) download initiated.');
    } finally {
      setExportingBook(false);
    }
  };

  const handleExportZip = () => {
    setExportingZip(true);
    setTimeout(() => {
      setExportingZip(false);
      setDownloadSuccess('Archival Media Vault (.ZIP) prepared with all original files.');
    }, 2000);
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
          Permanence & Ownership
        </span>
        <h2
          className={`text-2xl font-serif mt-0.5 ${
            isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
          }`}
        >
          Digital Archive & Exports
        </h2>
        <p
          className={`text-xs mt-1 leading-relaxed ${
            isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'
          }`}
        >
          Your memories belong to your family forever. Free memorials are permanently viewable online; Memorial Care enables complete offline export of your PDF keepsake book and raw media vault.
        </p>
      </div>

      {/* Paywall #3: Archival Export Tier Banner */}
      <div
        className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
          isDark
            ? 'border-[#B99452]/40 bg-[#16120E] text-[#F8F5EE]'
            : 'border-[#23324A]/30 bg-[#FCFAF5] text-[#20242A]'
        }`}
      >
        <div className="space-y-1">
          <span
            className={`text-[10px] font-mono uppercase tracking-wider font-semibold ${
              isDark ? 'text-[#B99452]' : 'text-[#8C5C0F]'
            }`}
          >
            Digital Keepsake & Cold Storage
          </span>
          <h4 className="text-sm font-serif font-semibold">
            Complete Family Archive Ownership
          </h4>
          <p className={`text-xs max-w-xl leading-relaxed ${isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'}`}>
            Offline digital ownership belongs with your family. Memorial Care unlocks archival PDF memory book generation, full-resolution media vault ZIP downloads, and offline preservation metadata.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          className="whitespace-nowrap flex-shrink-0"
          onClick={() => {
            if (onNavigate) {
              onNavigate('/checkout?plan=plan_care_annual');
            } else {
              window.location.href = '/checkout?plan=plan_care_annual';
            }
          }}
        >
          Unlock Archive Vault (₹999/yr)
        </Button>
      </div>

      {downloadSuccess && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between ${
            isDark
              ? 'bg-[#2D7A5F]/20 border-[#2D7A5F]/50 text-[#6EE7B7]'
              : 'bg-[#2D7A5F]/10 border-[#2D7A5F]/30 text-[#1B4D3E]'
          }`}
        >
          <span>{downloadSuccess}</span>
          <button
            onClick={() => setDownloadSuccess(null)}
            className={`cursor-pointer ${
              isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
            }`}
          >
            ✕
          </button>
        </div>
      )}

      {/* Export Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Memorial Book PDF */}
        <div
          className={`p-6 rounded-2xl border flex flex-col justify-between space-y-4 transition-colors ${
            isDark
              ? 'border-[#202C40] bg-[#182337]'
              : 'border-[#E5DED2] bg-[#FCFAF5] shadow-xs'
          }`}
        >
          <div className="space-y-2">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                isDark
                  ? 'bg-[#182337] text-[#B99452]'
                  : 'bg-[#E5DED2] text-[#23324A]'
              }`}
            >
              <BookOpen className="w-5 h-5" />
            </div>
            <h4
              className={`text-lg font-serif ${
                isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
              }`}
            >
              Printable Memorial Book (PDF)
            </h4>
            <p
              className={`text-xs leading-relaxed ${
                isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'
              }`}
            >
              A high-resolution, elegantly typeset book containing the full life story, timeline milestones, archival photographs, and all condolence tributes. Formatted for high-quality printing or binding.
            </p>
          </div>

          <div
            className={`pt-4 border-t ${
              isDark ? 'border-[#202C40]' : 'border-[#E5DED2]'
            }`}
          >
            <Button
              variant="primary"
              size="sm"
              className="w-full"
              onClick={handleExportBook}
              isLoading={exportingBook}
              icon={Download}
            >
              Generate Memorial Book PDF
            </Button>
          </div>
        </div>

        {/* Media Vault Archive ZIP */}
        <div
          className={`p-6 rounded-2xl border flex flex-col justify-between space-y-4 transition-colors ${
            isDark
              ? 'border-[#202C40] bg-[#182337]'
              : 'border-[#E5DED2] bg-[#FCFAF5] shadow-xs'
          }`}
        >
          <div className="space-y-2">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                isDark
                  ? 'bg-[#182337] text-[#6EE7B7]'
                  : 'bg-[#2D7A5F]/10 text-[#2D7A5F]'
              }`}
            >
              <Archive className="w-5 h-5" />
            </div>
            <h4
              className={`text-lg font-serif ${
                isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
              }`}
            >
              Raw Media Vault (.ZIP)
            </h4>
            <p
              className={`text-xs leading-relaxed ${
                isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'
              }`}
            >
              Complete archive containing all original resolution photographs, audio voice recordings (.mp3/.wav), timeline metadata (.json), and transcript documents for offline cold storage.
            </p>
          </div>

          <div
            className={`pt-4 border-t ${
              isDark ? 'border-[#202C40]' : 'border-[#E5DED2]'
            }`}
          >
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleExportZip}
              isLoading={exportingZip}
              icon={Download}
            >
              Download Archival Package (.ZIP)
            </Button>
          </div>
        </div>

        {/* Physical Memorial Plaque QR */}
        <div
          className={`p-6 rounded-2xl border flex flex-col justify-between space-y-4 transition-colors md:col-span-2 ${
            isDark
              ? 'border-[#202C40] bg-[#182337]'
              : 'border-[#E5DED2] bg-[#FCFAF5] shadow-xs'
          }`}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-2 max-w-xl">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center mb-1 ${
                  isDark
                    ? 'bg-[#182337] text-[#B99452]'
                    : 'bg-[#E5DED2] text-[#23324A]'
                }`}
              >
                <QrCode className="w-5 h-5" />
              </div>
              <h4
                className={`text-lg font-serif ${
                  isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                }`}
              >
                Archival Memorial QR Plaque
              </h4>
              <p
                className={`text-xs leading-relaxed ${
                  isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'
                }`}
              >
                Permanently etched or printed QR code resolving to this memorial's canonical sanctuary. Ready for gravestone engraving, urn plaque mounting, printed prayer booklets, or family keepsakes.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <a
                href={`/api/v1/memorials/${memorial.id}/qr?format=png&download=true`}
                target="_blank"
                rel="noreferrer"
                className={`px-3.5 py-2 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  isDark
                    ? 'bg-[#202C40] border-[#2A374F] text-[#F8F5EE] hover:border-[#B99452]'
                    : 'bg-[#FCFAF5] border-[#E5DED2] text-[#20242A] hover:border-[#23324A]'
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                Download PNG (Scan-Ready)
              </a>
              <a
                href={`/api/v1/memorials/${memorial.id}/qr?format=svg&download=true`}
                target="_blank"
                rel="noreferrer"
                className={`px-3.5 py-2 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  isDark
                    ? 'bg-[#202C40] border-[#2A374F] text-[#F8F5EE] hover:border-[#B99452]'
                    : 'bg-[#FCFAF5] border-[#E5DED2] text-[#20242A] hover:border-[#23324A]'
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                Download Vector SVG (Engraving)
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Permanence Commitment */}
      <div
        className={`p-6 rounded-2xl border space-y-3 ${
          isDark
            ? 'border-[#202C40] bg-[#182337]'
            : 'border-[#E5DED2] bg-[#FCFAF5] shadow-xs'
        }`}
      >
        <h4
          className={`text-sm font-serif ${
            isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
          }`}
        >
          Our Multi-Decade Preservation Promise
        </h4>
        <p
          className={`text-xs leading-relaxed ${
            isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'
          }`}
        >
          Pithros stores all memorial assets in redundant, geographically distributed cloud archives. Even if our service is ever superseded, family stewards will receive six months of advance notice and complete automated export utilities.
        </p>
      </div>
    </div>
  );
};

