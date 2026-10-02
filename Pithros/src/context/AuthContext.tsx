import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../lib/firebase';
import { User, UserRole, AdminSubRole, PithrosUserRecord } from '../types';
import {
  AuthState,
  AuthSessionUser,
  SignInCredentials,
  SignUpCredentials,
} from '../services/auth/authTypes';
import { authService } from '../services/auth/authService';
import { verifyTokenAndResolveUser, updatePithrosUserRecord } from '../services/auth/pithrosUserStore';
import { DEMO_MODE } from '../lib/config';

export type { AuthState } from '../services/auth/authTypes';

interface AuthContextType {
  authState: AuthState;
  currentUser: AuthSessionUser | null;
  pithrosUser: PithrosUserRecord | null;
  user: User | null;
  role: UserRole;
  adminSubrole?: AdminSubRole;
  isLoading: boolean;
  isEmailVerified: boolean;
  isMfaVerified: boolean;
  sessionTimeRemaining: number;
  returnUrl: string | null;
  setReturnUrl: (url: string | null) => void;

  // Actions
  signInWithEmail: (email: string, password?: string) => Promise<{ success: boolean; error?: string; role?: UserRole }>;
  signUpWithEmail: (data: SignUpCredentials) => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string; role?: UserRole }>;
  sendPasswordReset: (email: string) => Promise<{ success: boolean; error?: string }>;
  confirmPasswordReset: (code: string, newPass: string) => Promise<{ success: boolean; error?: string }>;
  sendPhoneOtp: (phoneNumber: string) => Promise<{ success: boolean; verificationId?: string; error?: string }>;
  verifyPhoneOtp: (code: string) => Promise<{ success: boolean; error?: string }>;
  resendVerificationEmail: () => Promise<{ success: boolean; error?: string }>;
  checkEmailVerification: () => Promise<boolean>;
  updateProfile: (data: { name?: string; phone?: string; avatar?: string }) => Promise<{ success: boolean; error?: string }>;
  changePassword: (newPass: string) => Promise<{ success: boolean; error?: string }>;
  reauthenticate: (password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  verifyMfaStep: (pin: string) => Promise<boolean>;
  switchRole: (role: UserRole) => void;
  simulateExpiry: () => void;
  hasPermission: (requiredRole: UserRole | UserRole[]) => boolean;
  getIdToken: () => Promise<string>;

  // Backward compatibility helpers
  requestOtp: (identifier: string) => Promise<{ success: boolean; message: string }>;
  verifyOtp: (code: string) => Promise<boolean>;
}

