import { useStudentAuth } from '@/features/student-auth/useStudentAuth'
import { OrderTrackingScreen } from './OrderTrackingScreen'

/** FR-041 — Student's own real-time order tracking / history detail. */
export function StudentOrderTrackingScreen() {
  const { student } = useStudentAuth()
  return (
    <OrderTrackingScreen
      displayName={student?.full_name ?? ''}
      roleLabel="Student"
      backHref="/student/orders"
      inboxHref="/student/inbox"
      paidFromLabel="Your wallet"
    />
  )
}
