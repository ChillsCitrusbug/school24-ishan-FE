import { useAuth } from '@/features/auth/useAuth'
import { InboxScreen } from './InboxScreen'

/** FR-044 — Parent's own notification inbox. */
export function ParentInboxScreen() {
  const { user } = useAuth()
  return <InboxScreen role="parent" displayName={user?.full_name ?? ''} roleLabel="Parent" />
}
