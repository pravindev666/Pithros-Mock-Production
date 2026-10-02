/**
 * Farewell Network client: the partner console, the public directory, and the
 * family enquiry flow.
 *
 * This module is the real implementation. The legacy facade in `./index.ts`
 * keeps the old method names by mapping these responses onto the shapes the
 * existing views were built against, so the UI did not have to be rewritten to
 * stop being fed invented records.
 */

import { http } from './client';
import type { FarewellLead, ProviderLead, ServiceProvider } from '../../types';

export interface PublicProviderService {
  id: string;
  name: string;
  startingPrice: string;
  description: string;
  estimatedTime: string;
  included: string[];
}

export interface PublicProvider {
  id: string;
  slug: string;
  name: string;
  businessName: string;
  tagline: string;
  category: string;
  city: string;
  serviceAreas: string[];
  rating: number;
  reviewCount: number;
  responseTime: string;
  phone: string;
  whatsapp: string;
  verifiedBadges: string[];
  description: string;
  photoUrl: string;
  logoUrl: string | null;
  startingPrice: string;
  operatingHours: string;
  photos: string[];
  services: PublicProviderService[];
  reviews: unknown[];
  ratingDistribution: Record<string, number>;
  faqs: unknown[];
  address: string;
}

export interface PartnerService {
  id: string;
  name: string;
  description: string;
  priceNote: string;
  estimatedTime: string;
  includes: string[];
  active: boolean;
  sort: number;
}

export interface PartnerProfile {
  id: string;
  slug: string;
  businessName: string;
  contactName: string;
  tagline: string;
  category: string;
  city: string;
  serviceAreas: string[];
  description: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  operatingHours: string;
  status: string;
  verificationState: string;
  statusReason: string | null;
  logoUrl: string | null;
  photos: { id: string; url: string; title: string; status: string; createdAt: string }[];
  services: PartnerService[];
  createdAt: string;
  updatedAt: string;
}

export interface PartnerVerification {
  state: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  decisionReason: string | null;
  documents: { id: string; url: string; title: string; status: string; createdAt: string }[];
}

