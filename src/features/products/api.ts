import { apiClient } from '@/api/client'

export type AvailabilityStatus = 'available' | 'unavailable'

export interface ProductVariant {
  id: string
  variant_label: string
  price: string
}

export interface ProductImage {
  id: string
  image_url: string
  display_order: number
}

export interface Product {
  id: string
  name: string
  category_name: string | null
  description: string | null
  base_price: string
  availability_status: AvailabilityStatus
  variants: ProductVariant[]
  images: ProductImage[]
}

export interface ProductVariantInput {
  id?: string
  variant_label: string
  price: string
}

export interface ProductInput {
  name: string
  category_name: string
  description?: string | null
  base_price: string
  variants: ProductVariantInput[]
}

interface Envelope<T> {
  data: T
  meta: unknown
  errors: unknown
}

export async function listProducts(): Promise<Product[]> {
  const response = await apiClient.get<Envelope<Product[]>>('/api/v1/products')
  return response.data.data
}

export async function getProduct(productId: string): Promise<Product> {
  const response = await apiClient.get<Envelope<Product>>(`/api/v1/products/${productId}`)
  return response.data.data
}

export async function createProduct(input: ProductInput): Promise<Product> {
  const response = await apiClient.post<Envelope<Product>>('/api/v1/products', input)
  return response.data.data
}

export async function updateProduct(productId: string, input: ProductInput): Promise<Product> {
  const response = await apiClient.put<Envelope<Product>>(`/api/v1/products/${productId}`, input)
  return response.data.data
}

export async function uploadProductImage(productId: string, file: File): Promise<ProductImage> {
  const formData = new FormData()
  formData.append('file', file)
  const response = await apiClient.post<Envelope<ProductImage>>(
    `/api/v1/products/${productId}/images`,
    formData,
    // Clears the client's default JSON Content-Type so the browser sets
    // the correct `multipart/form-data; boundary=...` header itself.
    { headers: { 'Content-Type': undefined } },
  )
  return response.data.data
}
