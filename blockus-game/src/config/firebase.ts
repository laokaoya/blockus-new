import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || 'AIzaSyAGDWi69WxmT6zAh9Qtz0Znt5MsCv5KvBA',
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || 'blockus-14f38.firebaseapp.com',
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || 'blockus-14f38',
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || 'blockus-14f38.firebasestorage.app',
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || '525740834899',
  appId: process.env.REACT_APP_FIREBASE_APP_ID || '1:525740834899:web:46183287357e96a8c306a6',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
