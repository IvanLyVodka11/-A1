import { useNavigate, useLocation } from 'react-router-dom';

export default function DemoDashboard() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { email } = state || {};

  if (!email) {
    navigate('/login');
    return null;
  }

  return (
    <div className="page-center">
      <div className="card" style={{ maxWidth: 460 }}>
        <div className="dashboard">
          <div className="dashboard__header">
            <div>
              <p className="dashboard__welcome">Welcome back</p>
              <p className="dashboard__email">{email}</p>
            </div>
            <span className="badge badge--success">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
              2FA Active
            </span>
          </div>

          <div className="status-card" style={{ textAlign: 'center' }}>
            <div className="status-card__icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>
              </svg>
            </div>
            <h2 className="status-card__title">Login successful</h2>
            <p className="status-card__text">
              Authentication verified with Two-Factor Authentication.
            </p>
          </div>

          <div className="status-card">
            <h3 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 10 }}>How it worked:</h3>
            <ol className="info-list">
              <li>Credentials verified (email + password)</li>
              <li>Server requested OTP verification</li>
              <li>Code entered from Authenticator app</li>
              <li>Access granted after server validation</li>
            </ol>
          </div>

          <button className="btn btn--danger" onClick={() => navigate('/login')} style={{ marginTop: 16 }}>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
