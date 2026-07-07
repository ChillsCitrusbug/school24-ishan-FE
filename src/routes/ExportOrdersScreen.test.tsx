import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthContext'
import * as authApi from '@/features/auth/api'
import type { UserSummary } from '@/features/auth/api'
import * as ordersApi from '@/features/orders/api'
import { StudentAuthProvider } from '@/features/student-auth/StudentAuthContext'
import { routes } from './index'

vi.mock('@/features/auth/api')
vi.mock('@/features/orders/api')

const SCHOOL_ADMIN_USER = {
  id: 'u1',
  full_name: 'Priya Nair',
  email: 'priya@example.com',
  role: 'school_admin' as const,
  school_id: 's1',
  school_name: 'Greenvale Primary',
}

async function renderAuthenticatedAt(path: string, user: UserSummary = SCHOOL_ADMIN_USER) {
  vi.mocked(authApi.login).mockResolvedValue({
    access_token: 'a-real-jwt',
    token_type: 'bearer',
    user,
  })
  const router = createMemoryRouter(routes, { initialEntries: ['/login'] })
  render(
    <AuthProvider>
      <StudentAuthProvider>
        <RouterProvider router={router} />
      </StudentAuthProvider>
    </AuthProvider>,
  )
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: user.email } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'whatever' } })
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: /sign in/i })).not.toBeInTheDocument(),
  )
  await act(async () => {
    await router.navigate(path)
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ExportOrdersScreen (FR-042)', () => {
  it('generates and offers a CSV download', async () => {
    const blob = new Blob(['Order,Student\n'], { type: 'text/csv' })
    vi.mocked(ordersApi.exportAdminOrders).mockResolvedValue(blob)

    await renderAuthenticatedAt('/school-admin/orders/export')
    fireEvent.click(screen.getByRole('button', { name: /generate export/i }))

    expect(await screen.findByText('Your export is ready')).toBeInTheDocument()
    expect(ordersApi.exportAdminOrders).toHaveBeenCalledWith(
      expect.objectContaining({ date_from: expect.any(String), date_to: expect.any(String) }),
    )
  })

  it('shows an error if the export fails', async () => {
    vi.mocked(ordersApi.exportAdminOrders).mockRejectedValue({
      response: { data: { errors: 'Export failed.' } },
    })

    await renderAuthenticatedAt('/school-admin/orders/export')
    fireEvent.click(screen.getByRole('button', { name: /generate export/i }))

    expect(await screen.findByText('Export failed.')).toBeInTheDocument()
  })

  it('going back navigates to the all-orders screen', async () => {
    vi.mocked(ordersApi.listAdminOrders).mockResolvedValue({
      rows: [],
      meta: { page: 1, page_size: 50, total: 0, total_pages: 0 },
    })

    await renderAuthenticatedAt('/school-admin/orders/export')
    fireEvent.click(screen.getByRole('button', { name: /^orders$/i }))

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'All orders' })).toBeInTheDocument(),
    )
  })
})
