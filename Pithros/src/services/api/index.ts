/**
 * The live API client.
 *
 * Typed as `typeof demoApi` by `src/services/api.ts`, which is the mechanism that
 * keeps the two implementations honest: if a method here is missing or its
 * signature drifts, `tsc --noEmit` fails the build.
 *
 * Methods whose backend work has not landed yet throw `FeatureNotAvailableError`
 * rather than falling back to demo data. A production build must never quietly
 * serve invented records to real families.
 */

import { FeatureNotAvailableError, ValidationFailedError } from './client';
import { contributorsApi } from './contributors';
import { memorialsApi } from './memorials';
import { mediaApi } from './media';
import { offeringsApi, tributesApi } from './tributes';
import type * as demoModule from '../demo/demoApi';
import type { DigitalLegacyLink, FamilyMember } from '../../types';

type DemoApi = typeof demoModule.demoApi;

function pending<K extends keyof DemoApi>(feature: string): DemoApi[K] {
  const fn = () => {
    throw new FeatureNotAvailableError(feature);
  };
  return fn as unknown as DemoApi[K];
}

/** Fields a client may set when creating or updating a memorial. */
export const liveApi = {
  // ─── Media ──────────────────────────────────────────────────────────────
  // Uploaded through the presigned-URL pipeline rather than by posting a
  // data/blob URL to this method. `mediaApi.uploadFile` is the entry point.
  addMedia: pending<'addMedia'>('Direct media attachment'),

  // ─── Memorials ──────────────────────────────────────────────────────────
  getMemorials: memorialsApi.listMine,
  createMemorial: memorialsApi.create,
  updateMemorial: memorialsApi.update,

  async getMemorialBySlug(slugOrId: string) {
    const bySlug = await memorialsApi.getPublicBySlug(slugOrId);
    if (bySlug) return bySlug;

    // The dashboard addresses memorials by id; the public page by slug.
    try {
      return await memorialsApi.getById(slugOrId);
    } catch {
      return null;
    }
  },

  // ─── Tributes and offerings ─────────────────────────────────────────────
  addTribute: tributesApi.addTribute,
  addOffering: offeringsApi.addOffering,

  // ─── Timeline ───────────────────────────────────────────────────────────
  addTimelineEvent: memorialsApi.addTimelineEvent,

  // ─── Digital Legacy Links ────────────────────────────────────────────────
  addLegacyLink: memorialsApi.addLegacyLink,
  async updateLegacyLink(
    memorialId: string,
    linkId: string,
    updates: Partial<Omit<DigitalLegacyLink, 'id'>>,
  ): Promise<DigitalLegacyLink | null> {
    return memorialsApi.updateLegacyLink(memorialId, linkId, updates);
  },
  removeLegacyLink: memorialsApi.removeLegacyLink,

  // ─── Archive Export ──────────────────────────────────────────────────────
  exportPdf: memorialsApi.exportPdf,
  getExportStatus: memorialsApi.getExportStatus,

  // ─── Contributors ───────────────────────────────────────────────────────
  async inviteFamilyMember(
    memorialId: string,
    member: Omit<FamilyMember, 'id' | 'status'>,
  ): Promise<FamilyMember> {
    const email = member.email || member.invitedEmail;
    if (!email) {
      throw new ValidationFailedError(
        'An email address is required so the invitation has somewhere to go.',
      );
    }

    const { member: invited } = await contributorsApi.invite(memorialId, {
      email,
      role: member.role,
      relationship: member.relationship,
      displayName: member.name,
    });
    return invited;
  },

  // ─── Not yet implemented on the server ──────────────────────────────────
  getProviders: pending<'getProviders'>('The farewell network'),
  getProviderBySlug: pending<'getProviderBySlug'>('The farewell network'),
  createLead: pending<'createLead'>('Service enquiries'),
  getLeads: pending<'getLeads'>('Provider leads'),
  updateLeadStatus: pending<'updateLeadStatus'>('Provider leads'),
  createFarewellLead: pending<'createFarewellLead'>('Service enquiries'),
  getFarewellLeads: pending<'getFarewellLeads'>('Service enquiries'),
  submitVerification: pending<'submitVerification'>('Verification submissions'),
  approveVerification: pending<'approveVerification'>('Verification review'),
  rejectVerification: pending<'rejectVerification'>('Verification review'),
  getVerificationQueue: pending<'getVerificationQueue'>('The verification queue'),
  updateVerificationStatus: pending<'updateVerificationStatus'>('Verification review'),
  getAuditLogs: pending<'getAuditLogs'>('The audit console'),
  logSensitiveDocAccess: pending<'logSensitiveDocAccess'>('Sensitive document access'),
  getReports: pending<'getReports'>('Moderation'),
  submitReport: pending<'submitReport'>('Reporting content'),
  updateReportStatus: pending<'updateReportStatus'>('Moderation'),
  getDisputes: pending<'getDisputes'>('Stewardship disputes'),
  submitDisputeClaim: pending<'submitDisputeClaim'>('Stewardship disputes'),
  addDisputeNote: pending<'addDisputeNote'>('Stewardship disputes'),
  updateDisputeStatus: pending<'updateDisputeStatus'>('Stewardship disputes'),
  getBillingInvoices: pending<'getBillingInvoices'>('Billing'),
  createBillingInvoice: pending<'createBillingInvoice'>('Billing'),
  getAnniversarySettings: pending<'getAnniversarySettings'>('Anniversary reminders'),
  saveAnniversarySettings: pending<'saveAnniversarySettings'>('Anniversary reminders'),
  getNotifications: pending<'getNotifications'>('Notifications'),
  markAllNotificationsRead: pending<'markAllNotificationsRead'>('Notifications'),
};

export { mediaApi, memorialsApi, offeringsApi, tributesApi, contributorsApi };
export {
  ApiError,
  FeatureNotAvailableError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from './client';
export { onSessionExpired } from './client';
export { usersApi } from './users';
export type { PithrosUser } from './users';
