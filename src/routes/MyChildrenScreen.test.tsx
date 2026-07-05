import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthContext'
import * as authApi from '@/features/auth/api'
import * as childSelectionApi from '@/features/child-selection/api'
import * as foodRestrictionsApi from '@/features/food-restrictions/api'
import * as myChildrenApi from '@/features/my-children/api'
import * as permissionsApi from '@/features/permissions/api'
import { StudentAuthProvider } from '@/features/student-auth/StudentAuthContext'
import { routes } from './index'

vi.mock('@/features/auth/api')
vi.mock('@/features/my-children/api')
vi.mock('@/features/permissions/api')
vi.mock('@/features/child-selection/api')
vi.mock('@/features/food-restrictions/api')

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
  vi.useRealTimers()
})

const NOAH_APPROVED: myChildrenApi.MyChild = {
  link_id: 'lk1',
  student_id: 'st1',
  student_id_code: 'S-41880',
  full_name: 'Noah Thompson',
  status: 'approved',
  class_name: 'Year 1 · 1A',
  school_name: 'Greenvale Primary',
  wallet_balance: 23.5,
}

const GRACE_PENDING: myChildrenApi.MyChild = {
  link_id: 'lk2',
  student_id: 'st2',
  student_id_code: 'S-40552',
  full_name: 'Grace Okoro',
  status: 'pending',
}

describe('MyChildrenScreen (Sc061MyChildren)', () => {
  it('renders approved and pending children in their own sections', async () => {
    vi.mocked(myChildrenApi.listMyChildren).mockResolvedValue([NOAH_APPROVED, GRACE_PENDING])

    await renderAuthenticatedAt('/parent/children')

    expect(await screen.findByText('Approved')).toBeInTheDocument()
    expect(screen.getByText('Noah Thompson')).toBeInTheDocument()
    expect(screen.getByText('$23.50')).toBeInTheDocument()
    expect(screen.getByText('Pending approval')).toBeInTheDocument()
    expect(screen.getByText('Grace Okoro')).toBeInTheDocument()
    expect(screen.getByText('Link request pending school approval')).toBeInTheDocument()
  })

  it('a pending child renders no order/top-up controls (EC-014)', async () => {
    vi.mocked(myChildrenApi.listMyChildren).mockResolvedValue([GRACE_PENDING])

    await renderAuthenticatedAt('/parent/children')
    await screen.findByText('Grace Okoro')

    expect(screen.queryByText('Top up')).not.toBeInTheDocument()
    expect(screen.queryByText('Order')).not.toBeInTheDocument()
  })

  it('an approved child\'s "Top up" tile navigates straight to the child top-up screen with the child already known (FR-029)', async () => {
    vi.mocked(myChildrenApi.listMyChildren).mockResolvedValue([NOAH_APPROVED])
    vi.mocked(childSelectionApi.getActiveContext).mockResolvedValue([
      {
        student_id: 'st1',
        student_id_code: 'S-41880',
        full_name: 'Noah Thompson',
        class_name: 'Year 1 · 1A',
        school_name: 'Greenvale Primary',
        wallet_balance: 23.5,
      },
    ])

    await renderAuthenticatedAt('/parent/children')
    await screen.findByText('Noah Thompson')

    fireEvent.click(screen.getByText('Top up', { exact: true }))

    expect(await screen.findByRole('heading', { name: "Top up Noah Thompson's wallet" })).toBeInTheDocument()
  })

  it('an approved child\'s "Limits" tile navigates straight to the food restrictions screen with the child already known (FR-032)', async () => {
    vi.mocked(myChildrenApi.listMyChildren).mockResolvedValue([NOAH_APPROVED])
    vi.mocked(childSelectionApi.getActiveContext).mockResolvedValue([
      {
        student_id: 'st1',
        student_id_code: 'S-41880',
        full_name: 'Noah Thompson',
        class_name: 'Year 1 · 1A',
        school_name: 'Greenvale Primary',
        wallet_balance: 23.5,
      },
    ])
    vi.mocked(foodRestrictionsApi.listRestrictions).mockResolvedValue([])

    await renderAuthenticatedAt('/parent/children')
    await screen.findByText('Noah Thompson')

    fireEvent.click(screen.getByText('Limits', { exact: true }))

    expect(await screen.findByText('No restrictions set')).toBeInTheDocument()
  })

  it('shows the empty state with an "Add a child" action when there are no linked children', async () => {
    vi.mocked(myChildrenApi.listMyChildren).mockResolvedValue([])

    await renderAuthenticatedAt('/parent/children')

    expect(await screen.findByText('No children linked yet')).toBeInTheDocument()
  })

  it('shows an error state with a retry action when the list fails to load', async () => {
    vi.mocked(myChildrenApi.listMyChildren).mockRejectedValue(new Error('Network Error'))

    await renderAuthenticatedAt('/parent/children')

    expect(
      await screen.findByText('Something went wrong. Please check your connection and try again.'),
    ).toBeInTheDocument()
  })

  it('"Add a child" navigates to the add-child screen', async () => {
    vi.mocked(myChildrenApi.listMyChildren).mockResolvedValue([])

    await renderAuthenticatedAt('/parent/children')
    await screen.findByText('No children linked yet')

    fireEvent.click(screen.getAllByRole('button', { name: /add a child/i })[0])

    expect(await screen.findByText('Send link request')).toBeInTheDocument()
  })

  it('"Top up wallet" navigates to the parent\'s own wallet top-up screen (round-1 review finding, Minor)', async () => {
    vi.mocked(myChildrenApi.listMyChildren).mockResolvedValue([])

    await renderAuthenticatedAt('/parent/children')
    await screen.findByText('No children linked yet')

    fireEvent.click(screen.getByRole('button', { name: /top up wallet/i }))

    expect(await screen.findByRole('heading', { name: 'Top up wallet' })).toBeInTheDocument()
  })
})

describe('MyChildrenScreen — live status update (FR-023 DoD)', () => {
  it('flips a child from Pending to Approved without a page reload, via polling', async () => {
    // Fakes ONLY setInterval/clearInterval — `renderAuthenticatedAt`'s
    // own login flow relies on testing-library's `waitFor`, which polls
    // via a real `setTimeout` internally; faking that too would hang
    // it. This still lets `vi.advanceTimersByTimeAsync` control the
    // screen's own poll interval deterministically.
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    vi.mocked(myChildrenApi.listMyChildren)
      .mockResolvedValueOnce([GRACE_PENDING])
      .mockResolvedValueOnce([{ ...GRACE_PENDING, status: 'approved', class_name: 'Year 3 · 3R', school_name: 'Greenvale Primary', wallet_balance: 0 }])

    await renderAuthenticatedAt('/parent/children')
    await waitFor(() => expect(screen.getByText('Pending approval')).toBeInTheDocument())

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000)
    })

    await waitFor(() => expect(screen.queryByText('Pending approval')).not.toBeInTheDocument())
    expect(screen.getByText('Approved')).toBeInTheDocument()
    expect(screen.getByText('Grace Okoro')).toBeInTheDocument()
    expect(vi.mocked(myChildrenApi.listMyChildren)).toHaveBeenCalledTimes(2)
  })
})
