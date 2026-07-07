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

describe('AllOrdersScreen (FR-042)', () => {
  it('shows an empty state when there are no orders', async () => {
    vi.mocked(ordersApi.listAdminOrders).mockResolvedValue({
      rows: [],
      meta: { page: 1, page_size: 50, total: 0, total_pages: 0 },
    })

    await renderAuthenticatedAt('/school-admin/orders/all')

    expect(await screen.findByText('No orders yet')).toBeInTheDocument()
  })

  it('lists both student-placed and parent-placed orders with the total count', async () => {
    vi.mocked(ordersApi.listAdminOrders).mockResolvedValue({
      rows: [ORDER],
      meta: { page: 1, page_size: 50, total: 1, total_pages: 1 },
    })

    await renderAuthenticatedAt('/school-admin/orders/all')

    expect(await screen.findByText('Mia Karim')).toBeInTheDocument()
    expect(screen.getByText('$12.40')).toBeInTheDocument()
    expect(screen.getByText(/Showing page 1 of 1 · 1 orders/)).toBeInTheDocument()
  })

  it('sends every active status server-side when the Active segment is clicked', async () => {
    vi.mocked(ordersApi.listAdminOrders).mockResolvedValue({
      rows: [ORDER],
      meta: { page: 1, page_size: 20, total: 1, total_pages: 1 },
    })

    await renderAuthenticatedAt('/school-admin/orders/all')
    await screen.findByText('Mia Karim')

    fireEvent.click(screen.getByRole('button', { name: /^active$/i }))

    await waitFor(() =>
      expect(ordersApi.listAdminOrders).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: ['pending', 'confirmed', 'preparing', 'ready'] }),
      ),
    )
  })

  it('re-fetches with a status filter when the Completed segment is clicked', async () => {
    vi.mocked(ordersApi.listAdminOrders).mockResolvedValue({
      rows: [ORDER],
      meta: { page: 1, page_size: 20, total: 1, total_pages: 1 },
    })

    await renderAuthenticatedAt('/school-admin/orders/all')
    await screen.findByText('Mia Karim')

    fireEvent.click(screen.getByRole('button', { name: /^completed$/i }))

    await waitFor(() =>
      expect(ordersApi.listAdminOrders).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: ['completed'] }),
      ),
    )
  })

  it('searches by student name and parent name only after Search is submitted, not per keystroke', async () => {
    vi.mocked(ordersApi.listAdminOrders).mockResolvedValue({
      rows: [ORDER],
      meta: { page: 1, page_size: 20, total: 1, total_pages: 1 },
    })

    await renderAuthenticatedAt('/school-admin/orders/all')
    await screen.findByText('Mia Karim')
    const callsBeforeTyping = vi.mocked(ordersApi.listAdminOrders).mock.calls.length

    // Round-2 review, Major finding: typing must NOT fire a request per
    // keystroke — only the initial page load's own call should exist
    // until Search is actually submitted.
    fireEvent.change(screen.getByLabelText('Student name'), { target: { value: 'M' } })
    fireEvent.change(screen.getByLabelText('Student name'), { target: { value: 'Mi' } })
    fireEvent.change(screen.getByLabelText('Student name'), { target: { value: 'Mia' } })
    fireEvent.change(screen.getByLabelText('Parent name'), { target: { value: 'Karim' } })
    expect(vi.mocked(ordersApi.listAdminOrders).mock.calls.length).toBe(callsBeforeTyping)

    fireEvent.click(screen.getByRole('button', { name: /^search$/i }))

    await waitFor(() =>
      expect(ordersApi.listAdminOrders).toHaveBeenLastCalledWith(
        expect.objectContaining({ student_name: 'Mia', parent_name: 'Karim' }),
      ),
    )
    expect(vi.mocked(ordersApi.listAdminOrders).mock.calls.length).toBe(callsBeforeTyping + 1)
  })

  it('moves to the next page then back to the previous one', async () => {
    vi.mocked(ordersApi.listAdminOrders).mockResolvedValue({
      rows: [ORDER],
      meta: { page: 1, page_size: 20, total: 40, total_pages: 2 },
    })

    await renderAuthenticatedAt('/school-admin/orders/all')
    await screen.findByText('Mia Karim')

    fireEvent.click(screen.getByRole('button', { name: /^next$/i }))

    await waitFor(() =>
      expect(ordersApi.listAdminOrders).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2 }),
      ),
    )

    fireEvent.click(screen.getByRole('button', { name: /^previous$/i }))

    await waitFor(() =>
      expect(ordersApi.listAdminOrders).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1 }),
      ),
    )
  })

  it('resets back to page 1 when the quick filter changes while on a later page', async () => {
    vi.mocked(ordersApi.listAdminOrders).mockResolvedValue({
      rows: [ORDER],
      meta: { page: 1, page_size: 20, total: 40, total_pages: 2 },
    })

    await renderAuthenticatedAt('/school-admin/orders/all')
    await screen.findByText('Mia Karim')
    fireEvent.click(screen.getByRole('button', { name: /^next$/i }))
    await waitFor(() =>
      expect(ordersApi.listAdminOrders).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2 }),
      ),
    )

    fireEvent.click(screen.getByRole('button', { name: /^completed$/i }))

    await waitFor(() =>
      expect(ordersApi.listAdminOrders).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1, status: ['completed'] }),
      ),
    )
  })

  it('navigates to the export screen when Export is clicked', async () => {
    vi.mocked(ordersApi.listAdminOrders).mockResolvedValue({
      rows: [ORDER],
      meta: { page: 1, page_size: 50, total: 1, total_pages: 1 },
    })

    await renderAuthenticatedAt('/school-admin/orders/all')
    await screen.findByText('Mia Karim')
    fireEvent.click(screen.getByRole('button', { name: /export/i }))

    await waitFor(() => expect(screen.getByText('Export order data')).toBeInTheDocument())
  })

  it('opening an order row navigates to its own detail screen', async () => {
    vi.mocked(ordersApi.listAdminOrders).mockResolvedValue({
      rows: [ORDER],
      meta: { page: 1, page_size: 50, total: 1, total_pages: 1 },
    })
    vi.mocked(ordersApi.getStaffOrderDetail).mockResolvedValue({ ...ORDER, items: [] })

    await renderAuthenticatedAt('/school-admin/orders/all')
    await screen.findByText('Mia Karim')
    fireEvent.click(screen.getByRole('button', { name: /open order/i }))

    await waitFor(() => expect(screen.getByText('Order #ORD-ABCD1234')).toBeInTheDocument())
  })

  it('shows an error state if loading fails', async () => {
    vi.mocked(ordersApi.listAdminOrders).mockRejectedValue({
      response: { data: { errors: 'Something broke.' } },
    })

    await renderAuthenticatedAt('/school-admin/orders/all')

    expect(await screen.findByText('Something broke.')).toBeInTheDocument()
  })
})
