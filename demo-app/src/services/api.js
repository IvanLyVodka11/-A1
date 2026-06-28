const API_BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000') + '/api/demo';

/**
 * API client for the Demo 2FA app.
 */
export async function demoRegister(email, password) {
  const res = await fetch(`${API_BASE}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
}

export async function demoSetup2FA(userId, email) {
  const res = await fetch(`${API_BASE}/setup-2fa`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, email }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
}

export async function demoLogin(email, password) {
  const res = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
}

export async function demoVerifyOTP(userId, otpCode) {
  const res = await fetch(`${API_BASE}/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, otpCode }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.message);
  return data;
}
