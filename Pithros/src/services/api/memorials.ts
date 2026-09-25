/**
 * Memorial endpoints.
 *
 * Writes are built from an explicit field allowlist. That matters for two
 * reasons: the API rejects unknown fields outright, and ownership fields
 * (`stewardId`, `stewardName`, `stewardEmail`) must never be sent — the server
 * derives the steward from the verified token.
 */

import type { Memorial, TimelineEvent } from '../../types';
import { http } from './client';
import { type ApiMemorial, type ApiSearchResult, toMemorial } from './mappers';

const WRITABLE_FIELDS = [
  'fullName',
  'preferredName',
  'birthDate',
  'deathDate',
  'birthPlace',
  'restingPlace',
  'shortEpitaph',
  'portraitUrl',
  'coverUrl',
  'privacy',
  'theme',
] as const;

const STORY_FIELDS = [
  'overview',
  'earlyLife',
  'passionsAndValues',
  'enduringLegacy',
  'favoriteQuotes',
] as const;

function toWritePayload(input: Partial<Memorial>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  for (const field of WRITABLE_FIELDS) {
    const value = (input as Record<string, unknown>)[field];
    if (value !== undefined) payload[field] = value;
  }

  if (input.story) {
    const story: Record<string, unknown> = {};
    for (const field of STORY_FIELDS) {
      const value = (input.story as Record<string, unknown>)[field];
      if (value !== undefined) story[field] = value;
    }
    if (Object.keys(story).length > 0) payload.story = story;
  }

  return payload;
}

/**
 * Last-seen version per memorial, so writes can be made conditional.
 *
 * Kept here rather than in the views because the facade's method signatures are
 * fixed by `typeof demoApi` — there is no parameter to thread a version through.
 * A 409 from the server surfaces as `ConflictError`, which the UI already handles.
 */
const versionCache = new Map<string, number>();

function remember(memorial: Memorial): Memorial {
  if (typeof memorial.version === 'number') {
    versionCache.set(memorial.id, memorial.version);
  }
  return memorial;
}

function ifMatchHeaders(id: string): Record<string, string> {
  const version = versionCache.get(id);
  return typeof version === 'number' ? { 'If-Match': String(version) } : {};
}

export const memorialsApi = {
  /**
   * The caller's memorials, in full.
   *
   * `/me/memorials` returns lightweight summaries (one query, no per-memorial
   * fan-out), so the detail of each is fetched in parallel. A user owns a
   * handful of memorials, and this keeps the response honest: no view ever
   * receives a partially populated `Memorial`.
   */
  async listMine(): Promise<Memorial[]> {
    const summaries = await http.get<Array<{ id: string }>>('/me/memorials');
    const details = await Promise.all(
      summaries.map((summary) => http.get<ApiMemorial>(`/memorials/${summary.id}`)),
    );
    return details.map((detail) => remember(toMemorial(detail)));
  },

  async getById(id: string): Promise<Memorial> {
    return remember(toMemorial(await http.get<ApiMemorial>(`/memorials/${id}`)));
  },

  async getPublicBySlug(slug: string): Promise<Memorial | null> {
    try {
      const memorial = await http.get<ApiMemorial>(`/public/memorials/${slug}`, {
        anonymous: true,
      });
      return toMemorial(memorial);
    } catch (error) {
      if ((error as { status?: number }).status === 404) return null;
      throw error;
    }
  },

  async create(input: Partial<Memorial>): Promise<Memorial> {
    const payload = toWritePayload(input);
    return remember(toMemorial(await http.post<ApiMemorial>('/memorials', payload)));
  },

  async update(id: string, updates: Partial<Memorial>): Promise<Memorial> {
    const payload = toWritePayload(updates);
    const updated = await http.patch<ApiMemorial>(`/memorials/${id}`, payload, {
      headers: ifMatchHeaders(id),
    });
    return remember(toMemorial(updated));
  },

  async setPublication(id: string, state: 'draft' | 'published' | 'archived'): Promise<Memorial> {
    const updated = await http.post<ApiMemorial>(
      `/memorials/${id}/publication`,
      { publicationState: state },
      { headers: ifMatchHeaders(id) },
    );
    return remember(toMemorial(updated));
  },

  async remove(id: string): Promise<void> {
    await http.delete<void>(`/memorials/${id}`);
  },

  async search(query?: string): Promise<ApiSearchResult[]> {
    const response = await http.get<{ results: ApiSearchResult[] }>('/public/search', {
      query: { q: query },
      anonymous: true,
    });
    return response.results ?? [];
  },

  async addTimelineEvent(memorialId: string, event: Omit<TimelineEvent, 'id'>): Promise<TimelineEvent> {
    const created = await http.post<{
      id: string;
      year?: string;
      dateStr?: string | null;
      title: string;
      description?: string;
      location?: string | null;
      mediaUrl?: string | null;
      category?: string | null;
    }>(`/memorials/${memorialId}/timeline`, event);

    return {
      id: created.id,
      year: created.year ?? '',
      dateStr: created.dateStr ?? undefined,
      title: created.title,
      description: created.description ?? '',
      location: created.location ?? undefined,
      mediaUrl: created.mediaUrl ?? undefined,
      category: (created.category ?? undefined) as TimelineEvent['category'],
    };
  },

  async removeTimelineEvent(memorialId: string, eventId: string): Promise<void> {
    await http.delete<void>(`/memorials/${memorialId}/timeline/${eventId}`);
  },

  async permissions(memorialId: string): Promise<{
    myRole: string | null;
    myPermissions: string[];
  }> {
    return http.get(`/memorials/${memorialId}/permissions`);
  },
};
