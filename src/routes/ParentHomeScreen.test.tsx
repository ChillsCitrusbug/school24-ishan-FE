import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthContext'
import * as authApi from '@/features/auth/api'
import * as childSelectionApi from '@/features/child-selection/api'
import * as myChildrenApi from '@/features/my-children/api'
import * as parentReportsApi from '@/features/parent-reports/api'
import { StudentAuthProvider } from '@/features/student-auth/StudentAuthContext'
import { routes } from './index'

vi.mock('@/features/auth/api')
vi.mock('@/features/child-selection/api')
vi.mock('@/features/my-children/api')
vi.mock('@/features/parent-reports/api')

const PARENT_USER = {
  id: 'u1',
  full_name: 'Sarah Thompson',
  email: 'sarah@thompson.com',
  role: 'parent' as const,
  school_id: null,
  school_name: null,
}

const NOAH_APPROVED: myChildrenApi.MyChild = {
  link_id: 'lk1',
  student_id: 'st1',
  student_id_code: 'S-41880',
  full_name: 'Noah Thompson',
  status: 'approved',
  class_name: 'Year 1 · 1A',
  school_name: 'Greenvale Primary',
  wallet_balance: 23.5,
}

const GRACE_PENDING: myChildrenApi.MyChild = {
  link_id: 'lk2',
  student_id: 'st2',
  student_id_code: 'S-40552',
  full_name: 'Grace Okoro',
  status: 'pending',
}

const EMPTY_REPORT: parentReportsApi.SpendingReport = {
  parent_wallet: { id: 'w1', balance: '0.00' },
  children: [],
  total_spent: '8.20',
  total_order_count: 1,
  average_order: '8.20',
  previous_period_total_spent: null,
  percent_change_vs_previous_period: null,
  top_category: null,
  by_category: [],
  by_week: [],
  orders: [
    {
      id: 'o1',
      display_id: 'ORD-1001',
      student_id: 'st1',
      student_name: 'Noah Thompson',
      status: 'completed',
      total_amount: '8.20',
      placed_at: '2026-07-07T12:00:00Z',
      item_count: 2,
      items_summary: 'Chicken Wrap, Apple Juice',
      category: 'Hot Food',
    },
  ],
}

function mockDefaults() {
  vi.mocked(myChildrenApi.listMyChildren).mockResolvedValue([NOAH_APPROVED, GRACE_PENDING])
  vi.mocked(parentReportsApi.getSpendingReport).mockResolvedValue(EMPTY_REPORT)
}

