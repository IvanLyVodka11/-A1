import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { getDb } from '../database.js';

dotenv.config();

const ACCESS_TTL = '15m';
const REFRESH_TTL_DAYS = 7;

/**
 * JWT authentication middleware for access tokens.
 * Access tokens stay stateless (short-lived); only refresh tokens are tracked.
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(403).json({ error: 'Invalid token' });
  }
}

/**
 * Sign a short-lived access token.
 * @param {{id:number, email:string}} user
 * @returns {string}
 */
export function generateAccessToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TTL }
  );
}

/**
 * Issue a fresh access + refresh token pair and register the refresh token's
 * unique id (jti) in the database so it can later be rotated and revoked.
 * @param {{id:number, email:string}} user
 * @returns {{ accessToken: string, refreshToken: string }}
 */
export function issueTokens(user) {
  const jti = crypto.randomUUID();
  const refreshToken = jwt.sign(
    { id: user.id, email: user.email, jti },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: `${REFRESH_TTL_DAYS}d` }
  );
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  getDb()
    .prepare('INSERT INTO refresh_tokens (user_id, jti, expires_at) VALUES (?, ?, ?)')
    .run(user.id, jti, expiresAt);

  return { accessToken: generateAccessToken(user), refreshToken };
}

/**
 * Rotate a refresh token: verify it, revoke it, and issue a brand-new pair.
 * Implements reuse detection — presenting an already-revoked (rotated) token is
 * treated as theft and revokes every refresh token of that user.
 * @param {string} refreshToken
 * @returns {{ accessToken: string, refreshToken: string }}
 * @throws if the token is invalid, unknown, expired, or reused
 */
export function rotateTokens(refreshToken) {
  const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  const db = getDb();
  const row = db.prepare('SELECT * FROM refresh_tokens WHERE jti = ?').get(decoded.jti);

  if (!row) {
    throw new Error('Refresh token not recognized');
  }
  if (row.revoked) {
    // A revoked token is being replayed — revoke the whole family as a precaution.
    db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?').run(row.user_id);
    throw new Error('Refresh token reuse detected');
  }

  // Rotate: revoke the presented token and mint a new pair.
  db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE jti = ?').run(decoded.jti);
  return issueTokens({ id: decoded.id, email: decoded.email });
}
