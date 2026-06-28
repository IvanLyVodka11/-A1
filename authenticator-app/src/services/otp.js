import { TOTP } from 'otpauth';

/**
 * Generate a TOTP code from a secret (client-side, no API call needed).
 * @param {string} secret - Base32-encoded secret
 * @param {Object} options
 * @returns {string} OTP code
 */
export function generateOTP(secret, options = {}) {
  try {
    const totp = new TOTP({
      secret,
      algorithm: options.algorithm || 'SHA1',
      digits: options.digits || 6,
      period: options.period || 30,
    });
    return totp.generate();
  } catch (err) {
    console.error('OTP generation error:', err);
    return '------';
  }
}

/**
 * Get the remaining seconds until the current OTP expires.
 * @param {number} period - OTP period in seconds (default 30)
 * @returns {number} Remaining seconds
 */
export function getRemainingSeconds(period = 30) {
  const now = Math.floor(Date.now() / 1000);
  return period - (now % period);
}

/**
 * Format OTP code with a space in the middle for readability.
 * @param {string} code - The OTP code
 * @returns {string} Formatted code (e.g. "482 391")
 */
export function formatOTP(code) {
  if (!code || code.length < 4) return code;
  const mid = Math.floor(code.length / 2);
  return code.slice(0, mid) + ' ' + code.slice(mid);
}
