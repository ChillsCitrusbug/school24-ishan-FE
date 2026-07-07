import { useAuth } from '@/features/auth/useAuth'
import { OrderTrackingScreen } from './OrderTrackingScreen'

/** FR-041 — Parent's own real-time order tracking / history detail. */
export function ParentOrderTrackingScreen() {
  const { user } = useAuth()
  return (
    <OrderTrackingScreen
      displayName={user?.full_name ?? ''}
      roleLabel="Parent"
      backHref="/parent/orders"
      inboxHref="/parent/inbox"
      paidFromLabel="Wallet"
    />
  )
}
