import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
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

describe('StudentStatusScreen (Sc032StudentStatus)', () => {
  it('shows the deactivate confirmation for an active student', async () => {
    vi.mocked(studentsApi.getStudent).mockResolvedValue(ACTIVE_STUDENT)

    await renderAuthenticatedAt('/school-admin/students/s1/status')

    expect(await screen.findByText('Deactivate Liam Carter?')).toBeInTheDocument()
    expect(
      screen.getByText(/guardians will be notified by email/i),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /deactivate & email/i })).toBeInTheDocument()
  })

  it('shows the reactivate confirmation for an inactive student', async () => {
    vi.mocked(studentsApi.getStudent).mockResolvedValue({ ...ACTIVE_STUDENT, is_active: false })

    await renderAuthenticatedAt('/school-admin/students/s1/status')

    expect(await screen.findByText('Reactivate Liam Carter?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reactivate & email/i })).toBeInTheDocument()
  })

  it('confirming deactivate calls the API with is_active=false and navigates back to the detail screen', async () => {
    vi.mocked(studentsApi.getStudent).mockResolvedValue(ACTIVE_STUDENT)
    vi.mocked(studentsApi.setStudentStatus).mockResolvedValue({
      ...ACTIVE_STUDENT,
      is_active: false,
    })
    vi.mocked(classesApi.listClasses).mockResolvedValue([])

    await renderAuthenticatedAt('/school-admin/students/s1/status')
    await screen.findByText('Deactivate Liam Carter?')

    fireEvent.click(screen.getByRole('button', { name: /deactivate & email/i }))

    await waitFor(() =>
      expect(vi.mocked(studentsApi.setStudentStatus)).toHaveBeenCalledWith('s1', false),
    )
    expect(await screen.findByText('Liam Carter')).toBeInTheDocument()
  })

  it('Cancel returns to the detail screen without changing status', async () => {
    vi.mocked(studentsApi.getStudent).mockResolvedValue(ACTIVE_STUDENT)
    vi.mocked(classesApi.listClasses).mockResolvedValue([])

    await renderAuthenticatedAt('/school-admin/students/s1/status')
    await screen.findByText('Deactivate Liam Carter?')

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))

    expect(await screen.findByText('Liam Carter')).toBeInTheDocument()
    expect(vi.mocked(studentsApi.setStudentStatus)).not.toHaveBeenCalled()
  })

  it('shows an error banner when the status change fails', async () => {
    vi.mocked(studentsApi.getStudent).mockResolvedValue(ACTIVE_STUDENT)
    vi.mocked(studentsApi.setStudentStatus).mockRejectedValue(new Error('Network Error'))

    await renderAuthenticatedAt('/school-admin/students/s1/status')
    await screen.findByText('Deactivate Liam Carter?')

    fireEvent.click(screen.getByRole('button', { name: /deactivate & email/i }))

    expect(
      await screen.findByText('Something went wrong. Please check your connection and try again.'),
    ).toBeInTheDocument()
  })

  it('shows an error banner when the student cannot be found', async () => {
    vi.mocked(studentsApi.getStudent).mockRejectedValue(new Error('Network Error'))

    await renderAuthenticatedAt('/school-admin/students/s1/status')

    expect(
      await screen.findByText('Something went wrong. Please check your connection and try again.'),
    ).toBeInTheDocument()
  })
})
