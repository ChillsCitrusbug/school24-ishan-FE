import { useCallback, useState, type ReactNode } from 'react'
import { clearAccessToken, setAccessToken } from '@/lib/auth-token'
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
 * The access token itself lives only in `src/lib/auth-token.ts`'s
 * in-memory store (never localStorage, per agents/frontend.md); this
 * context additionally holds the resolved user summary so routes can make
 * role-based decisions (`RequireRole`) without re-decoding the JWT.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserSummary | null>(null)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [pendingTwoFactorChallengeToken, setPendingTwoFactorChallengeToken] = useState<
    string | null
  >(null)

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
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
