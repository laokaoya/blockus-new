import { Router } from 'express';
import admin from '../firebaseAdmin';
import { sendVerificationCode } from './sendEmail';
import { isNicknameTaken, claimNickname } from './nicknameService';

const store = new Map<string, { code: string; expiresAt: number }>();
const SEND_COOLDOWN = new Map<string, number>();
const CODE_TTL_MS = 5 * 60 * 1000;
const COOLDOWN_MS = 60 * 1000;

function createCode(email: string): string {
  const normalized = email.trim().toLowerCase();
  const now = Date.now();
  if (SEND_COOLDOWN.get(normalized) && (SEND_COOLDOWN.get(normalized)! + COOLDOWN_MS) > now) {
    throw new Error('TOO_FREQUENT');
  }
  const code = String(Math.floor(100000 + Math.random() * 900000));
  store.set(normalized, { code, expiresAt: now + CODE_TTL_MS });
  SEND_COOLDOWN.set(normalized, now);
  return code;
}

function verifyCode(email: string, code: string): boolean {
  const normalized = email.trim().toLowerCase();
  const entry = store.get(normalized);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    store.delete(normalized);
    return false;
  }
  if (entry.code !== code) return false;
  store.delete(normalized);
  return true;
}

const router = Router();

router.post('/send-code', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      res.status(400).json({ success: false, error: 'EMAIL_REQUIRED' });
      return;
    }
    const normalized = email.trim().toLowerCase();
    if (!/\S+@\S+\.\S+/.test(normalized)) {
      res.status(400).json({ success: false, error: 'EMAIL_INVALID' });
      return;
    }
    const code = createCode(normalized);
    await sendVerificationCode(normalized, code);
    res.json({ success: true });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'TOO_FREQUENT') {
      res.status(429).json({ success: false, error: 'TOO_FREQUENT' });
      return;
    }
    console.error('[Auth] send-code error:', err);
    const msg = err instanceof Error ? err.message : 'SEND_FAILED';
    // 将 Resend 常见错误转为用户可理解的错误码
    const userError = msg.includes('domain') || msg.includes('Domain')
      ? 'DOMAIN_NOT_VERIFIED'
      : msg.includes('rate') || msg.includes('limit')
        ? 'RATE_LIMIT'
        : 'SEND_FAILED';
    res.status(500).json({ success: false, error: userError, detail: process.env.NODE_ENV === 'development' ? msg : undefined });
  }
});

// 验证验证码
router.post('/verify-code', (req, res) => {
  const { email, code } = req.body;
  if (!email || !code || typeof email !== 'string' || typeof code !== 'string') {
    res.status(400).json({ success: false, valid: false });
    return;
  }
  const valid = verifyCode(email, code);
  res.json({ success: true, valid });
});

// 检查昵称是否已被占用
router.post('/check-nickname', async (req, res) => {
  try {
    const { nickname } = req.body;
    if (!nickname || typeof nickname !== 'string') {
      res.status(400).json({ success: false, available: false, error: 'NICKNAME_REQUIRED' });
      return;
    }
    const trimmed = nickname.trim().substring(0, 20);
    if (trimmed.length < 1) {
      res.status(400).json({ success: false, available: false, error: 'NICKNAME_REQUIRED' });
      return;
    }
    const taken = await isNicknameTaken(trimmed);
    res.json({ success: true, available: !taken });
  } catch (err) {
    console.error('[Auth] check-nickname error:', err);
    res.status(500).json({ success: false, available: false, error: 'CHECK_FAILED' });
  }
});

// 服务端注册：验证码 + 昵称重名检测 + 创建 Firebase 用户
router.post('/register', async (req, res) => {
  try {
    const { email, password, nickname, code } = req.body;
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const trimmedNickname = typeof nickname === 'string' ? nickname.trim().substring(0, 20) : '';

    if (!normalizedEmail || !/\S+@\S+\.\S+/.test(normalizedEmail)) {
      res.status(400).json({ success: false, error: 'EMAIL_INVALID' });
      return;
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      res.status(400).json({ success: false, error: 'PASSWORD_TOO_SHORT' });
      return;
    }
    if (!trimmedNickname || trimmedNickname.length < 1) {
      res.status(400).json({ success: false, error: 'NICKNAME_REQUIRED' });
      return;
    }
    if (!code || typeof code !== 'string') {
      res.status(400).json({ success: false, error: 'CODE_REQUIRED' });
      return;
    }

    if (!verifyCode(normalizedEmail, code.trim())) {
      res.status(400).json({ success: false, error: 'CODE_INVALID' });
      return;
    }

    const taken = await isNicknameTaken(trimmedNickname);
    if (taken) {
      res.status(409).json({ success: false, error: 'NICKNAME_TAKEN' });
      return;
    }

    const userRecord = await admin.auth().createUser({
      email: normalizedEmail,
      password,
      displayName: trimmedNickname,
    });

    await claimNickname(trimmedNickname, userRecord.uid);
    console.log(`[Auth] Registered: ${trimmedNickname} (${userRecord.uid})`);
    res.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('email-already-in-use') || (err as { code?: string })?.code === 'auth/email-already-in-use') {
      res.status(409).json({ success: false, error: 'EMAIL_ALREADY_IN_USE' });
      return;
    }
    console.error('[Auth] register error:', err);
    res.status(500).json({ success: false, error: 'REGISTER_FAILED' });
  }
});

export default router;
