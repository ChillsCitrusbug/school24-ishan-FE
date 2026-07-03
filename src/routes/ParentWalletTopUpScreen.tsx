import { useAuth } from '@/features/auth/useAuth'
import { WalletTopUpScreen } from './WalletTopUpScreen'

/** FR-028 — Parent's own wallet top-up. */
export function ParentWalletTopUpScreen() {
  const { user } = useAuth()
  return (
    <WalletTopUpScreen
      role="parent"
      displayName={user?.full_name ?? ''}
      roleLabel="Parent"
      backHref="/parent"
      backLabel="Home"
    />
  )
}
