import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthContext'
import * as authApi from '@/features/auth/api'
import { StudentAuthProvider } from '@/features/student-auth/StudentAuthContext'
import * as studentAuthApi from '@/features/student-auth/api'
import * as ordersApi from '@/features/orders/api'
import * as trackingSocket from '@/features/orders/useOrderTrackingSocket'
import { routes } from './index'

vi.mock('@/features/auth/api')
vi.mock('@/features/student-auth/api')
vi.mock('@/features/orders/api')
vi.mock('@/features/orders/useOrderTrackingSocket')

const PARENT_USER = {
  id: 'u1',
  full_name: 'Sarah Thompson',
  email: 'sarah@example.com',
  role: 'parent' as const,
  school_id: null,
  school_name: null,
}

async function loginAsParentAt(path: string) {
  vi.mocked(authApi.login).mockResolvedValue({
    access_token: 'a-real-jwt',
    token_type: 'bearer',
    user: PARENT_USER,
  })
  const router = createMemoryRouter(routes, { initialEntries: ['/login'] })
  render(
    <AuthProvider>
      <StudentAuthProvider>
        <RouterProvider router={router} />
      </StudentAuthProvider>
    </AuthProvider>,
  )
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: PARENT_USER.email } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'whatever' } })
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
  await waitFor(() => expect(screen.getByText(/good morning/i)).toBeInTheDocument())
  await act(async () => {
    await router.navigate(path)
  })
}

async function loginAsStudentAt(path: string) {
  vi.mocked(studentAuthApi.login).mockResolvedValue({
    access_token: 'a-real-jwt',
    token_type: 'bearer',
    student: { id: 's1', full_name: 'Noah Thompson', student_id: 'S-41880', school_id: 'sc1' },
  })
  const router = createMemoryRouter(routes, { initialEntries: ['/student-login'] })
  render(
    <AuthProvider>
      <StudentAuthProvider>
        <RouterProvider router={router} />
      </StudentAuthProvider>
    </AuthProvider>,
  )
  fireEvent.change(screen.getByLabelText('Student ID'), { target: { value: 'S-41880' } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'whatever' } })
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
  await waitFor(() => expect(screen.getByText(/grab your usual in a tap/i)).toBeInTheDocument())
  await act(async () => {
    await router.navigate(path)
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

const ACTIVE_DETAIL: ordersApi.StaffOrderDetail = {
  id: 'o1',
  display_id: 'ORD-AAAA1111',
  student_id: 's1',
  student_name: 'Noah Thompson',
  class_label: 'Year 3 · 3R',
  status: 'preparing',
  total_amount: '6.50',
  placed_at: '2026-07-07T09:00:00Z',
  item_count: 1,
  item_summary: 'Apple Slices',
  version: 1,
  items: [{ name: 'Apple Slices', variant_label: null, quantity: 1, unit_price: '6.50', line_total: '6.50' }],
}

describe('OrderTrackingScreen (FR-041)', () => {
  it('shows the live timeline and no final-record note for an active order', async () => {
    vi.mocked(ordersApi.getMyOrder).mockResolvedValue(ACTIVE_DETAIL)

    await loginAsParentAt('/parent/orders/o1')

    expect(await screen.findByText('Order #ORD-AAAA1111')).toBeInTheDocument()
    expect(screen.getAllByText('Preparing').length).toBeGreaterThan(0)
    expect(screen.queryByText(/final record/i)).not.toBeInTheDocument()
  })

  it('shows a ready-to-collect banner when the order is ready', async () => {
    vi.mocked(ordersApi.getMyOrder).mockResolvedValue({ ...ACTIVE_DETAIL, status: 'ready' })

    await loginAsStudentAt('/student/orders/o1')

    expect(await screen.findByText(/ready to collect — head/i)).toBeInTheDocument()
  })

  it('shows a static completed record with a final-record note, no timeline', async () => {
    vi.mocked(ordersApi.getMyOrder).mockResolvedValue({ ...ACTIVE_DETAIL, status: 'completed' })

    await loginAsStudentAt('/student/orders/o1')

    expect(await screen.findByText('Completed')).toBeInTheDocument()
    expect(screen.getByText(/final record/i)).toBeInTheDocument()
  })

  it('shows a refund banner for a cancelled order', async () => {
    vi.mocked(ordersApi.getMyOrder).mockResolvedValue({ ...ACTIVE_DETAIL, status: 'cancelled' })

    await loginAsParentAt('/parent/orders/o1')

    expect(await screen.findByText('Cancelled')).toBeInTheDocument()
    expect(
      screen.getByText('This order was cancelled and fully refunded to the wallet.'),
    ).toBeInTheDocument()
  })

  it('shows an error state when the order fails to load', async () => {
    vi.mocked(ordersApi.getMyOrder).mockRejectedValue({
      response: { data: { errors: 'This order could not be loaded.' } },
    })

    await loginAsStudentAt('/student/orders/o1')

    expect(await screen.findByText('This order could not be loaded.')).toBeInTheDocument()
  })

  it('refetches the order when the WebSocket pushes a matching status change', async () => {
    vi.mocked(ordersApi.getMyOrder)
      .mockResolvedValueOnce(ACTIVE_DETAIL)
      .mockResolvedValueOnce({ ...ACTIVE_DETAIL, status: 'ready' })
    let pushMessage: ((message: trackingSocket.OrderStatusChangedMessage) => void) | undefined
    vi.mocked(trackingSocket.useOrderTrackingSocket).mockImplementation((callback) => {
      pushMessage = callback
    })

    await loginAsParentAt('/parent/orders/o1')
    await screen.findByText('Order #ORD-AAAA1111')

    act(() => {
      pushMessage?.({ type: 'order_status_changed', order_id: 'o1', status: 'ready' })
    })

    await waitFor(() => expect(ordersApi.getMyOrder).toHaveBeenCalledTimes(2))
    expect(await screen.findByText(/ready to collect — head/i)).toBeInTheDocument()
  })

  it('ignores a WebSocket push for a different order', async () => {
    vi.mocked(ordersApi.getMyOrder).mockResolvedValue(ACTIVE_DETAIL)
    let pushMessage: ((message: trackingSocket.OrderStatusChangedMessage) => void) | undefined
    vi.mocked(trackingSocket.useOrderTrackingSocket).mockImplementation((callback) => {
      pushMessage = callback
    })

    await loginAsStudentAt('/student/orders/o1')
    await screen.findByText('Order #ORD-AAAA1111')

    act(() => {
      pushMessage?.({ type: 'order_status_changed', order_id: 'some-other-order', status: 'ready' })
    })

    expect(ordersApi.getMyOrder).toHaveBeenCalledTimes(1)
  })
})
