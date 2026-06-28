import { useState, useEffect, useCallback } from 'react';
import { generateOTP, getRemainingSeconds, formatOTP } from '../services/otp';
import { CountdownDots, useToast } from './ui';
import BrandIcon from './BrandIcon';

/**
 * OTPCard — one account row: brand icon + issuer/account + OTP code + countdown dots.
 * Click copies the code. In manage mode it acts as a selection toggle.
 *
 * Props:
 *   account        { id, issuer, accountName, secret, algorithm, digits, period }
 *   showIcon       boolean
 *   selectable     boolean — manage mode
 *   selected       boolean
 *   onToggleSelect (id) => void
 *   onDelete       (id) => void
 */
export default function OTPCard({
  account,
  showIcon = true,
  selectable = false,
  selected = false,
  onToggleSelect,
  onDelete,
}) {
  const period = account.period || 30;
  const toast = useToast();

  const computeOTP = useCallback(
    () => generateOTP(account.secret, {
      algorithm: account.algorithm,
      digits: account.digits,
      period,
    }),
    [account.secret, account.algorithm, account.digits, period]
  );

  // Lazy initial values keep the first render correct without a setState in the effect.
  const [otp, setOtp] = useState(computeOTP);
  const [remaining, setRemaining] = useState(() => getRemainingSeconds(period));

  useEffect(() => {
    const id = setInterval(() => {
      const r = getRemainingSeconds(period);
      setRemaining(r);
      if (r === period) setOtp(computeOTP());
    }, 1000);
    return () => clearInterval(id);
  }, [computeOTP, period]);

  const handleActivate = async () => {
    if (selectable) {
      onToggleSelect?.(account.id);
      return;
    }
    try {
      await navigator.clipboard.writeText(otp);
      toast('Copied code', 'success');
    } catch {
      toast('Copy failed', 'error');
    }
  };

  return (
    <div
      className={`otp-item${selected ? ' otp-item--selected' : ''}`}
      onClick={handleActivate}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleActivate();
        }
      }}
    >
      {selectable && (
        <input
          type="checkbox"
          className="otp-item__check"
          checked={selected}
          onChange={() => onToggleSelect?.(account.id)}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Select ${account.issuer || account.accountName}`}
        />
      )}

      {showIcon && <BrandIcon issuer={account.issuer || account.accountName || '?'} />}

      <div className="otp-item__info">
        <div className="otp-item__issuer">{account.issuer || 'Unknown'}</div>
        <div className="otp-item__account">{account.accountName}</div>
      </div>

      <div className="otp-item__right">
        <div className="otp-item__code">{formatOTP(otp)}</div>
        <CountdownDots total={period} remaining={remaining} />
      </div>

      {onDelete && !selectable && (
        <button
          className="otp-item__delete"
          onClick={(e) => { e.stopPropagation(); onDelete(account.id); }}
          aria-label="Delete account"
          title="Delete"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
          </svg>
        </button>
      )}
    </div>
  );
}
