/**
 * Toggle — accessible switch (role=switch)
 *
 * Props:
 *   checked   boolean
 *   onChange  (checked: boolean) => void
 *   label     string — visible label text
 *   id        string
 */
import { useId } from 'react';

export default function Toggle({ checked, onChange, label, id: idProp }) {
  const autoId = useId();
  const id = idProp || autoId;

  const handleKeyDown = (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onChange(!checked);
    }
  };

  return (
    <label className="ds-toggle" htmlFor={id}>
      <span
        id={id}
        role="switch"
        aria-checked={checked}
        tabIndex={0}
        className="ds-toggle__track"
        onClick={() => onChange(!checked)}
        onKeyDown={handleKeyDown}
      >
        <span className="ds-toggle__thumb" />
      </span>
      {label && <span className="ds-toggle__label">{label}</span>}
    </label>
  );
}
