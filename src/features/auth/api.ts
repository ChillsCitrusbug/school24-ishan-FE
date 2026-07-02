import { apiClient } from '@/api/client'

/** Mirrors src/schemas/auth.py's LoginResponse/UserSummary. */
export interface UserSummary {
  id: string
  full_name: string
  email: string
  role: 'platform_admin' | 'school_admin' | 'staff' | 'parent'
  school_id: string | null
  school_name: string | null
  // FR-050 — additive, deliberately optional (not `boolean`): the field
  // is real on every actual API response, but making it required here
  // would force every OTHER ticket's own test fixtures (15+ files) to
  // add a field they have no reason to care about. Only
  // TwoFactorSetupScreen.tsx reads it, and treats `undefined` the same
  // as `false`.
  two_factor_enabled?: boolean
}

export interface LoginResponse {
  access_token: string
  token_type: string
  user: UserSummary
}

/** FR-050 — a 2FA-enabled user's password-acceptance response: no
 * session yet, only a challenge_token the second, distinct verify call
 * (src/features/two-factor/api.ts) redeems into a real LoginResponse. */
export interface TwoFactorChallengeResult {
  must_provide_2fa: true
  challenge_token: string
}

export type LoginResult = LoginResponse | TwoFactorChallengeResult

interface Envelope<T> {
  data: T
  meta: unknown
  errors: unknown
}

export async function login(email: string, password: string): Promise<LoginResult> {
  const response = await apiClient.post<Envelope<LoginResult>>('/api/v1/auth/login', {
    email,
    password,
  })
  return response.data.data
}

export async function getMe(): Promise<UserSummary> {
  const response = await apiClient.get<Envelope<UserSummary>>('/api/v1/auth/me')
  return response.data.data
}
