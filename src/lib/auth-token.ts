/**
 * Access-token store, backed by `sessionStorage`.
 *
 * Direct product decision (2026-07-08), overriding the project's own
 * prior in-memory-only policy (`agents/frontend.md`: "Keep auth access
 * tokens in memory only — do not use localStorage for access tokens"):
 * a refresh must not sign the user out. `sessionStorage` (never
 * `localStorage`) was the explicitly chosen middle ground — it
 * survives a page refresh but clears when the tab/window closes and
 * is never shared across tabs, unlike `localStorage`. The fully secure
 * alternative (an HttpOnly-cookie-backed refresh-token system) was
 * explicitly declined as out of scope for this pass.
 *
 * `beginRehydration`/`endRehydration`/`isRehydratingSession` exist for
 * `api/client.ts`'s own 401 interceptor: on boot, `AuthProvider` and
 * `StudentAuthProvider` each try their own "who am I" call against a
 * persisted token — at most ONE succeeds (a Student token 401s against
 * the User "me" endpoint and vice versa), and that expected 401 must
 * NOT be treated as a real session-expiry (which would otherwise clear
 * the token and redirect to `/session-expired`, wiping out the OTHER
 * provider's still-valid rehydration attempt).
 */

const STORAGE_KEY = 'school24_access_token'

export function getAccessToken(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function setAccessToken(token: string | null): void {
  try {
    if (token) {
      sessionStorage.setItem(STORAGE_KEY, token)
    } else {
      sessionStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // sessionStorage unavailable (private-browsing quota, etc.) — the
    // in-flight session still works, it just won't survive a refresh.
  }
}

export function clearAccessToken(): void {
  setAccessToken(null)
}

let rehydratingCount = 0

export function beginRehydration(): void {
  rehydratingCount += 1
}

export function endRehydration(): void {
  rehydratingCount = Math.max(0, rehydratingCount - 1)
}

export function isRehydratingSession(): boolean {
  return rehydratingCount > 0
}
