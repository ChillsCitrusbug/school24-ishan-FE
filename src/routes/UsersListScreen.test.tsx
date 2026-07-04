import { StrictMode } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthContext'
import * as analyticsApi from '@/features/analytics/api'
import * as authApi from '@/features/auth/api'
import * as usersApi from '@/features/users/api'
import { StudentAuthProvider } from '@/features/student-auth/StudentAuthContext'
import { routes } from './index'

vi.mock('@/features/auth/api')
vi.mock('@/features/users/api')
vi.mock('@/features/analytics/api')

const PLATFORM_ADMIN_USER = {
  id: 'u1',
  full_name: 'Alex Morgan',
  email: 'alex@example.com',
  role: 'platform_admin' as const,
  school_id: null,
  school_name: null,
}

async function renderAuthenticatedAt(path: string, options: { strict?: boolean } = {}) {
  vi.mocked(authApi.login).mockResolvedValue({
    access_token: 'a-real-jwt',
    token_type: 'bearer',
    user: PLATFORM_ADMIN_USER,
  })
  vi.mocked(analyticsApi.getPlatformDashboard).mockResolvedValue({
    is_empty: true,
    schools: { active: 0, inactive: 0 },
    active_students: 0,
    users_by_role: { platform_admin: 0, school_admin: 0, staff: 0, parent: 0 },
    total_orders: 0,
    total_revenue: '0',
    orders_this_week: [],
    top_schools: [],
  })
  const router = createMemoryRouter(routes, { initialEntries: ['/login'] })
  const tree = (
    <AuthProvider>
      <StudentAuthProvider>
        <RouterProvider router={router} />
      </StudentAuthProvider>
    </AuthProvider>
  )
  const result = render(options.strict ? <StrictMode>{tree}</StrictMode> : tree)
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'alex@example.com' } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'whatever' } })
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
  await waitFor(() => expect(screen.getByText('Platform overview')).toBeInTheDocument())

  await act(async () => {
    await router.navigate(path)
  })
  return result
}

afterEach(() => {
  vi.restoreAllMocks()
})

const ADMIN_ROW: usersApi.PlatformUser = {
  id: 'u10',
  full_name: 'Priya Nair',
  email: 'priya@greenvale.edu.au',
  role: 'school_admin',
  school_id: 'sch1',
  school_name: 'Greenvale Primary',
  is_active: true,
}

const PARENT_ROW: usersApi.PlatformUser = {
  id: 'u11',
  full_name: 'Sarah Thompson',
  email: 'sarah@example.com',
  role: 'parent',
  school_id: null,
  school_name: null,
  is_active: false,
}

describe('UsersListScreen', () => {
  it('renders each user row with role, school, and status', async () => {
    vi.mocked(usersApi.listUsers).mockResolvedValue({
      items: [ADMIN_ROW, PARENT_ROW],
      total: 2,
      page: 1,
      page_size: 50,
    })

    await renderAuthenticatedAt('/platform-admin/users')

    expect(await screen.findByText('Priya Nair')).toBeInTheDocument()
    expect(screen.getByText('School Admin')).toBeInTheDocument()
    expect(screen.getByText('Greenvale Primary')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()

    expect(screen.getByText('Sarah Thompson')).toBeInTheDocument()
    expect(screen.getByText('Parent')).toBeInTheDocument()
    expect(screen.getByText('Deactivated')).toBeInTheDocument()
  })

  it('a parent row with no school shows a dash (field-reconciliation decision #3)', async () => {
    vi.mocked(usersApi.listUsers).mockResolvedValue({
      items: [PARENT_ROW],
      total: 1,
      page: 1,
      page_size: 50,
    })

    await renderAuthenticatedAt('/platform-admin/users')

    await screen.findByText('Sarah Thompson')
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('shows the empty state with no users', async () => {
    vi.mocked(usersApi.listUsers).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      page_size: 50,
    })

    await renderAuthenticatedAt('/platform-admin/users')

    expect(await screen.findByText('No users found')).toBeInTheDocument()
  })

  it('shows an error state with a retry action when the fetch fails', async () => {
    vi.mocked(usersApi.listUsers).mockRejectedValue(new Error('Network Error'))

    await renderAuthenticatedAt('/platform-admin/users')

    expect(
      await screen.findByText('Something went wrong. Please check your connection and try again.'),
    ).toBeInTheDocument()
  })

  it('filtering by role re-fetches with the role query param (Scenario 1)', async () => {
    vi.mocked(usersApi.listUsers).mockResolvedValue({
      items: [ADMIN_ROW, PARENT_ROW],
      total: 2,
      page: 1,
      page_size: 50,
    })

    await renderAuthenticatedAt('/platform-admin/users')
    await screen.findByText('Priya Nair')

    vi.mocked(usersApi.listUsers).mockResolvedValue({
      items: [ADMIN_ROW],
      total: 1,
      page: 1,
      page_size: 50,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Admins' }))

    await waitFor(() =>
      expect(usersApi.listUsers).toHaveBeenLastCalledWith({ role: 'school_admin' }),
    )
  })

  it('opening a row navigates to that user\'s detail screen', async () => {
    vi.mocked(usersApi.listUsers).mockResolvedValue({
      items: [ADMIN_ROW],
      total: 1,
      page: 1,
      page_size: 50,
    })
    vi.mocked(usersApi.getUser).mockResolvedValue(ADMIN_ROW)

    await renderAuthenticatedAt('/platform-admin/users')
    await screen.findByText('Priya Nair')
    fireEvent.click(screen.getByRole('button', { name: 'Open Priya Nair' }))

    expect(await screen.findByText('User ID')).toBeInTheDocument()
    expect(usersApi.getUser).toHaveBeenCalledWith('u10')
  })

  it('still renders user data under StrictMode double-invoke (regression, same class of bug as SchoolsListScreen)', async () => {
    vi.mocked(usersApi.listUsers).mockResolvedValue({
      items: [ADMIN_ROW],
      total: 1,
      page: 1,
      page_size: 50,
    })

    await renderAuthenticatedAt('/platform-admin/users', { strict: true })

    expect(await screen.findByText('Priya Nair')).toBeInTheDocument()
  })
})
