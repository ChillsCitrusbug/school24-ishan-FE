import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AppShell, Sidebar, Topbar, MobileTabBar, IconButton, Button, Card, Field, Input, Checkbox, Banner } from '@/components'
import { createRole, getRole, updateRole, type ModulePermissionInput, type PermissionModuleValue } from '@/features/roles/api'
import { useAuth } from '@/features/auth/useAuth'
import { extractErrorMessage } from '@/lib/api-error'
import { schoolAdminNavGroups, schoolAdminTabs } from './schoolAdminNav'
import { MODULES, OPERATIONS } from './roleModules'

function initialsOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

type Matrix = Record<PermissionModuleValue, Record<string, boolean>>

function emptyMatrix(): Matrix {
  const matrix = {} as Matrix
  for (const m of MODULES) {
    matrix[m.value] = { can_add: false, can_edit: false, can_delete: false, can_list: false }
  }
  return matrix
}

/**
 * SC-038 · Create / Edit Role Builder (module × Add/Edit/Delete/Listing) — SA (FR-017/FR-018).
 *
 * Reuses the approved Sc038RoleBuilder.tsx structure/components as-is
 * (Step 16) for BOTH create and edit — the design's own default demo
 * state is actually "Edit role" (pre-filled name/matrix), matching its
 * "FR-017-018" tag; FR-017 built the create flow, FR-018 (this change)
 * adds edit by loading an existing role via the `:roleId` route param.
 * The design's own module/operation list (`staffroles.ts`) is a
 * 5-module placeholder that doesn't match the ticket/dbml/Gherkin's real
 * 4x4 set — the real set is used here (see
 * docs/design/field-reconciliation/FR-017.md item 1); the button copy
 * ("Save role") is kept verbatim from the approved design.
 */
export function RoleBuilderScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { roleId } = useParams<{ roleId?: string }>()
  const isEditMode = Boolean(roleId)
  const [name, setName] = useState('')
  const [matrix, setMatrix] = useState<Matrix>(emptyMatrix)
  const [error, setError] = useState<string | null>(null)
  // Separate from `error` (submit-time failures, e.g. duplicate name) —
  // a *load* failure must hide the form entirely (there's nothing valid
  // to edit), while a submit failure must keep the form visible with the
  // user's entered data so they can fix and retry.
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(isEditMode)

  useEffect(() => {
    if (!roleId) return
    let cancelled = false
    getRole(roleId)
      .then((role) => {
        if (cancelled) return
        setName(role.name)
        setMatrix((m) => {
          const next = { ...m }
          for (const p of role.permissions) {
            next[p.module] = {
              can_add: p.can_add,
              can_edit: p.can_edit,
              can_delete: p.can_delete,
              can_list: p.can_list,
            }
          }
          return next
        })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setLoadError(extractErrorMessage(err, 'This role could not be found.'))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [roleId])

  function toggle(module: PermissionModuleValue, key: string, value: boolean) {
    setMatrix((m) => ({ ...m, [module]: { ...m[module], [key]: value } }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Role name is required.')
      return
    }

    const permissions: ModulePermissionInput[] = MODULES.map((m) => ({
      module: m.value,
      ...matrix[m.value],
    }))

    setIsSubmitting(true)
    try {
      if (roleId) {
        await updateRole(roleId, name.trim(), permissions)
      } else {
        await createRole(name.trim(), permissions)
      }
      navigate('/school-admin/roles', { replace: true })
    } catch (err) {
      setError(extractErrorMessage(err, 'A role with this name already exists.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AppShell
      sidebar={
        <Sidebar
          brandTitle="School24"
          brandSubtitle={user?.school_name ?? undefined}
          groups={schoolAdminNavGroups()}
          user={{
            initials: user ? initialsOf(user.full_name) : '',
            name: user?.full_name ?? '',
            role: 'School Admin',
          }}
        />
      }
      topbar={
        <Topbar
          searchPlaceholder="Search…"
          right={<IconButton icon="bell" label="Notifications" />}
        />
      }
      mobileNav={<MobileTabBar items={schoolAdminTabs()} />}
    >
      <div className="mx-auto max-w-2xl">
        <Button
          variant="ghost"
          size="sm"
          leadingIcon="chevronLeft"
          className="mb-3"
          onClick={() => navigate('/school-admin/roles')}
        >
          Roles
        </Button>
        <h1 className="text-2xl font-bold text-ink">{isEditMode ? 'Edit role' : 'Create role'}</h1>
        <p className="mt-0.5 text-sm text-muted">Choose which modules and actions this role can use.</p>

        {(error || loadError) && (
          <div className="mt-4">
            <Banner tone="danger">{error ?? loadError}</Banner>
          </div>
        )}

        {isLoading ? (
          <div role="status" aria-label="Loading role" className="mt-10 text-center text-sm text-muted">
            Loading…
          </div>
        ) : loadError ? null : (
          <form onSubmit={handleSubmit}>
            <Card className="mt-5 p-5">
              <Field label="Role name">
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
            </Card>

            <Card className="mt-4">
              <div className="border-b border-line px-5 py-3 text-sm font-semibold text-ink">
                Permissions
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-xs text-muted">
                      <th className="px-5 py-2.5 text-left font-medium">Module</th>
                      {OPERATIONS.map((op) => (
                        <th key={op.key} className="px-2 py-2.5 text-center font-medium">
                          {op.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {MODULES.map((mod) => (
                      <tr key={mod.value}>
                        <td className="px-5 py-3 font-medium text-ink">{mod.label}</td>
                        {OPERATIONS.map((op) => (
                          <td key={op.key} className="px-2 py-3">
                            <div className="flex justify-center">
                              <Checkbox
                                label={`${mod.label}: ${op.label}`}
                                checked={matrix[mod.value][op.key]}
                                onChange={(v) => toggle(mod.value, op.key, v)}
                              />
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <div className="mt-4 flex gap-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving…' : 'Save role'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/school-admin/roles')}
              >
                Cancel
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted">Changes apply immediately to everyone with this role.</p>
          </form>
        )}
      </div>
    </AppShell>
  )
}
