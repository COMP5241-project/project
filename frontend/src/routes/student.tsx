import { Link, Navigate, createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowRight, BookOpen, Bug, CircleAlert, CircleCheck, Gamepad2, GraduationCap, House, Library, LoaderCircle, Lock, ListChecks, LogOut, Martini, Presentation, Trophy } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { CsValidationAssessment } from '../components/CsValidationAssessment'
import { SigningOutOverlay } from '../components/SigningOutOverlay'
import {
  fetchPublishedCourses,
  fetchPublicCurriculumCourses,
  type PublicCurriculumCourseSummary,
  type PublishedCourseSummary,
} from '../lib/api'
import { useProfile } from '../lib/useProfile'

export const Route = createFileRoute('/student')({
  component: StudentPage,
})

function usePublishedCourses(enabled: boolean) {
  const [courses, setCourses] = useState<PublishedCourseSummary[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    fetchPublishedCourses()
      .then((data) => {
        if (!cancelled) setCourses(data)
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load your courses.')
        }
      })
    return () => {
      cancelled = true
    }
  }, [enabled])

  return { courses, error }
}

function usePublicCurriculumCourses(enabled: boolean) {
  const [courses, setCourses] = useState<PublicCurriculumCourseSummary[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    fetchPublicCurriculumCourses()
      .then((data) => {
        if (!cancelled) setCourses(data)
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load instructor-created courses.')
        }
      })
    return () => {
      cancelled = true
    }
  }, [enabled])

  return { courses, error }
}

