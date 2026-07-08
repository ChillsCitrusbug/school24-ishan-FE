import { apiClient } from '@/api/client'

interface Envelope<T> {
  data: T
  meta: unknown
  errors: unknown
}

export interface UsersByRole {
  platform_admin: number
  school_admin: number
  staff: number
  parent: number
}

export interface OrdersThisWeekDay {
  day: string
  count: number
}

export interface TopSchool {
  school_id: string
  school_name: string
  orders: number
  revenue: string
}

export interface PlatformDashboard {
  is_empty: boolean
  schools: { active: number; inactive: number }
  active_students: number
  users_by_role: UsersByRole
  total_orders: number
  total_revenue: string
  orders_this_week: OrdersThisWeekDay[]
  top_schools: TopSchool[]
}

export async function getPlatformDashboard(): Promise<PlatformDashboard> {
  const response = await apiClient.get<Envelope<PlatformDashboard>>(
    '/api/v1/analytics/platform-dashboard',
  )
  return response.data.data
}

export interface PendingApprovalPreview {
  link_id: string
  parent_name: string
  student_name: string
}

export interface SchoolDashboard {
  is_empty: boolean
  students_count: number
  classes_count: number
  orders_today_count: number
  orders_today_value: string
  pending_approvals_count: number
  most_recent_pending_approval: PendingApprovalPreview | null
}

export async function getSchoolDashboard(): Promise<SchoolDashboard> {
  const response = await apiClient.get<Envelope<SchoolDashboard>>(
    '/api/v1/analytics/school-dashboard',
  )
  return response.data.data
}
