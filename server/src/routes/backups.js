import { Router } from 'express';
import { getDb } from '../database.js';
import { encrypt, decrypt } from '../utils/encryption.js';

const router = Router();

/**
 * POST /api/backups
 * Create a backup of all OTP accounts for the authenticated user.
 */
router.post('/', (req, res) => {
  try {
    const db = getDb();

    // Get all accounts for this user
    const accounts = db.prepare(
      'SELECT * FROM otp_accounts WHERE user_id = ? ORDER BY created_at'
    ).all(req.user.id);

    // Decrypt secrets for backup
    const backupData = accounts.map(account => ({
      issuer: account.issuer,
      accountName: account.account_name,
      secret: decrypt(account.encrypted_secret, req.user.id),
      algorithm: account.algorithm,
      digits: account.digits,
      period: account.period,
      icon: account.icon,
    }));

    // Encrypt the entire backup (envelope encryption, per-user key)
    const encryptedBackup = encrypt(JSON.stringify(backupData), req.user.id);

    // Store backup in database
    const result = db.prepare(
      'INSERT INTO backups (user_id, encrypted_data) VALUES (?, ?)'
    ).run(req.user.id, encryptedBackup);

    res.status(201).json({
      message: 'Backup created successfully',
      backup: {
        id: result.lastInsertRowid,
        accountCount: accounts.length,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('Create backup error:', err);
    res.status(500).json({ error: 'Failed to create backup' });
  }
});

/**
 * GET /api/backups
 * List all backups for the authenticated user.
 */
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const backups = db.prepare(
      'SELECT id, created_at FROM backups WHERE user_id = ? ORDER BY created_at DESC'
    ).all(req.user.id);

    res.json({ backups });
  } catch (err) {
    console.error('List backups error:', err);
    res.status(500).json({ error: 'Failed to list backups' });
  }
});

/**
 * POST /api/backups/:id/restore
 * Restore accounts from a backup. Replaces all current accounts.
 */
router.post('/:id/restore', (req, res) => {
  try {
    const db = getDb();

    // Get the backup
    const backup = db.prepare(
      'SELECT * FROM backups WHERE id = ? AND user_id = ?'
    ).get(req.params.id, req.user.id);

    if (!backup) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    // Decrypt backup data
    const backupData = JSON.parse(decrypt(backup.encrypted_data, req.user.id));

    // Use transaction for atomicity
    const restore = db.transaction(() => {
      // Delete current accounts
      db.prepare('DELETE FROM otp_accounts WHERE user_id = ?').run(req.user.id);

      // Insert restored accounts
      const insert = db.prepare(`
        INSERT INTO otp_accounts (user_id, issuer, account_name, encrypted_secret, algorithm, digits, period, icon)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const account of backupData) {
        insert.run(
          req.user.id,
          account.issuer,
          account.accountName,
          encrypt(account.secret, req.user.id),
          account.algorithm,
          account.digits,
          account.period,
          account.icon || null
        );
      }

      return backupData.length;
    });

    const restoredCount = restore();

    res.json({
      message: 'Backup restored successfully',
      restoredAccounts: restoredCount,
    });
  } catch (err) {
    console.error('Restore backup error:', err);
    res.status(500).json({ error: 'Failed to restore backup' });
  }
});

/**
 * GET /api/backups/:id/download
 * Download a backup as encrypted JSON file.
 */
router.get('/:id/download', (req, res) => {
  try {
    const db = getDb();
    const backup = db.prepare(
      'SELECT * FROM backups WHERE id = ? AND user_id = ?'
    ).get(req.params.id, req.user.id);

    if (!backup) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="authenticator-backup-${backup.id}.json"`);

    res.json({
      version: '1.0',
      createdAt: backup.created_at,
      data: backup.encrypted_data,
    });
  } catch (err) {
    console.error('Download backup error:', err);
    res.status(500).json({ error: 'Failed to download backup' });
  }
});

export default router;
