import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AppLayout } from './AppLayout'

describe('AppLayout', () => {
  it('renders the shared AppShell/Sidebar/Topbar/MobileTabBar without crashing', () => {
    const router = createMemoryRouter([
      { path: '/', element: <AppLayout />, children: [{ index: true, element: null }] },
    ])

    const { container } = render(<RouterProvider router={router} />)

    expect(container).toBeInTheDocument()
    // Sidebar's brand title proves the design-system shell actually composed,
    // not just that some element rendered.
    expect(container.textContent).toContain('School24')
  })
})
