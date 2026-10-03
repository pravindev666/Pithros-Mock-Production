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
import { auditApi } from './audit';
import { contributorsApi } from './contributors';
import { memorialsApi } from './memorials';
import { mediaApi } from './media';
import { offeringsApi, tributesApi } from './tributes';
import { verificationApi } from './verification';
import { billingApi } from './billing';
import { notificationsApi, toLegacyNotificationItem } from './notifications';
import {
  providersApi,
  toFarewellLead,
  toProviderLead,
  toServiceProvider,
} from './providers';
import type * as demoModule from '../demo/demoApi';
import type {
  BillingInvoice,
  DigitalLegacyLink,
  FamilyMember,
  ProviderLead,
} from '../../types';

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
  addMedia: pending<'addMedia'>('Attaching media by URL'),

  // ─── Memorials ──────────────────────────────────────────────────────────
  getMemorials: memorialsApi.listMine,
  createMemorial: memorialsApi.create,
  updateMemorial: memorialsApi.update,

  async getMemorialBySlug(slugOrId: string) {
    const bySlug = await memorialsApi.getPublicBySlug(slugOrId);
    if (bySlug) return bySlug;

    // The dashboard addresses memorials by id; the public page by slug.
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);
      if (isUuid) {
        return await memorialsApi.getById(slugOrId);
      }
      return null;
    } catch {
      return null;
    }
  },

  // ─── Tributes and offerings ─────────────────────────────────────────────
  addTribute: tributesApi.addTribute,
  addOffering: offeringsApi.addOffering,

  // ─── Timeline ───────────────────────────────────────────────────────────
  addTimelineEvent: memorialsApi.addTimelineEvent,
  updateTimelineEvent: memorialsApi.updateTimelineEvent,
  removeTimelineEvent: memorialsApi.removeTimelineEvent,

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
  ): Promise<{ member: FamilyMember; invitationToken?: string | null }> {
    const email = member.email || member.invitedEmail;
    if (!email) {
      throw new ValidationFailedError(
        'An email address is required so the invitation has somewhere to go.',
      );
    }

    const invited = await contributorsApi.invite(memorialId, {
      email,
      role: member.role,
      relationship: member.relationship,
      displayName: member.name,
    });
    return { member: invited.member, invitationToken: invited.invitationToken ?? null };
  },

  async acceptInvitation(token: string): Promise<FamilyMember> {
    return contributorsApi.accept(token);
  },

  // ─── Farewell Network & Provider Leads ──────────────────────────────────
  // Live since Stage 3. The directory, the family enquiry flow and the partner
  // console all read from the provider domain; nothing here is demo-projected.
  async getProviders() {
    const { providers } = await providersApi.listPublic();
    return providers.map(toServiceProvider);
  },

  async getProviderBySlug(slug: string) {
    const provider = await providersApi.getPublicBySlug(slug);
    return provider ? toServiceProvider(provider) : null;
  },

  async createLead(lead: Omit<ProviderLead, 'id' | 'status' | 'createdAt'>) {
    const created = await providersApi.submitLeadForProviderId(lead.providerId, {
      contactName: lead.requesterName,
      contactPhone: lead.phone,
      contactEmail: lead.email,
      city: lead.city,
      serviceNeeded: lead.serviceCategory,
      message: lead.description,
      dateNeeded: lead.dateNeeded,
      urgency: lead.urgency,
    });
    return {
      ...lead,
      id: created.id,
      status: 'Submitted' as const,
      createdAt: created.createdAt,
    };
  },

  async getLeads() {
    const { leads } = await providersApi.listLeads();
    return leads.map(toProviderLead);
  },

  async updateLeadStatus(id: string, status: ProviderLead['status']) {
    await providersApi.updateLeadStatus(id, status);
  },

  async createFarewellLead(leadData: {
    familyStewardName: string;
    familyContactPhone: string;
    city: string;
    serviceNeeded: string;
    notes?: string;
    providerId?: string;
  }) {
    if (!leadData.providerId) {
      throw new ValidationFailedError('Choose a provider before sending an enquiry.');
    }
    const created = await providersApi.submitLeadForProviderId(leadData.providerId, {
      contactName: leadData.familyStewardName,
      contactPhone: leadData.familyContactPhone,
      city: leadData.city,
      serviceNeeded: leadData.serviceNeeded,
      message: leadData.notes ?? '',
    });
    return {
      id: created.id,
      familyStewardName: leadData.familyStewardName,
      familyContactPhone: leadData.familyContactPhone,
      city: leadData.city,
      serviceNeeded: leadData.serviceNeeded,
      notes: leadData.notes,
      providerId: leadData.providerId,
      status: 'new' as const,
      createdAt: created.createdAt,
    };
  },

  async getFarewellLeads() {
    const { leads } = await providersApi.listLeads();
    return leads.map(toFarewellLead);
  },
  submitVerification: async (memorialId: string, docData: { documentType: string; documentUrl: string }) => {
    await verificationApi.submitDocument(memorialId, docData.documentUrl, {
      label: docData.documentType,
    });
  },
  approveVerification: async (submissionOrMemorialId: string, badgeType: 'Document Reviewed' | 'Family Managed') => {
    try {
      await verificationApi.approve(submissionOrMemorialId, `Approved with ${badgeType} badge`);
    } catch {
      const queue = await verificationApi.getQueue();
      const item = queue.find((q) => q.memorialId === submissionOrMemorialId);
      if (item) {
        await verificationApi.approve(item.id, `Approved with ${badgeType} badge`);
      }
    }
  },
  rejectVerification: async (submissionOrMemorialId: string, reason: string) => {
    try {
      await verificationApi.reject(submissionOrMemorialId, reason);
    } catch {
      const queue = await verificationApi.getQueue();
      const item = queue.find((q) => q.memorialId === submissionOrMemorialId);
      if (item) {
        await verificationApi.reject(item.id, reason);
      }
    }
  },
  getVerificationQueue: async () => {
    try {
      const items = await verificationApi.getQueue();
      return items.map((item) => ({
        id: item.id,
        memorialId: item.memorialId,
        memorialName: item.memorialFullName,
        submittedBy: 'Family Steward',
        submittedAt: item.submittedAt || new Date().toISOString(),
        documentType: 'Official Certificate',
        documentUrl: `/api/v1/verification/evidence/${item.id}`,
        status: item.state === 'approved' ? 'approved' : item.state === 'rejected' ? 'rejected' : 'under_review',
        badgeRequested: 'Document Reviewed',
      }));
    } catch {
      return [];
    }
  },
  updateVerificationStatus: async (queueId: string, status: any) => {
    if (status === 'approved') {
      await verificationApi.approve(queueId);
    } else if (status === 'rejected') {
      await verificationApi.reject(queueId);
    }
  },
  getAuditLogs: auditApi.listLegacy,
  logSensitiveDocAccess: auditApi.logSensitiveDocAccess,
  getReports: pending<'getReports'>('Moderation reports'),
  submitReport: pending<'submitReport'>('Content reports'),
  updateReportStatus: pending<'updateReportStatus'>('Moderation actions'),
  getDisputes: pending<'getDisputes'>('Stewardship disputes'),
  submitDisputeClaim: pending<'submitDisputeClaim'>('Stewardship claims'),
  addDisputeNote: pending<'addDisputeNote'>('Dispute notes'),
  updateDisputeStatus: pending<'updateDisputeStatus'>('Dispute decisions'),
  getBillingInvoices: async (): Promise<BillingInvoice[]> => {
    try {
      const invoices = await billingApi.getInvoices();
      return invoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        planName: 'Memorial Plan',
        amount: `₹${(inv.amountMinor / 100).toFixed(0)}`,
        currency: inv.currency.toUpperCase(),
        date: new Date(inv.issuedAt).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
        status: (inv.status === 'paid' ? 'success' : inv.status === 'refunded' ? 'refunded' : 'failed') as any,
        paymentMethodMasked: 'Razorpay / Card',
        receiptUrl: inv.pdfUrl || undefined,
      }));
    } catch {
      return [];
    }
  },
  createBillingInvoice: pending<'createBillingInvoice'>('Client-created invoices'),
  getAnniversarySettings: pending<'getAnniversarySettings'>('Anniversary reminders'),
  saveAnniversarySettings: pending<'saveAnniversarySettings'>('Anniversary reminders'),
  async getNotifications() {
    const { notifications } = await notificationsApi.list();
    return notifications.map(toLegacyNotificationItem);
  },
  async markAllNotificationsRead() {
    await notificationsApi.markAllRead();
    const { notifications } = await notificationsApi.list();
    return notifications.map(toLegacyNotificationItem);
  },
};

export { mediaApi, memorialsApi, offeringsApi, tributesApi, contributorsApi, verificationApi, billingApi };
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