export interface PartnerLead {
  id: string;
  providerId: string;
  providerName: string;
  serviceCategory: string;
  requesterName: string;
  phone: string;
  email: string | null;
  city: string;
  dateNeeded: string | null;
  urgency: string;
  description: string;
  status: string;
  quotedAmount: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminProvider {
  id: string;
  slug: string;
  businessName: string;
  contactName: string;
  category: string;
  city: string;
  phone: string;
  email: string;
  status: string;
  verificationState: string;
  statusReason: string | null;
  serviceCount: number;
  openLeadCount: number;
  submittedAt: string | null;
  createdAt: string;
}

export interface AdminLead {
  id: string;
  providerId: string;
  providerName: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string | null;
  city: string;
  serviceNeeded: string;
  message: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeadSubmitPayload {
  contactName: string;
  contactPhone: string;
  contactEmail?: string;
  city?: string;
  serviceNeeded: string;
  message?: string;
  dateNeeded?: string;
  urgency?: string;
  serviceId?: string;
  memorialId?: string;
}

const FAMILY_STATUS: Record<string, FarewellLead['status']> = {
  submitted: 'new',
  contacted: 'contacted',
  quoted: 'in_service',
  in_discussion: 'in_service',
  booked: 'in_service',
  completed: 'completed',
  cancelled: 'completed',
};

/** Map a live provider onto the shape `ServiceProvider` consumers already expect. */
export function toServiceProvider(provider: PublicProvider): ServiceProvider {
  return {
    id: provider.id,
    slug: provider.slug,
    name: provider.name,
    businessName: provider.businessName,
    tagline: provider.tagline,
    category: provider.category,
    city: provider.city,
    serviceAreas: provider.serviceAreas,
    rating: provider.rating,
    reviewCount: provider.reviewCount,
    responseTime: provider.responseTime,
    phone: provider.phone,
    whatsapp: provider.whatsapp,
    verifiedBadges: provider.verifiedBadges as ServiceProvider['verifiedBadges'],
    description: provider.description,
    photoUrl: provider.photoUrl,
    logoUrl: provider.logoUrl ?? undefined,
    startingPrice: provider.startingPrice,
    operatingHours: provider.operatingHours,
    photos: provider.photos,
    services: provider.services.map((service) => ({
      id: service.id,
      name: service.name,
      startingPrice: service.startingPrice,
      description: service.description,
      estimatedTime: service.estimatedTime,
      included: service.included,
    })),
    reviews: [],
    ratingDistribution: {},
    faqs: [],
    address: provider.address,
  };
}

export function toProviderLead(lead: PartnerLead): ProviderLead {
  return {
    id: lead.id,
    providerId: lead.providerId,
    providerName: lead.providerName,
    serviceCategory: lead.serviceCategory,
    requesterName: lead.requesterName,
    phone: lead.phone,
    email: lead.email ?? undefined,
    city: lead.city,
    dateNeeded: lead.dateNeeded ?? '',
    urgency: (lead.urgency || 'Planning Ahead') as ProviderLead['urgency'],
    description: lead.description,
    status: lead.status as ProviderLead['status'],
    createdAt: lead.createdAt,
    quotedAmount: lead.quotedAmount ?? undefined,
  };
}

export function toFarewellLead(lead: PartnerLead): FarewellLead {
  return {
    id: lead.id,
    familyStewardName: lead.requesterName,
    familyContactPhone: lead.phone,
    city: lead.city,
    serviceNeeded: lead.serviceCategory,
    notes: lead.description,
    providerId: lead.providerId,
    status: FAMILY_STATUS[lead.status.toLowerCase()] ?? 'new',
    createdAt: lead.createdAt,
  };
}

/** The public directory list is cached so a lead can be addressed by provider id. */
let providerDirectory: PublicProvider[] | null = null;

async function directory(): Promise<PublicProvider[]> {
  if (providerDirectory) return providerDirectory;
  const { providers } = await providersApi.listPublic();
  providerDirectory = providers;
  return providers;
}

async function slugForProviderId(providerId: string): Promise<string> {
  const providers = await directory();
  const found = providers.find((provider) => provider.id === providerId);
  if (!found) {
    // A stale directory (approval changed mid-session) deserves one refresh.
    providerDirectory = null;
    const refreshed = await directory();
    const retry = refreshed.find((provider) => provider.id === providerId);
    if (!retry) throw new Error('That provider is no longer available.');
    return retry.slug;
  }
  return found.slug;
}

export const providersApi = {
  // ─── Public directory and family enquiries ──────────────────────────────
  async listPublic(params: { q?: string; city?: string; category?: string } = {}) {
    const query = new URLSearchParams();
    if (params.q) query.set('q', params.q);
    if (params.city) query.set('city', params.city);
    if (params.category) query.set('category', params.category);
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return http.get<{ providers: PublicProvider[]; total: number }>(
      `/public/providers${suffix}`,
    );
  },

  async getPublicBySlug(slug: string): Promise<PublicProvider | null> {
    try {
      return await http.get<PublicProvider>(`/public/providers/${encodeURIComponent(slug)}`);
    } catch {
      return null;
    }
  },

  async submitLead(slug: string, payload: LeadSubmitPayload) {
    return http.post<{ id: string; providerId: string; status: string; createdAt: string }>(
      `/public/providers/${encodeURIComponent(slug)}/leads`,
      payload,
    );
  },

  async submitLeadForProviderId(providerId: string, payload: LeadSubmitPayload) {
    const slug = await slugForProviderId(providerId);
    return providersApi.submitLead(slug, payload);
  },

  // ─── Partner console ────────────────────────────────────────────────────
  async getProfile(): Promise<PartnerProfile> {
    return http.get<PartnerProfile>('/partner/profile');
  },

  async updateProfile(data: Record<string, unknown>): Promise<PartnerProfile> {
    return http.patch<PartnerProfile>('/partner/profile', data);
  },

  async getVerification(): Promise<PartnerVerification> {
    return http.get<PartnerVerification>('/partner/verification');
  },

  async submitVerification(): Promise<{ state: string; message: string }> {
    return http.post<{ state: string; message: string }>('/partner/verification/submit', {});
  },

  async listServices(): Promise<PartnerService[]> {
    return http.get<PartnerService[]>('/partner/services');
  },

  async createService(data: Partial<PartnerService>): Promise<PartnerService> {
    return http.post<PartnerService>('/partner/services', data);
  },

  async updateService(id: string, data: Partial<PartnerService>): Promise<PartnerService> {
    return http.patch<PartnerService>(`/partner/services/${id}`, data);
  },

  async deleteService(id: string): Promise<void> {
    await http.delete<void>(`/partner/services/${id}`);
  },

  async listMedia(kind?: 'photo' | 'document') {
    const suffix = kind ? `?kind=${kind}` : '';
    return http.get<{ id: string; url: string; title: string; status: string; createdAt: string }[]>(
      `/partner/media${suffix}`,
    );
  },

  async createMediaIntent(data: {
    filename: string;
    contentType?: string;
    sizeBytes?: number;
    kind: 'photo' | 'document';
    title?: string;
  }): Promise<{ mediaId: string; uploadUrl: string; method: string }> {
    return http.post('/partner/media/intent', data);
  },

  async completeMedia(mediaId: string) {
    return http.post<{ id: string; url: string; status: string }>(
      `/partner/media/${mediaId}/complete`,
      {},
    );
  },

  async deleteMedia(mediaId: string): Promise<void> {
    await http.delete<void>(`/partner/media/${mediaId}`);
  },

  async listLeads(params: { status?: string } = {}) {
    const suffix = params.status ? `?status=${encodeURIComponent(params.status)}` : '';
    return http.get<{ leads: PartnerLead[]; total: number }>(`/partner/leads${suffix}`);
  },

  async updateLeadStatus(
    leadId: string,
    status: string,
    quotedAmount?: string,
  ): Promise<PartnerLead> {
    return http.patch<PartnerLead>(`/partner/leads/${leadId}`, {
      status,
      quotedAmount: quotedAmount ?? null,
    });
  },

  // ─── Admin desk ─────────────────────────────────────────────────────────
  async listAdminProviders(params: { status?: string; q?: string } = {}) {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    if (params.q) query.set('q', params.q);
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return http.get<{ providers: AdminProvider[]; total: number }>(
      `/admin/providers${suffix}`,
    );
  },

  async approveProvider(id: string, reason?: string): Promise<AdminProvider> {
    return http.post<AdminProvider>(`/admin/providers/${id}/approve`, { reason });
  },

  async rejectProvider(id: string, reason?: string): Promise<AdminProvider> {
    return http.post<AdminProvider>(`/admin/providers/${id}/reject`, { reason });
  },

  async requestProviderInfo(id: string, reason?: string): Promise<AdminProvider> {
    return http.post<AdminProvider>(`/admin/providers/${id}/request-info`, { reason });
  },

  async suspendProvider(id: string, reason?: string): Promise<AdminProvider> {
    return http.post<AdminProvider>(`/admin/providers/${id}/suspend`, { reason });
  },

  async listAdminLeads(params: { status?: string } = {}) {
    const suffix = params.status ? `?status=${encodeURIComponent(params.status)}` : '';
    return http.get<{ leads: AdminLead[]; total: number }>(`/admin/leads${suffix}`);
  },
};

/** Successful partner reads invalidate the cached directory once approval changes. */
export function approveInvalidatesDirectory(): void {
  providerDirectory = null;
}
