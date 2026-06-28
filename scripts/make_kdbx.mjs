// Build a sample .kdbx (AES-KDF) with a few entries incl. a TOTP one,
// using the app's own kdbxweb so the format matches exactly.
import * as ns from '../authenticator-app/node_modules/kdbxweb/dist/kdbxweb.js';
import { writeFileSync } from 'fs';
const kdbxweb = ns.default ?? ns;

const cred = new kdbxweb.KdbxCredentials(kdbxweb.ProtectedValue.fromString('Linh@2024'));
const db = kdbxweb.Kdbx.create(cred, 'Linh Vault');
db.setKdf(kdbxweb.Consts.KdfId.Aes);
const g = db.getDefaultGroup();
const data = [
  ['GitHub','linh.nh237455','gh_P@ssw0rd_2024!','https://github.com','otpauth://totp/GitHub:linh.nh237455?secret=JBSWY3DPEHPK3PXP&issuer=GitHub'],
  ['Gmail','linh.nh237455@gmail.com','Em@il_S3cret#88','https://google.com',''],
  ['HUST eHUST','20237455','Hust!2023_Linh','https://ehust.hust.edu.vn',''],
  ['VPBank','linh.nh','Bank$ecure_991','https://vpbank.com.vn',''],
];
for (const [t,u,p,url,otp] of data) {
  const e = db.createEntry(g);
  e.fields.set('Title', t);
  e.fields.set('UserName', u);
  e.fields.set('Password', kdbxweb.ProtectedValue.fromString(p));
  e.fields.set('URL', url);
  if (otp) e.fields.set('otp', otp);
}
const buf = await db.save();
writeFileSync('../docs/evidence/raw/sample-vault.kdbx', Buffer.from(buf));
console.log('wrote sample-vault.kdbx', buf.byteLength, 'bytes');
