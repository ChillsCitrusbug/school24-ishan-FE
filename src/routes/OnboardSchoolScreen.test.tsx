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

async function renderAuthenticatedAt(path: string) {
  vi.mocked(authApi.login).mockResolvedValue({
    access_token: 'a-real-jwt',
    token_type: 'bearer',
    user: PLATFORM_ADMIN_USER,
  })
  const router = createMemoryRouter(routes, { initialEntries: ['/login'] })
  const result = render(
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
  return result
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('OnboardSchoolScreen', () => {
  it('renders all 7 fields — no separate School Email field', async () => {
    await renderAuthenticatedAt('/platform-admin/schools/new')

    expect(screen.getByLabelText('School name')).toBeInTheDocument()
    expect(screen.getByLabelText('School type')).toBeInTheDocument()
    expect(screen.getByLabelText('Contact number')).toBeInTheDocument()
    expect(screen.getByLabelText('Address')).toBeInTheDocument()
    expect(screen.getByLabelText('State / region')).toBeInTheDocument()
    expect(screen.getByLabelText('Admin full name')).toBeInTheDocument()
    expect(screen.getByLabelText('Admin email')).toBeInTheDocument()
    expect(screen.queryByLabelText('School email')).not.toBeInTheDocument()
  })

  it('submits all 7 fields and navigates to the schools list on success', async () => {
    vi.mocked(schoolsApi.onboardSchool).mockResolvedValue({
      id: 'sch1',
      school_name: 'Hilltop Public',
      school_type: 'Primary',
      contact_number: '+1-555-0100',
      address: '1 Hilltop Rd',
      state_region: 'NSW',
      primary_contact_name: 'Jane Smith',
      primary_contact_email: 'jane@school.edu',
      is_active: true,
      student_count: 0,
      created_at: '2026-07-02T00:00:00Z',
    })
    vi.mocked(schoolsApi.listSchools).mockResolvedValue([])

    await renderAuthenticatedAt('/platform-admin/schools/new')
    fireEvent.change(screen.getByLabelText('School name'), { target: { value: 'Hilltop Public' } })
    fireEvent.change(screen.getByLabelText('School type'), { target: { value: 'Primary' } })
    fireEvent.change(screen.getByLabelText('Contact number'), { target: { value: '+1-555-0100' } })
    fireEvent.change(screen.getByLabelText('Address'), { target: { value: '1 Hilltop Rd' } })
    fireEvent.change(screen.getByLabelText('State / region'), { target: { value: 'NSW' } })
    fireEvent.change(screen.getByLabelText('Admin full name'), { target: { value: 'Jane Smith' } })
    fireEvent.change(screen.getByLabelText('Admin email'), { target: { value: 'jane@school.edu' } })
    fireEvent.click(screen.getByRole('button', { name: /create school/i }))

    await waitFor(() =>
      expect(schoolsApi.onboardSchool).toHaveBeenCalledWith({
        school_name: 'Hilltop Public',
        school_type: 'Primary',
        contact_number: '+1-555-0100',
        address: '1 Hilltop Rd',
        state_region: 'NSW',
        primary_contact_name: 'Jane Smith',
        primary_contact_email: 'jane@school.edu',
      }),
    )
    expect(await screen.findByRole('heading', { name: 'Schools' })).toBeInTheDocument()
  })

  it('sends undefined (not empty strings) for optional address/state fields left blank', async () => {
    vi.mocked(schoolsApi.onboardSchool).mockResolvedValue({
      id: 'sch1',
      school_name: 'Hilltop Public',
      school_type: 'Primary',
      contact_number: '+1-555-0100',
      address: null,
      state_region: null,
      primary_contact_name: 'Jane Smith',
      primary_contact_email: 'jane@school.edu',
      is_active: true,
      student_count: 0,
      created_at: '2026-07-02T00:00:00Z',
    })
    vi.mocked(schoolsApi.listSchools).mockResolvedValue([])

    await renderAuthenticatedAt('/platform-admin/schools/new')
    fireEvent.change(screen.getByLabelText('School name'), { target: { value: 'Hilltop Public' } })
    fireEvent.change(screen.getByLabelText('School type'), { target: { value: 'Primary' } })
    fireEvent.change(screen.getByLabelText('Contact number'), { target: { value: '+1-555-0100' } })
    fireEvent.change(screen.getByLabelText('Admin full name'), { target: { value: 'Jane Smith' } })
    fireEvent.change(screen.getByLabelText('Admin email'), { target: { value: 'jane@school.edu' } })
    fireEvent.click(screen.getByRole('button', { name: /create school/i }))

    await waitFor(() =>
      expect(schoolsApi.onboardSchool).toHaveBeenCalledWith(
        expect.objectContaining({ address: undefined, state_region: undefined }),
      ),
    )
  })

  it('shows the duplicate-admin-email banner on a 409 without navigating away', async () => {
    vi.mocked(schoolsApi.onboardSchool).mockRejectedValue({
      response: {
        status: 409,
        data: { errors: 'A school admin with this email already exists. Use a different email.' },
      },
    })

    await renderAuthenticatedAt('/platform-admin/schools/new')
    fireEvent.change(screen.getByLabelText('School name'), { target: { value: 'Hilltop Public' } })
    fireEvent.change(screen.getByLabelText('School type'), { target: { value: 'Primary' } })
    fireEvent.change(screen.getByLabelText('Contact number'), { target: { value: '+1-555-0100' } })
    fireEvent.change(screen.getByLabelText('Admin full name'), { target: { value: 'Jane Smith' } })
    fireEvent.change(screen.getByLabelText('Admin email'), { target: { value: 'jane@school.edu' } })
    fireEvent.click(screen.getByRole('button', { name: /create school/i }))

    expect(
      await screen.findByText('A school admin with this email already exists. Use a different email.'),
    ).toBeInTheDocument()
    // Still on the form, with the user's data intact — not navigated away.
    expect(screen.getByLabelText('School name')).toHaveValue('Hilltop Public')
    expect(screen.getByLabelText('Admin email')).toHaveAttribute('aria-invalid', 'true')
  })

  // Review finding (Major): isDuplicateEmail used to be set to true on
  // ANY submit failure, not just a genuine 409 — highlighting the email
  // field in red for errors that had nothing to do with it (a blank
  // required field, a dropped network connection, a 500).
  it('does not highlight the email field on a non-409 error', async () => {
    vi.mocked(schoolsApi.onboardSchool).mockRejectedValue({
      response: { status: 422, data: { errors: 'Contact number is required.' } },
    })

    await renderAuthenticatedAt('/platform-admin/schools/new')
    fireEvent.change(screen.getByLabelText('School name'), { target: { value: 'Hilltop Public' } })
    fireEvent.change(screen.getByLabelText('Admin email'), { target: { value: 'jane@school.edu' } })
    fireEvent.click(screen.getByRole('button', { name: /create school/i }))

    expect(await screen.findByText('Contact number is required.')).toBeInTheDocument()
    expect(screen.getByLabelText('Admin email')).not.toHaveAttribute('aria-invalid')
  })

  it('does not highlight the email field on a network failure (no response at all)', async () => {
    vi.mocked(schoolsApi.onboardSchool).mockRejectedValue(new Error('Network Error'))

    await renderAuthenticatedAt('/platform-admin/schools/new')
    fireEvent.change(screen.getByLabelText('School name'), { target: { value: 'Hilltop Public' } })
    fireEvent.change(screen.getByLabelText('Admin email'), { target: { value: 'jane@school.edu' } })
    fireEvent.click(screen.getByRole('button', { name: /create school/i }))

    expect(
      await screen.findByText('Something went wrong. Please check your connection and try again.'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Admin email')).not.toHaveAttribute('aria-invalid')
  })

  it('the back button navigates to the schools list', async () => {
    vi.mocked(schoolsApi.listSchools).mockResolvedValue([])
    await renderAuthenticatedAt('/platform-admin/schools/new')

    fireEvent.click(screen.getByRole('button', { name: /^schools$/i }))

    expect(await screen.findByText(/Onboard your first school/)).toBeInTheDocument()
  })
})
