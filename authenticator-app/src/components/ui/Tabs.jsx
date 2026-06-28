/**
 * Tabs — ARIA tablist pattern with ArrowLeft/Right keyboard navigation
 *
 * Props:
 *   tabs     Array<{ id: string, label: string }>
 *   active   string — id of active tab
 *   onChange (id: string) => void
 */
export default function Tabs({ tabs = [], active, onChange }) {
  const handleKeyDown = (e, index) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = (index + 1) % tabs.length;
      onChange(tabs[next].id);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prev = (index - 1 + tabs.length) % tabs.length;
      onChange(tabs[prev].id);
    } else if (e.key === 'Home') {
      e.preventDefault();
      onChange(tabs[0].id);
    } else if (e.key === 'End') {
      e.preventDefault();
      onChange(tabs[tabs.length - 1].id);
    }
  };

  return (
    <div className="ds-tabs" role="tablist">
      {tabs.map((tab, i) => (
        <button
          key={tab.id}
          role="tab"
          id={`ds-tab-${tab.id}`}
          aria-selected={active === tab.id}
          aria-controls={`ds-tabpanel-${tab.id}`}
          tabIndex={active === tab.id ? 0 : -1}
          className="ds-tab"
          onClick={() => onChange(tab.id)}
          onKeyDown={(e) => handleKeyDown(e, i)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
