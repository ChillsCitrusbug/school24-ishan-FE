import '@testing-library/jest-dom/vitest'
import { beforeEach } from 'vitest'

// Session-persistence addition (2026-07-08): the access token now lives
// in `sessionStorage` (src/lib/auth-token.ts), which — unlike the prior
// pure in-memory variable — survives across `it()` blocks within the
// same test file's shared jsdom window. Without this, a later test's
// AuthProvider/StudentAuthProvider would boot-time-rehydrate against a
// PREVIOUS test's own leftover login token.
beforeEach(() => {
  sessionStorage.clear()
})
