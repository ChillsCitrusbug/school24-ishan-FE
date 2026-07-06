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
vi.mock('@/features/student-auth/api')
vi.mock('@/features/notifications/api')
vi.mock('@/features/permissions/api')

const SCHOOL_ADMIN_USER = {
  id: 'u1',
  full_name: 'Ada Lovelace',
  email: 'ada@example.com',
  role: 'school_admin' as const,
  school_id: 'sc1',
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

describe('SentLogScreen (FR-052)', () => {
  it('shows the empty state before anything has been sent', async () => {
    vi.mocked(notificationsApi.listNotifications).mockResolvedValue({
      data: [],
      meta: { page: 1, page_size: 20, total: 0, total_pages: 0 },
    })

    await renderAuthenticatedAt('/school-admin/notifications')

    expect(await screen.findByText('No notifications sent yet')).toBeInTheDocument()
  })

  it('lists a sent notification with title, recipients, sender, source, and delivery outcome', async () => {
    vi.mocked(notificationsApi.listNotifications).mockResolvedValue({
      data: [
        {
          id: 'n1',
          title: 'Canteen closed Friday',
          body: 'No lunch service this Friday.',
          source: 'manual',
          sender_name: 'Priya Nair',
          created_at: '2026-07-06T00:00:00Z',
          target_roles: ['parent', 'staff'],
          delivery_outcome: { pending: 0, sent: 2, failed: 0 },
        },
      ],
      meta: { page: 1, page_size: 20, total: 1, total_pages: 1 },
    })

    await renderAuthenticatedAt('/school-admin/notifications')

    expect(await screen.findByText('Canteen closed Friday')).toBeInTheDocument()
    expect(screen.getByText('Priya Nair')).toBeInTheDocument()
    expect(screen.getByText('Parents, Staff')).toBeInTheDocument()
    expect(screen.getByText('Manual')).toBeInTheDocument()
    expect(screen.getByText('Delivered')).toBeInTheDocument()
  })

  it('labels a system-sourced notification distinctly from a manually-sent one', async () => {
    vi.mocked(notificationsApi.listNotifications).mockResolvedValue({
      data: [
        {
          id: 'n1',
          title: 'Your request was approved',
          body: 'System message',
          source: 'system',
          sender_name: 'Ada Lovelace',
          created_at: '2026-07-06T00:00:00Z',
          target_roles: ['parent'],
          delivery_outcome: { pending: 0, sent: 1, failed: 0 },
        },
      ],
      meta: { page: 1, page_size: 20, total: 1, total_pages: 1 },
    })

    await renderAuthenticatedAt('/school-admin/notifications')

    expect(await screen.findByText('System')).toBeInTheDocument()
  })

  it('shows a failed-delivery outcome distinctly', async () => {
    vi.mocked(notificationsApi.listNotifications).mockResolvedValue({
      data: [
        {
          id: 'n1',
          title: 'Canteen closed Friday',
          body: 'No lunch service this Friday.',
          source: 'manual',
          sender_name: 'Ada Lovelace',
          created_at: '2026-07-06T00:00:00Z',
          target_roles: ['staff'],
          delivery_outcome: { pending: 0, sent: 0, failed: 1 },
        },
      ],
      meta: { page: 1, page_size: 20, total: 1, total_pages: 1 },
    })

    await renderAuthenticatedAt('/school-admin/notifications')

    expect(await screen.findByText('1 failed')).toBeInTheDocument()
  })

  it('shows "No recipients" when a notification\'s target roles resolved to zero real recipients', async () => {
    // Round-3 review, Minor finding: the same class of gap round 1 fixed
    // for "Delivering…" — the all-zero-counts branch had no test.
    vi.mocked(notificationsApi.listNotifications).mockResolvedValue({
      data: [
        {
          id: 'n1',
          title: 'Canteen closed Friday',
          body: 'No lunch service this Friday.',
          source: 'manual',
          sender_name: 'Ada Lovelace',
          created_at: '2026-07-06T00:00:00Z',
          target_roles: ['staff'],
          delivery_outcome: { pending: 0, sent: 0, failed: 0 },
        },
      ],
      meta: { page: 1, page_size: 20, total: 1, total_pages: 1 },
    })

    await renderAuthenticatedAt('/school-admin/notifications')

    expect(await screen.findByText('No recipients')).toBeInTheDocument()
  })

  it('shows "Delivering…" (not a false "Delivered") when some recipients are still pending', async () => {
    // Round-1 review, Minor finding: the failed > pending > sent
    // precedence was correct by inspection but untested for the case
    // that matters most — some already sent, some still pending must
    // never be masked behind a falsely-reassuring "Delivered".
    vi.mocked(notificationsApi.listNotifications).mockResolvedValue({
      data: [
        {
          id: 'n1',
          title: 'Canteen closed Friday',
          body: 'No lunch service this Friday.',
          source: 'manual',
          sender_name: 'Ada Lovelace',
          created_at: '2026-07-06T00:00:00Z',
          target_roles: ['staff'],
          delivery_outcome: { pending: 1, sent: 1, failed: 0 },
        },
      ],
      meta: { page: 1, page_size: 20, total: 1, total_pages: 1 },
    })

    await renderAuthenticatedAt('/school-admin/notifications')

    expect(await screen.findByText('Delivering…')).toBeInTheDocument()
    expect(screen.queryByText('Delivered')).not.toBeInTheDocument()
  })

  it('expands a row to show the full message body ("View row details")', async () => {
    vi.mocked(notificationsApi.listNotifications).mockResolvedValue({
      data: [
        {
          id: 'n1',
          title: 'Canteen closed Friday',
          body: 'No lunch service this Friday.',
          source: 'manual',
          sender_name: 'Ada Lovelace',
          created_at: '2026-07-06T00:00:00Z',
          target_roles: ['staff'],
          delivery_outcome: { pending: 0, sent: 1, failed: 0 },
        },
      ],
      meta: { page: 1, page_size: 20, total: 1, total_pages: 1 },
    })

    await renderAuthenticatedAt('/school-admin/notifications')
    await screen.findByText('Canteen closed Friday')

    expect(screen.queryByText('No lunch service this Friday.')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /view details/i }))

    expect(await screen.findByText('No lunch service this Friday.')).toBeInTheDocument()
  })

  it('does not render any compose/send/retry action inside a row (read-only log)', async () => {
    vi.mocked(notificationsApi.listNotifications).mockResolvedValue({
      data: [
        {
          id: 'n1',
          title: 'Canteen closed Friday',
          body: 'No lunch service this Friday.',
          source: 'manual',
          sender_name: 'Ada Lovelace',
          created_at: '2026-07-06T00:00:00Z',
          target_roles: ['staff'],
          delivery_outcome: { pending: 0, sent: 0, failed: 1 },
        },
      ],
      meta: { page: 1, page_size: 20, total: 1, total_pages: 1 },
    })

    await renderAuthenticatedAt('/school-admin/notifications')
    await screen.findByText('Canteen closed Friday')

    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument()
  })

  it('shows a screen-level Compose button that only navigates (not an inline send/retry action)', async () => {
    // Round-2 review, Major finding: the ticket's own DoD ("no compose/
    // send/retry actions exposed on this screen") could be read as
    // banning this button outright, but the approved design mock
    // already has it, and clicking it only navigates to the separate
    // compose screen — nothing is sent/retried from the log itself.
    // Asked the user directly; resolved to keep it (field-reconciliation
    // decision #5). This test makes that choice explicit and testable,
    // closing the "never verified either way" gap round 2 found.
    vi.mocked(notificationsApi.listNotifications).mockResolvedValue({
      data: [
        {
          id: 'n1',
          title: 'Canteen closed Friday',
          body: 'No lunch service this Friday.',
          source: 'manual',
          sender_name: 'Ada Lovelace',
          created_at: '2026-07-06T00:00:00Z',
          target_roles: ['staff'],
          delivery_outcome: { pending: 0, sent: 1, failed: 0 },
        },
      ],
      meta: { page: 1, page_size: 20, total: 1, total_pages: 1 },
    })

    await renderAuthenticatedAt('/school-admin/notifications')
    await screen.findByText('Canteen closed Friday')

    const composeButton = screen.getByRole('button', { name: /^compose$/i })
    expect(composeButton).toBeInTheDocument()
    fireEvent.click(composeButton)
    await waitFor(() => expect(screen.getByText('Send a notification')).toBeInTheDocument())
  })

  it('shows an error state when the log fails to load', async () => {
    vi.mocked(notificationsApi.listNotifications).mockRejectedValue({ response: undefined })

    await renderAuthenticatedAt('/school-admin/notifications')

    expect(
      await screen.findByText('Something went wrong. Please check your connection and try again.'),
    ).toBeInTheDocument()
  })
})
