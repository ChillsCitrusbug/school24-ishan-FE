import { useContext } from 'react'
import { StudentAuthContext, type StudentAuthContextValue } from './context'

export function useStudentAuth(): StudentAuthContextValue {
  const ctx = useContext(StudentAuthContext)
  if (!ctx) {
    throw new Error('useStudentAuth must be used within a StudentAuthProvider')
  }
  return ctx
}
