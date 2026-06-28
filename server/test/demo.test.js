import { describe, test, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import { generateTOTP } from '../src/utils/otp.js';

// Random free port, mirroring api.test.js.
process.env.PORT = '0';

let app;

beforeAll(async () => {
  const appModule = await import('../src/app.js');
  app = appModule.default;
});

const newEmail = () =>
  `demo_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`;

// Register a demo user with 2FA enabled; returns { userId, secret }. Each
// caller gets a fresh user so the in-process anti-replay state (which is
// keyed per user + time-step) never leaks between tests.
async function newUserWith2FA() {
  const email = newEmail();
  const reg = await request(app)
    .post('/api/demo/register')
    .send({ email, password: 'secret123' });
  const setup = await request(app)
    .post('/api/demo/setup-2fa')
    .send({ userId: reg.body.userId, email });
  return { userId: reg.body.userId, secret: setup.body.secret };
}

describe('Demo 2FA flow (/api/demo)', () => {
  describe('POST /api/demo/register', () => {
    test('registers a demo user and returns userId', async () => {
      const response = await request(app)
        .post('/api/demo/register')
        .send({ email: newEmail(), password: 'secret123' })
        .expect(201);

      expect(response.body).toHaveProperty('userId');
    });

    test('rejects missing fields', async () => {
      await request(app)
        .post('/api/demo/register')
        .send({ email: newEmail() })
        .expect(400);
    });

    test('rejects duplicate email', async () => {
      const email = newEmail();
      await request(app)
        .post('/api/demo/register')
        .send({ email, password: 'secret123' })
        .expect(201);

      await request(app)
        .post('/api/demo/register')
        .send({ email, password: 'secret123' })
        .expect(409);
    });
  });

  describe('POST /api/demo/setup-2fa', () => {
    let userId;
    let email;

    beforeAll(async () => {
      email = newEmail();
      const res = await request(app)
        .post('/api/demo/register')
        .send({ email, password: 'secret123' });
      userId = res.body.userId;
    });

    // Regression guard: encrypt() requires a userId for per-user key
    // derivation. The route previously called encrypt(secret) without it,
    // which threw and returned 500 even though the user existed.
    test('enables 2FA and returns secret + QR code', async () => {
      const response = await request(app)
        .post('/api/demo/setup-2fa')
        .send({ userId, email })
        .expect(200);

      expect(response.body).toHaveProperty('secret');
      expect(response.body).toHaveProperty('qrCode');
      expect(response.body.qrCode).toMatch(/^data:image\/png;base64,/);
      expect(response.body).toHaveProperty('otpauthURI');
    });

    test('is idempotent — re-running rotates the secret without error', async () => {
      const first = await request(app)
        .post('/api/demo/setup-2fa')
        .send({ userId, email })
        .expect(200);

      const second = await request(app)
        .post('/api/demo/setup-2fa')
        .send({ userId, email })
        .expect(200);

      expect(second.body.secret).not.toBe(first.body.secret);
    });

    test('rejects missing fields', async () => {
      await request(app)
        .post('/api/demo/setup-2fa')
        .send({ userId })
        .expect(400);
    });
  });

  describe('POST /api/demo/login', () => {
    test('signals requires2FA once 2FA is enabled', async () => {
      const email = newEmail();
      const password = 'secret123';
      const reg = await request(app)
        .post('/api/demo/register')
        .send({ email, password });
      await request(app)
        .post('/api/demo/setup-2fa')
        .send({ userId: reg.body.userId, email })
        .expect(200);

      const response = await request(app)
        .post('/api/demo/login')
        .send({ email, password })
        .expect(200);

      expect(response.body.requires2FA).toBe(true);
      expect(response.body.userId).toBe(reg.body.userId);
    });

    test('logs in directly when 2FA is not set up', async () => {
      const email = newEmail();
      const password = 'secret123';
      await request(app)
        .post('/api/demo/register')
        .send({ email, password });

      const response = await request(app)
        .post('/api/demo/login')
        .send({ email, password })
        .expect(200);

      expect(response.body.requires2FA).toBe(false);
    });

    test('rejects wrong password', async () => {
      const email = newEmail();
      await request(app)
        .post('/api/demo/register')
        .send({ email, password: 'secret123' });

      await request(app)
        .post('/api/demo/login')
        .send({ email, password: 'wrongpassword' })
        .expect(401);
    });
  });

  describe('POST /api/demo/verify-otp', () => {
    // Full round-trip: a code generated from the secret returned by
    // setup-2fa must decrypt-and-verify on the server (decrypt also needs
    // the userId — same regression class as encrypt).
    test('verifies a valid OTP code', async () => {
      const { userId, secret } = await newUserWith2FA();
      const otpCode = generateTOTP(secret);
      const response = await request(app)
        .post('/api/demo/verify-otp')
        .send({ userId, otpCode })
        .expect(200);

      expect(response.body.verified).toBe(true);
      expect(response.body.user).toHaveProperty('email');
    });

    test('rejects a replayed OTP code', async () => {
      const { userId, secret } = await newUserWith2FA();
      const otpCode = generateTOTP(secret);
      // First use consumes the time-step.
      await request(app)
        .post('/api/demo/verify-otp')
        .send({ userId, otpCode })
        .expect(200);

      // Same code in the same step must be refused (anti-replay).
      const replay = await request(app)
        .post('/api/demo/verify-otp')
        .send({ userId, otpCode })
        .expect(401);

      expect(replay.body.verified).toBe(false);
    });

    test('rejects an invalid OTP code', async () => {
      const { userId } = await newUserWith2FA();
      const response = await request(app)
        .post('/api/demo/verify-otp')
        .send({ userId, otpCode: '000000' })
        .expect(401);

      expect(response.body.verified).toBe(false);
    });

    test('returns 404 when 2FA is not set up', async () => {
      const email = newEmail();
      const reg = await request(app)
        .post('/api/demo/register')
        .send({ email, password: 'secret123' });

      await request(app)
        .post('/api/demo/verify-otp')
        .send({ userId: reg.body.userId, otpCode: '000000' })
        .expect(404);
    });

    test('rejects missing fields', async () => {
      const { userId } = await newUserWith2FA();
      await request(app)
        .post('/api/demo/verify-otp')
        .send({ userId })
        .expect(400);
    });
  });
});
