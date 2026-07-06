import { StrictMode } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthContext'
import * as authApi from '@/features/auth/api'
import * as notificationsApi from '@/features/notifications/api'
import * as permissionsApi from '@/features/permissions/api'
import { StudentAuthProvider } from '@/features/student-auth/StudentAuthContext'
import { routes } from './index'

vi.mock('@/features/auth/api')
vi.mock('@/features/permissions/api')
vi.mock('@/features/notifications/api')

const STAFF_USER = {
  id: 'u1',
  full_name: 'Jordan Lee',
  email: 'jordan@example.com',
  role: 'staff' as const,
  school_id: 's1',
  school_name: 'Greenvale Primary',
}

async function renderAsStaffAt(path: string, options: { strict?: boolean } = {}) {
  vi.mocked(authApi.login).mockResolvedValue({
    access_token: 'a-real-jwt',
    token_type: 'bearer',
    user: STAFF_USER,
  })
  const router = createMemoryRouter(routes, { initialEntries: ['/login'] })
  const tree = (
    <AuthProvider>
      <StudentAuthProvider>
        <RouterProvider router={router} />
      </StudentAuthProvider>
    </AuthProvider>
  )
  render(options.strict ? <StrictMode>{tree}</StrictMode> : tree)
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'jordan@example.com' } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'whatever' } })
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
  await waitFor(() => expect(screen.getByText(/Welcome/)).toBeInTheDocument())

  await act(async () => {
    await router.navigate(path)
  })
}

function noAccess(module: string) {
  return { module, can_add: false, can_edit: false, can_delete: false, can_list: false }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('StaffPortalScreen', () => {
  it("the topbar bell navigates to staff's own inbox (FR-044)", async () => {
    vi.mocked(permissionsApi.getMyPermissions).mockResolvedValue([
      noAccess('approval') as never,
      noAccess('order_management') as never,
      noAccess('menu_management') as never,
      noAccess('notification') as never,
    ])
    vi.mocked(notificationsApi.listMyNotifications).mockResolvedValue([])

    await renderAsStaffAt('/staff')
    await screen.findByText('No modules assigned yet')
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }))

    expect(await screen.findByText("You're all caught up")).toBeInTheDocument()
  })

  it('shows the no-modules empty state when nothing is granted', async () => {
    vi.mocked(permissionsApi.getMyPermissions).mockResolvedValue([
      noAccess('approval') as never,
      noAccess('order_management') as never,
      noAccess('menu_management') as never,
      noAccess('notification') as never,
    ])

    await renderAsStaffAt('/staff')

    expect(await screen.findByText('No modules assigned yet')).toBeInTheDocument()
  })

  it('renders exactly the modules the live permission set grants', async () => {
    vi.mocked(permissionsApi.getMyPermissions).mockResolvedValue([
      { module: 'order_management', can_add: false, can_edit: false, can_delete: false, can_list: true } as never,
      noAccess('approval') as never,
      noAccess('menu_management') as never,
      noAccess('notification') as never,
    ])

    await renderAsStaffAt('/staff')

    expect(await screen.findByText('Order fulfilment')).toBeInTheDocument()
    // Descriptions are unique to the module cards (unlike the labels,
    // which "Notifications" also shares with the sidebar nav item).
    expect(screen.queryByText('Review and approve parent-student link requests.')).not.toBeInTheDocument()
    expect(screen.queryByText('Add products and combos, set availability.')).not.toBeInTheDocument()
    expect(screen.queryByText('Send updates to families and staff.')).not.toBeInTheDocument()
  })

  it('shows an error state (not the empty state) when the fetch fails', async () => {
    vi.mocked(permissionsApi.getMyPermissions).mockRejectedValue(new Error('Network Error'))

    await renderAsStaffAt('/staff')

    expect(
      await screen.findByText('Something went wrong. Please check your connection and try again.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('No modules assigned yet')).not.toBeInTheDocument()
  })

  // Bug found while visual-checking FR-006 (a sibling screen sharing this
  // exact pattern): mountedRef used to be set to false only in the
  // effect's cleanup, never reset to true on mount — React StrictMode's
  // dev-only double-invoke fired that cleanup once before the "real"
  // mount settled, permanently zeroing the ref, so the eventual API
  // response was silently dropped and the screen hung on its loading
  // spinner forever. Reproduced here by actually rendering under
  // <StrictMode>.
  it('still renders granted modules under StrictMode double-invoke (regression)', async () => {
    vi.mocked(permissionsApi.getMyPermissions).mockResolvedValue([
      { module: 'order_management', can_add: false, can_edit: false, can_delete: false, can_list: true } as never,
      noAccess('approval') as never,
      noAccess('menu_management') as never,
      noAccess('notification') as never,
    ])

    await renderAsStaffAt('/staff', { strict: true })

    expect(await screen.findByText('Order fulfilment')).toBeInTheDocument()
  })
})
