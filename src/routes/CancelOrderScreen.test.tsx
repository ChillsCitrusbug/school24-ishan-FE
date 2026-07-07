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

const DETAIL = {
  id: 'o1',
  display_id: 'ORD-ABCD1234',
  student_id: 's1',
  student_name: 'Mia Karim',
  class_label: 'Year 3 · 3R',
  status: 'preparing' as const,
  total_amount: '12.40',
  placed_at: new Date().toISOString(),
  item_count: 1,
  item_summary: 'Sushi Pack',
  version: 3,
  items: [
    { name: 'Sushi Pack', variant_label: null, quantity: 1, unit_price: '12.40', line_total: '12.40' },
  ],
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('CancelOrderScreen (FR-039)', () => {
  it('shows the confirm state with items and total', async () => {
    vi.mocked(ordersApi.getStaffOrderDetail).mockResolvedValue(DETAIL)

    await renderAuthenticatedAt('/school-admin/orders/o1/cancel')

    expect(await screen.findByText('Cancel order #ORD-ABCD1234?')).toBeInTheDocument()
    expect(screen.getByText('Sushi Pack')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel & refund \$12\.40/i })).toBeInTheDocument()
  })

  it('confirming cancels the order and shows the success state with the refund amount', async () => {
    vi.mocked(ordersApi.getStaffOrderDetail).mockResolvedValue(DETAIL)
    vi.mocked(ordersApi.cancelOrder).mockResolvedValue({ ...DETAIL, status: 'cancelled' })

    await renderAuthenticatedAt('/school-admin/orders/o1/cancel')
    await screen.findByText('Cancel order #ORD-ABCD1234?')
    fireEvent.click(screen.getByRole('button', { name: /cancel & refund \$12\.40/i }))

    await waitFor(() => expect(ordersApi.cancelOrder).toHaveBeenCalledWith('o1'))
    expect(await screen.findByText('Order cancelled & refunded')).toBeInTheDocument()
    expect(screen.getByText('Refunded $12.40')).toBeInTheDocument()
  })

  it('shows an error banner if cancellation fails, and stays on the confirm screen', async () => {
    vi.mocked(ordersApi.getStaffOrderDetail).mockResolvedValue(DETAIL)
    vi.mocked(ordersApi.cancelOrder).mockRejectedValue({
      response: { data: { errors: 'This order has already been cancelled or completed and cannot be cancelled again.' } },
    })

    await renderAuthenticatedAt('/school-admin/orders/o1/cancel')
    await screen.findByText('Cancel order #ORD-ABCD1234?')
    fireEvent.click(screen.getByRole('button', { name: /cancel & refund \$12\.40/i }))

    expect(
      await screen.findByText(
        'This order has already been cancelled or completed and cannot be cancelled again.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('Cancel order #ORD-ABCD1234?')).toBeInTheDocument()
  })

  it('"Keep order" navigates back to the order detail screen without cancelling', async () => {
    vi.mocked(ordersApi.getStaffOrderDetail).mockResolvedValue(DETAIL)

    await renderAuthenticatedAt('/school-admin/orders/o1/cancel')
    await screen.findByText('Cancel order #ORD-ABCD1234?')
    fireEvent.click(screen.getByRole('button', { name: /keep order/i }))

    await waitFor(() => expect(screen.getByText('Order #ORD-ABCD1234')).toBeInTheDocument())
    expect(ordersApi.cancelOrder).not.toHaveBeenCalled()
  })

  it('shows an error state when the order fails to load', async () => {
    vi.mocked(ordersApi.getStaffOrderDetail).mockRejectedValue({
      response: { data: { errors: 'This order could not be loaded.' } },
    })

    await renderAuthenticatedAt('/school-admin/orders/o1/cancel')

    expect(await screen.findByText('This order could not be loaded.')).toBeInTheDocument()
  })
})
