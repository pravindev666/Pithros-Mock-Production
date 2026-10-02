import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  confirmPasswordReset,
  sendEmailVerification,
  signOut as firebaseSignOut,
  updatePassword,
  updateProfile,
  EmailAuthProvider,
  reauthenticateWithCredential,
  User as FirebaseUser,
  RecaptchaVerifier,
  ConfirmationResult,
  signInWithPhoneNumber,
} from 'firebase/auth';
import { auth, googleAuthProvider, isFirebaseConfigured } from './firebase';
import { mapAuthError } from './authErrors';
import {
  SignInCredentials,
  SignUpCredentials,
  AuthResponse,
  AuthSessionUser,
  BackendTokenVerificationResponse,
} from './authTypes';
import { verifyTokenAndResolveUser, updatePithrosUserRecord } from './pithrosUserStore';

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    confirmationResult?: ConfirmationResult;
  }
}

class AuthService {
  private activeConfirmationResult: ConfirmationResult | null = null;
  private pendingPhoneOtpCode: string | null = null;

  /**
   * Helper to normalize a Firebase User object
   */
  public normalizeFirebaseUser(fbUser: FirebaseUser | null): AuthSessionUser | null {
    if (!fbUser) return null;
    return {
      uid: fbUser.uid,
      email: fbUser.email,
      emailVerified: fbUser.emailVerified,
      displayName: fbUser.displayName,
      phoneNumber: fbUser.phoneNumber,
      photoURL: fbUser.photoURL,
      providerId: fbUser.providerData[0]?.providerId || 'password',
    };
  }

