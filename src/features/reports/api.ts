import { apiClient } from '@/api/client'

export interface DailyOrdersDay {
  date: string
  order_count: number
  value: string
}

export interface StatusBreakdownRow {
  status: string
  count: number
}

export interface DailyOrdersReport {
  days: DailyOrdersDay[]
  status_breakdown: StatusBreakdownRow[]
  total_order_count: number
  total_value: string
}

export interface RevenueSummaryReport {
  total_revenue: string
  order_count: number
  average_order: string
  refunds_total: string
  refunds_count: number
  previous_period_revenue: string | null
  percent_change_vs_previous_period: number | null
}

export interface ProductSalesRow {
  rank: number
  item_type: 'product' | 'combo'
  name: string
  quantity_sold: number
  revenue: string
}

interface Envelope<T> {
  data: T
  meta: unknown
  errors: unknown
}

export interface ReportDateRange {
  date_from?: string
  date_to?: string
}

export async function getDailyOrdersReport(
  schoolId: string,
  range: ReportDateRange = {},
): Promise<DailyOrdersReport> {
  const response = await apiClient.get<Envelope<DailyOrdersReport>>(
    `/api/v1/schools/${schoolId}/reports/daily-orders`,
    { params: range },
  )
  return response.data.data
}

export async function getRevenueSummaryReport(
  schoolId: string,
  range: ReportDateRange = {},
): Promise<RevenueSummaryReport> {
  const response = await apiClient.get<Envelope<RevenueSummaryReport>>(
    `/api/v1/schools/${schoolId}/reports/revenue-summary`,
    { params: range },
  )
  return response.data.data
}

export async function getProductSalesReport(
  schoolId: string,
  range: ReportDateRange = {},
): Promise<ProductSalesRow[]> {
  const response = await apiClient.get<Envelope<ProductSalesRow[]>>(
    `/api/v1/schools/${schoolId}/reports/product-sales`,
    { params: range },
  )
  return response.data.data
}
