import { apiClient } from '@/api/client'

export type NotificationTargetRole = 'student' | 'parent' | 'staff'

export interface Notification {
  id: string
  title: string
  body: string
  source: 'manual' | 'system'
  sender_user_id: string
  created_at: string
  target_roles: NotificationTargetRole[]
}

export interface ComposeNotificationInput {
  title: string
  body: string
  target_roles: NotificationTargetRole[]
}

/** FR-044 — one row in the caller's own inbox. */
export interface InboxNotification {
  notification_id: string
  title: string
  body: string
  source: 'manual' | 'system'
  created_at: string
  delivery_status: 'pending' | 'sent' | 'failed'
  delivered_at: string | null
}

/** FR-052 — one row in the sender-facing sent-notifications log. */
export interface SentLogRow {
  id: string
  title: string
  body: string
  source: 'manual' | 'system'
  sender_name: string
  created_at: string
  target_roles: NotificationTargetRole[]
  delivery_outcome: { pending: number; sent: number; failed: number }
}

export interface PaginationMeta {
  page: number
  page_size: number
  total: number
  total_pages: number
}

export interface ListSentLogParams {
  page?: number
  page_size?: number
}

interface Envelope<T> {
  data: T
  meta: unknown
  errors: unknown
}

export async function composeNotification(input: ComposeNotificationInput): Promise<Notification> {
  const response = await apiClient.post<Envelope<Notification>>('/api/v1/notifications', input)
  return response.data.data
}

export async function listNotifications(
  params: ListSentLogParams = {},
): Promise<{ data: SentLogRow[]; meta: PaginationMeta }> {
  const response = await apiClient.get<Envelope<SentLogRow[]> & { meta: PaginationMeta }>(
    '/api/v1/notifications',
    { params },
  )
  return { data: response.data.data, meta: response.data.meta }
}

export async function listMyNotifications(): Promise<InboxNotification[]> {
  const response = await apiClient.get<Envelope<InboxNotification[]>>(
    '/api/v1/notifications/inbox',
  )
  return response.data.data
}
