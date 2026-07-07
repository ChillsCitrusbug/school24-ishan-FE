import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthContext'
import { StudentAuthProvider } from '@/features/student-auth/StudentAuthContext'
import * as studentAuthApi from '@/features/student-auth/api'
import * as dashboardApi from '@/features/student-dashboard/api'
import * as cartApi from '@/features/cart/api'
import { routes } from './index'

vi.mock('@/features/student-auth/api')
vi.mock('@/features/student-dashboard/api')
vi.mock('@/features/cart/api')

async function loginAsStudent() {
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
  return router
}

afterEach(() => {
  vi.restoreAllMocks()
})

const APPLE: dashboardApi.FrequentItem = {
  item_type: 'product',
  id: 'p1',
  name: 'Apple Slices',
  price: '1.50',
  has_variants: false,
  available: true,
  blocked: false,
  block_reason: null,
  order_count: 5,
}

describe('StudentHomeScreen (FR-047)', () => {
  it('shows the wallet balance and frequent items, ready to add to cart', async () => {
    vi.mocked(dashboardApi.getStudentDashboard).mockResolvedValue({
      wallet_balance: '23.50',
      frequent_items: [APPLE],
    })
    vi.mocked(cartApi.addCartItem).mockResolvedValue({
      id: 'ci1',
      cart_id: 'cart1',
      item_type: 'product',
      product_id: 'p1',
      combo_id: null,
      variant_id: null,
      quantity: 1,
      unit_price: '1.50',
      line_total: '1.50',
    })

    await loginAsStudent()

    expect(await screen.findByText('$23.50')).toBeInTheDocument()
    expect(screen.getByText('Apple Slices')).toBeInTheDocument()
    expect(screen.queryByText(/low balance/i)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /add/i }))

    await waitFor(() =>
      expect(cartApi.addCartItem).toHaveBeenCalledWith('s1', {
        item_type: 'product',
        quantity: 1,
        product_id: 'p1',
      }),
    )
  })

  it('shows a low-balance warning when the wallet balance is exactly zero', async () => {
    vi.mocked(dashboardApi.getStudentDashboard).mockResolvedValue({
      wallet_balance: '0.00',
      frequent_items: [],
    })

    await loginAsStudent()

    expect(await screen.findByText('$0.00')).toBeInTheDocument()
    expect(screen.getByText(/low balance/i)).toBeInTheDocument()
  })

  it('shows an empty state when the student has no order history yet', async () => {
    vi.mocked(dashboardApi.getStudentDashboard).mockResolvedValue({
      wallet_balance: '10.00',
      frequent_items: [],
    })

    await loginAsStudent()

    expect(await screen.findByText(/no orders yet/i)).toBeInTheDocument()
  })

  it('routes a variant-required product to its detail screen instead of adding it directly', async () => {
    vi.mocked(dashboardApi.getStudentDashboard).mockResolvedValue({
      wallet_balance: '23.50',
      frequent_items: [{ ...APPLE, id: 'p2', name: 'Chicken Wrap', has_variants: true }],
    })

    const router = await loginAsStudent()
    await screen.findByText('Chicken Wrap')

    fireEvent.click(screen.getByRole('button', { name: /add/i }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/student/menu/products/p2'))
    expect(cartApi.addCartItem).not.toHaveBeenCalled()
  })

  it('disables Add for a blocked or unavailable frequent item, never bypassing enforcement', async () => {
    vi.mocked(dashboardApi.getStudentDashboard).mockResolvedValue({
      wallet_balance: '23.50',
      frequent_items: [{ ...APPLE, blocked: true, block_reason: 'contains nuts' }],
    })

    await loginAsStudent()
    await screen.findByText('Apple Slices')

    expect(screen.getByRole('button', { name: /add/i })).toBeDisabled()
  })

  it('shows an error state when the dashboard fails to load', async () => {
    vi.mocked(dashboardApi.getStudentDashboard).mockRejectedValue({ response: undefined })

    await loginAsStudent()

    expect(
      await screen.findByText('Something went wrong. Please check your connection and try again.'),
    ).toBeInTheDocument()
  })
})
