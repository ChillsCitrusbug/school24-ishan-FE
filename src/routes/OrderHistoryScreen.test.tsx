import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthContext'
import * as authApi from '@/features/auth/api'
import { StudentAuthProvider } from '@/features/student-auth/StudentAuthContext'
import * as studentAuthApi from '@/features/student-auth/api'
import * as ordersApi from '@/features/orders/api'
import { routes } from './index'

vi.mock('@/features/auth/api')
vi.mock('@/features/student-auth/api')
vi.mock('@/features/orders/api')
// Clicking an order row below navigates into OrderTrackingScreen, which
// opens a real WebSocket — irrelevant to this file's own scope (the
// history LIST), and jsdom has no real server to connect to.
vi.mock('@/features/orders/useOrderTrackingSocket', () => ({ useOrderTrackingSocket: vi.fn() }))

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
  await waitFor(() => expect(screen.getByText('Dashboard coming soon')).toBeInTheDocument())
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
  await waitFor(() => expect(screen.getByText(/canteen home coming soon/i)).toBeInTheDocument())
  await act(async () => {
    await router.navigate(path)
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

const ACTIVE_ORDER: ordersApi.StaffOrderSummary = {
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
}

const COMPLETED_ORDER: ordersApi.StaffOrderSummary = {
  ...ACTIVE_ORDER,
  id: 'o2',
  display_id: 'ORD-BBBB2222',
  status: 'completed',
}

describe('OrderHistoryScreen (FR-041)', () => {
  it('shows active orders by default, on the Active tab (Parent)', async () => {
    vi.mocked(ordersApi.listMyOrders).mockResolvedValue([ACTIVE_ORDER])

    await loginAsParentAt('/parent/orders')

    expect(await screen.findByText('#ORD-AAAA1111')).toBeInTheDocument()
    expect(ordersApi.listMyOrders).toHaveBeenCalledWith('active')
  })

  it('switching to the Completed tab fetches history orders (Student)', async () => {
    vi.mocked(ordersApi.listMyOrders).mockImplementation((view) =>
      Promise.resolve(view === 'history' ? [COMPLETED_ORDER] : [ACTIVE_ORDER]),
    )

    await loginAsStudentAt('/student/orders')
    await screen.findByText('#ORD-AAAA1111')
    fireEvent.click(screen.getByRole('button', { name: 'Completed' }))

    expect(await screen.findByText('#ORD-BBBB2222')).toBeInTheDocument()
    expect(ordersApi.listMyOrders).toHaveBeenCalledWith('history')
  })

  it('shows the empty state with no orders yet (EC-033)', async () => {
    vi.mocked(ordersApi.listMyOrders).mockResolvedValue([])

    await loginAsStudentAt('/student/orders')

    expect(await screen.findByText('No orders yet')).toBeInTheDocument()
  })

  it('shows an error state with a retry action when the fetch fails', async () => {
    vi.mocked(ordersApi.listMyOrders).mockRejectedValue({
      response: { data: { errors: 'Your orders could not be loaded.' } },
    })

    await loginAsParentAt('/parent/orders')

    expect(await screen.findByText('Your orders could not be loaded.')).toBeInTheDocument()
  })

  it('clicking an order row navigates to its own tracking/detail screen', async () => {
    vi.mocked(ordersApi.listMyOrders).mockResolvedValue([ACTIVE_ORDER])
    vi.mocked(ordersApi.getMyOrder).mockResolvedValue({ ...ACTIVE_ORDER, items: [] })

    await loginAsStudentAt('/student/orders')
    fireEvent.click(await screen.findByText('#ORD-AAAA1111'))

    expect(await screen.findByText('Order #ORD-AAAA1111')).toBeInTheDocument()
  })
})
