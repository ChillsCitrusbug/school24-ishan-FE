import { apiClient } from '@/api/client'
import type { ModulePermission } from '@/features/roles/api'

interface Envelope<T> {
  data: T
  meta: unknown
  errors: unknown
}

export async function getMyPermissions(): Promise<ModulePermission[]> {
  const response = await apiClient.get<Envelope<ModulePermission[]>>('/api/v1/permissions/me')
  return response.data.data
}
