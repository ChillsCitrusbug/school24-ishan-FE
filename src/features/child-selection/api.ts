import { apiClient } from '@/api/client'

export interface ActiveChild {
  student_id: string
  student_id_code: string
  full_name: string
  class_name: string
  school_name: string
  wallet_balance: number
}

interface Envelope<T> {
  data: T
  meta: unknown
  errors: unknown
}

export async function getActiveContext(): Promise<ActiveChild[]> {
  const response = await apiClient.get<Envelope<ActiveChild[]>>(
    '/api/v1/parent/children/active-context',
  )
  return response.data.data
}
