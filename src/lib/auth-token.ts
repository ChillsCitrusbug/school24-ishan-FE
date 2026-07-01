/**
 * In-memory access-token store.
 *
 * Per agents/frontend.md: "Keep auth access tokens in memory only — do not
 * use localStorage for access tokens." This module is the single place the
 * token lives; nothing here persists it to storage. A feature's auth flow
 * (added per-ticket) calls `setAccessToken` / `clearAccessToken`; the API
 * client's request interceptor calls `getAccessToken`.
 */
let accessToken: string | null = null

export function getAccessToken(): string | null {
  return accessToken
}

export function setAccessToken(token: string | null): void {
  accessToken = token
}

export function clearAccessToken(): void {
  accessToken = null
}
