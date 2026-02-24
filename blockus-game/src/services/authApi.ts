const API_BASE = process.env.REACT_APP_SERVER_URL || (
  process.env.NODE_ENV === 'production' ? window.location.origin : 'http://localhost:3001'
);

export async function sendVerificationCode(email: string): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${API_BASE}/api/auth/send-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  });
  const data = await res.json();
  if (!res.ok) {
    return { success: false, error: data.error || 'SEND_FAILED' };
  }
  return { success: true };
}

export async function verifyCode(email: string, code: string): Promise<{ success: boolean; valid: boolean }> {
  const res = await fetch(`${API_BASE}/api/auth/verify-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim().toLowerCase(), code: code.trim() }),
  });
  const data = await res.json();
  return { success: true, valid: !!data.valid };
}