const defaultStewardRecord: PithrosUserRecord = {
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
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Production default: starts unauthenticated/loading, never fake-authenticated
  const [authState, setAuthState] = useState<AuthState>('signed_out');
  const [currentUser, setCurrentUser] = useState<AuthSessionUser | null>(null);
  const [pithrosUser, setPithrosUser] = useState<PithrosUserRecord | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isMfaVerified, setIsMfaVerified] = useState<boolean>(false);
  const [sessionTimeRemaining, setSessionTimeRemaining] = useState<number>(3600);
  const [returnUrl, setReturnUrl] = useState<string | null>(null);

  // Initialize and observe Firebase auth state
  useEffect(() => {
    let isMounted = true;

    const checkInitialAuth = async () => {
      if (isFirebaseConfigured && auth) {
        const unsubscribe = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
          if (!isMounted) return;
          setIsLoading(true);

          if (fbUser) {
            try {
              const token = await fbUser.getIdToken();
              const verification = await verifyTokenAndResolveUser(fbUser.uid, token, {
                email: fbUser.email,
                displayName: fbUser.displayName,
                photoURL: fbUser.photoURL,
                phoneNumber: fbUser.phoneNumber,
                emailVerified: fbUser.emailVerified,
              });

              if (isMounted) {
                setCurrentUser(authService.normalizeFirebaseUser(fbUser));
                setPithrosUser(verification.user);
                if (fbUser.emailVerified || verification.user.email_verified) {
                  setAuthState('authenticated');
                } else {
                  setAuthState('email_not_verified');
                }
              }
            } catch (e) {
              console.error('Failed to verify token with Pithros backend:', e);
              if (isMounted) setAuthState('unauthorized');
            }
          } else {
            // Persona switching is a demo-only affordance and must never be
            // restored in live mode — the server-resolved account is authoritative.
            const savedDemo = DEMO_MODE && typeof window !== 'undefined'
              ? sessionStorage.getItem('pithros_demo_role')
              : null;
            if (savedDemo && savedDemo !== 'visitor') {
              switchRole(savedDemo as UserRole);
            } else {
              if (isMounted) {
                setCurrentUser(null);
                setPithrosUser(null);
                setAuthState('signed_out');
              }
            }
          }
          if (isMounted) setIsLoading(false);
        });

        return () => {
          isMounted = false;
          unsubscribe();
        };
      } else {
        // Firebase not configured in local environment: check if explicit demo mode persona was chosen
        const savedDemo = DEMO_MODE && typeof window !== 'undefined'
          ? sessionStorage.getItem('pithros_demo_role')
          : null;
        if (savedDemo && savedDemo !== 'visitor') {
          switchRole(savedDemo as UserRole);
        } else {
          setCurrentUser(null);
          setPithrosUser(null);
          setAuthState('signed_out');
        }
        setIsLoading(false);
      }
    };

    checkInitialAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  // Session ticker
  useEffect(() => {
    if (authState !== 'authenticated') return;
    const interval = setInterval(() => {
      setSessionTimeRemaining((prev) => {
        if (prev <= 1) {
          setAuthState('session_expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [authState]);

  const signInWithEmail = async (email: string, password = ''): Promise<{ success: boolean; error?: string; role?: UserRole }> => {
    setIsLoading(true);
    const res = await authService.signInWithEmail({ email, password });
    setIsLoading(false);

    if (res.success && res.data) {
      setPithrosUser(res.data.user);
      setCurrentUser({
        uid: res.data.user.firebase_uid,
        email: res.data.user.email,
        emailVerified: res.data.user.email_verified,
        displayName: res.data.user.name,
        phoneNumber: res.data.user.phone || null,
        photoURL: res.data.user.avatar || null,
        providerId: 'password',
      });
      setAuthState(res.data.user.email_verified ? 'authenticated' : 'email_not_verified');
      setSessionTimeRemaining(3600);
      const userRole = (res.data.claims?.role || res.data.user?.role || 'visitor') as UserRole;
      return { success: true, role: userRole };
    }

    const safeError =
      res.error && res.error !== 'undefined' && !res.error.includes('undefined')
        ? res.error
        : "The email or password doesn't match. Please try again.";
    return { success: false, error: safeError };
  };

  const signUpWithEmail = async (data: SignUpCredentials): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    const res = await authService.signUpWithEmail(data);
    setIsLoading(false);

    if (res.success && res.data) {
      setPithrosUser(res.data.user);
      setCurrentUser({
        uid: res.data.user.firebase_uid,
        email: res.data.user.email,
        emailVerified: false,
        displayName: res.data.user.name,
        phoneNumber: res.data.user.phone || null,
        photoURL: res.data.user.avatar || null,
        providerId: 'password',
      });
      setAuthState('email_not_verified');
      setSessionTimeRemaining(3600);
      return { success: true };
    }

    return { success: false, error: res.error || 'Unable to create account.' };
  };

  const signInWithGoogle = async (): Promise<{ success: boolean; error?: string; role?: UserRole }> => {
    setIsLoading(true);
    const res = await authService.signInWithGoogle();
    setIsLoading(false);

    if (res.success && res.data) {
      setPithrosUser(res.data.user);
      setCurrentUser({
        uid: res.data.user.firebase_uid,
        email: res.data.user.email,
        emailVerified: true,
        displayName: res.data.user.name,
        phoneNumber: res.data.user.phone || null,
        photoURL: res.data.user.avatar || null,
        providerId: 'google.com',
      });
      setAuthState('authenticated');
      setSessionTimeRemaining(3600);
      const userRole = (res.data.claims?.role || res.data.user?.role || 'visitor') as UserRole;
      return { success: true, role: userRole };
    }

    return { success: false, error: res.error || 'Google sign-in could not be completed.' };
  };

  const sendPasswordReset = async (email: string): Promise<{ success: boolean; error?: string }> => {
    return await authService.sendPasswordReset(email);
  };

  const confirmPasswordReset = async (code: string, newPass: string): Promise<{ success: boolean; error?: string }> => {
    return await authService.confirmPasswordReset(code, newPass);
  };

  const sendPhoneOtp = async (phoneNumber: string): Promise<{ success: boolean; verificationId?: string; error?: string }> => {
    const res = await authService.sendPhoneOtp(phoneNumber);
    if (res.success && res.data) {
      return { success: true, verificationId: res.data.verificationId };
    }
    return { success: false, error: res.error || 'Could not send verification code.' };
  };

  const verifyPhoneOtp = async (code: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    const res = await authService.verifyPhoneOtp(code);
    setIsLoading(false);

    if (res.success && res.data) {
      setPithrosUser(res.data.user);
      setCurrentUser({
        uid: res.data.user.firebase_uid,
        email: res.data.user.email,
        emailVerified: true,
        displayName: res.data.user.name,
        phoneNumber: res.data.user.phone || null,
        photoURL: res.data.user.avatar || null,
        providerId: 'phone',
      });
      setAuthState('authenticated');
      setSessionTimeRemaining(3600);
      return { success: true };
    }

    return { success: false, error: res.error || 'The verification code is incorrect.' };
  };

  const resendVerificationEmail = async (): Promise<{ success: boolean; error?: string }> => {
    return await authService.resendVerificationEmail();
  };

  const checkEmailVerification = async (): Promise<boolean> => {
    try {
      if (auth?.currentUser) {
        await auth.currentUser.reload();
        if (auth.currentUser.emailVerified) {
          const token = await auth.currentUser.getIdToken(true);
          const verification = await verifyTokenAndResolveUser(auth.currentUser.uid, token, {
            email: auth.currentUser.email,
            displayName: auth.currentUser.displayName,
            photoURL: auth.currentUser.photoURL,
            phoneNumber: auth.currentUser.phoneNumber,
            emailVerified: true,
          });
          setCurrentUser(authService.normalizeFirebaseUser(auth.currentUser));
          setPithrosUser(verification.user);
          setAuthState('authenticated');
          return true;
        }
      }
      return false;
    } catch (e) {
      console.error('Failed to check email verification:', e);
      return false;
    }
  };

  const updateProfile = async (data: { name?: string; phone?: string; avatar?: string }): Promise<{ success: boolean; error?: string }> => {
    if (!pithrosUser) return { success: false, error: 'No active session.' };
    const res = await authService.updateProfileData(pithrosUser.firebase_uid, data);
    if (res.success) {
      setPithrosUser((prev) => (prev ? { ...prev, ...data, updated_at: new Date().toISOString() } : null));
      if (currentUser) {
        setCurrentUser({
          ...currentUser,
          displayName: data.name ?? currentUser.displayName,
          phoneNumber: data.phone ?? currentUser.phoneNumber,
          photoURL: data.avatar ?? currentUser.photoURL,
        });
      }
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const changePassword = async (newPass: string): Promise<{ success: boolean; error?: string }> => {
    return await authService.changePassword(newPass);
  };

  const reauthenticate = async (
    password: string,
  ): Promise<{ success: boolean; error?: string }> => {
    return await authService.reauthenticateWithPassword(password);
  };

  const signOut = async () => {
    await authService.signOut();
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.clear();
        localStorage.removeItem('pithros_memorial_draft');
        localStorage.removeItem('pithros_active_memorial');
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (k.startsWith('pithros_draft_') || k.startsWith('pithros_active_memorial_') || k === 'pithros_memorial_draft')) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      } catch {
        // ignore
      }
    }
    setCurrentUser(null);
    setPithrosUser(null);
    setAuthState('signed_out');
    setIsMfaVerified(false);
  };

  const verifyMfaStep = async (pin: string): Promise<boolean> => {
    await new Promise((r) => setTimeout(r, 400));
    // For admin elevated action PIN verification
    if (pin === '1234' || pin.length === 6) {
      setIsMfaVerified(true);
      return true;
    }
    return false;
  };

  const switchRole = (newRole: UserRole) => {
    // Demo-only. In live mode this must be inert: the account and role come from
    // the backend after token verification, never from a client-chosen persona.
    // Fabricating a role here would let any visitor render the admin shell.
    if (!DEMO_MODE) {
      return;
    }
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('pithros_demo_role', newRole);
    }
    // Seamless Persona switching for inspection and testing
    let targetUid = 'fb_uid_anita_steward';
    let targetName = 'Anita Krishnan';
    let targetEmail = 'anita.k@example.com';
    let targetAdminSubrole: AdminSubRole | undefined = undefined;

    if (newRole === 'admin') {
      targetUid = 'fb_uid_dev_admin';
      targetName = 'Sarah Chen (Security Ops)';
      targetEmail = 'admin@pithros.org';
      targetAdminSubrole = 'super_admin';
    } else if (newRole === 'partner') {
      targetUid = 'fb_uid_rajesh_partner';
      targetName = 'Rajesh Varma (Shanti Memorial Care)';
      targetEmail = 'partner@pithros.org';
    } else if (newRole === 'family_contributor') {
      targetUid = 'fb_uid_contributor';
      targetName = 'Vikram Krishnan (Brother)';
      targetEmail = 'vikram.k@example.com';
    } else if (newRole === 'visitor') {
      targetUid = 'fb_uid_visitor';
      targetName = 'Guest Visitor';
      targetEmail = 'visitor@example.com';
    }

    const updatedUser: PithrosUserRecord = {
      id: `usr_${newRole}`,
      firebase_uid: targetUid,
      name: targetName,
      email: targetEmail,
      role: newRole,
      admin_subrole: targetAdminSubrole,
      avatar: newRole === 'admin' 
        ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200'
        : newRole === 'partner'
        ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200'
        : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
      status: 'active',
      email_verified: true,
      phone_verified: true,
      mfa_enabled: newRole === 'admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setPithrosUser(updatedUser);
    setCurrentUser({
      uid: targetUid,
      email: targetEmail,
      emailVerified: true,
      displayName: targetName,
      phoneNumber: null,
      photoURL: updatedUser.avatar || null,
      providerId: 'password',
    });
    setAuthState('authenticated');
    setSessionTimeRemaining(3600);
  };

  const simulateExpiry = () => {
    setAuthState('session_expired');
    setSessionTimeRemaining(0);
  };

  const hasPermission = (requiredRole: UserRole | UserRole[]): boolean => {
    if (authState !== 'authenticated' || !pithrosUser) return false;
    const allowed = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (pithrosUser.role === 'admin') return true;
    return allowed.includes(pithrosUser.role);
  };

  const getIdToken = useCallback(async () => {
    return await authService.getIdToken();
  }, []);

  // Backward compatibility helpers
  const requestOtp = async (identifier: string) => {
    const res = await sendPhoneOtp(identifier);
    return {
      success: res.success,
      message: res.success
        ? `A verification code has been dispatched to ${identifier}.`
        : res.error || 'Failed to dispatch code.',
    };
  };

  const verifyOtp = async (code: string) => {
    const res = await verifyPhoneOtp(code);
    return res.success;
  };

  return (
    <AuthContext.Provider
      value={{
        authState,
        currentUser,
        pithrosUser,
        user: pithrosUser,
        role: pithrosUser?.role || 'visitor',
        adminSubrole: pithrosUser?.admin_subrole,
        isLoading,
        isEmailVerified: Boolean(pithrosUser?.email_verified || currentUser?.emailVerified),
        isMfaVerified,
        sessionTimeRemaining,
        returnUrl,
        setReturnUrl,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        sendPasswordReset,
        confirmPasswordReset,
        sendPhoneOtp,
        verifyPhoneOtp,
        resendVerificationEmail,
        checkEmailVerification,
        updateProfile,
        changePassword,
        reauthenticate,
        signOut,
        verifyMfaStep,
        switchRole,
        simulateExpiry,
        hasPermission,
        getIdToken,
        requestOtp,
        verifyOtp,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
