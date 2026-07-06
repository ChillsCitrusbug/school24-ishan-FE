import { useStudentAuth } from '@/features/student-auth/useStudentAuth'
import { InboxScreen } from './InboxScreen'

/** FR-044 — Student's own notification inbox. */
export function StudentInboxScreen() {
  const { student } = useStudentAuth()
  return <InboxScreen displayName={student?.full_name ?? ''} roleLabel="Student" />
}
