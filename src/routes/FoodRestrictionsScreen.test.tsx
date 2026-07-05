import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthContext'
import * as authApi from '@/features/auth/api'
import * as childSelectionApi from '@/features/child-selection/api'
import * as foodRestrictionsApi from '@/features/food-restrictions/api'
import { StudentAuthProvider } from '@/features/student-auth/StudentAuthContext'
import { routes } from './index'

vi.mock('@/features/auth/api')
vi.mock('@/features/child-selection/api')
vi.mock('@/features/food-restrictions/api')

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

async function renderAuthenticatedAt(path: string) {
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

describe('FoodRestrictionsScreen (FR-032)', () => {
  it('shows an error when no child was selected', async () => {
    vi.mocked(childSelectionApi.getActiveContext).mockResolvedValue([NOAH])

    await renderAuthenticatedAt('/parent/food-restrictions')

    expect(await screen.findByText('No child was selected. Please choose a child first.')).toBeInTheDocument()
  })

  it('shows an error when the childId is not one of the parent\'s approved children', async () => {
    vi.mocked(childSelectionApi.getActiveContext).mockResolvedValue([])

    await renderAuthenticatedAt('/parent/food-restrictions?childId=st1')

    expect(
      await screen.findByText(
        'You can only manage food restrictions once your link to this child is approved.',
      ),
    ).toBeInTheDocument()
  })

  it('shows the empty state when the child has no restrictions yet', async () => {
    vi.mocked(childSelectionApi.getActiveContext).mockResolvedValue([NOAH])
    vi.mocked(foodRestrictionsApi.listRestrictions).mockResolvedValue([])

    await renderAuthenticatedAt('/parent/food-restrictions?childId=st1')

    expect(await screen.findByText('No restrictions set')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Noah Thompson can currently buy anything on the menu. Block an item or a whole category to limit what they can order.',
      ),
    ).toBeInTheDocument()
  })

  it('lists blocked products and categories separately', async () => {
    vi.mocked(childSelectionApi.getActiveContext).mockResolvedValue([NOAH])
    vi.mocked(foodRestrictionsApi.listRestrictions).mockResolvedValue([
      { id: 'r1', restriction_type: 'product', product_id: 'p1', category_id: null, name: 'Chocolate Brownie' },
      { id: 'r2', restriction_type: 'category', product_id: null, category_id: 'c1', name: 'Soft drinks' },
    ])

    await renderAuthenticatedAt('/parent/food-restrictions?childId=st1')

    expect(await screen.findByText('Chocolate Brownie')).toBeInTheDocument()
    expect(screen.getByText('Soft drinks')).toBeInTheDocument()
    expect(screen.getByText('Blocked products')).toBeInTheDocument()
    expect(screen.getByText('Blocked categories')).toBeInTheDocument()
  })

  it('searches the catalog and blocks a matching product', async () => {
    vi.mocked(childSelectionApi.getActiveContext).mockResolvedValue([NOAH])
    vi.mocked(foodRestrictionsApi.listRestrictions).mockResolvedValue([])
    vi.mocked(foodRestrictionsApi.searchCatalog).mockResolvedValue([
      { id: 'p1', type: 'product', name: 'Chocolate Brownie' },
    ])
    vi.mocked(foodRestrictionsApi.createRestriction).mockResolvedValue({
      id: 'r1',
      restriction_type: 'product',
      product_id: 'p1',
      category_id: null,
      name: 'Chocolate Brownie',
    })

    await renderAuthenticatedAt('/parent/food-restrictions?childId=st1')
    await screen.findByText('No restrictions set')

    fireEvent.change(screen.getByLabelText('Search items to block'), {
      target: { value: 'choc' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^search$/i }))

    expect(await screen.findByText('Product')).toBeInTheDocument()
    expect(foodRestrictionsApi.searchCatalog).toHaveBeenCalledWith('st1', 'choc')

    fireEvent.click(screen.getByRole('button', { name: /^add$/i }))

    await waitFor(() =>
      expect(foodRestrictionsApi.createRestriction).toHaveBeenCalledWith('st1', {
        restriction_type: 'product',
        product_id: 'p1',
      }),
    )
    expect(await screen.findByText('Blocked products')).toBeInTheDocument()
  })

  it('shows a 409 error banner when the restriction already exists', async () => {
    vi.mocked(childSelectionApi.getActiveContext).mockResolvedValue([NOAH])
    vi.mocked(foodRestrictionsApi.listRestrictions).mockResolvedValue([])
    vi.mocked(foodRestrictionsApi.searchCatalog).mockResolvedValue([
      { id: 'c1', type: 'category', name: 'Soft drinks' },
    ])
    vi.mocked(foodRestrictionsApi.createRestriction).mockRejectedValue({
      response: { data: { errors: 'This item or category is already blocked for this child.' } },
    })

    await renderAuthenticatedAt('/parent/food-restrictions?childId=st1')
    await screen.findByText('No restrictions set')

    fireEvent.change(screen.getByLabelText('Search items to block'), {
      target: { value: 'soft' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^search$/i }))
    await screen.findByText('Category')
    fireEvent.click(screen.getByRole('button', { name: /^add$/i }))

    expect(
      await screen.findByText('This item or category is already blocked for this child.'),
    ).toBeInTheDocument()
  })

  it('does not render any "unblock" control (removal is FR-034, out of scope)', async () => {
    vi.mocked(childSelectionApi.getActiveContext).mockResolvedValue([NOAH])
    vi.mocked(foodRestrictionsApi.listRestrictions).mockResolvedValue([
      { id: 'r1', restriction_type: 'product', product_id: 'p1', category_id: null, name: 'Chocolate Brownie' },
    ])

    await renderAuthenticatedAt('/parent/food-restrictions?childId=st1')
    await screen.findByText('Chocolate Brownie')

    expect(screen.queryByLabelText(/unblock/i)).not.toBeInTheDocument()
  })
})
