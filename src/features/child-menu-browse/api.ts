import { apiClient } from '@/api/client'
import type {
  MenuCategory,
  MenuComboDetail,
  MenuItem,
  MenuProductDetail,
} from '@/features/menu-browse/api'

interface Envelope<T> {
  data: T
  meta: unknown
  errors: unknown
}

export async function listChildMenuCategories(studentId: string): Promise<MenuCategory[]> {
  const response = await apiClient.get<Envelope<MenuCategory[]>>(
    `/api/v1/children/${studentId}/menu/categories`,
  )
  return response.data.data
}

export async function listChildMenuItems(
  studentId: string,
  categoryId?: string,
): Promise<MenuItem[]> {
  const response = await apiClient.get<Envelope<MenuItem[]>>(
    `/api/v1/children/${studentId}/menu/items`,
    { params: categoryId ? { category_id: categoryId } : undefined },
  )
  return response.data.data
}

export async function getChildMenuProduct(
  studentId: string,
  productId: string,
): Promise<MenuProductDetail> {
  const response = await apiClient.get<Envelope<MenuProductDetail>>(
    `/api/v1/children/${studentId}/menu/products/${productId}`,
  )
  return response.data.data
}

export async function getChildMenuCombo(
  studentId: string,
  comboId: string,
): Promise<MenuComboDetail> {
  const response = await apiClient.get<Envelope<MenuComboDetail>>(
    `/api/v1/children/${studentId}/menu/combos/${comboId}`,
  )
  return response.data.data
}
