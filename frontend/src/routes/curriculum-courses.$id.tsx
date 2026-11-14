import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, BookOpen, GraduationCap, LoaderCircle } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import {
  fetchPublicCurriculumCourse,
  type PublicCurriculumCourse,
} from '../lib/api'
import { useProfile } from '../lib/useProfile'

export const Route = createFileRoute('/curriculum-courses/$id')({
  component: CurriculumCoursePage,
})

function CurriculumCoursePage() {
  const profile = useProfile()
  const { id } = Route.useParams()
  const courseState = usePublicCurriculumCourse(
    id,
    profile.status === 'ready' && profile.profile.role === 'student',
  )

  let content: ReactNode
  if (profile.status === 'loading') {
    content = <StatusCard message="Checking your session…" loading />
  } else if (profile.status === 'unauthenticated') {
    content = (
      <StatusCard
        message="Sign in with a student account to view this course."
        title="Student sign-in required"
      />
    )
  } else if (profile.status === 'error') {
    content = <StatusCard message={profile.message} title="Something went wrong" />
  } else if (profile.profile.role !== 'student') {
    content = <StatusCard message="This course page is for student accounts." title="Student area" />
  } else if (courseState.isLoading) {
    content = <StatusCard message="Loading the course plan…" loading />
  } else if (courseState.error || !courseState.course) {
    content = (
      <StatusCard
        action={
          <button
            className="font-semibold text-[#A21942] hover:underline"
            onClick={courseState.retry}
            type="button"
          >
            Try again
          </button>
        }
        message={courseState.error || 'This course is not available.'}
        title="Course unavailable"
      />
    )
  } else {
    content = <CoursePlan course={courseState.course} />
  }

  return (
    <main className="flex min-h-screen flex-col bg-[#F8F9FA]">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
          <Link aria-label="PolyU Edu 4.0 home" className="inline-flex items-center gap-2.5" to="/">
            <span className="flex size-9 items-center justify-center rounded-lg bg-[#A21942] text-white">
              <GraduationCap aria-hidden="true" size={20} />
            </span>
            <span className="text-sm font-extrabold tracking-tight text-[#262626]">
              PolyU <span className="text-[#A21942]">Edu 4.0</span>
            </span>
          </Link>
          <Link
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
            to="/student"
          >
            <BookOpen aria-hidden="true" size={15} />
            Student Learning Hub
          </Link>
        </div>
      </header>
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:py-10">
        {content}
      </div>
      <footer className="pb-6 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} PolyU Education 4.0
      </footer>
    </main>
  )
}

