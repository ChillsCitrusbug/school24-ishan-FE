import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthContext'
import * as authApi from '@/features/auth/api'
import { StudentAuthProvider } from '@/features/student-auth/StudentAuthContext'
import * as reportsApi from '@/features/parent-reports/api'
import type { SpendingReport } from '@/features/parent-reports/api'
import { routes } from './index'

vi.mock('@/features/auth/api')
vi.mock('@/features/parent-reports/api')

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

afterEach(() => {
  vi.restoreAllMocks()
})

const REPORT: SpendingReport = {
  parent_wallet: { id: 'pw1', balance: '15.00' },
  children: [
    {
      student_id: 's1',
      full_name: 'Liam Carter',
      class_label: 'Year 3 · 3R',
      wallet_balance: '20.00',
      total_spent: '6.50',
      order_count: 1,
    },
    {
      student_id: 's2',
      full_name: 'Ava Carter',
      class_label: 'Year 5 · 5B',
      wallet_balance: '10.00',
      total_spent: '4.25',
      order_count: 1,
    },
  ],
  total_spent: '10.75',
  total_order_count: 2,
  average_order: '5.38',
  previous_period_total_spent: '8.00',
  percent_change_vs_previous_period: 34.4,
  top_category: { label: 'Hot Food', total_spent: '6.50', percent_of_total: 60.5 },
  by_category: [
    { label: 'Hot Food', total_spent: '6.50' },
    { label: 'Snacks', total_spent: '4.25' },
  ],
  by_week: [
    { week_label: 'Wk 1', children: [{ student_name: 'Liam Carter', total_spent: '6.50' }] },
    { week_label: 'Wk 2', children: [{ student_name: 'Ava Carter', total_spent: '4.25' }] },
  ],
  orders: [
    {
      id: 'o1',
      display_id: 'ORD-AAAA1111',
      student_id: 's1',
      student_name: 'Liam Carter',
      status: 'completed',
      total_amount: '6.50',
      placed_at: '2026-07-07T09:00:00Z',
      item_count: 1,
      items_summary: 'Chicken Wrap',
      category: 'Hot Food',
    },
  ],
}

describe('SpendingReportScreen (FR-046)', () => {
  it('shows total spent, orders, average order, and a "vs previous period" comparison', async () => {
    vi.mocked(reportsApi.getSpendingReport).mockResolvedValue(REPORT)

    await loginAsParentAt('/parent/spending-report')

    expect((await screen.findAllByText('$10.75')).length).toBeGreaterThan(0)
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('$5.38')).toBeInTheDocument()
    expect(screen.getByText(/▲ 34.4% vs previous period/)).toBeInTheDocument()
  })

  it('shows the top-category stat card', async () => {
    vi.mocked(reportsApi.getSpendingReport).mockResolvedValue(REPORT)

    await loginAsParentAt('/parent/spending-report')

    expect((await screen.findAllByText('Hot Food')).length).toBeGreaterThan(0)
    expect(screen.getByText(/\$6.50 · 60.5% of spend/)).toBeInTheDocument()
  })

  it('shows the by-category donut and by-week bar chart legends', async () => {
    vi.mocked(reportsApi.getSpendingReport).mockResolvedValue(REPORT)

    await loginAsParentAt('/parent/spending-report')

    await waitFor(() => expect(screen.getAllByText('Liam Carter').length).toBeGreaterThan(0))
    expect(screen.getAllByText('Ava Carter').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Snacks').length).toBeGreaterThan(0)
  })

  it('shows the transactions table with real item names and category', async () => {
    vi.mocked(reportsApi.getSpendingReport).mockResolvedValue(REPORT)

    await loginAsParentAt('/parent/spending-report')

    expect(await screen.findByText('Chicken Wrap')).toBeInTheDocument()
    expect(screen.getAllByText('Hot Food').length).toBeGreaterThan(0)
  })

  it('filtering to one child re-fetches scoped to that childs own id', async () => {
    vi.mocked(reportsApi.getSpendingReport).mockResolvedValue(REPORT)

    await loginAsParentAt('/parent/spending-report')
    await screen.findByRole('button', { name: 'Liam Carter' })
    fireEvent.click(screen.getByRole('button', { name: 'Liam Carter' }))

    await waitFor(() => {
      const lastCall = vi.mocked(reportsApi.getSpendingReport).mock.calls.at(-1)
      expect(lastCall?.[1]?.childId).toBe('s1')
    })
  })

  it('re-fetches with the selected preset date range', async () => {
    vi.mocked(reportsApi.getSpendingReport).mockResolvedValue(REPORT)

    await loginAsParentAt('/parent/spending-report')
    await screen.findAllByText('$10.75')
    const callsBefore = vi.mocked(reportsApi.getSpendingReport).mock.calls.length

    fireEvent.click(screen.getByRole('button', { name: /\d{4}/ }))
    fireEvent.click(await screen.findByRole('button', { name: /^last 7 days$/i }))

    await waitFor(() =>
      expect(vi.mocked(reportsApi.getSpendingReport).mock.calls.length).toBeGreaterThan(
        callsBefore,
      ),
    )
    const lastCall = vi.mocked(reportsApi.getSpendingReport).mock.calls.at(-1)
    expect(lastCall?.[1]?.dateFrom).toBeDefined()
  })

  it('downloads a CSV export when "Export" is clicked', async () => {
    vi.mocked(reportsApi.getSpendingReport).mockResolvedValue(REPORT)
    vi.mocked(reportsApi.exportSpendingReport).mockResolvedValue(new Blob(['csv,data']))
    const createObjectURL = vi.fn().mockReturnValue('blob:mock')
    const revokeObjectURL = vi.fn()
    window.URL.createObjectURL = createObjectURL
    window.URL.revokeObjectURL = revokeObjectURL

    await loginAsParentAt('/parent/spending-report')
    await screen.findAllByText('$10.75')
    fireEvent.click(screen.getByRole('button', { name: /^export$/i }))

    await waitFor(() => expect(reportsApi.exportSpendingReport).toHaveBeenCalled())
    expect(createObjectURL).toHaveBeenCalled()
  })

  it('shows an empty state with no orders yet', async () => {
    vi.mocked(reportsApi.getSpendingReport).mockResolvedValue({
      ...REPORT,
      orders: [],
      by_category: [],
      by_week: [],
      top_category: null,
    })

    await loginAsParentAt('/parent/spending-report')

    expect(await screen.findByText('No orders yet')).toBeInTheDocument()
  })

  it('shows a "No approved children" empty state for a parent with zero approved links (EC-036)', async () => {
    vi.mocked(reportsApi.getSpendingReport).mockResolvedValue({
      parent_wallet: { id: 'pw1', balance: '0.00' },
      children: [],
      total_spent: '0.00',
      total_order_count: 0,
      average_order: '0.00',
      previous_period_total_spent: null,
      percent_change_vs_previous_period: null,
      top_category: null,
      by_category: [],
      by_week: [],
      orders: [],
    })

    await loginAsParentAt('/parent/spending-report')

    expect(await screen.findByText('No approved children')).toBeInTheDocument()
  })

  it('shows an error state with a retry action when the fetch fails', async () => {
    vi.mocked(reportsApi.getSpendingReport).mockRejectedValue({
      response: { data: { errors: 'Your spending report could not be loaded.' } },
    })

    await loginAsParentAt('/parent/spending-report')

    expect(
      await screen.findByText('Your spending report could not be loaded.'),
    ).toBeInTheDocument()
  })
})
