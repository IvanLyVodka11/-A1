/**
 * ManageBar — shown when manage mode is active.
 * Displays selection count + bulk Delete + Done button.
 *
 * Props:
 *   selectedIds   string[]
 *   totalCount    number
 *   onSelectAll   () => void
 *   onDeselectAll () => void
 *   onDeleteSelected () => void
 *   onDone        () => void
 */
import { Button } from './ui';

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14H6L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4h6v2"/>
    </svg>
  );
}

export default function ManageBar({
  selectedIds,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onDeleteSelected,
  onDone,
}) {
  const count = selectedIds.length;
  const allSelected = count === totalCount && totalCount > 0;

  return (
    <div className="manage-bar">
      <button
        type="button"
        className="manage-bar__select-all"
        onClick={allSelected ? onDeselectAll : onSelectAll}
      >
        {allSelected ? 'Deselect all' : `Select all (${totalCount})`}
      </button>

      <span className="manage-bar__count">
        {count > 0 ? `${count} selected` : 'None selected'}
      </span>

      <div className="manage-bar__actions">
        <Button
          variant="danger"
          size="sm"
          icon={<TrashIcon />}
          disabled={count === 0}
          onClick={onDeleteSelected}
        >
          Delete
        </Button>
        <Button variant="secondary" size="sm" onClick={onDone}>
          Done
        </Button>
      </div>
    </div>
  );
}
