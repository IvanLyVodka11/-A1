import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { demoLogin } from '../services/api';

export default function DemoLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await demoLogin(email, password);

      if (data.requires2FA) {
        navigate('/verify', { state: { userId: data.userId, email } });
      } else {
        navigate('/dashboard', { state: { userId: data.userId, email: data.email } });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-center">
      <div className="card">
        <div className="steps">
          <div className="step step--active">1</div>
          <div className="step-line" />
          <div className="step">2</div>
        </div>

        <div className="card__header">
          <div className="card__icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <h1 className="card__title">Sign in</h1>
          <p className="card__subtitle">Access your account</p>
        </div>

        {error && (
          <div className="form-error" style={{ textAlign: 'center', marginBottom: 12 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">Email</label>
            <input
              id="login-email"
              className="form-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="login-password">Password</label>
            <input
              id="login-password"
              className="form-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
          </div>
          <button className="btn btn--primary" type="submit" disabled={loading}>
            {loading ? <span className="spinner" /> : 'Continue'}
          </button>
        </form>

        <div className="footer-link">
          No account? <a href="#" onClick={(e) => { e.preventDefault(); navigate('/register'); }}>Create one</a>
        </div>
        <div className="footer-link" style={{ marginTop: 8 }}>
          <a href="#" onClick={(e) => { e.preventDefault(); navigate('/zk-login'); }}>Sign in without a password (ZK)</a>
        </div>
      </div>
    </div>
  );
}
