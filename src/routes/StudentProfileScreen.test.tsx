import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthContext'
import { StudentAuthProvider } from '@/features/student-auth/StudentAuthContext'
import * as studentAuthApi from '@/features/student-auth/api'
import * as studentProfileApi from '@/features/student-profile/api'
import { routes } from './index'

vi.mock('@/features/student-auth/api')
vi.mock('@/features/student-profile/api')

const STUDENT = {
  id: 's1',
  full_name: 'Noah Thompson',
  student_id: 'S-40231',
  school_id: 'sch1',
}

const PROFILE = {
  id: 's1',
  full_name: 'Noah Thompson',
  student_id: 'S-40231',
  class_label: 'Year 4 - Room 4B',
}

async function renderAuthenticatedAt(
  path: string,
  options: { getProfileMock?: () => Promise<studentProfileApi.StudentProfile> } = {},
) {
  vi.mocked(studentAuthApi.login).mockResolvedValue({
    access_token: 'a-real-jwt',
    token_type: 'bearer',
    student: STUDENT,
  })
  vi.mocked(studentProfileApi.getStudentProfile).mockImplementation(
    options.getProfileMock ?? (() => Promise.resolve(PROFILE)),
  )

  const router = createMemoryRouter(routes, { initialEntries: ['/student-login'] })
  render(
    <AuthProvider>
      <StudentAuthProvider>
        <RouterProvider router={router} />
      </StudentAuthProvider>
    </AuthProvider>,
  )
  fireEvent.change(screen.getByLabelText('Student ID'), { target: { value: 'S-40231' } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'CorrectHorseBattery9!' } })
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
  await waitFor(() => expect(screen.getByText(/grab your usual in a tap/i)).toBeInTheDocument())

  await act(async () => {
    await router.navigate(path)
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('StudentProfileScreen', () => {
  it('shows the read-only profile fields once loaded', async () => {
    await renderAuthenticatedAt('/student/profile')

    expect(await screen.findByText('S-40231')).toBeInTheDocument()
    expect(screen.getByText('Year 4 - Room 4B')).toBeInTheDocument()
    expect(
      screen.getByText(/your name, class and student id are managed by your school/i),
    ).toBeInTheDocument()
  })

  it('has no Edit affordance anywhere on the screen', async () => {
    await renderAuthenticatedAt('/student/profile')
    await screen.findByText('S-40231')

    expect(screen.queryByRole('button', { name: /^edit$/i })).not.toBeInTheDocument()
  })

  it('shows a connectivity error if the profile fails to load', async () => {
    await renderAuthenticatedAt('/student/profile', {
      getProfileMock: () => Promise.reject(new Error('Network Error')),
    })

    expect(
      await screen.findByText('Something went wrong. Please check your connection and try again.'),
    ).toBeInTheDocument()
  })

  it('changes the password and shows a success confirmation', async () => {
    vi.mocked(studentProfileApi.changeStudentPassword).mockResolvedValue({
      message: 'Your password has been changed.',
    })
    await renderAuthenticatedAt('/student/profile')
    await screen.findByText('S-40231')

    fireEvent.click(screen.getByRole('button', { name: /^change$/i }))
    fireEvent.change(screen.getByLabelText('Current password'), { target: { value: 'OldPass9!' } })
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'NewPass9!' } })
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'NewPass9!' } })
    fireEvent.click(screen.getByRole('button', { name: /save password/i }))

    expect(await screen.findByText('Your password has been changed.')).toBeInTheDocument()
    expect(studentProfileApi.changeStudentPassword).toHaveBeenCalledWith(
      'OldPass9!', 'NewPass9!', 'NewPass9!',
    )
  })

  it('shows an inline error on a wrong current password (401), not a session-expiry redirect', async () => {
    vi.mocked(studentProfileApi.changeStudentPassword).mockRejectedValue({
      response: { status: 401, data: { errors: 'Your current password is incorrect.' } },
    })
    await renderAuthenticatedAt('/student/profile')
    await screen.findByText('S-40231')

    fireEvent.click(screen.getByRole('button', { name: /^change$/i }))
    fireEvent.change(screen.getByLabelText('Current password'), { target: { value: 'Wrong9!' } })
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'NewPass9!' } })
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'NewPass9!' } })
    fireEvent.click(screen.getByRole('button', { name: /save password/i }))

    expect(await screen.findByText('Your current password is incorrect.')).toBeInTheDocument()
    expect(screen.getByLabelText('Current password')).toBeInTheDocument()
  })
})
