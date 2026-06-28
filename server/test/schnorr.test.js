import { describe, test, expect } from '@jest/globals';
import { verifyProof, hashToScalar } from '../src/utils/schnorr.js';
import { secp256k1 } from '@noble/curves/secp256k1.js';

const Point = secp256k1.Point;
const G = Point.BASE;
const n = Point.Fn.ORDER;

/**
 * Reference prover: builds a Schnorr NIZK proof of knowledge of `x` (where
 * P = x·G) for the given challenge, mirroring the browser client.
 *   R = k·G,  e = H(P_hex || R_hex || challenge),  s = k + e·x  (mod n)
 */
function prove(x, k, challenge) {
  const P = G.multiply(x);
  const R = G.multiply(k);
  const pHex = P.toHex();
  const rHex = R.toHex();
  const e = hashToScalar(pHex, rHex, challenge);
  const s = ((k % n) + (e * (x % n))) % n;
  return { publicKey: pHex, challenge, proof: { R: rHex, s: s.toString(16) } };
}

const X = 123456789012345678901234567890n;
const K = 987654321098765432109876543210n;
const CHALLENGE =
  'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90';

describe('Schnorr NIZK verification', () => {
  describe('hashToScalar()', () => {
    test('is deterministic for the same inputs', () => {
      expect(hashToScalar('a', 'b', 'c')).toBe(hashToScalar('a', 'b', 'c'));
    });

    test('depends on input order (not just concatenation collisions)', () => {
      expect(hashToScalar('ab', 'c')).not.toBe(hashToScalar('a', 'bc') + 1n);
      expect(hashToScalar('a', 'b')).not.toBe(hashToScalar('b', 'a'));
    });

    test('returns a scalar reduced mod n', () => {
      const e = hashToScalar(CHALLENGE, CHALLENGE);
      expect(e).toBeGreaterThanOrEqual(0n);
      expect(e).toBeLessThan(n);
    });
  });

  describe('verifyProof()', () => {
    test('accepts a valid proof', () => {
      expect(verifyProof(prove(X, K, CHALLENGE))).toBe(true);
    });

    test('accepts valid proofs for independently chosen keys/nonces', () => {
      const proof = prove(
        555555555555555555555555555555n,
        111111111111111111111111111111n,
        'deadbeef'.repeat(8)
      );
      expect(verifyProof(proof)).toBe(true);
    });

    test('rejects a proof replayed against a different challenge', () => {
      const good = prove(X, K, CHALLENGE);
      const replayed = { ...good, challenge: CHALLENGE.replace(/^a/, 'b') };
      expect(verifyProof(replayed)).toBe(false);
    });

    test('rejects a proof with a tampered s', () => {
      const good = prove(X, K, CHALLENGE);
      const s = (BigInt('0x' + good.proof.s) ^ 1n).toString(16);
      expect(verifyProof({ ...good, proof: { R: good.proof.R, s } })).toBe(false);
    });

    test('rejects a proof whose public key does not match the secret', () => {
      const good = prove(X, K, CHALLENGE);
      const otherP = G.multiply(X + 1n).toHex();
      expect(verifyProof({ ...good, publicKey: otherP })).toBe(false);
    });

    test('rejects s outside [1, n-1]', () => {
      const good = prove(X, K, CHALLENGE);
      expect(verifyProof({ ...good, proof: { R: good.proof.R, s: '0' } })).toBe(false);
      expect(
        verifyProof({ ...good, proof: { R: good.proof.R, s: n.toString(16) } })
      ).toBe(false);
    });

    test('returns false (never throws) on malformed input', () => {
      expect(verifyProof({ publicKey: 'zz', challenge: CHALLENGE, proof: { R: 'zz', s: 'zz' } })).toBe(false);
      expect(verifyProof({ publicKey: prove(X, K, CHALLENGE).publicKey })).toBe(false);
      expect(verifyProof({})).toBe(false);
      expect(verifyProof({ publicKey: 1, challenge: 2, proof: 3 })).toBe(false);
    });
  });
});
