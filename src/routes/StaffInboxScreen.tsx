import { useAuth } from '@/features/auth/useAuth'
import { InboxScreen } from './InboxScreen'

/** FR-044 — Staff's own notification inbox. */
export function StaffInboxScreen() {
  const { user } = useAuth()
  return <InboxScreen displayName={user?.full_name ?? ''} roleLabel="Staff" />
}
