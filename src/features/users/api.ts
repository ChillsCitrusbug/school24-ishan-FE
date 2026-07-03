import { apiClient } from '@/api/client'

export interface PlatformUser {
  id: string
  full_name: string
  email: string
  role: 'school_admin' | 'staff' | 'parent'
  school_id: string | null
  school_name: string | null
  is_active: boolean
}

export interface UserListResult {
  items: PlatformUser[]
  total: number
  page: number
  page_size: number
}

export interface ListUsersParams {
  role?: 'school_admin' | 'staff' | 'parent'
  search?: string
  sort_by?: string
  sort_dir?: 'asc' | 'desc'
  page?: number
  page_size?: number
}

interface Envelope<T> {
  data: T
  meta: unknown
  errors: unknown
}

export async function listUsers(params: ListUsersParams = {}): Promise<UserListResult> {
  const response = await apiClient.get<Envelope<UserListResult>>('/api/v1/users', { params })
  return response.data.data
}

export async function getUser(userId: string): Promise<PlatformUser> {
  const response = await apiClient.get<Envelope<PlatformUser>>(`/api/v1/users/${userId}`)
  return response.data.data
}

export async function setUserStatus(userId: string, isActive: boolean): Promise<PlatformUser> {
  const response = await apiClient.patch<Envelope<PlatformUser>>(`/api/v1/users/${userId}/status`, {
    is_active: isActive,
  })
  return response.data.data
}
