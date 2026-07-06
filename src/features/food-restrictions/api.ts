import { apiClient } from '@/api/client'

export type RestrictionType = 'product' | 'category'

export interface FoodRestriction {
  id: string
  restriction_type: RestrictionType
  product_id: string | null
  category_id: string | null
  name: string
}

export interface CatalogItem {
  id: string
  type: RestrictionType
  name: string
}

interface Envelope<T> {
  data: T
  meta: unknown
  errors: unknown
}

export async function listRestrictions(studentId: string): Promise<FoodRestriction[]> {
  const response = await apiClient.get<Envelope<FoodRestriction[]>>(
    `/api/v1/students/${studentId}/food-restrictions`,
  )
  return response.data.data
}

export async function createRestriction(
  studentId: string,
  payload: { restriction_type: RestrictionType; product_id?: string; category_id?: string },
): Promise<FoodRestriction> {
  const response = await apiClient.post<Envelope<FoodRestriction>>(
    `/api/v1/students/${studentId}/food-restrictions`,
    payload,
  )
  return response.data.data
}

export async function searchCatalog(studentId: string, query: string): Promise<CatalogItem[]> {
  const response = await apiClient.get<Envelope<CatalogItem[]>>(
    `/api/v1/students/${studentId}/food-restrictions/catalog`,
    { params: { q: query } },
  )
  return response.data.data
}

export async function removeRestriction(studentId: string, restrictionId: string): Promise<void> {
  await apiClient.delete(`/api/v1/students/${studentId}/food-restrictions/${restrictionId}`)
}
