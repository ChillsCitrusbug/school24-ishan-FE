import { StrictMode } from 'react'
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

async function renderAuthenticatedAt(path: string, options: { strict?: boolean } = {}) {
  vi.mocked(authApi.login).mockResolvedValue({
    access_token: 'a-real-jwt',
    token_type: 'bearer',
    user: PLATFORM_ADMIN_USER,
  })
  const router = createMemoryRouter(routes, { initialEntries: ['/login'] })
  const tree = (
    <AuthProvider>
      <StudentAuthProvider>
        <RouterProvider router={router} />
      </StudentAuthProvider>
    </AuthProvider>
  )
  const result = render(options.strict ? <StrictMode>{tree}</StrictMode> : tree)
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
  student_count: 0,
  created_at: '2026-03-15T00:00:00Z',
}

describe('SchoolsListScreen', () => {
  it('renders each school row with its admin, student count, and status', async () => {
    vi.mocked(schoolsApi.listSchools).mockResolvedValue([SCHOOL])

    await renderAuthenticatedAt('/platform-admin/schools')

    expect(await screen.findByText('Hilltop Public')).toBeInTheDocument()
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Mar 2026')).toBeInTheDocument()
  })

  it('shows the empty state with no schools', async () => {
    vi.mocked(schoolsApi.listSchools).mockResolvedValue([])

    await renderAuthenticatedAt('/platform-admin/schools')

    expect(await screen.findByText('No schools yet')).toBeInTheDocument()
  })

  it('shows an error state with a retry action when the fetch fails', async () => {
    vi.mocked(schoolsApi.listSchools).mockRejectedValue(new Error('Network Error'))

    await renderAuthenticatedAt('/platform-admin/schools')

    expect(
      await screen.findByText('Something went wrong. Please check your connection and try again.'),
    ).toBeInTheDocument()
  })

  it('the "Onboard school" button navigates to the onboarding form', async () => {
    vi.mocked(schoolsApi.listSchools).mockResolvedValue([])

    await renderAuthenticatedAt('/platform-admin/schools')
    await screen.findByText('No schools yet')
    fireEvent.click(screen.getAllByRole('button', { name: /onboard school/i })[0])

    expect(await screen.findByText('Onboard a new school')).toBeInTheDocument()
  })

  // Bug found via direct visual-check inspection: mountedRef used to be
  // set to false only in the effect's cleanup, never reset to true on
  // mount — React StrictMode's dev-only double-invoke fired that cleanup
  // once before the "real" mount settled, permanently zeroing the ref, so
  // the eventual API response was silently dropped and the screen hung
  // on its loading spinner forever. Reproduced here by actually rendering
  // under <StrictMode> (RolesListScreen.tsx/StaffPortalScreen.tsx shared
  // the exact same bug — fixed there too).
  it('still renders school data under StrictMode double-invoke (regression)', async () => {
    vi.mocked(schoolsApi.listSchools).mockResolvedValue([SCHOOL])

    await renderAuthenticatedAt('/platform-admin/schools', { strict: true })

    expect(await screen.findByText('Hilltop Public')).toBeInTheDocument()
  })
})
