import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthContext'
import * as authApi from '@/features/auth/api'
import { StudentAuthProvider } from '@/features/student-auth/StudentAuthContext'
import * as studentAuthApi from '@/features/student-auth/api'
import * as walletApi from '@/features/wallet/api'
import { routes } from './index'

vi.mock('@/features/auth/api')
vi.mock('@/features/student-auth/api')
vi.mock('@/features/wallet/api')

const SA_USER = {
  id: 'u1',
  full_name: 'Sarah Thompson',
  email: 'sarah@example.com',
  role: 'parent' as const,
  school_id: null,
  school_name: null,
}

async function loginAsParentAt(path: string) {
  vi.mocked(authApi.login).mockResolvedValue({
    access_token: 'a-real-jwt',
    token_type: 'bearer',
    user: SA_USER,
  })
  const router = createMemoryRouter(routes, { initialEntries: ['/login'] })
  render(
    <AuthProvider>
      <StudentAuthProvider>
        <RouterProvider router={router} />
      </StudentAuthProvider>
    </AuthProvider>,
  )
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: SA_USER.email } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'whatever' } })
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
  await waitFor(() => expect(screen.getByText(/good morning/i)).toBeInTheDocument())
  await act(async () => {
    await router.navigate(path)
  })
}

async function loginAsStudentAt(path: string) {
  vi.mocked(studentAuthApi.login).mockResolvedValue({
    access_token: 'a-real-jwt',
    token_type: 'bearer',
    student: { id: 's1', full_name: 'Noah Thompson', student_id: 'S-41880', school_id: 'sc1' },
  })
  const router = createMemoryRouter(routes, { initialEntries: ['/student-login'] })
  render(
    <AuthProvider>
      <StudentAuthProvider>
        <RouterProvider router={router} />
      </StudentAuthProvider>
    </AuthProvider>,
  )
  fireEvent.change(screen.getByLabelText('Student ID'), { target: { value: 'S-41880' } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'whatever' } })
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
  await waitFor(() => expect(screen.getByText(/grab your usual in a tap/i)).toBeInTheDocument())
  await act(async () => {
    await router.navigate(path)
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

const TXN: walletApi.WalletTransaction = {
  id: 't1',
  type: 'top_up',
  status: 'success',
  amount: '20.00',
  order_id: null,
  created_at: '2026-07-04T08:02:00Z',
}

describe('WalletScreen (Parent)', () => {
  it('shows the current balance and recent transactions', async () => {
    vi.mocked(walletApi.getMyParentWalletId).mockResolvedValue('w1')
    vi.mocked(walletApi.getWallet).mockResolvedValue({
      id: 'w1',
      owner_type: 'parent',
      balance: '45.00',
    })
    vi.mocked(walletApi.getWalletTransactions).mockResolvedValue([TXN])

    await loginAsParentAt('/parent/wallet')

    expect(await screen.findByText('$45.00')).toBeInTheDocument()
    expect(screen.getByText('Top-up')).toBeInTheDocument()
    expect(screen.getByText('+$20.00')).toBeInTheDocument()
  })

  it('shows the empty state with no transactions yet (EC-033)', async () => {
    vi.mocked(walletApi.getMyParentWalletId).mockResolvedValue('w1')
    vi.mocked(walletApi.getWallet).mockResolvedValue({
      id: 'w1',
      owner_type: 'parent',
      balance: '0.00',
    })
    vi.mocked(walletApi.getWalletTransactions).mockResolvedValue([])

    await loginAsParentAt('/parent/wallet')

    expect(await screen.findByText('No transactions yet')).toBeInTheDocument()
  })

  it('shows an error state with a retry action when the fetch fails', async () => {
    vi.mocked(walletApi.getMyParentWalletId).mockRejectedValue(new Error('Network Error'))

    await loginAsParentAt('/parent/wallet')

    expect(
      await screen.findByText('Something went wrong. Please check your connection and try again.'),
    ).toBeInTheDocument()
  })

  it('the "See all" button navigates to the full transaction history', async () => {
    vi.mocked(walletApi.getMyParentWalletId).mockResolvedValue('w1')
    vi.mocked(walletApi.getWallet).mockResolvedValue({
      id: 'w1',
      owner_type: 'parent',
      balance: '45.00',
    })
    vi.mocked(walletApi.getWalletTransactions).mockResolvedValue([TXN])

    await loginAsParentAt('/parent/wallet')
    await screen.findByText('Top-up')
    fireEvent.click(screen.getByRole('button', { name: 'See all' }))

    expect(await screen.findByText('Transaction history')).toBeInTheDocument()
  })

  it('a failed transaction is shown distinctly, not styled as a successful credit', async () => {
    vi.mocked(walletApi.getMyParentWalletId).mockResolvedValue('w1')
    vi.mocked(walletApi.getWallet).mockResolvedValue({
      id: 'w1',
      owner_type: 'parent',
      balance: '0.00',
    })
    vi.mocked(walletApi.getWalletTransactions).mockResolvedValue([
      { ...TXN, status: 'failed' },
    ])

    await loginAsParentAt('/parent/wallet')

    expect(await screen.findByText(/Failed/)).toBeInTheDocument()
  })
})

describe('WalletScreen (Student)', () => {
  it('shows the current balance for a student', async () => {
    vi.mocked(walletApi.getMyStudentWalletId).mockResolvedValue('w2')
    vi.mocked(walletApi.getWallet).mockResolvedValue({
      id: 'w2',
      owner_type: 'student',
      balance: '12.50',
    })
    vi.mocked(walletApi.getWalletTransactions).mockResolvedValue([])

    await loginAsStudentAt('/student/wallet')

    expect(await screen.findByText('$12.50')).toBeInTheDocument()
  })
})
