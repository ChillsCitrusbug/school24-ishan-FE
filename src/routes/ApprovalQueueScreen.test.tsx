import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthContext'
import * as approvalsApi from '@/features/approvals/api'
import * as authApi from '@/features/auth/api'
import * as permissionsApi from '@/features/permissions/api'
import type { UserSummary } from '@/features/auth/api'
import { StudentAuthProvider } from '@/features/student-auth/StudentAuthContext'
import { routes } from './index'

vi.mock('@/features/auth/api')
vi.mock('@/features/approvals/api')
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

const REQUEST: approvalsApi.PendingLinkRequest = {
  id: 'lr1',
  parent_name: 'Sarah Thompson',
  parent_email: 'sarah@thompson.com',
  student_id_code: 'S-41880',
  student_name: 'Noah Thompson',
  class_name: 'Year 1 · 1A',
  requested_at: '2026-07-05T09:14:00Z',
}

describe('ApprovalQueueScreen (Sc043ApprovalQueue)', () => {
  it('renders each pending request row', async () => {
    vi.mocked(approvalsApi.listPendingLinkRequests).mockResolvedValue([REQUEST])

    await renderAuthenticatedAt('/school-admin/approvals')

    expect(await screen.findByText('Sarah Thompson')).toBeInTheDocument()
    expect(screen.getByText(/wants to link to/i)).toBeInTheDocument()
    expect(screen.getByText('Noah Thompson')).toBeInTheDocument()
  })

  it('shows the empty state when there are no pending requests', async () => {
    vi.mocked(approvalsApi.listPendingLinkRequests).mockResolvedValue([])

    await renderAuthenticatedAt('/school-admin/approvals')

    expect(await screen.findByText('No pending requests')).toBeInTheDocument()
  })

  it('shows an error state with a retry action when the fetch fails', async () => {
    vi.mocked(approvalsApi.listPendingLinkRequests).mockRejectedValue(new Error('Network Error'))

    await renderAuthenticatedAt('/school-admin/approvals')

    expect(
      await screen.findByText('Something went wrong. Please check your connection and try again.'),
    ).toBeInTheDocument()
  })

  it('"Approve" calls the API and removes the row from the queue', async () => {
    vi.mocked(approvalsApi.listPendingLinkRequests).mockResolvedValue([REQUEST])
    vi.mocked(approvalsApi.decideLinkRequest).mockResolvedValue({
      id: 'lr1',
      student_id: 's1',
      status: 'approved',
      student_full_name: 'Noah Thompson',
      student_id_code: 'S-41880',
    })

    await renderAuthenticatedAt('/school-admin/approvals')
    await screen.findByText('Sarah Thompson')

    fireEvent.click(screen.getByRole('button', { name: /^approve$/i }))

    await waitFor(() =>
      expect(vi.mocked(approvalsApi.decideLinkRequest)).toHaveBeenCalledWith('lr1', 'approve'),
    )
    await waitFor(() => expect(screen.queryByText('Sarah Thompson')).not.toBeInTheDocument())
  })

  it('"Reject" navigates to the review screen with the reject state pre-selected', async () => {
    vi.mocked(approvalsApi.listPendingLinkRequests).mockResolvedValue([REQUEST])

    await renderAuthenticatedAt('/school-admin/approvals')
    await screen.findByText('Sarah Thompson')

    fireEvent.click(screen.getByRole('button', { name: /^reject$/i }))

    expect(await screen.findByText('Reject this request?')).toBeInTheDocument()
  })

  it('a staff member with approval access can also reach the queue', async () => {
    vi.mocked(approvalsApi.listPendingLinkRequests).mockResolvedValue([REQUEST])

    await renderAuthenticatedAt('/school-admin/approvals', STAFF_USER)

    expect(await screen.findByText('Sarah Thompson')).toBeInTheDocument()
  })

  it('a parent cannot reach the approval queue (redirected away)', async () => {
    vi.mocked(approvalsApi.listPendingLinkRequests).mockResolvedValue([])

    await renderAuthenticatedAt('/school-admin/approvals', PARENT_USER)

    expect(screen.queryByText('Link approvals')).not.toBeInTheDocument()
  })
})
