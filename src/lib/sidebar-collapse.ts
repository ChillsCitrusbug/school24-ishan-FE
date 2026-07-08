const STORAGE_KEY = 'school24_sidebar_collapsed'

/** A UI layout preference, not session/security-sensitive data — unlike
 * the access token (sessionStorage, cleared on browser close), this
 * uses localStorage so the collapsed/expanded choice persists across
 * browser restarts, matching how most desktop apps remember panel
 * state. Shared by every role via the one `Sidebar` component. */
export function getSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

export function setSidebarCollapsed(collapsed: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, collapsed ? 'true' : 'false')
  } catch {
    // Ignore — collapse state degrades to session-only (in-memory
    // React state still works even if persistence itself fails).
  }
}
