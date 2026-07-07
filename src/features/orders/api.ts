import { apiClient } from '@/api/client'

export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled'

export interface StaffOrderSummary {
  id: string
  display_id: string
  student_id: string
  student_name: string
  class_label: string | null
  status: OrderStatus
  total_amount: string
  placed_at: string
  item_count: number
  item_summary: string
  version: number
}

export interface StaffOrderLineItem {
  name: string
  variant_label: string | null
  quantity: number
  unit_price: string
  line_total: string
}

export interface StaffOrderDetail extends StaffOrderSummary {
  items: StaffOrderLineItem[]
}

interface Envelope<T> {
  data: T
  meta: unknown
  errors: unknown
}

export async function listStaffOrders(): Promise<StaffOrderSummary[]> {
  const response = await apiClient.get<Envelope<StaffOrderSummary[]>>('/api/v1/orders/staff')
  return response.data.data
}

export async function getStaffOrderDetail(orderId: string): Promise<StaffOrderDetail> {
  const response = await apiClient.get<Envelope<StaffOrderDetail>>(
    `/api/v1/orders/staff/${orderId}`,
  )
  return response.data.data
}

export async function advanceOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
): Promise<StaffOrderDetail> {
  const response = await apiClient.patch<Envelope<StaffOrderDetail>>(
    `/api/v1/orders/${orderId}/status`,
    { new_status: newStatus },
  )
  return response.data.data
}

export async function cancelOrder(orderId: string): Promise<StaffOrderDetail> {
  const response = await apiClient.post<Envelope<StaffOrderDetail>>(
    `/api/v1/orders/${orderId}/cancel`,
    { cancellation_confirmation: true },
  )
  return response.data.data
}

export interface AdminOrderFilters {
  date_from?: string
  date_to?: string
  // Repeated `status` query params (e.g. the "Active" quick-filter
  // matches several statuses at once) — a single string is also
  // accepted for the "one status" case.
  status?: OrderStatus | OrderStatus[]
  student_name?: string
  parent_name?: string
  sort_by?: 'placed_at' | 'total_amount' | 'status' | 'student_name'
  sort_dir?: 'asc' | 'desc'
  page?: number
  page_size?: number
}

export interface AdminOrdersMeta {
  page: number
  page_size: number
  total: number
  total_pages: number
}

export interface AdminOrdersPage {
  rows: StaffOrderSummary[]
  meta: AdminOrdersMeta
}

function toQueryParams(filters: AdminOrderFilters): Record<string, string | string[]> {
  const params: Record<string, string | string[]> = {}
  for (const [key, value] of Object.entries(filters)) {
    if (Array.isArray(value)) {
      if (value.length > 0) params[key] = value
    } else if (value !== undefined && value !== '') {
      params[key] = String(value)
    }
  }
  return params
}

// FastAPI's own `list[...]` query params expect repeated keys
// (`status=pending&status=preparing`), not axios's default bracket
// notation (`status[]=pending&status[]=preparing`).
const REPEATED_KEY_PARAMS_SERIALIZER = { indexes: null }

export async function listAdminOrders(filters: AdminOrderFilters = {}): Promise<AdminOrdersPage> {
  const response = await apiClient.get<Envelope<StaffOrderSummary[]> & { meta: AdminOrdersMeta }>(
    '/api/v1/orders/admin',
    { params: toQueryParams(filters), paramsSerializer: REPEATED_KEY_PARAMS_SERIALIZER },
  )
  return { rows: response.data.data, meta: response.data.meta }
}

export type AdminExportFormat = 'csv' | 'xlsx' | 'pdf'

export async function exportAdminOrders(
  filters: Omit<AdminOrderFilters, 'sort_by' | 'sort_dir' | 'page' | 'page_size'> = {},
  format: AdminExportFormat = 'csv',
): Promise<Blob> {
  const response = await apiClient.get('/api/v1/orders/admin/export', {
    params: { ...toQueryParams(filters), format },
    paramsSerializer: REPEATED_KEY_PARAMS_SERIALIZER,
    responseType: 'blob',
  })
  return response.data as Blob
}
