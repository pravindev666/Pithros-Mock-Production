/**
 * Contributors and invitations.
 *
 * Role names differ between the two sides: the UI was built with
 * `archivist`/`contributor`/`reviewer`, the API uses the full
 * `photo_archivist`/`memory_contributor`/`guest_reviewer`. The mapping lives here
 * so neither side has to change.
 */

import type { FamilyMember, FamilyRole } from '../../types';
import { http } from './client';

const ROLE_TO_API: Record<FamilyRole, string> = {
  steward: 'steward',
  biographer: 'biographer',
  archivist: 'photo_archivist',
  contributor: 'memory_contributor',
  reviewer: 'guest_reviewer',
  viewer: 'viewer',
};

const ROLE_FROM_API: Record<string, FamilyRole> = {
  steward: 'steward',
  biographer: 'biographer',
  photo_archivist: 'archivist',
  memory_contributor: 'contributor',
  guest_reviewer: 'reviewer',
  viewer: 'viewer',
};

export interface ApiContributor {
  id: string;
  userId?: string | null;
  name: string;
  email?: string | null;
  avatar?: string | null;
  relationship?: string | null;
  role: string;
  status: string;
  permissions?: string[];
  isInvitationPending?: boolean;
}

export interface ApiInvitationCreated {
  contributor: ApiContributor;
  invitationUrl: string;
  expiresAt?: string | null;
  /**
   * Null unless the backend has EXPOSE_INVITATION_TOKENS enabled, which it
   * refuses to do in production — there the token only travels by email.
   */
  invitationToken?: string | null;
}

export function toFamilyMember(api: ApiContributor): FamilyMember {
  return {
    id: api.id,
    name: api.name,
    relationship: api.relationship ?? '',
    status: api.isInvitationPending ? 'invited' : 'active',
    avatar: api.avatar ?? undefined,
    email: api.email ?? undefined,
    role: ROLE_FROM_API[api.role] ?? 'viewer',
  };
}

export const contributorsApi = {
  async invite(
    memorialId: string,
    input: { email: string; role: FamilyRole; relationship?: string; displayName?: string },
  ): Promise<{ member: FamilyMember; invitationToken?: string | null }> {
    const created = await http.post<ApiInvitationCreated>(
      `/memorials/${memorialId}/contributors`,
      {
        email: input.email,
        role: ROLE_TO_API[input.role] ?? 'viewer',
        relationship: input.relationship || undefined,
        displayName: input.displayName || undefined,
      },
    );

    return {
      member: toFamilyMember(created.contributor),
      invitationToken: created.invitationToken ?? undefined,
    };
  },

  async list(memorialId: string): Promise<FamilyMember[]> {
    const rows = await http.get<ApiContributor[]>(`/memorials/${memorialId}/contributors`);
    return rows.map(toFamilyMember);
  },

  async revoke(memorialId: string, contributorId: string): Promise<void> {
    await http.delete<void>(`/memorials/${memorialId}/contributors/${contributorId}`);
  },

  async updateRole(memorialId: string, contributorId: string, role: FamilyRole): Promise<void> {
    await http.patch(`/memorials/${memorialId}/contributors/${contributorId}`, {
      role: ROLE_TO_API[role] ?? 'viewer',
    });
  },

  async myInvitations(): Promise<
    Array<{ id: string; memorialSlug: string; memorialName: string; role: string }>
  > {
    return http.get('/me/invitations');
  },

  async accept(token: string): Promise<FamilyMember> {
    const contributor = await http.post<ApiContributor>('/contributors/accept', { token });
    return toFamilyMember(contributor);
  },

  async decline(token: string): Promise<void> {
    await http.post<void>('/contributors/reject', { token });
  },
};
