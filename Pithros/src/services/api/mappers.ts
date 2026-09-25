/**
 * Mappers from API responses to the frontend's existing domain types.
 *
 * Two deliberate translations happen here, both to keep the approved UI working
 * without touching view code:
 *
 *  1. Verification states. The backend uses the canonical workflow states
 *     (submitted / verification_review / needs_more_information / appeal); the
 *     UI was built against a shorter set. We map to the UI's vocabulary.
 *  2. `id` on a public memorial is the slug. The API never exposes the internal
 *     UUID anonymously, so the public projection carries the slug as its
 *     identifier — which is what the public endpoints accept anyway.
 */

import type {
  FamilyMember,
  MediaItem,
  Memorial,
  OfferingType,
  PrivacyLevel,
  RemembranceOffering,
  TimelineEvent,
  Tribute,
  VerificationStatus,
} from '../../types';

const VERIFICATION_STATE_MAP: Record<string, VerificationStatus> = {
  draft: 'draft',
  submitted: 'pending',
  verification_pending: 'pending',
  verification_review: 'under_review',
  approved: 'approved',
  needs_more_information: 'needs_info',
  rejected: 'rejected',
  appeal: 'under_review',
};

export function mapVerificationStatus(value: string | undefined): VerificationStatus {
  return VERIFICATION_STATE_MAP[value ?? ''] ?? 'draft';
}

export interface ApiStory {
  overview?: string;
  earlyLife?: string | null;
  passionsAndValues?: string | null;
  enduringLegacy?: string | null;
  favoriteQuotes?: string[];
}

export interface ApiMemorial {
  id: string;
  slug: string;
  fullName: string;
  preferredName?: string | null;
  birthDate?: string;
  deathDate?: string;
  birthPlace?: string;
  restingPlace?: string | null;
  shortEpitaph?: string;
  portraitUrl?: string | null;
  coverUrl?: string | null;
  story?: ApiStory;
  privacy: string;
  publicationState?: string;
  verificationStatus: string;
  verificationBadgeType?: string | null;
  theme?: string;
  completenessPercent?: number;
  timeline?: Array<{
    id: string;
    year?: string;
    dateStr?: string | null;
    title: string;
    description?: string;
    location?: string | null;
    mediaUrl?: string | null;
    category?: string | null;
  }>;
  family?: Array<{
    id: string;
    name: string;
    relationship?: string | null;
    status?: string | null;
    avatar?: string | null;
    email?: string | null;
    role?: string;
  }>;
  media?: Array<{
    id: string;
    type: string;
    title?: string;
    url: string;
    thumbnailUrl?: string | null;
    caption?: string | null;
    year?: string | null;
    uploadedBy?: string | null;
    isPrivate?: boolean;
    isPublic?: boolean;
  }>;
  tributes?: Array<{
    id: string;
    authorName: string;
    relationship?: string | null;
    message: string;
    date: string;
    avatarUrl?: string | null;
    photoUrl?: string | null;
    isApproved?: boolean;
    isPinned?: boolean;
  }>;
  offerings?: Array<{
    id: string;
    type: string;
    senderName: string;
    message?: string | null;
    timestamp: string;
  }>;
  legacyLinks?: Array<{
    id: string;
    platform: string;
    label: string;
    url: string;
    notes?: string | null;
  }>;
  stewardId?: string | null;
  stewardName?: string | null;
  stewardRelationship?: string | null;
  stewardEmail?: string | null;
  myRole?: string | null;
  myPermissions?: string[];
  createdAt: string;
  updatedAt: string;
}

function mapTimeline(
  events: ApiMemorial['timeline'],
): TimelineEvent[] {
  return (events ?? []).map((event) => ({
    id: event.id,
    year: event.year ?? '',
    dateStr: event.dateStr ?? undefined,
    title: event.title,
    description: event.description ?? '',
    location: event.location ?? undefined,
    mediaUrl: event.mediaUrl ?? undefined,
    category: (event.category ?? undefined) as TimelineEvent['category'],
  }));
}

