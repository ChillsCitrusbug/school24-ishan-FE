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
  monthly_summary: [
    { month: '2026-07', total_spent: '6.50', order_count: 1 },
    { month: '2026-06', total_spent: '4.25', order_count: 1 },
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
    },
  ],
}

describe('SpendingReportScreen (FR-046)', () => {
  it('shows total spent, orders, average order, and the parents own wallet balance', async () => {
    vi.mocked(reportsApi.getSpendingReport).mockResolvedValue(REPORT)

    await loginAsParentAt('/parent/spending-report')

    expect(await screen.findByText('$10.75')).toBeInTheDocument() // total spent
    expect(screen.getByText('2')).toBeInTheDocument() // orders
    expect(screen.getByText('$5.38')).toBeInTheDocument() // average order (10.75 / 2)
    expect(screen.getByText('$15.00')).toBeInTheDocument() // parent's own wallet
  })

  it('shows a per-child breakdown with wallet balance and spend', async () => {
    vi.mocked(reportsApi.getSpendingReport).mockResolvedValue(REPORT)

    await loginAsParentAt('/parent/spending-report')

    await waitFor(() => expect(screen.getAllByText('Liam Carter').length).toBeGreaterThan(0))
    expect(screen.getAllByText('Ava Carter').length).toBeGreaterThan(0)
    expect(screen.getByText('$6.50 spent')).toBeInTheDocument()
  })

  it('filtering to one child re-fetches scoped to that childs own id', async () => {
    vi.mocked(reportsApi.getSpendingReport).mockResolvedValue(REPORT)

    await loginAsParentAt('/parent/spending-report')
    await screen.findByRole('button', { name: 'Liam Carter' })
    fireEvent.click(screen.getByRole('button', { name: 'Liam Carter' }))

    await waitFor(() =>
      expect(reportsApi.getSpendingReport).toHaveBeenCalledWith(PARENT_USER.id, 's1'),
    )
  })

  it('shows an empty state with no orders yet', async () => {
    vi.mocked(reportsApi.getSpendingReport).mockResolvedValue({
      ...REPORT,
      orders: [],
      monthly_summary: [],
    })

    await loginAsParentAt('/parent/spending-report')

    expect(await screen.findByText('No orders yet')).toBeInTheDocument()
    expect(screen.getByText('No spending yet')).toBeInTheDocument()
  })

  it('shows a "No approved children" empty state for a parent with zero approved links (EC-036)', async () => {
    vi.mocked(reportsApi.getSpendingReport).mockResolvedValue({
      parent_wallet: { id: 'pw1', balance: '0.00' },
      children: [],
      monthly_summary: [],
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
