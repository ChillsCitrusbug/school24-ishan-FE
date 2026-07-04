import { apiClient } from '@/api/client'

export interface StaffSummary {
  staff_profile_id: string
  full_name: string
  assigned_role_id: string | null
}

export type StaffStatus = 'pending' | 'active' | 'deactivated'

export interface StaffListItem {
  staff_profile_id: string
  full_name: string
  email: string
  role_name: string | null
  status: StaffStatus
}

export interface StaffDetail {
  staff_profile_id: string
  full_name: string
  email: string
  mobile: string | null
  position: string
  department: string | null
  assigned_role_id: string | null
  role_name: string | null
  status: StaffStatus
}

export interface CreateStaffInput {
  full_name: string
  email: string
  mobile?: string | null
  position: string
  department?: string | null
  role_id?: string | null
}

export interface UpdateStaffInput {
  full_name: string
  email: string
  mobile?: string | null
  position: string
  department?: string | null
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

export async function createStaff(input: CreateStaffInput): Promise<StaffDetail> {
  const response = await apiClient.post<Envelope<StaffDetail>>('/api/v1/staff', input)
  return response.data.data
}

export async function listStaff(): Promise<StaffListItem[]> {
  const response = await apiClient.get<Envelope<StaffListItem[]>>('/api/v1/staff')
  return response.data.data
}

export async function getStaffDetail(staffProfileId: string): Promise<StaffDetail> {
  const response = await apiClient.get<Envelope<StaffDetail>>(`/api/v1/staff/${staffProfileId}`)
  return response.data.data
}

export async function updateStaff(
  staffProfileId: string,
  input: UpdateStaffInput,
): Promise<StaffDetail> {
  const response = await apiClient.patch<Envelope<StaffDetail>>(
    `/api/v1/staff/${staffProfileId}`,
    input,
  )
  return response.data.data
}

export async function setStaffStatus(
  staffProfileId: string,
  isActive: boolean,
): Promise<StaffDetail> {
  const response = await apiClient.patch<Envelope<StaffDetail>>(
    `/api/v1/staff/${staffProfileId}/status`,
    { is_active: isActive },
  )
  return response.data.data
}
