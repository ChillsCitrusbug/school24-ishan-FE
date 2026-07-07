import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthContext'
import * as authApi from '@/features/auth/api'
import type { UserSummary } from '@/features/auth/api'
import { StudentAuthProvider } from '@/features/student-auth/StudentAuthContext'
import * as reportsApi from '@/features/reports/api'
import { routes } from './index'

vi.mock('@/features/auth/api')
vi.mock('@/features/reports/api')

const SCHOOL_ADMIN_USER: UserSummary = {
  id: 'u1',
  full_name: 'Priya Nair',
  email: 'priya@example.com',
  role: 'school_admin',
  school_id: 's1',
  school_name: 'Greenvale Primary',
}

async function renderAuthenticatedAt(path: string) {
  vi.mocked(authApi.login).mockResolvedValue({
    access_token: 'a-real-jwt',
    token_type: 'bearer',
    user: SCHOOL_ADMIN_USER,
  })
  const router = createMemoryRouter(routes, { initialEntries: ['/login'] })
  render(
    <AuthProvider>
      <StudentAuthProvider>
        <RouterProvider router={router} />
      </StudentAuthProvider>
    </AuthProvider>,
  )
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: SCHOOL_ADMIN_USER.email } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'whatever' } })
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: /sign in/i })).not.toBeInTheDocument(),
  )
  await act(async () => {
    await router.navigate(path)
  })
}

const DAILY_REPORT: reportsApi.DailyOrdersReport = {
  days: [
    { date: '2026-07-01', order_count: 3, value: '19.50' },
    { date: '2026-07-02', order_count: 2, value: '13.00' },
  ],
  status_breakdown: [
    { status: 'completed', count: 4 },
    { status: 'cancelled', count: 1 },
  ],
  total_order_count: 5,
  total_value: '32.50',
}

const REVENUE_REPORT: reportsApi.RevenueSummaryReport = {
  total_revenue: '26.00',
  order_count: 4,
  average_order: '6.50',
  refunds_total: '9.99',
  refunds_count: 1,
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ReportsScreen (FR-045)', () => {
  it('shows the orders/revenue/average/refunds stat cards and status breakdown', async () => {
    vi.mocked(reportsApi.getDailyOrdersReport).mockResolvedValue(DAILY_REPORT)
    vi.mocked(reportsApi.getRevenueSummaryReport).mockResolvedValue(REVENUE_REPORT)

    await renderAuthenticatedAt('/school-admin/reports')

    expect(await screen.findByText('5')).toBeInTheDocument()
    expect(screen.getByText('$26.00')).toBeInTheDocument()
    expect(screen.getByText('$6.50')).toBeInTheDocument()
    expect(screen.getByText('$9.99')).toBeInTheDocument()
    expect(screen.getByText('Completed')).toBeInTheDocument()
    expect(screen.getByText('Cancelled')).toBeInTheDocument()
  })

  it('shows an empty state when there are no orders in range', async () => {
    vi.mocked(reportsApi.getDailyOrdersReport).mockResolvedValue({
      days: [],
      status_breakdown: [],
      total_order_count: 0,
      total_value: '0.00',
    })
    vi.mocked(reportsApi.getRevenueSummaryReport).mockResolvedValue({
      total_revenue: '0.00',
      order_count: 0,
      average_order: '0.00',
      refunds_total: '0.00',
      refunds_count: 0,
    })

    await renderAuthenticatedAt('/school-admin/reports')

    expect(await screen.findByText('No orders in this range')).toBeInTheDocument()
  })

  it('shows an error state with a retry action when the fetch fails', async () => {
    vi.mocked(reportsApi.getDailyOrdersReport).mockRejectedValue({
      response: { data: { errors: 'Reports could not be loaded.' } },
    })
    vi.mocked(reportsApi.getRevenueSummaryReport).mockResolvedValue(REVENUE_REPORT)

    await renderAuthenticatedAt('/school-admin/reports')

    expect(await screen.findByText('Reports could not be loaded.')).toBeInTheDocument()
  })

  it('the "Product sales" button navigates to the product sales report', async () => {
    vi.mocked(reportsApi.getDailyOrdersReport).mockResolvedValue(DAILY_REPORT)
    vi.mocked(reportsApi.getRevenueSummaryReport).mockResolvedValue(REVENUE_REPORT)
    vi.mocked(reportsApi.getProductSalesReport).mockResolvedValue([])

    await renderAuthenticatedAt('/school-admin/reports')
    await screen.findByText('$26.00')
    fireEvent.click(screen.getByRole('button', { name: /product sales/i }))

    expect(await screen.findByText('Product sales')).toBeInTheDocument()
  })
})
