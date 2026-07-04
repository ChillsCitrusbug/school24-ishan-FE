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
  Select,
  Banner,
  ResultHero,
  Spinner,
} from '@/components'
import {
  createStudent,
  getStudent,
  updateStudent,
  type EnrolledStudent,
} from '@/features/students/api'
import { listClasses, type SchoolClass } from '@/features/classes/api'
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
 * SC-029/SC-030 · Enrol / Edit Student — School Admin (FR-012). Reuses
 * the approved Sc029Enrol.tsx/Sc030EditStudent.tsx structure for BOTH
 * create and edit (same "one shared form component" shape as
 * ClassFormScreen.tsx/StaffFormScreen.tsx). Student ID and temp
 * password are always system-generated (field-reconciliation decision
 * #3) — no such fields on this form; the create flow's own success
 * state is the ONLY place either plaintext value is ever shown
 * (decision #13).
 */
export function StudentFormScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { studentId } = useParams<{ studentId?: string }>()
  const isEditMode = Boolean(studentId)
  const [fullName, setFullName] = useState('')
  const [classId, setClassId] = useState('')
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [successState, setSuccessState] = useState<EnrolledStudent | null>(null)

  useEffect(() => {
    let cancelled = false
    const loaders: Promise<unknown>[] = [
      listClasses().then((result) => {
        if (!cancelled) {
          setClasses(result)
          if (!isEditMode && result.length > 0) setClassId((prev) => prev || result[0].id)
        }
      }),
    ]
    if (studentId) {
      loaders.push(
        getStudent(studentId).then((result) => {
          if (!cancelled) {
            setFullName(result.full_name)
            setClassId(result.class_id)
          }
        }),
      )
    }
    Promise.all(loaders)
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(extractErrorMessage(err, 'This student could not be found.'))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [studentId, isEditMode])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      if (isEditMode && studentId) {
        await updateStudent(studentId, { full_name: fullName, class_id: classId })
        navigate('/school-admin/students')
      } else {
        const result = await createStudent({ full_name: fullName, class_id: classId })
        setSuccessState(result)
      }
    } catch (err) {
      setError(extractErrorMessage(err, 'Unable to save this student.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  function enrolAnother() {
    setSuccessState(null)
    setFullName('')
  }

  return (
    <AppShell
      sidebar={
        <Sidebar
          brandTitle="School24"
          brandSubtitle={user?.school_name ?? undefined}
          groups={schoolAdminNavGroups('students')}
          user={{
            initials: user ? initialsOf(user.full_name) : '',
            name: user?.full_name ?? '',
            role: 'School Admin',
          }}
        />
      }
      topbar={<Topbar right={<IconButton icon="bell" label="Notifications" />} />}
      mobileNav={<MobileTabBar items={schoolAdminTabs('students')} />}
    >
      <div className="mx-auto max-w-lg">
        <Button
          variant="ghost"
          size="sm"
          leadingIcon="chevronLeft"
          className="mb-3"
          onClick={() => navigate('/school-admin/students')}
        >
          Students
        </Button>

        {isLoading ? (
          <div role="status" aria-label="Loading" className="mt-10 flex justify-center text-muted">
            <Spinner className="h-6 w-6" />
          </div>
        ) : loadError ? (
          <Card className="p-5">
            <Banner tone="danger">{loadError}</Banner>
          </Card>
        ) : successState ? (
          <Card className="p-6">
            <ResultHero ok title="Student enrolled" message="Share these sign-in details with the student.">
              <div className="mt-4 w-full space-y-2 rounded-control bg-canvas p-4 text-left">
                <div>
                  <div className="text-xs text-muted">Student ID</div>
                  <div className="font-mono text-sm font-semibold text-ink">
                    {successState.student_id}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted">Temporary password</div>
                  <div className="font-mono text-sm font-semibold text-ink">
                    {successState.temp_password}
                  </div>
                </div>
              </div>
              <div className="mt-5 flex w-full flex-col gap-2">
                <Button onClick={enrolAnother}>Enrol another</Button>
                <Button variant="secondary" onClick={() => navigate('/school-admin/students')}>
                  Done
                </Button>
              </div>
            </ResultHero>
          </Card>
        ) : (
          <Card className="p-5">
            <h1 className="text-xl font-bold text-ink">
              {isEditMode ? 'Edit student' : 'Enrol a student'}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {isEditMode
                ? "Update this student's details."
                : 'A Student ID and a temporary password are generated automatically.'}
            </p>

            <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
              {error && <Banner tone="danger">{error}</Banner>}
              {!isEditMode && (
                <Banner tone="info">
                  A Student ID and a temporary password are generated automatically.
                </Banner>
              )}
              <Field label="Student name">
                <Input
                  placeholder="e.g. Liam Carter"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </Field>
              <Field label="Class">
                <Select value={classId} onChange={(e) => setClassId(e.target.value)} required>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </Field>
              {isEditMode && (
                <p className="text-xs text-muted">Student ID is permanent and can&rsquo;t be changed.</p>
              )}
              <div className="flex gap-2">
                <Button type="submit" loading={isSubmitting} disabled={!classId}>
                  {isEditMode ? 'Save changes' : 'Enrol student'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigate('/school-admin/students')}
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
