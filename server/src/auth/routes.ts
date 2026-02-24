import { Router } from 'express';
import { sendVerificationCode } from './sendEmail';

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
  } catch (err: any) {
    if (err.message === 'TOO_FREQUENT') {
      res.status(429).json({ success: false, error: 'TOO_FREQUENT' });
      return;
    }
    console.error('[Auth] send-code error:', err);
    res.status(500).json({ success: false, error: 'SEND_FAILED' });
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

export default router;
