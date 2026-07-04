import { apiClient } from '@/api/client'

export type AvailabilityStatus = 'available' | 'unavailable'

export interface ComboProduct {
  id: string
  name: string
}

export interface Combo {
  id: string
  name: string
  combo_price: string
  availability_status: AvailabilityStatus
  products: ComboProduct[]
}

export interface ComboInput {
  name: string
  combo_price: string
  product_ids: string[]
}

interface Envelope<T> {
  data: T
  meta: unknown
  errors: unknown
}

export async function listCombos(): Promise<Combo[]> {
  const response = await apiClient.get<Envelope<Combo[]>>('/api/v1/combos')
  return response.data.data
}

export async function getCombo(comboId: string): Promise<Combo> {
  const response = await apiClient.get<Envelope<Combo>>(`/api/v1/combos/${comboId}`)
  return response.data.data
}

export async function createCombo(input: ComboInput): Promise<Combo> {
  const response = await apiClient.post<Envelope<Combo>>('/api/v1/combos', input)
  return response.data.data
}

export async function updateCombo(comboId: string, input: ComboInput): Promise<Combo> {
  const response = await apiClient.put<Envelope<Combo>>(`/api/v1/combos/${comboId}`, input)
  return response.data.data
}
