import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthContext'
import { StudentAuthProvider } from '@/features/student-auth/StudentAuthContext'
import * as studentAuthApi from '@/features/student-auth/api'
import * as cartApi from '@/features/cart/api'
import * as checkoutApi from '@/features/checkout/api'
import * as walletApi from '@/features/wallet/api'
import { routes } from './index'

vi.mock('@/features/student-auth/api')
vi.mock('@/features/cart/api')
vi.mock('@/features/checkout/api')
vi.mock('@/features/wallet/api')

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

const CART: cartApi.Cart = {
  items: [
    {
      id: 'ci1',
      item_type: 'product',
      product_id: 'p1',
      combo_id: null,
      variant_id: null,
      name: 'Chicken Wrap',
      variant_label: null,
      quantity: 1,
      unit_price: '6.50',
      line_total: '6.50',
    },
  ],
  total: '6.50',
}

describe('StudentCheckoutScreen (FR-036)', () => {
  it('shows the order summary and wallet balance', async () => {
    vi.mocked(cartApi.getCart).mockResolvedValue(CART)
    vi.mocked(walletApi.getMyStudentWalletId).mockResolvedValue('w1')
    vi.mocked(walletApi.getWallet).mockResolvedValue({ id: 'w1', owner_type: 'student', balance: '23.50' })

    await loginAsStudentAt('/student/checkout')

    expect(await screen.findByText('Chicken Wrap')).toBeInTheDocument()
    expect(screen.getByText('Balance $23.50')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /pay & place order · \$6\.50/i })).toBeInTheDocument()
  })

  it('shows the insufficient-balance state and an Add funds button instead of Pay', async () => {
    vi.mocked(cartApi.getCart).mockResolvedValue(CART)
    vi.mocked(walletApi.getMyStudentWalletId).mockResolvedValue('w1')
    vi.mocked(walletApi.getWallet).mockResolvedValue({ id: 'w1', owner_type: 'student', balance: '2.30' })

    await loginAsStudentAt('/student/checkout')
    await screen.findByText('Chicken Wrap')

    expect(screen.getByText('You need $4.20 more to place this order.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add funds/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /pay & place order/i })).not.toBeInTheDocument()
  })

  it('pays and navigates to the receipt screen on success', async () => {
    vi.mocked(cartApi.getCart).mockResolvedValue(CART)
    vi.mocked(walletApi.getMyStudentWalletId).mockResolvedValue('w1')
    vi.mocked(walletApi.getWallet).mockResolvedValue({ id: 'w1', owner_type: 'student', balance: '23.50' })
    vi.mocked(checkoutApi.studentCheckout).mockResolvedValue({
      id: 'o1',
      display_id: 'ORD-ABCD1234',
      status: 'pending',
      total_amount: '6.50',
      placed_at: '2026-07-06T12:00:00Z',
      funding_wallet_id: 'w1',
      items: [{ name: 'Chicken Wrap', variant_label: null, quantity: 1, unit_price: '6.50', line_total: '6.50' }],
    })

    await loginAsStudentAt('/student/checkout')
    await screen.findByText('Chicken Wrap')
    fireEvent.click(screen.getByRole('button', { name: /pay & place order/i }))

    await waitFor(() => expect(checkoutApi.studentCheckout).toHaveBeenCalledWith('s1'))
    expect(await screen.findByText('Order confirmed')).toBeInTheDocument()
    expect(screen.getByText('ORD-ABCD1234')).toBeInTheDocument()
  })

  it('shows an error banner and reloads if checkout fails at commit time', async () => {
    vi.mocked(cartApi.getCart).mockResolvedValue(CART)
    vi.mocked(walletApi.getMyStudentWalletId).mockResolvedValue('w1')
    vi.mocked(walletApi.getWallet).mockResolvedValue({ id: 'w1', owner_type: 'student', balance: '23.50' })
    vi.mocked(checkoutApi.studentCheckout).mockRejectedValue({
      response: { data: { errors: 'Insufficient balance. Please top up your wallet.' } },
    })

    await loginAsStudentAt('/student/checkout')
    await screen.findByText('Chicken Wrap')
    expect(cartApi.getCart).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: /pay & place order/i }))

    expect(
      await screen.findByText('Insufficient balance. Please top up your wallet.'),
    ).toBeInTheDocument()
    // The screen reloads cart/wallet data after a failed checkout, rather
    // than leaving stale pre-attempt state on screen.
    await waitFor(() => expect(cartApi.getCart).toHaveBeenCalledTimes(2))
    expect(walletApi.getWallet).toHaveBeenCalledTimes(2)
  })

  it('shows an error state when checkout details fail to load', async () => {
    vi.mocked(cartApi.getCart).mockRejectedValue({ response: undefined })
    vi.mocked(walletApi.getMyStudentWalletId).mockResolvedValue('w1')
    vi.mocked(walletApi.getWallet).mockResolvedValue({ id: 'w1', owner_type: 'student', balance: '23.50' })

    await loginAsStudentAt('/student/checkout')

    expect(
      await screen.findByText('Something went wrong. Please check your connection and try again.'),
    ).toBeInTheDocument()
  })
})
