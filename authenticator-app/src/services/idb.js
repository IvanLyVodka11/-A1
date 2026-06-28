import { openDB } from 'idb';

const DB_NAME = 'authenticator-db';
const STORE_NAME = 'accounts';

/**
 * Open IndexedDB database for offline accounts storage.
 */
async function getDb() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    },
  });
}

/**
 * Save an array of accounts to IndexedDB for offline OTP generation.
 */
export async function saveAccountsOffline(accounts) {
  try {
    const db = await getDb();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    await store.clear();
    for (const acc of accounts) {
      await store.add(acc);
    }
    await tx.done;
  } catch (err) {
    console.error('Failed to save accounts offline:', err);
  }
}

/**
 * Get all offline accounts from IndexedDB.
 */
export async function getAccountsOffline() {
  try {
    const db = await getDb();
    return db.getAll(STORE_NAME);
  } catch (err) {
    console.error('Failed to get offline accounts:', err);
    return [];
  }
}
