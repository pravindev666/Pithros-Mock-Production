import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';

/**
 * Firebase Configuration for Pithros Web
 * Loaded securely from environment variables.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'demo-pithros-api-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'pithros-sanctuary.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'pithros-sanctuary',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'pithros-sanctuary.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1029384756',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:1029384756:web:abcdef123456',
};

export const isFirebaseConfigured = Boolean(
  import.meta.env.VITE_FIREBASE_API_KEY &&
  import.meta.env.VITE_FIREBASE_API_KEY !== 'demo-pithros-api-key' &&
  import.meta.env.VITE_FIREBASE_PROJECT_ID
);

let app: FirebaseApp;
let auth: Auth;

try {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
} catch (error) {
  console.warn('Firebase initialization notice:', error);
  // Re-attempt or fallback initialization
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig, 'pithros-fallback');
  auth = getAuth(app);
}

export { app, auth };
export default app;
