import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthContext'
import * as authApi from '@/features/auth/api'
import * as notificationsApi from '@/features/notifications/api'
import { StudentAuthProvider } from '@/features/student-auth/StudentAuthContext'
import * as studentAuthApi from '@/features/student-auth/api'
import { routes } from './index'

vi.mock('@/features/auth/api')
vi.mock('@/features/student-auth/api')
vi.mock('@/features/notifications/api')

const PARENT_USER = {
  id: 'u1',
  full_name: 'Sarah Thompson',
  email: 'sarah@example.com',
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

async function renderAsStudentAt(path: string) {
  vi.mocked(studentAuthApi.login).mockResolvedValue({
    access_token: 'a-real-jwt',
    token_type: 'bearer',
    student: { id: 's1', full_name: 'Noah Thompson', student_id: 'S-41880', school_id: 'sc1' },
  })
  const router = createMemoryRouter(routes, { initialEntries: ['/student-login'] })
  render(
    <AuthProvider>
      <StudentAuthProvider>
        <RouterProvider router={router} />
      </StudentAuthProvider>
    </AuthProvider>,
  )
  fireEvent.change(screen.getByLabelText('Student ID'), { target: { value: 'S-41880' } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'whatever' } })
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
  await waitFor(() => expect(screen.getByText(/grab your usual in a tap/i)).toBeInTheDocument())
  await act(async () => {
    await router.navigate(path)
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('InboxScreen (FR-044)', () => {
  it('shows the empty state when the recipient has no notifications', async () => {
    vi.mocked(notificationsApi.listMyNotifications).mockResolvedValue([])

    await renderAuthenticatedAt('/parent/inbox')

    expect(await screen.findByText("You're all caught up")).toBeInTheDocument()
  })

  it("lists a parent's own delivered notifications", async () => {
    vi.mocked(notificationsApi.listMyNotifications).mockResolvedValue([
      {
        notification_id: 'n1',
        title: 'Your child link request was approved',
        body: 'You now have access.',
        source: 'system',
        created_at: '2026-07-05T00:00:00Z',
        delivery_status: 'sent',
        delivered_at: '2026-07-05T00:00:01Z',
      },
    ])

    await renderAuthenticatedAt('/parent/inbox')

    expect(await screen.findByText('Your child link request was approved')).toBeInTheDocument()
    expect(screen.getByText('You now have access.')).toBeInTheDocument()
  })

  it('a student sees their own inbox at /student/inbox', async () => {
    vi.mocked(notificationsApi.listMyNotifications).mockResolvedValue([
      {
        notification_id: 'n2',
        title: 'Canteen closes early today',
        body: 'The canteen closes at 1pm today.',
        source: 'manual',
        created_at: '2026-07-05T00:00:00Z',
        delivery_status: 'sent',
        delivered_at: '2026-07-05T00:00:01Z',
      },
    ])

    await renderAsStudentAt('/student/inbox')

    expect(await screen.findByText('Canteen closes early today')).toBeInTheDocument()
  })

  it('does not render any "unread" indicator or "Mark all read" control (no backing schema field)', async () => {
    vi.mocked(notificationsApi.listMyNotifications).mockResolvedValue([
      {
        notification_id: 'n1',
        title: 'Hello',
        body: 'World',
        source: 'manual',
        created_at: '2026-07-05T00:00:00Z',
        delivery_status: 'sent',
        delivered_at: '2026-07-05T00:00:01Z',
      },
    ])

    await renderAuthenticatedAt('/parent/inbox')
    await screen.findByText('Hello')

    expect(screen.queryByRole('button', { name: /mark all read/i })).not.toBeInTheDocument()
  })

  it("shows the real caller's own name and role in the sidebar (round-2 review, Minor finding — was hardcoded blank)", async () => {
    vi.mocked(notificationsApi.listMyNotifications).mockResolvedValue([])

    await renderAuthenticatedAt('/parent/inbox')
    await screen.findByText("You're all caught up")

    expect(screen.getByText('Sarah Thompson')).toBeInTheDocument()
    expect(screen.getByText('Parent')).toBeInTheDocument()
  })

  it('shows an error state when the inbox fails to load', async () => {
    vi.mocked(notificationsApi.listMyNotifications).mockRejectedValue({ response: undefined })

    await renderAuthenticatedAt('/parent/inbox')

    expect(
      await screen.findByText('Something went wrong. Please check your connection and try again.'),
    ).toBeInTheDocument()
  })
})
