/**
 * IconButton — square icon-only button
 *
 * Props:
 *   icon   ReactNode (required)
 *   label  string — sets aria-label + title (required for a11y)
 *   ...rest all native <button> props
 */
export default function IconButton({ icon, label, className = '', ...rest }) {
  return (
    <button
      type="button"
      className={`ds-icon-btn ${className}`.trim()}
      aria-label={label}
      title={label}
      {...rest}
    >
      {icon}
    </button>
  );
}
