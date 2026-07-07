import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthContext'
import * as authApi from '@/features/auth/api'
import { StudentAuthProvider } from '@/features/student-auth/StudentAuthContext'
import * as studentAuthApi from '@/features/student-auth/api'
import * as walletTopUpApi from '@/features/wallet-topup/api'
import { routes } from './index'

vi.mock('@/features/auth/api')
vi.mock('@/features/student-auth/api')
vi.mock('@/features/wallet-topup/api')

vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn(() => Promise.resolve({})),
}))

const mockConfirmPayment = vi.fn()

vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PaymentElement: () => <div data-testid="payment-element" />,
  useStripe: () => ({ confirmPayment: mockConfirmPayment }),
  useElements: () => ({}),
}))

const SA_USER = {
  id: 'u1',
  full_name: 'Sarah Thompson',
  email: 'sarah@example.com',
  role: 'parent' as const,
  school_id: null,
  school_name: null,
}

async function loginAsParent() {
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
  await waitFor(() => expect(screen.getByText('Dashboard coming soon')).toBeInTheDocument())
  await act(async () => {
    await router.navigate('/parent/wallet/top-up')
  })
}

async function loginAsStudent() {
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
    await router.navigate('/student/wallet/top-up')
  })
}

afterEach(() => {
  vi.restoreAllMocks()
  mockConfirmPayment.mockReset()
  vi.useRealTimers()
})

describe('WalletTopUpScreen (Parent)', () => {
  it('shows the amount-entry step by default, with quick-amount selection', async () => {
    await loginAsParent()

    expect(await screen.findByText('Top up wallet')).toBeInTheDocument()
    expect(screen.getAllByText('$20.00').length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: '$50' }))
    expect(screen.getAllByText('$50.00').length).toBeGreaterThan(0)
  })

  it('starts a top-up and moves to the payment step, rendering the real Stripe PaymentElement', async () => {
    await loginAsParent()
    vi.mocked(walletTopUpApi.startParentTopUp).mockResolvedValue({
      transaction_id: 'txn-1',
      client_secret: 'pi_123_secret',
      publishable_key: 'pk_test_123',
      amount: 20,
    })

    fireEvent.click(await screen.findByRole('button', { name: /continue to payment/i }))

    expect(await screen.findByTestId('payment-element')).toBeInTheDocument()
    expect(walletTopUpApi.startParentTopUp).toHaveBeenCalledWith(20)
  })

  it('confirms payment and shows the success result once the backend resolves the transaction', async () => {
    await loginAsParent()
    vi.mocked(walletTopUpApi.startParentTopUp).mockResolvedValue({
      transaction_id: 'txn-2',
      client_secret: 'pi_456_secret',
      publishable_key: 'pk_test_123',
      amount: 20,
    })
    mockConfirmPayment.mockResolvedValue({})
    vi.mocked(walletTopUpApi.getParentTopUpStatus).mockResolvedValue({
      transaction_id: 'txn-2',
      status: 'success',
      amount: 20,
      wallet_balance: 65,
    })

    fireEvent.click(await screen.findByRole('button', { name: /continue to payment/i }))
    fireEvent.click(await screen.findByRole('button', { name: /^pay \$20\.00$/i }))

    expect(await screen.findByText('Top-up successful')).toBeInTheDocument()
    expect(screen.getByText('$65.00')).toBeInTheDocument()
  })

  it('shows a decline banner and does not advance when Stripe returns an error', async () => {
    await loginAsParent()
    vi.mocked(walletTopUpApi.startParentTopUp).mockResolvedValue({
      transaction_id: 'txn-3',
      client_secret: 'pi_789_secret',
      publishable_key: 'pk_test_123',
      amount: 20,
    })
    mockConfirmPayment.mockResolvedValue({
      error: { message: 'Your card was declined.' },
    })

    fireEvent.click(await screen.findByRole('button', { name: /continue to payment/i }))
    fireEvent.click(await screen.findByRole('button', { name: /^pay \$20\.00$/i }))

    expect(await screen.findByText('Your card was declined.')).toBeInTheDocument()
    expect(screen.queryByText('Top-up successful')).not.toBeInTheDocument()
  })

  it('shows the failure result when the webhook resolves the transaction as failed', async () => {
    await loginAsParent()
    vi.mocked(walletTopUpApi.startParentTopUp).mockResolvedValue({
      transaction_id: 'txn-4',
      client_secret: 'pi_999_secret',
      publishable_key: 'pk_test_123',
      amount: 20,
    })
    mockConfirmPayment.mockResolvedValue({})
    vi.mocked(walletTopUpApi.getParentTopUpStatus).mockResolvedValue({
      transaction_id: 'txn-4',
      status: 'failed',
      amount: 20,
      wallet_balance: null,
    })

    fireEvent.click(await screen.findByRole('button', { name: /continue to payment/i }))
    fireEvent.click(await screen.findByRole('button', { name: /^pay \$20\.00$/i }))

    expect(await screen.findByText('Top-up failed')).toBeInTheDocument()
  })

  it('lets the user manually check status again after the bounded poll gives up, and reaches a result', async () => {
    // Review round 4, Major finding: without a way to check again, a
    // transaction outlasting the bounded poll had no code path left
    // that ever asked the backend about it again — the backend's own
    // lazy-reconciliation window would never actually be reached.
    vi.useFakeTimers({ shouldAdvanceTime: true })
    await loginAsParent()
    vi.mocked(walletTopUpApi.startParentTopUp).mockResolvedValue({
      transaction_id: 'txn-5',
      client_secret: 'pi_555_secret',
      publishable_key: 'pk_test_123',
      amount: 20,
    })
    mockConfirmPayment.mockResolvedValue({})
    vi.mocked(walletTopUpApi.getParentTopUpStatus).mockResolvedValue({
      transaction_id: 'txn-5',
      status: 'pending',
      amount: 20,
      wallet_balance: null,
    })

    fireEvent.click(await screen.findByRole('button', { name: /continue to payment/i }))
    fireEvent.click(await screen.findByRole('button', { name: /^pay \$20\.00$/i }))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500 * 6 + 100)
    })
    expect(await screen.findByText('Still processing…')).toBeInTheDocument()

    vi.mocked(walletTopUpApi.getParentTopUpStatus).mockResolvedValue({
      transaction_id: 'txn-5',
      status: 'success',
      amount: 20,
      wallet_balance: 85,
    })
    fireEvent.click(screen.getByRole('button', { name: /check status/i }))

    expect(await screen.findByText('Top-up successful')).toBeInTheDocument()
    vi.useRealTimers()
  })
})

describe('WalletTopUpScreen (Student)', () => {
  it('starts a student top-up against the student-scoped endpoint', async () => {
    await loginAsStudent()
    vi.mocked(walletTopUpApi.startStudentTopUp).mockResolvedValue({
      transaction_id: 'txn-s1',
      client_secret: 'pi_s1_secret',
      publishable_key: 'pk_test_123',
      amount: 20,
    })

    fireEvent.click(await screen.findByRole('button', { name: /continue to payment/i }))

    expect(await screen.findByTestId('payment-element')).toBeInTheDocument()
    expect(walletTopUpApi.startStudentTopUp).toHaveBeenCalledWith(20)
    expect(walletTopUpApi.startParentTopUp).not.toHaveBeenCalled()
  })
})
