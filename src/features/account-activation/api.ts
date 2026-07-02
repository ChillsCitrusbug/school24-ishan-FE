import { apiClient } from '@/api/client'
import type { LoginResponse } from '@/features/auth/api'

interface Envelope<T> {
  data: T
  meta: unknown
  errors: unknown
}

export async function getActivationInfo(token: string): Promise<{ email: string }> {
  const response = await apiClient.post<Envelope<{ email: string }>>(
    '/api/v1/auth/activation-info',
    { token },
  )
  return response.data.data
}

export async function activateAccount(
  token: string,
  password: string,
  confirmPassword: string,
): Promise<LoginResponse> {
  const response = await apiClient.post<Envelope<LoginResponse>>('/api/v1/auth/activate', {
    token,
    password,
    confirm_password: confirmPassword,
  })
  return response.data.data
}
