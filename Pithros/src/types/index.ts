export type PrivacyLevel = 'private' | 'family' | 'unlisted' | 'public';

export type VerificationStatus = 
  | 'draft' 
  | 'pending' 
  | 'under_review' 
  | 'approved' 
  | 'needs_info' 
  | 'rejected';

export type UserRole = 'visitor' | 'family_steward' | 'family_contributor' | 'partner' | 'admin';

export type AdminSubRole =
  | 'super_admin'
  | 'admin'
  | 'verification_reviewer'
  | 'moderator'
  | 'provider_manager'
  | 'support_agent';

export interface User {
  id: string;
  firebase_uid?: string;
  name: string;
  email: string;
  role: UserRole;
  admin_subrole?: AdminSubRole;
  avatar?: string;
  phone?: string;
  status?: 'active' | 'suspended' | 'pending_verification';
  email_verified?: boolean;
  phone_verified?: boolean;
  mfa_enabled?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PithrosUserRecord extends User {
  firebase_uid: string;
  status: 'active' | 'suspended' | 'pending_verification';
  email_verified: boolean;
  phone_verified: boolean;
  mfa_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface TimelineEvent {
  id: string;
  year: string;
  dateStr?: string;
  title: string;
  description: string;
  location?: string;
  mediaUrl?: string;
  category?: 'birth' | 'milestone' | 'family' | 'career' | 'memory' | 'passing';
}

export interface VoiceMemory {
  id: string;
  title: string;
  speakerName: string;
  relationship: string;
  duration: string; // e.g. "2:45"
  dateRecorded?: string;
  recordedAt?: string;
  audioUrl?: string;
  waveformPattern: number[]; // 24-32 heights for visualizer
  transcript?: string;
}

export interface MediaItem {
  id: string;
  type: 'photo' | 'video' | 'voice' | 'document';
  title: string;
  url: string;
  thumbnailUrl?: string;
  caption?: string;
  year?: string;
  uploadedBy?: string;
  isPrivate?: boolean;
  isPublic?: boolean;
}

export type FamilyRole =
  | 'steward'
  | 'biographer'
  | 'archivist'
  | 'contributor'
  | 'reviewer'
  | 'viewer';

export type FamilyContributorRole = FamilyRole;

export interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
  status?: 'active' | 'invited' | 'pending';
  avatar?: string;
  email?: string;
  invitedEmail?: string;
  role: FamilyContributorRole;
  canEditStory?: boolean;
  canAddMedia?: boolean;
  canManageTimeline?: boolean;
}

export interface Tribute {
  id: string;
  authorName: string;
  relationship: string;
  message: string;
  date: string;
  avatarUrl?: string;
  photoUrl?: string;
  isApproved: boolean;
  isPinned?: boolean;
}

export type OfferingType =
  | 'dove'
  | 'flower'
  | 'hands'
  | 'light'
  | 'star'
  | 'heart'
  | 'honor'
  | 'memory'
  | 'prayer';

export interface RemembranceOffering {
  id: string;
  type: OfferingType;
  senderName: string;
  message?: string;
  timestamp: string;
}

export interface DigitalLegacyLink {
  id: string;
  platform: 'youtube' | 'facebook' | 'instagram' | 'linkedin' | 'website' | 'other';
  label: string;
  url: string;
  notes?: string;
}

export type ServiceCategory = string;

export interface FarewellLead {
  id: string;
  familyStewardName: string;
  familyContactPhone: string;
  city: string;
  serviceNeeded: string;
  notes?: string;
  providerId?: string;
  status: 'new' | 'contacted' | 'in_service' | 'completed';
  createdAt: string;
}

export interface Memorial {
  id: string;
  slug: string;
  fullName: string;
  preferredName?: string;
  birthDate: string;
  deathDate: string;
  birthPlace: string;
  restingPlace?: string;
  shortEpitaph: string;
  portraitUrl: string;
  coverUrl?: string;
  portraitMediaId?: string | null;
  coverMediaId?: string | null;
  story: {
    overview: string;
    earlyLife?: string;
    passionsAndValues?: string;
    enduringLegacy?: string;
    favoriteQuotes?: string[];
  };
  privacy: PrivacyLevel;
  theme?: 'classic' | 'ivory' | 'midnight' | 'heritage' | 'garden' | 'monument' | 'horizon' | 'candlelight';
  verificationStatus: VerificationStatus;
  verificationBadgeType?: 'Family Managed' | 'Document Reviewed' | 'Enhanced Verification';
  timeline: TimelineEvent[];
  family: FamilyMember[];
  media: MediaItem[];
  voiceMemories: VoiceMemory[];
  tributes: Tribute[];
  offerings: RemembranceOffering[];
  legacyLinks: DigitalLegacyLink[];
  stewardId: string;
  stewardName: string;
  stewardRelationship?: string;
  stewardEmail: string;
  completenessPercent: number;
  /**
   * Optimistic concurrency token. Echoed back in `If-Match` on write so two
   * editors cannot silently overwrite each other; a stale value yields a 409.
   */
  version?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderServiceItem {
  id: string;
  name: string;
  startingPrice: string;
  description?: string;
  estimatedTime?: string;
  included?: string[];
  photos?: string[];
}

export interface ProviderReview {
  id: string;
  author: string;
  rating: number;
  date: string;
  comment: string;
  serviceUsed?: string;
  isDemo?: boolean;
}

export interface ServiceProvider {
  id: string;
  slug: string;
  name?: string;
  businessName: string;
  tagline: string;
  category: string;
  city: string;
  serviceAreas: string[];
  rating: number;
  reviewCount: number;
  responseTime: string; // e.g. "< 15 mins"
  phone: string;
  whatsapp: string;
  verifiedBadges: ('Identity Reviewed' | 'Business Reviewed' | 'Documents Reviewed' | 'Platform Partner')[];
  description: string;
  photoUrl: string;
  logoUrl?: string;
  startingPrice: string;
  operatingHours: string;
  photos: string[];
  services?: ProviderServiceItem[];
  reviews?: ProviderReview[];
  ratingDistribution?: { [stars: number]: number };
  faqs?: { q: string; a: string }[];
  address?: string;
}

export interface ProviderLead {
  id: string;
  providerId: string;
  providerName: string;
  serviceCategory: string;
  requesterName: string;
  phone: string;
  email?: string;
  city: string;
  dateNeeded: string;
  urgency: 'Immediate (Today/Tomorrow)' | 'Within 3 Days' | 'This Week' | 'Planning Ahead';
  description: string;
  status: 'Submitted' | 'Provider Contacted' | 'Quote Received' | 'In Discussion' | 'Booked' | 'Completed' | 'Cancelled';
  createdAt: string;
  quotedAmount?: string;
}

export interface AdminReport {
  id: string;
  targetType: 'memorial' | 'tribute' | 'media' | 'provider' | 'review';
  targetId: string;
  targetTitle: string;
  reason:
    | 'Incorrect information'
    | 'Impersonation'
    | 'Harassment'
    | 'Harassment or Defamation'
    | 'Privacy concern'
    | 'Fraudulent content'
    | 'Inappropriate / Nudity / Explicit content'
    | 'Violence or Graphic content'
    | 'Other'
    | (string & {});
  details: string;
  reporterEmail: string;
  status: 'pending' | 'under_review' | 'resolved' | 'restricted' | 'removed' | 'escalated';
  actionTaken?: string;
  createdAt: string;
}

export interface DisputeEvidence {
  id: string;
  title: string;
  documentType: string;
  fileUrl: string;
  submittedAt: string;
  notes?: string;
}

export interface DisputeInternalNote {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

export interface AdminDispute {
  id: string;
  memorialId: string;
  memorialName: string;
  claimantName: string;
  claimantEmail: string;
  claimantRelation: string;
  respondentName: string;
  disputeSummary: string;
  status: 'claim' | 'evidence_review' | 'under_review' | 'escalated' | 'resolved';
  evidence: DisputeEvidence[];
  internalNotes: DisputeInternalNote[];
  resolutionSummary?: string;
  lastUpdated: string;
}

export type PaymentStatus =
  | 'created'
  | 'pending'
  | 'processing'
  | 'success'
  | 'failed'
  | 'cancelled'
  | 'expired'
  | 'refund_requested'
  | 'refund_processing'
  | 'refunded'
  | 'partially_refunded';

export interface PaymentRecord {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  memorialId: string;
  memorialName?: string;
  planId: string;
  planName: string;
  amount: number;
  formattedAmount: string;
  currency: string;
  gateway: 'razorpay' | 'cashfree';
  gatewayOrderId: string;
  gatewayPaymentId?: string;
  gatewaySignature?: string;
  status: PaymentStatus;
  invoiceId?: string;
  paymentMethodMasked?: string;
  failureReason?: string;
  refundAmount?: number;
  refundReason?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface PaymentDispute {
  id: string;
  paymentId: string;
  invoiceNumber: string;
  customerEmail: string;
  customerName: string;
  amount: number;
  formattedAmount: string;
  currency: string;
  reason: string;
  status: 'open' | 'under_review' | 'won' | 'lost' | 'refunded';
  evidenceSubmitted?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentGatewayConfig {
  activeGateway: 'razorpay' | 'cashfree';
  mode: 'test' | 'live';
  webhookSecretConfigured: boolean;
  signatureVerificationStrict: boolean;
}

export interface BillingInvoice {
  id: string;
  invoiceNumber: string;
  planName: string;
  amount: string;
  currency: string;
  date: string;
  status: PaymentStatus;
  paymentMethodMasked: string;
  receiptUrl?: string;
  refundReason?: string;
  memorialName?: string;
  customerName?: string;
  customerEmail?: string;
  taxAmount?: string;
  subtotal?: string;
  paymentId?: string;
}

export interface AnniversaryNotificationConfig {
  birthday: boolean;
  deathAnniversary: boolean;
  memorialCreation: boolean;
  customDate?: string;
  customDateLabel?: string;
  channels: {
    email: boolean;
    whatsapp: boolean;
    push: boolean;
  };
  isOptedOut: boolean;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  role: string;
  action: string;
  entity: string;
  entityId: string;
  result: 'Success' | 'Denied' | 'Flagged';
  ipAddressMasked: string;
}

export interface NotificationItem {
  id: string;
  type: 'contribution' | 'tribute' | 'offering' | 'verification' | 'lead' | 'anniversary';
  title: string;
  message: string;
  timeAgo: string;
  isRead: boolean;
  link?: string;
}
