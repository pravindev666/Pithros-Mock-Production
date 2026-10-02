import React, { useState } from 'react';
import { useModeration } from '../../hooks/useModeration';
import { useTheme } from '../../context/ThemeContext';
import { AdminReport } from '../../types';
import { Button } from '../../components/ui/Button';
import {
  Flag,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Search,
  Filter,
  Eye,
  Lock,
  Trash2,
  ArrowUpRight,
  Mail,
  Send,
  X,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { api } from '../../services/api';

export const AdminModerationView: React.FC = () => {
  const { isDark } = useTheme();
  const { reports, isLoading, updateReportStatus } = useModeration();
  const [selectedReport, setSelectedReport] = useState<AdminReport | null>(null);
  const [targetFilter, setTargetFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [actionNote, setActionNote] = useState<string>('');
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Email Compliance Notice Modal State
  const [emailModalOpen, setEmailModalOpen] = useState<boolean>(false);
  const [emailRecipient, setEmailRecipient] = useState<string>('');
  const [emailSubject, setEmailSubject] = useState<string>('');
  const [emailBody, setEmailBody] = useState<string>('');
  const [quarantineAction, setQuarantineAction] = useState<'restricted' | 'removed'>('restricted');
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);

  const handleOpenEmailModal = () => {
    if (!selectedReport) return;
    setEmailRecipient(selectedReport.reporterEmail.includes('@') ? 'steward@pithros-memorial.org' : 'steward@pithros-memorial.org');
    setEmailSubject(`[Pithros Trust & Safety] Action Required: Quarantined content on "${selectedReport.targetTitle}"`);
    setEmailBody(
`Dear Memorial Steward,

During a content audit by the Pithros Trust & Safety Desk, the media item ("${selectedReport.targetTitle}") was flagged and verified as violating our Community Reverence Guidelines regarding explicit or inappropriate content (Reason: ${selectedReport.reason}).

Action Taken:
To maintain reverent dignity and protect the memory of the departed and our community of visitors, this image has been immediately quarantined (frozen) and hidden from public display.

Required Next Steps:
1. Please log in to your Steward Workspace on Pithros.
2. Open your Archival Gallery in the Memorial Editor.
3. Remove the quarantined photograph and re-upload an appropriate, respectful remembrance portrait.

If you have questions or believe this was flagged in error, you may reply directly to this notification.

With reverence and care,
Pithros Trust & Safety Desk`
    );
    setQuarantineAction('restricted');
    setEmailModalOpen(true);
  };

  const handleDispatchComplianceEmail = async () => {
    if (!selectedReport) return;
    setIsSendingEmail(true);
    try {
      // 1. Simulate network dispatch via Firebase Cloud Messaging / Outbound Mailer
      await new Promise((resolve) => setTimeout(resolve, 800));

      // 2. Update report status to restricted (quarantined/frozen) or removed
      const actionDesc = `${quarantineAction === 'restricted' ? 'Quarantined (Frozen) from public display' : 'Permanently removed'}. Dispatched compliance email notice to ${emailRecipient}.`;
      await updateReportStatus(selectedReport.id, quarantineAction, actionDesc);

      // 3. Log to tamper-evident audit trail
      await api.logSensitiveDocAccess(
        'Deepa Rao',
        'Admin / Trust Reviewer',
        `DISPATCHED_COMPLIANCE_EMAIL: Content ${quarantineAction.toUpperCase()} & emailed notice to ${emailRecipient} (Report ID: ${selectedReport.id})`,
        selectedReport.id
      );

      setSuccessNotice(`Compliance email successfully dispatched to ${emailRecipient}. Item has been ${quarantineAction === 'restricted' ? 'quarantined (frozen)' : 'removed'} from public display.`);
      setEmailModalOpen(false);
      setSelectedReport(null);
      setTimeout(() => setSuccessNotice(null), 4000);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const filteredReports = reports.filter((r) => {
    if (targetFilter !== 'all' && r.targetType !== targetFilter) return false;
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    return true;
  });

  const handleStatusChange = async (
    status: AdminReport['status'],
    defaultAction: string
  ) => {
    if (!selectedReport) return;
    const finalAction = actionNote.trim() || defaultAction;
    await updateReportStatus(selectedReport.id, status, finalAction);
    await api.logSensitiveDocAccess('Deepa Rao', 'Admin / Trust Reviewer', `MODERATION_${status.toUpperCase()}: ${selectedReport.targetTitle}`, selectedReport.id);
    setSuccessNotice(`Report updated to "${status}". Action recorded in audit log.`);
    setActionNote('');
    setSelectedReport(null);
    setTimeout(() => setSuccessNotice(null), 3000);
  };

  const getStatusBadge = (status: AdminReport['status']) => {
    switch (status) {
      case 'pending':
        return isDark
          ? 'bg-[#B99452]/20 text-[#B99452] border-[#B99452]/30'
          : 'bg-[#E5DED2] text-[#8C5C0F] border-[#D9941E]/30';
      case 'under_review':
        return isDark
          ? 'bg-[#3B82F6]/20 text-[#60A5FA] border-[#3B82F6]/30'
          : 'bg-[#EFF6FF] text-[#1D4ED8] border-[#93C5FD]';
      case 'resolved':
        return isDark
          ? 'bg-[#2D7A5F]/20 text-[#6EE7B7] border-[#2D7A5F]/30'
          : 'bg-[#EAF5EF] text-[#245C45] border-[#96CBB4]';
      case 'restricted':
        return isDark
          ? 'bg-[#F97316]/20 text-[#FB923C] border-[#F97316]/30'
          : 'bg-[#FFF7ED] text-[#C2410C] border-[#FDBA74]';
      case 'removed':
        return isDark
          ? 'bg-[#EF4444]/20 text-[#F87171] border-[#EF4444]/30'
          : 'bg-[#FEF2F2] text-[#B91C1C] border-[#FCA5A5]';
      case 'escalated':
        return isDark
          ? 'bg-[#A855F7]/20 text-[#C084FC] border-[#A855F7]/30'
          : 'bg-[#FAF5FF] text-[#7E22CE] border-[#D8B4FE]';
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
            Trust & Safety Desk
          </span>
          <h1
            className={`text-xl font-serif mt-0.5 ${
              isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
            }`}
          >
            Content Moderation & Policy Queue
          </h1>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'}`}>
            All public memorials, tributes, photos, providers, and reviews are audited for reverent dignity.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <select
            value={targetFilter}
            onChange={(e) => setTargetFilter(e.target.value)}
            className={`px-3 py-1.5 rounded-lg border text-xs focus:outline-none ${
              isDark
                ? 'bg-[#182337] border-[#202C40] text-[#F8F5EE]'
                : 'bg-[#FCFAF5] border-[#E5DED2] text-[#20242A]'
            }`}
          >
            <option value="all">All Targets</option>
            <option value="memorial">Memorials</option>
            <option value="tribute">Tributes</option>
            <option value="media">Media & Photos</option>
            <option value="provider">Providers</option>
            <option value="review">Reviews</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`px-3 py-1.5 rounded-lg border text-xs focus:outline-none ${
              isDark
                ? 'bg-[#182337] border-[#202C40] text-[#F8F5EE]'
                : 'bg-[#FCFAF5] border-[#E5DED2] text-[#20242A]'
            }`}
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="under_review">Under Review</option>
            <option value="resolved">Resolved</option>
            <option value="restricted">Restricted</option>
            <option value="removed">Removed</option>
            <option value="escalated">Escalated</option>
          </select>
        </div>
      </div>

      {successNotice && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
            isDark
              ? 'bg-[#2D7A5F]/20 border-[#2D7A5F]/50 text-[#6EE7B7]'
              : 'bg-[#2D7A5F]/15 border-[#2D7A5F]/35 text-[#1B4D3E]'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Reports Table / Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Reports List */}
        <div
          className={`lg:col-span-7 rounded-xl border p-4 space-y-3 transition-colors ${
            isDark
              ? 'border-[#202C40] bg-[#14100C]'
              : 'border-[#E5DED2] bg-[#FCFAF5] shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-[10px] font-mono uppercase tracking-wider ${
                isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
              }`}
            >
              Reported Objects ({filteredReports.length})
            </span>
          </div>

          <div className="space-y-2.5">
            {filteredReports.map((report) => {
              const isSelected = selectedReport?.id === report.id;
              return (
                <div
                  key={report.id}
                  onClick={() => setSelectedReport(report)}
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
                    <div className="flex items-center gap-2">
                      <span className="font-mono uppercase text-[10px] px-2 py-0.5 rounded bg-black/10">
                        {report.targetType}
                      </span>
                      <span className="font-semibold">{report.targetTitle}</span>
                    </div>
                    <span
                      className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border ${getStatusBadge(
                        report.status
                      )}`}
                    >
                      {report.status.replace('_', ' ')}
                    </span>
                  </div>

                  <p className={`text-[11px] leading-relaxed line-clamp-2 ${isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'}`}>
                    <strong>Reason:</strong> {report.reason} — {report.details}
                  </p>

                  <div className="flex items-center justify-between text-[10px] pt-1 text-inherit opacity-75 font-mono">
                    <span>By: {report.reporterEmail}</span>
                    <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Report Action Inspector */}
        <div
          className={`lg:col-span-5 rounded-xl border p-5 space-y-5 transition-colors ${
            isDark
              ? 'border-[#202C40] bg-[#14100C]'
              : 'border-[#E5DED2] bg-[#FCFAF5] shadow-xs'
          }`}
        >
          {selectedReport ? (
            <div className="space-y-4">
              <div className="border-b pb-3 border-inherit">
                <span
                  className={`text-[10px] font-mono uppercase tracking-wider block ${
                    isDark ? 'text-[#B99452]' : 'text-[#23324A]'
                  }`}
                >
                  Reviewing Report ID: {selectedReport.id}
                </span>
                <h3
                  className={`text-base font-serif mt-1 ${
                    isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                  }`}
                >
                  {selectedReport.targetTitle}
                </h3>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="block font-medium mb-0.5 opacity-75">Flagged Reason</span>
                  <span className="font-semibold">{selectedReport.reason}</span>
                </div>
                <div>
                  <span className="block font-medium mb-0.5 opacity-75">Report Details</span>
                  <p className={`p-2.5 rounded-lg border leading-relaxed ${isDark ? 'bg-[#182337] border-[#202C40]' : 'bg-[#E5DED2] border-[#E5DED2]'}`}>
                    {selectedReport.details}
                  </p>
                </div>
                {selectedReport.actionTaken && (
                  <div>
                    <span className="block font-medium mb-0.5 opacity-75">Previous Action Taken</span>
                    <p className="text-[11px] italic opacity-90">{selectedReport.actionTaken}</p>
                  </div>
                )}
              </div>

              {/* Action Note */}
              <div>
                <label className="block text-xs font-medium mb-1">
                  Enforcement / Audit Note
                </label>
                <textarea
                  rows={2}
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  placeholder="Record justification for audit trail (e.g. content confirmed fraudulent)..."
                  className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none resize-none ${
                    isDark
                      ? 'bg-[#182337] border-[#202C40] text-[#F8F5EE] focus:border-[#B99452]'
                      : 'bg-[#FCFAF5] border-[#E5DED2] text-[#20242A] focus:border-[#23324A]'
                  }`}
                />
              </div>

              {/* Status Actions */}
              <div className="space-y-2 pt-2 border-t border-inherit">
                <span className="text-[10px] uppercase font-mono tracking-wider block opacity-75">
                  Update Moderation State
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => handleStatusChange('under_review', 'Set under active verification investigation.')}
                  >
                    Under Review
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => handleStatusChange('resolved', 'Investigated and verified compliant / resolved.')}
                  >
                    Resolve Report
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs text-[#F97316]"
                    onClick={() => handleStatusChange('restricted', 'Quarantined from public catalog indexing.')}
                    icon={Lock}
                  >
                    Restrict Access
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs text-[#EF4444]"
                    onClick={() => handleStatusChange('removed', 'Content taken down due to verified terms violation.')}
                    icon={Trash2}
                  >
                    Remove Content
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs text-[#A855F7] mt-1"
                  onClick={() => handleStatusChange('escalated', 'Escalated to Senior Legal & Trust Reviewers.')}
                  icon={ArrowUpRight}
                >
                  Escalate to Safety Council
                </Button>
              </div>

              {/* Direct Steward Compliance Workflow (Freeze & Email Notice) */}
              <div className="pt-3 border-t border-inherit space-y-2">
                <span className="text-[10px] uppercase font-mono tracking-wider block opacity-85 text-[#B99452] font-semibold flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Direct Steward Compliance Action
                </span>
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full text-xs bg-[#B99452] hover:bg-[#A37F3E] text-white flex items-center justify-center gap-2 py-2 font-medium shadow-xs"
                  onClick={handleOpenEmailModal}
                  icon={Mail}
                >
                  Freeze Content & Email Steward Notice
                </Button>
                <p className={`text-[10px] italic leading-tight ${isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}`}>
                  Immediately conceals the image from public view (quarantine) and emails the steward asking them to remove and re-upload an appropriate remembrance photo.
                </p>
              </div>
            </div>
          ) : (
            <div className="py-16 text-center text-xs opacity-60">
              <Flag className="w-8 h-8 mx-auto mb-2 opacity-40" />
              Select a moderation report from the left queue to inspect and take action.
            </div>
          )}
        </div>
      </div>

      {/* EMAIL COMPLIANCE NOTICE MODAL */}
      {emailModalOpen && selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className={`w-full max-w-xl rounded-2xl border shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto ${
              isDark ? 'bg-[#182337] border-[#202C40] text-[#F8F5EE]' : 'bg-[#FCFAF5] border-[#E5DED2] text-[#20242A]'
            }`}
          >
            <div className="flex items-start justify-between border-b pb-4 border-inherit">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-serif font-semibold">Steward Notice & Content Quarantine</h3>
                  <p className={`text-xs ${isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}`}>
                    Target: <span className="font-semibold text-inherit">{selectedReport.targetTitle}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEmailModalOpen(false)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isDark ? 'hover:bg-[#202C40] text-[#9EA3AA]' : 'hover:bg-[#E5DED2] text-[#7D766D]'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target violation alert banner */}
            <div className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
              isDark ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}>
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
              <div className="space-y-1">
                <p className="font-semibold">Flagged Policy Violation: {selectedReport.reason}</p>
                <p className="opacity-90">{selectedReport.details}</p>
              </div>
            </div>

            {/* Quarantine Action Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider font-mono opacity-80">
                Enforcement Action
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div
                  onClick={() => setQuarantineAction('restricted')}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                    quarantineAction === 'restricted'
                      ? isDark
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-[#23324A] bg-[#23324A]/5'
                      : isDark
                      ? 'border-[#202C40] bg-[#111820]'
                      : 'border-[#E5DED2] bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    checked={quarantineAction === 'restricted'}
                    onChange={() => setQuarantineAction('restricted')}
                    className="mt-0.5"
                  />
                  <div className="text-xs space-y-0.5">
                    <span className="font-semibold block flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-amber-500" />
                      Freeze / Quarantine (Recommended)
                    </span>
                    <p className="text-[11px] opacity-75">
                      Immediately conceals image from visitors. Preserves record for steward re-upload.
                    </p>
                  </div>
                </div>

                <div
                  onClick={() => setQuarantineAction('removed')}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                    quarantineAction === 'removed'
                      ? isDark
                        ? 'border-red-500 bg-red-500/10'
                        : 'border-red-600 bg-red-50'
                      : isDark
                      ? 'border-[#202C40] bg-[#111820]'
                      : 'border-[#E5DED2] bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    checked={quarantineAction === 'removed'}
                    onChange={() => setQuarantineAction('removed')}
                    className="mt-0.5"
                  />
                  <div className="text-xs space-y-0.5">
                    <span className="font-semibold block flex items-center gap-1 text-red-500">
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove Permanently
                    </span>
                    <p className="text-[11px] opacity-75">
                      Permanently purges image file and soft-deletes database record immediately.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recipient & Subject */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium mb-1">Steward Contact Email</label>
                <input
                  type="email"
                  value={emailRecipient}
                  onChange={(e) => setEmailRecipient(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${
                    isDark
                      ? 'bg-[#111820] border-[#202C40] text-[#F8F5EE] focus:border-[#B99452]'
                      : 'bg-white border-[#E5DED2] text-[#20242A] focus:border-[#23324A]'
                  }`}
                />
              </div>

              <div>
                <label className="block font-medium mb-1">Subject Line</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${
                    isDark
                      ? 'bg-[#111820] border-[#202C40] text-[#F8F5EE] focus:border-[#B99452]'
                      : 'bg-white border-[#E5DED2] text-[#20242A] focus:border-[#23324A]'
                  }`}
                />
              </div>

              <div>
                <label className="block font-medium mb-1 flex items-center justify-between">
                  <span>Notice Message (Steward Email Body)</span>
                  <span className="text-[10px] opacity-60 font-mono">Editable notice template</span>
                </label>
                <textarea
                  rows={8}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border font-mono text-xs focus:outline-none resize-none leading-relaxed ${
                    isDark
                      ? 'bg-[#111820] border-[#202C40] text-[#F8F5EE] focus:border-[#B99452]'
                      : 'bg-white border-[#E5DED2] text-[#20242A] focus:border-[#23324A]'
                  }`}
                />
              </div>
            </div>

            {/* Outbound delivery indicator */}
            <div className="flex items-center gap-2 text-[11px] opacity-75 font-mono">
              <Send className="w-3.5 h-3.5 text-amber-500" />
              <span>Outbound dispatch: Firebase Auth Mailer & Celery Worker pipeline</span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-inherit">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEmailModalOpen(false)}
                disabled={isSendingEmail}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="bg-[#B99452] hover:bg-[#A37F3E] text-white flex items-center gap-1.5"
                onClick={handleDispatchComplianceEmail}
                disabled={isSendingEmail}
              >
                {isSendingEmail ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Dispatching Notice...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Notice & {quarantineAction === 'restricted' ? 'Freeze Content' : 'Remove Content'}</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
