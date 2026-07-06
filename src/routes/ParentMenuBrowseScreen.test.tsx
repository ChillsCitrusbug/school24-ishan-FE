import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthContext'
import { StudentAuthProvider } from '@/features/student-auth/StudentAuthContext'
import * as authApi from '@/features/auth/api'
import * as childSelectionApi from '@/features/child-selection/api'
import * as childMenuBrowseApi from '@/features/child-menu-browse/api'
import * as cartApi from '@/features/cart/api'
import { routes } from './index'

vi.mock('@/features/auth/api')
vi.mock('@/features/child-selection/api')
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

const NOAH: childSelectionApi.ActiveChild = {
  student_id: 'st1',
  student_id_code: 'S-41880',
  full_name: 'Noah Thompson',
  class_name: 'Year 1 · 1A',
  school_name: 'Greenvale Primary',
  wallet_balance: 12.5,
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

describe('ParentMenuBrowseScreen (FR-037)', () => {
  it('shows an error when no child was selected', async () => {
    vi.mocked(childSelectionApi.getActiveContext).mockResolvedValue([NOAH])

    await loginAsParentAt('/parent/menu')

    expect(await screen.findByText('No child was selected. Please choose a child first.')).toBeInTheDocument()
  })

  it("lists the child's menu items with their price", async () => {
    vi.mocked(childSelectionApi.getActiveContext).mockResolvedValue([NOAH])
    vi.mocked(childMenuBrowseApi.listChildMenuCategories).mockResolvedValue([])
    vi.mocked(childMenuBrowseApi.listChildMenuItems).mockResolvedValue([
      {
        id: 'p1',
        item_type: 'product',
        name: 'Chicken Wrap',
        description: null,
        category_id: 'c1',
        base_price: '6.50',
        blocked: false,
        block_reason: null,
        has_variants: false,
      },
    ])
    vi.mocked(cartApi.getCart).mockResolvedValue({ items: [], total: '0' })

    await loginAsParentAt('/parent/menu?childId=st1')

    expect(await screen.findByText('Chicken Wrap')).toBeInTheDocument()
    expect(screen.getByText('$6.50')).toBeInTheDocument()
    expect(screen.getByText("Browse and add items to Noah Thompson's cart.")).toBeInTheDocument()
  })

  it('adds a no-variant product directly to the cart', async () => {
    vi.mocked(childSelectionApi.getActiveContext).mockResolvedValue([NOAH])
    vi.mocked(childMenuBrowseApi.listChildMenuCategories).mockResolvedValue([])
    vi.mocked(childMenuBrowseApi.listChildMenuItems).mockResolvedValue([
      {
        id: 'p2',
        item_type: 'product',
        name: 'Apple',
        description: null,
        category_id: 'c1',
        base_price: '1.00',
        blocked: false,
        block_reason: null,
        has_variants: false,
      },
    ])
    vi.mocked(cartApi.getCart).mockResolvedValue({ items: [], total: '0' })
    vi.mocked(cartApi.addCartItem).mockResolvedValue({
      id: 'ci1',
      cart_id: 'cart1',
      item_type: 'product',
      product_id: 'p2',
      combo_id: null,
      variant_id: null,
      quantity: 1,
      unit_price: '1.00',
      line_total: '1.00',
    })

    await loginAsParentAt('/parent/menu?childId=st1')
    await screen.findByText('Apple')
    fireEvent.click(screen.getByRole('button', { name: /^add$/i }))

    await waitFor(() =>
      expect(cartApi.addCartItem).toHaveBeenCalledWith('st1', {
        item_type: 'product',
        quantity: 1,
        product_id: 'p2',
      }),
    )
  })
})
