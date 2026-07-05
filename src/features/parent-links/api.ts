import { apiClient } from '@/api/client'

export interface ChildLink {
  id: string
  student_id: string
  status: 'pending' | 'approved' | 'rejected'
  student_full_name: string
  student_id_code: string
}

interface Envelope<T> {
  data: T
  meta: unknown
  errors: unknown
}

export async function requestChildLink(studentId: string): Promise<ChildLink> {
  const response = await apiClient.post<Envelope<ChildLink>>('/api/v1/parent/children', {
    student_id: studentId,
  })
  return response.data.data
}
