/**
 * Schnorr NIZK proof utilities (server-side, Node.js ESM).
 * secp256k1 via @noble/curves v2.2.0.
 * H = SHA-256(P_hex || R_hex || challenge_hex), big-endian, mod n.
 */

import { secp256k1 } from '@noble/curves/secp256k1.js';
import { createHash } from 'crypto';

const Point = secp256k1.Point;
const G = Point.BASE;
const n = Point.Fn.ORDER;

/**
 * Compute SHA-256 of the concatenated hex strings and reduce mod n.
 * Matches the client-side crypto.subtle implementation byte-for-byte.
 * @param {...string} hexParts - hex strings to concatenate (ASCII).
 * @returns {bigint}
 */
export function hashToScalar(...hexParts) {
  const data = hexParts.join('');
  const digest = createHash('sha256').update(data, 'utf8').digest();
  // Interpret as big-endian 256-bit integer, then mod n
  let acc = 0n;
  for (const byte of digest) {
    acc = (acc << 8n) | BigInt(byte);
  }
  return acc % n;
}

/**
 * Verify a Schnorr ZK proof.
 * Accepts: G·s == R + P·e, where e = H(P_hex || R_hex || challenge_hex).
 * @param {{ publicKey: string, challenge: string, proof: { R: string, s: string } }} params
 * @returns {boolean}
 */
export function verifyProof({ publicKey, challenge, proof }) {
  try {
    if (
      typeof publicKey !== 'string' ||
      typeof challenge !== 'string' ||
      !proof ||
      typeof proof.R !== 'string' ||
      typeof proof.s !== 'string'
    ) {
      return false;
    }

    const P = Point.fromHex(publicKey);
    const R = Point.fromHex(proof.R);
    const s = BigInt('0x' + proof.s);

    if (s <= 0n || s >= n) return false;

    const e = hashToScalar(publicKey, proof.R, challenge);

    // Verify: G·s == R + P·e
    const lhs = G.multiply(s);
    const rhs = R.add(P.multiply(e));

    return lhs.equals(rhs);
  } catch {
    return false;
  }
}
