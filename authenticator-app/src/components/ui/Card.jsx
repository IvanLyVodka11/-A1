/**
 * Card — generic surface container
 *
 * Props:
 *   as        element type (default: 'div')
 *   className string
 *   ...rest   all native element props
 */
export default function Card({ as: Tag = 'div', className = '', ...rest }) {
  const El = Tag;
  return <El className={`ds-card ${className}`.trim()} {...rest} />;
}
