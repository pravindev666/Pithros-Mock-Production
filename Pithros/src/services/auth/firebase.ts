import {
  GoogleAuthProvider,
  browserLocalPersistence,
  setPersistence,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../../lib/firebase';

// Configure Google Auth Provider
export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.addScope('email');
googleAuthProvider.addScope('profile');
googleAuthProvider.setCustomParameters({
  prompt: 'select_account',
});

// Configure Local Persistence
if (auth) {
  setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.warn('Firebase persistence warning:', err);
  });
}

export { auth, isFirebaseConfigured };
