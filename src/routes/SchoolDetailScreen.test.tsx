import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthContext'
import * as authApi from '@/features/auth/api'
import * as schoolsApi from '@/features/schools/api'
import { StudentAuthProvider } from '@/features/student-auth/StudentAuthContext'
import { routes } from './index'

vi.mock('@/features/auth/api')
vi.mock('@/features/schools/api')

const PLATFORM_ADMIN_USER = {
  id: 'u1',
  full_name: 'Alex Morgan',
  email: 'alex@example.com',
  role: 'platform_admin' as const,
  school_id: null,
  school_name: null,
}

const SCHOOL: schoolsApi.School = {
  id: 'sch1',
  school_name: 'Hilltop Public',
  school_type: 'Primary',
  contact_number: '+1-555-0100',
  address: '1 Hilltop Rd',
  state_region: 'NSW',
  primary_contact_name: 'Jane Smith',
  primary_contact_email: 'jane@school.edu',
  is_active: true,
  student_count: 12,
  created_at: '2026-03-15T00:00:00Z',
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

describe('SchoolDetailScreen', () => {
  it('loads and shows the school details', async () => {
    vi.mocked(schoolsApi.getSchool).mockResolvedValue(SCHOOL)

    await renderAt('/platform-admin/schools/sch1')

    expect(await screen.findByRole('heading', { name: 'Hilltop Public' })).toBeInTheDocument()
    expect(screen.getByText('Primary')).toBeInTheDocument()
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    expect(screen.getByText('jane@school.edu')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(schoolsApi.getSchool).toHaveBeenCalledWith('sch1')
  })

  it('shows an error state when the load fails', async () => {
    vi.mocked(schoolsApi.getSchool).mockRejectedValue(new Error('Network Error'))

    await renderAt('/platform-admin/schools/sch1')

    expect(
      await screen.findByText('Something went wrong. Please check your connection and try again.'),
    ).toBeInTheDocument()
  })

  it('edits and saves the school details, reflecting the update (Scenario 1)', async () => {
    vi.mocked(schoolsApi.getSchool).mockResolvedValue(SCHOOL)
    vi.mocked(schoolsApi.updateSchool).mockResolvedValue({
      ...SCHOOL,
      school_name: 'Hilltop Elementary',
      contact_number: '+1-555-9999',
    })

    await renderAt('/platform-admin/schools/sch1')
    await screen.findByRole('heading', { name: 'Hilltop Public' })

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    const nameInput = screen.getByLabelText('School name')
    fireEvent.change(nameInput, { target: { value: 'Hilltop Elementary' } })
    const contactInput = screen.getByLabelText('Contact number')
    fireEvent.change(contactInput, { target: { value: '+1-555-9999' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(schoolsApi.updateSchool).toHaveBeenCalled())
    expect(schoolsApi.updateSchool).toHaveBeenCalledWith('sch1', {
      school_name: 'Hilltop Elementary',
      school_type: 'Primary',
      contact_number: '+1-555-9999',
      address: '1 Hilltop Rd',
      state_region: 'NSW',
    })
    expect(
      await screen.findByRole('heading', { name: 'Hilltop Elementary' }),
    ).toBeInTheDocument()
  })

  it('reassigns the admin, showing the invited confirmation (Scenario 2)', async () => {
    vi.mocked(schoolsApi.getSchool).mockResolvedValue(SCHOOL)
    vi.mocked(schoolsApi.reassignAdmin).mockResolvedValue({
      ...SCHOOL,
      primary_contact_name: 'New Admin',
      primary_contact_email: 'new-admin@school.edu',
    })

    await renderAt('/platform-admin/schools/sch1')
    await screen.findByRole('heading', { name: 'Hilltop Public' })

    fireEvent.click(screen.getByRole('button', { name: 'Reassign admin' }))
    fireEvent.change(screen.getByLabelText("New admin's full name"), {
      target: { value: 'New Admin' },
    })
    fireEvent.change(screen.getByLabelText("New admin's email"), {
      target: { value: 'new-admin@school.edu' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Reassign admin' }))

    await waitFor(() => expect(schoolsApi.reassignAdmin).toHaveBeenCalled())
    expect(schoolsApi.reassignAdmin).toHaveBeenCalledWith('sch1', {
      full_name: 'New Admin',
      email: 'new-admin@school.edu',
    })
    expect(
      await screen.findByText(/has been invited and will gain full access/),
    ).toBeInTheDocument()
  })

  it('shows an inline error when reassignment fails, without leaving the form', async () => {
    vi.mocked(schoolsApi.getSchool).mockResolvedValue(SCHOOL)
    vi.mocked(schoolsApi.reassignAdmin).mockRejectedValue({
      response: { data: { errors: 'A school admin with this email already exists.' } },
    })

    await renderAt('/platform-admin/schools/sch1')
    await screen.findByRole('heading', { name: 'Hilltop Public' })

    fireEvent.click(screen.getByRole('button', { name: 'Reassign admin' }))
    fireEvent.change(screen.getByLabelText("New admin's full name"), {
      target: { value: 'New Admin' },
    })
    fireEvent.change(screen.getByLabelText("New admin's email"), {
      target: { value: 'jane@school.edu' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Reassign admin' }))

    expect(
      await screen.findByText('A school admin with this email already exists.'),
    ).toBeInTheDocument()
  })
})
