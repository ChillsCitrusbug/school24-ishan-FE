import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthContext'
import * as authApi from '@/features/auth/api'
import * as combosApi from '@/features/combos/api'
import * as permissionsApi from '@/features/permissions/api'
import * as productsApi from '@/features/products/api'
import type { UserSummary } from '@/features/auth/api'
import { StudentAuthProvider } from '@/features/student-auth/StudentAuthContext'
import { routes } from './index'

vi.mock('@/features/auth/api')
vi.mock('@/features/combos/api')
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

const COMBO: combosApi.Combo = {
  id: 'c1',
  name: 'Burger Meal',
  combo_price: '6.00',
  availability_status: 'available',
  products: [
    { id: 'p1', name: 'Burger' },
    { id: 'p2', name: 'Fries' },
  ],
}

describe('CombosListScreen', () => {
  it('renders each combo row with its included products and price', async () => {
    vi.mocked(combosApi.listCombos).mockResolvedValue([COMBO])

    await renderAuthenticatedAt('/school-admin/combos')

    expect(await screen.findByText('Burger Meal')).toBeInTheDocument()
    expect(screen.getByText('Burger + Fries')).toBeInTheDocument()
    expect(screen.getByText('$6.00')).toBeInTheDocument()
  })

  it('shows an empty state with an add-combo CTA when there are no combos', async () => {
    vi.mocked(combosApi.listCombos).mockResolvedValue([])

    await renderAuthenticatedAt('/school-admin/combos')

    expect(await screen.findByText('No combos yet')).toBeInTheDocument()
  })

  it('"Add combo" navigates to the combo form', async () => {
    vi.mocked(combosApi.listCombos).mockResolvedValue([COMBO])
    vi.mocked(productsApi.listProducts).mockResolvedValue([
      {
        id: 'p1',
        name: 'Burger',
        category_name: 'Hot Food',
        description: null,
        base_price: '5.00',
        availability_status: 'available',
        variants: [],
        images: [],
      },
    ])

    await renderAuthenticatedAt('/school-admin/combos')
    await screen.findByText('Burger Meal')

    fireEvent.click(screen.getByRole('button', { name: /add combo/i }))

    expect(await screen.findByText('Create a combo')).toBeInTheDocument()
  })

  it('the "Products" back-link navigates to the products list', async () => {
    vi.mocked(combosApi.listCombos).mockResolvedValue([])
    vi.mocked(productsApi.listProducts).mockResolvedValue([])

    await renderAuthenticatedAt('/school-admin/combos')
    await screen.findByText('No combos yet')

    fireEvent.click(screen.getByRole('button', { name: /products/i }))

    expect(await screen.findByText('Menu — products')).toBeInTheDocument()
  })

  it('shows an error state with a retry action when the fetch fails', async () => {
    vi.mocked(combosApi.listCombos).mockRejectedValue(new Error('Network Error'))

    await renderAuthenticatedAt('/school-admin/combos')

    expect(
      await screen.findByText('Something went wrong. Please check your connection and try again.'),
    ).toBeInTheDocument()
  })
})
