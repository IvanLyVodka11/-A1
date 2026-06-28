/**
 * keepass.js — kdbxweb wrapper for KeePass .kdbx integration.
 *
 * SECURITY: The master password and kdbx file bytes are processed exclusively
 * in-browser memory. They are NEVER sent over the network, stored in
 * localStorage, sessionStorage, IndexedDB, or any other persistent medium.
 * Plaintext passwords extracted from entries live only in React component
 * state and are discarded when the component unmounts.
 */

import * as kdbxwebNS from 'kdbxweb';

// kdbxweb ships a single UMD bundle. Bundlers (Vite) expose its exports on the
// namespace directly, while Node's ESM↔CJS interop nests them under `.default`.
// Normalize so the same code works in the browser and under Node test runners.
const kdbxweb = kdbxwebNS.default ?? kdbxwebNS;

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Extract a plain-string field value from a KdbxEntry fields Map.
 * ProtectedValue fields (like Password) are decrypted via .getText().
 */
function fieldText(entry, key) {
  const val = entry.fields.get(key);
  if (val == null) return '';
  if (typeof val === 'string') return val;
  // ProtectedValue
  if (typeof val.getText === 'function') return val.getText();
  return String(val);
}

/**
 * Recursively collect all entries from a group and its sub-groups.
 */
function collectEntries(group, out = []) {
  for (const entry of group.entries) {
    out.push(entry);
  }
  for (const sub of group.groups) {
    collectEntries(sub, out);
  }
  return out;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Load a .kdbx file from an ArrayBuffer using the given master password.
 * Throws a descriptive Error on wrong password or corrupt file.
 *
 * @param {ArrayBuffer} arrayBuffer
 * @param {string} masterPassword
 * @returns {Promise<{ db: import('kdbxweb').Kdbx }>}
 */
export async function loadKdbx(arrayBuffer, masterPassword) {
  const credentials = new kdbxweb.KdbxCredentials(
    kdbxweb.ProtectedValue.fromString(masterPassword)
  );
  try {
    const db = await kdbxweb.Kdbx.load(arrayBuffer, credentials);
    return { db };
  } catch (err) {
    // kdbxweb throws KdbxError with code 'InvalidKey' on wrong password
    if (err && err.code === 'InvalidKey') {
      throw new Error('Wrong master password — please try again.');
    }
    if (err && err.code === 'NotImplemented') {
      throw new Error(
        'This database uses Argon2 key derivation which requires a native helper. ' +
          'Please re-save the database using AES-KDF in KeePassXC (Database → Database Settings → Security → Key Derivation → AES-KDF).'
      );
    }
    throw new Error(`Failed to open database: ${err?.message ?? String(err)}`);
  }
}

/**
 * List all entries across all groups, returning plain-object snapshots.
 * Password is decrypted to a plain string for in-memory display only.
 *
 * @param {import('kdbxweb').Kdbx} db
 * @returns {Array<{title:string, username:string, password:string, url:string, notes:string, otpUri:string|null}>}
 */
export function listEntries(db) {
  const root = db.getDefaultGroup();
  const rawEntries = collectEntries(root);

  return rawEntries.map((entry) => {
    const otpRaw = fieldText(entry, 'otp');
    return {
      title: fieldText(entry, 'Title'),
      username: fieldText(entry, 'UserName'),
      password: fieldText(entry, 'Password'),
      url: fieldText(entry, 'URL'),
      notes: fieldText(entry, 'Notes'),
      otpUri: otpRaw || null,
    };
  });
}

/**
 * Parse an otpauth:// URI into its components.
 * Returns null for invalid or non-TOTP URIs.
 *
 * @param {string|null} uri
 * @returns {{secret:string, issuer:string, accountName:string, algorithm:string, digits:number, period:number}|null}
 */
export function parseOtpUri(uri) {
  if (!uri) return null;
  try {
    const url = new URL(uri);
    if (url.protocol !== 'otpauth:') return null;
    if (url.host !== 'totp') return null; // only TOTP for now

    const params = url.searchParams;
    const secret = params.get('secret');
    if (!secret) return null;

    // Label is the pathname (URL-decoded, may contain issuer:account)
    const label = decodeURIComponent(url.pathname.replace(/^\//, ''));
    let issuer = params.get('issuer') || '';
    let accountName = label;
    if (label.includes(':')) {
      const parts = label.split(':', 2);
      if (!issuer) issuer = parts[0].trim();
      accountName = parts[1].trim();
    }

    return {
      secret,
      issuer,
      accountName,
      algorithm: params.get('algorithm') || 'SHA1',
      digits: parseInt(params.get('digits') || '6', 10),
      period: parseInt(params.get('period') || '30', 10),
    };
  } catch {
    return null;
  }
}

/**
 * Create a new in-memory .kdbx database from a list of entries and serialize
 * it to an ArrayBuffer using AES-KDF (works in all browsers without external
 * Argon2 WASM; the resulting file opens in KeePassXC).
 *
 * @param {string} masterPassword
 * @param {Array<{title:string, username:string, password:string, url?:string, notes?:string, otpUri?:string}>} entries
 * @returns {Promise<ArrayBuffer>}
 */
export async function buildKdbx(masterPassword, entries = []) {
  const credentials = new kdbxweb.KdbxCredentials(
    kdbxweb.ProtectedValue.fromString(masterPassword)
  );

  const db = kdbxweb.Kdbx.create(credentials, 'KeePass Export');

  // Switch to AES-KDF so no external Argon2 implementation is needed.
  db.setKdf(kdbxweb.Consts.KdfId.Aes);

  const group = db.getDefaultGroup();

  for (const e of entries) {
    const entry = db.createEntry(group);
    entry.fields.set('Title', e.title || '');
    entry.fields.set('UserName', e.username || '');
    entry.fields.set(
      'Password',
      kdbxweb.ProtectedValue.fromString(e.password || '')
    );
    entry.fields.set('URL', e.url || '');
    entry.fields.set('Notes', e.notes || '');
    if (e.otpUri) {
      entry.fields.set('otp', e.otpUri);
    }
  }

  return db.save();
}

/**
 * Trigger a browser file download for the given ArrayBuffer as a .kdbx file.
 *
 * @param {ArrayBuffer} arrayBuffer
 * @param {string} filename
 */
export function saveKdbxToFile(arrayBuffer, filename = 'export.kdbx') {
  const blob = new Blob([arrayBuffer], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke after a tick so the download has time to start
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
