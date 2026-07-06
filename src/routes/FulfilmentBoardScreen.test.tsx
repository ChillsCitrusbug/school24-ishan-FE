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

const ORDER = {
  id: 'o1',
  display_id: 'ORD-ABCD1234',
  student_id: 's1',
  student_name: 'Mia Karim',
  class_label: 'Year 3 · 3R',
  status: 'pending' as const,
  total_amount: '12.40',
  placed_at: new Date().toISOString(),
  item_count: 2,
  item_summary: 'Sushi Pack, Apple Juice',
  version: 1,
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('FulfilmentBoardScreen (FR-038)', () => {
  it('shows an empty state when there are no active orders', async () => {
    vi.mocked(ordersApi.listStaffOrders).mockResolvedValue([])

    await renderAuthenticatedAt('/school-admin/orders')

    expect(await screen.findByText('No active orders')).toBeInTheDocument()
  })

  it('groups orders into their own status column and advances one on click', async () => {
    vi.mocked(ordersApi.listStaffOrders).mockResolvedValue([ORDER])
    vi.mocked(ordersApi.advanceOrderStatus).mockResolvedValue({ ...ORDER, status: 'confirmed', items: [] })

    await renderAuthenticatedAt('/school-admin/orders')

    expect(await screen.findByText('Mia Karim')).toBeInTheDocument()
    expect(screen.getByText('Sushi Pack, Apple Juice')).toBeInTheDocument()
    expect(screen.getByText('$12.40')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /confirm/i }))

    await waitFor(() =>
      expect(ordersApi.advanceOrderStatus).toHaveBeenCalledWith('o1', 'confirmed'),
    )
  })

  it('excludes completed and cancelled orders from the active board', async () => {
    vi.mocked(ordersApi.listStaffOrders).mockResolvedValue([
      { ...ORDER, id: 'o2', status: 'completed' },
      { ...ORDER, id: 'o3', status: 'cancelled' },
    ])

    await renderAuthenticatedAt('/school-admin/orders')

    expect(await screen.findByText('No active orders')).toBeInTheDocument()
  })

  it('opening an order card navigates to its own detail screen', async () => {
    vi.mocked(ordersApi.listStaffOrders).mockResolvedValue([ORDER])
    vi.mocked(ordersApi.getStaffOrderDetail).mockResolvedValue({ ...ORDER, items: [] })

    await renderAuthenticatedAt('/school-admin/orders')
    await screen.findByText('Mia Karim')
    fireEvent.click(screen.getByRole('button', { name: /open order/i }))

    await waitFor(() => expect(screen.getByText('Order #ORD-ABCD1234')).toBeInTheDocument())
  })

  it('shows an error banner if advancing an order fails', async () => {
    vi.mocked(ordersApi.listStaffOrders).mockResolvedValue([ORDER])
    vi.mocked(ordersApi.advanceOrderStatus).mockRejectedValue({
      response: { data: { errors: 'This order cannot move to that status from its current status.' } },
    })

    await renderAuthenticatedAt('/school-admin/orders')
    await screen.findByText('Mia Karim')
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }))

    expect(
      await screen.findByText('This order cannot move to that status from its current status.'),
    ).toBeInTheDocument()
  })
})
