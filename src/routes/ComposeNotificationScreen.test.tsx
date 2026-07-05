import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthContext'
import * as authApi from '@/features/auth/api'
import * as notificationsApi from '@/features/notifications/api'
import * as permissionsApi from '@/features/permissions/api'
import type { UserSummary } from '@/features/auth/api'
import { StudentAuthProvider } from '@/features/student-auth/StudentAuthContext'
import { routes } from './index'

vi.mock('@/features/auth/api')
vi.mock('@/features/notifications/api')
vi.mock('@/features/permissions/api')

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

describe('ComposeNotificationScreen (Sc088Compose)', () => {
  it('the send button is disabled until a title, message, and at least one role are all present', async () => {
    await renderAuthenticatedAt('/school-admin/notifications/new')
    await screen.findByText('Send a notification')

    const sendButton = screen.getByRole('button', { name: /send notification/i })
    expect(sendButton).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Canteen closed' } })
    expect(sendButton).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Closed Friday.' } })
    expect(sendButton).toBeDisabled()

    fireEvent.click(screen.getByRole('checkbox', { name: 'Staff' }))
    expect(sendButton).toBeEnabled()
  })

  it('shows the zero-recipients warning when no role is selected', async () => {
    await renderAuthenticatedAt('/school-admin/notifications/new')
    await screen.findByText('Send a notification')

    expect(
      screen.getByText('Select at least one recipient group to send.'),
    ).toBeInTheDocument()
  })

  it('composes a notification with the selected roles and navigates away on success', async () => {
    vi.mocked(notificationsApi.composeNotification).mockResolvedValue({
      id: 'n1',
      title: 'Canteen closed',
      body: 'Closed Friday.',
      source: 'manual',
      sender_user_id: 'u1',
      created_at: '2026-07-05T00:00:00Z',
      target_roles: ['staff', 'parent'],
    })

    await renderAuthenticatedAt('/school-admin/notifications/new')
    await screen.findByText('Send a notification')

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Canteen closed' } })
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Closed Friday.' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Parents' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Staff' }))
    fireEvent.click(screen.getByRole('button', { name: /send notification/i }))

    await waitFor(() =>
      expect(vi.mocked(notificationsApi.composeNotification)).toHaveBeenCalledWith({
        title: 'Canteen closed',
        body: 'Closed Friday.',
        target_roles: ['parent', 'staff'],
      }),
    )
    await waitFor(() => expect(screen.queryByText('Send a notification')).not.toBeInTheDocument())
  })

  it('shows an error banner when the send call fails', async () => {
    vi.mocked(notificationsApi.composeNotification).mockRejectedValue(new Error('Network Error'))

    await renderAuthenticatedAt('/school-admin/notifications/new')
    await screen.findByText('Send a notification')

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Canteen closed' } })
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Closed Friday.' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Staff' }))
    fireEvent.click(screen.getByRole('button', { name: /send notification/i }))

    expect(
      await screen.findByText('Something went wrong. Please check your connection and try again.'),
    ).toBeInTheDocument()
  })
})
