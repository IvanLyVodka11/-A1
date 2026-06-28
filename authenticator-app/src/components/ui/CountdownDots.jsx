/**
 * CountdownDots — row of dots representing TOTP time remaining
 * Matches 2FAuth visual style.
 *
 * Props:
 *   total      number — total period in seconds  (default: 30)
 *   remaining  number — seconds left
 *
 * Color logic:
 *   remaining > 10  → accent (blue)
 *   remaining <= 10 → warning (amber)
 *   remaining <= 5  → danger  (red)
 */
export default function CountdownDots({ total = 30, remaining }) {
  const dotCount = Math.min(total, 30); // cap visual dots at 30

  // How many dots should be "active" (filled)
  const activeDots = Math.round((remaining / total) * dotCount);

  let colorClass = '';
  if (remaining <= 5) colorClass = 'ds-countdown-dot--danger';
  else if (remaining <= 10) colorClass = 'ds-countdown-dot--warning';

  return (
    <div
      className="ds-countdown-dots"
      role="timer"
      aria-label={`${remaining} seconds remaining`}
      aria-live="off"
    >
      {Array.from({ length: dotCount }, (_, i) => {
        const isActive = i < activeDots;
        return (
          <span
            key={i}
            className={[
              'ds-countdown-dot',
              isActive ? colorClass : 'ds-countdown-dot--inactive',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-hidden="true"
          />
        );
      })}
    </div>
  );
}
