/**
 * AppShell — top bar (brand + centered search + actions + theme toggle),
 * scrollable content, and an optional fixed bottom action bar (2FAuth style).
 *
 * Props:
 *   brand           string — left-side label
 *   search          string — search value (only rendered if onSearchChange given)
 *   onSearchChange  (e) => void
 *   searchPlaceholder string
 *   leading         ReactNode — node shown before the brand (e.g. back button)
 *   actions         ReactNode — extra header actions (right side, before theme toggle)
 *   bottomBar       ReactNode — fixed bottom bar content
 *   children        ReactNode
 */
import { SearchBar, IconButton, useTheme } from './ui';

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export default function AppShell({
  brand = 'Authenticator',
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  leading,
  actions,
  bottomBar,
  children,
}) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__lead">
          {leading}
          <span className="app-header__brand">{brand}</span>
        </div>
        {onSearchChange !== undefined && (
          <div className="app-header__search">
            <SearchBar value={search} onChange={onSearchChange} placeholder={searchPlaceholder} />
          </div>
        )}
        <div className="app-header__actions">
          {actions}
          <IconButton
            label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            icon={theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            onClick={toggleTheme}
          />
        </div>
      </header>

      <main className="app-main">{children}</main>

      {bottomBar && <div className="app-bottom-bar">{bottomBar}</div>}
    </div>
  );
}
