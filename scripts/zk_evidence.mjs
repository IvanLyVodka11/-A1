// Measure real ZK numbers + capture network payloads proving no secret leaks.
import { secp256k1 } from '../server/node_modules/@noble/curves/secp256k1.js';
import { createHash, randomBytes } from 'crypto';
const Point = secp256k1.Point, G = Point.BASE, n = Point.Fn.ORDER;
const API = 'http://localhost:3000/api/zk';

function hashToScalar(...parts){const d=createHash('sha256').update(parts.join(''),'utf8').digest();let a=0n;for(const b of d)a=(a<<8n)|BigInt(b);return a%n;}
function randScalar(){while(true){let v=0n;for(const b of randomBytes(32))v=(v<<8n)|BigInt(b);v%=n;if(v>0n)return v;}}
const email='linh.nh237455@sis.hust.edu.vn';

// enroll
const x=randScalar(); const P=G.multiply(x); const publicKey=P.toHex();
let r=await fetch(`${API}/register`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,publicKey})});
console.log('enroll:',r.status, JSON.stringify(await r.json()));

// challenge
r=await fetch(`${API}/challenge`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});
const {challenge}=await r.json();
console.log('challenge (32B nonce):', challenge);

// prove
const t0=process.hrtime.bigint();
const k=randScalar(); const R=G.multiply(k); const Rhex=R.toHex();
const e=hashToScalar(publicKey,Rhex,challenge);
const s=((k+e*x)%n+n)%n;
const proof={R:Rhex,s:s.toString(16).padStart(64,'0')};
const t1=process.hrtime.bigint();
const proveMs=Number(t1-t0)/1e6;

// verify (real)
const vt0=process.hrtime.bigint();
r=await fetch(`${API}/verify`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,proof})});
const vres=await r.json();
const vt1=process.hrtime.bigint();
console.log('verify(valid):',r.status, JSON.stringify(vres), `round-trip ${(Number(vt1-vt0)/1e6).toFixed(2)}ms`);

// payload sizes
const verifyBody=JSON.stringify({email,proof});
console.log('--- NUMBERS ---');
console.log('publicKey hex bytes:', publicKey.length, '(', publicKey.length/2, 'bytes, compressed point)');
console.log('proof.R hex:', proof.R.length/2, 'bytes; proof.s hex:', proof.s.length/2, 'bytes');
console.log('verify request body bytes:', Buffer.byteLength(verifyBody));
console.log('prove time (client crypto):', proveMs.toFixed(3), 'ms');

// tamper test: flip last hex of s
r=await fetch(`${API}/challenge`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});
const c2=(await r.json()).challenge;
const k2=randScalar(),R2=G.multiply(k2).toHex();
const e2=hashToScalar(publicKey,R2,c2); const s2=((k2+e2*x)%n+n)%n;
let bad=s2.toString(16).padStart(64,'0'); bad=bad.slice(0,-1)+(bad.slice(-1)==='0'?'1':'0');
r=await fetch(`${API}/verify`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,proof:{R:R2,s:bad}})});
console.log('verify(tampered s):',r.status, JSON.stringify(await r.json()));

// replay test: reuse a consumed challenge proof
r=await fetch(`${API}/challenge`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});
const c3=(await r.json()).challenge;
const k3=randScalar(),R3=G.multiply(k3).toHex();
const e3=hashToScalar(publicKey,R3,c3); const s3=((k3+e3*x)%n+n)%n;
const p3={R:R3,s:s3.toString(16).padStart(64,'0')};
let rr=await fetch(`${API}/verify`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,proof:p3})});
console.log('verify(replay #1):',rr.status,(await rr.json()).verified);
rr=await fetch(`${API}/verify`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,proof:p3})});
console.log('verify(replay #2 same proof):',rr.status, JSON.stringify(await rr.json()));
