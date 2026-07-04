import { useStudentAuth } from '@/features/student-auth/useStudentAuth'
import { WalletScreen } from './WalletScreen'

/** FR-031 — Student's own wallet balance + recent transactions. */
export function StudentWalletScreen() {
  const { student } = useStudentAuth()
  return (
    <WalletScreen
      role="student"
      displayName={student?.full_name ?? ''}
      roleLabel="Student"
      topUpHref="/student/wallet/top-up"
      historyHref="/student/wallet/history"
    />
  )
}
