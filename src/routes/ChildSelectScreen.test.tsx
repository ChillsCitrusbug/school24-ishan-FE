import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthContext'
import * as authApi from '@/features/auth/api'
import * as childSelectionApi from '@/features/child-selection/api'
import * as myChildrenApi from '@/features/my-children/api'
import * as permissionsApi from '@/features/permissions/api'
import { StudentAuthProvider } from '@/features/student-auth/StudentAuthContext'
import { routes } from './index'

vi.mock('@/features/auth/api')
vi.mock('@/features/child-selection/api')
vi.mock('@/features/permissions/api')
vi.mock('@/features/my-children/api')

const PARENT_USER = {
  id: 'u1',
  full_name: 'Sarah Thompson',
  email: 'sarah@thompson.com',
  role: 'parent' as const,
  school_id: null,
  school_name: null,
}

async function renderAuthenticatedAt(path: string) {
  vi.mocked(authApi.login).mockResolvedValue({
    access_token: 'a-real-jwt',
    token_type: 'bearer',
    user: PARENT_USER,
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
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: PARENT_USER.email } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'whatever' } })
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
  await waitFor(() => expect(screen.getByText(/dashboard coming soon/i)).toBeInTheDocument())

  await act(async () => {
    await router.navigate(path)
  })
  return router
}

afterEach(() => {
  vi.restoreAllMocks()
})

const NOAH: childSelectionApi.ActiveChild = {
  student_id: 'st1',
  student_id_code: 'S-41880',
  full_name: 'Noah Thompson',
  class_name: 'Year 1 · 1A',
  school_name: 'Greenvale Primary',
  wallet_balance: 12.5,
}

const GRACE: childSelectionApi.ActiveChild = {
  student_id: 'st2',
  student_id_code: 'S-40552',
  full_name: 'Grace Okoro',
  class_name: 'Year 3 · 3R',
  school_name: 'Greenvale Primary',
  wallet_balance: 3.2,
}

describe('ChildSelectScreen (Sc064ChildSelect)', () => {
  it('with exactly one approved child, resolves directly with no picker shown', async () => {
    vi.mocked(childSelectionApi.getActiveContext).mockResolvedValue([NOAH])

    const router = await renderAuthenticatedAt('/parent/select-child')

    await waitFor(() => expect(router.state.location.pathname).toBe('/parent'))
    expect(router.state.location.search).toBe('?childId=st1')
    expect(screen.queryByRole('heading', { name: 'Choose a child' })).not.toBeInTheDocument()
  })

  it('with two or more approved children, shows the picker and never auto-selects', async () => {
    vi.mocked(childSelectionApi.getActiveContext).mockResolvedValue([NOAH, GRACE])

    await renderAuthenticatedAt('/parent/select-child')

    expect(await screen.findByText('Choose a child')).toBeInTheDocument()
    expect(screen.getByText('Noah Thompson')).toBeInTheDocument()
    expect(screen.getByText('Grace Okoro')).toBeInTheDocument()
    expect(screen.getByText('$12.50')).toBeInTheDocument()
  })

  it('picking a child from the list navigates to the next destination with its id', async () => {
    vi.mocked(childSelectionApi.getActiveContext).mockResolvedValue([NOAH, GRACE])

    const router = await renderAuthenticatedAt('/parent/select-child?next=/parent/wallet')
    await screen.findByText('Noah Thompson')

    fireEvent.click(screen.getByText('Noah Thompson'))

    await waitFor(() => expect(router.state.location.pathname).toBe('/parent/wallet'))
    expect(router.state.location.search).toBe('?childId=st1')
  })

  it('with zero approved children, shows the only-pending empty state', async () => {
    vi.mocked(childSelectionApi.getActiveContext).mockResolvedValue([])

    await renderAuthenticatedAt('/parent/select-child')

    expect(await screen.findByText('No approved children yet')).toBeInTheDocument()
  })

  it('"View requests" navigates to the real My Children status screen (round-1 review finding, Major)', async () => {
    vi.mocked(childSelectionApi.getActiveContext).mockResolvedValue([])
    vi.mocked(myChildrenApi.listMyChildren).mockResolvedValue([])

    await renderAuthenticatedAt('/parent/select-child')
    await screen.findByText('No approved children yet')

    fireEvent.click(screen.getByRole('button', { name: /view requests/i }))

    expect(await screen.findByRole('heading', { name: 'My children' })).toBeInTheDocument()
  })

  it('shows an error state when the children cannot be loaded', async () => {
    vi.mocked(childSelectionApi.getActiveContext).mockRejectedValue(new Error('Network Error'))

    await renderAuthenticatedAt('/parent/select-child')

    expect(
      await screen.findByText('Something went wrong. Please check your connection and try again.'),
    ).toBeInTheDocument()
  })
})
