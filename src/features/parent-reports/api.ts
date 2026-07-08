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

export interface SpendingReportOrder {
  id: string
  display_id: string
  student_id: string
  student_name: string
  status: string
  total_amount: string
  placed_at: string
  item_count: number
  items_summary: string
  category: string
}

export interface CategoryBreakdownRow {
  label: string
  total_spent: string
}

export interface TopCategory {
  label: string
  total_spent: string
  percent_of_total: number
}

export interface WeeklyChildSpend {
  student_name: string
  total_spent: string
}

export interface WeeklyBreakdownRow {
  week_label: string
  children: WeeklyChildSpend[]
}

export interface SpendingReport {
  parent_wallet: ParentWalletSummary
  children: ChildSpendingSummary[]
  total_spent: string
  total_order_count: number
  average_order: string
  previous_period_total_spent: string | null
  percent_change_vs_previous_period: number | null
  top_category: TopCategory | null
  by_category: CategoryBreakdownRow[]
  by_week: WeeklyBreakdownRow[]
  orders: SpendingReportOrder[]
}

interface Envelope<T> {
  data: T
  meta: unknown
  errors: unknown
}

export interface SpendingReportParams {
  childId?: string
  dateFrom?: string
  dateTo?: string
}

export async function getSpendingReport(
  parentId: string,
  params: SpendingReportParams = {},
): Promise<SpendingReport> {
  const response = await apiClient.get<Envelope<SpendingReport>>(
    `/api/v1/parents/${parentId}/spending-report`,
    {
      params: {
        child_id: params.childId,
        date_from: params.dateFrom,
        date_to: params.dateTo,
      },
    },
  )
  return response.data.data
}

export type SpendingReportExportFormat = 'csv' | 'xlsx' | 'pdf'

export async function exportSpendingReport(
  parentId: string,
  params: SpendingReportParams = {},
  format: SpendingReportExportFormat = 'csv',
): Promise<Blob> {
  const response = await apiClient.get(`/api/v1/parents/${parentId}/spending-report/export`, {
    params: {
      child_id: params.childId,
      date_from: params.dateFrom,
      date_to: params.dateTo,
      format,
    },
    responseType: 'blob',
  })
  return response.data as Blob
}
