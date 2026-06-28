/**
 * displayPrefs — localStorage persistence for display preferences
 *
 * Keys:
 *   displayMode  'grid' | 'list'
 *   showIcons    bool
 */

const KEY_MODE  = 'displayMode';
const KEY_ICONS = 'showIcons';

export function getDisplayMode() {
  return localStorage.getItem(KEY_MODE) || 'grid';
}

export function setDisplayMode(mode) {
  localStorage.setItem(KEY_MODE, mode);
}

export function getShowIcons() {
  const v = localStorage.getItem(KEY_ICONS);
  return v === null ? true : v === 'true';
}

export function setShowIcons(val) {
  localStorage.setItem(KEY_ICONS, String(val));
}
