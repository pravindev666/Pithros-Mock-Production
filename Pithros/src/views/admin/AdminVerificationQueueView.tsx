import React, { useCallback, useEffect, useState } from 'react';
import {
  verificationApi,
  type VerificationQueueItem,
  type VerificationSubmissionOut,
} from '../../services/api/verification';
import { Button } from '../../components/ui/Button';
import {
  FileCheck,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  ExternalLink,
  FileText,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export const AdminVerificationQueueView: React.FC = () => {
  const { isDark } = useTheme();
  const [items, setItems] = useState<VerificationQueueItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<VerificationSubmissionOut | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showRawText, setShowRawText] = useState(false);
  const [pendingAction, setPendingAction] = useState<'reject' | 'request' | null>(null);
  const [reason, setReason] = useState('');
  const [isActing, setIsActing] = useState(false);

  const loadDetail = useCallback(async (submissionId: string) => {
    setDetailLoading(true);
    setDetail(null);
    setShowRawText(false);
    try {
      const full = await verificationApi.getSubmission(submissionId);
      setDetail(full);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The submission could not be loaded.');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const loadQueue = useCallback(async () => {
    setListLoading(true);
    setError(null);
    try {
      const queue = await verificationApi.getQueue();
      setItems(queue);
      const keep = queue.find((item) => item.id === selectedId) ?? queue[0] ?? null;
      setSelectedId(keep ? keep.id : null);
      if (keep) {
        await loadDetail(keep.id);
      } else {
        setDetail(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The review queue could not be loaded.');
    } finally {
      setListLoading(false);
    }
  }, [loadDetail, selectedId]);

  useEffect(() => {
    void loadQueue();
    // Load once on mount; refreshes are explicit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = items.find((item) => item.id === selectedId) ?? null;

  const runDecision = async (kind: 'approve' | 'reject' | 'request', decisionReason: string) => {
    if (!selectedId) return;
    setIsActing(true);
    setActionError(null);
    setActionMsg(null);
    try {
      if (kind === 'approve') {
        await verificationApi.approve(selectedId, decisionReason || 'Documents reviewed and verified.');
        setActionMsg('Approved. The memorial now carries the "Document Reviewed" badge and the family has been notified.');
      } else if (kind === 'reject') {
        await verificationApi.reject(selectedId, decisionReason || 'Documentation did not support the submission.');
        setActionMsg('Rejected with a notice. The family has been notified and can appeal.');
      } else {
        await verificationApi.requestInfo(selectedId, decisionReason || 'Please provide an additional official document.');
        setActionMsg('Information requested. The family has been notified with your note.');
      }
      setPendingAction(null);
      setReason('');
      await loadQueue();
      setTimeout(() => setActionMsg(null), 4000);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'The decision could not be recorded.');
    } finally {
      setIsActing(false);
    }
  };

  const openEvidence = async (evidenceId: string) => {
    setActionError(null);
    try {
      const access = await verificationApi.getEvidenceUrl(evidenceId);
      window.open(access.url, '_blank', 'noopener');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'The document could not be opened.');
    }
  };

  const automated = detail?.automatedResult;
  const risks = detail?.riskSignals;
  const overallRisk = risks?.overall_risk ?? risks?.overallRisk ?? null;
  const docConfidence = risks?.document_type_confidence ?? risks?.documentTypeConfidence ?? null;
  const nameMatch = risks?.name_match ?? risks?.nameMatch ?? null;
  const dateMatch = risks?.date_match ?? risks?.dateMatch ?? null;
  const regNumbers = automated?.registration_numbers ?? automated?.registrationNumbers ?? [];
  const keywords = automated?.document_keywords_found ?? automated?.documentKeywordsFound ?? [];
  const rawPreview = automated?.raw_text_preview ?? automated?.rawTextPreview ?? '';
  const ocrEngine = automated?.ocr_engine ?? automated?.ocrEngine ?? null;
  const hasAnalysis = Boolean(automated) || Boolean(risks);

  const stateChip = (state: string) =>
    state === 'appeal'
      ? 'bg-[#B93A32]/15 text-[#991B1B] border border-[#B93A32]/35'
      : state === 'verification_review'
        ? isDark
          ? 'bg-[#B99452]/20 text-[#B99452] border border-[#B99452]/30'
          : 'bg-[#E5DED2] text-[#8C5C0F] border border-[#D9941E]/30'
        : isDark
          ? 'bg-[#202C40] text-[#9EA3AA]'
          : 'bg-[#E5DED2] text-[#554F48]';

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
            Operations Queue • OCR-assisted review
          </span>
          <h1
            className={`text-xl font-serif mt-0.5 ${isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'}`}
          >
            Verification Queue
          </h1>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'}`}>
            Tesseract OCR extracts text and heuristic checks highlight inconsistencies — the
            decision is always yours.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={() => void loadQueue()} icon={RefreshCw}>
          Refresh Queue
        </Button>
      </div>

      {actionMsg && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
            isDark
              ? 'bg-[#2D7A5F]/20 border-[#2D7A5F]/50 text-[#6EE7B7]'
              : 'bg-[#2D7A5F]/15 border-[#2D7A5F]/35 text-[#1B4D3E]'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{actionMsg}</span>
        </div>
      )}

      {(error || actionError) && (
        <div className="p-3.5 rounded-xl border text-xs flex items-center gap-2 bg-[#3A1414] border-[#7F1D1D] text-[#FCA5A5]">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error ?? actionError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Queue List */}
        <div
          className={`lg:col-span-5 rounded-xl border p-4 space-y-2 transition-colors ${
            isDark ? 'border-[#202C40] bg-[#14100C]' : 'border-[#E5DED2] bg-[#FCFAF5] shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className={`text-[10px] font-mono uppercase tracking-wider ${
                isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
              }`}
            >
              Queue Items ({items.length})
            </span>
            <span className={`text-[10px] font-mono ${isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}`}>
              Oldest first
            </span>
          </div>

          {listLoading ? (
            <p className={`text-xs py-8 text-center ${isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}`}>
              Loading queue…
            </p>
          ) : items.length === 0 ? (
            <p className={`text-xs py-8 text-center ${isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}`}>
              The review queue is clear. New submissions will appear here.
            </p>
          ) : (
            <div className="space-y-2">
              {items.map((item) => {
                const isSelected = selectedId === item.id;
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => {
                      setSelectedId(item.id);
                      void loadDetail(item.id);
                    }}
                    className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between text-xs ${
                      isSelected
                        ? isDark
                          ? 'border-[#B99452] bg-[#1E1812] shadow-sm'
                          : 'border-[#23324A] bg-[#E5DED2] shadow-sm'
                        : isDark
                          ? 'border-[#202C40] bg-[#14100C] hover:border-[#2D3D56]'
                          : 'border-[#E5DED2] bg-[#FFF8EE]/60 hover:border-[#23324A]/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <div
                        className={`w-8 h-8 rounded-full flex-shrink-0 border flex items-center justify-center font-semibold ${
                          isDark
                            ? 'bg-[#182337] border-[#2D3D56] text-[#B99452]'
                            : 'bg-[#EFE8DC] border-[#D0C7B8] text-[#23324A]'
                        }`}
                      >
                        {item.memorialName?.charAt(0) ?? '•'}
                      </div>
                      <div className="truncate">
                        <span
                          className={`font-medium block truncate ${
                            isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                          }`}
                        >
                          {item.memorialName}
                        </span>
                        <span
                          className={`text-[10px] block ${
                            isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                          }`}
                        >
                          {item.evidenceCount} document{item.evidenceCount === 1 ? '' : 's'}
                          {item.submittedAt
                            ? ` • ${new Date(item.submittedAt).toLocaleDateString()}`
                            : ''}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span
                        className={`text-[9px] font-mono px-2 py-0.5 rounded-full ${stateChip(item.state)}`}
                      >
                        {item.state.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Inspector */}
        <div
          className={`lg:col-span-7 rounded-xl border p-6 space-y-5 transition-colors ${
            isDark ? 'border-[#202C40] bg-[#14100C]' : 'border-[#E5DED2] bg-[#FCFAF5] shadow-xs'
          }`}
        >
          {!selected ? (
            <div className={`py-12 text-center text-xs ${isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}`}>
              No submission is selected.
            </div>
          ) : detailLoading ? (
            <div className={`py-12 text-center text-xs ${isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}`}>
              Loading submission…
            </div>
          ) : detail ? (
            <>
              <div
                className={`flex items-start justify-between border-b pb-4 ${
                  isDark ? 'border-[#202C40]' : 'border-[#E5DED2]'
                }`}
              >
                <div>
                  <span
                    className={`text-[10px] uppercase font-mono tracking-wider ${
                      isDark ? 'text-[#B99452]' : 'text-[#23324A]'
                    }`}
                  >
                    Inspecting Memorial Submission
                  </span>
                  <h3 className={`text-lg font-serif mt-0.5 ${isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'}`}>
                    {selected.memorialName}
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'}`}>
                    {detail.submittedAt
                      ? `Submitted ${new Date(detail.submittedAt).toLocaleString()}`
                      : 'Submission time not recorded'}
                  </p>
                </div>
                <span
                  className={`text-[10px] font-mono uppercase px-2.5 py-1 rounded-full ${stateChip(detail.state)}`}
                >
                  {detail.state.replace(/_/g, ' ')}
                </span>
              </div>

              {/* Evidence */}
              <div className="space-y-2">
                <h4 className={`text-xs font-semibold ${isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'}`}>
                  Submitted documents ({detail.evidence.length})
                </h4>
                {detail.evidence.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-3 rounded-lg border text-xs ${
                      isDark ? 'bg-[#14100C] border-[#202C40]' : 'bg-[#FCFAF5] border-[#E5DED2]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 opacity-70" />
                      <span className={isDark ? 'text-[#D9D2C6]' : 'text-[#4A4237]'}>
                        {item.documentType.replace(/_/g, ' ')}
                        {item.label ? ` — ${item.label}` : ''}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => void openEvidence(item.id)}
                      className={`flex items-center gap-1 text-[11px] hover:underline ${
                        isDark ? 'text-[#B99452]' : 'text-[#23324A]'
                      }`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open document
                    </button>
                  </div>
                ))}
              </div>

              {/* Automated analysis (only what actually exists) */}
              {hasAnalysis ? (
                <div
                  className={`rounded-xl border p-4 space-y-4 ${
                    isDark ? 'bg-[#182337] border-[#2D3D56]' : 'bg-[#EFE8DC]/60 border-[#D8CEBE]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h4 className={`text-xs font-semibold ${isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'}`}>
                      OCR & consistency signals
                      {ocrEngine ? (
                        <span
                          className={`ml-2 text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                            isDark
                              ? 'bg-[#14100C] border-[#202C40] text-[#9EA3AA]'
                              : 'bg-white border-[#E5DED2] text-[#554F48]'
                          }`}
                        >
                          {ocrEngine}
                        </span>
                      ) : null}
                    </h4>
                    <span
                      className={`text-[10px] font-mono px-2.5 py-1 rounded-full font-semibold uppercase flex items-center gap-1 ${
                        overallRisk === 'low'
                          ? isDark
                            ? 'bg-[#2D7A5F]/20 text-[#6EE7B7] border border-[#2D7A5F]/50'
                            : 'bg-[#2D7A5F]/15 text-[#1B4D3E] border border-[#2D7A5F]/35'
                          : overallRisk === 'medium'
                            ? isDark
                              ? 'bg-[#B99452]/20 text-[#B99452] border border-[#B99452]/50'
                              : 'bg-[#D9941E]/15 text-[#8C5C0F] border border-[#D9941E]/40'
                            : isDark
                              ? 'bg-[#B93A32]/20 text-[#FCA5A5] border border-[#B93A32]/50'
                              : 'bg-[#B93A32]/15 text-[#991B1B] border border-[#B93A32]/35'
                      }`}
                    >
                      {overallRisk === 'low' ? (
                        <ShieldCheck className="w-3.5 h-3.5" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5" />
                      )}
                      {overallRisk ?? 'unknown'} risk
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div
                      className={`p-3 rounded-lg border ${
                        isDark ? 'bg-[#14100C] border-[#202C40]' : 'bg-[#FCFAF5] border-[#E5DED2]'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className={isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}>Name match</span>
                        <span className={`font-mono font-semibold ${isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'}`}>
                          {nameMatch
                            ? `${Math.round(nameMatch.score * 100)}% (${nameMatch.verdict.replace(/_/g, ' ')})`
                            : 'not available'}
                        </span>
                      </div>
                      {nameMatch && (
                        <div className="space-y-1 text-[10px]">
                          <div className="flex justify-between">
                            <span className={isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}>Memorial:</span>
                            <span className={`font-medium ${isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'}`}>
                              {nameMatch.memorial || '—'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className={isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}>Document:</span>
                            <span className={`font-mono font-medium ${isDark ? 'text-[#D9D2C6]' : 'text-[#4A4237]'}`}>
                              {nameMatch.document || '—'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div
                      className={`p-3 rounded-lg border ${
                        isDark ? 'bg-[#14100C] border-[#202C40]' : 'bg-[#FCFAF5] border-[#E5DED2]'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className={isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}>Date match</span>
                        <span className={`font-mono font-semibold ${isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'}`}>
                          {dateMatch
                            ? `${dateMatch.verdict.replace(/_/g, ' ')}`
                            : 'not available'}
                        </span>
                      </div>
                      {dateMatch && (
                        <div className="space-y-1 text-[10px]">
                          <div className="flex justify-between">
                            <span className={isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}>Memorial:</span>
                            <span className={`font-medium ${isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'}`}>
                              {dateMatch.memorial || '—'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className={isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}>Document:</span>
                            <span className={`font-mono font-medium ${isDark ? 'text-[#D9D2C6]' : 'text-[#4A4237]'}`}>
                              {dateMatch.document || '—'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 text-[10px]">
                    <span className={isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}>
                      Document confidence: <strong>{docConfidence ?? 'unknown'}</strong>
                    </span>
                    <span className={isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}>
                      Registration no: <strong>{regNumbers.length ? regNumbers.join(', ') : 'not detected'}</strong>
                    </span>
                  </div>

                  {keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {keywords.slice(0, 10).map((kw) => (
                        <span
                          key={kw}
                          className={`text-[9px] font-mono px-2 py-0.5 rounded-full ${
                            isDark
                              ? 'bg-[#202C40] text-[#D9D2C6] border border-[#2D3D56]'
                              : 'bg-[#E5DED2] text-[#554F48] border border-[#D0C7B8]'
                          }`}
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}

                  {rawPreview && (
                    <div>
                      <button
                        type="button"
                        onClick={() => setShowRawText(!showRawText)}
                        className={`text-[11px] font-mono flex items-center gap-1 transition-colors ${
                          isDark ? 'text-[#B99452] hover:text-[#D4AF37]' : 'text-[#23324A] hover:text-[#182337]'
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>{showRawText ? 'Hide raw extracted text' : 'Inspect raw extracted text'}</span>
                        {showRawText ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                      {showRawText && (
                        <div
                          className={`mt-2 p-3 rounded-lg font-mono text-[10px] leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap border ${
                            isDark
                              ? 'bg-[#0D0B09] border-[#202C40] text-[#9EA3AA]'
                              : 'bg-[#FFF8EE] border-[#E5DED2] text-[#554F48]'
                          }`}
                        >
                          {rawPreview}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-start gap-2 pt-1 text-[10px] italic opacity-80">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span>
                      Automated output is an assistant, never a legal conclusion and never the
                      decision. Reviewer discretion is required.
                    </span>
                  </div>
                </div>
              ) : (
                <div
                  className={`p-4 rounded-xl border text-xs italic ${
                    isDark ? 'border-[#202C40] text-[#9EA3AA]' : 'border-[#E5DED2] text-[#7D766D]'
                  }`}
                >
                  No automated analysis recorded for this submission — review the document
                  directly.
                </div>
              )}

              {/* Decision history */}
              {detail.decisions.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className={`text-xs font-semibold ${isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'}`}>
                    Decision history
                  </h4>
                  {detail.decisions.slice(-4).map((entry) => (
                    <p key={entry.id} className={`text-[11px] ${isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'}`}>
                      {entry.decision.replace(/_/g, ' ')} — {entry.reviewer}
                      {entry.reason ? `: ${entry.reason}` : ''}
                    </p>
                  ))}
                </div>
              )}

              {/* Actions */}
              {pendingAction ? (
                <div
                  className={`pt-2 border-t space-y-3 ${isDark ? 'border-[#202C40]' : 'border-[#E5DED2]'}`}
                >
                  <label
                    htmlFor="decision-reason"
                    className={`block text-xs font-medium ${isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'}`}
                  >
                    {pendingAction === 'reject'
                      ? 'Why is this being rejected? (the family will see this)'
                      : 'What should the family provide? (they will see this)'}
                  </label>
                  <textarea
                    id="decision-reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${
                      isDark
                        ? 'bg-[#111820] border-[#202C40] text-[#F8F5EE]'
                        : 'bg-white border-[#E5DED2] text-[#20242A]'
                    }`}
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setPendingAction(null)}>
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      isLoading={isActing}
                      disabled={!reason.trim()}
                      onClick={() => void runDecision(pendingAction, reason.trim())}
                    >
                      {pendingAction === 'reject' ? 'Reject with Notice' : 'Request More Info'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className={`pt-3 flex flex-wrap items-center justify-between gap-3 border-t border-dashed ${
                    isDark ? 'border-[#202C40]' : 'border-[#E5DED2]'
                  }`}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    icon={FileCheck}
                    onClick={() => {
                      setPendingAction('request');
                      setReason('');
                    }}
                  >
                    Request More Info
                  </Button>

                  <div className="flex items-center gap-2.5">
                    <Button
                      variant="outline"
                      size="sm"
                      icon={XCircle}
                      onClick={() => {
                        setPendingAction('reject');
                        setReason('');
                      }}
                    >
                      Reject with Notice
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      icon={ShieldCheck}
                      isLoading={isActing}
                      onClick={() => void runDecision('approve', '')}
                    >
                      Approve & Grant Badge
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className={`py-12 text-center text-xs ${isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}`}>
              Select a submission from the queue to inspect it.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
