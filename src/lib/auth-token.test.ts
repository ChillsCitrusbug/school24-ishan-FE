import { afterEach, describe, expect, it } from 'vitest'
import {
  beginRehydration,
  clearAccessToken,
  endRehydration,
  getAccessToken,
  isRehydratingSession,
  setAccessToken,
} from './auth-token'

// Session-persistence addition (2026-07-08): the access token now
// lives in `sessionStorage` (not a pure in-memory variable) so a page
// refresh does not sign the user out — a direct product decision that
// overrides the project's own prior "in-memory only" policy. See this
// module's own docstring for the full reasoning and the deliberately
// declined more-secure alternative (an HttpOnly-cookie refresh-token
// system).

afterEach(() => {
  sessionStorage.clear()
  // Reset the rehydration counter back to 0 regardless of how many
  // begin/end calls a test made (or skipped on assertion failure).
  while (isRehydratingSession()) endRehydration()
})

describe('auth-token sessionStorage persistence', () => {
  it('returns null when no token has ever been set', () => {
    expect(getAccessToken()).toBeNull()
  })

  it('persists a token to sessionStorage and reads it back', () => {
    setAccessToken('a-real-jwt')

    expect(getAccessToken()).toBe('a-real-jwt')
    expect(sessionStorage.getItem('school24_access_token')).toBe('a-real-jwt')
  })

  it('survives being read by a fresh call, simulating a page refresh (sessionStorage is the source of truth, not a module-level variable)', () => {
    setAccessToken('a-real-jwt')

    // A real refresh re-evaluates the module; sessionStorage itself
    // does not reset — reading fresh here is the same observable
    // behavior a genuine reload would produce.
    expect(getAccessToken()).toBe('a-real-jwt')
  })

  it('clearAccessToken removes the persisted token', () => {
    setAccessToken('a-real-jwt')
    clearAccessToken()

    expect(getAccessToken()).toBeNull()
    expect(sessionStorage.getItem('school24_access_token')).toBeNull()
  })

  it('setAccessToken(null) also clears the persisted token', () => {
    setAccessToken('a-real-jwt')
    setAccessToken(null)

    expect(getAccessToken()).toBeNull()
  })
})

describe('rehydration in-flight counter', () => {
  it('is false with no in-flight rehydration attempts', () => {
    expect(isRehydratingSession()).toBe(false)
  })

  it('is true while a single attempt is in flight', () => {
    beginRehydration()

    expect(isRehydratingSession()).toBe(true)

    endRehydration()
    expect(isRehydratingSession()).toBe(false)
  })

  it('stays true if EITHER of two concurrent attempts (User + Student boot checks) is still in flight', () => {
    beginRehydration()
    beginRehydration()

    endRehydration()
    expect(isRehydratingSession()).toBe(true)

    endRehydration()
    expect(isRehydratingSession()).toBe(false)
  })

  it('never goes negative on an unbalanced endRehydration call', () => {
    endRehydration()
    endRehydration()

    expect(isRehydratingSession()).toBe(false)
  })
})
