import {
  Memorial,
  Tribute,
  RemembranceOffering,
  ServiceProvider,
  ProviderLead,
  TimelineEvent,
  FamilyMember,
  MediaItem,
  AdminReport,
  AdminDispute,
  BillingInvoice,
  AnniversaryNotificationConfig,
  AuditLogEntry,
  DigitalLegacyLink,
} from '../../types';
import {
  demoMemorials,
  demoProviders,
  demoLeads,
  demoAdminVerificationQueue,
  demoAuditLogs,
  demoNotifications,
  demoAdminReports,
  demoAdminDisputes,
  demoBillingInvoices,
} from '../../data/mockData';

/**
 * The original browser-only implementation, kept verbatim.
 *
 * It is the demo-mode backend and, more importantly, the type contract that the
 * real client must satisfy: `src/services/api.ts` types the live client as
 * `typeof demoApi`, so `tsc` fails if any method is missing or has drifted.
 *
 * Nothing here may ever be the source of truth in production — DEMO_MODE is
 * explicit and off by default outside development.
 */

// In-memory / localStorage storage helpers
const STORAGE_PREFIX = 'pithros_';

function getStored<T>(key: string, fallback: T): T {
  try {
    const val = localStorage.getItem(STORAGE_PREFIX + key);
    return val ? JSON.parse(val) : fallback;
  } catch {
    return fallback;
  }
}

