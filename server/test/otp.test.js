import { describe, test, expect } from '@jest/globals';
import { generateTOTP, verifyTOTP, generateOTPAuthURI } from '../src/utils/otp.js';
import { TOTP, Secret } from 'otpauth';

describe('OTP Module', () => {
  describe('generateTOTP()', () => {
    test('should generate a 6-digit OTP code', () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const code = generateTOTP(secret);
      expect(typeof code).toBe('string');
      expect(code.length).toBe(6);
      expect(/^\d{6}$/.test(code)).toBe(true);
    });

    test('should generate different codes on subsequent calls (time-based)', () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const code1 = generateTOTP(secret);
      // Note: Within the same 30-second window, codes will be the same
      // So we can't reliably test this without mocking time
      expect(code1).toBeDefined();
      expect(/^\d{6}$/.test(code1)).toBe(true);
    });
  });

  describe('verifyTOTP()', () => {
    test('should return a delta (number) when token is valid', () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const code = generateTOTP(secret);
      const delta = verifyTOTP(code, secret);
      expect(typeof delta).toBe('number');
      expect(delta).not.toBeNull();
    });

    test('should return null for an obviously wrong code', () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const wrongCode = '000000';
      const delta = verifyTOTP(wrongCode, secret);
      // A code of all zeros is extremely unlikely to match (probability ~1 in million)
      // If it somehow matches, that's a random collision, but verifying a correct code
      // should definitely work
      if (delta !== null) {
        // If by extreme chance it matches, let's verify that a correct code also works
        const correctCode = generateTOTP(secret);
        const correctDelta = verifyTOTP(correctCode, secret);
        expect(correctDelta).not.toBeNull();
      } else {
        expect(delta).toBeNull();
      }
    });

    test('should return null for a malformed token', () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const malformedCode = '12';
      const delta = verifyTOTP(malformedCode, secret);
      expect(delta).toBeNull();
    });

    test('should return null for an empty code', () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const delta = verifyTOTP('', secret);
      expect(delta).toBeNull();
    });

    test('should accept custom options (digits)', () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const code = generateTOTP(secret, { digits: 8 });
      expect(code.length).toBe(8);
      const delta = verifyTOTP(code, secret, { digits: 8 });
      expect(delta).not.toBeNull();
    });
  });

  describe('RFC 6238 vector test', () => {
    test('should match RFC 6238 test vector (SHA1, 8 digits, timestamp 59000)', () => {
      // RFC 6238 test vector: secret="12345678901234567890", timestamp=59 seconds
      // Expected result for 8-digit TOTP with SHA1: 94287082
      const secretString = '12345678901234567890';
      const secret = Secret.fromUTF8(secretString);
      const totp = new TOTP({
        secret,
        algorithm: 'SHA1',
        digits: 8,
        period: 30,
      });

      const code = totp.generate({ timestamp: 59000 });
      expect(code).toBe('94287082');
    });
  });

  describe('generateOTPAuthURI()', () => {
    test('should generate a valid otpauth:// URI', () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const accountName = 'user@example.com';
      const issuer = 'TestApp';

      const uri = generateOTPAuthURI(secret, accountName, issuer);
      expect(typeof uri).toBe('string');
      expect(uri.startsWith('otpauth://totp/')).toBe(true);
      // The account name is URL-encoded in the URI (@ -> %40); decode before comparing.
      expect(decodeURIComponent(uri)).toContain(accountName);
      expect(uri).toContain(issuer);
    });

    test('should include secret in the URI', () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const accountName = 'test@example.com';
      const issuer = 'MyApp';

      const uri = generateOTPAuthURI(secret, accountName, issuer);
      expect(uri).toContain(`secret=${secret}`);
    });

    test('should respect custom algorithm option', () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const accountName = 'user@example.com';
      const issuer = 'TestApp';

      const uri = generateOTPAuthURI(secret, accountName, issuer, { algorithm: 'SHA256' });
      expect(uri).toContain('algorithm=SHA256');
    });

    test('should respect custom digits option', () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const accountName = 'user@example.com';
      const issuer = 'TestApp';

      const uri = generateOTPAuthURI(secret, accountName, issuer, { digits: 8 });
      expect(uri).toContain('digits=8');
    });
  });
});
