import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Memorial } from '../../types';
import { Button } from '../../components/ui/Button';
import {
  FileCheck,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Lock,
  ExternalLink,
  Eye,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export const AdminVerificationQueueView: React.FC = () => {
  const { isDark } = useTheme();
  const [memorials, setMemorials] = useState<Memorial[]>([]);
  const [selectedMemorial, setSelectedMemorial] = useState<Memorial | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    loadList();
  }, []);

  const loadList = async () => {
    const list = await api.getMemorials();
    setMemorials(list);
    const pending = list.find((m) => m.verificationStatus === 'under_review') || list[0];
    setSelectedMemorial(pending);
  };

  const handleApprove = async (id: string) => {
    await api.approveVerification(id, 'Document Reviewed');
    setActionSuccessMsg(`Memorial verification approved! "Document Reviewed" badge granted.`);
    setTimeout(() => setActionSuccessMsg(null), 2500);
    loadList();
  };

  const handleReject = async (id: string) => {
    await api.rejectVerification(id, 'Inconclusive documentation or date discrepancy.');
    setActionSuccessMsg(`Verification rejected with explanatory notice sent to steward.`);
    setTimeout(() => setActionSuccessMsg(null), 2500);
    loadList();
  };

  return (
    <div className="space-y-6">
      <div
        className={`pb-4 border-b flex items-center justify-between ${
          isDark ? 'border-[#202C40]' : 'border-[#E5DED2]'
        }`}
      >
        <div>
          <span
            className={`text-[10px] font-mono uppercase tracking-wider ${
              isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
            }`}
          >
            Operations Queue
          </span>
          <h1
            className={`text-xl font-serif mt-0.5 ${
              isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
            }`}
          >
            Verification Queue & Document Review
          </h1>
          <p
            className={`text-xs mt-0.5 ${
              isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'
            }`}
          >
            Audit submitted municipal records, extract dates, and grant authenticity badges.
          </p>
        </div>
      </div>

      {actionSuccessMsg && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
            isDark
              ? 'bg-[#2D7A5F]/20 border-[#2D7A5F]/50 text-[#6EE7B7]'
              : 'bg-[#2D7A5F]/15 border-[#2D7A5F]/35 text-[#1B4D3E]'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Queue List */}
        <div
          className={`lg:col-span-5 rounded-xl border p-4 space-y-2 transition-colors ${
            isDark
              ? 'border-[#202C40] bg-[#14100C]'
              : 'border-[#E5DED2] bg-[#FCFAF5] shadow-xs'
          }`}
        >
          <span
            className={`text-[10px] font-mono uppercase tracking-wider block mb-2 ${
              isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
            }`}
          >
            Verification Requests ({memorials.length})
          </span>

          <div className="space-y-2">
            {memorials.map((m) => {
              const isSelected = selectedMemorial?.id === m.id;
              return (
                <div
                  key={m.id}
                  onClick={() => setSelectedMemorial(m)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between text-xs ${
                    isSelected
                      ? isDark
                        ? 'border-[#B99452] bg-[#1E1812]'
                        : 'border-[#23324A] bg-[#E5DED2]'
                      : isDark
                      ? 'border-[#202C40] bg-[#14100C] hover:border-[#2D3D56]'
                      : 'border-[#E5DED2] bg-[#FFF8EE]/60 hover:border-[#23324A]/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <div
                      className={`w-7 h-7 rounded-full overflow-hidden flex-shrink-0 ${
                        isDark ? 'bg-[#182337]' : 'bg-[#EFE8DC]'
                      }`}
                    >
                      <img src={m.portraitUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="truncate">
                      <span
                        className={`font-medium block truncate ${
                          isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                        }`}
                      >
                        {m.fullName}
                      </span>
                      <span
                        className={`text-[10px] ${
                          isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                        }`}
                      >
                        {m.birthDate.slice(-4)} – {m.deathDate.slice(-4)}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-[9px] font-mono px-2 py-0.5 rounded-full ${
                      m.verificationStatus === 'under_review'
                        ? isDark
                          ? 'bg-[#B99452]/20 text-[#B99452] border border-[#B99452]/30 animate-pulse'
                          : 'bg-[#E5DED2] text-[#8C5C0F] border border-[#D9941E]/30 animate-pulse'
                        : m.verificationStatus === 'approved'
                        ? isDark
                          ? 'bg-[#2D7A5F]/20 text-[#6EE7B7]'
                          : 'bg-[#2D7A5F]/15 text-[#1B4D3E]'
                        : isDark
                        ? 'bg-[#202C40] text-[#9EA3AA]'
                        : 'bg-[#E5DED2] text-[#554F48]'
                    }`}
                  >
                    {m.verificationStatus}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Audit Inspector */}
        <div
          className={`lg:col-span-7 rounded-xl border p-6 space-y-5 transition-colors ${
            isDark
              ? 'border-[#202C40] bg-[#14100C]'
              : 'border-[#E5DED2] bg-[#FCFAF5] shadow-xs'
          }`}
        >
          {selectedMemorial ? (
            <>
              <div
                className={`flex items-start justify-between border-b pb-4 ${
                  isDark ? 'border-[#202C40]' : 'border-[#E5DED2]'
                }`}
              >
                <div>
                  <span
                    className={`text-[10px] uppercase font-mono ${
                      isDark ? 'text-[#B99452]' : 'text-[#23324A]'
                    }`}
                  >
                    Inspecting Memorial Record
                  </span>
                  <h3
                    className={`text-lg font-serif mt-0.5 ${
                      isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                    }`}
                  >
                    {selectedMemorial.fullName}
                  </h3>
                  <p
                    className={`text-xs ${
                      isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'
                    }`}
                  >
                    Steward: {selectedMemorial.stewardName} {selectedMemorial.stewardRelationship ? `(${selectedMemorial.stewardRelationship})` : ''}
                  </p>
                </div>

                <div className="text-right">
                  <span
                    className={`text-[10px] uppercase font-mono block ${
                      isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                    }`}
                  >
                    Status
                  </span>
                  <span
                    className={`text-xs font-semibold uppercase ${
                      isDark ? 'text-[#B99452]' : 'text-[#23324A]'
                    }`}
                  >
                    {selectedMemorial.verificationStatus}
                  </span>
                </div>
              </div>

              {/* Confidential Document Preview Card */}
              <div
                className={`p-4 rounded-xl border space-y-3 ${
                  isDark
                    ? 'bg-[#182337] border-[#2D3D56]'
                    : 'bg-[#E5DED2] border-[#E5DED2]'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span
                    className={`flex items-center gap-1.5 font-medium ${
                      isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                    }`}
                  >
                    <Lock
                      className={`w-3.5 h-3.5 ${
                        isDark ? 'text-[#B99452]' : 'text-[#23324A]'
                      }`}
                    /> Confidential Death Certificate
                  </span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                      isDark
                        ? 'text-[#6EE7B7] bg-[#2D7A5F]/20'
                        : 'text-[#1B4D3E] bg-[#2D7A5F]/15'
                    }`}
                  >
                    Encrypted AES-256
                  </span>
                </div>

                <div
                  className={`p-4 rounded-lg border text-xs font-mono space-y-1.5 ${
                    isDark
                      ? 'bg-[#0D0B09] border-[#202C40] text-[#9EA3AA]'
                      : 'bg-[#FCFAF5] border-[#E5DED2] text-[#554F48]'
                  }`}
                >
                  <div className="flex justify-between">
                    <span>Document:</span>
                    <span className={isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'}>Municipal_Death_Extract_2026.pdf</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Registration No:</span>
                    <span className={isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'}>MUNIC-BLR-2026-08129</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Matched Name:</span>
                    <span className={isDark ? 'text-[#6EE7B7]' : 'text-[#1B4D3E]'}>{selectedMemorial.fullName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Matched Date:</span>
                    <span className={isDark ? 'text-[#6EE7B7]' : 'text-[#1B4D3E]'}>{selectedMemorial.deathDate}</span>
                  </div>
                </div>

                <p
                  className={`text-[11px] leading-relaxed ${
                    isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'
                  }`}
                >
                  The uploaded municipal document matches the stated full name, dates, and resting city in our registry.
                </p>
              </div>

              {/* Reviewer Actions */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleReject(selectedMemorial.id)}
                  icon={XCircle}
                >
                  Reject with Notice
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleApprove(selectedMemorial.id)}
                  icon={ShieldCheck}
                >
                  Approve & Grant "Document Reviewed" Badge
                </Button>
              </div>
            </>
          ) : (
            <div
              className={`py-12 text-center text-xs ${
                isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
              }`}
            >
              Select a memorial from the queue to inspect.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

