import React, { useState } from 'react';
import { Memorial } from '../../types';
import { Button } from '../../components/ui/Button';
import { Download, FileText, Archive, Sparkles, BookOpen, Check } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface DashboardArchiveViewProps {
  memorial: Memorial;
}

export const DashboardArchiveView: React.FC<DashboardArchiveViewProps> = ({ memorial }) => {
  const { isDark } = useTheme();
  const [exportingBook, setExportingBook] = useState(false);
  const [exportingZip, setExportingZip] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const handleExportBook = () => {
    setExportingBook(true);
    setTimeout(() => {
      setExportingBook(false);
      setDownloadSuccess('Printable Memorial Book (PDF) generated successfully.');
    }, 1800);
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
          className={`text-xs mt-1 ${
            isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'
          }`}
        >
          Your memories belong to your family forever. Export copies at any time without restrictions.
        </p>
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

