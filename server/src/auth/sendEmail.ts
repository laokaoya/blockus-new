import nodemailer from 'nodemailer';
import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || 'Blockus <noreply@blockus.game>';
const RESEND_FROM = process.env.RESEND_FROM || 'Blockus <onboarding@resend.dev>';

let transporter: nodemailer.Transporter | null = null;
let resendClient: Resend | null = null;

function getResend(): Resend | null {
  if (resendClient) return resendClient;
  if (RESEND_API_KEY) {
    resendClient = new Resend(RESEND_API_KEY);
    return resendClient;
  }
  return null;
}

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;
  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
    return transporter;
  }
  return null;
}

export async function sendVerificationCode(to: string, code: string): Promise<void> {
  const resend = getResend();
  if (resend) {
    const { error } = await resend.emails.send({
      from: RESEND_FROM,
      to,
      subject: '[Blockus] 邮箱验证码',
      html: `<p>您的验证码是：<strong>${code}</strong>，5分钟内有效。</p>`,
    });
    if (error) {
      console.error('[Auth] Resend error:', error);
      throw new Error('SEND_FAILED');
    }
    return;
  }

  const trans = getTransporter();
  if (trans) {
    await trans.sendMail({
      from: SMTP_FROM,
      to,
      subject: '[Blockus] 邮箱验证码',
      text: `您的验证码是：${code}，5分钟内有效。`,
      html: `<p>您的验证码是：<strong>${code}</strong>，5分钟内有效。</p>`,
    });
  } else {
    console.log(`[Auth] 验证码 (${to}): ${code}`);
  }
}
