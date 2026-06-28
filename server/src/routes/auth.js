import { Router } from 'express';
import bcrypt from 'bcrypt';
import { getDb } from '../database.js';
import { issueTokens, rotateTokens } from '../middleware/auth.js';

const router = Router();
const SALT_ROUNDS = 12;

/**
 * POST /api/auth/register
 * Register a new user account.
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const db = getDb();

    // Check if email already exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Insert user
    const result = db.prepare(
      'INSERT INTO users (email, password_hash) VALUES (?, ?)'
    ).run(email, passwordHash);

    const user = { id: result.lastInsertRowid, email };
    const tokens = issueTokens(user);

    res.status(201).json({
      message: 'User registered successfully',
      user: { id: user.id, email: user.email },
      ...tokens,
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/login
 * Login with email and password.
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

    const tokens = issueTokens({ id: user.id, email: user.email });

    res.json({
      message: 'Login successful',
      user: { id: user.id, email: user.email },
      ...tokens,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh the access token using a refresh token.
 */
router.post('/refresh', (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    const tokens = rotateTokens(refreshToken);
    res.json(tokens);
  } catch (err) {
    res.status(403).json({ error: 'Invalid or expired refresh token' });
  }
});

/**
 * GET /api/auth/me
 * Get current user info (requires auth).
 */
router.get('/me', (req, res) => {
  // req.user is set by authenticateToken middleware
  const db = getDb();
  const user = db.prepare('SELECT id, email, created_at FROM users WHERE id = ?').get(req.user.id);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ user });
});

export default router;
