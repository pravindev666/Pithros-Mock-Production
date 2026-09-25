/**
 * Pithros Authentication Error Normalizer
 * Maps raw Firebase and network error codes to respectful, human-centric copy.
 * Raw internal codes are never exposed to bereaved families or visitors.
 */

export function mapAuthError(error: unknown): string {
  if (!error) return 'An unexpected error occurred. Please try again.';

  let errorCode = '';
  if (typeof error === 'string') {
    errorCode = error;
  } else if (typeof error === 'object' && error !== null && 'code' in error) {
    errorCode = String((error as { code: string }).code);
  } else if (error instanceof Error) {
    errorCode = error.message;
  }

  // Firebase Auth Error Code mappings
  switch (errorCode) {
    case 'auth/invalid-email':
    case 'auth/invalid-email-verified':
      return 'Enter a valid email address.';

    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return "The email or password doesn't match. Please try again.";

    case 'auth/email-already-in-use':
      return 'An account already exists with this email address. Please sign in instead.';

    case 'auth/weak-password':
      return 'Please choose a stronger password with at least 8 characters.';

    case 'auth/user-disabled':
      return 'This account is currently unavailable. Please reach out to Pithros Care support.';

    case 'auth/too-many-requests':
      return 'For security, sign-in is temporarily limited. Please try again later.';

    case 'auth/popup-blocked':
      return 'Your browser blocked the Google sign-in window. Please allow popups and try again.';

    case 'auth/popup-closed-by-user':
      return 'Google sign-in was closed before completion. Please try again.';

    case 'auth/cancelled-popup-request':
      return 'Sign-in window was closed. Please try again.';

    case 'auth/network-request-failed':
      return "We couldn't reach Pithros. Check your connection and retry.";

    case 'auth/requires-recent-login':
      return 'For security, please sign in again before updating these account settings.';

    case 'auth/invalid-verification-code':
    case 'auth/invalid-verification-id':
      return 'The verification code entered is incorrect or has expired. Please check and re-enter.';

    case 'auth/code-expired':
      return 'This verification code has expired. Please request a new code.';

    case 'auth/captcha-check-failed':
      return 'Security verification could not be completed. Please try again.';

    case 'auth/invalid-phone-number':
      return 'Please provide a valid phone number with your country code.';

    case 'auth/quota-exceeded':
      return 'SMS verification limit reached for now. Please sign in with email or try later.';

    case 'auth/unauthorized-domain':
      return 'This domain is not yet authorized for OAuth. Please use Email/Password.';

    default:
      if (errorCode.toLowerCase().includes('network')) {
        return "We couldn't reach Pithros. Check your connection and retry.";
      }
      if (errorCode.toLowerCase().includes('popup')) {
        return 'The sign-in window was closed. Please try again.';
      }
      return 'Unable to complete this action right now. Please try again in a moment.';
  }
}
