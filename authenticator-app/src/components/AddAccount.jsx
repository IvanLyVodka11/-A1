import { useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { api } from '../services/api';

/**
 * AddAccount - Form to add a new OTP account via QR scan or manual entry.
 */
export default function AddAccount({ onAccountAdded, onClose }) {
  const [tab, setTab] = useState('qr'); // 'qr' or 'manual'
  const [scanning, setScanning] = useState(false);
  const [formData, setFormData] = useState({
    issuer: '',
    accountName: '',
    secret: '',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const scannerRef = useRef(null);
  const html5QrRef = useRef(null);

  // ── QR Scanning ──
  const startScanner = async () => {
    try {
      setScanning(true);
      setError('');
      
      const html5Qr = new Html5Qrcode('qr-reader');
      html5QrRef.current = html5Qr;

      await html5Qr.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          handleQRResult(decodedText);
          stopScanner();
        },
        () => {} // ignore errors during scanning
      );
    } catch {
      setError('Camera access denied or not available. Use manual entry.');
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    if (html5QrRef.current) {
      try {
        await html5QrRef.current.stop();
      } catch { /* already stopped */ }
      html5QrRef.current = null;
    }
    setScanning(false);
  };

  const handleQRResult = (uri) => {
    if (uri.startsWith('otpauth://')) {
      handleSubmit(null, uri);
    } else {
      setError('Invalid QR code. Expected an otpauth:// URI.');
    }
  };

  // ── Manual Form ──
  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e, uri = null) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = uri
        ? { uri }
        : {
            issuer: formData.issuer,
            accountName: formData.accountName,
            secret: formData.secret.replace(/\s/g, '').toUpperCase(),
            algorithm: formData.algorithm,
            digits: parseInt(formData.digits),
            period: parseInt(formData.period),
          };

      if (!uri && !payload.secret) {
        setError('Secret key is required');
        setLoading(false);
        return;
      }

      if (!uri && !payload.accountName) {
        setError('Account name is required');
        setLoading(false);
        return;
      }

      const data = await api.addAccount(payload);
      onAccountAdded(data.account);
    } catch (err) {
      setError(err.message || 'Failed to add account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal animate-fadeInUp" onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <h2 className="modal__title">Add Account</h2>
          <button className="btn btn--ghost btn--icon" onClick={() => { stopScanner(); onClose(); }}>✕</button>
        </div>

        {/* Tabs */}
        <div className="tabs">
          <button
            className={`tab ${tab === 'qr' ? 'tab--active' : ''}`}
            onClick={() => { setTab('qr'); stopScanner(); }}
          >
            📷 Scan QR
          </button>
          <button
            className={`tab ${tab === 'manual' ? 'tab--active' : ''}`}
            onClick={() => { setTab('manual'); stopScanner(); }}
          >
            ⌨️ Manual
          </button>
        </div>

        {error && <div className="form-error" style={{ marginBottom: 16 }}>⚠️ {error}</div>}

        {/* QR Tab */}
        {tab === 'qr' && (
          <div style={{ textAlign: 'center' }}>
            <div id="qr-reader" ref={scannerRef} className="qr-scanner-container" />
            {!scanning ? (
              <button className="btn btn--primary btn--full" onClick={startScanner} style={{ marginTop: 16 }}>
                📷 Start Camera
              </button>
            ) : (
              <button className="btn btn--secondary btn--full" onClick={stopScanner} style={{ marginTop: 16 }}>
                Stop Scanning
              </button>
            )}
            <p style={{ marginTop: 12, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Point your camera at the QR code from the service you want to add.
            </p>
          </div>
        )}

        {/* Manual Tab */}
        {tab === 'manual' && (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Service Name (Issuer)</label>
              <input
                className="form-input"
                name="issuer"
                value={formData.issuer}
                onChange={handleChange}
                placeholder="e.g. Google, GitHub, Facebook"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Account Name *</label>
              <input
                className="form-input"
                name="accountName"
                value={formData.accountName}
                onChange={handleChange}
                placeholder="e.g. user@example.com"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Secret Key *</label>
              <input
                className="form-input"
                name="secret"
                value={formData.secret}
                onChange={handleChange}
                placeholder="e.g. JBSWY3DPEHPK3PXP"
                style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}
                required
              />
            </div>

            <details style={{ marginBottom: 20 }}>
              <summary style={{ cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Advanced Options
              </summary>
              <div style={{ paddingTop: 12, display: 'flex', gap: 12 }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Algorithm</label>
                  <select className="form-input" name="algorithm" value={formData.algorithm} onChange={handleChange}>
                    <option value="SHA1">SHA1</option>
                    <option value="SHA256">SHA256</option>
                    <option value="SHA512">SHA512</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Digits</label>
                  <select className="form-input" name="digits" value={formData.digits} onChange={handleChange}>
                    <option value={6}>6</option>
                    <option value={8}>8</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Period</label>
                  <select className="form-input" name="period" value={formData.period} onChange={handleChange}>
                    <option value={30}>30s</option>
                    <option value={60}>60s</option>
                  </select>
                </div>
              </div>
            </details>

            <button className="btn btn--primary btn--full" type="submit" disabled={loading}>
              {loading ? <span className="spinner" /> : '+ Add Account'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
