// @vitest-environment node

/**
 * keepass.test.js — round-trip test for the KeePass service layer.
 *
 * Verifies that buildKdbx() produces a valid AES-KDF .kdbx file and that
 * loadKdbx() can decrypt and read it back with identical field values.
 *
 * Run:  npx vitest run src/services/keepass.test.js
 *
 * Environment: node — kdbxweb's UMD bundle uses Node's crypto here, which is a
 * faithful WebCrypto. (jsdom's partial typed-array/crypto polyfills break it.)
 * The service layer under test is pure crypto + parsing with no DOM access.
 */

import { describe, it, expect } from 'vitest';
import { buildKdbx, loadKdbx, listEntries, parseOtpUri } from './keepass.js';

const MASTER_PW = 'correct-horse-battery-staple';

const TEST_ENTRIES = [
  {
    title: 'Example Site',
    username: 'alice@example.com',
    password: 'hunter2',
    url: 'https://example.com',
    notes: 'Test notes here',
    otpUri: 'otpauth://totp/Example:alice@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Example&algorithm=SHA1&digits=6&period=30',
  },
  {
    title: 'Empty fields',
    username: '',
    password: '',
    url: '',
    notes: '',
    otpUri: null,
  },
];

describe('KeePass service — AES-KDF round-trip', () => {
  it('buildKdbx returns an ArrayBuffer', async () => {
    const ab = await buildKdbx(MASTER_PW, TEST_ENTRIES);
    expect(ab).toBeInstanceOf(ArrayBuffer);
    expect(ab.byteLength).toBeGreaterThan(0);
  });

  it('loadKdbx opens the generated file with the correct password', async () => {
    const ab = await buildKdbx(MASTER_PW, TEST_ENTRIES);
    const { db } = await loadKdbx(ab, MASTER_PW);
    expect(db).toBeDefined();
  });

  it('listEntries returns the correct number of entries', async () => {
    const ab = await buildKdbx(MASTER_PW, TEST_ENTRIES);
    const { db } = await loadKdbx(ab, MASTER_PW);
    const entries = listEntries(db);
    expect(entries.length).toBe(TEST_ENTRIES.length);
  });

  it('round-trip preserves all fields of first entry', async () => {
    const ab = await buildKdbx(MASTER_PW, TEST_ENTRIES);
    const { db } = await loadKdbx(ab, MASTER_PW);
    const entries = listEntries(db);
    const first = entries[0];

    expect(first.title).toBe(TEST_ENTRIES[0].title);
    expect(first.username).toBe(TEST_ENTRIES[0].username);
    expect(first.password).toBe(TEST_ENTRIES[0].password);
    expect(first.url).toBe(TEST_ENTRIES[0].url);
    expect(first.notes).toBe(TEST_ENTRIES[0].notes);
    expect(first.otpUri).toBe(TEST_ENTRIES[0].otpUri);
  });

  it('round-trip preserves empty fields', async () => {
    const ab = await buildKdbx(MASTER_PW, TEST_ENTRIES);
    const { db } = await loadKdbx(ab, MASTER_PW);
    const entries = listEntries(db);
    const empty = entries[1];

    expect(empty.title).toBe('Empty fields');
    expect(empty.username).toBe('');
    expect(empty.password).toBe('');
    expect(empty.url).toBe('');
    expect(empty.notes).toBe('');
    expect(empty.otpUri).toBeNull();
  });

  it('loadKdbx throws on wrong password', async () => {
    const ab = await buildKdbx(MASTER_PW, TEST_ENTRIES);
    await expect(loadKdbx(ab, 'wrong-password')).rejects.toThrow(/wrong master password/i);
  });
});

describe('parseOtpUri', () => {
  it('parses a standard otpauth URI', () => {
    const uri = 'otpauth://totp/Example:alice@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Example&algorithm=SHA1&digits=6&period=30';
    const result = parseOtpUri(uri);
    expect(result).not.toBeNull();
    expect(result.secret).toBe('JBSWY3DPEHPK3PXP');
    expect(result.issuer).toBe('Example');
    expect(result.accountName).toBe('alice@example.com');
    expect(result.digits).toBe(6);
    expect(result.period).toBe(30);
    expect(result.algorithm).toBe('SHA1');
  });

  it('returns null for null input', () => {
    expect(parseOtpUri(null)).toBeNull();
  });

  it('returns null for non-otpauth URI', () => {
    expect(parseOtpUri('https://example.com')).toBeNull();
  });

  it('returns null for hotp URI', () => {
    expect(parseOtpUri('otpauth://hotp/label?secret=ABC&counter=0')).toBeNull();
  });
});
