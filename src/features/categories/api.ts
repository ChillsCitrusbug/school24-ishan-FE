import { apiClient } from '@/api/client'

export interface Category {
  id: string
  name: string
  display_order: number
}

export interface CategoryProduct {
  id: string
  name: string
  display_order: number
}

interface Envelope<T> {
  data: T
  meta: unknown
  errors: unknown
}

export async function listCategories(): Promise<Category[]> {
  const response = await apiClient.get<Envelope<Category[]>>('/api/v1/categories')
  return response.data.data
}

export async function listProductsInCategory(categoryId: string): Promise<CategoryProduct[]> {
  const response = await apiClient.get<Envelope<CategoryProduct[]>>(
    `/api/v1/categories/${categoryId}/products`,
  )
  return response.data.data
}

export async function reorderCategories(categoryIds: string[]): Promise<Category[]> {
  const response = await apiClient.patch<Envelope<Category[]>>('/api/v1/categories/order', {
    category_ids: categoryIds,
  })
  return response.data.data
}

export async function reorderProductsInCategory(
  categoryId: string,
  productIds: string[],
): Promise<CategoryProduct[]> {
  const response = await apiClient.patch<Envelope<CategoryProduct[]>>(
    `/api/v1/categories/${categoryId}/products/order`,
    { product_ids: productIds },
  )
  return response.data.data
}
