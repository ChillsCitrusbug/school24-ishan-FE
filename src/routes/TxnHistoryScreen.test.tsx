import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthContext'
import * as authApi from '@/features/auth/api'
import { StudentAuthProvider } from '@/features/student-auth/StudentAuthContext'
import * as walletApi from '@/features/wallet/api'
import { routes } from './index'

vi.mock('@/features/auth/api')
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

afterEach(() => {
  vi.restoreAllMocks()
})

const TOP_UP: walletApi.WalletTransaction = {
  id: 't1',
  type: 'top_up',
  status: 'success',
  amount: '20.00',
  order_id: null,
  created_at: '2026-07-04T08:02:00Z',
}
const DEDUCTION: walletApi.WalletTransaction = {
  id: 't2',
  type: 'deduction',
  status: 'success',
  amount: '9.00',
  order_id: 'ord-1',
  created_at: '2026-07-03T12:31:00Z',
}
const REFUND: walletApi.WalletTransaction = {
  id: 't3',
  type: 'refund',
  status: 'success',
  amount: '8.50',
  order_id: 'ord-2',
  created_at: '2026-06-21T09:00:00Z',
}

describe('TxnHistoryScreen', () => {
  it('shows all 3 transaction types (top_up, deduction, refund) — Scenario 2', async () => {
    vi.mocked(walletApi.getMyParentWalletId).mockResolvedValue('w1')
    vi.mocked(walletApi.getWalletTransactions).mockResolvedValue([TOP_UP, DEDUCTION, REFUND])

    await loginAsParentAt('/parent/wallet/history')

    expect(await screen.findByText('Top-up')).toBeInTheDocument()
    expect(screen.getByText('Purchase')).toBeInTheDocument()
    expect(screen.getByText('Refund')).toBeInTheDocument()
    expect(screen.getByText('+$20.00')).toBeInTheDocument()
    expect(screen.getByText('−$9.00')).toBeInTheDocument()
    expect(screen.getByText('+$8.50')).toBeInTheDocument()
  })

  it('filters transactions client-side by type', async () => {
    vi.mocked(walletApi.getMyParentWalletId).mockResolvedValue('w1')
    vi.mocked(walletApi.getWalletTransactions).mockResolvedValue([TOP_UP, DEDUCTION, REFUND])

    await loginAsParentAt('/parent/wallet/history')
    await screen.findByText('Top-up')

    fireEvent.click(screen.getByRole('button', { name: 'Refunds' }))

    expect(screen.getByText('Refund')).toBeInTheDocument()
    expect(screen.queryByText('Top-up')).not.toBeInTheDocument()
    expect(screen.queryByText('Purchase')).not.toBeInTheDocument()
  })

  it('shows the empty state with no transactions yet (EC-033)', async () => {
    vi.mocked(walletApi.getMyParentWalletId).mockResolvedValue('w1')
    vi.mocked(walletApi.getWalletTransactions).mockResolvedValue([])

    await loginAsParentAt('/parent/wallet/history')

    expect(await screen.findByText('No transactions yet')).toBeInTheDocument()
  })

  it('the back button navigates to the wallet overview', async () => {
    vi.mocked(walletApi.getMyParentWalletId).mockResolvedValue('w1')
    vi.mocked(walletApi.getWallet).mockResolvedValue({
      id: 'w1',
      owner_type: 'parent',
      balance: '20.00',
    })
    vi.mocked(walletApi.getWalletTransactions).mockResolvedValue([TOP_UP])

    await loginAsParentAt('/parent/wallet/history')
    await screen.findByText('Top-up')
    fireEvent.click(screen.getByRole('button', { name: /wallet/i }))

    expect(await screen.findByText('Your wallet')).toBeInTheDocument()
  })
})
