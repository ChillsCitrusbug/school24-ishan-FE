import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthContext'
import * as authApi from '@/features/auth/api'
import * as permissionsApi from '@/features/permissions/api'
import * as productsApi from '@/features/products/api'
import type { UserSummary } from '@/features/auth/api'
import { StudentAuthProvider } from '@/features/student-auth/StudentAuthContext'
import { routes } from './index'

vi.mock('@/features/auth/api')
vi.mock('@/features/products/api')
vi.mock('@/features/permissions/api')

const SCHOOL_ADMIN_USER = {
  id: 'u1',
  full_name: 'Priya Nair',
  email: 'priya@example.com',
  role: 'school_admin' as const,
  school_id: 's1',
  school_name: 'Greenvale Primary',
}

const STAFF_USER = {
  id: 'u2',
  full_name: 'Cara Cashier',
  email: 'cara@example.com',
  role: 'staff' as const,
  school_id: 's1',
  school_name: 'Greenvale Primary',
}

const PARENT_USER = {
  id: 'u3',
  full_name: 'Pat Parent',
  email: 'pat@example.com',
  role: 'parent' as const,
  school_id: null,
  school_name: null,
}

async function renderAuthenticatedAt(path: string, user: UserSummary = SCHOOL_ADMIN_USER) {
  vi.mocked(authApi.login).mockResolvedValue({
    access_token: 'a-real-jwt',
    token_type: 'bearer',
    user,
  })
  // A staff login briefly routes through StaffPortalScreen before this
  // helper navigates away — mocked so that in-flight, unmocked fetch
  // doesn't error in the background once the component unmounts.
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

const PRODUCT: productsApi.Product = {
  id: 'p1',
  name: 'Chicken Wrap',
  category_name: 'Hot Food',
  description: null,
  base_price: '6.50',
  availability_status: 'available',
  variants: [{ id: 'v1', variant_label: 'Regular', price: '6.50' }],
  images: [],
}

describe('ProductsListScreen', () => {
  it('renders each product row with category and price', async () => {
    vi.mocked(productsApi.listProducts).mockResolvedValue([PRODUCT])

    await renderAuthenticatedAt('/school-admin/products')

    expect(await screen.findByText('Chicken Wrap')).toBeInTheDocument()
    expect(screen.getByText('Hot Food')).toBeInTheDocument()
    expect(screen.getByText('$6.50')).toBeInTheDocument()
  })

  it('shows the empty state with no products', async () => {
    vi.mocked(productsApi.listProducts).mockResolvedValue([])

    await renderAuthenticatedAt('/school-admin/products')

    expect(await screen.findByText('No products yet')).toBeInTheDocument()
  })

  it('shows an error state with a retry action when the fetch fails', async () => {
    vi.mocked(productsApi.listProducts).mockRejectedValue(new Error('Network Error'))

    await renderAuthenticatedAt('/school-admin/products')

    expect(
      await screen.findByText('Something went wrong. Please check your connection and try again.'),
    ).toBeInTheDocument()
  })

  it('the "Add product" button navigates to the product form', async () => {
    vi.mocked(productsApi.listProducts).mockResolvedValue([])

    await renderAuthenticatedAt('/school-admin/products')
    await screen.findByText('No products yet')
    fireEvent.click(screen.getAllByRole('button', { name: /add product/i })[0])

    expect(await screen.findByText('Add a product')).toBeInTheDocument()
  })

  it('a staff member with menu access can also reach the products list', async () => {
    vi.mocked(productsApi.listProducts).mockResolvedValue([PRODUCT])

    await renderAuthenticatedAt('/school-admin/products', STAFF_USER)

    expect(await screen.findByText('Chicken Wrap')).toBeInTheDocument()
  })

  it('a parent cannot reach the products list (redirected away)', async () => {
    vi.mocked(productsApi.listProducts).mockResolvedValue([])
    await renderAuthenticatedAt('/school-admin/products', PARENT_USER)

    expect(screen.queryByText('Chicken Wrap')).not.toBeInTheDocument()
  })

  it('toggling availability calls the API and flips the row (FR-026)', async () => {
    vi.mocked(productsApi.listProducts).mockResolvedValue([PRODUCT])
    vi.mocked(productsApi.setProductAvailability).mockResolvedValue({
      ...PRODUCT,
      availability_status: 'unavailable',
    })

    await renderAuthenticatedAt('/school-admin/products')
    await screen.findByText('Chicken Wrap')
    expect(screen.getByText('On menu')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('switch', { name: /chicken wrap available/i }))

    await waitFor(() =>
      expect(vi.mocked(productsApi.setProductAvailability)).toHaveBeenCalledWith(
        'p1',
        'unavailable',
      ),
    )
    expect(await screen.findByText('Hidden')).toBeInTheDocument()
  })

  it('disables the toggle while a request is in flight, and re-enables once it settles (FR-026)', async () => {
    vi.mocked(productsApi.listProducts).mockResolvedValue([PRODUCT])
    let resolveToggle: (value: productsApi.Product) => void = () => {}
    vi.mocked(productsApi.setProductAvailability).mockReturnValue(
      new Promise((resolve) => {
        resolveToggle = resolve
      }),
    )

    await renderAuthenticatedAt('/school-admin/products')
    await screen.findByText('Chicken Wrap')
    const toggle = screen.getByRole('switch', { name: /chicken wrap available/i })

    fireEvent.click(toggle)

    await waitFor(() => expect(toggle).toBeDisabled())
    expect(screen.getByText('Updating…')).toBeInTheDocument()

    resolveToggle({ ...PRODUCT, availability_status: 'unavailable' })

    await waitFor(() => expect(toggle).not.toBeDisabled())
    expect(await screen.findByText('Hidden')).toBeInTheDocument()
  })

  it('a failed toggle reverts the row and shows an error banner, without clearing the list (FR-026)', async () => {
    vi.mocked(productsApi.listProducts).mockResolvedValue([PRODUCT])
    vi.mocked(productsApi.setProductAvailability).mockRejectedValue(new Error('Network Error'))

    await renderAuthenticatedAt('/school-admin/products')
    await screen.findByText('Chicken Wrap')

    fireEvent.click(screen.getByRole('switch', { name: /chicken wrap available/i }))

    expect(
      await screen.findByText('Could not update availability. Please try again.'),
    ).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('On menu')).toBeInTheDocument())
    expect(screen.getByText('Chicken Wrap')).toBeInTheDocument()
  })
})
