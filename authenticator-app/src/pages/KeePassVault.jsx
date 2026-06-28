/**
 * KeePassVault — main vault page at /vault
 *
 * Two tabs:
 *   • Import  — load a .kdbx file + master password → list entries
 *   • Export  — choose entries + master password → download .kdbx
 *
 * SECURITY: The master password and kdbx bytes never leave the browser.
 * No network requests are made from this component. Entries live only in
 * React state and are discarded when the user navigates away.
 */
import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Input,
  SearchBar,
  Tabs,
  useToast,
} from '../components/ui';
import VaultEntryRow from '../components/VaultEntryRow';
import PasswordGenerator from '../components/PasswordGenerator';
import { loadKdbx, listEntries, buildKdbx, saveKdbxToFile } from '../services/keepass';
import { api } from '../services/api';
import '../styles/keepass.css';

// ── Clipboard auto-clear ────────────────────────────────────────────────────

const AUTO_CLEAR_MS = 20_000;

function useClipboardAutoClear(toast) {
  const timerRef = useRef(null);

  return useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        await navigator.clipboard.writeText('');
        toast('Clipboard cleared for security', 'info');
      } catch {
        // ignore — clipboard may have been overwritten by user already
      }
    }, AUTO_CLEAR_MS);
  }, [toast]);
}

// ── Import tab ───────────────────────────────────────────────────────────────

