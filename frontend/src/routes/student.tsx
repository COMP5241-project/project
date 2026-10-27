import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowRight, BookOpen, Bug, CircleAlert, CircleCheck, Gamepad2, GraduationCap, House, LoaderCircle, Lock, ListChecks, LogOut, Presentation } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { CsValidationAssessment } from '../components/CsValidationAssessment'
import { fetchPublishedCourses, type PublishedCourseSummary } from '../lib/api'
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

function StudentPage() {
  const state = useProfile()
  const coursesState = usePublishedCourses(state.status === 'ready' && state.profile.role === 'student')

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
    content = <CsValidationAssessment onComplete={() => window.location.assign('/student')} />
  } else {
    content = (
      <div className="space-y-4">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <span className="inline-flex size-12 items-center justify-center rounded-xl bg-[#A21942]/10 text-[#A21942]">
            <BookOpen aria-hidden="true" size={24} />
          </span>
          <p className="mt-6 text-sm font-semibold text-[#A21942]">Student Learning Hub</p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-[#262626]">
            Welcome back, {state.email}
          </h1>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            You are on the{' '}
            <span className="font-semibold text-[#262626]">
              {state.profile.cs_qualified ? 'CS Major' : 'Non-CS Major'} track
            </span>
            . Your personalized skill tree and interactive sandboxes will appear here.
          </p>
          <p className="mt-5 inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <CircleCheck aria-hidden="true" size={16} />
            Diagnostic assessment completed — you will not be asked to take it again.
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <span className="inline-flex size-12 items-center justify-center rounded-xl bg-[#A21942]/10 text-[#A21942]">
            <Presentation aria-hidden="true" size={24} />
          </span>
          <p className="mt-6 text-sm font-semibold text-[#A21942]">Your courses</p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-[#262626]">
            Published by your instructors
          </h2>
          {coursesState.courses === null && coursesState.error === '' && (
            <p className="mt-4 text-sm text-gray-500">Loading your courses…</p>
          )}
          {coursesState.error !== '' && (
            <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
              {coursesState.error}
            </p>
          )}
          {coursesState.courses !== null && coursesState.courses.length === 0 && (
            <p className="mt-4 rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              No courses have been published yet. Check back soon — your instructors are still
              preparing them.
            </p>
          )}
          {coursesState.courses !== null && coursesState.courses.length > 0 && (
            <ul className="mt-4 space-y-3">
              {coursesState.courses.map((course) => (
                <li key={course.id}>
                  <Link
                    className="group flex items-center justify-between gap-4 rounded-lg border border-gray-200 p-4 transition-colors hover:border-[#A21942]"
                    to="/courses/$id"
                    params={{ id: course.id }}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#A21942]/10 text-[#A21942]">
                        {course.type === 'quiz' ? <ListChecks size={18} /> : <Presentation size={18} />}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#262626] transition-colors group-hover:text-[#A21942]">
                          {course.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {course.type === 'quiz' ? 'Quiz' : 'Slide deck'}
                        </p>
                      </div>
                    </div>
                    <ArrowRight aria-hidden="true" className="shrink-0 text-gray-400 transition-colors group-hover:text-[#A21942]" size={16} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <span className="inline-flex size-12 items-center justify-center rounded-xl bg-[#A21942]/10 text-[#A21942]">
            <Bug aria-hidden="true" size={24} />
          </span>
          <p className="mt-6 text-sm font-semibold text-[#A21942]">
            New · Discernment training (4D AI Fluency)
          </p>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-[#262626]">
            Spot the Hallucination
          </h2>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            Your AI intern wrote some code — and every snippet hides one mistake. Tap the suspicious
            line, explain what&apos;s wrong, and let your AI tutor score your detective work. No
            coding experience needed.
          </p>
          <Link
            className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-[#A21942] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#801333]"
            to="/student/hallucination-game"
          >
            Play the game <ArrowRight aria-hidden="true" size={15} />
          </Link>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <span className="inline-flex size-12 items-center justify-center rounded-xl bg-[#A21942]/10 text-[#A21942]">
            <Gamepad2 aria-hidden="true" size={24} />
          </span>
          <p className="mt-6 text-sm font-semibold text-[#A21942]">Sample mini-course · Open preview</p>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-[#262626]">
            Fundamentals of AI-Assisted Software Engineering
          </h2>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            A 20-minute taste of the full track: an SDLC simulation, a prompt lab, and the Break
            the Bot flaw hunt. Anyone can play it without an account — playing it from here saves
            your result to your profile.
          </p>
          <Link
            className="mt-5 inline-flex items-center gap-1.5 rounded-md border border-[#A21942] bg-white px-4 py-2 text-sm font-medium text-[#A21942] transition-colors hover:bg-[#A21942]/5"
            to="/courses/sample"
          >
            Play the sample <ArrowRight aria-hidden="true" size={15} />
          </Link>
        </div>

        {state.profile.cs_qualified && (
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                  CS track · Coming soon
                </p>
                <h2 className="mt-2 text-lg font-bold text-[#262626]">Code Review Boss Battle</h2>
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
        )}
      </div>
    )
  }

  return (
    <main className="flex min-h-screen flex-col bg-[#F8F9FA]">
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
        <div className="w-full max-w-xl">
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
