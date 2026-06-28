/**
 * Button — design-system variant
 *
 * Props:
 *   variant    'primary' | 'secondary' | 'danger' | 'outline' | 'ghost'  (default: 'primary')
 *   size       'sm' | 'md' | 'lg'                                         (default: 'md')
 *   loading    boolean — shows spinner + disables interaction              (default: false)
 *   icon       ReactNode — rendered before label                           (default: undefined)
 *   fullWidth  boolean                                                     (default: false)
 *   ...rest    all native <button> props (type, onClick, disabled, etc.)
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  fullWidth = false,
  className = '',
  children,
  disabled,
  ...rest
}) {
  const classes = [
    'ds-btn',
    `ds-btn--${variant}`,
    `ds-btn--${size}`,
    fullWidth ? 'ds-btn--full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <span className="ds-btn__spinner" aria-hidden="true" />
      ) : (
        icon && <span className="ds-btn__icon" aria-hidden="true">{icon}</span>
      )}
      {children}
    </button>
  );
}
