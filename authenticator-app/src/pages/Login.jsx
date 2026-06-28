import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card animate-fadeInUp">
        <div className="auth-header">
          <div className="auth-header__logo">VAULT</div>
          <h1 className="auth-header__title">Sign in</h1>
          <p className="auth-header__subtitle">Access your vault</p>
        </div>

        {error && (
          <div className="form-error" style={{ textAlign: 'center', marginBottom: 14 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
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

          <button className="btn btn--primary" style={{ width: '100%', marginTop: 8 }} type="submit" disabled={loading}>
            {loading ? <span className="spinner" /> : 'Continue'}
          </button>
        </form>

        <div className="auth-footer">
          No account? <Link to="/register">Create one</Link>
        </div>
      </div>
    </div>
  );
}
