import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthContext'
import * as authApi from '@/features/auth/api'
import * as childSelectionApi from '@/features/child-selection/api'
import * as myChildrenApi from '@/features/my-children/api'
import { StudentAuthProvider } from '@/features/student-auth/StudentAuthContext'
import * as walletTopUpApi from '@/features/wallet-topup/api'
import { routes } from './index'

vi.mock('@/features/auth/api')
vi.mock('@/features/child-selection/api')
vi.mock('@/features/my-children/api')
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

const PARENT_USER = {
  id: 'u1',
  full_name: 'Sarah Thompson',
  email: 'sarah@example.com',
  role: 'parent' as const,
  school_id: null,
  school_name: null,
}

const NOAH: childSelectionApi.ActiveChild = {
  student_id: 'st1',
  student_id_code: 'S-41880',
  full_name: 'Noah Thompson',
  class_name: 'Year 1 · 1A',
  school_name: 'Greenvale Primary',
  wallet_balance: 12.5,
}

async function renderAuthenticatedAt(path: string) {
  vi.mocked(authApi.login).mockResolvedValue({
    access_token: 'a-real-jwt',
    token_type: 'bearer',
    user: PARENT_USER,
  })
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
  await waitFor(() => expect(screen.getByText('Dashboard coming soon')).toBeInTheDocument())
  await act(async () => {
    await router.navigate(path)
  })
}

afterEach(() => {
  vi.restoreAllMocks()
  mockConfirmPayment.mockReset()
})

describe('ChildWalletTopUpScreen (FR-029)', () => {
  it('shows an error when no child was selected', async () => {
    vi.mocked(childSelectionApi.getActiveContext).mockResolvedValue([NOAH])

    await renderAuthenticatedAt('/parent/wallet/top-up-child')

    expect(await screen.findByText('No child was selected. Please choose a child first.')).toBeInTheDocument()
  })

  it('shows an error when the childId is not one of the parent\'s approved children', async () => {
    vi.mocked(childSelectionApi.getActiveContext).mockResolvedValue([])

    await renderAuthenticatedAt('/parent/wallet/top-up-child?childId=st1')

    expect(
      await screen.findByText(
        "You can only top up a child's wallet once your link to them is approved.",
      ),
    ).toBeInTheDocument()
  })

  it('shows the amount step with the child\'s own name in the heading', async () => {
    vi.mocked(childSelectionApi.getActiveContext).mockResolvedValue([NOAH])

    await renderAuthenticatedAt('/parent/wallet/top-up-child?childId=st1')

    expect(await screen.findByRole('heading', { name: "Top up Noah Thompson's wallet" })).toBeInTheDocument()
    expect(screen.getAllByText('$20.00').length).toBeGreaterThan(0)
  })

  it('starts a child top-up against the child-scoped endpoint', async () => {
    vi.mocked(childSelectionApi.getActiveContext).mockResolvedValue([NOAH])
    vi.mocked(walletTopUpApi.startChildTopUp).mockResolvedValue({
      transaction_id: 'txn-c1',
      client_secret: 'pi_c1_secret',
      publishable_key: 'pk_test_123',
      amount: 20,
    })

    await renderAuthenticatedAt('/parent/wallet/top-up-child?childId=st1')
    fireEvent.click(await screen.findByRole('button', { name: /continue to payment/i }))

    expect(await screen.findByTestId('payment-element')).toBeInTheDocument()
    expect(walletTopUpApi.startChildTopUp).toHaveBeenCalledWith('st1', 20)
  })

  it('confirms payment and shows the success result with the child\'s own name', async () => {
    vi.mocked(childSelectionApi.getActiveContext).mockResolvedValue([NOAH])
    vi.mocked(walletTopUpApi.startChildTopUp).mockResolvedValue({
      transaction_id: 'txn-c2',
      client_secret: 'pi_c2_secret',
      publishable_key: 'pk_test_123',
      amount: 20,
    })
    mockConfirmPayment.mockResolvedValue({})
    vi.mocked(walletTopUpApi.getChildTopUpStatus).mockResolvedValue({
      transaction_id: 'txn-c2',
      status: 'success',
      amount: 20,
      wallet_balance: 32.5,
    })

    await renderAuthenticatedAt('/parent/wallet/top-up-child?childId=st1')
    fireEvent.click(await screen.findByRole('button', { name: /continue to payment/i }))
    fireEvent.click(await screen.findByRole('button', { name: /^pay \$20\.00$/i }))

    expect(await screen.findByText('Top-up successful')).toBeInTheDocument()
    expect(screen.getByText("$20.00 has been added to Noah Thompson's wallet.")).toBeInTheDocument()
    expect(walletTopUpApi.getChildTopUpStatus).toHaveBeenCalledWith('st1', 'txn-c2')
  })

  it('shows the failure result when the webhook resolves the transaction as failed', async () => {
    vi.mocked(childSelectionApi.getActiveContext).mockResolvedValue([NOAH])
    vi.mocked(walletTopUpApi.startChildTopUp).mockResolvedValue({
      transaction_id: 'txn-c3',
      client_secret: 'pi_c3_secret',
      publishable_key: 'pk_test_123',
      amount: 20,
    })
    mockConfirmPayment.mockResolvedValue({})
    vi.mocked(walletTopUpApi.getChildTopUpStatus).mockResolvedValue({
      transaction_id: 'txn-c3',
      status: 'failed',
      amount: 20,
      wallet_balance: null,
    })

    await renderAuthenticatedAt('/parent/wallet/top-up-child?childId=st1')
    fireEvent.click(await screen.findByRole('button', { name: /continue to payment/i }))
    fireEvent.click(await screen.findByRole('button', { name: /^pay \$20\.00$/i }))

    expect(await screen.findByText('Top-up failed')).toBeInTheDocument()
  })

  it('"Back to wallet" (Done) navigates back to My Children', async () => {
    vi.mocked(childSelectionApi.getActiveContext).mockResolvedValue([NOAH])
    vi.mocked(walletTopUpApi.startChildTopUp).mockResolvedValue({
      transaction_id: 'txn-c4',
      client_secret: 'pi_c4_secret',
      publishable_key: 'pk_test_123',
      amount: 20,
    })
    mockConfirmPayment.mockResolvedValue({})
    vi.mocked(walletTopUpApi.getChildTopUpStatus).mockResolvedValue({
      transaction_id: 'txn-c4',
      status: 'success',
      amount: 20,
      wallet_balance: 32.5,
    })
    vi.mocked(myChildrenApi.listMyChildren).mockResolvedValue([])

    await renderAuthenticatedAt('/parent/wallet/top-up-child?childId=st1')
    fireEvent.click(await screen.findByRole('button', { name: /continue to payment/i }))
    fireEvent.click(await screen.findByRole('button', { name: /^pay \$20\.00$/i }))
    await screen.findByText('Top-up successful')

    fireEvent.click(screen.getByRole('button', { name: /back to wallet/i }))

    expect(await screen.findByRole('heading', { name: 'My children' })).toBeInTheDocument()
  })
})
