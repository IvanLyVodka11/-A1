import { TOTP } from 'otpauth';
import QRCode from 'qrcode';

/**
 * Generate a TOTP token from a secret.
 * @param {string} secret - Base32-encoded secret
 * @param {Object} options - OTP options
 * @returns {string} 6-digit OTP code
 */
export function generateTOTP(secret, options = {}) {
  const totp = new TOTP({
    secret,
    algorithm: options.algorithm || 'SHA1',
    digits: options.digits || 6,
    period: options.period || 30,
  });

  return totp.generate();
}

/**
 * Verify a TOTP token against a secret.
 * @param {string} token - The OTP code to verify
 * @param {string} secret - Base32-encoded secret
 * @param {Object} options - OTP options
 * @returns {number|null} The time step delta if valid, null if invalid
 */
export function verifyTOTP(token, secret, options = {}) {
  const totp = new TOTP({
    secret,
    algorithm: options.algorithm || 'SHA1',
    digits: options.digits || 6,
    period: options.period || 30,
  });

  // Allow 1 period window for clock drift
  const delta = totp.validate({ token, window: 1 });
  return delta;
}

/**
 * Generate a otpauth:// URI for QR code.
 * @param {string} secret - Base32-encoded secret
 * @param {string} accountName - Account name (e.g. user@example.com)
 * @param {string} issuer - Issuer name (e.g. "MyApp")
 * @param {Object} options - Additional options
 * @returns {string} otpauth:// URI
 */
export function generateOTPAuthURI(secret, accountName, issuer, options = {}) {
  const totp = new TOTP({
    issuer,
    label: accountName,
    secret,
    algorithm: options.algorithm || 'SHA1',
    digits: options.digits || 6,
    period: options.period || 30,
  });

  return totp.toString();
}

/**
 * Generate a QR code image as data URL from an otpauth URI.
 * @param {string} otpauthURI - The otpauth:// URI
 * @returns {Promise<string>} QR code as data URL (base64 PNG)
 */
export async function generateQRCode(otpauthURI) {
  return await QRCode.toDataURL(otpauthURI, {
    width: 256,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  });
}
