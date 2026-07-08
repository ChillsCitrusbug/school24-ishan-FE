import { useCallback, useEffect, useState, type ReactNode } from 'react'
import {
  beginRehydration,
  clearAccessToken,
  endRehydration,
  getAccessToken,
  setAccessToken,
} from '@/lib/auth-token'
import {
  verifyLoginBackupCode as verifyLoginBackupCodeRequest,
  verifyLoginChallenge as verifyLoginChallengeRequest,
} from '@/features/two-factor/api'
import { getMe, login as loginRequest, type LoginResult, type UserSummary } from './api'
import { AuthContext } from './context'

/**
 * FR-001 — the single source of truth for "who is signed in right now".
 * FR-050 extends `login()`'s own return type to a union (mirroring
 * StudentAuthContext's own `login()` shape for its analogous
 * challenge-then-full-access contract) — the pending challenge_token is
 * held in state (not a ref, unlike StudentAuthContext's own
 * `pendingChangeToken`) because the "Resend code" action needs to read
 * it directly to call a public endpoint outside this context's own
 * methods.
 *
 * The access token itself lives in `src/lib/auth-token.ts`'s own
 * `sessionStorage`-backed store (session-persistence addition,
 * 2026-07-08 — see that module's own docstring); this context
 * additionally holds the resolved user summary so routes can make
 * role-based decisions (`RequireRole`) without re-decoding the JWT.
 *
 * `isBootstrapping` starts `true` only when a persisted token exists to
 * check — `RequireRole` must wait for this to settle before deciding
 * whether to redirect to `/login`, otherwise a page refresh would
 * flash-redirect on the very first render (before the async "who am
 * I" check below even resolves), defeating the entire point of
 * persisting the token in the first place.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserSummary | null>(null)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [isBootstrapping, setIsBootstrapping] = useState(() => getAccessToken() !== null)
  const [pendingTwoFactorChallengeToken, setPendingTwoFactorChallengeToken] = useState<
    string | null
  >(null)

  useEffect(() => {
    const token = getAccessToken()
    if (!token) return
    beginRehydration()
    getMe()
      .then(setUser)
      .catch(() => {
        // Either a genuinely expired/invalid token, or (just as likely)
        // this persisted token actually belongs to a Student session —
        // StudentAuthProvider's own boot check handles that case; this
        // provider silently stays signed-out, no token cleared here.
      })
      .finally(() => {
        endRehydration()
        setIsBootstrapping(false)
      })
  }, [])

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    setIsAuthenticating(true)
    try {
      const result = await loginRequest(email, password)
      if ('must_provide_2fa' in result) {
        setPendingTwoFactorChallengeToken(result.challenge_token)
      } else {
        setPendingTwoFactorChallengeToken(null)
        setAccessToken(result.access_token)
        setUser(result.user)
      }
      return result
    } finally {
      setIsAuthenticating(false)
    }
  }, [])

  const completeTwoFactorChallenge = useCallback(
    async (code: string) => {
      if (!pendingTwoFactorChallengeToken) {
        throw new Error('completeTwoFactorChallenge called with no pending challenge_token')
      }
      setIsAuthenticating(true)
      try {
        const result = await verifyLoginChallengeRequest(pendingTwoFactorChallengeToken, code)
        setPendingTwoFactorChallengeToken(null)
        setAccessToken(result.access_token)
        setUser(result.user)
        return result.user
      } finally {
        setIsAuthenticating(false)
      }
    },
    [pendingTwoFactorChallengeToken],
  )

  const completeTwoFactorBackupCode = useCallback(
    async (backupCode: string) => {
      if (!pendingTwoFactorChallengeToken) {
        throw new Error('completeTwoFactorBackupCode called with no pending challenge_token')
      }
      setIsAuthenticating(true)
      try {
        const result = await verifyLoginBackupCodeRequest(
          pendingTwoFactorChallengeToken,
          backupCode,
        )
        setPendingTwoFactorChallengeToken(null)
        setAccessToken(result.access_token)
        setUser(result.user)
        return result.user
      } finally {
        setIsAuthenticating(false)
      }
    },
    [pendingTwoFactorChallengeToken],
  )

  const setSession = useCallback((accessToken: string, sessionUser: UserSummary) => {
    setAccessToken(accessToken)
    setUser(sessionUser)
  }, [])

  const refreshUser = useCallback(async () => {
    const fresh = await getMe()
    setUser(fresh)
  }, [])

  const logout = useCallback(() => {
    clearAccessToken()
    setPendingTwoFactorChallengeToken(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticating,
        login,
        hasPendingTwoFactorChallenge: pendingTwoFactorChallengeToken !== null,
        completeTwoFactorChallenge,
        completeTwoFactorBackupCode,
        pendingTwoFactorChallengeToken,
        setSession,
        refreshUser,
        logout,
        isBootstrapping,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
