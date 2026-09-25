import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, Lock, X } from 'lucide-react';
import { Button } from './Button';
import { useTheme } from '../../context/ThemeContext';

interface MediaUploaderProps {
  label?: string;
  accept?: string;
  isVerificationDocument?: boolean;
  onUploadComplete?: (fileInfo: { name: string; url: string; size: string }) => void;
  className?: string;
}

export const MediaUploader: React.FC<MediaUploaderProps> = ({
  label = 'Upload file',
  accept = 'image/*,application/pdf',
  isVerificationDocument = false,
  onUploadComplete,
  className = '',
}) => {
  const { isDark } = useTheme();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const simulateUpload = (file: File) => {
    setUploadProgress(10);
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev === null) return 10;
        if (prev >= 100) {
          clearInterval(interval);
          const fileInfo = {
            name: file.name,
            size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
            url: URL.createObjectURL(file),
          };
          setUploadedFile(fileInfo);
          onUploadComplete?.(fileInfo);
          return null;
        }
        return prev + 30;
      });
    }, 250);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      simulateUpload(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      simulateUpload(e.target.files[0]);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Confidential banner if verification doc */}
      {isVerificationDocument && (
        <div
          className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs ${
            isDark
              ? 'bg-[#2D7A5F]/15 border-[#2D7A5F]/30 text-[#6EE7B7]'
              : 'bg-[#EAF5EF] border-[#2D7A5F]/30 text-[#245C45]'
          }`}
        >
          <Lock className="w-3.5 h-3.5 flex-shrink-0" />
          <span>
            <strong>Strictly Confidential:</strong> Official certificates and identity documents are stored in an encrypted vault for reviewer verification only. They are <strong>never</strong> displayed on the public memorial.
          </span>
        </div>
      )}

      {uploadedFile ? (
        <div
          className={`flex items-center justify-between p-3.5 rounded-xl border ${
            isDark
              ? 'border-[#2D7A5F]/40 bg-[#182337]'
              : 'border-[#2D7A5F]/40 bg-[#FCFAF5]'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                isDark
                  ? 'bg-[#2D7A5F]/20 text-[#6EE7B7]'
                  : 'bg-[#EAF5EF] text-[#2D7A5F]'
              }`}
            >
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p
                className={`text-xs font-medium ${
                  isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                }`}
              >
                {uploadedFile.name}
              </p>
              <p
                className={`text-[11px] ${
                  isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'
                }`}
              >
                {uploadedFile.size} • Uploaded successfully
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2
              className={`w-4 h-4 ${
                isDark ? 'text-[#6EE7B7]' : 'text-[#2D7A5F]'
              }`}
            />
            <button
              type="button"
              onClick={() => setUploadedFile(null)}
              className={`p-1 rounded-md transition-colors cursor-pointer ${
                isDark
                  ? 'text-[#9EA3AA] hover:text-[#F8F5EE]'
                  : 'text-[#7D766D] hover:text-[#20242A]'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 text-center transition-colors cursor-pointer ${
            isDragging
              ? isDark
                ? 'border-[#B99452] bg-[#B99452]/5'
                : 'border-[#23324A] bg-[#E5DED2]'
              : isDark
              ? 'border-[#202C40] bg-[#182337]/60 hover:border-[#2D3D56] hover:bg-[#182337]/50'
              : 'border-[#E5DED2] bg-[#F3EEE4]/60 hover:border-[#23324A]/40 hover:bg-[#E5DED2]'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleChange}
            accept={accept}
            className="hidden"
          />

          <div
            className={`w-10 h-10 rounded-full mx-auto flex items-center justify-center mb-2 ${
              isDark
                ? 'bg-[#182337] text-[#B99452]'
                : 'bg-[#E5DED2] text-[#23324A]'
            }`}
          >
            <UploadCloud className="w-5 h-5" />
          </div>

          <p
            className={`text-xs font-medium ${
              isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
            }`}
          >
            {label}
          </p>
          <p
            className={`text-[11px] mt-0.5 ${
              isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'
            }`}
          >
            Drag and drop or click to browse (JPG, PNG, PDF up to 25MB)
          </p>

          {uploadProgress !== null && (
            <div className="mt-3 max-w-xs mx-auto">
              <div
                className={`w-full rounded-full h-1.5 overflow-hidden ${
                  isDark ? 'bg-[#182337]' : 'bg-[#E5DED2]'
                }`}
              >
                <div
                  className={`h-1.5 transition-all duration-200 ${
                    isDark ? 'bg-[#B99452]' : 'bg-[#23324A]'
                  }`}
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <span
                className={`text-[10px] mt-1 block ${
                  isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'
                }`}
              >
                Encrypting and uploading... {uploadProgress}%
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

