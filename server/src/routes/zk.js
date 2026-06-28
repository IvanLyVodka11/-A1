import { Router } from 'express';
import { randomBytes } from 'crypto';
import { getDb } from '../database.js';
import { verifyProof } from '../utils/schnorr.js';

const router = Router();

// In-memory challenge store: email -> { challenge: string, expires: number }
const challengeStore = new Map();

/**
 * POST /api/zk/register
 * Enroll (or re-enroll) a ZK credential for an existing user.
 * Body: { email, publicKey }
 */
router.post('/register', (req, res) => {
  try {
    const { email, publicKey } = req.body;

    if (!email || !publicKey) {
      return res.status(400).json({ error: 'email and publicKey are required' });
    }

    const db = getDb();
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Upsert: replace existing credential for this user
    db.prepare(`
      INSERT INTO zk_credentials (user_id, public_key)
      VALUES (?, ?)
      ON CONFLICT(user_id) DO UPDATE SET public_key = excluded.public_key, created_at = CURRENT_TIMESTAMP
    `).run(user.id, publicKey);

    res.json({ message: 'ZK credential enrolled successfully' });
  } catch (err) {
    console.error('ZK register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/zk/challenge
 * Issue a one-time 32-byte hex nonce for the given email.
 * Body: { email }
 */
router.post('/challenge', (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'email is required' });
    }

    const db = getDb();
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const cred = db.prepare('SELECT public_key FROM zk_credentials WHERE user_id = ?').get(user.id);
    if (!cred) {
      return res.status(400).json({ error: 'No ZK credential enrolled' });
    }

    const challenge = randomBytes(32).toString('hex');
    challengeStore.set(email, { challenge, expires: Date.now() + 120_000 });

    res.json({ challenge });
  } catch (err) {
    console.error('ZK challenge error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/zk/verify
 * Verify a Schnorr proof and return the authenticated user.
 * Body: { email, proof: { R: string, s: string } }
 */
router.post('/verify', (req, res) => {
  try {
    const { email, proof } = req.body;

    if (!email || !proof) {
      return res.status(400).json({ error: 'email and proof are required' });
    }

    // Look up and immediately consume the challenge (one-time use)
    const stored = challengeStore.get(email);
    if (!stored) {
      return res.status(401).json({ verified: false, error: 'No active challenge. Request a new one.' });
    }
    if (Date.now() > stored.expires) {
      challengeStore.delete(email);
      return res.status(401).json({ verified: false, error: 'Challenge expired. Request a new one.' });
    }
    const { challenge } = stored;
    challengeStore.delete(email); // one-time use

    const db = getDb();
    const user = db.prepare('SELECT id, email FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const cred = db.prepare('SELECT public_key FROM zk_credentials WHERE user_id = ?').get(user.id);
    if (!cred) {
      return res.status(400).json({ error: 'No ZK credential enrolled' });
    }

    const ok = verifyProof({ publicKey: cred.public_key, challenge, proof });
    if (!ok) {
      return res.status(401).json({ verified: false, error: 'Invalid proof' });
    }

    res.json({ verified: true, user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error('ZK verify error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
