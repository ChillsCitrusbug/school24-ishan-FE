import { apiClient } from '@/api/client'

interface Envelope<T> {
  data: T
  meta: unknown
  errors: unknown
}

export interface Profile {
  id: string
  full_name: string
  email: string
  mobile: string | null
  role: string
}

export async function getProfile(): Promise<Profile> {
  const response = await apiClient.get<Envelope<Profile>>('/api/v1/profile')
  return response.data.data
}

export async function updateProfile(fullName: string, mobile: string | null): Promise<Profile> {
  const response = await apiClient.patch<Envelope<Profile>>('/api/v1/profile', {
    full_name: fullName,
    mobile,
  })
  return response.data.data
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
): Promise<{ message: string }> {
  const response = await apiClient.post<Envelope<{ message: string }>>(
    '/api/v1/profile/change-password',
    {
      current_password: currentPassword,
      new_password: newPassword,
      confirm_password: confirmPassword,
    },
  )
  return response.data.data
}

export async function requestEmailChange(newEmail: string): Promise<{ message: string }> {
  const response = await apiClient.post<Envelope<{ message: string }>>(
    '/api/v1/profile/change-email',
    { new_email: newEmail },
  )
  return response.data.data
}

export async function confirmEmailChange(token: string): Promise<{ message: string }> {
  const response = await apiClient.post<Envelope<{ message: string }>>(
    '/api/v1/profile/confirm-email-change',
    { token },
  )
  return response.data.data
}
