import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const DATA_ALGO = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV is the value recommended for AES-GCM
const KEY_LENGTH = 32; // 256-bit keys
const VERSION = 'v2';

/**
 * Read the server master key (Key Encryption Key root) from the environment.
 * @returns {Buffer} 32-byte master key
 */
function getMasterKey() {
  const key = process.env.MASTER_KEY;
  if (!key) {
    throw new Error('MASTER_KEY is not set in environment variables');
  }
  const buf = Buffer.from(key, 'hex');
  if (buf.length !== KEY_LENGTH) {
    throw new Error('MASTER_KEY must be 32 bytes (64 hex characters)');
  }
  return buf;
}

/**
 * Derive a per-user Key Encryption Key (KEK) from the server master key using
 * HKDF-SHA256, binding the salt to the user id. Each user therefore gets an
 * independent key: a single derived key never protects more than one user's
 * data, and the master key can be rotated by re-wrapping data keys only.
 * @param {number|string} userId
 * @returns {Buffer} 32-byte per-user KEK
 */
function deriveUserKek(userId) {
  const salt = Buffer.from(`user:${userId}`, 'utf8');
  const info = Buffer.from('otp-secret-kek-v2', 'utf8');
  return Buffer.from(crypto.hkdfSync('sha256', getMasterKey(), salt, info, KEY_LENGTH));
}

function gcmEncrypt(key, plaintextBuf) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(DATA_ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(plaintextBuf), cipher.final()]);
  return { iv, tag: cipher.getAuthTag(), ct };
}

function gcmDecrypt(key, iv, tag, ct) {
  const decipher = crypto.createDecipheriv(DATA_ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]);
}

const b64 = (buf) => buf.toString('base64');
const fromB64 = (s) => Buffer.from(s, 'base64');

/**
 * Envelope-encrypt a plaintext for a specific user.
 *
 * A fresh random Data Encryption Key (DEK) protects the plaintext under
 * AES-256-GCM; the DEK is then wrapped under the user's KEK (also AES-256-GCM).
 * Only the wrapped DEK and the ciphertext are stored, never the DEK itself.
 *
 * @param {string} plaintext - text to encrypt
 * @param {number|string} userId - owner of the data (drives key derivation)
 * @returns {string} v2:wrapIv:wrapTag:wrappedDek:dataIv:dataTag:ciphertext (base64)
 */
export function encrypt(plaintext, userId) {
  if (userId === undefined || userId === null) {
    throw new Error('encrypt() requires a userId for per-user key derivation');
  }
  const dek = crypto.randomBytes(KEY_LENGTH);
  const data = gcmEncrypt(dek, Buffer.from(String(plaintext), 'utf8'));
  const wrap = gcmEncrypt(deriveUserKek(userId), dek);
  return [
    VERSION,
    b64(wrap.iv), b64(wrap.tag), b64(wrap.ct),
    b64(data.iv), b64(data.tag), b64(data.ct),
  ].join(':');
}

/**
 * Decrypt data produced by encrypt(). Transparently handles the legacy v1
 * format (iv:authTag:ciphertext encrypted directly under the master key) so
 * records written before the envelope upgrade remain readable.
 *
 * @param {string} encryptedData
 * @param {number|string} userId - required for v2 (per-user) records
 * @returns {string} decrypted plaintext
 */
export function decrypt(encryptedData, userId) {
  const parts = encryptedData.split(':');

  if (parts[0] === VERSION) {
    if (userId === undefined || userId === null) {
      throw new Error('decrypt() requires a userId for v2 records');
    }
    const [, wIv, wTag, wDek, dIv, dTag, ct] = parts;
    const dek = gcmDecrypt(deriveUserKek(userId), fromB64(wIv), fromB64(wTag), fromB64(wDek));
    return gcmDecrypt(dek, fromB64(dIv), fromB64(dTag), fromB64(ct)).toString('utf8');
  }

  // Legacy v1: AES-256-GCM directly under the shared master key.
  const [ivB64, tagB64, ct] = parts;
  return gcmDecrypt(getMasterKey(), fromB64(ivB64), fromB64(tagB64), fromB64(ct)).toString('utf8');
}

/**
 * Generate a cryptographically secure random secret for OTP.
 * @param {number} length - Length of the secret in bytes (default 20 for SHA1)
 * @returns {string} Base32-encoded secret
 */
export function generateSecret(length = 20) {
  const bytes = crypto.randomBytes(length);
  return base32Encode(bytes);
}

/**
 * Base32 encode a buffer (RFC 4648).
 * @param {Buffer} buffer
 * @returns {string}
 */
function base32Encode(buffer) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let result = '';
  let bits = 0;
  let value = 0;

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      result += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    result += alphabet[(value << (5 - bits)) & 31];
  }

  return result;
}
