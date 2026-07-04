import type { IconName } from '@/components'
import type { WalletTransaction } from './api'

/**
 * Shared type-derived display mapping (icon/sign/title) for wallet
 * transaction rows — used by both WalletScreen.tsx and
 * TxnHistoryScreen.tsx. Round 1 review finding (Nit): previously
 * copy-pasted identically in both files; extracted here so the two
 * screens can never silently desync on how a given transaction type
 * renders.
 */
export const TXN_DISPLAY: Record<
  WalletTransaction['type'],
  { icon: IconName; positive: boolean; title: string }
> = {
  top_up: { icon: 'plus', positive: true, title: 'Top-up' },
  deduction: { icon: 'order', positive: false, title: 'Purchase' },
  refund: { icon: 'gift', positive: true, title: 'Refund' },
}

export function formatTxnAmount(txn: WalletTransaction): string {
  const sign = TXN_DISPLAY[txn.type].positive ? '+' : '−'
  return `${sign}$${txn.amount}`
}

export function formatTxnDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}
