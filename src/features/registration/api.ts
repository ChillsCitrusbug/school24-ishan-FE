import { apiClient } from '@/api/client'

interface Envelope<T> {
  data: T
  meta: unknown
  errors: unknown
}

export async function register(
  fullName: string,
  email: string,
  mobile: string,
  password: string,
): Promise<{ message: string }> {
  const response = await apiClient.post<Envelope<{ message: string }>>('/api/v1/auth/register', {
    full_name: fullName,
    email,
    mobile,
    password,
  })
  return response.data.data
}

export async function verifyEmail(token: string): Promise<{ message: string }> {
  const response = await apiClient.post<Envelope<{ message: string }>>(
    '/api/v1/auth/verify-email',
    { token },
  )
  return response.data.data
}
