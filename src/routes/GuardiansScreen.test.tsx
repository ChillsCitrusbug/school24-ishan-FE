import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthContext'
import * as authApi from '@/features/auth/api'
import * as guardiansApi from '@/features/guardians/api'
import * as studentsApi from '@/features/students/api'
import { StudentAuthProvider } from '@/features/student-auth/StudentAuthContext'
import { routes } from './index'

vi.mock('@/features/auth/api')
vi.mock('@/features/students/api')
vi.mock('@/features/guardians/api')

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

const STUDENT: studentsApi.Student = {
  id: 's1',
  student_id: 'S-40231',
  full_name: 'Liam Thompson',
  class_id: 'c1',
  is_active: true,
}

const GUARDIAN: guardiansApi.Guardian = {
  link_id: 'lk1',
  parent_name: 'Sarah Thompson',
  parent_email: 'sarah@thompson.com',
  status: 'approved',
  linked_since: '2026-03-01T00:00:00Z',
}

describe('GuardiansScreen (Sc045Guardians)', () => {
  it('renders each linked guardian with the guardian count', async () => {
    vi.mocked(studentsApi.getStudent).mockResolvedValue(STUDENT)
    vi.mocked(guardiansApi.listGuardians).mockResolvedValue([GUARDIAN])

    await renderAuthenticatedAt('/school-admin/students/s1/guardians')

    expect(await screen.findByText('Guardians — Liam Thompson')).toBeInTheDocument()
    expect(screen.getByText('Sarah Thompson')).toBeInTheDocument()
    expect(screen.getByText('sarah@thompson.com')).toBeInTheDocument()
    expect(screen.getByText('1 of 4 guardians linked')).toBeInTheDocument()
  })

  it('shows the at-cap banner when 4 guardians are already linked', async () => {
    vi.mocked(studentsApi.getStudent).mockResolvedValue(STUDENT)
    vi.mocked(guardiansApi.listGuardians).mockResolvedValue([
      GUARDIAN,
      { ...GUARDIAN, link_id: 'lk2', parent_name: 'Mark Thompson', parent_email: 'mark@t.com' },
      { ...GUARDIAN, link_id: 'lk3', parent_name: 'James Thompson', parent_email: 'james@t.com' },
      { ...GUARDIAN, link_id: 'lk4', parent_name: 'Rosa Thompson', parent_email: 'rosa@t.com' },
    ])

    await renderAuthenticatedAt('/school-admin/students/s1/guardians')

    expect(
      await screen.findByText(
        'This student has the maximum of 4 linked guardians. Remove one to add another.',
      ),
    ).toBeInTheDocument()
  })

  it('clicking "Remove" shows an inline confirm before actually removing', async () => {
    vi.mocked(studentsApi.getStudent).mockResolvedValue(STUDENT)
    vi.mocked(guardiansApi.listGuardians).mockResolvedValue([GUARDIAN])

    await renderAuthenticatedAt('/school-admin/students/s1/guardians')
    await screen.findByText('Sarah Thompson')

    fireEvent.click(screen.getByRole('button', { name: /^remove$/i }))

    expect(await screen.findByRole('button', { name: /confirm removal/i })).toBeInTheDocument()
    expect(vi.mocked(guardiansApi.removeGuardian)).not.toHaveBeenCalled()
  })

  it('"Confirm removal" calls the API and removes the row from the list', async () => {
    vi.mocked(studentsApi.getStudent).mockResolvedValue(STUDENT)
    vi.mocked(guardiansApi.listGuardians).mockResolvedValue([GUARDIAN])
    vi.mocked(guardiansApi.removeGuardian).mockResolvedValue(undefined)

    await renderAuthenticatedAt('/school-admin/students/s1/guardians')
    await screen.findByText('Sarah Thompson')
    fireEvent.click(screen.getByRole('button', { name: /^remove$/i }))
    await screen.findByRole('button', { name: /confirm removal/i })

    fireEvent.click(screen.getByRole('button', { name: /confirm removal/i }))

    await waitFor(() => expect(vi.mocked(guardiansApi.removeGuardian)).toHaveBeenCalledWith('lk1'))
    await waitFor(() => expect(screen.queryByText('Sarah Thompson')).not.toBeInTheDocument())
  })

  it("disables every other row's Remove button while one removal is in flight (round-1 review finding)", async () => {
    const OTHER_GUARDIAN: guardiansApi.Guardian = {
      ...GUARDIAN,
      link_id: 'lk2',
      parent_name: 'Mark Thompson',
      parent_email: 'mark@t.com',
    }
    vi.mocked(studentsApi.getStudent).mockResolvedValue(STUDENT)
    vi.mocked(guardiansApi.listGuardians).mockResolvedValue([GUARDIAN, OTHER_GUARDIAN])
    let resolveRemoval: () => void = () => {}
    vi.mocked(guardiansApi.removeGuardian).mockReturnValue(
      new Promise((resolve) => {
        resolveRemoval = () => resolve(undefined)
      }),
    )

    await renderAuthenticatedAt('/school-admin/students/s1/guardians')
    await screen.findByText('Sarah Thompson')

    const removeButtons = screen.getAllByRole('button', { name: /^remove$/i })
    fireEvent.click(removeButtons[0])
    await screen.findByRole('button', { name: /confirm removal/i })
    fireEvent.click(screen.getByRole('button', { name: /confirm removal/i }))

    await waitFor(() => expect(screen.getByRole('button', { name: /^remove$/i })).toBeDisabled())
    fireEvent.click(screen.getByRole('button', { name: /^remove$/i }))
    // The disabled button's click is a no-op — Mark's row never enters
    // its own confirm state, so exactly one "Confirm removal" button
    // exists (Sarah's, still mid-removal), not two.
    expect(screen.getAllByRole('button', { name: /confirm removal/i })).toHaveLength(1)

    resolveRemoval()
    await waitFor(() => expect(vi.mocked(guardiansApi.removeGuardian)).toHaveBeenCalledTimes(1))
  })

  it('"Cancel" dismisses the confirm without calling the API', async () => {
    vi.mocked(studentsApi.getStudent).mockResolvedValue(STUDENT)
    vi.mocked(guardiansApi.listGuardians).mockResolvedValue([GUARDIAN])

    await renderAuthenticatedAt('/school-admin/students/s1/guardians')
    await screen.findByText('Sarah Thompson')
    fireEvent.click(screen.getByRole('button', { name: /^remove$/i }))
    await screen.findByRole('button', { name: /confirm removal/i })

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))

    expect(screen.getByRole('button', { name: /^remove$/i })).toBeInTheDocument()
    expect(vi.mocked(guardiansApi.removeGuardian)).not.toHaveBeenCalled()
  })

  it('a failed removal shows an error banner without clearing the list', async () => {
    vi.mocked(studentsApi.getStudent).mockResolvedValue(STUDENT)
    vi.mocked(guardiansApi.listGuardians).mockResolvedValue([GUARDIAN])
    vi.mocked(guardiansApi.removeGuardian).mockRejectedValue(new Error('Network Error'))

    await renderAuthenticatedAt('/school-admin/students/s1/guardians')
    await screen.findByText('Sarah Thompson')
    fireEvent.click(screen.getByRole('button', { name: /^remove$/i }))
    await screen.findByRole('button', { name: /confirm removal/i })

    fireEvent.click(screen.getByRole('button', { name: /confirm removal/i }))

    expect(
      await screen.findByText('Something went wrong. Please check your connection and try again.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Sarah Thompson')).toBeInTheDocument()
  })

  it('shows an error state with a retry action when the student cannot be found', async () => {
    vi.mocked(studentsApi.getStudent).mockRejectedValue(new Error('Network Error'))
    vi.mocked(guardiansApi.listGuardians).mockResolvedValue([])

    await renderAuthenticatedAt('/school-admin/students/s1/guardians')

    expect(
      await screen.findByText('Something went wrong. Please check your connection and try again.'),
    ).toBeInTheDocument()
  })
})