async function renderAuthenticatedAtParentHome() {
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
  return router
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ParentHomeScreen (Sc063ParentHome)', () => {
  it('shows total balance across approved children, this week\'s spend and a pending-approval count', async () => {
    mockDefaults()

    await renderAuthenticatedAtParentHome()

    expect(await screen.findByText('Total balance')).toBeInTheDocument()
    // Appears in both the StatCard and Noah's own ChildCard (he's the
    // only approved child, so the family total equals his balance) —
    // assert it rendered at least once rather than requiring exactly one.
    expect(screen.getAllByText('$23.50').length).toBeGreaterThan(0)
    expect(screen.getByText('across 1 child')).toBeInTheDocument()
    expect(screen.getByText('$8.20')).toBeInTheDocument()
    expect(screen.getByText('1 pending')).toBeInTheDocument()
  })

  it('renders an approved child as a real ChildCard and the pending child separately', async () => {
    mockDefaults()

    await renderAuthenticatedAtParentHome()

    expect(await screen.findByText('Noah Thompson')).toBeInTheDocument()
    expect(screen.getByText('Grace Okoro')).toBeInTheDocument()
    expect(screen.getByText('Link request pending school approval')).toBeInTheDocument()
  })

  it('shows recent orders in the activity feed', async () => {
    mockDefaults()

    await renderAuthenticatedAtParentHome()

    expect(await screen.findByText('Recent activity')).toBeInTheDocument()
    expect(screen.getByText(/Chicken Wrap, Apple Juice/)).toBeInTheDocument()
    expect(screen.getByText('-$8.20')).toBeInTheDocument()
  })

  it('shows the empty state with an "Add a child" action when there are no linked children at all', async () => {
    vi.mocked(myChildrenApi.listMyChildren).mockResolvedValue([])
    vi.mocked(parentReportsApi.getSpendingReport).mockResolvedValue({ ...EMPTY_REPORT, orders: [] })

    await renderAuthenticatedAtParentHome()

    expect(await screen.findByText('Add your first child')).toBeInTheDocument()
  })

  it('shows an error state with a retry action when the children list fails to load', async () => {
    vi.mocked(myChildrenApi.listMyChildren).mockRejectedValue(new Error('Network Error'))
    vi.mocked(parentReportsApi.getSpendingReport).mockResolvedValue({ ...EMPTY_REPORT, orders: [] })

    await renderAuthenticatedAtParentHome()

    expect(
      await screen.findByText('Something went wrong. Please check your connection and try again.'),
    ).toBeInTheDocument()
  })

  it('the "Add a child" action navigates to the add-child screen', async () => {
    mockDefaults()

    await renderAuthenticatedAtParentHome()
    await screen.findByText('Noah Thompson')

    fireEvent.click(screen.getAllByRole('button', { name: /add a child/i })[0])

    expect(await screen.findByText('Send link request')).toBeInTheDocument()
  })

  it('the topbar bell navigates to the parent\'s own inbox', async () => {
    mockDefaults()

    await renderAuthenticatedAtParentHome()
    await screen.findByText('Noah Thompson')

    fireEvent.click(screen.getByRole('button', { name: /notifications/i }))

    expect(await screen.findByText('Notifications')).toBeInTheDocument()
  })

  it('"Top up wallet" navigates to the parent\'s own wallet top-up screen', async () => {
    mockDefaults()

    await renderAuthenticatedAtParentHome()
    await screen.findByText('Noah Thompson')

    fireEvent.click(screen.getByRole('button', { name: /top up wallet/i }))

    expect(await screen.findByRole('heading', { name: 'Top up wallet' })).toBeInTheDocument()
  })

  it('a child card\'s own "Top up" tile navigates straight to that child\'s top-up screen', async () => {
    mockDefaults()
    vi.mocked(childSelectionApi.getActiveContext).mockResolvedValue([
      {
        student_id: 'st1',
        student_id_code: 'S-41880',
        full_name: 'Noah Thompson',
        class_name: 'Year 1 · 1A',
        school_name: 'Greenvale Primary',
        wallet_balance: 23.5,
      },
    ])

    await renderAuthenticatedAtParentHome()
    await screen.findByText('Noah Thompson')

    fireEvent.click(screen.getByRole('button', { name: 'Top up' }))

    expect(await screen.findByRole('heading', { name: "Top up Noah Thompson's wallet" })).toBeInTheDocument()
  })

  it('"View all" navigates to the spending insights report', async () => {
    mockDefaults()

    await renderAuthenticatedAtParentHome()
    await screen.findByText('Recent activity')

    fireEvent.click(screen.getByRole('button', { name: /view all/i }))

    expect(await screen.findByText('Spending insights')).toBeInTheDocument()
  })

  it('the sidebar\'s "Order food" link resolves the single approved child and lands straight on the menu', async () => {
    mockDefaults()
    vi.mocked(childSelectionApi.getActiveContext).mockResolvedValue([
      {
        student_id: 'st1',
        student_id_code: 'S-41880',
        full_name: 'Noah Thompson',
        class_name: 'Year 1 · 1A',
        school_name: 'Greenvale Primary',
        wallet_balance: 23.5,
      },
    ])

    await renderAuthenticatedAtParentHome()
    await screen.findByText('Noah Thompson')

    fireEvent.click(screen.getByRole('link', { name: /order food/i }))

    await waitFor(() => expect(screen.getByText('Canteen menu')).toBeInTheDocument())
  })
})
