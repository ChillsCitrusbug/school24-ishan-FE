import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthContext'
import { StudentAuthProvider } from '@/features/student-auth/StudentAuthContext'
import * as studentAuthApi from '@/features/student-auth/api'
import * as menuBrowseApi from '@/features/menu-browse/api'
import * as cartApi from '@/features/cart/api'
import { routes } from './index'

vi.mock('@/features/student-auth/api')
vi.mock('@/features/menu-browse/api')
vi.mock('@/features/cart/api')

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
  await waitFor(() => expect(screen.getByText(/canteen home coming soon/i)).toBeInTheDocument())
  await act(async () => {
    await router.navigate(path)
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ItemDetailScreen (FR-035)', () => {
  it('disables Add to cart until a size is chosen, for a product with variants', async () => {
    vi.mocked(menuBrowseApi.getMenuProduct).mockResolvedValue({
      id: 'p1',
      item_type: 'product',
      name: 'Chicken Wrap',
      description: 'Grilled chicken',
      category_id: 'c1',
      base_price: '6.50',
      blocked: false,
      block_reason: null,
      has_variants: true,
      variants: [
        { id: 'v1', label: 'Regular', price: '6.50' },
        { id: 'v2', label: 'Large', price: '8.00' },
      ],
    })

    await loginAsStudentAt('/student/menu/products/p1')

    expect(await screen.findByText('Chicken Wrap')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add to cart/i })).toBeDisabled()

    fireEvent.click(screen.getByRole('radio', { name: /large/i }))

    expect(screen.getByRole('button', { name: /add to cart/i })).not.toBeDisabled()
    expect(screen.getByText('$8.00')).toBeInTheDocument()
  })

  it('adds the selected variant to the cart and navigates to the cart screen', async () => {
    vi.mocked(menuBrowseApi.getMenuProduct).mockResolvedValue({
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

    await loginAsStudentAt('/student/menu/products/p1')
    await screen.findByText('Chicken Wrap')
    fireEvent.click(screen.getByRole('radio', { name: /regular/i }))
    fireEvent.click(screen.getByRole('button', { name: /add to cart/i }))

    await waitFor(() =>
      expect(cartApi.addCartItem).toHaveBeenCalledWith('s1', {
        item_type: 'product',
        quantity: 1,
        product_id: 'p1',
        variant_id: 'v1',
      }),
    )
    await waitFor(() => expect(screen.getByText('Your cart')).toBeInTheDocument())
  })

  it('a blocked product cannot be added, and shows why', async () => {
    vi.mocked(menuBrowseApi.getMenuProduct).mockResolvedValue({
      id: 'p1',
      item_type: 'product',
      name: 'Peanut Cookie',
      description: null,
      category_id: 'c1',
      base_price: '3.00',
      blocked: true,
      block_reason: "'Peanut Cookie' is restricted for this student.",
      has_variants: false,
      variants: [],
    })

    await loginAsStudentAt('/student/menu/products/p1')

    expect(await screen.findByText('Peanut Cookie')).toBeInTheDocument()
    expect(
      screen.getByText("'Peanut Cookie' is restricted for this student."),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add to cart/i })).toBeDisabled()
  })

  it('a combo with no variant concept shows its included products and adds directly', async () => {
    vi.mocked(menuBrowseApi.getMenuCombo).mockResolvedValue({
      id: 'co1',
      item_type: 'combo',
      name: 'Lunch Combo',
      description: null,
      category_id: null,
      base_price: '8.50',
      blocked: false,
      block_reason: null,
      has_variants: false,
      included_products: [
        { id: 'p1', name: 'Chicken Wrap' },
        { id: 'p2', name: 'Apple Juice' },
      ],
    })
    vi.mocked(cartApi.addCartItem).mockResolvedValue({
      id: 'ci1',
      cart_id: 'cart1',
      item_type: 'combo',
      product_id: null,
      combo_id: 'co1',
      variant_id: null,
      quantity: 1,
      unit_price: '8.50',
      line_total: '8.50',
    })
    vi.mocked(cartApi.getCart).mockResolvedValue({ items: [], total: '0' })

    await loginAsStudentAt('/student/menu/combos/co1')

    expect(await screen.findByText('Lunch Combo')).toBeInTheDocument()
    expect(screen.getByText('Chicken Wrap')).toBeInTheDocument()
    expect(screen.getByText('Apple Juice')).toBeInTheDocument()
    expect(screen.queryByText('Choose a size')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /add to cart/i }))

    await waitFor(() =>
      expect(cartApi.addCartItem).toHaveBeenCalledWith('s1', {
        item_type: 'combo',
        quantity: 1,
        combo_id: 'co1',
      }),
    )
  })

  it('shows an error state when the item fails to load', async () => {
    vi.mocked(menuBrowseApi.getMenuProduct).mockRejectedValue({ response: undefined })

    await loginAsStudentAt('/student/menu/products/p1')

    expect(
      await screen.findByText('Something went wrong. Please check your connection and try again.'),
    ).toBeInTheDocument()
  })
})
