import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import { initDatabase } from './database.js';
import { authenticateToken } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import accountRoutes from './routes/accounts.js';
import backupRoutes from './routes/backups.js';
import demoRoutes from './routes/demo.js';
import zkRoutes from './routes/zk.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ──────────────────────────────────────
// Middleware
// ──────────────────────────────────────

// Security headers
app.use(helmet());

// CORS - allow frontend origins. In production, set CORS_ORIGINS to a
// comma-separated list of deployed URLs, e.g.
// "https://da1-authenticator.onrender.com,https://da1-demo.onrender.com".
const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:5174')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
app.use(cors({
  origin: corsOrigins,
  credentials: true,
}));

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));

// Rate limiting - general
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests, please try again later' },
});
app.use('/api/', generalLimiter);

// Rate limiting - auth endpoints (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many auth attempts, please try again later' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Rate limiting - OTP verification (prevent brute-force)
const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10,
  message: { error: 'Too many OTP attempts, please try again later' },
});
app.use('/api/demo/verify-otp', otpLimiter);

// ──────────────────────────────────────
// Routes
// ──────────────────────────────────────

// Public routes
// /api/auth/me requires a valid JWT — attach the guard before the auth router
// so req.user is populated by the time the router's /me handler runs.
app.use('/api/auth/me', authenticateToken);
app.use('/api/auth', authRoutes);
app.use('/api/demo', demoRoutes);
app.use('/api/zk', zkRoutes);

// Protected routes (require JWT)
app.use('/api/accounts', authenticateToken, accountRoutes);
app.use('/api/backups', authenticateToken, backupRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use('/api/{*path}', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ──────────────────────────────────────
// Start Server
// ──────────────────────────────────────

try {
  initDatabase();
  app.listen(PORT, () => {
    console.log(`
  ╔═══════════════════════════════════════════╗
  ║   🔐 Authenticator API Server            ║
  ║   Running on: http://localhost:${PORT}      ║
  ║   Environment: ${process.env.NODE_ENV || 'development'}            ║
  ╚═══════════════════════════════════════════╝
    `);
  });
} catch (err) {
  console.error('Failed to start server:', err);
  process.exit(1);
}

export default app;
