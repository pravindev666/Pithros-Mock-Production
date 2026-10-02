/**
 * Pithros Authentication Error Normalizer
 * Maps raw Firebase and network error codes to respectful, human-centric copy.
 * Raw internal codes are never exposed to bereaved families or visitors.
 */

export function mapAuthError(error: unknown): string {
  if (!error) return 'An unexpected error occurred. Please try again.';

  let raw = '';
  if (typeof error === 'string') {
    raw = error;
  } else if (typeof error === 'object' && error !== null) {
    const errObj = error as { code?: unknown; message?: unknown };
    if (typeof errObj.code === 'string' && errObj.code) {
      raw = errObj.code;
    } else if (typeof errObj.message === 'string' && errObj.message) {
      raw = errObj.message;
    } else {
      raw = String(error);
    }
  } else if (error instanceof Error) {
    raw = error.message;
  }

  const normalized = raw.toLowerCase();

  // Invalid credentials & user lookup
  if (
    normalized.includes('invalid-credential') ||
    normalized.includes('wrong-password') ||
    normalized.includes('user-not-found') ||
    normalized.includes('invalid-login-credentials') ||
    normalized.includes('invalid_password') ||
    normalized.includes('email_not_found')
  ) {
    return "The email or password doesn't match. Please try again.";
  }

  // Email format & duplicate checks
  if (normalized.includes('invalid-email') || normalized.includes('invalid_email')) {
    return 'Enter a valid email address.';
  }
  if (normalized.includes('email-already-in-use') || normalized.includes('email_exists')) {
    return 'An account already exists with this email address. Please sign in instead.';
  }

  // Password strength
  if (normalized.includes('weak-password')) {
    return 'Please choose a stronger password with at least 8 characters.';
  }

  // Account disabled / rate limit
  if (normalized.includes('user-disabled')) {
    return 'This account is currently unavailable. Please reach out to Pithros Care support.';
  }
  if (normalized.includes('too-many-requests')) {
    return 'For security, sign-in is temporarily limited. Please try again later.';
  }

  // Popups & browser
  if (normalized.includes('popup-blocked')) {
    return 'Your browser blocked the Google sign-in window. Please allow popups and try again.';
  }
  if (normalized.includes('popup-closed') || normalized.includes('cancelled-popup')) {
    return 'Google sign-in was closed before completion. Please try again.';
  }

  // Network & connections
  if (normalized.includes('network') || normalized.includes('timeout') || normalized.includes('failed to fetch')) {
    return "We couldn't reach Pithros. Check your connection and retry.";
  }

  // Auth session & tokens
  if (normalized.includes('requires-recent-login')) {
    return 'For security, please sign in again before updating these account settings.';
  }

  // Verification codes
  if (normalized.includes('invalid-verification') || normalized.includes('code-expired')) {
    return 'The verification code entered is incorrect or has expired. Please check and re-enter.';
  }

  // Phone auth
  if (normalized.includes('invalid-phone')) {
    return 'Please provide a valid phone number with your country code.';
  }

  // OAuth domain
  if (normalized.includes('unauthorized-domain')) {
    return 'This domain is not yet authorized for OAuth. Please use Email/Password.';
  }

  return 'Unable to complete this action right now. Please try again in a moment.';
}

