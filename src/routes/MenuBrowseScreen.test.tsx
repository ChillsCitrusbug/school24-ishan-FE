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

const WRAP: menuBrowseApi.MenuItem = {
  id: 'p1',
  item_type: 'product',
  name: 'Chicken Wrap',
  description: 'Grilled chicken',
  category_id: 'c1',
  base_price: '6.50',
  blocked: false,
  block_reason: null,
  has_variants: true,
}

const APPLE: menuBrowseApi.MenuItem = {
  id: 'p2',
  item_type: 'product',
  name: 'Apple',
  description: null,
  category_id: 'c1',
  base_price: '1.00',
  blocked: false,
  block_reason: null,
  has_variants: false,
}

describe('MenuBrowseScreen (FR-035)', () => {
  it('shows the empty state when the menu has not been published', async () => {
    vi.mocked(menuBrowseApi.listMenuCategories).mockResolvedValue([])
    vi.mocked(menuBrowseApi.listMenuItems).mockResolvedValue([])
    vi.mocked(cartApi.getCart).mockResolvedValue({ items: [], total: '0' })

    await loginAsStudentAt('/student/menu')

    expect(await screen.findByText('Menu not available')).toBeInTheDocument()
  })

  it('lists menu items with their price', async () => {
    vi.mocked(menuBrowseApi.listMenuCategories).mockResolvedValue([{ id: 'c1', name: 'Hot Food' }])
    vi.mocked(menuBrowseApi.listMenuItems).mockResolvedValue([WRAP, APPLE])
    vi.mocked(cartApi.getCart).mockResolvedValue({ items: [], total: '0' })

    await loginAsStudentAt('/student/menu')

    expect(await screen.findByText('Chicken Wrap')).toBeInTheDocument()
    expect(screen.getByText('$6.50')).toBeInTheDocument()
    expect(screen.getByText('Apple')).toBeInTheDocument()
  })

  it('a product with variants navigates to its own detail screen on Add, rather than adding directly', async () => {
    vi.mocked(menuBrowseApi.listMenuCategories).mockResolvedValue([])
    vi.mocked(menuBrowseApi.listMenuItems).mockResolvedValue([WRAP])
    vi.mocked(cartApi.getCart).mockResolvedValue({ items: [], total: '0' })
    vi.mocked(menuBrowseApi.getMenuProduct).mockResolvedValue({
      ...WRAP,
      variants: [{ id: 'v1', label: 'Regular', price: '6.50' }],
    })

    await loginAsStudentAt('/student/menu')
    await screen.findByText('Chicken Wrap')
    fireEvent.click(screen.getByRole('button', { name: /^add$/i }))

    expect(await screen.findByText('Choose a size')).toBeInTheDocument()
    expect(cartApi.addCartItem).not.toHaveBeenCalled()
  })

  it('a product with no variants is added directly from the grid', async () => {
    vi.mocked(menuBrowseApi.listMenuCategories).mockResolvedValue([])
    vi.mocked(menuBrowseApi.listMenuItems).mockResolvedValue([APPLE])
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

    await loginAsStudentAt('/student/menu')
    await screen.findByText('Apple')
    fireEvent.click(screen.getByRole('button', { name: /^add$/i }))

    await waitFor(() =>
      expect(cartApi.addCartItem).toHaveBeenCalledWith('s1', {
        item_type: 'product',
        quantity: 1,
        product_id: 'p2',
      }),
    )
  })

  it('a restricted item is shown blocked, with its Add button disabled', async () => {
    vi.mocked(menuBrowseApi.listMenuCategories).mockResolvedValue([])
    vi.mocked(menuBrowseApi.listMenuItems).mockResolvedValue([
      { ...APPLE, name: 'Peanut Cookie', blocked: true, block_reason: 'Restricted' },
    ])
    vi.mocked(cartApi.getCart).mockResolvedValue({ items: [], total: '0' })

    await loginAsStudentAt('/student/menu')

    expect(await screen.findByText('Peanut Cookie')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^add$/i })).toBeDisabled()
  })

  it('shows an error state when the menu fails to load', async () => {
    vi.mocked(menuBrowseApi.listMenuCategories).mockResolvedValue([])
    vi.mocked(menuBrowseApi.listMenuItems).mockRejectedValue({ response: undefined })
    vi.mocked(cartApi.getCart).mockResolvedValue({ items: [], total: '0' })

    await loginAsStudentAt('/student/menu')

    expect(
      await screen.findByText('Something went wrong. Please check your connection and try again.'),
    ).toBeInTheDocument()
  })
})
