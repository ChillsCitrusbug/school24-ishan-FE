import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthContext'
import { StudentAuthProvider } from '@/features/student-auth/StudentAuthContext'
import * as authApi from '@/features/auth/api'
import * as childMenuBrowseApi from '@/features/child-menu-browse/api'
import * as cartApi from '@/features/cart/api'
import { routes } from './index'

vi.mock('@/features/auth/api')
vi.mock('@/features/child-menu-browse/api')
vi.mock('@/features/cart/api')

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

describe('ParentItemDetailScreen (FR-037)', () => {
  it('requires a size to be chosen before adding a variant-bearing product', async () => {
    vi.mocked(childMenuBrowseApi.getChildMenuProduct).mockResolvedValue({
      id: 'p1',
      item_type: 'product',
      name: 'Chicken Wrap',
      description: null,
      category_id: 'c1',
      base_price: '6.50',
      blocked: false,
      block_reason: null,
      has_variants: true,
      variants: [{ id: 'v1', label: 'Regular', price: '6.50' }],
    })

    await loginAsParentAt('/parent/menu/products/p1?childId=st1')

    expect(await screen.findByText('Chicken Wrap')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add to cart/i })).toBeDisabled()
  })

  it('adds the selected variant to the cart and navigates to the cart screen', async () => {
    vi.mocked(childMenuBrowseApi.getChildMenuProduct).mockResolvedValue({
      id: 'p1',
      item_type: 'product',
      name: 'Chicken Wrap',
      description: null,
      category_id: 'c1',
      base_price: '6.50',
      blocked: false,
      block_reason: null,
      has_variants: true,
      variants: [{ id: 'v1', label: 'Regular', price: '6.50' }],
    })
    vi.mocked(cartApi.addCartItem).mockResolvedValue({
      id: 'ci1',
      cart_id: 'cart1',
      item_type: 'product',
      product_id: 'p1',
      combo_id: null,
      variant_id: 'v1',
      quantity: 1,
      unit_price: '6.50',
      line_total: '6.50',
    })
    vi.mocked(cartApi.getCart).mockResolvedValue({ items: [], total: '0' })

    await loginAsParentAt('/parent/menu/products/p1?childId=st1')
    await screen.findByText('Chicken Wrap')
    fireEvent.click(screen.getByRole('radio', { name: /regular/i }))
    fireEvent.click(screen.getByRole('button', { name: /add to cart/i }))

    await waitFor(() =>
      expect(cartApi.addCartItem).toHaveBeenCalledWith('st1', {
        item_type: 'product',
        quantity: 1,
        product_id: 'p1',
        variant_id: 'v1',
      }),
    )
    await waitFor(() => expect(screen.getByText('Cart')).toBeInTheDocument())
  })
})