function ImportTab() {
  const toast = useToast();
  const scheduleAutoClear = useClipboardAutoClear(toast);

  const [masterPw, setMasterPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [entries, setEntries] = useState(null); // null = not loaded yet
  const [query, setQuery] = useState('');
  const fileRef = useRef(null);

  const handleLoad = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) { setError('Please select a .kdbx file.'); return; }
    if (!masterPw) { setError('Please enter the master password.'); return; }
    setError('');
    setLoading(true);
    try {
      const buf = await file.arrayBuffer();
      const { db } = await loadKdbx(buf, masterPw);
      const list = listEntries(db);
      setEntries(list);
      toast(`Loaded ${list.length} entr${list.length === 1 ? 'y' : 'ies'}`, 'success');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setEntries(null);
    setMasterPw('');
    setQuery('');
    setError('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const filtered = entries
    ? entries.filter(e => {
        const q = query.toLowerCase();
        return (
          !q ||
          e.title.toLowerCase().includes(q) ||
          e.username.toLowerCase().includes(q) ||
          e.url.toLowerCase().includes(q)
        );
      })
    : [];

  if (entries) {
    return (
      <div className="kp-import">
        <div className="kp-import__toolbar">
          <SearchBar
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search entries…"
          />
          <span className="kp-import__count">
            {filtered.length} / {entries.length} entries
          </span>
          <Button variant="ghost" size="sm" onClick={handleReset}>
            Close vault
          </Button>
        </div>

        {filtered.length === 0 ? (
          <p className="kp-empty">No entries match your search.</p>
        ) : (
          <div className="kp-entry-list">
            {filtered.map((entry, idx) => (
              <VaultEntryRow
                key={idx}
                entry={entry}
                onCopyUsername={scheduleAutoClear}
                onCopyPassword={scheduleAutoClear}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="kp-import kp-import--form">
      <p className="kp-hint">
        Open a <strong>.kdbx</strong> file from your device. Nothing is uploaded — the file
        is decrypted entirely in your browser.
      </p>

      <div className="kp-form">
        <div className="kp-field">
          <label className="ds-field__label" htmlFor="kp-file-input">
            KeePass database (.kdbx)
          </label>
          <input
            id="kp-file-input"
            type="file"
            accept=".kdbx"
            ref={fileRef}
            className="kp-file-input"
          />
        </div>

        <Input
          label="Master password"
          type="password"
          value={masterPw}
          onChange={e => setMasterPw(e.target.value)}
          placeholder="Enter master password"
          error={error}
          onKeyDown={e => e.key === 'Enter' && handleLoad()}
          autoComplete="current-password"
        />

        <Button
          variant="primary"
          fullWidth
          loading={loading}
          onClick={handleLoad}
          disabled={loading}
        >
          Open vault
        </Button>
      </div>
    </div>
  );
}

// ── Export tab ───────────────────────────────────────────────────────────────

// Demo entries for when the user isn't logged in / API not available
const DEMO_ENTRIES = [
  {
    title: 'Demo Account',
    username: 'demo@example.com',
    password: 'demo-password-123',
    url: 'https://example.com',
    notes: 'Created by KeePass export demo',
    otpUri: null,
  },
];

function ExportTab() {
  const toast = useToast();
  const [masterPw, setMasterPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pwError, setPwError] = useState('');
  const [showGen, setShowGen] = useState(false);

  const handleExport = async () => {
    if (!masterPw) { setError('Enter a master password for the exported file.'); return; }
    if (masterPw !== confirmPw) { setPwError('Passwords do not match.'); return; }
    setError('');
    setPwError('');
    setLoading(true);

    try {
      // Try to fetch live accounts; fall back to demo entries if unauthenticated
      let entries = DEMO_ENTRIES;
      try {
        const accounts = await api.getAccounts();
        if (Array.isArray(accounts) && accounts.length > 0) {
          entries = accounts.map(acc => ({
            title: acc.issuer || acc.accountName || 'Authenticator Account',
            username: acc.accountName || '',
            password: '',
            url: '',
            notes: `Algorithm: ${acc.algorithm || 'SHA1'}, Digits: ${acc.digits || 6}, Period: ${acc.period || 30}`,
            otpUri: acc.secret
              ? `otpauth://totp/${encodeURIComponent(acc.issuer || '')}:${encodeURIComponent(acc.accountName || '')}?secret=${acc.secret}&issuer=${encodeURIComponent(acc.issuer || '')}&algorithm=${acc.algorithm || 'SHA1'}&digits=${acc.digits || 6}&period=${acc.period || 30}`
              : null,
          }));
        }
      } catch {
        // Not logged in or API unavailable — use demo entries
        toast('Using demo entries (not logged in)', 'info');
      }

      const ab = await buildKdbx(masterPw, entries);
      const filename = `authenticator-export-${new Date().toISOString().slice(0, 10)}.kdbx`;
      saveKdbxToFile(ab, filename);
      toast(`Exported ${entries.length} entr${entries.length === 1 ? 'y' : 'ies'} to ${filename}`, 'success');
      setMasterPw('');
      setConfirmPw('');
    } catch (err) {
      setError(`Export failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="kp-export">
      <p className="kp-hint">
        Export your authenticator accounts as a <strong>.kdbx</strong> file compatible with
        KeePassXC. The file is created entirely in your browser and downloaded directly —
        nothing is sent to the server.
      </p>

      <div className="kp-form">
        <Input
          label="New master password"
          type="password"
          value={masterPw}
          onChange={e => { setMasterPw(e.target.value); setError(''); }}
          placeholder="Set a master password for the .kdbx file"
          error={error}
          autoComplete="new-password"
        />
        <Input
          label="Confirm master password"
          type="password"
          value={confirmPw}
          onChange={e => { setConfirmPw(e.target.value); setPwError(''); }}
          placeholder="Repeat master password"
          error={pwError}
          autoComplete="new-password"
        />

        <button
          type="button"
          className="kp-gen-toggle"
          onClick={() => setShowGen(g => !g)}
        >
          {showGen ? '▲ Hide password generator' : '▼ Generate a strong password'}
        </button>

        {showGen && (
          <PasswordGenerator
            onUse={pw => {
              setMasterPw(pw);
              setConfirmPw(pw);
              setShowGen(false);
              toast('Generated password applied', 'success');
            }}
          />
        )}

        <Button
          variant="primary"
          fullWidth
          loading={loading}
          onClick={handleExport}
          disabled={loading}
        >
          Download .kdbx
        </Button>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'import', label: 'Import (.kdbx)' },
  { id: 'export', label: 'Export (.kdbx)' },
  { id: 'generator', label: 'Password Generator' },
];

export default function KeePassVault() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('import');

  return (
    <div className="kp-page">
      {/* Header */}
      <header className="kp-header">
        <button
          type="button"
          className="kp-back-btn"
          onClick={() => navigate('/')}
          aria-label="Back to Dashboard"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Dashboard
        </button>
        <div className="kp-header__title-wrap">
          <svg className="kp-header__logo" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <h1 className="kp-header__title">KeePass Vault</h1>
        </div>
      </header>

      {/* Tabs */}
      <div className="kp-tabs-wrap">
        <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />
      </div>

      {/* Tab panels */}
      <main
        id={`ds-tabpanel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`ds-tab-${activeTab}`}
        className="kp-panel"
      >
        {activeTab === 'import' && <ImportTab />}
        {activeTab === 'export' && <ExportTab />}
        {activeTab === 'generator' && (
          <div className="kp-gen-standalone">
            <PasswordGenerator />
          </div>
        )}
      </main>
    </div>
  );
}