function setStored<T>(key: string, data: T): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export const demoApi = {
  // Memorials
  async getMemorials(): Promise<Memorial[]> {
    return getStored<Memorial[]>('memorials', demoMemorials);
  },

  async getMemorialBySlug(slug: string): Promise<Memorial | null> {
    const list = await this.getMemorials();
    return list.find((m) => m.slug === slug || m.id === slug) || null;
  },

  async createMemorial(memorialData: Partial<Memorial>): Promise<Memorial> {
    const list = await this.getMemorials();
    const newMemorial: Memorial = {
      id: `mem_${Date.now()}`,
      slug: (memorialData.fullName || 'new-memorial')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, ''),
      fullName: memorialData.fullName || 'Beloved Soul',
      birthDate: memorialData.birthDate || '1950',
      deathDate: memorialData.deathDate || '2026',
      birthPlace: memorialData.birthPlace || 'India',
      restingPlace: memorialData.restingPlace || '',
      shortEpitaph: memorialData.shortEpitaph || 'Deeply loved and forever remembered.',
      portraitUrl: memorialData.portraitUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=800',
      coverUrl: memorialData.coverUrl || 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&q=80&w=1600',
      story: memorialData.story || {
        overview: 'A life lived with warmth, courage, and enduring love.',
        earlyLife: 'Remembered warmly by family and childhood friends.',
        passionsAndValues: 'Cherished simple moments and everyday kindness.',
        enduringLegacy: 'Lives on through the memories of loved ones.',
      },
      privacy: memorialData.privacy || 'family',
      verificationStatus: 'draft',
      timeline: memorialData.timeline || [],
      family: memorialData.family || [],
      media: memorialData.media || [],
      voiceMemories: memorialData.voiceMemories || [],
      tributes: [],
      offerings: [],
      legacyLinks: memorialData.legacyLinks || [],
      stewardId: 'usr_anita_krishnan',
      stewardName: 'Anita Krishnan',
      stewardEmail: 'anita.k@example.com',
      completenessPercent: 70,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    list.unshift(newMemorial);
    setStored('memorials', list);
    return newMemorial;
  },

  async updateMemorial(id: string, updates: Partial<Memorial>): Promise<Memorial | null> {
    const list = await this.getMemorials();
    const idx = list.findIndex((m) => m.id === id || m.slug === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...updates, updatedAt: new Date().toISOString() };
    setStored('memorials', list);
    return list[idx];
  },

  // Tributes
  async addTribute(memorialId: string, tribute: Omit<Tribute, 'id' | 'date' | 'isApproved'>): Promise<Tribute> {
    const list = await this.getMemorials();
    const idx = list.findIndex((m) => m.id === memorialId || m.slug === memorialId);
    const newTribute: Tribute = {
      ...tribute,
      id: `tr_${Date.now()}`,
      date: 'Just now',
      isApproved: true,
    };
    if (idx !== -1) {
      list[idx].tributes.unshift(newTribute);
      setStored('memorials', list);
    }
    return newTribute;
  },

  // Offerings
  async addOffering(
    memorialId: string,
    offering: Omit<RemembranceOffering, 'id' | 'timestamp'>
  ): Promise<RemembranceOffering> {
    const list = await this.getMemorials();
    const idx = list.findIndex((m) => m.id === memorialId || m.slug === memorialId);
    const newOffering: RemembranceOffering = {
      ...offering,
      id: `off_${Date.now()}`,
      timestamp: 'Just now',
    };
    if (idx !== -1) {
      list[idx].offerings.unshift(newOffering);
      setStored('memorials', list);
    }
    return newOffering;
  },

  // Timeline
  async addTimelineEvent(memorialId: string, event: Omit<TimelineEvent, 'id'>): Promise<TimelineEvent> {
    const list = await this.getMemorials();
    const idx = list.findIndex((m) => m.id === memorialId || m.slug === memorialId);
    const newEvent: TimelineEvent = {
      ...event,
      id: `tl_${Date.now()}`,
    };
    if (idx !== -1) {
      list[idx].timeline.push(newEvent);
      list[idx].timeline.sort((a, b) => parseInt(a.year || '0') - parseInt(b.year || '0'));
      setStored('memorials', list);
    }
    return newEvent;
  },

  async updateTimelineEvent(
    memorialId: string,
    eventId: string,
    event: Partial<Omit<TimelineEvent, 'id'>>,
  ): Promise<TimelineEvent> {
    const list = await this.getMemorials();
    const idx = list.findIndex((m) => m.id === memorialId || m.slug === memorialId);
    let updated: TimelineEvent = { id: eventId, year: '', title: '', description: '' };
    if (idx !== -1) {
      const eIdx = list[idx].timeline.findIndex((e) => e.id === eventId);
      if (eIdx !== -1) {
        list[idx].timeline[eIdx] = { ...list[idx].timeline[eIdx], ...event };
        updated = list[idx].timeline[eIdx];
        list[idx].timeline.sort((a, b) => parseInt(a.year || '0') - parseInt(b.year || '0'));
        setStored('memorials', list);
      }
    }
    return updated;
  },

  async removeTimelineEvent(memorialId: string, eventId: string): Promise<void> {
    const list = await this.getMemorials();
    const idx = list.findIndex((m) => m.id === memorialId || m.slug === memorialId);
    if (idx !== -1) {
      list[idx].timeline = list[idx].timeline.filter((e) => e.id !== eventId);
      setStored('memorials', list);
    }
  },

  // Digital Legacy Links
  async addLegacyLink(
    memorialId: string,
    link: Omit<DigitalLegacyLink, 'id'>,
  ): Promise<DigitalLegacyLink> {
    const list = await this.getMemorials();
    const idx = list.findIndex((m) => m.id === memorialId || m.slug === memorialId);
    const newLink: DigitalLegacyLink = {
      ...link,
      id: `leg_${Date.now()}`,
    };
    if (idx !== -1) {
      if (!list[idx].legacyLinks) list[idx].legacyLinks = [];
      list[idx].legacyLinks.push(newLink);
      setStored('memorials', list);
    }
    return newLink;
  },

  async updateLegacyLink(
    memorialId: string,
    linkId: string,
    updates: Partial<Omit<DigitalLegacyLink, 'id'>>,
  ): Promise<DigitalLegacyLink | null> {
    const list = await this.getMemorials();
    const idx = list.findIndex((m) => m.id === memorialId || m.slug === memorialId);
    if (idx === -1 || !list[idx].legacyLinks) return null;
    const linkIdx = list[idx].legacyLinks.findIndex((l) => l.id === linkId);
    if (linkIdx === -1) return null;
    list[idx].legacyLinks[linkIdx] = { ...list[idx].legacyLinks[linkIdx], ...updates };
    setStored('memorials', list);
    return list[idx].legacyLinks[linkIdx];
  },

  async removeLegacyLink(memorialId: string, linkId: string): Promise<void> {
    const list = await this.getMemorials();
    const idx = list.findIndex((m) => m.id === memorialId || m.slug === memorialId);
    if (idx !== -1 && list[idx].legacyLinks) {
      list[idx].legacyLinks = list[idx].legacyLinks.filter((l) => l.id !== linkId);
      setStored('memorials', list);
    }
  },

  // Family Members
  async inviteFamilyMember(
    memorialId: string,
    member: Omit<FamilyMember, 'id' | 'status'>
  ): Promise<{ member: FamilyMember; invitationToken?: string | null }> {
    const list = await this.getMemorials();
    const idx = list.findIndex((m) => m.id === memorialId || m.slug === memorialId);
    const newMember: FamilyMember = {
      ...member,
      id: `fam_${Date.now()}`,
      status: 'invited',
    };
    if (idx !== -1) {
      list[idx].family.push(newMember);
      setStored('memorials', list);
    }
    return { member: newMember, invitationToken: `demo-token-${newMember.id}` };
  },

  async acceptInvitation(_token: string): Promise<FamilyMember> {
    const list = await this.getMemorials();
    const member = list.flatMap((m) => m.family).find((f) => f.status === 'invited');
    if (member) {
      member.status = 'active';
      setStored('memorials', list);
      return member;
    }
    return {
      id: 'fam_demo',
      name: 'Family Contributor',
      role: 'contributor',
      status: 'active',
    } as FamilyMember;
  },

  // Media
  async addMedia(memorialId: string, mediaItem: Omit<MediaItem, 'id'>): Promise<MediaItem> {
    const list = await this.getMemorials();
    const idx = list.findIndex((m) => m.id === memorialId || m.slug === memorialId);
    const newMedia: MediaItem = {
      ...mediaItem,
      id: `med_${Date.now()}`,
    };
    if (idx !== -1) {
      list[idx].media.unshift(newMedia);
      setStored('memorials', list);
    }
    return newMedia;
  },

  // Providers & Farewell Network
  async getProviders(): Promise<ServiceProvider[]> {
    return getStored<ServiceProvider[]>('providers', demoProviders);
  },

  async getProviderBySlug(slug: string): Promise<ServiceProvider | null> {
    const list = await this.getProviders();
    return list.find((p) => p.slug === slug || p.id === slug) || null;
  },

  async createLead(lead: Omit<ProviderLead, 'id' | 'status' | 'createdAt'>): Promise<ProviderLead> {
    const list = getStored<ProviderLead[]>('leads', demoLeads);
    const newLead: ProviderLead = {
      ...lead,
      id: `lead_${Date.now()}`,
      status: 'Submitted',
      createdAt: 'Just now',
    };
    list.unshift(newLead);
    setStored('leads', list);
    return newLead;
  },

  async getLeads(): Promise<ProviderLead[]> {
    return getStored<ProviderLead[]>('leads', demoLeads);
  },

  async updateLeadStatus(id: string, status: any): Promise<void> {
    const list = await this.getLeads();
    const item = list.find((l) => l.id === id);
    if (item) {
      item.status = status;
      setStored('leads', list);
    }
  },

  async createFarewellLead(leadData: {
    familyStewardName: string;
    familyContactPhone: string;
    city: string;
    serviceNeeded: string;
    notes?: string;
    providerId?: string;
  }) {
    const leads = getStored<any[]>('farewell_leads', [
      {
        id: 'flead_1',
        familyStewardName: 'Pooja Hegde',
        familyContactPhone: '+91 98451 22334',
        city: 'Bengaluru',
        serviceNeeded: 'Immediate Transit & Ceremonal Coordination',
        notes: 'Need support for 50 attendees in Malleshwaram this evening',
        status: 'new',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'flead_2',
        familyStewardName: 'Anil Menon',
        familyContactPhone: '+91 94471 99881',
        city: 'Kochi',
        serviceNeeded: 'Memorial Plaque & Stone Inscription',
        notes: 'Granite carving with bilingual Malayalam / English text',
        status: 'contacted',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
    ]);
    const newLead = {
      id: `flead_${Date.now()}`,
      ...leadData,
      status: 'new' as const,
      createdAt: new Date().toISOString(),
    };
    leads.unshift(newLead);
    setStored('farewell_leads', leads);
    return newLead;
  },

  async getFarewellLeads() {
    return getStored<any[]>('farewell_leads', [
      {
        id: 'flead_1',
        familyStewardName: 'Pooja Hegde',
        familyContactPhone: '+91 98451 22334',
        city: 'Bengaluru',
        serviceNeeded: 'Immediate Transit & Ceremonial Coordination',
        notes: 'Need support for 50 attendees in Malleshwaram this evening',
        status: 'new',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'flead_2',
        familyStewardName: 'Anil Menon',
        familyContactPhone: '+91 94471 99881',
        city: 'Kochi',
        serviceNeeded: 'Memorial Plaque & Stone Inscription',
        notes: 'Granite carving with bilingual Malayalam / English text',
        status: 'contacted',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
    ]);
  },

  // Verification & Admin
  async submitVerification(memorialId: string, docData: { documentType: string; documentUrl: string }) {
    await this.updateMemorial(memorialId, {
      verificationStatus: 'under_review',
    });
  },

  async approveVerification(memorialId: string, badgeType: 'Document Reviewed' | 'Family Managed') {
    await this.updateMemorial(memorialId, {
      verificationStatus: 'approved',
      verificationBadgeType: badgeType,
    });
  },

  async rejectVerification(memorialId: string, reason: string) {
    await this.updateMemorial(memorialId, {
      verificationStatus: 'rejected',
    });
  },

  async getVerificationQueue() {
    return getStored('admin_ver_queue', demoAdminVerificationQueue);
  },

  async updateVerificationStatus(queueId: string, status: any) {
    const queue = await this.getVerificationQueue();
    const item = queue.find((q: any) => q.id === queueId);
    if (item) {
      item.status = status;
      setStored('admin_ver_queue', queue);
    }
  },

  async getAuditLogs(): Promise<AuditLogEntry[]> {
    return getStored<AuditLogEntry[]>('audit_logs', demoAuditLogs);
  },

  async logSensitiveDocAccess(actor: string, role: string, docTitle: string, entityId: string): Promise<AuditLogEntry> {
    const logs = await this.getAuditLogs();
    const entry: AuditLogEntry = {
      id: `aud_${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
      actor,
      role,
      action: 'SENSITIVE_DOC_ACCESS_LOGGED',
      entity: docTitle,
      entityId,
      result: 'Success',
      ipAddressMasked: '192.168.***.***',
    };
    logs.unshift(entry);
    setStored('audit_logs', logs);
    return entry;
  },

  // Moderation Reports
  async getReports(): Promise<AdminReport[]> {
    return getStored<AdminReport[]>('admin_reports', demoAdminReports);
  },

  async submitReport(report: Omit<AdminReport, 'id' | 'createdAt' | 'status'>): Promise<AdminReport> {
    const reports = await this.getReports();
    const newReport: AdminReport = {
      ...report,
      id: `rep_${Date.now()}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    reports.unshift(newReport);
    setStored('admin_reports', reports);
    return newReport;
  },

  async updateReportStatus(
    reportId: string,
    status: AdminReport['status'],
    actionTaken?: string
  ): Promise<AdminReport | null> {
    const reports = await this.getReports();
    const item = reports.find((r) => r.id === reportId);
    if (item) {
      item.status = status;
      if (actionTaken) item.actionTaken = actionTaken;
      setStored('admin_reports', reports);
      return item;
    }
    return null;
  },

  // Family Ownership Claims & Disputes
  async getDisputes(): Promise<AdminDispute[]> {
    return getStored<AdminDispute[]>('admin_disputes', demoAdminDisputes);
  },

  async submitDisputeClaim(
    dispute: Omit<AdminDispute, 'id' | 'status' | 'lastUpdated' | 'internalNotes'>
  ): Promise<AdminDispute> {
    const disputes = await this.getDisputes();
    const newDispute: AdminDispute = {
      ...dispute,
      id: `disp_${Date.now()}`,
      status: 'claim',
      internalNotes: [
        {
          id: `note_${Date.now()}`,
          author: 'System Intake Desk',
          text: 'New family stewardship ownership claim filed. Evidence awaiting preliminary review.',
          createdAt: new Date().toISOString(),
        },
      ],
      lastUpdated: new Date().toISOString(),
    };
    disputes.unshift(newDispute);
    setStored('admin_disputes', disputes);
    return newDispute;
  },

  async addDisputeNote(disputeId: string, author: string, text: string): Promise<void> {
    const disputes = await this.getDisputes();
    const item = disputes.find((d) => d.id === disputeId);
    if (item) {
      item.internalNotes.push({
        id: `note_${Date.now()}`,
        author,
        text,
        createdAt: new Date().toISOString(),
      });
      item.lastUpdated = new Date().toISOString();
      setStored('admin_disputes', disputes);
    }
  },

  async updateDisputeStatus(
    disputeId: string,
    status: AdminDispute['status'],
    resolutionSummary?: string
  ): Promise<AdminDispute | null> {
    const disputes = await this.getDisputes();
    const item = disputes.find((d) => d.id === disputeId);
    if (item) {
      item.status = status;
      if (resolutionSummary) item.resolutionSummary = resolutionSummary;
      item.lastUpdated = new Date().toISOString();
      setStored('admin_disputes', disputes);
      return item;
    }
    return null;
  },

  // Billing & Lifetime Preservation Invoices
  async getBillingInvoices(): Promise<BillingInvoice[]> {
    return getStored<BillingInvoice[]>('billing_invoices', demoBillingInvoices);
  },

  async createBillingInvoice(invoice: Omit<BillingInvoice, 'id'>): Promise<BillingInvoice> {
    const invoices = await this.getBillingInvoices();
    const newInv: BillingInvoice = {
      ...invoice,
      id: `inv_${Date.now()}`,
    };
    invoices.unshift(newInv);
    setStored('billing_invoices', invoices);
    return newInv;
  },

  // Anniversary System
  async getAnniversarySettings(memorialId: string): Promise<AnniversaryNotificationConfig> {
    return getStored<AnniversaryNotificationConfig>(`anniversary_${memorialId}`, {
      birthday: true,
      deathAnniversary: true,
      memorialCreation: false,
      channels: {
        email: true,
        whatsapp: false,
        push: false,
      },
      isOptedOut: false,
    });
  },

  async saveAnniversarySettings(
    memorialId: string,
    settings: AnniversaryNotificationConfig
  ): Promise<AnniversaryNotificationConfig> {
    setStored(`anniversary_${memorialId}`, settings);
    return settings;
  },

  async getNotifications() {
    return getStored('notifications', demoNotifications);
  },

  async markAllNotificationsRead() {
    const notifs = await this.getNotifications();
    notifs.forEach((n: any) => (n.isRead = true));
    setStored('notifications', notifs);
    return notifs;
  },

  exportPdf: async (memorialId: string) => {
    return {
      taskId: `demo-task-${Date.now()}`,
      status: 'ready',
      memorialId,
      downloadUrl: '#',
      fileSize: 1024 * 1024 * 2,
    };
  },

  getExportStatus: async (_memorialId: string, taskId: string) => {
    return {
      taskId,
      status: 'ready',
      downloadUrl: '#',
      fileSize: 1024 * 1024 * 2,
    };
  },
};
