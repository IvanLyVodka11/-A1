/**
 * VaultEntryRow — displays one KeePass entry with reveal/copy controls.
 *
 * Props:
 *   entry  { title, username, password, url, notes, otpUri }
 *   onCopyUsername  () => void  — called after username copied (for toast scheduling)
 *   onCopyPassword  () => void  — called after password copied (for toast scheduling)
 */
import { useState } from 'react';
import { Card, IconButton } from './ui';

// ── SVG icons (inline, no external deps) ────────────────────────────────────

function CopyIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

export default function VaultEntryRow({ entry, onCopyUsername, onCopyPassword }) {
  const [revealed, setRevealed] = useState(false);
  const [copiedUser, setCopiedUser] = useState(false);
  const [copiedPw, setCopiedPw] = useState(false);

  const copyText = async (text, setCopied, afterCopy) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      if (afterCopy) afterCopy();
    } catch {
      // silently ignore clipboard errors; caller shows toast
    }
  };

  const initial = ((entry.title || entry.username || '?')[0] || '?').toUpperCase();

  return (
    <Card className="kp-entry-row">
      {/* Left: avatar + info */}
      <div className="kp-entry-row__left">
        <div className="kp-entry-row__avatar" aria-hidden="true">
          {initial}
        </div>
        <div className="kp-entry-row__info">
          <div className="kp-entry-row__title">
            {entry.title || <em>Untitled</em>}
            {entry.otpUri && (
              <span className="kp-entry-row__badge" title="Has TOTP">OTP</span>
            )}
          </div>
          {entry.username && (
            <div className="kp-entry-row__username">{entry.username}</div>
          )}
          {entry.url && (
            <a
              className="kp-entry-row__url"
              href={entry.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <LinkIcon />
              {entry.url.replace(/^https?:\/\//, '').slice(0, 40)}
            </a>
          )}
        </div>
      </div>

      {/* Right: password + actions */}
      <div className="kp-entry-row__right">
        <span className="kp-entry-row__password" aria-label="Password">
          {revealed
            ? (entry.password || <em>empty</em>)
            : '•'.repeat(Math.min((entry.password || '').length || 8, 16))}
        </span>
        <div className="kp-entry-row__actions">
          <IconButton
            icon={revealed ? <EyeOffIcon /> : <EyeIcon />}
            label={revealed ? 'Hide password' : 'Reveal password'}
            onClick={() => setRevealed(r => !r)}
            className="kp-icon-btn"
          />
          <IconButton
            icon={copiedUser ? <CheckIcon /> : <CopyIcon />}
            label={copiedUser ? 'Username copied' : 'Copy username'}
            onClick={() => copyText(entry.username, setCopiedUser, onCopyUsername)}
            className="kp-icon-btn"
            disabled={!entry.username}
          />
          <IconButton
            icon={copiedPw ? <CheckIcon /> : <CopyIcon />}
            label={copiedPw ? 'Password copied' : 'Copy password'}
            onClick={() => copyText(entry.password, setCopiedPw, onCopyPassword)}
            className="kp-icon-btn"
            disabled={!entry.password}
          />
        </div>
      </div>
    </Card>
  );
}
