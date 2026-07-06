import { apiClient } from '@/api/client'

interface Envelope<T> {
  data: T
  meta: unknown
  errors: unknown
}

export type WalletOwnerType = 'parent' | 'student'
export type WalletTxnType = 'top_up' | 'deduction' | 'refund'
export type WalletTxnStatus = 'success' | 'failed' | 'pending'

export interface Wallet {
  id: string
  owner_type: WalletOwnerType
  balance: string
}

export interface WalletTransaction {
  id: string
  type: WalletTxnType
  status: WalletTxnStatus
  amount: string
  order_id: string | null
  created_at: string
}

export async function getMyParentWalletId(): Promise<string> {
  const response = await apiClient.get<Envelope<{ wallet_id: string }>>('/api/v1/wallet/parent/me')
  return response.data.data.wallet_id
}

export async function getMyStudentWalletId(): Promise<string> {
  const response = await apiClient.get<Envelope<{ wallet_id: string }>>(
    '/api/v1/wallet/student/me',
  )
  return response.data.data.wallet_id
}

export async function getWallet(walletId: string): Promise<Wallet> {
  const response = await apiClient.get<Envelope<Wallet>>(`/api/v1/wallets/${walletId}`)
  return response.data.data
}

export async function getWalletTransactions(walletId: string): Promise<WalletTransaction[]> {
  const response = await apiClient.get<Envelope<WalletTransaction[]>>(
    `/api/v1/wallets/${walletId}/transactions`,
  )
  return response.data.data
}

/** FR-037 — a parent reading a LINKED CHILD's own wallet balance
 * (distinct from `getWallet`, which only ever returns a wallet the
 * caller directly owns). */
export async function getChildWallet(studentId: string): Promise<Wallet> {
  const response = await apiClient.get<Envelope<Wallet>>(`/api/v1/students/${studentId}/wallet`)
  return response.data.data
}
