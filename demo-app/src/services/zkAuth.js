/**
 * Client-side ZK (Schnorr NIZK) authentication helpers.
 * Uses @noble/curves secp256k1 + browser crypto.subtle SHA-256.
 * The secret key NEVER leaves this device.
 */

import { secp256k1 } from '@noble/curves/secp256k1.js';

const Point = secp256k1.Point;
const G = Point.BASE;
const n = Point.Fn.ORDER;

const API = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000') + '/api/zk';

// ──────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────

/**
 * Generate a cryptographically random scalar in [1, n-1].
 * @returns {bigint}
 */
function randomScalar() {
  while (true) {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    let val = 0n;
    for (const b of bytes) val = (val << 8n) | BigInt(b);
    val = val % n;
    if (val > 0n) return val;
  }
}

/**
 * Compute SHA-256 of the UTF-8 concatenation of hex strings, reduce mod n.
 * Matches server hashToScalar byte-for-byte.
 * @param {...string} hexParts
 * @returns {Promise<bigint>}
 */
async function hashToScalar(...hexParts) {
  const data = hexParts.join('');
  const encoded = new TextEncoder().encode(data);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  const bytes = new Uint8Array(digest);
  let acc = 0n;
  for (const b of bytes) acc = (acc << 8n) | BigInt(b);
  return acc % n;
}

/**
 * Build a Schnorr proof for secret x against a server challenge.
 * @param {bigint} x - secret scalar
 * @param {string} publicKeyHex - compressed hex of G·x
 * @param {string} challengeHex - 64-char hex nonce from server
 * @returns {Promise<{ R: string, s: string }>}
 */
async function prove(x, publicKeyHex, challengeHex) {
  const k = randomScalar();
  const R = G.multiply(k);
  const R_hex = R.toHex();

  const e = await hashToScalar(publicKeyHex, R_hex, challengeHex);
  // s = (k + e·x) mod n
  const s = ((k + e * x) % n + n) % n;

  return { R: R_hex, s: s.toString(16).padStart(64, '0') };
}

// ──────────────────────────────────────────────────
// LocalStorage key-value for secret
// ──────────────────────────────────────────────────

export function getStoredSecret(email) {
  return localStorage.getItem(`zk_secret_${email}`);
}

export function storeSecret(email, hex) {
  localStorage.setItem(`zk_secret_${email}`, hex);
}

// ──────────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────────

/**
 * Enroll this device for passwordless login for the given email.
 * Generates a fresh secret key, stores it locally, registers public key with server.
 * @param {string} email
 * @returns {Promise<{ message: string }>}
 */
export async function zkEnroll(email) {
  const x = randomScalar();
  const P = G.multiply(x);
  const publicKey = P.toHex();

  // Persist secret as hex string
  storeSecret(email, x.toString(16).padStart(64, '0'));

  const res = await fetch(`${API}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, publicKey }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Enrollment failed');
  return json;
}

/**
 * Perform a full ZK login: fetch challenge, prove, verify.
 * @param {string} email
 * @returns {Promise<{ id: number, email: string }>} authenticated user
 */
export async function zkLogin(email) {
  const secretHex = getStoredSecret(email);
  if (!secretHex) {
    throw new Error('No passwordless credential on this device');
  }
  const x = BigInt('0x' + secretHex);

  // 1. Get challenge
  const challengeRes = await fetch(`${API}/challenge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const { challenge, error: challengeErr } = await challengeRes.json();
  if (!challengeRes.ok) throw new Error(challengeErr || 'Failed to get challenge');

  // 2. Compute public key hex (re-derive from stored secret)
  const P = G.multiply(x);
  const publicKeyHex = P.toHex();

  // 3. Prove
  const proof = await prove(x, publicKeyHex, challenge);

  // 4. Verify on server
  const verifyRes = await fetch(`${API}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, proof }),
  });
  const verifyJson = await verifyRes.json();
  if (!verifyRes.ok || !verifyJson.verified) {
    throw new Error(verifyJson.error || 'ZK verification failed');
  }

  return verifyJson.user;
}
