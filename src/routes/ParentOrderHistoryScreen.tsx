import { useAuth } from '@/features/auth/useAuth'
import { OrderHistoryScreen } from './OrderHistoryScreen'

/** FR-041 — Parent's own order history + active-order tracking list
 * (every own-wallet order, plus every currently-approved linked
 * child's own-wallet order, per FR-040's own visibility rule). */
export function ParentOrderHistoryScreen() {
  const { user } = useAuth()
  return (
    <OrderHistoryScreen
      role="parent"
      displayName={user?.full_name ?? ''}
      roleLabel="Parent"
      orderHref={(orderId) => `/parent/orders/${orderId}`}
      menuHref="/parent/menu"
      inboxHref="/parent/inbox"
    />
  )
}
