import { useAuth } from '@/features/auth/useAuth'
import { WalletScreen } from './WalletScreen'

/** FR-031 — Parent's own wallet balance + recent transactions. */
export function ParentWalletScreen() {
  const { user } = useAuth()
  return (
    <WalletScreen
      role="parent"
      displayName={user?.full_name ?? ''}
      roleLabel="Parent"
      topUpHref="/parent/wallet/top-up"
      historyHref="/parent/wallet/history"
    />
  )
}
