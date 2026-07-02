import { StrictMode } from 'react'
import { act, render, screen, waitFor, fireEvent } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthContext'
import * as authApi from '@/features/auth/api'
import * as rolesApi from '@/features/roles/api'
import { StudentAuthProvider } from '@/features/student-auth/StudentAuthContext'
import { routes } from './index'

vi.mock('@/features/auth/api')
vi.mock('@/features/roles/api')

const SCHOOL_ADMIN_USER = {
  id: 'u1',
  full_name: 'Priya Nair',
  email: 'priya@example.com',
  role: 'school_admin' as const,
  school_id: 's1',
  school_name: 'Greenvale Primary',
}

/** Logs in via the real LoginScreen form (mocked API), matching
 * LoginScreen.test.tsx's own precedent, then navigates directly to the
 * target route via the router object — the app has no in-app link to
 * the roles screens yet (deliberately: the sidebar's "Staff" item has
 * no href, since a raw `<a href>` would full-page-reload and wipe the
 * in-memory-only access token), so tests reach it the same way a typed
 * URL bar would. */
async function renderAuthenticatedAt(path: string, options: { strict?: boolean } = {}) {
  vi.mocked(authApi.login).mockResolvedValue({
    access_token: 'a-real-jwt',
    token_type: 'bearer',
    user: SCHOOL_ADMIN_USER,
  })
  const router = createMemoryRouter(routes, { initialEntries: ['/login'] })
  const tree = (
    <AuthProvider>
      <StudentAuthProvider>
        <RouterProvider router={router} />
      </StudentAuthProvider>
    </AuthProvider>
  )
  const result = render(options.strict ? <StrictMode>{tree}</StrictMode> : tree)
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'priya@example.com' } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'whatever' } })
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
  await waitFor(() => expect(screen.getByText(/Good morning/)).toBeInTheDocument())

  await act(async () => {
    await router.navigate(path)
  })
  return result
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('RolesListScreen', () => {
  it('renders the empty state when no roles exist yet', async () => {
    vi.mocked(rolesApi.listRoles).mockResolvedValue([])

    await renderAuthenticatedAt('/school-admin/roles')

    expect(await screen.findByText('No roles yet')).toBeInTheDocument()
  })

  it('lists roles with staff count and a computed permission summary', async () => {
    vi.mocked(rolesApi.listRoles).mockResolvedValue([
      {
        id: 'r1',
        name: 'Order Handler',
        staff_count: 3,
        permissions: [
          { module: 'order_management', can_add: true, can_edit: false, can_delete: false, can_list: true },
          { module: 'approval', can_add: false, can_edit: false, can_delete: false, can_list: false },
          { module: 'menu_management', can_add: false, can_edit: false, can_delete: false, can_list: false },
          { module: 'notification', can_add: false, can_edit: false, can_delete: false, can_list: false },
        ],
      },
    ])

    await renderAuthenticatedAt('/school-admin/roles')

    expect(await screen.findByText('Order Handler')).toBeInTheDocument()
    expect(screen.getByText('3 staff')).toBeInTheDocument()
    expect(screen.getByText('Order Management')).toBeInTheDocument()
  })

  it('navigates to the role builder when "Create role" is clicked', async () => {
    vi.mocked(rolesApi.listRoles).mockResolvedValue([])

    await renderAuthenticatedAt('/school-admin/roles')
    await screen.findByText('No roles yet')
    fireEvent.click(screen.getAllByRole('button', { name: /create role/i })[0])

    expect(await screen.findByLabelText('Role name')).toBeInTheDocument()
  })

  // Review finding, FR-017 (Major): a failed fetch used to be silently
  // indistinguishable from "you have zero roles" — no .catch, no error
  // state. Must show an honest error, never a misleading empty state.
  it('shows an error state (not the empty state) when the fetch fails', async () => {
    vi.mocked(rolesApi.listRoles).mockRejectedValue(new Error('Network Error'))

    await renderAuthenticatedAt('/school-admin/roles')

    expect(
      await screen.findByText('Something went wrong. Please check your connection and try again.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('No roles yet')).not.toBeInTheDocument()
  })

  it('retries the fetch when "Try again" is clicked after a failure', async () => {
    vi.mocked(rolesApi.listRoles)
      .mockRejectedValueOnce(new Error('Network Error'))
      .mockResolvedValueOnce([])

    await renderAuthenticatedAt('/school-admin/roles')
    await screen.findByText('Something went wrong. Please check your connection and try again.')
    fireEvent.click(screen.getByRole('button', { name: /try again/i }))

    expect(await screen.findByText('No roles yet')).toBeInTheDocument()
    expect(rolesApi.listRoles).toHaveBeenCalledTimes(2)
  })

  // Round 2 re-review finding (Minor): the initial in-flight fetch fell
  // through to the same render branch as a real empty/populated list —
  // no loading indicator, just a blank flash. Must show an honest
  // loading state instead.
  it('shows a loading indicator while the initial fetch is in flight', async () => {
    let resolveFetch: (roles: rolesApi.Role[]) => void = () => {}
    vi.mocked(rolesApi.listRoles).mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve
      }),
    )

    await renderAuthenticatedAt('/school-admin/roles')

    expect(screen.getByRole('status', { name: /loading roles/i })).toBeInTheDocument()
    expect(screen.queryByText('No roles yet')).not.toBeInTheDocument()

    await act(async () => {
      resolveFetch([])
    })
    expect(await screen.findByText('No roles yet')).toBeInTheDocument()
  })

  // FR-018: Edit/Delete are wired to their real flows (were inert,
  // disabled placeholders under FR-017's own scope).
  it('navigates to the role builder in edit mode when "Edit" is clicked', async () => {
    vi.mocked(rolesApi.listRoles).mockResolvedValue([
      { id: 'r1', name: 'Order Handler', staff_count: 0, permissions: [] },
    ])
    vi.mocked(rolesApi.getRole).mockResolvedValue({
      id: 'r1',
      name: 'Order Handler',
      staff_count: 0,
      permissions: [],
    })

    await renderAuthenticatedAt('/school-admin/roles')
    await screen.findByText('Order Handler')
    fireEvent.click(screen.getByRole('button', { name: /^edit$/i }))

    expect(await screen.findByText('Edit role')).toBeInTheDocument()
  })

  it('navigates to the delete confirmation when "Delete" is clicked', async () => {
    vi.mocked(rolesApi.listRoles).mockResolvedValue([
      { id: 'r1', name: 'Order Handler', staff_count: 0, permissions: [] },
    ])
    vi.mocked(rolesApi.getRole).mockResolvedValue({
      id: 'r1',
      name: 'Order Handler',
      staff_count: 0,
      permissions: [],
    })

    await renderAuthenticatedAt('/school-admin/roles')
    await screen.findByText('Order Handler')
    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }))

    expect(await screen.findByText('Delete the “Order Handler” role?')).toBeInTheDocument()
  })

  // Bug found while visual-checking FR-006 (a sibling screen sharing this
  // exact pattern): mountedRef used to be set to false only in the
  // effect's cleanup, never reset to true on mount — React StrictMode's
  // dev-only double-invoke fired that cleanup once before the "real"
  // mount settled, permanently zeroing the ref, so the eventual API
  // response was silently dropped and the screen hung on its loading
  // spinner forever. Reproduced here by actually rendering under
  // <StrictMode>.
  it('still renders role data under StrictMode double-invoke (regression)', async () => {
    vi.mocked(rolesApi.listRoles).mockResolvedValue([
      { id: 'r1', name: 'Order Handler', staff_count: 0, permissions: [] },
    ])

    await renderAuthenticatedAt('/school-admin/roles', { strict: true })

    expect(await screen.findByText('Order Handler')).toBeInTheDocument()
  })
})
