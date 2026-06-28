import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { zkLogin, zkEnroll } from '../services/zkAuth';

export default function ZKLogin() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);
    try {
      const user = await zkLogin(email);
      navigate('/dashboard', { state: { userId: user.id, email: user.email } });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (e) => {
    e.preventDefault();
    clearMessages();
    if (!email) {
      setError('Enter your email first');
      return;
    }
    setLoading(true);
    try {
      const data = await zkEnroll(email);
      setSuccess(data.message || 'Passwordless login set up on this device.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-center">
      <div className="card">
        <div className="card__header">
          <div className="card__icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h1 className="card__title">Passwordless login</h1>
          <p className="card__subtitle">Zero-Knowledge · Schnorr · secp256k1</p>
        </div>

        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px', textAlign: 'center' }}>
          Your secret key is generated on this device and never leaves your browser.
        </p>

        {error && (
          <div className="form-error" style={{ textAlign: 'center', marginBottom: 12 }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ color: 'var(--success)', background: 'var(--success-bg)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: '0.875rem', marginBottom: 12, textAlign: 'center' }}>
            {success}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label" htmlFor="zk-email">Email</label>
            <input
              id="zk-email"
              className="form-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
              disabled={loading}
            />
          </div>

          <button className="btn btn--primary" type="submit" disabled={loading || !email}>
            {loading ? <span className="spinner" /> : 'Sign in passwordless (ZK)'}
          </button>
        </form>

        <button
          className="btn btn--outline"
          style={{ marginTop: 10 }}
          onClick={handleEnroll}
          disabled={loading || !email}
          type="button"
        >
          {loading ? <span className="spinner" /> : 'Set up passwordless for this email'}
        </button>

        <div className="footer-link" style={{ marginTop: 16 }}>
          <a href="#" onClick={e => { e.preventDefault(); navigate('/login'); }}>
            Back to regular sign-in
          </a>
        </div>
      </div>
    </div>
  );
}
