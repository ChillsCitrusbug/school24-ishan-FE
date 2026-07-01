import { apiClient } from '@/api/client'

/** Mirrors src/schemas/auth.py's LoginResponse/UserSummary exactly. */
export interface UserSummary {
  id: string
  full_name: string
  email: string
  role: 'platform_admin' | 'school_admin' | 'staff' | 'parent'
  school_id: string | null
  school_name: string | null
}

export interface LoginResponse {
  access_token: string
  token_type: string
  user: UserSummary
}

interface Envelope<T> {
  data: T
  meta: unknown
  errors: unknown
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await apiClient.post<Envelope<LoginResponse>>('/api/v1/auth/login', {
    email,
    password,
  })
  return response.data.data
}

export async function getMe(): Promise<UserSummary> {
  const response = await apiClient.get<Envelope<UserSummary>>('/api/v1/auth/me')
  return response.data.data
}
