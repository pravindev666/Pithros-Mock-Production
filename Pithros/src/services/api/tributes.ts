/**
 * Tributes and remembrance offerings.
 *
 * Both are submitted through the public endpoints, which accept a memorial slug
 * and resolve the caller when a bearer token is present. A member's own tribute
 * is approved immediately by the server; everyone else's waits for moderation —
 * the client never decides that.
 */

import type { OfferingType, RemembranceOffering, Tribute } from '../../types';
import { http } from './client';
import { type ApiMemorial } from './mappers';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveSlug(memorialIdOrSlug: string): Promise<string> {
  if (!UUID_PATTERN.test(memorialIdOrSlug)) return memorialIdOrSlug;
  const memorial = await http.get<ApiMemorial>(`/memorials/${memorialIdOrSlug}`);
  return memorial.slug;
}

interface ApiTribute {
  id: string;
  authorName: string;
  relationship?: string | null;
  message: string;
  date: string;
  avatarUrl?: string | null;
  photoUrl?: string | null;
  isApproved?: boolean;
  isPinned?: boolean;
}

function toTribute(api: ApiTribute): Tribute {
  return {
    id: api.id,
    authorName: api.authorName,
    relationship: api.relationship ?? '',
    message: api.message,
    date: api.date,
    avatarUrl: api.avatarUrl ?? undefined,
    photoUrl: api.photoUrl ?? undefined,
    isApproved: api.isApproved ?? false,
    isPinned: api.isPinned ?? false,
  };
}

export const tributesApi = {
  async addTribute(
    memorialIdOrSlug: string,
    tribute: Omit<Tribute, 'id' | 'date' | 'isApproved'>,
  ): Promise<Tribute> {
    const slug = await resolveSlug(memorialIdOrSlug);
    const created = await http.post<ApiTribute>(`/public/memorials/${slug}/tributes`, {
      authorName: tribute.authorName,
      relationship: tribute.relationship || undefined,
      message: tribute.message,
      avatarUrl: tribute.avatarUrl,
      photoUrl: tribute.photoUrl,
    });
    return toTribute(created);
  },

  async listTributes(memorialIdOrSlug: string): Promise<Tribute[]> {
    const slug = await resolveSlug(memorialIdOrSlug);
    const tributes = await http.get<ApiTribute[]>(`/public/memorials/${slug}/tributes`);
    return tributes.map(toTribute);
  },
};

interface ApiOffering {
  id: string;
  type: string;
  senderName: string;
  message?: string | null;
  timestamp: string;
}

function toOffering(api: ApiOffering): RemembranceOffering {
  return {
    id: api.id,
    type: api.type as OfferingType,
    senderName: api.senderName,
    message: api.message ?? undefined,
    timestamp: api.timestamp,
  };
}

export const offeringsApi = {
  async addOffering(
    memorialIdOrSlug: string,
    offering: Omit<RemembranceOffering, 'id' | 'timestamp'>,
  ): Promise<RemembranceOffering> {
    const slug = await resolveSlug(memorialIdOrSlug);
    const created = await http.post<ApiOffering>(`/public/memorials/${slug}/offerings`, {
      type: offering.type,
      senderName: offering.senderName || 'Anonymous',
      message: offering.message,
    });
    return toOffering(created);
  },

  async listOfferings(memorialIdOrSlug: string): Promise<RemembranceOffering[]> {
    const slug = await resolveSlug(memorialIdOrSlug);
    const offerings = await http.get<ApiOffering[]>(`/public/memorials/${slug}/offerings`);
    return offerings.map(toOffering);
  },
};
