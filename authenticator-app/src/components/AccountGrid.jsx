/**
 * AccountGrid — renders OTP cards in grid or list layout.
 *
 * Props:
 *   accounts       Account[]
 *   displayMode    'grid' | 'list'
 *   showIcons      boolean
 *   manageMode     boolean
 *   selectedIds    string[]
 *   onToggleSelect (id: string) => void
 *   onDelete       (id: string) => void
 */
import OTPCard from './OTPCard';

export default function AccountGrid({
  accounts,
  displayMode = 'grid',
  showIcons = true,
  manageMode = false,
  selectedIds = [],
  onToggleSelect,
  onDelete,
}) {
  return (
    <div className={`account-grid account-grid--${displayMode}`}>
      {accounts.map(account => (
        <OTPCard
          key={account.id}
          account={account}
          showIcon={showIcons}
          selectable={manageMode}
          selected={selectedIds.includes(account.id)}
          onToggleSelect={onToggleSelect}
          onDelete={manageMode ? undefined : onDelete}
        />
      ))}
    </div>
  );
}
