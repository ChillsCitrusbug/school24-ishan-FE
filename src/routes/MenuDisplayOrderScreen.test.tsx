import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthContext'
import * as authApi from '@/features/auth/api'
import * as categoriesApi from '@/features/categories/api'
import * as permissionsApi from '@/features/permissions/api'
import * as productsApi from '@/features/products/api'
import type { UserSummary } from '@/features/auth/api'
import { StudentAuthProvider } from '@/features/student-auth/StudentAuthContext'
import { routes } from './index'

vi.mock('@/features/auth/api')
vi.mock('@/features/categories/api')
vi.mock('@/features/permissions/api')
vi.mock('@/features/products/api')

const SCHOOL_ADMIN_USER = {
  id: 'u1',
  full_name: 'Priya Nair',
  email: 'priya@example.com',
  role: 'school_admin' as const,
  school_id: 's1',
  school_name: 'Greenvale Primary',
}

async function renderAuthenticatedAt(path: string, user: UserSummary = SCHOOL_ADMIN_USER) {
  vi.mocked(authApi.login).mockResolvedValue({
    access_token: 'a-real-jwt',
    token_type: 'bearer',
    user,
  })
  vi.mocked(permissionsApi.getMyPermissions).mockResolvedValue([])
  const router = createMemoryRouter(routes, { initialEntries: ['/login'] })
  render(
    <AuthProvider>
      <StudentAuthProvider>
        <RouterProvider router={router} />
      </StudentAuthProvider>
    </AuthProvider>,
  )
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: user.email } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'whatever' } })
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: /sign in/i })).not.toBeInTheDocument(),
  )

  await act(async () => {
    await router.navigate(path)
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

const HOT_FOOD: categoriesApi.Category = { id: 'c1', name: 'Hot Food', display_order: 0 }
const DRINKS: categoriesApi.Category = { id: 'c2', name: 'Drinks', display_order: 1 }
const BURGER: categoriesApi.CategoryProduct = { id: 'p1', name: 'Burger', display_order: 0 }
const FRIES: categoriesApi.CategoryProduct = { id: 'p2', name: 'Fries', display_order: 1 }
const JUICE: categoriesApi.CategoryProduct = { id: 'p3', name: 'Juice', display_order: 0 }

function mockTwoCategoriesWithProducts() {
  vi.mocked(categoriesApi.listCategories).mockResolvedValue([HOT_FOOD, DRINKS])
  vi.mocked(categoriesApi.listProductsInCategory).mockImplementation((categoryId: string) => {
    if (categoryId === 'c1') return Promise.resolve([BURGER, FRIES])
    return Promise.resolve([JUICE])
  })
}

describe('MenuDisplayOrderScreen', () => {
  it('loads and renders each category with its own products', async () => {
    mockTwoCategoriesWithProducts()

    await renderAuthenticatedAt('/school-admin/products/order')

    expect(await screen.findByText('Hot Food')).toBeInTheDocument()
    expect(screen.getByText('Drinks')).toBeInTheDocument()
    expect(screen.getByText('Burger')).toBeInTheDocument()
    expect(screen.getByText('Fries')).toBeInTheDocument()
    expect(screen.getByText('Juice')).toBeInTheDocument()
    expect(screen.getByText('2 items')).toBeInTheDocument()
    expect(screen.getByText('1 items')).toBeInTheDocument()
  })

  it('"Save order" persists the (possibly unchanged) order for categories and every category\'s own products', async () => {
    mockTwoCategoriesWithProducts()
    vi.mocked(categoriesApi.reorderCategories).mockResolvedValue([HOT_FOOD, DRINKS])
    vi.mocked(categoriesApi.reorderProductsInCategory).mockResolvedValue([])
    vi.mocked(productsApi.listProducts).mockResolvedValue([])

    await renderAuthenticatedAt('/school-admin/products/order')
    await screen.findByText('Hot Food')

    fireEvent.click(screen.getByRole('button', { name: /save order/i }))

    await waitFor(() =>
      expect(vi.mocked(categoriesApi.reorderCategories)).toHaveBeenCalledWith(['c1', 'c2']),
    )
    expect(vi.mocked(categoriesApi.reorderProductsInCategory)).toHaveBeenCalledWith('c1', [
      'p1',
      'p2',
    ])
    expect(vi.mocked(categoriesApi.reorderProductsInCategory)).toHaveBeenCalledWith('c2', ['p3'])
  })

  it('shows an error banner when saving fails', async () => {
    mockTwoCategoriesWithProducts()
    vi.mocked(categoriesApi.reorderCategories).mockRejectedValue(new Error('Network Error'))

    await renderAuthenticatedAt('/school-admin/products/order')
    await screen.findByText('Hot Food')

    fireEvent.click(screen.getByRole('button', { name: /save order/i }))

    expect(
      await screen.findByText('Something went wrong. Please check your connection and try again.'),
    ).toBeInTheDocument()
  })

  it('the "Products" back-link navigates to the products list', async () => {
    mockTwoCategoriesWithProducts()
    vi.mocked(productsApi.listProducts).mockResolvedValue([])

    await renderAuthenticatedAt('/school-admin/products/order')
    await screen.findByText('Hot Food')

    fireEvent.click(screen.getByRole('button', { name: /products/i }))

    expect(await screen.findByText('Menu — products')).toBeInTheDocument()
  })

  it('shows an error state when categories fail to load', async () => {
    vi.mocked(categoriesApi.listCategories).mockRejectedValue(new Error('Network Error'))

    await renderAuthenticatedAt('/school-admin/products/order')

    expect(
      await screen.findByText('Something went wrong. Please check your connection and try again.'),
    ).toBeInTheDocument()
  })
})
