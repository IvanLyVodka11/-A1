// Show that OTP secrets are stored as AES-256-GCM ciphertext, not plaintext.
import Database from '../server/node_modules/better-sqlite3/lib/index.js';
const db = new Database('../server/data/authenticator.db', { readonly: true });
const rows = db.prepare("SELECT issuer, account_name, encrypted_secret FROM otp_accounts ORDER BY id DESC LIMIT 4").all();
for (const r of rows) {
  const parts = r.encrypted_secret.split(':');
  console.log(`${r.issuer.padEnd(12)} | iv=${parts[0]} tag=${parts[1]} ct=${parts[2].slice(0,24)}...`);
}
const zk = db.prepare("SELECT u.email, z.public_key FROM zk_credentials z JOIN users u ON u.id=z.user_id ORDER BY z.id DESC LIMIT 2").all();
console.log('--- zk_credentials (only PUBLIC keys stored) ---');
for (const z of zk) console.log(`${z.email} -> pub ${z.public_key.slice(0,20)}... (${z.public_key.length/2}B)`);
console.log('--- schema check: no plaintext password/secret columns ---');
const cols = db.prepare("PRAGMA table_info(otp_accounts)").all().map(c=>c.name);
console.log('otp_accounts columns:', cols.join(', '));
db.close();
