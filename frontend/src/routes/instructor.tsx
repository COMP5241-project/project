import { Link, createFileRoute } from '@tanstack/react-router'
import { CircleAlert, GraduationCap, House, LoaderCircle, LogOut, NotebookPen } from 'lucide-react'
import type { ReactNode } from 'react'
import { useProfile } from '../lib/useProfile'

export const Route = createFileRoute('/instructor')({
  component: InstructorPage,
})

function InstructorPage() {
  const state = useProfile()

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
  } else if (state.profile.role !== 'instructor') {
    content = (
      <NoticeCard
        action={
          state.profile.role === 'student' ? (
            <Link className="font-semibold text-[#A21942] hover:underline" to="/student">
              Go to the Student Learning Hub
            </Link>
          ) : undefined
        }
        message={`You are signed in as ${state.email}, but your account role is “${state.profile.role}”. This area is for instructors.`}
        title="Instructor area"
      />
    )
  } else {
    content = (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <span className="inline-flex size-12 items-center justify-center rounded-xl bg-[#A21942]/10 text-[#A21942]">
          <NotebookPen aria-hidden="true" size={24} />
        </span>
        <p className="mt-6 text-sm font-semibold text-[#A21942]">Instructor Studio</p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-[#262626]">
          Welcome back, {state.email}
        </h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          Create GenAI-powered mini-courses, review generated slides and quizzes, and track roster
          analytics from this studio.
        </p>
        <p className="mt-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          The course generator and analytics dashboard are coming soon.
        </p>
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
