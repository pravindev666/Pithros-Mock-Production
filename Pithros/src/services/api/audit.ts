/**
 * Audit trail client.
 *
 * The server owns the trail — every row is written by the backend as things
 * happen. This client only reads it, and deliberately cannot invent entries: a
 * browser-authored audit log would be worse than none at all.
 */

import { FeatureNotAvailableError, http } from './client';
import type { AuditLogEntry } from '../../types';

interface AuditRow {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  actorLabel: string;
  actorRole: string;
  result: string;
  detail: Record<string, unknown>;
  requestId: string | null;
  ipMasked: string | null;
  createdAt: string;
}

function timestampOf(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${date.toISOString().replace('T', ' ').slice(0, 19)} UTC`;
}

function titleCaseResult(result: string): string {
  if (result === 'success') return 'Success';
  if (result === 'denied') return 'Denied';
  if (result === 'flagged') return 'Flagged';
  return result;
}

/** Map a live audit row onto the shape the Audit Trail view already renders. */
export function toAuditLogEntry(row: AuditRow): AuditLogEntry {
  return {
    id: row.id,
    timestamp: timestampOf(row.createdAt),
    actor: row.actorLabel,
    role: row.actorRole,
    action: row.action,
    entity: row.entity,
    entityId: row.entityId ?? '',
    result: titleCaseResult(row.result) as AuditLogEntry['result'],
    ipAddressMasked: row.ipMasked ?? '',
  };
}

export const auditApi = {
  async listLegacy(): Promise<AuditLogEntry[]> {
    const rows = await http.get<AuditRow[]>('/admin/audit?limit=100');
    return rows.map(toAuditLogEntry);
  },

  async logSensitiveDocAccess(
    _actor: string,
    _role: string,
    _docTitle: string,
    _entityId: string,
  ): Promise<AuditLogEntry> {
    // Opening sensitive evidence already writes SENSITIVE_DOCUMENT_ACCESSED on the
    // server. A client-authored audit row would be an unverifiable claim, so this
    // method refuses instead of faking one.
    throw new FeatureNotAvailableError(
      'Audit entries are recorded by the server when a document is opened.',
    );
  },
};
