import { useStudentAuth } from '@/features/student-auth/useStudentAuth'
import { OrderHistoryScreen } from './OrderHistoryScreen'

/** FR-041 — Student's own order history + active-order tracking list. */
export function StudentOrderHistoryScreen() {
  const { student } = useStudentAuth()
  return (
    <OrderHistoryScreen
      role="student"
      displayName={student?.full_name ?? ''}
      roleLabel="Student"
      orderHref={(orderId) => `/student/orders/${orderId}`}
      menuHref="/student/menu"
      inboxHref="/student/inbox"
    />
  )
}
