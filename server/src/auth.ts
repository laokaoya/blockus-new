import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { TokenPayload } from './types';
import admin from './firebaseAdmin';

const JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === 'production') {
    console.warn('[Auth] WARNING: JWT_SECRET not set! Using random secret (tokens will invalidate on restart)');
    return crypto.randomBytes(32).toString('hex');
  }
  return 'blockus-dev-secret-key';
})();
const TOKEN_EXPIRY = '7d';

// Generate a local JWT (for guest users or after Firebase verification)
export function generateToken(nickname: string, avatar?: string): { token: string; userId: string } {
  const userId = `user_${uuidv4()}`;
  const payload: TokenPayload = { userId, nickname, avatar };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
  return { token, userId };
}

// Generate a local JWT for a known Firebase user (keeps a stable userId)
export function generateTokenForFirebaseUser(uid: string, nickname: string, avatar?: string): { token: string; userId: string } {
  const userId = `fb_${uid}`;
  const payload: TokenPayload = { userId, nickname, avatar };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
  return { token, userId };
}

// Verify a local JWT
export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

// Verify a Firebase ID token and return the decoded token
export async function verifyFirebaseToken(idToken: string): Promise<admin.auth.DecodedIdToken | null> {
  try {
    return await admin.auth().verifyIdToken(idToken);
  } catch (err) {
    console.warn('[Auth] Firebase token verification failed:', (err as Error).message);
    return null;
  }
}

export function decodeToken(token: string): TokenPayload | null {
  try {
    return jwt.decode(token) as TokenPayload;
  } catch {
    return null;
  }
}
