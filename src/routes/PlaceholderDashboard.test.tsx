import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthContext'
import * as authApi from '@/features/auth/api'
import * as permissionsApi from '@/features/permissions/api'
import { StudentAuthProvider } from '@/features/student-auth/StudentAuthContext'
import { routes } from './index'

vi.mock('@/features/auth/api')
vi.mock('@/features/permissions/api')

const PARENT_USER = {
  id: 'u1',
  full_name: 'Sarah Thompson',
  email: 'sarah@thompson.com',
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
  vi.mocked(permissionsApi.getMyPermissions).mockResolvedValue([])
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
  await waitFor(() => expect(screen.getByText(/dashboard coming soon/i)).toBeInTheDocument())

  await act(async () => {
    await router.navigate(path)
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('PlaceholderDashboard (FR-022 additions)', () => {
  it('shows an "Order for a child" card linking to the selection screen', async () => {
    await renderAuthenticatedAt('/parent')

    expect(screen.getByText('Order for a child')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /choose a child/i })[0]).toHaveAttribute(
      'href',
      '/parent/select-child',
    )
  })

  it('shows a "Top up a child\'s wallet" card linking to the selection screen with the top-up destination (FR-029)', async () => {
    await renderAuthenticatedAt('/parent')

    expect(screen.getByText("Top up a child's wallet")).toBeInTheDocument()
    const links = screen.getAllByRole('link', { name: /choose a child/i })
    const topUpLink = links.find(
      (link) => link.getAttribute('href') === '/parent/select-child?next=/parent/wallet/top-up-child',
    )
    expect(topUpLink).toBeDefined()
  })

  it('shows a "My children" card linking to the status list (FR-023)', async () => {
    await renderAuthenticatedAt('/parent')

    expect(screen.getByText('My children')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /view children/i })).toHaveAttribute(
      'href',
      '/parent/children',
    )
  })

  it('shows a confirmation banner when returning with a resolved ?childId=', async () => {
    await renderAuthenticatedAt('/parent?childId=st1')

    expect(await screen.findByText(/ordering context loaded/i)).toBeInTheDocument()
    expect(screen.getByText(/st1/)).toBeInTheDocument()
  })

  it('shows no confirmation banner without a childId', async () => {
    await renderAuthenticatedAt('/parent')

    expect(screen.queryByText(/ordering context loaded/i)).not.toBeInTheDocument()
  })

  it("the parent's own wallet stays available regardless of which child is selected (DoD)", async () => {
    await renderAuthenticatedAt('/parent?childId=st1')

    expect(await screen.findByText(/ordering context loaded/i)).toBeInTheDocument()
    expect(screen.getByText('Your wallet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /view wallet/i })).toHaveAttribute(
      'href',
      '/parent/wallet',
    )
  })
})
