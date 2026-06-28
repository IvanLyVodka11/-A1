import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { demoVerifyOTP } from '../services/api';

export default function VerifyOTP() {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const inputRefs = useRef([]);
  const navigate = useNavigate();
  const { state } = useLocation();
  const { userId } = state || {};

  useEffect(() => {
    if (!userId) navigate('/login');
    inputRefs.current[0]?.focus();
  }, [userId, navigate]);

  const handleChange = (i, val) => {
    if (!/^\d*$/.test(val)) return;
    const d = [...digits];
    d[i] = val.slice(-1);
    setDigits(d);
    if (val && i < 5) inputRefs.current[i + 1]?.focus();
    if (d.every(x => x !== '')) handleVerify(d.join(''));
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) inputRefs.current[i - 1]?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (p.length === 6) { setDigits(p.split('')); handleVerify(p); }
  };

  const handleVerify = async (code) => {
    setError('');
    setLoading(true);
    try {
      const data = await demoVerifyOTP(userId, code);
      if (data.verified) {
        setSuccess(true);
        setTimeout(() => navigate('/dashboard', { state: { userId: data.user.id, email: data.user.email } }), 1200);
      }
    } catch (err) {
      setError(err.message || 'Invalid code');
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-center">
      <div className="card">
        <div className="steps">
          <div className="step step--done">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
          </div>
          <div className={`step-line ${success ? 'step-line--done' : ''}`} />
          <div className={`step ${success ? 'step--done' : 'step--active'}`}>
            {success ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            ) : '2'}
          </div>
        </div>

        <div className="card__header">
          <div className="card__icon">
            {success ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
              </svg>
            )}
          </div>
          <h1 className="card__title">{success ? 'Verified' : 'Enter code'}</h1>
          <p className="card__subtitle">
            {success ? 'Redirecting...' : 'Open your authenticator app'}
          </p>
        </div>

        {error && (
          <div className="form-error" style={{ textAlign: 'center', marginBottom: 12 }}>
            {error}
          </div>
        )}

        {!success && (
          <>
            <div className="otp-inputs" onPaste={handlePaste}>
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={el => inputRefs.current[i] = el}
                  className="otp-digit"
                  type="text"
                  inputMode="numeric"
                  maxLength="1"
                  value={d}
                  onChange={e => handleChange(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  disabled={loading}
                  autoComplete="off"
                />
              ))}
            </div>

            {loading && (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                <span className="spinner" />
              </div>
            )}

            <button className="btn btn--outline" onClick={() => navigate('/login')} style={{ marginTop: 8 }}>
              Back to login
            </button>
          </>
        )}
      </div>
    </div>
  );
}