function mapMedia(items: ApiMemorial['media']): MediaItem[] {
  return (items ?? []).map((item) => ({
    id: item.id,
    type: item.type as MediaItem['type'],
    title: item.title ?? '',
    url: item.url,
    thumbnailUrl: item.thumbnailUrl ?? undefined,
    caption: item.caption ?? undefined,
    year: item.year ?? undefined,
    uploadedBy: item.uploadedBy ?? undefined,
    isPrivate: item.isPrivate,
    isPublic: item.isPublic,
  }));
}

function mapFamily(members: ApiMemorial['family']): FamilyMember[] {
  return (members ?? []).map((member) => ({
    id: member.id,
    name: member.name,
    relationship: member.relationship ?? '',
    status: (member.status ?? 'active') as FamilyMember['status'],
    avatar: member.avatar ?? undefined,
    email: member.email ?? undefined,
    role: (member.role ?? 'viewer') as FamilyMember['role'],
  }));
}

function mapTributes(tributes: ApiMemorial['tributes']): Tribute[] {
  return (tributes ?? []).map((tribute) => ({
    id: tribute.id,
    authorName: tribute.authorName,
    relationship: tribute.relationship ?? '',
    message: tribute.message,
    date: tribute.date,
    avatarUrl: tribute.avatarUrl ?? undefined,
    photoUrl: tribute.photoUrl ?? undefined,
    isApproved: tribute.isApproved ?? false,
    isPinned: tribute.isPinned ?? false,
  }));
}

function mapOfferings(offerings: ApiMemorial['offerings']): RemembranceOffering[] {
  return (offerings ?? []).map((offering) => ({
    id: offering.id,
    type: offering.type as OfferingType,
    senderName: offering.senderName,
    message: offering.message ?? undefined,
    timestamp: offering.timestamp,
  }));
}

export function toMemorial(api: ApiMemorial): Memorial {
  return {
    id: api.id,
    slug: api.slug,
    fullName: api.fullName,
    preferredName: api.preferredName ?? undefined,
    birthDate: api.birthDate ?? '',
    deathDate: api.deathDate ?? '',
    birthPlace: api.birthPlace ?? '',
    restingPlace: api.restingPlace ?? undefined,
    shortEpitaph: api.shortEpitaph ?? '',
    portraitUrl: api.portraitUrl ?? '',
    coverUrl: api.coverUrl ?? undefined,
    story: {
      overview: api.story?.overview ?? '',
      earlyLife: api.story?.earlyLife ?? undefined,
      passionsAndValues: api.story?.passionsAndValues ?? undefined,
      enduringLegacy: api.story?.enduringLegacy ?? undefined,
      favoriteQuotes: api.story?.favoriteQuotes ?? [],
    },
    privacy: api.privacy as PrivacyLevel,
    verificationStatus: mapVerificationStatus(api.verificationStatus),
    verificationBadgeType: (api.verificationBadgeType ?? undefined) as Memorial['verificationBadgeType'],
    timeline: mapTimeline(api.timeline),
    family: mapFamily(api.family),
    media: mapMedia(api.media),
    // Voice memories are not persisted by the API yet; the media pipeline will
    // carry them once audio transcoding lands.
    voiceMemories: [],
    tributes: mapTributes(api.tributes),
    offerings: mapOfferings(api.offerings),
    legacyLinks: (api.legacyLinks ?? []).map((link) => ({
      id: link.id,
      platform: link.platform as Memorial['legacyLinks'][number]['platform'],
      label: link.label,
      url: link.url,
      notes: link.notes ?? undefined,
    })),
    stewardId: api.stewardId ?? '',
    stewardName: api.stewardName ?? '',
    stewardRelationship: api.stewardRelationship ?? undefined,
    stewardEmail: api.stewardEmail ?? '',
    completenessPercent: api.completenessPercent ?? 0,
    createdAt: api.createdAt,
    updatedAt: api.updatedAt,
  };
}

export interface ApiSearchResult {
  slug: string;
  fullName: string;
  birthDate?: string;
  deathDate?: string;
  birthPlace?: string;
  shortEpitaph?: string;
  portraitUrl?: string | null;
  verificationStatus: string;
}
