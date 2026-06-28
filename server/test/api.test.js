import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';

// Set PORT to 0 to use a random free port
process.env.PORT = '0';

let app;

beforeAll(async () => {
  // Dynamically import the app module
  const appModule = await import('../src/app.js');
  app = appModule.default;
});

afterAll(async () => {
  // Close the server if needed
  // Express app.listen() returns a server handle
  // Since we can't easily access it from the imported app, we rely on jest.config.js forceExit
});

describe('Express API Server', () => {
  describe('GET /api/health', () => {
    test('should return 200 with status ok', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('ok');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('POST /api/auth/register', () => {
    test('should register a new user and return tokens', async () => {
      const email = `test_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`;
      const password = 'secret123';

      const response = await request(app)
        .post('/api/auth/register')
        .send({ email, password })
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email');
      expect(response.body.user.email).toBe(email);
    });

    test('should reject registration without email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ password: 'secret123' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('should reject registration with short password', async () => {
      const email = `test_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`;
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email, password: 'short' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('should reject registration with invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'notanemail', password: 'secret123' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('should reject duplicate email registration', async () => {
      const email = `test_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`;
      const password = 'secret123';

      // First registration should succeed
      await request(app)
        .post('/api/auth/register')
        .send({ email, password })
        .expect(201);

      // Second registration with same email should fail
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email, password })
        .expect(409);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/login', () => {
    let testEmail;
    let testPassword;

    beforeAll(async () => {
      testEmail = `test_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`;
      testPassword = 'secret123';

      await request(app)
        .post('/api/auth/register')
        .send({ email: testEmail, password: testPassword });
    });

    test('should login with correct credentials and return tokens', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: testEmail, password: testPassword })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testEmail);
    });

    test('should reject login with wrong password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: testEmail, password: 'wrongpassword' })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    test('should reject login with non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'anypassword' })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    test('should reject login without email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ password: 'secret123' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/accounts', () => {
    let accessToken;
    let testEmail;
    let testPassword;

    beforeAll(async () => {
      testEmail = `test_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`;
      testPassword = 'secret123';

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({ email: testEmail, password: testPassword });

      accessToken = registerResponse.body.accessToken;
    });

    test('should return 401 without Authorization header', async () => {
      const response = await request(app)
        .get('/api/accounts')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    test('should return 200 with valid Bearer token', async () => {
      const response = await request(app)
        .get('/api/accounts')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('accounts');
      expect(Array.isArray(response.body.accounts)).toBe(true);
    });

    test('should return 403 with invalid token', async () => {
      const response = await request(app)
        .get('/api/accounts')
        .set('Authorization', 'Bearer invalidtoken123')
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });

    test('should return empty accounts array for new user', async () => {
      const response = await request(app)
        .get('/api/accounts')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.accounts).toEqual([]);
    });
  });

  describe('POST /api/auth/refresh', () => {
    let refreshToken;
    let testEmail;
    let testPassword;

    beforeAll(async () => {
      testEmail = `test_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`;
      testPassword = 'secret123';

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({ email: testEmail, password: testPassword });

      refreshToken = registerResponse.body.refreshToken;
    });

    test('should return new tokens with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });

    test('should reject missing refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid.token.here' })
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/auth/me', () => {
    let accessToken;
    let testEmail;
    let testPassword;

    beforeAll(async () => {
      testEmail = `test_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`;
      testPassword = 'secret123';

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({ email: testEmail, password: testPassword });

      accessToken = registerResponse.body.accessToken;
    });

    test('should return current user info with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email');
      expect(response.body.user.email).toBe(testEmail);
    });

    test('should return 401 without Authorization header', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });
});
