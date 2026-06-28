/**
 * PasswordGenerator — client-side cryptographically random password generator.
 *
 * Uses crypto.getRandomValues exclusively; no network requests.
 *
 * Props:
 *   onUse  (password: string) => void  — optional; called when user clicks "Use this password"
 */
import { useState, useCallback } from 'react';
import { Button, Toggle, useToast } from './ui';

const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS = '0123456789';
const SYMBOLS = '!@#$%^&*()-_=+[]{}|;:,.<>?';

function generatePassword({ length, useLower, useUpper, useDigits, useSymbols }) {
  let pool = '';
  const required = [];

  if (useLower) { pool += LOWER; required.push(LOWER); }
  if (useUpper) { pool += UPPER; required.push(UPPER); }
  if (useDigits) { pool += DIGITS; required.push(DIGITS); }
  if (useSymbols) { pool += SYMBOLS; required.push(SYMBOLS); }

  if (!pool) return '';

  const arr = new Uint32Array(length + required.length);
  crypto.getRandomValues(arr);

  // Guarantee at least one char from each required group
  const chars = required.map((group, i) => group[arr[i] % group.length]);

  // Fill the rest
  for (let i = required.length; i < length; i++) {
    chars.push(pool[arr[i] % pool.length]);
  }

  // Fisher–Yates shuffle using fresh random values
  const shuffle = new Uint32Array(chars.length);
  crypto.getRandomValues(shuffle);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = shuffle[i] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}

export default function PasswordGenerator({ onUse }) {
  const toast = useToast();
  const [length, setLength] = useState(16);
  const [useLower, setUseLower] = useState(true);
  const [useUpper, setUseUpper] = useState(true);
  const [useDigits, setUseDigits] = useState(true);
  const [useSymbols, setUseSymbols] = useState(false);
  const [password, setPassword] = useState(() =>
    generatePassword({ length: 16, useLower: true, useUpper: true, useDigits: true, useSymbols: false })
  );
  const [revealed, setRevealed] = useState(false);

  const regenerate = useCallback(() => {
    const pw = generatePassword({ length, useLower, useUpper, useDigits, useSymbols });
    setPassword(pw);
    setRevealed(false);
  }, [length, useLower, useUpper, useDigits, useSymbols]);

  const handleCopy = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      toast('Password copied to clipboard', 'success');
    } catch {
      toast('Could not access clipboard', 'error');
    }
  };

  const handleUse = () => {
    if (onUse && password) onUse(password);
  };

  // Strength score 0–4
  const strength = [useLower, useUpper, useDigits, useSymbols].filter(Boolean).length;
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength] || '';
  const strengthClass = ['', 'kp-strength--weak', 'kp-strength--fair', 'kp-strength--good', 'kp-strength--strong'][strength] || '';

  return (
    <div className="kp-pwgen">
      <h3 className="kp-pwgen__title">Password Generator</h3>

      {/* Output */}
      <div className="kp-pwgen__output">
        <span className="kp-pwgen__pw" aria-label="Generated password">
          {password
            ? (revealed ? password : '•'.repeat(Math.min(password.length, 24)))
            : <em style={{ color: 'var(--color-text-muted)' }}>Enable at least one character set</em>
          }
        </span>
        <div className="kp-pwgen__output-actions">
          <button
            type="button"
            className="ds-icon-btn"
            aria-label={revealed ? 'Hide password' : 'Show password'}
            title={revealed ? 'Hide' : 'Show'}
            onClick={() => setRevealed(r => !r)}
          >
            {revealed ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
          <button
            type="button"
            className="ds-icon-btn"
            aria-label="Copy password"
            title="Copy"
            onClick={handleCopy}
            disabled={!password}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Strength bar */}
      {password && (
        <div className="kp-pwgen__strength" aria-label={`Password strength: ${strengthLabel}`}>
          {[1, 2, 3, 4].map(i => (
            <span
              key={i}
              className={`kp-pwgen__strength-bar ${i <= strength ? strengthClass : ''}`}
            />
          ))}
          <span className="kp-pwgen__strength-label">{strengthLabel}</span>
        </div>
      )}

      {/* Length */}
      <div className="kp-pwgen__row">
        <label className="kp-pwgen__slider-label" htmlFor="pwgen-length">
          Length: <strong>{length}</strong>
        </label>
        <input
          id="pwgen-length"
          type="range"
          min={8}
          max={32}
          value={length}
          onChange={e => setLength(Number(e.target.value))}
          className="kp-pwgen__slider"
          aria-label="Password length"
        />
      </div>

      {/* Character set toggles */}
      <div className="kp-pwgen__toggles">
        <Toggle checked={useLower} onChange={setUseLower} label="Lowercase (a–z)" />
        <Toggle checked={useUpper} onChange={setUseUpper} label="Uppercase (A–Z)" />
        <Toggle checked={useDigits} onChange={setUseDigits} label="Digits (0–9)" />
        <Toggle checked={useSymbols} onChange={setUseSymbols} label="Symbols (!@#…)" />
      </div>

      {/* Actions */}
      <div className="kp-pwgen__actions">
        <Button variant="secondary" onClick={regenerate} disabled={!password}>
          Regenerate
        </Button>
        {onUse && (
          <Button variant="primary" onClick={handleUse} disabled={!password}>
            Use this password
          </Button>
        )}
      </div>
    </div>
  );
}
