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

const BURGER: productsApi.Product = {
  id: 'p1',
  name: 'Burger',
  category_name: 'Hot Food',
  description: null,
  base_price: '5.00',
  availability_status: 'available',
  variants: [],
  images: [],
}
const FRIES: productsApi.Product = {
  id: 'p2',
  name: 'Fries',
  category_name: 'Hot Food',
  description: null,
  base_price: '2.00',
  availability_status: 'available',
  variants: [],
  images: [],
}

describe('ComboFormScreen — create (Sc049ComboForm)', () => {
  it('creates a combo from selected products', async () => {
    vi.mocked(productsApi.listProducts).mockResolvedValue([BURGER, FRIES])
    vi.mocked(combosApi.listCombos).mockResolvedValue([])
    vi.mocked(combosApi.createCombo).mockResolvedValue({
      id: 'c1',
      name: 'Lunch Box',
      combo_price: '6.00',
      availability_status: 'available',
      products: [BURGER, FRIES].map((p) => ({ id: p.id, name: p.name })),
    })

    await renderAuthenticatedAt('/school-admin/combos/new')
    await screen.findByText('Create a combo')

    fireEvent.change(screen.getByLabelText('Combo name'), { target: { value: 'Lunch Box' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Burger' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Fries' }))
    fireEvent.change(screen.getByLabelText('Combo price'), { target: { value: '6.00' } })
    fireEvent.click(screen.getByRole('button', { name: /save combo/i }))

    await waitFor(() =>
      expect(vi.mocked(combosApi.createCombo)).toHaveBeenCalledWith({
        name: 'Lunch Box',
        combo_price: '6.00',
        product_ids: ['p1', 'p2'],
      }),
    )
  })

  it('shows the blocked state when the catalogue has no products', async () => {
    vi.mocked(productsApi.listProducts).mockResolvedValue([])

    await renderAuthenticatedAt('/school-admin/combos/new')

    expect(await screen.findByText('Add products first')).toBeInTheDocument()
    expect(screen.queryByLabelText('Combo name')).not.toBeInTheDocument()
  })

  it('the Save button is disabled until at least one product is selected', async () => {
    vi.mocked(productsApi.listProducts).mockResolvedValue([BURGER])

    await renderAuthenticatedAt('/school-admin/combos/new')
    await screen.findByText('Create a combo')

    expect(screen.getByRole('button', { name: /save combo/i })).toBeDisabled()

    fireEvent.click(screen.getByRole('checkbox', { name: 'Burger' }))

    expect(screen.getByRole('button', { name: /save combo/i })).not.toBeDisabled()
  })

  it('shows an error banner when the create call fails', async () => {
    vi.mocked(productsApi.listProducts).mockResolvedValue([BURGER])
    vi.mocked(combosApi.createCombo).mockRejectedValue(new Error('Network Error'))

    await renderAuthenticatedAt('/school-admin/combos/new')
    await screen.findByText('Create a combo')
    fireEvent.change(screen.getByLabelText('Combo name'), { target: { value: 'Lunch Box' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Burger' }))
    fireEvent.change(screen.getByLabelText('Combo price'), { target: { value: '6.00' } })
    fireEvent.click(screen.getByRole('button', { name: /save combo/i }))

    expect(
      await screen.findByText('Something went wrong. Please check your connection and try again.'),
    ).toBeInTheDocument()
  })
})

describe('ComboFormScreen — edit', () => {
  it('prefills the existing combo and saves changes', async () => {
    vi.mocked(productsApi.listProducts).mockResolvedValue([BURGER, FRIES])
    vi.mocked(combosApi.listCombos).mockResolvedValue([])
    vi.mocked(combosApi.getCombo).mockResolvedValue({
      id: 'c1',
      name: 'Lunch Box',
      combo_price: '6.00',
      availability_status: 'available',
      products: [{ id: 'p1', name: 'Burger' }],
    })
    vi.mocked(combosApi.updateCombo).mockResolvedValue({
      id: 'c1',
      name: 'Lunch Box Deluxe',
      combo_price: '7.00',
      availability_status: 'available',
      products: [BURGER, FRIES].map((p) => ({ id: p.id, name: p.name })),
    })

    await renderAuthenticatedAt('/school-admin/combos/c1/edit')

    expect(await screen.findByDisplayValue('Lunch Box')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Burger' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('checkbox', { name: 'Fries' })).toHaveAttribute('aria-checked', 'false')

    fireEvent.change(screen.getByLabelText('Combo name'), {
      target: { value: 'Lunch Box Deluxe' },
    })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Fries' }))
    fireEvent.change(screen.getByLabelText('Combo price'), { target: { value: '7.00' } })
    fireEvent.click(screen.getByRole('button', { name: /save combo/i }))

    await waitFor(() =>
      expect(vi.mocked(combosApi.updateCombo)).toHaveBeenCalledWith('c1', {
        name: 'Lunch Box Deluxe',
        combo_price: '7.00',
        product_ids: ['p1', 'p2'],
      }),
    )
  })
})
