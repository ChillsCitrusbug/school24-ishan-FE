import { apiClient } from '@/api/client'

export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled'

export interface OrderLineItem {
  name: string
  variant_label: string | null
  quantity: number
  unit_price: string
  line_total: string
}

export interface Order {
  id: string
  display_id: string
  status: OrderStatus
  total_amount: string
  placed_at: string
  funding_wallet_id: string
  items: OrderLineItem[]
}

export async function studentCheckout(studentId: string): Promise<Order> {
  const response = await apiClient.post<{ data: Order; meta: unknown; errors: unknown }>(
    `/api/v1/students/${studentId}/checkout`,
    { confirm_checkout: true },
  )
  return response.data.data
}
