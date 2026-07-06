import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthContext'
import { StudentAuthProvider } from '@/features/student-auth/StudentAuthContext'
import * as studentAuthApi from '@/features/student-auth/api'
import * as cartApi from '@/features/cart/api'
import { routes } from './index'

vi.mock('@/features/student-auth/api')
vi.mock('@/features/cart/api')

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
  await waitFor(() => expect(screen.getByText(/canteen home coming soon/i)).toBeInTheDocument())
  await act(async () => {
    await router.navigate(path)
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('CartScreen (FR-035)', () => {
  it('shows the empty state when the cart has nothing in it', async () => {
    vi.mocked(cartApi.getCart).mockResolvedValue({ items: [], total: '0' })

    await loginAsStudentAt('/student/cart')

    expect(await screen.findByText('Your cart is empty')).toBeInTheDocument()
  })

  it('lists cart lines with their variant, quantity, and resolved price, plus a total', async () => {
    vi.mocked(cartApi.getCart).mockResolvedValue({
      items: [
        {
          id: 'ci1',
          item_type: 'product',
          product_id: 'p1',
          combo_id: null,
          variant_id: 'v1',
          name: 'Chicken Wrap',
          variant_label: 'Regular',
          quantity: 1,
          unit_price: '6.50',
          line_total: '6.50',
        },
        {
          id: 'ci2',
          item_type: 'product',
          product_id: 'p2',
          combo_id: null,
          variant_id: null,
          name: 'Apple Juice',
          variant_label: null,
          quantity: 2,
          unit_price: '2.50',
          line_total: '5.00',
        },
      ],
      total: '11.50',
    })

    await loginAsStudentAt('/student/cart')

    expect(await screen.findByText('Chicken Wrap')).toBeInTheDocument()
    expect(screen.getByText('Regular')).toBeInTheDocument()
    expect(screen.getByText('Apple Juice')).toBeInTheDocument()
    expect(screen.getByText('Qty 2')).toBeInTheDocument()
    const totals = screen.getAllByText('$11.50')
    expect(totals.length).toBeGreaterThan(0)
  })

  it('shows an error state when the cart fails to load', async () => {
    vi.mocked(cartApi.getCart).mockRejectedValue({ response: undefined })

    await loginAsStudentAt('/student/cart')

    expect(
      await screen.findByText('Something went wrong. Please check your connection and try again.'),
    ).toBeInTheDocument()
  })
})
