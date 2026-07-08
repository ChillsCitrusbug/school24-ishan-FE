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

const SA_USER = {
  id: 'u1',
  full_name: 'Priya Nair',
  email: 'priya@example.com',
  role: 'school_admin' as const,
  school_id: 's1',
  school_name: 'Greenvale Primary',
}

async function renderAuthenticated() {
  vi.mocked(authApi.login).mockResolvedValue({
    access_token: 'a-real-jwt',
    token_type: 'bearer',
    user: SA_USER,
  })
  const router = createMemoryRouter(routes, { initialEntries: ['/login'] })
  render(
    <AuthProvider>
      <StudentAuthProvider>
        <RouterProvider router={router} />
      </StudentAuthProvider>
    </AuthProvider>,
  )
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: SA_USER.email } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'whatever' } })
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
  await waitFor(() => expect(screen.getByText(/good morning/i)).toBeInTheDocument())
}

afterEach(() => {
  vi.restoreAllMocks()
})

const POPULATED: analyticsApi.SchoolDashboard = {
  is_empty: false,
  students_count: 412,
  classes_count: 18,
  orders_today_count: 286,
  orders_today_value: '1820.00',
  pending_approvals_count: 1,
  most_recent_pending_approval: {
    link_id: 'lk1',
    parent_name: 'Sarah Thompson',
    student_name: 'Noah Thompson',
  },
}

describe('SchoolAdminDashboard (Sc023Dashboard, live-data pass)', () => {
  it('shows real students/classes/orders-today/approvals stat cards, not the permanent placeholder', async () => {
    vi.mocked(analyticsApi.getSchoolDashboard).mockResolvedValue(POPULATED)

    await renderAuthenticated()

    expect(await screen.findByText('412')).toBeInTheDocument()
    expect(screen.getByText('across 18 classes')).toBeInTheDocument()
    expect(screen.getByText('286')).toBeInTheDocument()
    expect(screen.getByText('$1820.00 in sales')).toBeInTheDocument()
    expect(screen.getByText('1 pending')).toBeInTheDocument()
    expect(screen.queryByText('Let’s set up your school')).not.toBeInTheDocument()
  })

  it('shows a Quick actions grid that navigates into the real modules', async () => {
    vi.mocked(analyticsApi.getSchoolDashboard).mockResolvedValue(POPULATED)

    await renderAuthenticated()
    await screen.findByText('Quick actions')

    fireEvent.click(screen.getByRole('button', { name: /manage classes/i }))

    expect(await screen.findByRole('heading', { name: 'Classes' })).toBeInTheDocument()
  })

  it('shows the most recent pending approval in "Needs attention" with a working Review button', async () => {
    vi.mocked(analyticsApi.getSchoolDashboard).mockResolvedValue(POPULATED)

    await renderAuthenticated()

    expect(await screen.findByText('Needs attention')).toBeInTheDocument()
    expect(screen.getByText('Sarah Thompson')).toBeInTheDocument()
    expect(screen.getByText(/Noah Thompson/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /review/i }))

    expect(await screen.findByText('Link approvals')).toBeInTheDocument()
  })

  it('shows "All caught up" when there are no pending approvals', async () => {
    vi.mocked(analyticsApi.getSchoolDashboard).mockResolvedValue({
      ...POPULATED,
      pending_approvals_count: 0,
      most_recent_pending_approval: null,
    })

    await renderAuthenticated()

    expect(await screen.findByText('No pending approvals.')).toBeInTheDocument()
    expect(screen.getByText('None pending')).toBeInTheDocument()
  })

  it('shows the real empty state with a working "Create a class" link when the school has zero classes', async () => {
    vi.mocked(analyticsApi.getSchoolDashboard).mockResolvedValue({
      is_empty: true,
      students_count: 0,
      classes_count: 0,
      orders_today_count: 0,
      orders_today_value: '0.00',
      pending_approvals_count: 0,
      most_recent_pending_approval: null,
    })

    await renderAuthenticated()

    expect(await screen.findByText('Let’s set up your school')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /create a class/i }))

    expect(await screen.findByRole('heading', { name: 'Create a class' })).toBeInTheDocument()
  })

  it('shows an error state with a retry action when the dashboard fails to load', async () => {
    vi.mocked(analyticsApi.getSchoolDashboard).mockRejectedValue(new Error('Network Error'))

    await renderAuthenticated()

    expect(
      await screen.findByText('Something went wrong. Please check your connection and try again.'),
    ).toBeInTheDocument()
  })
})
