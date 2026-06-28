const API = 'http://localhost:3000/api';
const email = 'linh.nh237455@sis.hust.edu.vn';
const password = 'Linh@2024';

async function j(url, opts) {
  const r = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts });
  let d; try { d = await r.json(); } catch { d = {}; }
  return { status: r.status, d };
}

let tok;
let res = await j(`${API}/auth/register`, { method:'POST', body: JSON.stringify({ email, password }) });
if (res.status === 201) { tok = res.d.accessToken; console.log('registered'); }
else {
  const lg = await j(`${API}/auth/login`, { method:'POST', body: JSON.stringify({ email, password }) });
  tok = lg.d.accessToken; console.log('logged in', lg.status);
}

const auth = { Authorization: `Bearer ${tok}`, 'Content-Type':'application/json' };
// clear existing to avoid dup clutter
const cur = await j(`${API}/accounts`, { headers: auth });
for (const a of (cur.d.accounts||[])) {
  await j(`${API}/accounts/${a.id}`, { method:'DELETE', headers: auth });
}
const accts = [
  { issuer:'GitHub',    accountName:'linh.nh237455', secret:'JBSWY3DPEHPK3PXP' },
  { issuer:'Google',    accountName:'linh.nh237455@gmail.com', secret:'KRSXG5CTMVRXEZLU' },
  { issuer:'Microsoft', accountName:'20237455@sis.hust.edu.vn', secret:'NB2W45DFOIZA====' },
  { issuer:'Facebook',  accountName:'huu.linh', secret:'MFRGGZDFMZTWQ2LK' },
  { issuer:'Amazon AWS',accountName:'linh-dev', secret:'GEZDGNBVGY3TQOJQ' },
  { issuer:'Dropbox',   accountName:'linh.nh', secret:'ONSWG4TFOQ======' },
];
for (const a of accts) {
  const r = await j(`${API}/accounts`, { method:'POST', headers: auth, body: JSON.stringify(a) });
  console.log('add', a.issuer, r.status);
}
console.log('TOKEN', tok);
// also seed a demo user with 2FA for demo-app screenshots
let dr = await j(`${API}/demo/register`, { method:'POST', body: JSON.stringify({ email:'demo.user@sis.hust.edu.vn', password:'Demo@2024' }) });
let userId = dr.d.userId;
if (!userId) { // already exists -> login
  const dl = await j(`${API}/demo/login`, { method:'POST', body: JSON.stringify({ email:'demo.user@sis.hust.edu.vn', password:'Demo@2024' }) });
  userId = dl.d.userId;
}
const s2 = await j(`${API}/demo/setup-2fa`, { method:'POST', body: JSON.stringify({ userId, email:'demo.user@sis.hust.edu.vn' }) });
console.log('demo 2fa', s2.status, 'secret', s2.d.secret);
