import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthContext'
import * as authApi from '@/features/auth/api'
import * as classesApi from '@/features/classes/api'
import * as studentsApi from '@/features/students/api'
import { StudentAuthProvider } from '@/features/student-auth/StudentAuthContext'
import { routes } from './index'

vi.mock('@/features/auth/api')
vi.mock('@/features/classes/api')
vi.mock('@/features/students/api')

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
  const router = createMemoryRouter(routes, { initialEntries: ['/login'] })
  render(
    <AuthProvider>
      <StudentAuthProvider>
        <RouterProvider router={router} />
      </StudentAuthProvider>
    </AuthProvider>,
  )
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'priya@example.com' } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'whatever' } })
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
  await waitFor(() => expect(screen.getByText(/Good morning/)).toBeInTheDocument())

  await act(async () => {
    await router.navigate(path)
  })
}

beforeEach(() => {
  // jsdom does not implement navigator.clipboard (same class of gap as
  // Blob.prototype.text(), found and worked around in FR-013).
  Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })
})

afterEach(() => {
  vi.restoreAllMocks()
})

const ACTIVE_STUDENT: studentsApi.Student = {
  id: 's1',
  student_id: 'S-40231',
  full_name: 'Liam Carter',
  class_id: 'c1',
  is_active: true,
}

describe('StudentResetCredentialScreen (Sc099ResetCredential)', () => {
  it('shows the reset confirmation for an active student', async () => {
    vi.mocked(studentsApi.getStudent).mockResolvedValue(ACTIVE_STUDENT)

    await renderAuthenticatedAt('/school-admin/students/s1/reset-credential')

    expect(await screen.findByText('Reset Liam Carter’s password?')).toBeInTheDocument()
    expect(screen.getByText(/stops working immediately/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument()
  })

  it('confirming shows the new one-time temporary password', async () => {
    vi.mocked(studentsApi.getStudent).mockResolvedValue(ACTIVE_STUDENT)
    vi.mocked(studentsApi.resetCredential).mockResolvedValue({
      ...ACTIVE_STUDENT,
      temp_password: 'Gv2-pw6n',
    })

    await renderAuthenticatedAt('/school-admin/students/s1/reset-credential')
    await screen.findByText('Reset Liam Carter’s password?')

    fireEvent.click(screen.getByRole('button', { name: /reset password/i }))

    await waitFor(() => expect(vi.mocked(studentsApi.resetCredential)).toHaveBeenCalledWith('s1'))
    expect(await screen.findByText('Password reset')).toBeInTheDocument()
    expect(screen.getByText('Gv2-pw6n')).toBeInTheDocument()
    expect(screen.queryByText('Reset Liam Carter’s password?')).not.toBeInTheDocument()
  })

  it('"Copy password" copies the new temp password to the clipboard', async () => {
    vi.mocked(studentsApi.getStudent).mockResolvedValue(ACTIVE_STUDENT)
    vi.mocked(studentsApi.resetCredential).mockResolvedValue({
      ...ACTIVE_STUDENT,
      temp_password: 'Gv2-pw6n',
    })

    await renderAuthenticatedAt('/school-admin/students/s1/reset-credential')
    await screen.findByText('Reset Liam Carter’s password?')
    fireEvent.click(screen.getByRole('button', { name: /reset password/i }))
    await screen.findByText('Password reset')

    fireEvent.click(screen.getByRole('button', { name: /copy password/i }))

    await waitFor(() =>
      expect(vi.mocked(navigator.clipboard.writeText)).toHaveBeenCalledWith('Gv2-pw6n'),
    )
    expect(await screen.findByRole('button', { name: /^copied$/i })).toBeInTheDocument()
  })

  it('Cancel returns to the detail screen without resetting', async () => {
    vi.mocked(studentsApi.getStudent).mockResolvedValue(ACTIVE_STUDENT)
    vi.mocked(classesApi.listClasses).mockResolvedValue([])

    await renderAuthenticatedAt('/school-admin/students/s1/reset-credential')
    await screen.findByText('Reset Liam Carter’s password?')

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))

    expect(await screen.findByText('Liam Carter')).toBeInTheDocument()
    expect(vi.mocked(studentsApi.resetCredential)).not.toHaveBeenCalled()
  })

  it('shows an error banner when the reset fails', async () => {
    vi.mocked(studentsApi.getStudent).mockResolvedValue(ACTIVE_STUDENT)
    vi.mocked(studentsApi.resetCredential).mockRejectedValue(new Error('Network Error'))

    await renderAuthenticatedAt('/school-admin/students/s1/reset-credential')
    await screen.findByText('Reset Liam Carter’s password?')

    fireEvent.click(screen.getByRole('button', { name: /reset password/i }))

    expect(
      await screen.findByText('Something went wrong. Please check your connection and try again.'),
    ).toBeInTheDocument()
  })

  it('shows a clear message instead of a submittable confirm for an already-inactive student', async () => {
    vi.mocked(studentsApi.getStudent).mockResolvedValue({ ...ACTIVE_STUDENT, is_active: false })

    await renderAuthenticatedAt('/school-admin/students/s1/reset-credential')

    expect(
      await screen.findByText('This student is deactivated. Reactivate them before resetting their credential.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Reset Liam Carter’s password?')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /reset password/i })).not.toBeInTheDocument()
  })

  it('shows an error banner when the student cannot be found', async () => {
    vi.mocked(studentsApi.getStudent).mockRejectedValue(new Error('Network Error'))

    await renderAuthenticatedAt('/school-admin/students/s1/reset-credential')

    expect(
      await screen.findByText('Something went wrong. Please check your connection and try again.'),
    ).toBeInTheDocument()
  })
})
