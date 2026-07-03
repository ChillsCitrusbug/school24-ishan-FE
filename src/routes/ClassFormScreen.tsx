import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  AppShell,
  Sidebar,
  Topbar,
  MobileTabBar,
  IconButton,
  Button,
  Card,
  Field,
  Input,
  Banner,
  Spinner,
} from '@/components'
import { createClass, getClass, updateClass } from '@/features/classes/api'
import { useAuth } from '@/features/auth/useAuth'
import { extractErrorMessage } from '@/lib/api-error'
import { schoolAdminNavGroups, schoolAdminTabs } from './schoolAdminNav'

function initialsOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

/**
 * SC-025 · Create / Edit Class form — School Admin (FR-011).
 * Reuses the approved Sc025ClassForm.tsx structure for BOTH create and
 * edit, matching how RoleBuilderScreen.tsx (FR-017/018) already handles
 * the same "one shared form component" shape. Field-reconciliation
 * decision #1: the mock's own "Year level"/"Class teacher" fields have
 * no backing DB columns (`classes` has only `label`) — dropped, not
 * invented; only "Class label" is a real field.
 */
export function ClassFormScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { classId } = useParams<{ classId?: string }>()
  const isEditMode = Boolean(classId)
  const [label, setLabel] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(isEditMode)

  useEffect(() => {
    if (!classId) return
    let cancelled = false
    getClass(classId)
      .then((result) => {
        if (!cancelled) setLabel(result.label)
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(extractErrorMessage(err, 'This class could not be found.'))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [classId])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      if (isEditMode && classId) {
        await updateClass(classId, { label })
      } else {
        await createClass({ label })
      }
      navigate('/school-admin/classes')
    } catch (err) {
      setError(extractErrorMessage(err, 'Unable to save this class.'))
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
          groups={schoolAdminNavGroups('classes')}
          user={{
            initials: user ? initialsOf(user.full_name) : '',
            name: user?.full_name ?? '',
            role: 'School Admin',
          }}
        />
      }
      topbar={<Topbar right={<IconButton icon="bell" label="Notifications" />} />}
      mobileNav={<MobileTabBar items={schoolAdminTabs('classes')} />}
    >
      <div className="mx-auto max-w-lg">
        <Button
          variant="ghost"
          size="sm"
          leadingIcon="chevronLeft"
          className="mb-3"
          onClick={() => navigate('/school-admin/classes')}
        >
          Classes
        </Button>

        {isLoading ? (
          <div role="status" aria-label="Loading class" className="mt-10 flex justify-center text-muted">
            <Spinner className="h-6 w-6" />
          </div>
        ) : loadError ? (
          <Card className="p-5">
            <Banner tone="danger">{loadError}</Banner>
          </Card>
        ) : (
          <Card className="p-5">
            <h1 className="text-xl font-bold text-ink">
              {isEditMode ? 'Edit class' : 'Create a class'}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {isEditMode
                ? "Update this class's label."
                : 'Add a class so you can enrol students into it.'}
            </p>

            <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
              {error && <Banner tone="danger">{error}</Banner>}
              <Field label="Class label">
                <Input
                  placeholder="e.g. Room 4B"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  required
                />
              </Field>
              <div className="flex gap-2">
                <Button type="submit" loading={isSubmitting}>
                  Save class
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigate('/school-admin/classes')}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}
      </div>
    </AppShell>
  )
}
