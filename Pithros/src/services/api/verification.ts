/**
 * Verification API client.
 *
 * Connects the steward's verification workflow to the FastAPI verification engine,
 * using the sensitive Cloudflare R2 bucket for official documents.
 */

import { http } from './client';
import { mediaApi } from './media';

export interface VerificationEvidenceItem {
  mediaId: string;
  documentType: 'death_certificate' | 'obituary' | 'funeral_notice' | 'identity_proof' | 'relationship_proof' | 'other';
  label?: string;
}

export const DOCUMENT_TYPE_LABELS: Record<VerificationEvidenceItem['documentType'], string> = {
  death_certificate: 'Death certificate',
  obituary: 'Newspaper obituary / clipping',
  funeral_notice: 'Funeral notice',
  identity_proof: 'Identity proof',
  relationship_proof: 'Relationship proof',
  other: 'Other supporting document',
};

export interface AutomatedOcrResult {
  ocr_engine?: string;
  ocrEngine?: string;
  text_extracted?: boolean;
  textExtracted?: boolean;
  text_length?: number;
  textLength?: number;
  document_keywords_found?: string[];
  documentKeywordsFound?: string[];
  registration_numbers?: string[];
  registrationNumbers?: string[];
  dates_found?: string[];
  datesFound?: string[];
  names_found?: string[];
  namesFound?: string[];
  raw_text_preview?: string;
  rawTextPreview?: string;
  evidence_count?: number;
  evidenceCount?: number;
  evidence_analysed?: number;
  evidenceAnalysed?: number;
  errors?: string[] | null;
}

export interface MatchScore {
  score: number;
  memorial: string;
  document: string;
  verdict: 'exact_match' | 'likely_match' | 'weak_match' | 'mismatch' | 'not_found';
}

export interface RiskSignalsReport {
  overall_risk?: 'low' | 'medium' | 'high' | 'unknown';
  overallRisk?: 'low' | 'medium' | 'high' | 'unknown';
  document_type_confidence?: 'high' | 'medium' | 'low' | 'unknown';
  documentTypeConfidence?: 'high' | 'medium' | 'low' | 'unknown';
  flags?: string[];
  name_match?: MatchScore;
  nameMatch?: MatchScore;
  date_match?: MatchScore;
  dateMatch?: MatchScore;
}

export interface VerificationSubmissionOut {
  id: string;
  memorialId: string;
  state: string;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  decisionReason?: string | null;
  automatedResult?: AutomatedOcrResult | null;
  riskSignals?: RiskSignalsReport | null;
  evidence: Array<{
    id: string;
    mediaId: string;
    documentType: string;
    label?: string | null;
    uploadedAt: string;
  }>;
  decisions: Array<{
    id: string;
    decision: string;
    previousState: string;
    newState: string;
    reviewer: string;
    reason?: string | null;
    createdAt: string;
  }>;
}

export interface VerificationQueueItem {
  id: string;
  memorialId: string;
  memorialSlug: string;
  memorialName?: string;
  memorialFullName?: string;
  state: string;
  submittedAt?: string | null;
  evidenceCount?: number;
  documentCount?: number;
  overallRisk?: 'low' | 'medium' | 'high' | 'unknown' | null;
  documentConfidence?: 'high' | 'medium' | 'low' | 'unknown' | null;
}

export const verificationApi = {
  /**
   * Submit document verification for a memorial.
   * If a raw File is provided, it is securely uploaded first to the sensitive R2 tier.
   */
  async submitDocument(
    memorialId: string,
    fileOrMediaId: File | string,
    options: {
      documentType?: VerificationEvidenceItem['documentType'];
      label?: string;
      note?: string;
      onProgress?: (percent: number) => void;
    } = {},
  ): Promise<VerificationSubmissionOut> {
    let mediaId: string;

    if (fileOrMediaId instanceof File) {
      // Direct-to-storage upload straight into sensitive tier
      const complete = await mediaApi.uploadFile(memorialId, fileOrMediaId, {
        kind: 'document',
        title: options.label ?? fileOrMediaId.name,
        onProgress: options.onProgress,
      });
      mediaId = complete.mediaId;
    } else {
      mediaId = fileOrMediaId;
    }

    return http.post<VerificationSubmissionOut>(`/memorials/${memorialId}/verification`, {
      evidence: [
        {
          mediaId,
          documentType: options.documentType ?? 'death_certificate',
          label: options.label,
        },
      ],
      note: options.note,
    });
  },

  /**
   * Fetch current verification status for a memorial.
   */
  async getStatus(memorialId: string): Promise<VerificationSubmissionOut | null> {
    try {
      return await http.get<VerificationSubmissionOut>(`/memorials/${memorialId}/verification`);
    } catch {
      return null;
    }
  },

  /**
   * Admin: List pending verification submissions in the review queue.
   */
  async getQueue(params: { limit?: number; offset?: number } = {}): Promise<VerificationQueueItem[]> {
    return http.get<VerificationQueueItem[]>('/admin/verification', {
      query: { limit: params.limit ?? 50, offset: params.offset ?? 0 },
    });
  },

  /**
   * Admin: Fetch a single submission details including AI risk signals.
   */
  async getSubmission(submissionId: string): Promise<VerificationSubmissionOut> {
    return http.get<VerificationSubmissionOut>(`/admin/verification/${submissionId}`);
  },

  /**
   * Admin: Approve a verification submission.
   */
  async approve(submissionId: string, reason = 'Official documents reviewed and verified'): Promise<VerificationSubmissionOut> {
    return http.post<VerificationSubmissionOut>(`/admin/verification/${submissionId}/approve`, {
      reason,
    });
  },

  /**
   * Admin: Reject a verification submission.
   */
  async reject(submissionId: string, reason = 'Document incomplete or illegible'): Promise<VerificationSubmissionOut> {
    return http.post<VerificationSubmissionOut>(`/admin/verification/${submissionId}/reject`, {
      reason,
    });
  },

  /**
   * Admin: Request additional information from steward.
   */
  async requestInfo(submissionId: string, reason: string): Promise<VerificationSubmissionOut> {
    return http.post<VerificationSubmissionOut>(`/admin/verification/${submissionId}/request-info`, {
      reason,
    });
  },

  /**
   * Member: appeal a rejected submission (append-only decision history).
   */
  async appeal(submissionId: string, reason: string): Promise<VerificationSubmissionOut> {
    return http.post<VerificationSubmissionOut>(`/verification/${submissionId}/appeal`, { reason });
  },

  /**
   * Member or reviewer: a short-lived signed URL for one evidence document.
   * Every read is audited on the server.
   */
  async getEvidenceUrl(evidenceId: string): Promise<{
    evidenceId: string;
    url: string;
    expiresIn: number;
    documentType: string;
  }> {
    return http.get(`/verification/evidence/${evidenceId}`);
  },
};
