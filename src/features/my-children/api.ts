import { apiClient } from '@/api/client'

export interface MyChild {
  link_id: string
  student_id: string
  student_id_code: string
  full_name: string
  status: 'pending' | 'approved'
  class_name?: string
  school_name?: string
  wallet_balance?: number
}

interface Envelope<T> {
  data: T
  meta: unknown
  errors: unknown
}

export async function listMyChildren(): Promise<MyChild[]> {
  const response = await apiClient.get<Envelope<MyChild[]>>('/api/v1/parent/children')
  return response.data.data
}
