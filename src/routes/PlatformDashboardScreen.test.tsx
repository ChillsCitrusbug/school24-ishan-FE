import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthContext'
import * as analyticsApi from '@/features/analytics/api'
import * as authApi from '@/features/auth/api'
import { StudentAuthProvider } from '@/features/student-auth/StudentAuthContext'
import { routes } from './index'

vi.mock('@/features/auth/api')
vi.mock('@/features/analytics/api')

const PLATFORM_ADMIN_USER = {
  id: 'u1',
  full_name: 'Alex Morgan',
  email: 'alex@example.com',
  role: 'platform_admin' as const,
  school_id: null,
  school_name: null,
}

async function renderAuthenticated() {
  vi.mocked(authApi.login).mockResolvedValue({
    access_token: 'a-real-jwt',
    token_type: 'bearer',
    user: PLATFORM_ADMIN_USER,
  })
  const router = createMemoryRouter(routes, { initialEntries: ['/login'] })
  render(
    <AuthProvider>
      <StudentAuthProvider>
        <RouterProvider router={router} />
      </StudentAuthProvider>
    </AuthProvider>,
  )
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'alex@example.com' } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'whatever' } })
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
  await waitFor(() => expect(screen.getByText('Platform overview')).toBeInTheDocument())
}

afterEach(() => {
  vi.restoreAllMocks()
})

const POPULATED: analyticsApi.PlatformDashboard = {
  is_empty: false,
  schools: { active: 24, inactive: 1 },
  active_students: 8420,
  users_by_role: { platform_admin: 2, school_admin: 24, staff: 60, parent: 900 },
  total_orders: 1284,
  total_revenue: '48200.00',
  orders_this_week: [
    { day: 'Mon', count: 980 },
    { day: 'Tue', count: 1020 },
    { day: 'Wed', count: 890 },
    { day: 'Thu', count: 1100 },
    { day: 'Fri', count: 1300 },
    { day: 'Sat', count: 400 },
    { day: 'Sun', count: 300 },
  ],
  top_schools: [
    { school_id: 's1', school_name: 'Riverside College', orders: 420, revenue: '2940.00' },
    { school_id: 's2', school_name: 'Greenvale Primary', orders: 310, revenue: '2170.00' },
  ],
}

describe('PlatformDashboardScreen', () => {
  it('shows school/student/order/revenue stat cards (Scenario 1/2)', async () => {
    vi.mocked(analyticsApi.getPlatformDashboard).mockResolvedValue(POPULATED)

    await renderAuthenticated()

    expect(await screen.findByText('25')).toBeInTheDocument() // 24 active + 1 inactive
    expect(screen.getByText('8,420')).toBeInTheDocument()
    expect(screen.getByText('1,284')).toBeInTheDocument()
    expect(screen.getByText('$48200.00')).toBeInTheDocument()
  })

  it('shows active users broken down by role, including Platform Admins', async () => {
    vi.mocked(analyticsApi.getPlatformDashboard).mockResolvedValue(POPULATED)

    await renderAuthenticated()

    expect(await screen.findByText('Platform Admins')).toBeInTheDocument()
    expect(screen.getByText('School Admins')).toBeInTheDocument()
    expect(screen.getByText('Staff')).toBeInTheDocument()
    expect(screen.getByText('Parents')).toBeInTheDocument()
    expect(screen.getByText('900')).toBeInTheDocument()
  })

  it('shows the top schools ranked list', async () => {
    vi.mocked(analyticsApi.getPlatformDashboard).mockResolvedValue(POPULATED)

    await renderAuthenticated()

    expect(await screen.findByText('Riverside College')).toBeInTheDocument()
    expect(screen.getByText('420 orders')).toBeInTheDocument()
    expect(screen.getByText('$2940.00')).toBeInTheDocument()
  })

  it('shows the empty state when the platform has zero schools', async () => {
    vi.mocked(analyticsApi.getPlatformDashboard).mockResolvedValue({
      ...POPULATED,
      is_empty: true,
    })

    await renderAuthenticated()

    expect(await screen.findByText('No activity yet')).toBeInTheDocument()
    expect(screen.queryByText('Top schools')).not.toBeInTheDocument()
  })

  it('shows a partial-data state with sparse/zero figures, not an error, when schools exist but nothing else has happened yet', async () => {
    vi.mocked(analyticsApi.getPlatformDashboard).mockResolvedValue({
      is_empty: false,
      schools: { active: 1, inactive: 0 },
      active_students: 0,
      users_by_role: { platform_admin: 1, school_admin: 1, staff: 0, parent: 0 },
      total_orders: 0,
      total_revenue: '0',
      orders_this_week: [
        { day: 'Mon', count: 0 },
        { day: 'Tue', count: 0 },
        { day: 'Wed', count: 0 },
        { day: 'Thu', count: 0 },
        { day: 'Fri', count: 0 },
        { day: 'Sat', count: 0 },
        { day: 'Sun', count: 0 },
      ],
      top_schools: [],
    })

    await renderAuthenticated()

    expect(await screen.findByText('No orders yet.')).toBeInTheDocument()
    expect(screen.queryByText('No activity yet')).not.toBeInTheDocument()
  })

  it('shows an error state with a retry action when the fetch fails', async () => {
    vi.mocked(analyticsApi.getPlatformDashboard).mockRejectedValue(new Error('Network Error'))

    await renderAuthenticated()

    expect(
      await screen.findByText('Something went wrong. Please check your connection and try again.'),
    ).toBeInTheDocument()
  })

  it('the sidebar "Dashboard" link navigates for real', async () => {
    vi.mocked(analyticsApi.getPlatformDashboard).mockResolvedValue(POPULATED)

    await renderAuthenticated()
    await screen.findByText('Platform overview')

    for (const link of screen.getAllByRole('link', { name: /dashboard/i })) {
      expect(link).toHaveAttribute('href', '/platform-admin')
    }
  })
})
