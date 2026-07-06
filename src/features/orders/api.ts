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