function usePublicCurriculumCourse(courseId: string, enabled: boolean) {
  const [result, setResult] = useState<{
    courseId: string
    course: PublicCurriculumCourse
  } | null>(null)
  const [failure, setFailure] = useState<{ courseId: string; message: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    fetchPublicCurriculumCourse(courseId)
      .then((course) => {
        if (!cancelled) {
          setResult({ courseId, course })
          setFailure(null)
          setIsLoading(false)
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setFailure({
            courseId,
            message: loadError instanceof Error ? loadError.message : 'Unable to load this course.',
          })
          setIsLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [courseId, enabled, attempt])

  const retry = useCallback(() => {
    setFailure(null)
    setIsLoading(true)
    setAttempt((current) => current + 1)
  }, [])

  const course = result?.courseId === courseId ? result.course : null
  const error = failure?.courseId === courseId ? failure.message : ''
  return {
    course,
    error,
    isLoading: isLoading || (!course && !error),
    retry,
  }
}

function CoursePlan({ course }: { course: PublicCurriculumCourse }) {
  return (
    <article className="space-y-6">
      <Link
        className="inline-flex items-center gap-2 text-sm font-medium text-[#A21942] hover:underline"
        to="/student"
      >
        <ArrowLeft aria-hidden="true" size={16} />
        Back to Student Learning Hub
      </Link>

      <header className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold text-[#A21942]">Instructor-created course plan</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#262626]">{course.title}</h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">{course.description}</p>
        <p className="mt-4 text-xs text-gray-500">
          {course.publishedAt ? `Published ${formatDate(course.publishedAt)} · ` : ''}
          Default activity: {formatLabel(course.default_presentation_format)}
        </p>
      </header>

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-[#262626]">Course overview</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">{course.plan.overview}</p>
        <p className="mt-4 text-sm">
          <span className="font-semibold text-[#262626]">For: </span>
          <span className="text-gray-700">{course.plan.target_audience}</span>
        </p>
        <StringList title="Learning outcomes" values={course.plan.learning_outcomes} />
        <StringList title="Prerequisites" values={course.plan.prerequisites} />
        <StringList title="Assumptions" values={course.plan.assumptions} />
      </section>

      <section aria-labelledby="modules-heading" className="space-y-4">
        <h2 id="modules-heading" className="text-xl font-extrabold tracking-tight text-[#262626]">
          Modules and lessons
        </h2>
        {course.plan.modules.map((module, moduleIndex) => (
          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm sm:p-6" key={module.module_id}>
            <p className="text-xs font-bold uppercase tracking-wide text-[#A21942]">
              Module {moduleIndex + 1}
            </p>
            <h3 className="mt-1 text-lg font-bold text-[#262626]">{module.title}</h3>
            <p className="mt-2 text-sm leading-6 text-gray-600">{module.description}</p>
            <ol className="mt-4 space-y-3">
              {module.lessons.map((lesson, lessonIndex) => (
                <li className="rounded-md border border-gray-200 bg-slate-50 p-4" key={lesson.lesson_id}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Lesson {lessonIndex + 1}
                    {lesson.estimated_minutes ? ` · ${lesson.estimated_minutes} min` : ''}
                  </p>
                  <h4 className="mt-1 font-semibold text-[#262626]">{lesson.title}</h4>
                  <p className="mt-1 text-sm leading-6 text-gray-700">{lesson.purpose}</p>
                  <StringList title="Objectives" values={lesson.objectives} />
                  <StringList title="Key topics" values={lesson.key_topics} />
                  <p className="mt-3 text-sm text-gray-700">
                    <span className="font-semibold text-[#262626]">Suggested activity: </span>
                    {lesson.suggested_activity.title} ({formatLabel(lesson.suggested_activity.presentation_format)})
                    <span className="block mt-1 text-gray-600">{lesson.suggested_activity.description}</span>
                  </p>
                  <p className="mt-3 text-sm text-gray-700">
                    <span className="font-semibold text-[#262626]">Completion check: </span>
                    {lesson.completion_check}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <StringList title="Milestones" values={course.plan.milestones} />
        <h2 className="mt-4 text-lg font-bold text-[#262626]">Capstone</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">{course.plan.capstone}</p>
      </section>

      <p className="rounded-md border border-gray-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-gray-600">
        This is the course plan and outline. Interactive lesson activities, enrollment, and progress tracking are not available for these curricula yet.
      </p>
    </article>
  )
}

function StringList({ title, values }: { title: string; values: string[] }) {
  if (values.length === 0) return null
  return (
    <div className="mt-4">
      <h3 className="text-sm font-semibold text-[#262626]">{title}</h3>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-6 text-gray-700">
        {values.map((value, index) => <li key={`${title}-${index}`}>{value}</li>)}
      </ul>
    </div>
  )
}

function StatusCard({
  action,
  loading = false,
  message,
  title = 'Course plan',
}: {
  action?: ReactNode
  loading?: boolean
  message: string
  title?: string
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-center gap-3">
        {loading && <LoaderCircle aria-hidden="true" className="animate-spin text-[#A21942]" size={22} />}
        <h1 className="text-xl font-bold text-[#262626]">{title}</h1>
      </div>
      <p className="mt-3 text-sm leading-6 text-gray-600">{message}</p>
      {action && <p className="mt-4">{action}</p>}
    </div>
  )
}

function formatDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatLabel(format: string): string {
  return format
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
