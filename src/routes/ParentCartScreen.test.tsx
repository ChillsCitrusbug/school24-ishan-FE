import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthContext'
import { StudentAuthProvider } from '@/features/student-auth/StudentAuthContext'
import * as authApi from '@/features/auth/api'
import * as cartApi from '@/features/cart/api'
import * as childSelectionApi from '@/features/child-selection/api'
import * as walletApi from '@/features/wallet/api'
import { routes } from './index'

vi.mock('@/features/auth/api')
vi.mock('@/features/cart/api')
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
  await waitFor(() => expect(screen.getByText(/good morning/i)).toBeInTheDocument())
  await act(async () => {
    await router.navigate(path)
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ParentCartScreen (FR-037)', () => {
  it('shows an empty state when the cart has nothing in it', async () => {
    vi.mocked(cartApi.getCart).mockResolvedValue({ items: [], total: '0' })

    await loginAsParentAt('/parent/cart?childId=st1')

    expect(await screen.findByText('This cart is empty')).toBeInTheDocument()
  })

  it('lists cart lines and navigates to checkout', async () => {
    vi.mocked(cartApi.getCart).mockResolvedValue({
      items: [
        {
          id: 'ci1',
          item_type: 'product',
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
    })

    vi.mocked(childSelectionApi.getActiveContext).mockResolvedValue([])
    vi.mocked(walletApi.getMyParentWalletId).mockResolvedValue('w-parent')
    vi.mocked(walletApi.getWallet).mockResolvedValue({ id: 'w-parent', owner_type: 'parent', balance: '50.00' })
    vi.mocked(walletApi.getChildWallet).mockResolvedValue({ id: 'w-child', owner_type: 'student', balance: '20.00' })

    await loginAsParentAt('/parent/cart?childId=st1')

    expect(await screen.findByText('Chicken Wrap')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /checkout/i }))
    await waitFor(() => expect(screen.getByText('Choose which wallet pays for this order')).toBeInTheDocument())
  })
})
