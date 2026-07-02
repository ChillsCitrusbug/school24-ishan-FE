import { apiClient } from '@/api/client'

interface Envelope<T> {
  data: T
  meta: unknown
  errors: unknown
}

export async function requestPasswordReset(email: string): Promise<{ message: string }> {
  const response = await apiClient.post<Envelope<{ message: string }>>(
    '/api/v1/auth/forgot-password',
    { email },
  )
  return response.data.data
}

export async function resetPassword(
  token: string,
  password: string,
  confirmPassword: string,
): Promise<{ message: string }> {
  const response = await apiClient.post<Envelope<{ message: string }>>(
    '/api/v1/auth/reset-password',
    { token, password, confirm_password: confirmPassword },
  )
  return response.data.data
}
