import admin from 'firebase-admin';

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;

if (serviceAccountJson) {
  try {
    const serviceAccount = JSON.parse(serviceAccountJson);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('[Firebase] Initialized with service account');
  } catch (err) {
    console.error('[Firebase] Failed to parse FIREBASE_SERVICE_ACCOUNT:', err);
    admin.initializeApp();
    console.log('[Firebase] Initialized with default credentials (fallback)');
  }
} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  admin.initializeApp();
  console.log('[Firebase] Initialized with GOOGLE_APPLICATION_CREDENTIALS');
} else {
  console.warn('[Firebase] No credentials configured — Firebase token verification will fail');
  try {
    admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID || 'blockus-dev' });
  } catch { /* already initialized */ }
}

export default admin;
