import { PithrosUserRecord, UserRole, AdminSubRole } from '../../types';
import { DEMO_MODE } from '../../lib/config';
import { usersApi } from '../api/users';
import { BackendTokenVerificationResponse } from './authTypes';

const STORAGE_KEY = 'pithros_user_records_v1';

// Seed initial system records in PostgreSQL simulation
const initialRecords: Record<string, PithrosUserRecord> = {
  'fb_uid_anita_steward': {
    id: 'usr_anita_krishnan',
    firebase_uid: 'fb_uid_anita_steward',
    name: 'Anita Krishnan',
    email: 'anita.k@example.com',
    role: 'family_steward',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
    phone: '+91 98450 11223',
    status: 'active',
    email_verified: true,
    phone_verified: true,
    mfa_enabled: false,
    created_at: '2025-01-15T09:30:00Z',
    updated_at: '2026-03-10T14:22:00Z',
  },
  'fb_uid_dev_admin': {
    id: 'usr_sarah_admin',
    firebase_uid: 'fb_uid_dev_admin',
    name: 'Sarah Chen (Security Ops)',
    email: 'admin@pithros.org',
    role: 'admin',
    admin_subrole: 'super_admin',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200',
    phone: '+1 415 555 0192',
    status: 'active',
    email_verified: true,
    phone_verified: true,
    mfa_enabled: true,
    created_at: '2024-11-01T10:00:00Z',
    updated_at: '2026-04-01T08:15:00Z',
  },
  'fb_uid_rajesh_partner': {
    id: 'usr_rajesh_partner',
    firebase_uid: 'fb_uid_rajesh_partner',
    name: 'Rajesh Varma (Shanti Memorial Care)',
    email: 'partner@pithros.org',
    role: 'partner',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
    phone: '+91 98200 44332',
    status: 'active',
    email_verified: true,
    phone_verified: true,
    mfa_enabled: false,
    created_at: '2025-02-20T11:00:00Z',
    updated_at: '2026-02-25T16:40:00Z',
  },
};

function getLocalDatabase(): Record<string, PithrosUserRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialRecords));
      return { ...initialRecords };
    }
    return JSON.parse(raw);
  } catch {
    return { ...initialRecords };
  }
}

function saveLocalDatabase(db: Record<string, PithrosUserRecord>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (e) {
    console.error('Failed to persist Pithros PostgreSQL user record cache', e);
  }
}

/**
 * Resolve the Pithros account for a signed-in Firebase user.
 *
 * In live mode this calls `GET /api/v1/me`, which is the real endpoint: FastAPI
 * verifies the ID token, extracts the uid, and looks up or provisions the
 * PostgreSQL user. Role assignment is entirely server-side — the email-address
 * heuristics below only exist for the demo backend and never run in production.
 */
export async function verifyTokenAndResolveUser(
  firebaseUid: string,
  idToken: string,
  profileFallback?: {
    email?: string | null;
    displayName?: string | null;
    photoURL?: string | null;
    phoneNumber?: string | null;
    emailVerified?: boolean;
    role?: UserRole;
  }
): Promise<BackendTokenVerificationResponse> {
  if (!DEMO_MODE) {
    const user = await usersApi.getMe();
    return {
      verified: true,
      firebase_uid: user.firebase_uid,
      user: user as unknown as PithrosUserRecord,
      token: idToken,
      claims: {
        role: user.role as UserRole,
        admin_subrole: (user.admin_subrole ?? undefined) as AdminSubRole | undefined,
        permissions: [],
      },
    };
  }

  // Simulate network latency to FastAPI backend
  await new Promise((r) => setTimeout(r, 220));

  const db = getLocalDatabase();
  let record = db[firebaseUid];

  if (!record) {
    // Determine role (prioritizing explicit partner registration or admin domains)
    let assignedRole: UserRole = profileFallback?.role || 'family_steward';
    let assignedAdminSubrole: AdminSubRole | undefined = undefined;

    const email = profileFallback?.email?.toLowerCase() || '';
    if (email.endsWith('@pithros.org') || email.includes('admin@')) {
      assignedRole = 'admin';
      assignedAdminSubrole = 'super_admin';
    } else if (email.includes('partner@') || email.includes('provider@') || profileFallback?.role === 'partner') {
      assignedRole = 'partner';
    }

    record = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      firebase_uid: firebaseUid,
      name: profileFallback?.displayName || email.split('@')[0] || 'Memorial Steward',
      email: email || `${firebaseUid}@users.pithros.internal`,
      role: assignedRole,
      admin_subrole: assignedAdminSubrole,
      avatar:
        profileFallback?.photoURL ||
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
      phone: profileFallback?.phoneNumber || undefined,
      status: 'active',
      email_verified: Boolean(profileFallback?.emailVerified),
      phone_verified: Boolean(profileFallback?.phoneNumber),
      mfa_enabled: assignedRole === 'admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db[firebaseUid] = record;
    saveLocalDatabase(db);
  } else {
    // Sync email verification status if updated
    if (profileFallback?.emailVerified !== undefined && profileFallback.emailVerified !== record.email_verified) {
      record.email_verified = profileFallback.emailVerified;
      record.updated_at = new Date().toISOString();
      db[firebaseUid] = record;
      saveLocalDatabase(db);
    }
  }

  // Derive permissions based on authoritative backend role
  const permissions: string[] = [];
  if (record.role === 'admin') {
    permissions.push('all', 'admin:manage_memorials', 'admin:verify', 'admin:moderation', 'admin:disputes', 'admin:audit');
  } else if (record.role === 'partner') {
    permissions.push('partner:leads', 'partner:packages', 'partner:analytics');
  } else if (record.role === 'family_steward') {
    permissions.push('memorial:create', 'memorial:edit', 'memorial:invite', 'memorial:delete', 'memorial:billing');
  } else {
    permissions.push('memorial:view', 'tribute:create');
  }

  return {
    verified: true,
    firebase_uid: firebaseUid,
    user: record,
    token: idToken,
    claims: {
      role: record.role,
      admin_subrole: record.admin_subrole,
      permissions,
    },
  };
}

/**
 * Updates a Pithros user record in the simulated PostgreSQL database
 */
export async function updatePithrosUserRecord(
  firebaseUid: string,
  updates: Partial<PithrosUserRecord>
): Promise<PithrosUserRecord> {
  await new Promise((r) => setTimeout(r, 180));
  const db = getLocalDatabase();
  const existing = db[firebaseUid];
  if (!existing) {
    throw new Error('User record not found in Pithros database');
  }

  const updated: PithrosUserRecord = {
    ...existing,
    ...updates,
    updated_at: new Date().toISOString(),
  };

  db[firebaseUid] = updated;
  saveLocalDatabase(db);
  return updated;
}
