import { useStudentAuth } from '@/features/student-auth/useStudentAuth'
import { TxnHistoryScreen } from './TxnHistoryScreen'

/** FR-031 — Student's own complete wallet transaction history. */
export function StudentTxnHistoryScreen() {
  const { student } = useStudentAuth()
  return (
    <TxnHistoryScreen
      role="student"
      displayName={student?.full_name ?? ''}
      roleLabel="Student"
      backHref="/student/wallet"
      topUpHref="/student/wallet/top-up"
    />
  )
}
