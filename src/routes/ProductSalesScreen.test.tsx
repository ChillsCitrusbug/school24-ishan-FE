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

const ROWS: reportsApi.ProductSalesRow[] = [
  { rank: 1, item_type: 'product', name: 'Apple Slices', quantity_sold: 40, revenue: '60.00' },
  { rank: 2, item_type: 'combo', name: 'Lunch Combo', quantity_sold: 12, revenue: '102.00' },
]

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ProductSalesScreen (FR-045)', () => {
  it('shows products/combos ranked by quantity sold', async () => {
    vi.mocked(reportsApi.getProductSalesReport).mockResolvedValue(ROWS)

    await renderAuthenticatedAt('/school-admin/reports/products')

    expect(await screen.findByText('Apple Slices')).toBeInTheDocument()
    expect(screen.getByText('Lunch Combo')).toBeInTheDocument()
    expect(screen.getAllByText(/\$\d+\.\d{2}/).length).toBeGreaterThan(0)
  })

  it('shows an empty state when there are no sales in range', async () => {
    vi.mocked(reportsApi.getProductSalesReport).mockResolvedValue([])

    await renderAuthenticatedAt('/school-admin/reports/products')

    expect(await screen.findByText('No sales in this range')).toBeInTheDocument()
  })

  it('shows an error state with a retry action when the fetch fails', async () => {
    vi.mocked(reportsApi.getProductSalesReport).mockRejectedValue({
      response: { data: { errors: 'Product sales could not be loaded.' } },
    })

    await renderAuthenticatedAt('/school-admin/reports/products')

    expect(await screen.findByText('Product sales could not be loaded.')).toBeInTheDocument()
  })

  it('"Back to reports" navigates to the main reports screen', async () => {
    vi.mocked(reportsApi.getProductSalesReport).mockResolvedValue(ROWS)
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

    await renderAuthenticatedAt('/school-admin/reports/products')
    await screen.findByText('Apple Slices')
    fireEvent.click(screen.getByRole('button', { name: /back to reports/i }))

    expect(await screen.findByText('Operational reports')).toBeInTheDocument()
  })
})
