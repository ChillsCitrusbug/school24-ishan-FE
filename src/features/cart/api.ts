import { apiClient } from '@/api/client'
import type { MenuItemType } from '@/features/menu-browse/api'

export interface AddCartItemInput {
  item_type: MenuItemType
  product_id?: string
  combo_id?: string
  variant_id?: string
  quantity: number
}

export interface CartItemResult {
  id: string
  cart_id: string
  item_type: MenuItemType
  product_id: string | null
  combo_id: string | null
  variant_id: string | null
  quantity: number
  unit_price: string
  line_total: string
}

export interface CartLine {
  id: string
  item_type: MenuItemType
  product_id: string | null
  combo_id: string | null
  variant_id: string | null
  name: string
  variant_label: string | null
  quantity: number
  unit_price: string
  line_total: string
}

export interface Cart {
  items: CartLine[]
  total: string
}

interface Envelope<T> {
  data: T
  meta: unknown
  errors: unknown
}

export async function addCartItem(
  studentId: string,
  input: AddCartItemInput,
): Promise<CartItemResult> {
  const response = await apiClient.post<Envelope<CartItemResult>>(
    `/api/v1/students/${studentId}/cart/items`,
    input,
  )
  return response.data.data
}

export async function getCart(studentId: string): Promise<Cart> {
  const response = await apiClient.get<Envelope<Cart>>(`/api/v1/students/${studentId}/cart`)
  return response.data.data
}
