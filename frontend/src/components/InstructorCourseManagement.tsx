import { useEffect, useState, type FormEvent } from 'react'
import {
  fetchInstructorCourse,
  fetchInstructorCourseAccess,
  fetchInstructorCourses,
  grantInstructorCourseAccess,
  revokeInstructorCourseAccess,
  updateInstructorCourseStatus,
  updateInstructorCourseVisibility,
  type InstructorCourseAccessEntry,
  type InstructorManagedCourse,
  type InstructorManagedCourseSummary,
  type InstructorManagedCourseVisibility,
} from '../lib/api'

export function InstructorCourseManagement() {
  const [courses, setCourses] = useState<InstructorManagedCourseSummary[] | null>(null)
  const [error, setError] = useState('')

  async function loadCourses() {
    setError('')
    try {
      setCourses(await fetchInstructorCourses())
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load your saved courses.')
    }
  }

  useEffect(() => {
    let active = true
    fetchInstructorCourses()
      .then((savedCourses) => {
        if (active) setCourses(savedCourses)
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load your saved courses.')
        }
      })
    return () => {
      active = false
    }
  }, [])

  function updateCourse(updatedCourse: InstructorManagedCourseSummary) {
    setCourses((current) => current?.map((course) => (
      course.id === updatedCourse.id ? updatedCourse : course
    )) ?? null)
  }

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8">
      <header className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wide text-[#A21942]">Instructor Studio</p>
        <h1 className="text-2xl font-extrabold tracking-tight text-[#262626]">Manage Courses</h1>
        <p className="max-w-3xl text-sm leading-6 text-gray-600">
          Review saved course plans, set who can access them, and publish or unpublish them for students.
        </p>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          <p>{error}</p>
          <button
            className="mt-2 font-semibold text-[#A21942] underline underline-offset-2"
            onClick={() => void loadCourses()}
            type="button"
          >
            Try again
          </button>
        </div>
      )}

      {courses === null && !error && (
        <p className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600 shadow-sm">
          Loading your saved courses…
        </p>
      )}

      {courses?.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-[#262626]">No saved course plans</h2>
          <p className="mt-1 text-sm text-gray-600">
            Courses you save from Create Course will appear here.
          </p>
        </div>
      )}

      {courses && courses.length > 0 && (
        <ul className="space-y-4">
          {courses.map((course) => (
            <li key={course.id}>
              <ManagedCourseCard course={course} onCourseUpdated={updateCourse} />
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

function ManagedCourseCard({
  course,
  onCourseUpdated,
}: {
  course: InstructorManagedCourseSummary
  onCourseUpdated: (course: InstructorManagedCourseSummary) => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [planExpanded, setPlanExpanded] = useState(false)
  const [plan, setPlan] = useState<InstructorManagedCourse | null>(null)
  const [planLoading, setPlanLoading] = useState(false)
  const [planError, setPlanError] = useState('')
  const [accessExpanded, setAccessExpanded] = useState(false)

  async function changeVisibility(visibility: InstructorManagedCourseVisibility) {
    setBusy(true)
    setError('')
    try {
      const result = await updateInstructorCourseVisibility(course.id, visibility)
      onCourseUpdated({ ...course, visibility: result.visibility })
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Unable to update course visibility.')
    } finally {
      setBusy(false)
    }
  }

  async function changeStatus() {
    const status = course.status === 'published' ? 'draft' : 'published'
    setBusy(true)
    setError('')
    try {
      const result = await updateInstructorCourseStatus(course.id, status)
      onCourseUpdated({
        ...course,
        status: result.status,
        publishedAt: result.published_at,
      })
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Unable to update course status.')
    } finally {
      setBusy(false)
    }
  }

  async function loadPlan() {
    setPlanLoading(true)
    setPlanError('')
    try {
      setPlan(await fetchInstructorCourse(course.id))
    } catch (loadError) {
      setPlanError(loadError instanceof Error ? loadError.message : 'Unable to load this course plan.')
    } finally {
      setPlanLoading(false)
    }
  }

  function togglePlan() {
    const nextExpanded = !planExpanded
    setPlanExpanded(nextExpanded)
    if (nextExpanded && !plan) void loadPlan()
  }

  return (
    <article className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-[#262626]">{course.title}</h2>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              course.status === 'published'
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-gray-100 text-gray-700'
            }`}>
              {course.status === 'published' ? 'Published' : course.status === 'archived' ? 'Archived' : 'Draft'}
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-[#262626]">
              {course.visibility === 'public' ? 'Public' : 'Restricted'}
            </span>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">{course.description}</p>
          <p className="mt-2 text-xs text-gray-500">
            Updated {new Date(course.updatedAt).toLocaleDateString()}
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-xs font-semibold text-gray-600">
            Student access
            <select
              className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-[#262626] focus:border-[#A21942] focus:outline-none"
              disabled={busy}
              onChange={(event) => void changeVisibility(event.target.value as InstructorManagedCourseVisibility)}
              value={course.visibility}
            >
              <option value="public">Public - all students</option>
              <option value="restricted">Restricted - selected students</option>
            </select>
          </label>
          <button
            className="rounded-md bg-[#A21942] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#801333] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={busy}
            onClick={() => void changeStatus()}
            type="button"
          >
            {busy ? 'Saving…' : course.status === 'published' ? 'Unpublish' : 'Publish'}
          </button>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-red-700" role="alert">{error}</p>}

      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-gray-100 pt-4">
        <button
          className="text-sm font-semibold text-[#A21942] hover:text-[#801333]"
          onClick={() => void togglePlan()}
          type="button"
        >
          {planExpanded ? 'Hide course plan' : 'View course plan'}
        </button>
        {course.visibility === 'restricted' && course.status === 'published' && (
          <button
            className="text-sm font-semibold text-[#A21942] hover:text-[#801333]"
            onClick={() => setAccessExpanded((expanded) => !expanded)}
            type="button"
          >
            {accessExpanded ? 'Hide student access' : 'Manage student access'}
          </button>
        )}
        {course.visibility === 'public' && course.status === 'published' && (
          <p className="text-xs text-gray-500">All signed-in students can access this published course.</p>
        )}
        {course.visibility === 'public' && course.status !== 'published' && (
          <p className="text-xs text-gray-500">All signed-in students can access this course when it is published.</p>
        )}
        {course.visibility === 'restricted' && course.status !== 'published' && (
          <p className="text-xs text-gray-500">Publish this course as restricted to manage its student list.</p>
        )}
      </div>

      {planExpanded && (
        <div className="mt-4 rounded-lg border border-gray-200 bg-slate-50 p-4">
          {planLoading && <p className="text-sm text-gray-600">Loading course plan…</p>}
          {planError && <p className="text-sm text-red-700" role="alert">{planError}</p>}
          {plan && <CoursePlanPreview course={plan} />}
          {planError && (
            <button
              className="mt-2 text-sm font-semibold text-[#A21942]"
              onClick={() => {
                setPlan(null)
                void loadPlan()
              }}
              type="button"
            >
              Try again
            </button>
          )}
        </div>
      )}

      {accessExpanded && course.visibility === 'restricted' && course.status === 'published' && (
        <CourseAccessManager courseId={course.id} />
      )}
    </article>
  )
}

function CoursePlanPreview({ course }: { course: InstructorManagedCourse }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-[#A21942]">
          Version {course.version_number}
        </p>
        <p className="mt-1 text-sm leading-6 text-gray-700">{course.plan.overview}</p>
      </div>
      {course.plan.modules.map((module) => (
        <section className="rounded-md border border-gray-200 bg-white p-4" key={module.module_id}>
          <h3 className="font-semibold text-[#262626]">{module.title}</h3>
          <p className="mt-1 text-sm text-gray-600">{module.description}</p>
          <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-gray-700">
            {module.lessons.map((lesson) => <li key={lesson.lesson_id}>{lesson.title}</li>)}
          </ul>
        </section>
      ))}
      <section>
        <h3 className="font-semibold text-[#262626]">Capstone</h3>
        <p className="mt-1 text-sm text-gray-700">{course.plan.capstone}</p>
      </section>
    </div>
  )
}

function CourseAccessManager({ courseId }: { courseId: string }) {
  const [students, setStudents] = useState<InstructorCourseAccessEntry[] | null>(null)
  const [email, setEmail] = useState('')
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    fetchInstructorCourseAccess(courseId)
      .then((access) => {
        if (active) setStudents(access)
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load student access.')
      })
    return () => {
      active = false
    }
  }, [courseId])

  async function addStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setBusyId('grant')
    try {
      const student = await grantInstructorCourseAccess(courseId, email.trim())
      setStudents((current) => [
        ...(current ?? []).filter((entry) => entry.user_id !== student.user_id),
        student,
      ])
      setEmail('')
    } catch (grantError) {
      setError(grantError instanceof Error ? grantError.message : 'Unable to grant student access.')
    } finally {
      setBusyId('')
    }
  }

  async function removeStudent(learnerId: string) {
    setError('')
    setBusyId(learnerId)
    try {
      await revokeInstructorCourseAccess(courseId, learnerId)
      setStudents((current) => current?.filter((entry) => entry.user_id !== learnerId) ?? null)
    } catch (revokeError) {
      setError(revokeError instanceof Error ? revokeError.message : 'Unable to revoke student access.')
    } finally {
      setBusyId('')
    }
  }

  return (
    <section aria-label="Restricted course student access" className="mt-4 rounded-lg border border-gray-200 bg-slate-50 p-4">
      <h3 className="font-semibold text-[#262626]">Students with access</h3>
      <p className="mt-1 text-sm text-gray-600">
        Add an existing student account by email. This does not create or invite an account.
      </p>
      <form className="mt-3 flex flex-col gap-2 sm:flex-row" onSubmit={(event) => void addStudent(event)}>
        <label className="sr-only" htmlFor={`student-email-${courseId}`}>Student email</label>
        <input
          autoComplete="email"
          className="min-w-0 flex-1 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-[#A21942] focus:outline-none"
          id={`student-email-${courseId}`}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="student@example.com"
          required
          type="email"
          value={email}
        />
        <button
          className="rounded-md bg-[#A21942] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#801333] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={busyId !== '' || !email.trim()}
          type="submit"
        >
          {busyId === 'grant' ? 'Adding…' : 'Grant access'}
        </button>
      </form>
      {error && <p className="mt-3 text-sm text-red-700" role="alert">{error}</p>}
      {students === null && !error && <p className="mt-3 text-sm text-gray-600">Loading student access…</p>}
      {students?.length === 0 && <p className="mt-3 text-sm text-gray-600">No students have been added yet.</p>}
      {students && students.length > 0 && (
        <ul className="mt-3 divide-y divide-gray-200 rounded-md border border-gray-200 bg-white">
          {students.map((student) => (
            <li className="flex items-center justify-between gap-3 px-3 py-2" key={student.user_id}>
              <span className="break-all text-sm text-[#262626]">{student.email}</span>
              <button
                className="shrink-0 rounded px-2 py-1 text-sm font-semibold text-[#A21942] hover:bg-[#A21942]/5 disabled:opacity-50"
                disabled={busyId !== ''}
                onClick={() => void removeStudent(student.user_id)}
                type="button"
              >
                {busyId === student.user_id ? 'Removing…' : 'Remove'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
