import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthContext'
import { StudentAuthProvider } from '@/features/student-auth/StudentAuthContext'
import * as studentAuthApi from '@/features/student-auth/api'
import { routes } from './index'

vi.mock('@/features/student-auth/api')

async function loginAsStudentAndNavigateWithState(state: unknown) {
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
  await waitFor(() => expect(screen.getByText(/canteen home coming soon/i)).toBeInTheDocument())
  await act(async () => {
    router.navigate('/student/checkout/receipt', { state })
  })
  return router
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ReceiptScreen (FR-036)', () => {
  it('shows the just-placed order passed via navigation state', async () => {
    await loginAsStudentAndNavigateWithState({
      order: {
        id: 'o1',
        display_id: 'ORD-ABCD1234',
        status: 'pending',
        total_amount: '13.00',
        placed_at: '2026-07-06T12:00:00Z',
        funding_wallet_id: 'w1',
        items: [
          { name: 'Chicken Wrap', variant_label: 'Large', quantity: 2, unit_price: '6.50', line_total: '13.00' },
        ],
      },
    })

    expect(await screen.findByText('Order confirmed')).toBeInTheDocument()
    expect(screen.getByText('ORD-ABCD1234')).toBeInTheDocument()
    expect(screen.getByText('Pending — show at counter')).toBeInTheDocument()
    expect(screen.getByText(/Chicken Wrap/)).toBeInTheDocument()
    expect(screen.getByText(/Large/)).toBeInTheDocument()
    expect(screen.getAllByText('$13.00').length).toBeGreaterThan(0)
  })

  it('shows a real error state when no order data is available (e.g. a direct refresh)', async () => {
    await loginAsStudentAndNavigateWithState(null)

    expect(
      await screen.findByText(/No order details to show/),
    ).toBeInTheDocument()
  })
})
