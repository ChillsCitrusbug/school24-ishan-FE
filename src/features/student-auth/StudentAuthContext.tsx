import { useCallback, useRef, useState, type ReactNode } from 'react'
import { clearAccessToken, setAccessToken } from '@/lib/auth-token'
import {
  changePassword as changePasswordRequest,
  login as loginRequest,
  type StudentSummary,
} from './api'
import { StudentAuthContext } from './context'

/**
 * FR-002 — the single source of truth for "which student is signed in
 * right now", mirroring src/features/auth/AuthContext.tsx's shape for the
 * (entirely separate) student identity type.
 *
 * The in-flight change_token itself (between a first-login challenge and
 * the password-change call that redeems it) is held in a ref — it is
 * never rendered and only ever read by `completePasswordChange`.
 * `hasPendingPasswordChange` is the state twin that IS exposed, so the
 * first-login screen can guard itself without the token leaking into
 * anything that renders it.
 */
export function StudentAuthProvider({ children }: { children: ReactNode }) {
  const [student, setStudent] = useState<StudentSummary | null>(null)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [hasPendingPasswordChange, setHasPendingPasswordChange] = useState(false)
  const pendingChangeToken = useRef<string | null>(null)

  const login = useCallback(async (studentId: string, password: string) => {
    setIsAuthenticating(true)
    try {
      const result = await loginRequest(studentId, password)
      if ('must_change_password' in result) {
        pendingChangeToken.current = result.change_token
        setHasPendingPasswordChange(true)
      } else {
        pendingChangeToken.current = null
        setHasPendingPasswordChange(false)
        setAccessToken(result.access_token)
        setStudent(result.student)
      }
      return result
    } finally {
      setIsAuthenticating(false)
    }
  }, [])

  const completePasswordChange = useCallback(
    async (newPassword: string, confirmPassword: string) => {
      const changeToken = pendingChangeToken.current
      if (!changeToken) {
        throw new Error('completePasswordChange called with no pending change_token')
      }
      setIsAuthenticating(true)
      try {
        const result = await changePasswordRequest(changeToken, newPassword, confirmPassword)
        pendingChangeToken.current = null
        setHasPendingPasswordChange(false)
        setAccessToken(result.access_token)
        setStudent(result.student)
        return result.student
      } finally {
        setIsAuthenticating(false)
      }
    },
    [],
  )

  const logout = useCallback(() => {
    clearAccessToken()
    pendingChangeToken.current = null
    setHasPendingPasswordChange(false)
    setStudent(null)
  }, [])

  return (
    <StudentAuthContext.Provider
      value={{
        student,
        isAuthenticating,
        hasPendingPasswordChange,
        login,
        completePasswordChange,
        logout,
      }}
    >
      {children}
    </StudentAuthContext.Provider>
  )
}
