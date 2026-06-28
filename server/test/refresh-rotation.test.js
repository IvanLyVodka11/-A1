import { describe, test, expect, beforeAll } from '@jest/globals';
import request from 'supertest';

process.env.PORT = '0';

let app;

beforeAll(async () => {
  app = (await import('../src/app.js')).default;
});

function uniqueEmail() {
  return `rot_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`;
}

async function register() {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email: uniqueEmail(), password: 'secret123' });
  return res.body.refreshToken;
}

describe('Refresh token rotation', () => {
  test('rotation returns a new, different refresh token', async () => {
    const r1 = await register();
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken: r1 }).expect(200);
    expect(res.body.refreshToken).toBeTruthy();
    expect(res.body.refreshToken).not.toBe(r1);
    expect(res.body).toHaveProperty('accessToken');
  });

  test('the old refresh token is revoked after rotation', async () => {
    const r1 = await register();
    await request(app).post('/api/auth/refresh').send({ refreshToken: r1 }).expect(200);
    // Re-using r1 must now fail.
    await request(app).post('/api/auth/refresh').send({ refreshToken: r1 }).expect(403);
  });

  test('a token produced by rotation can itself be rotated', async () => {
    const r1 = await register();
    const r2 = (await request(app).post('/api/auth/refresh').send({ refreshToken: r1 }).expect(200)).body.refreshToken;
    await request(app).post('/api/auth/refresh').send({ refreshToken: r2 }).expect(200);
  });

  test('reusing a revoked token revokes the whole family (theft response)', async () => {
    const r1 = await register();
    const r2 = (await request(app).post('/api/auth/refresh').send({ refreshToken: r1 }).expect(200)).body.refreshToken;
    // Attacker replays the already-rotated r1 → reuse detected.
    await request(app).post('/api/auth/refresh').send({ refreshToken: r1 }).expect(403);
    // The legitimate r2 is now also revoked.
    await request(app).post('/api/auth/refresh').send({ refreshToken: r2 }).expect(403);
  });
});
