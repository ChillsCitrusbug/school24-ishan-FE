import { apiClient } from '@/api/client'

export interface School {
  id: string
  school_name: string
  school_type: string
  contact_number: string
  address: string | null
  state_region: string | null
  primary_contact_name: string
  primary_contact_email: string
  is_active: boolean
  student_count: number
  created_at: string
}

export interface OnboardSchoolInput {
  school_name: string
  school_type: string
  contact_number: string
  address?: string
  state_region?: string
  primary_contact_name: string
  primary_contact_email: string
}

export interface UpdateSchoolInput {
  school_name: string
  school_type: string
  contact_number: string
  address: string | null
  state_region: string | null
}

export interface ReassignAdminInput {
  full_name: string
  email: string
}

interface Envelope<T> {
  data: T
  meta: unknown
  errors: unknown
}

export async function onboardSchool(input: OnboardSchoolInput): Promise<School> {
  const response = await apiClient.post<Envelope<School>>('/api/v1/schools', input)
  return response.data.data
}

export async function listSchools(): Promise<School[]> {
  const response = await apiClient.get<Envelope<School[]>>('/api/v1/schools')
  return response.data.data
}

export async function getSchool(schoolId: string): Promise<School> {
  const response = await apiClient.get<Envelope<School>>(`/api/v1/schools/${schoolId}`)
  return response.data.data
}

export async function updateSchool(schoolId: string, input: UpdateSchoolInput): Promise<School> {
  const response = await apiClient.patch<Envelope<School>>(`/api/v1/schools/${schoolId}`, input)
  return response.data.data
}

export async function reassignAdmin(
  schoolId: string,
  input: ReassignAdminInput,
): Promise<School> {
  const response = await apiClient.post<Envelope<School>>(
    `/api/v1/schools/${schoolId}/admin-reassignment`,
    input,
  )
  return response.data.data
}

export async function setSchoolStatus(schoolId: string, isActive: boolean): Promise<School> {
  const response = await apiClient.patch<Envelope<School>>(`/api/v1/schools/${schoolId}/status`, {
    is_active: isActive,
  })
  return response.data.data
}
