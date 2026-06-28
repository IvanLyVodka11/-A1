import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { saveAccountsOffline, getAccountsOffline } from '../services/idb';
import AccountGrid from '../components/AccountGrid';
import ManageBar from '../components/ManageBar';
import AddAccount from '../components/AddAccount';
import AppShell from '../components/AppShell';
import { Button, IconButton, useToast } from '../components/ui';
import { getDisplayMode, getShowIcons } from '../services/displayPrefs';

function SettingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}
function VaultIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="12" cy="12" r="3" /><path d="M12 15v3" />
    </svg>
  );
}
function LogoutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}
function QrIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><path d="M14 14h3v3h-3zM21 14v7M14 21h7" />
    </svg>
  );
}

export default function Dashboard() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState('');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [search, setSearch] = useState('');
  const [manageMode, setManageMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const navigate = useNavigate();
  const toast = useToast();

  const displayMode = getDisplayMode();
  const showIcons = getShowIcons();

  const loadAccounts = useCallback(async () => {
    try {
      setLoading(true);
      if (!navigator.onLine) throw new Error('Offline');
      const data = await api.getAccounts();
      const list = data.accounts || [];
      setAccounts(list);
      await saveAccountsOffline(list);
      setError('');
    } catch (err) {
      if (err.message === 'Session expired') {
        navigate('/login');
      } else {
        const offline = await getAccountsOffline();
        if (offline.length > 0) {
          setAccounts(offline);
          setIsOffline(true);
        } else {
          setError(
            err.message === 'Failed to fetch' || err.message === 'Offline'
              ? 'Offline. No cached accounts.'
              : err.message
          );
        }
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    // Fetch on mount; reconnect handler refetches. Loading state is set intentionally.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAccounts();
    const handleOnline = () => { setIsOffline(false); loadAccounts(); };
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [loadAccounts]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter(
      a => (a.issuer || '').toLowerCase().includes(q) || (a.accountName || '').toLowerCase().includes(q)
    );
  }, [accounts, search]);

  const handleAccountAdded = (newAccount) => {
    setAccounts(prev => [newAccount, ...prev]);
    setShowAddModal(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this account?')) return;
    try {
      await api.deleteAccount(id);
      setAccounts(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const selectAll = () => setSelectedIds(filtered.map(a => a.id));
  const deselectAll = () => setSelectedIds([]);

  const deleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Delete ${selectedIds.length} account(s)?`)) return;
    const ids = [...selectedIds];
    for (const id of ids) {
      try { await api.deleteAccount(id); } catch { /* keep going */ }
    }
    setAccounts(prev => prev.filter(a => !ids.includes(a.id)));
    setSelectedIds([]);
    setManageMode(false);
    toast('Deleted', 'success');
  };

  const exitManage = () => { setManageMode(false); setSelectedIds([]); };

  const handleLogout = () => {
    api.clearTokens();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Loading…</p>
      </div>
    );
  }

  const headerActions = (
    <>
      {isOffline && <span className="offline-badge">OFFLINE</span>}
      <IconButton label="Passwords (KeePass)" icon={<VaultIcon />} onClick={() => navigate('/vault')} />
      <IconButton label="Settings" icon={<SettingsIcon />} onClick={() => navigate('/settings')} />
      <IconButton label="Sign out" icon={<LogoutIcon />} onClick={handleLogout} />
    </>
  );

  const bottomBar = manageMode ? (
    <ManageBar
      selectedIds={selectedIds}
      totalCount={filtered.length}
      onSelectAll={selectAll}
      onDeselectAll={deselectAll}
      onDeleteSelected={deleteSelected}
      onDone={exitManage}
    />
  ) : (
    <>
      <Button variant="primary" icon={<QrIcon />} onClick={() => setShowAddModal(true)}>New</Button>
      <Button variant="secondary" onClick={() => setManageMode(true)} disabled={accounts.length === 0}>Manage</Button>
    </>
  );

  return (
    <AppShell
      brand="Authenticator"
      search={search}
      onSearchChange={(e) => setSearch(e.target.value)}
      searchPlaceholder="Search accounts…"
      actions={headerActions}
      bottomBar={bottomBar}
    >
      {error && (
        <div className="card" style={{ marginBottom: 14, borderColor: 'var(--color-danger)' }}>
          <p style={{ color: 'var(--color-danger)', fontSize: '0.85rem' }}>{error}</p>
        </div>
      )}

      {accounts.length === 0 ? (
        <div className="empty-state animate-fadeInUp">
          <div className="empty-state__icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3 }}>
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </div>
          <h2 className="empty-state__title">Empty vault</h2>
          <p className="empty-state__text">Add accounts by scanning a QR code or entering a secret key.</p>
          <Button variant="primary" icon={<QrIcon />} onClick={() => setShowAddModal(true)}>Add account</Button>
        </div>
      ) : filtered.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', marginTop: 40 }}>
          No accounts match “{search}”.
        </p>
      ) : (
        <AccountGrid
          accounts={filtered}
          displayMode={displayMode}
          showIcons={showIcons}
          manageMode={manageMode}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onDelete={handleDelete}
        />
      )}

      {showAddModal && (
        <AddAccount onAccountAdded={handleAccountAdded} onClose={() => setShowAddModal(false)} />
      )}
    </AppShell>
  );
}
