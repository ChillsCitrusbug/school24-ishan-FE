import { apiClient } from '@/api/client'

interface Envelope<T> {
  data: T
  meta: unknown
  errors: unknown
}

export interface StartTopUpResult {
  transaction_id: string
  client_secret: string
  publishable_key: string
  amount: number
}

export interface TopUpStatus {
  transaction_id: string
  status: 'pending' | 'success' | 'failed'
  amount: number
  wallet_balance: number | null
}

export async function startParentTopUp(amount: number): Promise<StartTopUpResult> {
  const response = await apiClient.post<Envelope<StartTopUpResult>>('/api/v1/wallet/parent/top-up', {
    amount,
  })
  return response.data.data
}

export async function getParentTopUpStatus(transactionId: string): Promise<TopUpStatus> {
  const response = await apiClient.get<Envelope<TopUpStatus>>(
    `/api/v1/wallet/parent/top-up/${transactionId}`,
  )
  return response.data.data
}

export async function startStudentTopUp(amount: number): Promise<StartTopUpResult> {
  const response = await apiClient.post<Envelope<StartTopUpResult>>('/api/v1/wallet/student/top-up', {
    amount,
  })
  return response.data.data
}

export async function getStudentTopUpStatus(transactionId: string): Promise<TopUpStatus> {
  const response = await apiClient.get<Envelope<TopUpStatus>>(
    `/api/v1/wallet/student/top-up/${transactionId}`,
  )
  return response.data.data
}

/** FR-029 — a Parent topping up a specific linked child's wallet. The
 * backend 403s if the caller's link to `studentId` isn't APPROVED. */
export async function startChildTopUp(
  studentId: string,
  amount: number,
): Promise<StartTopUpResult> {
  const response = await apiClient.post<Envelope<StartTopUpResult>>(
    `/api/v1/students/${studentId}/wallet/top-ups`,
    { amount },
  )
  return response.data.data
}

export async function getChildTopUpStatus(
  studentId: string,
  transactionId: string,
): Promise<TopUpStatus> {
  const response = await apiClient.get<Envelope<TopUpStatus>>(
    `/api/v1/students/${studentId}/wallet/top-ups/${transactionId}`,
  )
  return response.data.data
}
