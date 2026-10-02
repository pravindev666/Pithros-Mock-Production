/**
 * Account-deletion API client.
 *
 * Deletion is server-authoritative: the backend enforces recent re-authentication
 * and owns the state machine. The UI only reflects the returned state.
 */

import { http } from './client';

export interface DeletionDisposition {
  id: string;
  memorialId: string;
  memorialName: string;
  memorialSlug: string;
  disposition: string;
  status: string;
  successorEmail?: string | null;
  completedAt?: string | null;
}

export interface DeletionRequest {
  id: string;
  status: string;
  reason?: string | null;
  requestedAt: string;
  verifiedAt?: string | null;
  scheduledFor?: string | null;
  executedAt?: string | null;
  cancelledAt?: string | null;
  rejectionReason?: string | null;
  dispositions: DeletionDisposition[];
}

export const privacyApi = {
  getDeletionRequest(): Promise<DeletionRequest | null> {
    return http.get<DeletionRequest | null>('/me/deletion-request');
  },

  requestDeletion(params: { confirmEmail: string; reason?: string }): Promise<DeletionRequest> {
    return http.post<DeletionRequest>('/me/deletion-request', params);
  },

  cancelDeletion(): Promise<DeletionRequest> {
    return http.post<DeletionRequest>('/me/deletion-request/cancel');
  },

  setDisposition(
    requestId: string,
    params: { memorialId: string; disposition: string; successorEmail?: string },
  ): Promise<DeletionRequest> {
    return http.post<DeletionRequest>(`/me/deletion-request/${requestId}/disposition`, params);
  },
};
