import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthContext'
import * as authApi from '@/features/auth/api'
import * as classesApi from '@/features/classes/api'
import * as permissionsApi from '@/features/permissions/api'
import * as studentsApi from '@/features/students/api'
import type { UserSummary } from '@/features/auth/api'
import { StudentAuthProvider } from '@/features/student-auth/StudentAuthContext'
import { routes } from './index'

vi.mock('@/features/auth/api')
vi.mock('@/features/classes/api')
vi.mock('@/features/permissions/api')
vi.mock('@/features/students/api')

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

const NOAH = {
  student_pk: 'p1',
  student_name: 'Noah Thompson',
  class_name: 'Class 1A',
  student_id: 'S-abc123',
  temp_password: 'Temp12345!',
}

describe('StudentCredentialsScreen (Sc033Credentials)', () => {
  it('renders each credential row', async () => {
    vi.mocked(studentsApi.listCredentials).mockResolvedValue([NOAH])

    await renderAuthenticatedAt('/school-admin/students/credentials')

    expect(await screen.findByText('Noah Thompson')).toBeInTheDocument()
    expect(screen.getByText('Class 1A')).toBeInTheDocument()
    expect(screen.getByText('S-abc123')).toBeInTheDocument()
    expect(screen.getByText('Temp12345!')).toBeInTheDocument()
  })

  it('the Export button is disabled when there are no credentials', async () => {
    vi.mocked(studentsApi.listCredentials).mockResolvedValue([])

    await renderAuthenticatedAt('/school-admin/students/credentials')
    await screen.findByText('Student credentials')

    expect(screen.getByRole('button', { name: /export/i })).toBeDisabled()
  })

  it('exports and shows a success banner counting the rows in the downloaded CSV, not the stale in-memory list', async () => {
    // Round 1 review finding (Major): the banner previously used the
    // in-memory `credentials.length` from page load, not the actual
    // export content. Mocking the CSV blob with a DIFFERENT row count
    // (2 data rows) than the in-memory list (1 credential) proves the
    // banner now derives its count from the download itself.
    vi.mocked(studentsApi.listCredentials).mockResolvedValue([NOAH])
    const csv = 'Student,Student ID,Class,Temporary password\nNoah Thompson,S-abc123,Class 1A,Temp12345!\nAda Lovelace,S-def456,Class 1A,Temp67890!\n'
    vi.mocked(studentsApi.exportCredentials).mockResolvedValue(new Blob([csv], { type: 'text/csv' }))
    // jsdom has no real object-URL support
    window.URL.createObjectURL = vi.fn(() => 'blob:mock')
    window.URL.revokeObjectURL = vi.fn()

    await renderAuthenticatedAt('/school-admin/students/credentials')
    await screen.findByText('Noah Thompson')

    fireEvent.click(screen.getByRole('button', { name: /export/i }))

    expect(
      await screen.findByText('Exported 2 credentials as a CSV. Keep it secure and delete it after handout.'),
    ).toBeInTheDocument()
  })

  it('shows an error banner when the export call fails', async () => {
    vi.mocked(studentsApi.listCredentials).mockResolvedValue([NOAH])
    vi.mocked(studentsApi.exportCredentials).mockRejectedValue(new Error('Network Error'))

    await renderAuthenticatedAt('/school-admin/students/credentials')
    await screen.findByText('Noah Thompson')

    fireEvent.click(screen.getByRole('button', { name: /export/i }))

    expect(
      await screen.findByText('Something went wrong. Please check your connection and try again.'),
    ).toBeInTheDocument()
  })

  it('shows a load-error state when the list call fails', async () => {
    vi.mocked(studentsApi.listCredentials).mockRejectedValue(new Error('Network Error'))

    await renderAuthenticatedAt('/school-admin/students/credentials')

    expect(
      await screen.findByText('Something went wrong. Please check your connection and try again.'),
    ).toBeInTheDocument()
  })

  it('the "Credentials" button on the students list navigates here', async () => {
    vi.mocked(studentsApi.listStudents).mockResolvedValue({
      data: [],
      meta: { page: 1, page_size: 20, total: 0, total_pages: 0 },
    })
    vi.mocked(classesApi.listClasses).mockResolvedValue([])
    vi.mocked(studentsApi.listCredentials).mockResolvedValue([])

    await renderAuthenticatedAt('/school-admin/students')
    await screen.findByRole('heading', { name: 'Students' })

    fireEvent.click(screen.getByRole('button', { name: /credentials/i }))

    expect(await screen.findByText('Student credentials')).toBeInTheDocument()
  })
})
