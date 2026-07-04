import { useAuth } from '@/features/auth/useAuth'
import { TxnHistoryScreen } from './TxnHistoryScreen'

/** FR-031 — Parent's own complete wallet transaction history. */
export function ParentTxnHistoryScreen() {
  const { user } = useAuth()
  return (
    <TxnHistoryScreen
      role="parent"
      displayName={user?.full_name ?? ''}
      roleLabel="Parent"
      backHref="/parent/wallet"
      topUpHref="/parent/wallet/top-up"
    />
  )
}
