const API_BASE = process.env.REACT_APP_SERVER_URL || (
  process.env.NODE_ENV === 'production' ? window.location.origin : 'http://localhost:3001'
);

export async function checkNickname(nickname: string): Promise<{ success: boolean; available: boolean; error?: string }> {
  const res = await fetch(`${API_BASE}/api/auth/check-nickname`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname: nickname.trim().substring(0, 20) }),
  });
  const data = await res.json();
  return {
    success: !!data.success,
    available: !!data.available,
    error: data.error,
  };
}

export async function registerWithServer(
  email: string,
  password: string,
  nickname: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      password,
      nickname: nickname.trim().substring(0, 20),
      code: code.trim(),
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    return { success: false, error: data.error || 'REGISTER_FAILED' };
  }
  return { success: true };
}

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
