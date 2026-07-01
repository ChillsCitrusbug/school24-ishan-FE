import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RequireRole, type Role } from './guards'

describe('RequireRole', () => {
  it('passes children through unchanged (structure-only placeholder, no real auth check yet)', () => {
    const { getByText } = render(
      <RequireRole allow={['platform_admin']}>
        <div>protected content</div>
      </RequireRole>,
    )

    expect(getByText('protected content')).toBeInTheDocument()
  })

  it('renders children for every canonical user_role value from DATABASE_SCHEMA.dbml', () => {
    const allRoles: Role[] = ['platform_admin', 'school_admin', 'staff', 'parent']

    for (const role of allRoles) {
      const { getByText, unmount } = render(
        <RequireRole allow={[role]}>
          <div>{role} content</div>
        </RequireRole>,
      )

      expect(getByText(`${role} content`)).toBeInTheDocument()
      unmount()
    }
  })
})
