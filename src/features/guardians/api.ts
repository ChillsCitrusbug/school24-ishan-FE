import { apiClient } from '@/api/client'

export interface Guardian {
  link_id: string
  parent_name: string
  parent_email: string
  status: 'pending' | 'approved' | 'rejected'
  linked_since: string | null
}

interface Envelope<T> {
  data: T
  meta: unknown
  errors: unknown
}

export async function listGuardians(studentId: string): Promise<Guardian[]> {
  const response = await apiClient.get<Envelope<Guardian[]>>(
    `/api/v1/students/${studentId}/guardians`,
  )
  return response.data.data
}

export async function removeGuardian(linkId: string): Promise<void> {
  await apiClient.delete(`/api/v1/approvals/parent-links/${linkId}`)
}
