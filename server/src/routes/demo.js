import { Router } from 'express';
import { getDb } from '../database.js';
import { generateSecret, encrypt, decrypt } from '../utils/encryption.js';
import { generateOTPAuthURI, generateQRCode, verifyTOTP } from '../utils/otp.js';
import bcrypt from 'bcrypt';

const router = Router();

// In-memory anti-replay guard for demo OTP verification. A TOTP code stays valid
// for a whole time-step (±1 window for clock drift), so without tracking, a code
// observed by an attacker could be replayed until it expires. We record the
// absolute time-step that was accepted per user and reject any later submission
// that maps to the same step. Entries self-expire once the step's window closes.
// Note: process-local only — see report §3.6.8 for the residual (multi-process)
// limitation; a shared store (e.g. Redis) would be required when scaling out.
const usedOtpSteps = new Map(); // key `${userId}:${step}` -> expiry epoch ms

function isOtpStepUsed(userId, step) {
  const key = `${userId}:${step}`;
  const exp = usedOtpSteps.get(key);
  if (exp === undefined) return false;
  if (Date.now() > exp) { usedOtpSteps.delete(key); return false; }
  return true;
}

function markOtpStepUsed(userId, step, periodSec) {
  // keep until the accepted step plus one drift window has fully elapsed
  usedOtpSteps.set(`${userId}:${step}`, Date.now() + (periodSec * 2 + 5) * 1000);
  const now = Date.now();
  for (const [k, exp] of usedOtpSteps) if (now > exp) usedOtpSteps.delete(k);
}

/**
 * POST /api/demo/register
 * Register a demo user (simplified for demo purposes).
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)').run(email, passwordHash);

    res.status(201).json({
      message: 'Demo user registered',
      userId: result.lastInsertRowid,
    });
  } catch (err) {
    console.error('Demo register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/demo/setup-2fa
 * Generate a new OTP secret and QR code for a demo user to enable 2FA.
 */
router.post('/setup-2fa', async (req, res) => {
  try {
    const { userId, email } = req.body;

    if (!userId || !email) {
      return res.status(400).json({ error: 'userId and email are required' });
    }

    // Generate a new secret
    const secret = generateSecret();
    const issuer = 'AuthenticatorDemo';
    const otpauthURI = generateOTPAuthURI(secret, email, issuer);
    const qrCodeDataURL = await generateQRCode(otpauthURI);

    // Store the secret (encrypted) associated with the demo user
    const db = getDb();
    
    // Check if 2FA already set up, update if so
    const existing = db.prepare(
      "SELECT id FROM otp_accounts WHERE user_id = ? AND issuer = 'AuthenticatorDemo'"
    ).get(userId);

    if (existing) {
      db.prepare(
        'UPDATE otp_accounts SET encrypted_secret = ? WHERE id = ?'
      ).run(encrypt(secret), existing.id);
    } else {
      db.prepare(`
        INSERT INTO otp_accounts (user_id, issuer, account_name, encrypted_secret)
        VALUES (?, 'AuthenticatorDemo', ?, ?)
      `).run(userId, email, encrypt(secret));
    }

    res.json({
      message: '2FA setup successful',
      secret, // Show the secret so user can manually enter it
      qrCode: qrCodeDataURL,
      otpauthURI,
    });
  } catch (err) {
    console.error('Setup 2FA error:', err);
    res.status(500).json({ error: 'Failed to setup 2FA' });
  }
});

/**
 * POST /api/demo/login
 * Step 1 of demo login: verify email and password.
 * Returns a temporary token to proceed to OTP verification.
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check if user has 2FA enabled
    const has2FA = db.prepare(
      "SELECT id FROM otp_accounts WHERE user_id = ? AND issuer = 'AuthenticatorDemo'"
    ).get(user.id);

    if (has2FA) {
      // Require OTP verification
      res.json({
        message: 'Password verified. Please enter OTP code.',
        requires2FA: true,
        userId: user.id,
      });
    } else {
      // No 2FA, login directly
      res.json({
        message: 'Login successful (no 2FA)',
        requires2FA: false,
        userId: user.id,
        email: user.email,
      });
    }
  } catch (err) {
    console.error('Demo login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/demo/verify-otp
 * Step 2 of demo login: verify the OTP code.
 */
router.post('/verify-otp', (req, res) => {
  try {
    const { userId, otpCode } = req.body;

    if (!userId || !otpCode) {
      return res.status(400).json({ error: 'userId and otpCode are required' });
    }

    const db = getDb();
    const account = db.prepare(
      "SELECT * FROM otp_accounts WHERE user_id = ? AND issuer = 'AuthenticatorDemo'"
    ).get(userId);

    if (!account) {
      return res.status(404).json({ error: '2FA not set up for this user' });
    }

    // Decrypt the secret and verify OTP
    const secret = decrypt(account.encrypted_secret);
    const delta = verifyTOTP(otpCode, secret, {
      algorithm: account.algorithm,
      digits: account.digits,
      period: account.period,
    });

    if (delta !== null) {
      // Anti-replay: derive the absolute time-step that this code belongs to and
      // reject it if that step was already consumed for this user.
      const period = account.period || 30;
      const step = Math.floor(Date.now() / 1000 / period) + delta;
      if (isOtpStepUsed(userId, step)) {
        return res.status(401).json({
          message: '❌ This code was already used. Please wait for the next code.',
          verified: false,
        });
      }
      markOtpStepUsed(userId, step, period);

      const user = db.prepare('SELECT id, email FROM users WHERE id = ?').get(userId);
      res.json({
        message: '✅ OTP verified! Login successful.',
        verified: true,
        user: { id: user.id, email: user.email },
      });
    } else {
      res.status(401).json({
        message: '❌ Invalid OTP code. Please try again.',
        verified: false,
      });
    }
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

export default router;
