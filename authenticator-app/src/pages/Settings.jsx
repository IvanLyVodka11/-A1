import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import AppShell from '../components/AppShell';
import { Tabs, Toggle, Button, IconButton, useTheme, useToast } from '../components/ui';
import {
  getDisplayMode, setDisplayMode,
  getShowIcons, setShowIcons,
} from '../services/displayPrefs';

function BackIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

export default function Settings() {
  const [tab, setTab] = useState('options');
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();
  const { theme, setTheme } = useTheme();

  const [listView, setListView] = useState(getDisplayMode() === 'list');
  const [icons, setIcons] = useState(getShowIcons());

  const loadBackups = useCallback(async () => {
    try {
      const data = await api.getBackups();
      setBackups(data.backups || []);
    } catch {
      /* ignore — offline or none */
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadBackups();
  }, [loadBackups]);

  const onListView = (v) => { setListView(v); setDisplayMode(v ? 'list' : 'grid'); };
  const onIcons = (v) => { setIcons(v); setShowIcons(v); };
  const onDark = (v) => setTheme(v ? 'dark' : 'light');

  const handleCreateBackup = async () => {
    setLoading(true);
    try {
      const data = await api.createBackup();
      toast(`Backup created (${data.backup.accountCount} accounts)`, 'success');
      loadBackups();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (id) => {
    if (!confirm('This will replace all current accounts. Continue?')) return;
    setLoading(true);
    try {
      const data = await api.restoreBackup(id);
      toast(`Restored ${data.restoredAccounts} accounts`, 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (id) => {
    try {
      const data = await api.downloadBackup(id);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `authenticator-backup-${id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const handleSignOut = () => {
    if (confirm('Log out?')) {
      api.clearTokens();
      navigate('/login');
    }
  };

  return (
    <AppShell
      brand="Settings"
      leading={<IconButton label="Back" icon={<BackIcon />} onClick={() => navigate('/')} />}
    >
      <Tabs
        tabs={[{ id: 'options', label: 'Options' }, { id: 'account', label: 'Account' }]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'options' && (
        <div className="settings-panel" role="tabpanel">
          <div className="settings-row">
            <div>
              <div className="settings-row__label">Dark mode</div>
              <div className="settings-row__hint">Switch between light and dark theme</div>
            </div>
            <Toggle checked={theme === 'dark'} onChange={onDark} label="" />
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-row__label">List view</div>
              <div className="settings-row__hint">Show accounts as a list instead of a grid</div>
            </div>
            <Toggle checked={listView} onChange={onListView} label="" />
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-row__label">Show icons</div>
              <div className="settings-row__hint">Display service brand icons</div>
            </div>
            <Toggle checked={icons} onChange={onIcons} label="" />
          </div>
        </div>
      )}

      {tab === 'account' && (
        <div className="settings-panel" role="tabpanel">
          <div>
            <h3 className="section-title">Backup</h3>
            <Button variant="primary" fullWidth loading={loading} onClick={handleCreateBackup}>
              Create backup
            </Button>
          </div>

          {backups.length > 0 && (
            <div className="settings-list">
              <h3 className="section-title">Previous backups</h3>
              {backups.map((b) => (
                <div key={b.id} className="settings-row">
                  <div>
                    <div className="settings-row__label">Backup #{b.id}</div>
                    <div className="settings-row__hint">{new Date(b.created_at).toLocaleString()}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button variant="secondary" size="sm" onClick={() => handleDownload(b.id)}>Download</Button>
                    <Button variant="outline" size="sm" onClick={() => handleRestore(b.id)}>Restore</Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div>
            <h3 className="section-title" style={{ color: 'var(--color-danger)' }}>Account</h3>
            <Button variant="danger" fullWidth onClick={handleSignOut}>Sign out</Button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
