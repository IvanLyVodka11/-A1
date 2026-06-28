import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// DB_PATH lets a deployment point SQLite at a persistent disk
// (e.g. /var/data/authenticator.db on Render); defaults to local ./data.
const DB_PATH = process.env.DB_PATH || join(__dirname, '..', 'data', 'authenticator.db');

let db;

/**
 * Initialize the SQLite database and create tables if they don't exist.
 * @returns {Database} The database instance
 */
export function initDatabase() {
  // Ensure the directory that holds the database file exists
  const dataDir = dirname(DB_PATH);
  mkdirSync(dataDir, { recursive: true });

  db = new Database(DB_PATH);
  
  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS otp_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      issuer TEXT NOT NULL DEFAULT '',
      account_name TEXT NOT NULL,
      encrypted_secret TEXT NOT NULL,
      algorithm TEXT NOT NULL DEFAULT 'SHA1',
      digits INTEGER NOT NULL DEFAULT 6,
      period INTEGER NOT NULL DEFAULT 30,
      icon TEXT DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS backups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      encrypted_data TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS zk_credentials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      public_key TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      jti TEXT NOT NULL UNIQUE,
      revoked INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_otp_accounts_user_id ON otp_accounts(user_id);
    CREATE INDEX IF NOT EXISTS idx_backups_user_id ON backups(user_id);
    CREATE INDEX IF NOT EXISTS idx_zk_user_id ON zk_credentials(user_id);
    CREATE INDEX IF NOT EXISTS idx_refresh_jti ON refresh_tokens(jti);
    CREATE INDEX IF NOT EXISTS idx_refresh_user_id ON refresh_tokens(user_id);
  `);

  console.log('✅ Database initialized successfully');
  return db;
}

/**
 * Get the database instance.
 * @returns {Database}
 */
export function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}
