/**
 * Input — labelled text field with optional leading icon and error state
 *
 * Props:
 *   label   string
 *   error   string — error message; triggers aria-invalid + role=alert text
 *   icon    ReactNode — leading icon
 *   id      string — auto-generated if omitted
 *   ...rest all native <input> props
 */
import { useId } from 'react';

export default function Input({ label, error, icon, className = '', id: idProp, ...rest }) {
  const autoId = useId();
  const id = idProp || autoId;
  const errorId = `${id}-error`;

  return (
    <div className="ds-field">
      {label && (
        <label className="ds-field__label" htmlFor={id}>
          {label}
        </label>
      )}
      <div className="ds-field__wrap">
        {icon && (
          <span className="ds-field__icon" aria-hidden="true">
            {icon}
          </span>
        )}
        <input
          id={id}
          className={[
            'ds-field__input',
            icon ? 'ds-field__input--with-icon' : '',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? errorId : undefined}
          {...rest}
        />
      </div>
      {error && (
        <span id={errorId} className="ds-field__error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
