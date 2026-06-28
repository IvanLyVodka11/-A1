/**
 * Select — styled native <select>
 *
 * Props:
 *   value     string
 *   onChange  (e) => void  OR  (value: string) => void
 *   options   Array<{ value: string, label: string }>
 *   label     string
 *   id        string
 */
import { useId } from 'react';

function ChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export default function Select({ value, onChange, options = [], label, id: idProp }) {
  const autoId = useId();
  const id = idProp || autoId;

  const handleChange = (e) => {
    // Support both raw event handlers and value-only callbacks
    if (typeof onChange === 'function') {
      onChange(e);
    }
  };

  return (
    <div className="ds-select-field">
      {label && (
        <label className="ds-select-field__label" htmlFor={id}>
          {label}
        </label>
      )}
      <div className="ds-select-wrap">
        <select
          id={id}
          className="ds-select"
          value={value}
          onChange={handleChange}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className="ds-select-wrap__arrow" aria-hidden="true">
          <ChevronIcon />
        </span>
      </div>
    </div>
  );
}
