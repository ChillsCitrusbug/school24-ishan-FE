import { render, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthContext'
import {
  BlockedPage,
  MaintenancePage,
  NotFoundPage,
  ServerErrorPage,
  SessionExpiredPage,
} from './SystemPages'

function renderPage(element: ReactElement) {
  const router = createMemoryRouter([{ path: '/', element }], { initialEntries: ['/'] })
  return render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  )
}

describe('system pages', () => {
  it('SC-009 renders 404', () => {
    renderPage(<NotFoundPage />)
    expect(screen.getByText('404')).toBeInTheDocument()
    expect(screen.getByText('Page not found')).toBeInTheDocument()
  })

  it('SC-010 renders 500', () => {
    renderPage(<ServerErrorPage />)
    expect(screen.getByText('500')).toBeInTheDocument()
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('SC-011 renders maintenance', () => {
    renderPage(<MaintenancePage />)
    expect(screen.getByText('We’ll be back soon')).toBeInTheDocument()
  })

  it('SC-012 renders the expired-session state by default', () => {
    renderPage(<SessionExpiredPage />)
    expect(screen.getByText('Your session expired')).toBeInTheDocument()
  })

  it('SC-012 renders the logged-out state', () => {
    renderPage(<SessionExpiredPage state="logged-out" />)
    expect(screen.getByText('You’re signed out')).toBeInTheDocument()
  })

  it('SC-013 renders the deactivated state by default', () => {
    renderPage(<BlockedPage />)
    expect(screen.getByText('Account deactivated')).toBeInTheDocument()
  })

  it('SC-013 renders the suspended state', () => {
    renderPage(<BlockedPage state="suspended" />)
    expect(screen.getByText('School access suspended')).toBeInTheDocument()
  })
})
