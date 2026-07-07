import { apiClient } from '@/api/client'

export interface ParentWalletSummary {
  id: string
  balance: string
}

export interface ChildSpendingSummary {
  student_id: string
  full_name: string
  class_label: string | null
  wallet_balance: string
  total_spent: string
  order_count: number
}

export interface MonthlySpendingSummary {
  month: string
  total_spent: string
  order_count: number
}

export interface SpendingReportOrder {
  id: string
  display_id: string
  student_id: string
  student_name: string
  status: string
  total_amount: string
  placed_at: string
  item_count: number
}

export interface SpendingReport {
  parent_wallet: ParentWalletSummary
  children: ChildSpendingSummary[]
  monthly_summary: MonthlySpendingSummary[]
  orders: SpendingReportOrder[]
}

interface Envelope<T> {
  data: T
  meta: unknown
  errors: unknown
}

export async function getSpendingReport(
  parentId: string,
  childId?: string,
): Promise<SpendingReport> {
  const response = await apiClient.get<Envelope<SpendingReport>>(
    `/api/v1/parents/${parentId}/spending-report`,
    { params: childId ? { child_id: childId } : {} },
  )
  return response.data.data
}
