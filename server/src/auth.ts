import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { TokenPayload } from './types';

const JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === 'production') {
    console.warn('[Auth] WARNING: JWT_SECRET not set! Using random secret (tokens will invalidate on restart)');
    return crypto.randomBytes(32).toString('hex');
  }
  return 'blockus-dev-secret-key';
})();
const TOKEN_EXPIRY = '7d';

// 生成 JWT token
export function generateToken(nickname: string, avatar?: string): { token: string; userId: string } {
  const userId = `user_${uuidv4()}`;
  const payload: TokenPayload = {
    userId,
    nickname,
    avatar,
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
  return { token, userId };
}

// 验证 JWT token
export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return decoded;
  } catch {
    return null;
  }
}

// 从 token 中提取用户信息（不验证过期）
export function decodeToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.decode(token) as TokenPayload;
    return decoded;
  } catch {
    return null;
  }
}
