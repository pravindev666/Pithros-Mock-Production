import React, { useState } from 'react';
import { useDisputes } from '../../hooks/useDisputes';
import { useTheme } from '../../context/ThemeContext';
import { AdminDispute, DisputeEvidence } from '../../types';
import { Button } from '../../components/ui/Button';
import {
  Scale,
  CheckCircle2,
  FileText,
  AlertCircle,
  Clock,
  Shield,
  Send,
  ArrowUpRight,
  ExternalLink,
  MessageSquare,
} from 'lucide-react';
import { api } from '../../services/api';

export const AdminDisputesView: React.FC = () => {
  const { isDark } = useTheme();
  const { disputes, isLoading, isUnavailable, addNote, updateStatus } = useDisputes();
  const [selectedDispute, setSelectedDispute] = useState<AdminDispute | null>(null);
  const [newNoteText, setNewNoteText] = useState<string>('');
  const [resolutionSummary, setResolutionSummary] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const activeItem = selectedDispute
    ? disputes.find((d) => d.id === selectedDispute.id) || selectedDispute
    : disputes[0] || null;

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItem || !newNoteText.trim()) return;
    await addNote(activeItem.id, 'Deepa Rao (Senior Trust Officer)', newNoteText.trim());
    await api.logSensitiveDocAccess('Deepa Rao', 'Admin / Trust Reviewer', `DISPUTE_INTERNAL_NOTE: ${activeItem.memorialName}`, activeItem.id);
    setNewNoteText('');
    setSuccessMsg('Confidential internal note appended to dispute ledger.');
    setTimeout(() => setSuccessMsg(null), 2500);
  };

  const handleStatusUpdate = async (status: AdminDispute['status']) => {
    if (!activeItem) return;
    await updateStatus(activeItem.id, status, resolutionSummary.trim() || undefined);
    await api.logSensitiveDocAccess('Deepa Rao', 'Admin / Trust Reviewer', `DISPUTE_STATUS_${status.toUpperCase()}: ${activeItem.memorialName}`, activeItem.id);
    setSuccessMsg(`Dispute updated to "${status}".`);
    setResolutionSummary('');
    setTimeout(() => setSuccessMsg(null), 2500);
  };

  const getStatusBadge = (status: AdminDispute['status']) => {
    switch (status) {
      case 'claim':
        return isDark ? 'bg-[#B99452]/20 text-[#B99452]' : 'bg-[#E5DED2] text-[#8C5C0F]';
      case 'evidence_review':
        return isDark ? 'bg-[#3B82F6]/20 text-[#60A5FA]' : 'bg-[#EFF6FF] text-[#1D4ED8]';
      case 'under_review':
        return isDark ? 'bg-[#A855F7]/20 text-[#C084FC]' : 'bg-[#FAF5FF] text-[#7E22CE]';
      case 'escalated':
        return isDark ? 'bg-[#F97316]/20 text-[#FB923C]' : 'bg-[#FFF7ED] text-[#C2410C]';
      case 'resolved':
        return isDark ? 'bg-[#2D7A5F]/20 text-[#6EE7B7]' : 'bg-[#EAF5EF] text-[#245C45]';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div
        className={`pb-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          isDark ? 'border-[#202C40]' : 'border-[#E5DED2]'
        }`}
      >
        <div>
          <span
            className={`text-[10px] font-mono uppercase tracking-wider ${
              isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
            }`}
          >
            Family Stewardship Trust & Concierge
          </span>
          <h1
            className={`text-xl font-serif mt-0.5 ${
              isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
            }`}
          >
            Memorial Ownership Claims & Disputes
          </h1>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'}`}>
            Pithros does not auto-decide family ownership. Claims require verified evidence and confidential mediation.
          </p>
        </div>
      </div>

      {successMsg && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
            isDark
              ? 'bg-[#2D7A5F]/20 border-[#2D7A5F]/50 text-[#6EE7B7]'
              : 'bg-[#2D7A5F]/15 border-[#2D7A5F]/35 text-[#1B4D3E]'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Queue */}
        <div
          className={`lg:col-span-5 rounded-xl border p-4 space-y-3 transition-colors ${
            isDark
              ? 'border-[#202C40] bg-[#14100C]'
              : 'border-[#E5DED2] bg-[#FCFAF5] shadow-xs'
          }`}
        >
          <span
            className={`text-[10px] font-mono uppercase tracking-wider block ${
              isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
            }`}
          >
            Active Claims ({disputes.length})
          </span>

          {isUnavailable && (
            <p className={`text-[11px] italic leading-relaxed ${isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}`}>
              Ownership disputes are not available yet — the server does not store claims. Nothing is
              listed here rather than showing invented claims.
            </p>
          )}

          <div className="space-y-2.5">
            {disputes.map((d) => {
              const isSelected = activeItem?.id === d.id;
              return (
                <div
                  key={d.id}
                  onClick={() => setSelectedDispute(d)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer text-xs space-y-2 ${
                    isSelected
                      ? isDark
                        ? 'border-[#B99452] bg-[#1E1812]'
                        : 'border-[#23324A] bg-[#E5DED2]'
                      : isDark
                      ? 'border-[#202C40] bg-[#182337]/60 hover:border-[#2D3D56]'
                      : 'border-[#E5DED2] bg-[#FFF8EE]/60 hover:border-[#23324A]/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm font-serif">{d.memorialName}</span>
                    <span
                      className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full ${getStatusBadge(
                        d.status
                      )}`}
                    >
                      {d.status.replace('_', ' ')}
                    </span>
                  </div>

                  <p className={`text-[11px] leading-relaxed line-clamp-2 ${isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'}`}>
                    <strong>Claimant:</strong> {d.claimantName} ({d.claimantRelation})
                  </p>

                  <div className="flex items-center justify-between text-[10px] opacity-75 font-mono pt-1">
                    <span>Evidence docs: {d.evidence.length}</span>
                    <span>Notes: {d.internalNotes.length}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Inspection & Internal Notes Console */}
        <div
          className={`lg:col-span-7 rounded-xl border p-5 space-y-5 transition-colors ${
            isDark
              ? 'border-[#202C40] bg-[#14100C]'
              : 'border-[#E5DED2] bg-[#FCFAF5] shadow-xs'
          }`}
        >
          {activeItem ? (
            <div className="space-y-5">
              {/* Claim Overview */}
              <div className="border-b pb-3 border-inherit flex items-start justify-between">
                <div>
                  <span
                    className={`text-[10px] font-mono uppercase tracking-wider block ${
                      isDark ? 'text-[#B99452]' : 'text-[#23324A]'
                    }`}
                  >
                    Dispute ID: {activeItem.id} • Status: {activeItem.status.toUpperCase()}
                  </span>
                  <h3
                    className={`text-lg font-serif mt-0.5 ${
                      isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                    }`}
                  >
                    {activeItem.memorialName}
                  </h3>
                </div>
              </div>

              {/* Parties */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className={`p-3 rounded-xl border ${isDark ? 'bg-[#182337] border-[#202C40]' : 'bg-[#E5DED2] border-[#E5DED2]'}`}>
                  <span className="text-[10px] uppercase font-mono block opacity-70">Claimant</span>
                  <p className="font-semibold mt-0.5">{activeItem.claimantName}</p>
                  <p className="text-[11px] opacity-80">{activeItem.claimantRelation}</p>
                  <p className="text-[10px] font-mono opacity-70 mt-1">{activeItem.claimantEmail}</p>
                </div>

                <div className={`p-3 rounded-xl border ${isDark ? 'bg-[#182337] border-[#202C40]' : 'bg-[#E5DED2] border-[#E5DED2]'}`}>
                  <span className="text-[10px] uppercase font-mono block opacity-70">Respondent</span>
                  <p className="font-semibold mt-0.5">{activeItem.respondentName}</p>
                  <p className="text-[11px] opacity-80">Existing Registered Memorial Steward</p>
                </div>
              </div>

              {/* Summary */}
              <div className="text-xs space-y-1">
                <span className="font-semibold block opacity-80">Dispute Claim Summary</span>
                <p className={`p-3 rounded-xl border leading-relaxed ${isDark ? 'bg-[#182337] border-[#202C40]' : 'bg-[#E5DED2] border-[#E5DED2]'}`}>
                  {activeItem.disputeSummary}
                </p>
              </div>

              {/* Evidence Section */}
              <div className="text-xs space-y-2">
                <span className="font-semibold block opacity-80">Submitted Legal / Lineage Evidence</span>
                {activeItem.evidence.length === 0 ? (
                  <p className="text-[11px] italic opacity-60">No documents attached yet.</p>
                ) : (
                  <div className="space-y-2">
                    {activeItem.evidence.map((ev) => (
                      <div
                        key={ev.id}
                        className={`p-3 rounded-xl border flex items-center justify-between ${
                          isDark ? 'bg-[#182337] border-[#202C40]' : 'bg-[#E5DED2] border-[#E5DED2]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <FileText className="w-4 h-4 text-[#23324A]" />
                          <div>
                            <span className="font-medium block">{ev.title}</span>
                            <span className="text-[10px] opacity-70 font-mono">
                              Type: {ev.documentType} • Notes: {ev.notes || 'Awaiting audit review'}
                            </span>
                          </div>
                        </div>
                        <a
                          href={ev.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg border border-inherit hover:opacity-80 transition-opacity"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Internal Notes Timeline */}
              <div className="text-xs space-y-2 pt-2 border-t border-inherit">
                <span className="font-semibold block opacity-80">Confidential Internal Notes (Trust Desk Only)</span>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {activeItem.internalNotes.map((note) => (
                    <div
                      key={note.id}
                      className={`p-2.5 rounded-lg border text-[11px] space-y-1 ${
                        isDark ? 'bg-[#1A1410] border-[#2E2720]' : 'bg-[#E5DED2] border-[#E5DED2]'
                      }`}
                    >
                      <div className="flex items-center justify-between font-mono text-[10px] opacity-75">
                        <span className="font-semibold text-[#23324A]">{note.author}</span>
                        <span>{new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="leading-relaxed">{note.text}</p>
                    </div>
                  ))}
                </div>

                {/* Add Note Form */}
                <form onSubmit={handleAddNote} className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    placeholder="Append internal finding or family communication record..."
                    className={`flex-1 px-3 py-2 rounded-xl border text-xs focus:outline-none ${
                      isDark
                        ? 'bg-[#182337] border-[#202C40] text-[#F8F5EE] focus:border-[#B99452]'
                        : 'bg-[#FCFAF5] border-[#E5DED2] text-[#20242A] focus:border-[#23324A]'
                    }`}
                  />
                  <Button variant="primary" size="sm" type="submit" icon={Send}>
                    Add Note
                  </Button>
                </form>
              </div>

              {/* Resolution & Escalation Actions */}
              <div className="pt-3 border-t border-inherit space-y-2.5">
                <span className="text-[10px] uppercase font-mono tracking-wider block opacity-75">
                  Mediation Actions & Lifecycle Transition
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-[11px]"
                    onClick={() => handleStatusUpdate('evidence_review')}
                  >
                    Request Evidence
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-[11px]"
                    onClick={() => handleStatusUpdate('under_review')}
                  >
                    Family Review
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-[11px] text-[#A855F7]"
                    onClick={() => handleStatusUpdate('escalated')}
                    icon={ArrowUpRight}
                  >
                    Escalate Legal
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full text-[11px]"
                    onClick={() => handleStatusUpdate('resolved')}
                    icon={CheckCircle2}
                  >
                    Resolve Dispute
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-16 text-center text-xs opacity-60">
              <Scale className="w-8 h-8 mx-auto mb-2 opacity-40" />
              Select a dispute claim to view evidence and mediation history.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
