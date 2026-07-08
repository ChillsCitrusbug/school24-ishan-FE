import { apiClient } from '@/api/client'

/** Mirrors src/schemas/student_auth.py's StudentSummary exactly. */
export interface StudentSummary {
  id: string
  full_name: string
  student_id: string
  school_id: string
}

export interface StudentSessionResult {
  access_token: string
  token_type: string
  student: StudentSummary
}

export interface StudentChallengeResult {
  must_change_password: true
  change_token: string
}

export type StudentLoginResult = StudentSessionResult | StudentChallengeResult

interface Envelope<T> {
  data: T
  meta: unknown
  errors: unknown
}

export async function login(studentId: string, password: string): Promise<StudentLoginResult> {
  const response = await apiClient.post<Envelope<StudentLoginResult>>(
    '/api/v1/student-auth/login',
    { student_id: studentId, password },
  )
  return response.data.data
}

/** Callers must attach the change_token as the request's Bearer token —
 * see StudentAuthContext.completePasswordChange. */
export async function changePassword(
  changeToken: string,
  newPassword: string,
  confirmPassword: string,
): Promise<StudentSessionResult> {
  const response = await apiClient.post<Envelope<StudentSessionResult>>(
    '/api/v1/student-auth/change-password',
    { new_password: newPassword, confirm_password: confirmPassword },
    { headers: { Authorization: `Bearer ${changeToken}` } },
  )
  return response.data.data
}

/** Session-persistence addition: the student-side "who am I" check,
 * mirroring `features/auth/api.ts`'s own `getMe()` — reuses the
 * existing FR-048 profile endpoint (which already returns everything
 * `StudentSummary` needs) rather than adding a new one. Used only by
 * `StudentAuthContext`'s own boot-time rehydration attempt against a
 * persisted token. */
export async function getMe(): Promise<StudentSummary> {
  const response = await apiClient.get<Envelope<StudentSummary>>('/api/v1/student-profile')
  return response.data.data
}
