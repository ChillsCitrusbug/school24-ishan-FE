import { apiClient } from '@/api/client'

interface Envelope<T> {
  data: T
  meta: unknown
  errors: unknown
}

export interface StudentProfile {
  id: string
  full_name: string
  student_id: string
  class_label: string | null
}

export async function getStudentProfile(): Promise<StudentProfile> {
  const response = await apiClient.get<Envelope<StudentProfile>>('/api/v1/student-profile')
  return response.data.data
}

export async function changeStudentPassword(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
): Promise<{ message: string }> {
  const response = await apiClient.post<Envelope<{ message: string }>>(
    '/api/v1/student-profile/change-password',
    {
      current_password: currentPassword,
      new_password: newPassword,
      confirm_password: confirmPassword,
    },
  )
  return response.data.data
}
