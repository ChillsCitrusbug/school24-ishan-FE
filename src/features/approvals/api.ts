import { apiClient } from '@/api/client'

export interface PendingLinkRequest {
  id: string
  parent_name: string
  parent_email: string
  student_id_code: string
  student_name: string
  class_name: string
  requested_at: string
}

export interface DecidedLinkRequest {
  id: string
  student_id: string
  status: 'pending' | 'approved' | 'rejected'
  student_full_name: string
  student_id_code: string
}

interface Envelope<T> {
  data: T
  meta: unknown
  errors: unknown
}

export async function listPendingLinkRequests(): Promise<PendingLinkRequest[]> {
  const response = await apiClient.get<Envelope<PendingLinkRequest[]>>(
    '/api/v1/approvals/parent-links',
  )
  return response.data.data
}

export async function decideLinkRequest(
  linkId: string,
  decision: 'approve' | 'reject',
  rejectReason?: string,
): Promise<DecidedLinkRequest> {
  const response = await apiClient.patch<Envelope<DecidedLinkRequest>>(
    `/api/v1/approvals/parent-links/${linkId}`,
    { decision, reject_reason: rejectReason ?? null },
  )
  return response.data.data
}
