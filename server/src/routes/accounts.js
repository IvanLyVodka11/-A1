import { Router } from 'express';
import { getDb } from '../database.js';
import { encrypt, decrypt, generateSecret } from '../utils/encryption.js';
import { generateOTPAuthURI, generateQRCode } from '../utils/otp.js';

const router = Router();

/**
 * GET /api/accounts
 * Get all OTP accounts for the authenticated user.
 * Returns accounts with decrypted secrets for client-side OTP generation.
 */
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const accounts = db.prepare(
      'SELECT * FROM otp_accounts WHERE user_id = ? ORDER BY created_at DESC'
    ).all(req.user.id);

    // Decrypt secrets for client-side OTP generation
    const decryptedAccounts = accounts.map(account => ({
      id: account.id,
      issuer: account.issuer,
      accountName: account.account_name,
      secret: decrypt(account.encrypted_secret, req.user.id),
      algorithm: account.algorithm,
      digits: account.digits,
      period: account.period,
      icon: account.icon,
      createdAt: account.created_at,
    }));

    res.json({ accounts: decryptedAccounts });
  } catch (err) {
    console.error('Get accounts error:', err);
    res.status(500).json({ error: 'Failed to get accounts' });
  }
});

/**
 * POST /api/accounts
 * Add a new OTP account.
 * Accepts either a secret directly or an otpauth:// URI.
 */
router.post('/', (req, res) => {
  try {
    const { secret, issuer, accountName, algorithm, digits, period, uri } = req.body;

    let finalSecret = secret;
    let finalIssuer = issuer || '';
    let finalAccountName = accountName || '';
    let finalAlgorithm = algorithm || 'SHA1';
    let finalDigits = digits || 6;
    let finalPeriod = period || 30;

    // Parse otpauth:// URI if provided
    if (uri) {
      const parsed = parseOTPAuthURI(uri);
      finalSecret = parsed.secret;
      finalIssuer = parsed.issuer || finalIssuer;
      finalAccountName = parsed.accountName || finalAccountName;
      finalAlgorithm = parsed.algorithm || finalAlgorithm;
      finalDigits = parsed.digits || finalDigits;
      finalPeriod = parsed.period || finalPeriod;
    }

    if (!finalSecret) {
      return res.status(400).json({ error: 'Secret or URI is required' });
    }

    if (!finalAccountName) {
      return res.status(400).json({ error: 'Account name is required' });
    }

    // Encrypt the secret before storing (envelope encryption, per-user key)
    const encryptedSecret = encrypt(finalSecret, req.user.id);

    const db = getDb();
    const result = db.prepare(`
      INSERT INTO otp_accounts (user_id, issuer, account_name, encrypted_secret, algorithm, digits, period)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.user.id,
      finalIssuer,
      finalAccountName,
      encryptedSecret,
      finalAlgorithm,
      finalDigits,
      finalPeriod
    );

    res.status(201).json({
      message: 'Account added successfully',
      account: {
        id: result.lastInsertRowid,
        issuer: finalIssuer,
        accountName: finalAccountName,
        secret: finalSecret,
        algorithm: finalAlgorithm,
        digits: finalDigits,
        period: finalPeriod,
      },
    });
  } catch (err) {
    console.error('Add account error:', err);
    res.status(500).json({ error: 'Failed to add account' });
  }
});

/**
 * PUT /api/accounts/:id
 * Update an existing OTP account (issuer, account name, icon).
 */
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { issuer, accountName, icon } = req.body;

    const db = getDb();

    // Verify ownership
    const account = db.prepare(
      'SELECT * FROM otp_accounts WHERE id = ? AND user_id = ?'
    ).get(id, req.user.id);

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    db.prepare(`
      UPDATE otp_accounts 
      SET issuer = COALESCE(?, issuer),
          account_name = COALESCE(?, account_name),
          icon = COALESCE(?, icon)
      WHERE id = ? AND user_id = ?
    `).run(issuer, accountName, icon, id, req.user.id);

    res.json({ message: 'Account updated successfully' });
  } catch (err) {
    console.error('Update account error:', err);
    res.status(500).json({ error: 'Failed to update account' });
  }
});

/**
 * DELETE /api/accounts/:id
 * Delete an OTP account.
 */
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();

    const result = db.prepare(
      'DELETE FROM otp_accounts WHERE id = ? AND user_id = ?'
    ).run(id, req.user.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

/**
 * Parse an otpauth:// URI into its components.
 * Format: otpauth://totp/ISSUER:ACCOUNT?secret=SECRET&issuer=ISSUER&algorithm=SHA1&digits=6&period=30
 */
function parseOTPAuthURI(uri) {
  try {
    const url = new URL(uri);
    const params = url.searchParams;
    
    // Extract label (issuer:account or just account)
    const label = decodeURIComponent(url.pathname.slice(1)); // remove leading /
    let issuer = '';
    let accountName = label;
    
    if (label.includes(':')) {
      [issuer, accountName] = label.split(':', 2);
    }

    // Params override label
    if (params.get('issuer')) {
      issuer = params.get('issuer');
    }

    return {
      secret: params.get('secret') || '',
      issuer,
      accountName,
      algorithm: params.get('algorithm') || 'SHA1',
      digits: parseInt(params.get('digits')) || 6,
      period: parseInt(params.get('period')) || 30,
    };
  } catch (err) {
    throw new Error('Invalid otpauth URI');
  }
}

export default router;
