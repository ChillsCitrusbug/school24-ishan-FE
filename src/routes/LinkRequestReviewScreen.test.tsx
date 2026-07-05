import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthContext'
import * as approvalsApi from '@/features/approvals/api'
import * as authApi from '@/features/auth/api'
import * as permissionsApi from '@/features/permissions/api'
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

async function renderAuthenticatedAt(path: string) {
  vi.mocked(authApi.login).mockResolvedValue({
    access_token: 'a-real-jwt',
    token_type: 'bearer',
    user: SCHOOL_ADMIN_USER,
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
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: SCHOOL_ADMIN_USER.email } })
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

describe('LinkRequestReviewScreen (Sc044LinkReview)', () => {
  it('loads and shows the request detail', async () => {
    vi.mocked(approvalsApi.listPendingLinkRequests).mockResolvedValue([REQUEST])

    await renderAuthenticatedAt('/school-admin/approvals/lr1')

    expect(await screen.findByText('Review link request')).toBeInTheDocument()
    expect(screen.getByText('Sarah Thompson')).toBeInTheDocument()
    expect(screen.getByText('sarah@thompson.com')).toBeInTheDocument()
    expect(screen.getByText('Noah Thompson')).toBeInTheDocument()
    expect(screen.getByText('S-41880')).toBeInTheDocument()
  })

  it('shows a not-found message for a request that is no longer pending', async () => {
    vi.mocked(approvalsApi.listPendingLinkRequests).mockResolvedValue([])

    await renderAuthenticatedAt('/school-admin/approvals/lr1')

    expect(
      await screen.findByText(
        'This request is no longer pending, or does not belong to your school.',
      ),
    ).toBeInTheDocument()
  })

  it('"Approve link" calls the API and navigates back to the queue', async () => {
    vi.mocked(approvalsApi.listPendingLinkRequests).mockResolvedValue([REQUEST])
    vi.mocked(approvalsApi.decideLinkRequest).mockResolvedValue({
      id: 'lr1',
      student_id: 's1',
      status: 'approved',
      student_full_name: 'Noah Thompson',
      student_id_code: 'S-41880',
    })

    await renderAuthenticatedAt('/school-admin/approvals/lr1')
    await screen.findByText('Review link request')

    fireEvent.click(screen.getByRole('button', { name: /approve link/i }))

    await waitFor(() =>
      expect(vi.mocked(approvalsApi.decideLinkRequest)).toHaveBeenCalledWith('lr1', 'approve'),
    )
    expect(await screen.findByText('Link approvals')).toBeInTheDocument()
  })

  it('"Reject" opens the reason textarea, and submitting rejects with the typed reason', async () => {
    vi.mocked(approvalsApi.listPendingLinkRequests).mockResolvedValue([REQUEST])
    vi.mocked(approvalsApi.decideLinkRequest).mockResolvedValue({
      id: 'lr1',
      student_id: 's1',
      status: 'rejected',
      student_full_name: 'Noah Thompson',
      student_id_code: 'S-41880',
    })

    await renderAuthenticatedAt('/school-admin/approvals/lr1')
    await screen.findByText('Review link request')

    fireEvent.click(screen.getByRole('button', { name: /^reject$/i }))
    expect(await screen.findByText('Reject this request?')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Rejection reason'), {
      target: { value: 'Could not verify guardianship' },
    })
    fireEvent.click(screen.getByRole('button', { name: /reject request/i }))

    await waitFor(() =>
      expect(vi.mocked(approvalsApi.decideLinkRequest)).toHaveBeenCalledWith(
        'lr1',
        'reject',
        'Could not verify guardianship',
      ),
    )
    expect(await screen.findByText('Link approvals')).toBeInTheDocument()
  })

  it('opens directly into the reject-confirm state when navigated with ?action=reject', async () => {
    vi.mocked(approvalsApi.listPendingLinkRequests).mockResolvedValue([REQUEST])

    await renderAuthenticatedAt('/school-admin/approvals/lr1?action=reject')

    expect(await screen.findByText('Reject this request?')).toBeInTheDocument()
  })

  it('"Cancel" returns to the default Approve/Reject choice', async () => {
    vi.mocked(approvalsApi.listPendingLinkRequests).mockResolvedValue([REQUEST])

    await renderAuthenticatedAt('/school-admin/approvals/lr1?action=reject')
    await screen.findByText('Reject this request?')

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))

    expect(await screen.findByRole('button', { name: /approve link/i })).toBeInTheDocument()
    expect(vi.mocked(approvalsApi.decideLinkRequest)).not.toHaveBeenCalled()
  })
})
