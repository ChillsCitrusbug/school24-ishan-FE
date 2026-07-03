import { useStudentAuth } from '@/features/student-auth/useStudentAuth'
import { WalletTopUpScreen } from './WalletTopUpScreen'

/** FR-030 — Student's own wallet top-up. */
export function StudentWalletTopUpScreen() {
  const { student } = useStudentAuth()
  return (
    <WalletTopUpScreen
      role="student"
      displayName={student?.full_name ?? ''}
      roleLabel="Student"
      backHref="/student"
      backLabel="Home"
    />
  )
}