  /**
   * Obtain the cryptographically signed Firebase ID token
   */
  public async getIdToken(forceRefresh = false): Promise<string> {
    if (auth.currentUser) {
      try {
        return await auth.currentUser.getIdToken(forceRefresh);
      } catch (e) {
        console.warn('Failed to obtain Firebase ID token', e);
      }
    }
    // Return simulated token if running preview fallback
    return `pithros_jwt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Sign In With Email & Password
   */
  public async signInWithEmail(
    credentials: SignInCredentials
  ): Promise<AuthResponse<BackendTokenVerificationResponse>> {
    try {
      if (isFirebaseConfigured) {
        const userCredential = await signInWithEmailAndPassword(
          auth,
          credentials.email.trim(),
          credentials.password
        );
        const token = await userCredential.user.getIdToken();
        const verification = await verifyTokenAndResolveUser(
          userCredential.user.uid,
          token,
          {
            email: userCredential.user.email,
            displayName: userCredential.user.displayName,
            photoURL: userCredential.user.photoURL,
            emailVerified: userCredential.user.emailVerified,
          }
        );
        return { success: true, data: verification };
      } else {
        // Safe preview fallback when Firebase credentials are not yet configured in env
        await new Promise((r) => setTimeout(r, 450));
        const simUid = `fb_uid_${credentials.email.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const simToken = `pithros_jwt_${Date.now()}`;
        const verification = await verifyTokenAndResolveUser(simUid, simToken, {
          email: credentials.email,
          displayName: credentials.email.split('@')[0],
          emailVerified: true,
        });
        return { success: true, data: verification };
      }
    } catch (error) {
      return {
        success: false,
        error: mapAuthError(error),
      };
    }
  }

  /**
   * Sign Up With Email & Password
   */
  public async signUpWithEmail(
    data: SignUpCredentials
  ): Promise<AuthResponse<BackendTokenVerificationResponse>> {
    try {
      if (!data.agreeTerms) {
        return {
          success: false,
          error: 'Please agree to the Terms of Service and Privacy Policy to create your account.',
        };
      }

      if (isFirebaseConfigured) {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          data.email.trim(),
          data.password
        );

        // Update profile with display name
        await updateProfile(userCredential.user, {
          displayName: data.fullName.trim(),
        });

        // Send Email Verification
        try {
          await sendEmailVerification(userCredential.user);
        } catch (verifyErr) {
          console.warn('Initial email verification dispatch warning:', verifyErr);
        }

        const token = await userCredential.user.getIdToken();
        const verification = await verifyTokenAndResolveUser(
          userCredential.user.uid,
          token,
          {
            email: userCredential.user.email,
            displayName: data.fullName,
            phoneNumber: data.phone,
            emailVerified: false,
            role: data.role,
          }
        );

        return { success: true, data: verification };
      } else {
        // Safe preview fallback
        await new Promise((r) => setTimeout(r, 600));
        const simUid = `fb_uid_${data.email.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const simToken = `pithros_jwt_${Date.now()}`;
        const verification = await verifyTokenAndResolveUser(simUid, simToken, {
          email: data.email,
          displayName: data.fullName,
          phoneNumber: data.phone,
          emailVerified: false,
          role: data.role,
        });
        return { success: true, data: verification };
      }
    } catch (error) {
      return {
        success: false,
        error: mapAuthError(error),
      };
    }
  }

  /**
   * Sign In With Google Popup
   */
  public async signInWithGoogle(): Promise<AuthResponse<BackendTokenVerificationResponse>> {
    try {
      if (isFirebaseConfigured) {
        const userCredential = await signInWithPopup(auth, googleAuthProvider);
        const token = await userCredential.user.getIdToken();
        const verification = await verifyTokenAndResolveUser(
          userCredential.user.uid,
          token,
          {
            email: userCredential.user.email,
            displayName: userCredential.user.displayName,
            photoURL: userCredential.user.photoURL,
            emailVerified: userCredential.user.emailVerified,
          }
        );
        return { success: true, data: verification };
      } else {
        // Graceful fallback for browser preview environment
        await new Promise((r) => setTimeout(r, 650));
        const simUid = 'fb_uid_google_visitor_preview';
        const simToken = `pithros_jwt_google_${Date.now()}`;
        const verification = await verifyTokenAndResolveUser(simUid, simToken, {
          email: 'steward.family@gmail.com',
          displayName: 'Pithros Family Member',
          photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
          emailVerified: true,
        });
        return { success: true, data: verification };
      }
    } catch (error) {
      return {
        success: false,
        error: mapAuthError(error),
      };
    }
  }

  /**
   * Send Password Reset Email
   */
  public async sendPasswordReset(email: string): Promise<AuthResponse<void>> {
    try {
      if (isFirebaseConfigured) {
        await sendPasswordResetEmail(auth, email.trim());
      } else {
        await new Promise((r) => setTimeout(r, 500));
      }
      return { success: true };
    } catch (error) {
      // Neutral response to avoid account enumeration
      console.warn('Password reset issue:', error);
      return { success: true };
    }
  }

  /**
   * Confirm Password Reset with oobCode
   */
  public async confirmPasswordReset(code: string, newPass: string): Promise<AuthResponse<void>> {
    try {
      if (isFirebaseConfigured) {
        await confirmPasswordReset(auth, code, newPass);
      } else {
        await new Promise((r) => setTimeout(r, 600));
      }
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: mapAuthError(error),
      };
    }
  }

  /**
   * Resend Email Verification
   */
  public async resendVerificationEmail(): Promise<AuthResponse<void>> {
    try {
      if (auth.currentUser && isFirebaseConfigured) {
        await sendEmailVerification(auth.currentUser);
      } else {
        await new Promise((r) => setTimeout(r, 400));
      }
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: mapAuthError(error),
      };
    }
  }

  /**
   * Send Phone OTP
   */
  public async sendPhoneOtp(
    fullPhoneNumber: string,
    recaptchaContainerId = 'recaptcha-container'
  ): Promise<AuthResponse<{ verificationId: string }>> {
    try {
      if (isFirebaseConfigured && typeof window !== 'undefined') {
        let appVerifier = window.recaptchaVerifier;
        if (!appVerifier) {
          appVerifier = new RecaptchaVerifier(auth, recaptchaContainerId, {
            size: 'invisible',
            callback: () => {
              // recaptcha solved
            },
          });
          window.recaptchaVerifier = appVerifier;
        }

        const confirmationResult = await signInWithPhoneNumber(auth, fullPhoneNumber, appVerifier);
        this.activeConfirmationResult = confirmationResult;
        return {
          success: true,
          data: { verificationId: confirmationResult.verificationId },
        };
      } else {
        // Fallback for preview
        await new Promise((r) => setTimeout(r, 500));
        this.pendingPhoneOtpCode = '882046'; // Predictable preview code
        return {
          success: true,
          data: { verificationId: `verif_${Date.now()}` },
        };
      }
    } catch (error) {
      return {
        success: false,
        error: mapAuthError(error),
      };
    }
  }

  /**
   * Verify Phone OTP
   */
  public async verifyPhoneOtp(
    code: string
  ): Promise<AuthResponse<BackendTokenVerificationResponse>> {
    try {
      if (this.activeConfirmationResult && isFirebaseConfigured) {
        const userCredential = await this.activeConfirmationResult.confirm(code);
        const token = await userCredential.user.getIdToken();
        const verification = await verifyTokenAndResolveUser(
          userCredential.user.uid,
          token,
          {
            phoneNumber: userCredential.user.phoneNumber,
            displayName: 'Phone Verified Steward',
          }
        );
        return { success: true, data: verification };
      } else {
        // Preview fallback verification
        await new Promise((r) => setTimeout(r, 500));
        if (code === this.pendingPhoneOtpCode || code.length === 6 || code === '123456') {
          const simUid = 'fb_uid_phone_verified_user';
          const simToken = `pithros_jwt_phone_${Date.now()}`;
          const verification = await verifyTokenAndResolveUser(simUid, simToken, {
            phoneNumber: '+91 98450 11223',
            displayName: 'Anita Krishnan',
            emailVerified: true,
          });
          return { success: true, data: verification };
        } else {
          return {
            success: false,
            error: 'The verification code entered is incorrect or has expired. Please check and re-enter.',
          };
        }
      }
    } catch (error) {
      return {
        success: false,
        error: mapAuthError(error),
      };
    }
  }

  /**
   * Update User Profile
   */
  public async updateProfileData(
    firebaseUid: string,
    data: { name?: string; phone?: string; avatar?: string }
  ): Promise<AuthResponse<void>> {
    try {
      if (auth.currentUser && isFirebaseConfigured) {
        if (data.name || data.avatar) {
          await updateProfile(auth.currentUser, {
            displayName: data.name,
            photoURL: data.avatar,
          });
        }
      }
      await updatePithrosUserRecord(firebaseUid, {
        name: data.name,
        phone: data.phone,
        avatar: data.avatar,
      });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: mapAuthError(error),
      };
    }
  }

  /**
   * Re-authenticate with the current password.
   *
   * Required before sensitive self-service actions: Firebase refreshes the token
   * `auth_time` on a real re-authentication, not on a token refresh, and the
   * backend only accepts account deletion within a short window of that.
   */
  public async reauthenticateWithPassword(password: string): Promise<AuthResponse<void>> {
    try {
      if (auth.currentUser && isFirebaseConfigured) {
        const email = auth.currentUser.email;
        if (!email) {
          return { success: false, error: 'This account has no password sign-in method.' };
        }
        await reauthenticateWithCredential(
          auth.currentUser,
          EmailAuthProvider.credential(email, password),
        );
        return { success: true };
      }
      return { success: false, error: 'Re-authentication is unavailable in demo mode.' };
    } catch (error) {
      return { success: false, error: mapAuthError(error) };
    }
  }

  /**
   * Change Password
   */
  public async changePassword(newPass: string): Promise<AuthResponse<void>> {
    try {
      if (auth.currentUser && isFirebaseConfigured) {
        await updatePassword(auth.currentUser, newPass);
        return { success: true };
      }
      await new Promise((r) => setTimeout(r, 400));
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: mapAuthError(error),
      };
    }
  }

  /**
   * Sign Out
   */
  public async signOut(): Promise<void> {
    try {
      if (isFirebaseConfigured && auth.currentUser) {
        await firebaseSignOut(auth);
      }
    } catch (err) {
      console.warn('Firebase signout notification:', err);
    }
  }
}

export const authService = new AuthService();
