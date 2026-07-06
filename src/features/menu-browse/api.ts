import { apiClient } from '@/api/client'

export type MenuItemType = 'product' | 'combo'

export interface MenuCategory {
  id: string
  name: string
}

export interface MenuItem {
  id: string
  item_type: MenuItemType
  name: string
  description: string | null
  category_id: string | null
  base_price: string
  blocked: boolean
  block_reason: string | null
  has_variants: boolean
}

export interface MenuVariant {
  id: string
  label: string
  price: string
}

export interface MenuProductDetail extends MenuItem {
  variants: MenuVariant[]
}

export interface MenuComboDetail extends MenuItem {
  included_products: { id: string; name: string }[]
}

interface Envelope<T> {
  data: T
  meta: unknown
  errors: unknown
}

export async function listMenuCategories(studentId: string): Promise<MenuCategory[]> {
  const response = await apiClient.get<Envelope<MenuCategory[]>>(
    `/api/v1/students/${studentId}/menu/categories`,
  )
  return response.data.data
}

export async function listMenuItems(
  studentId: string,
  categoryId?: string,
): Promise<MenuItem[]> {
  const response = await apiClient.get<Envelope<MenuItem[]>>(
    `/api/v1/students/${studentId}/menu/items`,
    { params: categoryId ? { category_id: categoryId } : undefined },
  )
  return response.data.data
}

export async function getMenuProduct(
  studentId: string,
  productId: string,
): Promise<MenuProductDetail> {
  const response = await apiClient.get<Envelope<MenuProductDetail>>(
    `/api/v1/students/${studentId}/menu/products/${productId}`,
  )
  return response.data.data
}

export async function getMenuCombo(
  studentId: string,
  comboId: string,
): Promise<MenuComboDetail> {
  const response = await apiClient.get<Envelope<MenuComboDetail>>(
    `/api/v1/students/${studentId}/menu/combos/${comboId}`,
  )
  return response.data.data
}
