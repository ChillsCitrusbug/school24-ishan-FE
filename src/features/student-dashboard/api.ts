import { apiClient } from '@/api/client'

export interface FrequentItem {
  item_type: 'product' | 'combo'
  id: string
  name: string
  price: string
  has_variants: boolean
  available: boolean
  blocked: boolean
  block_reason: string | null
  order_count: number
}

export interface StudentDashboard {
  wallet_balance: string
  frequent_items: FrequentItem[]
}

interface Envelope<T> {
  data: T
  meta: unknown
  errors: unknown
}

export async function getStudentDashboard(studentId: string): Promise<StudentDashboard> {
  const response = await apiClient.get<Envelope<StudentDashboard>>(
    `/api/v1/students/${studentId}/dashboard`,
  )
  return response.data.data
}
