import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthContext'
import * as authApi from '@/features/auth/api'
import * as permissionsApi from '@/features/permissions/api'
import * as productsApi from '@/features/products/api'
import { StudentAuthProvider } from '@/features/student-auth/StudentAuthContext'
import { routes } from './index'

vi.mock('@/features/auth/api')
vi.mock('@/features/products/api')
vi.mock('@/features/permissions/api')

const SCHOOL_ADMIN_USER = {
  id: 'u1',
  full_name: 'Priya Nair',
  email: 'priya@example.com',
  role: 'school_admin' as const,
  school_id: 's1',
  school_name: 'Greenvale Primary',
}

async function renderAuthenticatedAt(path: string) {
  vi.mocked(authApi.login).mockResolvedValue({
    access_token: 'a-real-jwt',
    token_type: 'bearer',
    user: SCHOOL_ADMIN_USER,
  })
  vi.mocked(permissionsApi.getMyPermissions).mockResolvedValue([])
  // A successful edit navigates back to the products list, and a
  // successful create navigates straight to the edit screen — both
  // mount a screen that fetches for real; mocked with sensible
  // defaults so the auto-mocked function doesn't return undefined and
  // throw on `.then()`. Per-test mocks (set before calling this
  // helper) override these.
  vi.mocked(productsApi.listProducts).mockResolvedValue([])
  vi.mocked(productsApi.getProduct).mockResolvedValue(PRODUCT)
  const router = createMemoryRouter(routes, { initialEntries: ['/login'] })
  render(
    <AuthProvider>
      <StudentAuthProvider>
        <RouterProvider router={router} />
      </StudentAuthProvider>
    </AuthProvider>,
  )
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: SCHOOL_ADMIN_USER.email } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'whatever' } })
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: /sign in/i })).not.toBeInTheDocument(),
  )

  await act(async () => {
    await router.navigate(path)
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

const PRODUCT: productsApi.Product = {
  id: 'p1',
  name: 'Chicken Wrap',
  category_name: 'Hot Food',
  description: 'Tasty',
  base_price: '6.50',
  availability_status: 'available',
  variants: [{ id: 'v1', variant_label: 'Regular', price: '6.50' }],
  images: [],
}

describe('ProductFormScreen', () => {
  it('creates a product with a category and one variant (Scenario 1)', async () => {
    vi.mocked(productsApi.createProduct).mockResolvedValue(PRODUCT)

    await renderAuthenticatedAt('/school-admin/products/new')
    await screen.findByText('Add a product')

    fireEvent.change(screen.getByPlaceholderText('e.g. Chicken Wrap'), {
      target: { value: 'Chicken Wrap' },
    })
    fireEvent.change(screen.getByPlaceholderText('e.g. Hot Food'), {
      target: { value: 'Hot Food' },
    })
    fireEvent.change(screen.getByLabelText('Base price'), {
      target: { value: '6.50' },
    })
    fireEvent.change(screen.getByLabelText('Variant name'), { target: { value: 'Regular' } })
    fireEvent.change(screen.getByLabelText('Variant price'), { target: { value: '6.50' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save product' }))

    await waitFor(() =>
      expect(productsApi.createProduct).toHaveBeenCalledWith({
        name: 'Chicken Wrap',
        category_name: 'Hot Food',
        description: null,
        base_price: '6.50',
        variants: [{ id: undefined, variant_label: 'Regular', price: '6.50' }],
      }),
    )
  })

  it('supports adding a second variant, each carrying its own price (Scenario 2)', async () => {
    vi.mocked(productsApi.createProduct).mockResolvedValue(PRODUCT)

    await renderAuthenticatedAt('/school-admin/products/new')
    await screen.findByText('Add a product')

    fireEvent.click(screen.getByRole('button', { name: '+ Add variant' }))

    const nameInputs = screen.getAllByLabelText('Variant name')
    const priceInputs = screen.getAllByLabelText('Variant price')
    expect(nameInputs).toHaveLength(2)
    fireEvent.change(nameInputs[0], { target: { value: 'Small' } })
    fireEvent.change(priceInputs[0], { target: { value: '2.00' } })
    fireEvent.change(nameInputs[1], { target: { value: 'Large' } })
    fireEvent.change(priceInputs[1], { target: { value: '4.00' } })

    fireEvent.change(screen.getByPlaceholderText('e.g. Chicken Wrap'), {
      target: { value: 'Wrap' },
    })
    fireEvent.change(screen.getByPlaceholderText('e.g. Hot Food'), {
      target: { value: 'Hot Food' },
    })
    fireEvent.change(screen.getByLabelText('Base price'), {
      target: { value: '5.00' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save product' }))

    await waitFor(() =>
      expect(productsApi.createProduct).toHaveBeenCalledWith(
        expect.objectContaining({
          variants: [
            { id: undefined, variant_label: 'Small', price: '2.00' },
            { id: undefined, variant_label: 'Large', price: '4.00' },
          ],
        }),
      ),
    )
  })

  it('shows an inline error when a variant is missing a price', async () => {
    vi.mocked(productsApi.createProduct).mockRejectedValue({
      response: {
        data: { errors: 'Every variant needs a price. Add a price to "Large" or remove it.' },
      },
    })

    await renderAuthenticatedAt('/school-admin/products/new')
    await screen.findByText('Add a product')

    fireEvent.change(screen.getByPlaceholderText('e.g. Chicken Wrap'), {
      target: { value: 'Wrap' },
    })
    fireEvent.change(screen.getByPlaceholderText('e.g. Hot Food'), {
      target: { value: 'Hot Food' },
    })
    fireEvent.change(screen.getByLabelText('Base price'), {
      target: { value: '5.00' },
    })
    fireEvent.change(screen.getByLabelText('Variant name'), { target: { value: 'Large' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save product' }))

    expect(
      await screen.findByText('Every variant needs a price. Add a price to "Large" or remove it.'),
    ).toBeInTheDocument()
  })

  it('the remove-variant button is hidden when only one variant remains', async () => {
    await renderAuthenticatedAt('/school-admin/products/new')
    await screen.findByText('Add a product')

    expect(screen.queryByRole('button', { name: 'Remove variant' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '+ Add variant' }))
    expect(screen.getAllByRole('button', { name: 'Remove variant' })).toHaveLength(2)

    fireEvent.click(screen.getAllByRole('button', { name: 'Remove variant' })[0])
    expect(screen.queryByRole('button', { name: 'Remove variant' })).not.toBeInTheDocument()
  })

  it('loads and edits an existing product, preserving each variant id', async () => {
    vi.mocked(productsApi.getProduct).mockResolvedValue(PRODUCT)
    vi.mocked(productsApi.updateProduct).mockResolvedValue(PRODUCT)

    await renderAuthenticatedAt('/school-admin/products/p1/edit')
    await screen.findByText('Edit product')

    const nameInput = screen.getByPlaceholderText('e.g. Chicken Wrap') as HTMLInputElement
    expect(nameInput.value).toBe('Chicken Wrap')
    fireEvent.change(nameInput, { target: { value: 'Chicken Wrap Deluxe' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save product' }))

    await waitFor(() =>
      expect(productsApi.updateProduct).toHaveBeenCalledWith('p1', {
        name: 'Chicken Wrap Deluxe',
        category_name: 'Hot Food',
        description: 'Tasty',
        base_price: '6.50',
        variants: [{ id: 'v1', variant_label: 'Regular', price: '6.50' }],
      }),
    )
  })

  it('uploads a valid image on the edit screen', async () => {
    vi.mocked(productsApi.getProduct).mockResolvedValue(PRODUCT)
    vi.mocked(productsApi.uploadProductImage).mockResolvedValue({
      id: 'img1',
      image_url: 'https://example.com/img1.png',
      display_order: 0,
    })

    await renderAuthenticatedAt('/school-admin/products/p1/edit')
    await screen.findByText('Edit product')

    const file = new File(['x'.repeat(100)], 'photo.png', { type: 'image/png' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => expect(productsApi.uploadProductImage).toHaveBeenCalledWith('p1', file))
  })

  it('rejects an oversized image before ever calling the API (EC-032)', async () => {
    vi.mocked(productsApi.getProduct).mockResolvedValue(PRODUCT)

    await renderAuthenticatedAt('/school-admin/products/p1/edit')
    await screen.findByText('Edit product')

    const oversized = new File(['x'.repeat(2 * 1024 * 1024 + 1)], 'big.png', {
      type: 'image/png',
    })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [oversized] } })

    expect(
      await screen.findByText('This image is larger than 2 MB. Choose a smaller file.'),
    ).toBeInTheDocument()
    expect(productsApi.uploadProductImage).not.toHaveBeenCalled()
  })

  it('rejects an invalid file type before ever calling the API (EC-032)', async () => {
    vi.mocked(productsApi.getProduct).mockResolvedValue(PRODUCT)

    await renderAuthenticatedAt('/school-admin/products/p1/edit')
    await screen.findByText('Edit product')

    const file = new File(['not an image'], 'virus.exe', { type: 'application/octet-stream' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [file] } })

    expect(await screen.findByText('Only PNG or JPG images are allowed.')).toBeInTheDocument()
    expect(productsApi.uploadProductImage).not.toHaveBeenCalled()
  })

  it('the create form has no image uploader yet (save first, then add images)', async () => {
    await renderAuthenticatedAt('/school-admin/products/new')
    await screen.findByText('Add a product')

    expect(document.querySelector('input[type="file"]')).not.toBeInTheDocument()
    expect(
      screen.getByText('Save the product first, then add images on the edit screen.'),
    ).toBeInTheDocument()
  })
})
