import { fireEvent, render, screen, waitFor, within, act } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthContext'
import * as authApi from '@/features/auth/api'
import * as usersApi from '@/features/users/api'
import { StudentAuthProvider } from '@/features/student-auth/StudentAuthContext'
import { routes } from './index'

vi.mock('@/features/auth/api')
vi.mock('@/features/users/api')

const PLATFORM_ADMIN_USER = {
  id: 'u1',
  full_name: 'Alex Morgan',
  email: 'alex@example.com',
  role: 'platform_admin' as const,
  school_id: null,
  school_name: null,
}

const TARGET_USER: usersApi.PlatformUser = {
  id: 'u10',
  full_name: 'Priya Nair',
  email: 'priya@greenvale.edu.au',
  role: 'school_admin',
  school_id: 'sch1',
  school_name: 'Greenvale Primary',
  is_active: true,
}

async function renderAt(path: string) {
  vi.mocked(authApi.login).mockResolvedValue({
    access_token: 'a-real-jwt',
    token_type: 'bearer',
    user: PLATFORM_ADMIN_USER,
  })
  const router = createMemoryRouter(routes, { initialEntries: ['/login'] })
  render(
    <AuthProvider>
      <StudentAuthProvider>
        <RouterProvider router={router} />
      </StudentAuthProvider>
    </AuthProvider>,
  )
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'alex@example.com' } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'whatever' } })
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
  await waitFor(() => expect(screen.getByText(/Dashboard coming soon/)).toBeInTheDocument())
  await act(async () => {
    await router.navigate(path)
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('UserDetailScreen', () => {
  it('loads and shows the user details', async () => {
    vi.mocked(usersApi.getUser).mockResolvedValue(TARGET_USER)

    await renderAt('/platform-admin/users/u10')

    expect(await screen.findByText('Priya Nair')).toBeInTheDocument()
    expect(screen.getByText('School Admin · Greenvale Primary')).toBeInTheDocument()
    expect(screen.getByText('priya@greenvale.edu.au')).toBeInTheDocument()
    expect(usersApi.getUser).toHaveBeenCalledWith('u10')
  })

  it('a parent with no school shows a dash', async () => {
    vi.mocked(usersApi.getUser).mockResolvedValue({
      ...TARGET_USER,
      role: 'parent',
      school_id: null,
      school_name: null,
    })

    await renderAt('/platform-admin/users/u10')

    expect(await screen.findByText('Parent · —')).toBeInTheDocument()
  })

  it('shows an error state when the load fails', async () => {
    vi.mocked(usersApi.getUser).mockRejectedValue(new Error('Network Error'))

    await renderAt('/platform-admin/users/u10')

    expect(
      await screen.findByText('Something went wrong. Please check your connection and try again.'),
    ).toBeInTheDocument()
  })

  it('deactivates the user after confirming the dialog (Scenario 2)', async () => {
    vi.mocked(usersApi.getUser).mockResolvedValue(TARGET_USER)
    vi.mocked(usersApi.setUserStatus).mockResolvedValue({ ...TARGET_USER, is_active: false })

    await renderAt('/platform-admin/users/u10')
    await screen.findByText('Priya Nair')

    fireEvent.click(screen.getByRole('button', { name: 'Deactivate user' }))
    expect(
      await screen.findByText(/signs Priya Nair out of all devices/),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Deactivate & email' }))

    await waitFor(() => expect(usersApi.setUserStatus).toHaveBeenCalledWith('u10', false))
    expect(await screen.findByText('Deactivated')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reactivate user' })).toBeInTheDocument()
  })

  it('cancelling the deactivate dialog does not call the API', async () => {
    vi.mocked(usersApi.getUser).mockResolvedValue(TARGET_USER)

    await renderAt('/platform-admin/users/u10')
    await screen.findByText('Priya Nair')

    fireEvent.click(screen.getByRole('button', { name: 'Deactivate user' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(usersApi.setUserStatus).not.toHaveBeenCalled()
  })

  it('reactivates a deactivated user directly, no dialog (Scenario 3)', async () => {
    vi.mocked(usersApi.getUser).mockResolvedValue({ ...TARGET_USER, is_active: false })
    vi.mocked(usersApi.setUserStatus).mockResolvedValue({ ...TARGET_USER, is_active: true })

    await renderAt('/platform-admin/users/u10')
    await screen.findByText('Priya Nair')

    fireEvent.click(screen.getByRole('button', { name: 'Reactivate user' }))

    await waitFor(() => expect(usersApi.setUserStatus).toHaveBeenCalledWith('u10', true))
    expect(await screen.findByText('Active')).toBeInTheDocument()
  })

  it('shows the error INSIDE the still-open dialog when deactivation fails (FR-008\'s own review-fixed pattern)', async () => {
    vi.mocked(usersApi.getUser).mockResolvedValue(TARGET_USER)
    vi.mocked(usersApi.setUserStatus).mockRejectedValue({
      response: { data: { errors: 'This user is already in that status.' } },
    })

    await renderAt('/platform-admin/users/u10')
    await screen.findByText('Priya Nair')

    fireEvent.click(screen.getByRole('button', { name: 'Deactivate user' }))
    fireEvent.click(screen.getByRole('button', { name: 'Deactivate & email' }))

    const dialog = await screen.findByRole('dialog')
    expect(
      await within(dialog).findByText('This user is already in that status.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('clears the error when the dialog is cancelled after a failed deactivation', async () => {
    vi.mocked(usersApi.getUser).mockResolvedValue(TARGET_USER)
    vi.mocked(usersApi.setUserStatus).mockRejectedValue({
      response: { data: { errors: 'This user is already in that status.' } },
    })

    await renderAt('/platform-admin/users/u10')
    await screen.findByText('Priya Nair')

    fireEvent.click(screen.getByRole('button', { name: 'Deactivate user' }))
    fireEvent.click(screen.getByRole('button', { name: 'Deactivate & email' }))
    await screen.findByText('This user is already in that status.')

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByText('This user is already in that status.')).not.toBeInTheDocument()
  })
})
