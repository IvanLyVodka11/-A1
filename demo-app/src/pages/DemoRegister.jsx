import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { demoRegister, demoSetup2FA } from '../services/api';

export default function DemoRegister() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [qrData, setQrData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await demoRegister(email, password);
      const faData = await demoSetup2FA(data.userId, email);
      setQrData(faData);
      setStep(2);
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
          <div className={`step ${step >= 1 ? 'step--active' : ''} ${step > 1 ? 'step--done' : ''}`}>1</div>
          <div className={`step-line ${step > 1 ? 'step-line--done' : ''}`} />
          <div className={`step ${step >= 2 ? 'step--active' : ''}`}>2</div>
        </div>

        {step === 1 && (
          <>
            <div className="card__header">
              <div className="card__icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
                </svg>
              </div>
              <h1 className="card__title">Create account</h1>
              <p className="card__subtitle">Sign up to try 2FA authentication</p>
            </div>

            {error && (
              <div className="form-error" style={{ textAlign: 'center', marginBottom: 12 }}>
                {error}
              </div>
            )}

            <form onSubmit={handleRegister}>
              <div className="form-group">
                <label className="form-label" htmlFor="demo-email">Email</label>
                <input
                  id="demo-email"
                  className="form-input"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="demo-password">Password</label>
                <input
                  id="demo-password"
                  className="form-input"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Create password"
                  required
                />
              </div>
              <button className="btn btn--primary" type="submit" disabled={loading}>
                {loading ? <span className="spinner" /> : 'Continue'}
              </button>
            </form>

            <div className="footer-link">
              Have an account? <a href="#" onClick={(e) => { e.preventDefault(); navigate('/login'); }}>Sign in</a>
            </div>
          </>
        )}

        {step === 2 && qrData && (
          <>
            <div className="card__header">
              <div className="card__icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
                </svg>
              </div>
              <h1 className="card__title">Setup 2FA</h1>
              <p className="card__subtitle">
                Scan the QR code with your <strong>Authenticator App</strong>
              </p>
            </div>

            <div className="qr-section">
              <img src={qrData.qrCode} alt="QR Code" className="qr-image" />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                Or enter this key manually:
              </p>
              <div className="secret-display">{qrData.secret}</div>
            </div>

            <button
              className="btn btn--primary"
              onClick={() => navigate('/login')}
              style={{ marginTop: 12 }}
            >
              Done — Go to Login
            </button>
          </>
        )}
      </div>
    </div>
  );
}
