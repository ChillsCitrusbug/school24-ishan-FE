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

interface Envelope<T> {
  data: T
  meta: unknown
  errors: unknown
}

export async function composeNotification(input: ComposeNotificationInput): Promise<Notification> {
  const response = await apiClient.post<Envelope<Notification>>('/api/v1/notifications', input)
  return response.data.data
}

export async function listNotifications(): Promise<Notification[]> {
  const response = await apiClient.get<Envelope<Notification[]>>('/api/v1/notifications')
  return response.data.data
}