function formatDate(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

/** Splits the published course list into the three delivery buckets the dashboard renders. */
function groupCourses(courses: PublishedCourseSummary[]) {
  const inProgress: PublishedCourseSummary[] = []
  const notStarted: PublishedCourseSummary[] = []
  const completed: PublishedCourseSummary[] = []
  for (const course of courses) {
    const status = course.status ?? 'none'
    if (status === 'in_progress') inProgress.push(course)
    else if (status === 'completed') completed.push(course)
    else notStarted.push(course)
  }
  completed.sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
  return { inProgress, notStarted, completed }
}

function StudentPage() {
  const state = useProfile()
  const navigate = useNavigate()
  const coursesState = usePublishedCourses(state.status === 'ready' && state.profile.role === 'student')
  const curriculumCoursesState = usePublicCurriculumCourses(
    state.status === 'ready' && state.profile.role === 'student',
  )

  let content: ReactNode
  if (state.status === 'loading') {
    content = (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-gray-200 bg-white p-10 text-center shadow-sm">
        <LoaderCircle aria-hidden="true" className="animate-spin text-[#A21942]" size={28} />
        <p className="text-sm text-gray-600">Checking your session…</p>
      </div>
    )
  } else if (state.status === 'unauthenticated') {
    content = (
      <NoticeCard
        action={
          <Link className="font-semibold text-[#A21942] hover:underline" to="/login">
            Back to sign in
          </Link>
        }
        message="You are not signed in, or your session has expired."
        title="Session required"
      />
    )
  } else if (state.status === 'error') {
    content = <NoticeCard message={state.message} title="Something went wrong" />
  } else if (state.profile.role !== 'student') {
    content = (
      <NoticeCard
        action={
          state.profile.role === 'instructor' ? (
            <a className="font-semibold text-[#A21942] hover:underline" href="/instructor.html">
              Go to the Instructor Studio
            </a>
          ) : undefined
        }
        message={`You are signed in as ${state.email}, but your account role is “${state.profile.role}”. This area is for students.`}
        title="Student area"
      />
    )
  } else if (!state.profile.assessment_completed) {
    content = <CsValidationAssessment onComplete={(profile) => {
      if (profile.profile.cs_qualified) {
        window.location.assign('/student')
      } else {
        void navigate({ to: '/student/introduction' })
      }
    }} />
  } else if (!state.profile.cs_qualified && !state.profile.non_cs_introduction_completed) {
    content = <Navigate to="/student/introduction" replace />
  } else {
    const { inProgress, notStarted, completed } = groupCourses(coursesState.courses ?? [])
    content = (
      <div className="space-y-8">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0">
              <span className="inline-flex size-12 items-center justify-center rounded-xl bg-[#A21942]/10 text-[#A21942]">
                <BookOpen aria-hidden="true" size={24} />
              </span>
              <p className="mt-5 text-sm font-semibold text-[#A21942]">Student Learning Hub</p>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#262626]">
                Welcome back, {state.email}
              </h1>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                You are on the{' '}
                <span className="font-semibold text-[#262626]">
                  {state.profile.cs_qualified ? 'CS Major' : 'Non-CS Major'} track
                </span>
                . Instructor-published courses, games, and course resources are grouped below.
              </p>
            </div>
            <p className="mt-1 hidden shrink-0 items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 sm:inline-flex">
              <CircleCheck aria-hidden="true" size={14} />
              Diagnostic assessment completed
            </p>
          </div>
        </div>

        <section aria-labelledby="your-courses-heading" className="space-y-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#A21942]">Your courses</p>
            <h2 id="your-courses-heading" className="mt-1 text-xl font-extrabold tracking-tight text-[#262626]">
              Published by your instructors
            </h2>
          </div>
          {coursesState.courses === null && coursesState.error === '' && (
            <div className="rounded-lg border border-gray-200 bg-white px-5 py-4 shadow-sm">
              <p className="text-sm text-gray-500">Loading your courses…</p>
            </div>
          )}
          {coursesState.error !== '' && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
              {coursesState.error}
            </p>
          )}
          {coursesState.courses !== null && coursesState.courses.length === 0 && (
            <div className="rounded-lg border border-gray-200 bg-white px-5 py-4 shadow-sm">
              <p className="text-sm text-gray-600">
                No courses have been published yet. Check back soon — your instructors are still
                preparing them.
              </p>
            </div>
          )}
          {coursesState.courses !== null && coursesState.courses.length > 0 && (
            <div className="space-y-4">
              <CourseGroup courses={inProgress} label="Continue where you left off" />
              <CourseGroup courses={notStarted} label="Get started" />
              <CourseGroup courses={completed} label="Completed" />
            </div>
          )}
        </section>

        <section aria-labelledby="curriculum-courses-heading" className="space-y-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#A21942]">Instructor-created courses</p>
            <h2 id="curriculum-courses-heading" className="mt-1 text-xl font-extrabold tracking-tight text-[#262626]">
              Explore course plans
            </h2>
            <p className="mt-1 text-sm leading-6 text-gray-600">
              Public curricula are open to all students. Restricted courses shared with you also appear here.
            </p>
          </div>
          {curriculumCoursesState.courses === null && curriculumCoursesState.error === '' && (
            <div className="rounded-lg border border-gray-200 bg-white px-5 py-4 shadow-sm">
              <p className="text-sm text-gray-500">Loading instructor-created courses…</p>
            </div>
          )}
          {curriculumCoursesState.error !== '' && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
              {curriculumCoursesState.error}
            </p>
          )}
          {curriculumCoursesState.courses !== null && curriculumCoursesState.courses.length === 0 && (
            <div className="rounded-lg border border-gray-200 bg-white px-5 py-4 shadow-sm">
              <p className="text-sm text-gray-600">No course plans are available to you yet.</p>
            </div>
          )}
          {curriculumCoursesState.courses && curriculumCoursesState.courses.length > 0 && (
            <ul className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
              {curriculumCoursesState.courses.map((course) => (
                <li key={course.id}>
                  <Link
                    className="group flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-gray-50"
                    params={{ id: course.id }}
                    to="/curriculum-courses/$id"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#A21942]/10 text-[#A21942]">
                        <BookOpen aria-hidden="true" size={18} />
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-[#262626] transition-colors group-hover:text-[#A21942]">
                          {course.title}
                        </p>
                        <p className="mt-1 line-clamp-2 text-sm leading-5 text-gray-600">{course.description}</p>
                        {course.publishedAt && (
                          <p className="mt-1 text-xs text-gray-500">Published {formatDate(course.publishedAt)}</p>
                        )}
                      </div>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-[#A21942]">
                      View plan <ArrowRight aria-hidden="true" size={15} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="games-heading" className="space-y-3 pt-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#A21942]">Games &amp; training</p>
            <h2 id="games-heading" className="mt-1 text-xl font-extrabold tracking-tight text-[#262626]">
              Hands-on practice you can play right away
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <GameCard
              cta="Play the game"
              description="Your AI intern wrote some code — and every snippet hides one mistake. Tap the suspicious line, explain what's wrong, and let your AI tutor score your detective work. No coding experience needed."
              icon={<Bug aria-hidden="true" size={20} />}
              tag="New · 4D AI Fluency"
              title="Spot the Hallucination"
              to="/student/hallucination-game"
            />
            <GameCard
              cta="Play the sample"
              description="A 20-minute taste of the full track: an SDLC simulation, a prompt lab, and the Break the Bot flaw hunt. Playing it from here saves your result to your profile."
              icon={<Gamepad2 aria-hidden="true" size={20} />}
              tag="Sample mini-course"
              title="Fundamentals of AI-Assisted Software Engineering"
              to="/courses/sample"
            />
            <GameCard
              cta="Play now"
              description="Apply lifecycle decisions in a Gold Miner–style game: hook SDLC good practices for marks, avoid harmful shortcuts, and use upgrades across three levels."
              href="/gold_hook/index.html"
              icon={<Trophy aria-hidden="true" size={20} />}
              tag="Interactive · 15 min"
              title="Gold Rush Hook"
            />
            <GameCard
              cta="Watch the lab"
              description="An animated testing comedy where a tester tries increasingly unusual orders — a light-hearted way to think about edge cases and unexpected inputs."
              href="/bar_animation/testers-bar-polyu.html"
              icon={<Martini aria-hidden="true" size={20} />}
              tag="Interactive · 20 min"
              title="Testers & the Bar"
            />
          </div>
        </section>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <span className="inline-flex size-12 items-center justify-center rounded-xl bg-[#A21942]/10 text-[#A21942]">
            <Library aria-hidden="true" size={24} />
          </span>
          <p className="mt-6 text-sm font-semibold text-[#A21942]">Course catalogue · COMP5241</p>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-[#262626]">
            Browse available courses
          </h2>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            Explore the COMP5241 Software Engineering course: chapter notes in six
            languages, the Gold Rush Hook SDLC game, and other interactive activities.
          </p>
          <a
            className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-[#A21942] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#801333]"
            href="/course.html"
          >
            Browse courses <ArrowRight aria-hidden="true" size={15} />
          </a>
        </div>

        {state.profile.cs_qualified && (
          <section aria-labelledby="coming-soon-heading" className="space-y-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Coming soon</p>
              <h2 id="coming-soon-heading" className="mt-1 text-xl font-extrabold tracking-tight text-[#262626]">
                On the way to your track
              </h2>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                    CS track · Coming soon
                  </p>
                  <h3 className="mt-2 text-lg font-bold text-[#262626]">Code Review Boss Battle</h3>
                  <p className="mt-1 text-sm leading-6 text-gray-600">
                    The AI ships a pull request full of subtle flaws. Reject it, and write the review
                    that proves why.
                  </p>
                </div>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
                  <Lock aria-hidden="true" size={18} />
                </span>
              </div>
            </div>
          </section>
        )}
      </div>
    )
  }

  return (
    <>
    <main inert={state.isSigningOut} className="flex min-h-screen flex-col bg-[#F8F9FA]">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4">
          <Link aria-label="PolyU Edu 4.0 home" className="inline-flex items-center gap-2.5" to="/">
            <span className="flex size-9 items-center justify-center rounded-lg bg-[#A21942] text-white">
              <GraduationCap aria-hidden="true" size={20} />
            </span>
            <span className="text-sm font-extrabold tracking-tight text-[#262626]">
              PolyU <span className="text-[#A21942]">Edu 4.0</span>
            </span>
          </Link>
          <div className="flex items-center gap-2.5">
            <Link
              className="inline-flex items-center gap-1.5 rounded-md bg-[#A21942] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[#801333]"
              to="/"
            >
              <House aria-hidden="true" size={15} />
              Home
            </Link>
            {state.status === 'ready' && (
              <button
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
                disabled={state.isSigningOut}
                onClick={() => void state.signOut()}
                type="button"
              >
                {state.isSigningOut ? (
                  <LoaderCircle aria-hidden="true" className="animate-spin" size={15} />
                ) : (
                  <LogOut aria-hidden="true" size={15} />
                )}
                Sign out
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className={`w-full ${state.status === 'ready' && state.profile.role === 'student' && state.profile.assessment_completed && (state.profile.cs_qualified || state.profile.non_cs_introduction_completed) ? 'max-w-4xl' : 'max-w-xl'}`}>
          {state.signOutError && (
            <p className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
              {state.signOutError}
            </p>
          )}
          {content}
        </div>
      </div>

      <footer className="pb-6 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} PolyU Education 4.0
      </footer>
    </main>
    {state.isSigningOut && <SigningOutOverlay />}
    </>
  )
}

function CourseGroup({ courses, label }: { courses: PublishedCourseSummary[]; label: string }) {
  if (courses.length === 0) return null
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <p className="border-b border-gray-100 bg-gray-50/60 px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <ul className="divide-y divide-gray-100">
        {courses.map((course) => (
          <li key={course.id}>
            <CourseLink course={course} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function CourseLink({ course }: { course: PublishedCourseSummary }) {
  const status = course.status ?? 'none'
  const callToAction = status === 'in_progress' ? 'Continue' : status === 'completed' ? 'Review' : 'Start'
  return (
    <Link
      className="group flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-gray-50"
      params={{ id: course.id }}
      to="/courses/$id"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#A21942]/10 text-[#A21942]">
          {course.type === 'quiz' ? <ListChecks aria-hidden="true" size={18} /> : <Presentation aria-hidden="true" size={18} />}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#262626] transition-colors group-hover:text-[#A21942]">
            {course.title}
          </p>
          <p className="truncate text-xs text-gray-500">
            {course.type === 'quiz' ? 'Quiz' : 'Slide deck'}
            {course.publishedAt ? ` · published ${formatDate(course.publishedAt)}` : ''}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {status === 'in_progress' && (
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
            In progress
          </span>
        )}
        {status === 'completed' && (
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            {course.completedAt ? `Completed ${formatDate(course.completedAt)}` : 'Completed'}
          </span>
        )}
        <span className="hidden text-xs font-semibold text-[#A21942] sm:inline">{callToAction}</span>
        <ArrowRight aria-hidden="true" className="shrink-0 text-gray-400 transition-colors group-hover:text-[#A21942]" size={16} />
      </div>
    </Link>
  )
}

type GameCardProps = {
  cta: string
  description: string
  icon: ReactNode
  tag: string
  title: string
} & ({ to: '/student/hallucination-game' | '/courses/sample'; href?: never } | { href: string; to?: never })

function GameCard({ cta, description, href, icon, tag, title, to }: GameCardProps) {
  const callToAction = (
    <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#A21942] group-hover:underline">
      {cta}
      <ArrowRight aria-hidden="true" size={14} />
    </span>
  )

  return (
    <div className="group flex flex-col rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition-colors hover:border-[#A21942]/40">
      <div className="flex items-center justify-between gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#A21942]/10 text-[#A21942]">{icon}</span>
        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-gray-600">{tag}</span>
      </div>
      <h3 className="mt-4 text-base font-bold text-[#262626]">{title}</h3>
      <p className="mt-1.5 flex-1 text-sm leading-6 text-gray-600">{description}</p>
      {to ? <Link to={to}>{callToAction}</Link> : <a href={href}>{callToAction}</a>}
    </div>
  )
}

function NoticeCard({
  action,
  message,
  title,
}: {
  action?: ReactNode
  message: string
  title: string
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <span className="inline-flex size-12 items-center justify-center rounded-xl bg-[#A21942]/10 text-[#A21942]">
        <CircleAlert aria-hidden="true" size={24} />
      </span>
      <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-[#262626]">{title}</h1>
      <p className="mt-3 text-sm leading-6 text-gray-600">{message}</p>
      {action ? <p className="mt-5">{action}</p> : null}
    </div>
  )
}
