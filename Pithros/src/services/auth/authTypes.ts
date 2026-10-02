import { User, UserRole, AdminSubRole, PithrosUserRecord } from '../../types';

export type AuthState =
  | 'signed_out'
  | 'loading'
  | 'authenticated'
  | 'email_not_verified'
  | 'session_expired'
  | 'unauthorized'
  | 'forbidden';

export type AuthProviderType = 'password' | 'google' | 'phone';

export interface AuthSessionUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  phoneNumber: string | null;
  photoURL: string | null;
  providerId: string;
}

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface SignUpCredentials {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  agreeTerms: boolean;
  role?: UserRole;
}

export interface AuthResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
}

export interface CountryCode {
  name: string;
  dialCode: string;
  code: string;
  flag: string;
}

export interface PhoneAuthState {
  step: 'enter_phone' | 'enter_otp' | 'verified';
  countryCode: string;
  phoneNumber: string;
  fullNumber: string;
  verificationId?: string;
  resendCountdown: number;
}

export interface BackendTokenVerificationResponse {
  verified: boolean;
  firebase_uid: string;
  user: PithrosUserRecord;
  token: string;
  claims: {
    role: UserRole;
    admin_subrole?: AdminSubRole;
    permissions: string[];
  };
}
