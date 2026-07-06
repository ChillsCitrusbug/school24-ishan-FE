import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthContext'
import { StudentAuthProvider } from '@/features/student-auth/StudentAuthContext'
import * as authApi from '@/features/auth/api'
import * as cartApi from '@/features/cart/api'
import * as checkoutApi from '@/features/checkout/api'
import * as childSelectionApi from '@/features/child-selection/api'
import * as walletApi from '@/features/wallet/api'
import { routes } from './index'

vi.mock('@/features/auth/api')
vi.mock('@/features/cart/api')
vi.mock('@/features/checkout/api')
vi.mock('@/features/child-selection/api')
vi.mock('@/features/wallet/api')

const PARENT_USER = {
  id: 'u1',
  full_name: 'Sarah Thompson',
  email: 'sarah@example.com',
  role: 'parent' as const,
  school_id: null,
  school_name: null,
}

const NOAH: childSelectionApi.ActiveChild = {
  student_id: 'st1',
  student_id_code: 'S-41880',
  full_name: 'Noah Thompson',
  class_name: 'Year 1 · 1A',
  school_name: 'Greenvale Primary',
  wallet_balance: 20,
}

const CART = {
  items: [
    {
      id: 'ci1',
      cart_id: 'cart1',
      item_type: 'product' as const,
      product_id: 'p1',
      combo_id: null,
      variant_id: null,
      quantity: 2,
      unit_price: '6.50',
      line_total: '13.00',
      name: 'Chicken Wrap',
      variant_label: null,
    },
  ],
  total: '13.00',
}

function setUpDefaults() {
  vi.mocked(cartApi.getCart).mockResolvedValue(CART)
  vi.mocked(childSelectionApi.getActiveContext).mockResolvedValue([NOAH])
  vi.mocked(walletApi.getMyParentWalletId).mockResolvedValue('w-parent')
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

describe('ParentCheckoutScreen (FR-037)', () => {
  it('defaults to the parents own wallet and pays successfully', async () => {
    setUpDefaults()
    vi.mocked(walletApi.getWallet).mockResolvedValue({ id: 'w-parent', owner_type: 'parent', balance: '50.00' })
    vi.mocked(walletApi.getChildWallet).mockResolvedValue({ id: 'w-child', owner_type: 'student', balance: '20.00' })
    vi.mocked(checkoutApi.childCheckout).mockResolvedValue({
      id: 'o1',
      display_id: 'ORD-ABC123',
      status: 'pending',
      total_amount: '13.00',
      placed_at: '2026-01-01T00:00:00Z',
      funding_wallet_id: 'w-parent',
      items: [],
    })

    await loginAsParentAt('/parent/checkout?childId=st1')

    const parentRadio = await screen.findByRole('radio', { name: /your wallet/i })
    expect(parentRadio).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(screen.getByRole('button', { name: /pay from your wallet/i }))

    await waitFor(() =>
      expect(checkoutApi.childCheckout).toHaveBeenCalledWith('st1', 'w-parent'),
    )
    await waitFor(() => expect(screen.getByText('ORD-ABC123')).toBeInTheDocument())
  })

  it('switches to the childs wallet and pays from it instead', async () => {
    setUpDefaults()
    vi.mocked(walletApi.getWallet).mockResolvedValue({ id: 'w-parent', owner_type: 'parent', balance: '5.00' })
    vi.mocked(walletApi.getChildWallet).mockResolvedValue({ id: 'w-child', owner_type: 'student', balance: '50.00' })
    vi.mocked(checkoutApi.childCheckout).mockResolvedValue({
      id: 'o2',
      display_id: 'ORD-DEF456',
      status: 'pending',
      total_amount: '13.00',
      placed_at: '2026-01-01T00:00:00Z',
      funding_wallet_id: 'w-child',
      items: [],
    })

    await loginAsParentAt('/parent/checkout?childId=st1')
    await screen.findByRole('radio', { name: /your wallet/i })
    fireEvent.click(screen.getByRole('radio', { name: /noah thompson's wallet/i }))

    fireEvent.click(await screen.findByRole('button', { name: /pay from noah thompson's wallet/i }))

    await waitFor(() =>
      expect(checkoutApi.childCheckout).toHaveBeenCalledWith('st1', 'w-child'),
    )
  })

  it('shows a top-up prompt instead of Pay when the selected wallet is short', async () => {
    setUpDefaults()
    vi.mocked(walletApi.getWallet).mockResolvedValue({ id: 'w-parent', owner_type: 'parent', balance: '2.00' })
    vi.mocked(walletApi.getChildWallet).mockResolvedValue({ id: 'w-child', owner_type: 'student', balance: '50.00' })

    await loginAsParentAt('/parent/checkout?childId=st1')

    expect(await screen.findByText(/short by \$11\.00/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /top up your wallet/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^pay from/i })).not.toBeInTheDocument()
  })

  it('shows a checkout error and reloads if the API call fails', async () => {
    setUpDefaults()
    vi.mocked(walletApi.getWallet).mockResolvedValue({ id: 'w-parent', owner_type: 'parent', balance: '50.00' })
    vi.mocked(walletApi.getChildWallet).mockResolvedValue({ id: 'w-child', owner_type: 'student', balance: '20.00' })
    vi.mocked(checkoutApi.childCheckout).mockRejectedValue({
      response: { data: { errors: 'An item in your cart is no longer available.' } },
    })

    await loginAsParentAt('/parent/checkout?childId=st1')
    await screen.findByRole('radio', { name: /your wallet/i })
    fireEvent.click(screen.getByRole('button', { name: /pay from your wallet/i }))

    expect(await screen.findByText('An item in your cart is no longer available.')).toBeInTheDocument()
  })
})
