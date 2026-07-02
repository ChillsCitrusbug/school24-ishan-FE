import { apiClient } from '@/api/client'
import type { LoginResponse } from '@/features/auth/api'

interface Envelope<T> {
  data: T
  meta: unknown
  errors: unknown
}

export interface StartEnableResult {
  message: string
  challenge_token: string
}

export interface ConfirmEnableResult {
  message: string
  backup_codes: string[]
}

export async function startEnable(): Promise<StartEnableResult> {
  const response = await apiClient.post<Envelope<StartEnableResult>>('/api/v1/2fa/enable/start')
  return response.data.data
}

export async function confirmEnable(
  challengeToken: string,
  code: string,
): Promise<ConfirmEnableResult> {
  const response = await apiClient.post<Envelope<ConfirmEnableResult>>('/api/v1/2fa/enable/confirm', {
    challenge_token: challengeToken,
    code,
  })
  return response.data.data
}

export async function disable(): Promise<{ message: string }> {
  const response = await apiClient.post<Envelope<{ message: string }>>('/api/v1/2fa/disable')
  return response.data.data
}

export async function resendCode(challengeToken: string): Promise<{ message: string }> {
  const response = await apiClient.post<Envelope<{ message: string }>>('/api/v1/2fa/resend-code', {
    challenge_token: challengeToken,
  })
  return response.data.data
}

export async function verifyLoginChallenge(
  challengeToken: string,
  code: string,
): Promise<LoginResponse> {
  const response = await apiClient.post<Envelope<LoginResponse>>('/api/v1/2fa/verify', {
    challenge_token: challengeToken,
    code,
  })
  return response.data.data
}

export async function verifyLoginBackupCode(
  challengeToken: string,
  backupCode: string,
): Promise<LoginResponse> {
  const response = await apiClient.post<Envelope<LoginResponse>>('/api/v1/2fa/verify-backup-code', {
    challenge_token: challengeToken,
    backup_code: backupCode,
  })
  return response.data.data
}
