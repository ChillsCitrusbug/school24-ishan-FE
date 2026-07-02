import { apiClient } from '@/api/client'

export interface StaffSummary {
  staff_profile_id: string
  full_name: string
  assigned_role_id: string | null
}

interface Envelope<T> {
  data: T
  meta: unknown
  errors: unknown
}

export async function getStaffSummary(staffProfileId: string): Promise<StaffSummary> {
  const response = await apiClient.get<Envelope<StaffSummary>>(`/api/v1/staff/${staffProfileId}`)
  return response.data.data
}

export async function assignRole(staffProfileId: string, roleId: string | null): Promise<void> {
  await apiClient.patch<Envelope<unknown>>(`/api/v1/staff/${staffProfileId}/role`, {
    role_id: roleId,
  })
}
