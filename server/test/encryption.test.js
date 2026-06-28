import { describe, test, expect } from '@jest/globals';
import crypto from 'crypto';

// Set a dummy MASTER_KEY before importing encryption module
if (!process.env.MASTER_KEY) {
  process.env.MASTER_KEY = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2';
}

import { encrypt, decrypt, generateSecret } from '../src/utils/encryption.js';

const USER_A = 1;
const USER_B = 2;

/** Reproduce the legacy v1 format (single master key) to test backward compat. */
function legacyEncrypt(plaintext) {
  const key = Buffer.from(process.env.MASTER_KEY, 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let enc = cipher.update(plaintext, 'utf8', 'base64');
  enc += cipher.final('base64');
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${tag.toString('base64')}:${enc}`;
}

describe('Encryption Module (envelope, per-user key)', () => {
  describe('encrypt() and decrypt() roundtrip', () => {
    test('should encrypt and decrypt a simple string', () => {
      const plaintext = 'hello world';
      expect(decrypt(encrypt(plaintext, USER_A), USER_A)).toBe(plaintext);
    });

    test('should encrypt and decrypt an email address', () => {
      const plaintext = 'user@example.com';
      expect(decrypt(encrypt(plaintext, USER_A), USER_A)).toBe(plaintext);
    });

    test('should encrypt and decrypt a long base32 secret', () => {
      const plaintext = 'JBSWY3DPEHPK3PXP';
      expect(decrypt(encrypt(plaintext, USER_A), USER_A)).toBe(plaintext);
    });

    test('should encrypt and decrypt empty string', () => {
      expect(decrypt(encrypt('', USER_A), USER_A)).toBe('');
    });

    test('should encrypt and decrypt special characters', () => {
      const plaintext = 'test!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
      expect(decrypt(encrypt(plaintext, USER_A), USER_A)).toBe(plaintext);
    });

    test('should produce the v2 envelope format', () => {
      const enc = encrypt('data', USER_A);
      expect(enc.startsWith('v2:')).toBe(true);
      expect(enc.split(':').length).toBe(7);
    });

    test('two encryptions of the same plaintext differ (random DEK/IV)', () => {
      expect(encrypt('same', USER_A)).not.toBe(encrypt('same', USER_A));
    });
  });

  describe('per-user key separation', () => {
    test("a user cannot decrypt another user's data", () => {
      const enc = encrypt('top secret', USER_A);
      expect(() => decrypt(enc, USER_B)).toThrow();
    });

    test('requires a userId to encrypt', () => {
      expect(() => encrypt('x')).toThrow();
    });
  });

  describe('backward compatibility with legacy v1 records', () => {
    test('decrypts a v1 record stored under the master key', () => {
      const v1 = legacyEncrypt('legacy-secret');
      expect(decrypt(v1)).toBe('legacy-secret');
    });
  });

  describe('decrypt() with tampered ciphertext', () => {
    test('should throw when the data ciphertext is modified', () => {
      const parts = encrypt('secret data', USER_A).split(':');
      const ct = parts[6];
      parts[6] = ct
        .split('')
        .map((c, i) => (i === 0 ? String.fromCharCode(c.charCodeAt(0) ^ 1) : c))
        .join('');
      expect(() => decrypt(parts.join(':'), USER_A)).toThrow();
    });

    test('should throw when the wrapped-DEK tag is modified', () => {
      const parts = encrypt('secret data', USER_A).split(':');
      const tag = parts[2];
      parts[2] = tag
        .split('')
        .map((c, i) => (i === 0 ? String.fromCharCode(c.charCodeAt(0) ^ 1) : c))
        .join('');
      expect(() => decrypt(parts.join(':'), USER_A)).toThrow();
    });
  });

  describe('generateSecret()', () => {
    test('should generate a base32 string with default length', () => {
      const secret = generateSecret();
      expect(typeof secret).toBe('string');
      expect(secret.length).toBeGreaterThan(0);
      expect(/^[A-Z2-7]+$/.test(secret)).toBe(true);
    });

    test('should generate a base32 string with custom length', () => {
      const secret = generateSecret(32);
      expect(/^[A-Z2-7]+$/.test(secret)).toBe(true);
    });

    test('should generate different secrets on each call', () => {
      expect(generateSecret()).not.toBe(generateSecret());
    });

    test('should generate secrets with reasonable length (base32 of 20 bytes ~32 chars)', () => {
      const secret = generateSecret(20);
      expect(secret.length).toBeGreaterThanOrEqual(30);
      expect(secret.length).toBeLessThanOrEqual(34);
    });
  });
});
