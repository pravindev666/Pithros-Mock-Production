/**
 * Current-user endpoints. `getMe` is the single call the app makes after
 * Firebase sign-in; the backend resolves (and on first login provisions) the
 * Pithros account from the verified token.
 */

import { http } from './client';

export interface PithrosUser {
  id: string;
  firebase_uid: string;
  name: string;
  email: string;
  role: string;
  admin_subrole?: string | null;
  avatar?: string | null;
  phone?: string | null;
  status: string;
  email_verified: boolean;
  phone_verified: boolean;
  mfa_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export const usersApi = {
  getMe: (): Promise<PithrosUser> => http.get<PithrosUser>('/me'),

  updateMe: (updates: { name?: string; phone?: string; avatar?: string }): Promise<PithrosUser> =>
    http.patch<PithrosUser>('/me', updates),
};
