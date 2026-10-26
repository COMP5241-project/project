import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import {
  ArrowLeft,
  ArrowRight,
  GraduationCap,
  LoaderCircle,
  LockKeyhole,
  Mail,
} from 'lucide-react'
import { useState, useEffect, type FormEvent } from 'react'
import { login, requestPasswordReset, verifyPasswordReset } from '../lib/api'
import { resolveSignedInRole, setCachedSignedInRole } from '../lib/session'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [resetCode, setResetCode] = useState('')
  const [resetPassword, setResetPassword] = useState('')
  const [resetPasswordConfirmation, setResetPasswordConfirmation] = useState('')
  const [view, setView] = useState<'login' | 'reset-email' | 'reset-password'>('login')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Defense-in-depth: a user who is already signed in should never see the
  // login form (e.g. clicking a stale "Student Login" link), so redirect
  // them straight to their dashboard.
  useEffect(() => {
    let cancelled = false
    void resolveSignedInRole().then((role) => {
      if (cancelled || !role) return
      if (role === 'instructor') {
        window.location.replace('/instructor.html')
      } else {
        void navigate({ to: '/student', replace: true })
      }
    })
    return () => {
      cancelled = true
    }
  }, [navigate])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isLoading) return
    setError(null)
    setIsLoading(true)

    try {
      const { profile } = await login(email.trim(), password)
      setCachedSignedInRole(profile.role)
      setPassword('')
      await router.invalidate()
      if (profile.role === 'instructor') {
        window.location.assign('/instructor.html')
      } else {
        await navigate({ to: '/student' })
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'An unexpected error occurred. Please try again later.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  async function handleResetEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isLoading) return
    setError(null)
    setIsLoading(true)

    try {
      await requestPasswordReset(email.trim())
      setView('reset-password')
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Unable to send a verification code. Please try again later.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  async function handlePasswordResetSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isLoading) return
    setError(null)
    if (resetPassword !== resetPasswordConfirmation) {
      setError('New password and confirmation must match.')
      return
    }
    setIsLoading(true)

    try {
      await verifyPasswordReset(
        email.trim(),
        resetCode,
        resetPassword,
        resetPasswordConfirmation,
      )
      setView('login')
      setPassword('')
      setResetCode('')
      setResetPassword('')
      setResetPasswordConfirmation('')
      setError('Your password has been updated. You can now sign in.')
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Unable to update your password. Please try again later.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  function showLogin() {
    setView('login')
    setError(null)
  }

  return (
    <main className="grid min-h-screen bg-[#F8F9FA] lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-[#A21942] px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between xl:px-16">
        <div aria-hidden="true" className="absolute -right-32 top-1/4 size-96 rounded-full border border-white/10" />
        <div aria-hidden="true" className="absolute -right-12 top-1/3 size-64 rounded-full border border-white/10" />
        <a aria-label="PolyU Edu 4.0 home" className="relative inline-flex w-fit items-center gap-3" href="/">
          <span className="flex size-11 items-center justify-center rounded-xl bg-white/15">
            <GraduationCap aria-hidden="true" size={24} />
          </span>
          <span className="text-lg font-extrabold tracking-tight">
            PolyU <span className="text-white/75">Edu 4.0</span>
          </span>
        </a>

        <div className="relative max-w-lg pb-12">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-white/75">
            Learning, built around you
          </p>
          <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight xl:text-5xl">
            Your next idea starts with a sign in.
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-white/80">
            Pick up where you left off and keep building your skills with PolyU Edu 4.0.
          </p>
        </div>

        <p className="relative text-xs text-white/65">
          The Hong Kong Polytechnic University
        </p>
      </section>

      <section className="flex min-h-screen flex-col px-5 py-6 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between">
          <a
            aria-label="PolyU Edu 4.0 home"
            className="inline-flex items-center gap-2.5 lg:invisible"
            href="/"
          >
            <span className="flex size-9 items-center justify-center rounded-lg bg-[#A21942] text-white">
              <GraduationCap aria-hidden="true" size={20} />
            </span>
            <span className="text-sm font-extrabold tracking-tight text-[#262626]">
              PolyU <span className="text-[#A21942]">Edu 4.0</span>
            </span>
          </a>
          <a
            className="ml-auto inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-[#A21942]"
            href="/"
          >
            <ArrowLeft aria-hidden="true" size={16} />
            Back to home
          </a>
        </header>

        <div className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <span className="inline-flex size-12 items-center justify-center rounded-xl bg-[#A21942]/10 text-[#A21942]">
                <GraduationCap aria-hidden="true" size={24} />
              </span>
              <p className="mt-6 text-sm font-semibold text-[#A21942]">
                {view === 'login' ? 'Welcome back' : 'Account recovery'}
              </p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#262626]">
                {view === 'login'
                  ? 'Sign in to your account'
                  : view === 'reset-email'
                    ? 'Forgot your password?'
                    : 'Create a new password'}
              </h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                {view === 'login'
                  ? 'Enter your email and password to continue.'
                  : view === 'reset-email'
                    ? 'Enter your account email and we will send you a verification code.'
                    : `Enter the six-digit code sent to ${email.trim() || 'your email'}.`}
              </p>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
              {error && (
                <div
                  className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                  role="alert"
                >
                  {error}
                </div>
              )}

              {view === 'login' && (
                <form className="space-y-5" onSubmit={handleSubmit}>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[#262626]" htmlFor="email">
                      Email address
                    </label>
                    <div className="relative">
                      <Mail aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
                      <input autoComplete="email" className="w-full rounded-md border border-gray-300 bg-white py-3 pl-10 pr-3.5 text-sm text-[#262626] outline-none transition placeholder:text-gray-400 focus:border-[#A21942] focus:ring-2 focus:ring-[#A21942]/20" id="email" name="email" onChange={(event) => { setEmail(event.target.value); setError(null) }} placeholder="name@polyu.edu.hk" required type="email" value={email} />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[#262626]" htmlFor="password">Password</label>
                    <div className="relative">
                      <LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
                      <input autoComplete="current-password" className="w-full rounded-md border border-gray-300 bg-white py-3 pl-10 pr-3.5 text-sm text-[#262626] outline-none transition placeholder:text-gray-400 focus:border-[#A21942] focus:ring-2 focus:ring-[#A21942]/20" id="password" name="password" onChange={(event) => { setPassword(event.target.value); setError(null) }} placeholder="Enter your password" required type="password" value={password} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="inline-flex min-w-0 flex-1 items-center justify-center gap-2 rounded-md bg-[#A21942] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#801333] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A21942] disabled:cursor-not-allowed disabled:opacity-60" disabled={isLoading} type="submit">
                      {isLoading ? <><LoaderCircle aria-hidden="true" className="animate-spin" size={16} />Signing in…</> : <>Sign in<ArrowRight aria-hidden="true" size={16} /></>}
                    </button>
                    <button aria-label="Forgot password" className="inline-flex size-12 shrink-0 items-center justify-center rounded-md border border-gray-300 text-[#A21942] transition-colors hover:border-[#A21942] hover:bg-[#A21942]/5 disabled:opacity-60" disabled={isLoading} onClick={() => { setError(null); setView('reset-email') }} title="Forgot password" type="button">
                      <img alt="" aria-hidden="true" className="size-7" src="/reset-password.svg" />
                    </button>
                  </div>
                </form>
              )}

              {view === 'reset-email' && (
                <form className="space-y-5" onSubmit={handleResetEmailSubmit}>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[#262626]" htmlFor="reset-email">Email address</label>
                    <div className="relative">
                      <Mail aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
                      <input autoComplete="email" className="w-full rounded-md border border-gray-300 bg-white py-3 pl-10 pr-3.5 text-sm text-[#262626] outline-none transition placeholder:text-gray-400 focus:border-[#A21942] focus:ring-2 focus:ring-[#A21942]/20" id="reset-email" onChange={(event) => { setEmail(event.target.value); setError(null) }} placeholder="name@polyu.edu.hk" required type="email" value={email} />
                    </div>
                  </div>
                  <button className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#A21942] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#801333] disabled:cursor-not-allowed disabled:opacity-60" disabled={isLoading} type="submit">
                    {isLoading ? <><LoaderCircle aria-hidden="true" className="animate-spin" size={16} />Sending code…</> : <>Send verification code<ArrowRight aria-hidden="true" size={16} /></>}
                  </button>
                  <button className="w-full text-sm font-medium text-gray-600 hover:text-[#A21942]" onClick={showLogin} type="button">Back to sign in</button>
                </form>
              )}

              {view === 'reset-password' && (
                <form className="space-y-5" onSubmit={handlePasswordResetSubmit}>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[#262626]" htmlFor="reset-code">Verification code</label>
                    <input autoComplete="one-time-code" className="w-full rounded-md border border-gray-300 bg-white px-3.5 py-3 text-center text-lg font-semibold tracking-[0.35em] text-[#262626] outline-none transition placeholder:text-gray-400 focus:border-[#A21942] focus:ring-2 focus:ring-[#A21942]/20" id="reset-code" inputMode="numeric" maxLength={8} onChange={(event) => { setResetCode(event.target.value.replace(/\D/g, '')); setError(null) }} pattern="[0-9]{8}" placeholder="00000000" required value={resetCode} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[#262626]" htmlFor="reset-password">New password</label>
                    <input autoComplete="new-password" className="w-full rounded-md border border-gray-300 bg-white px-3.5 py-3 text-sm text-[#262626] outline-none transition placeholder:text-gray-400 focus:border-[#A21942] focus:ring-2 focus:ring-[#A21942]/20" id="reset-password" onChange={(event) => { setResetPassword(event.target.value); setError(null) }} placeholder="Enter your new password" required type="password" value={resetPassword} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[#262626]" htmlFor="reset-password-confirmation">Re-enter new password</label>
                    <input autoComplete="new-password" className="w-full rounded-md border border-gray-300 bg-white px-3.5 py-3 text-sm text-[#262626] outline-none transition placeholder:text-gray-400 focus:border-[#A21942] focus:ring-2 focus:ring-[#A21942]/20" id="reset-password-confirmation" onChange={(event) => { setResetPasswordConfirmation(event.target.value); setError(null) }} placeholder="Re-enter your new password" required type="password" value={resetPasswordConfirmation} />
                  </div>
                  <button className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#A21942] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#801333] disabled:cursor-not-allowed disabled:opacity-60" disabled={isLoading} type="submit">
                    {isLoading ? <><LoaderCircle aria-hidden="true" className="animate-spin" size={16} />Updating password…</> : <>Update password<ArrowRight aria-hidden="true" size={16} /></>}
                  </button>
                  <button className="w-full text-sm font-medium text-gray-600 hover:text-[#A21942]" onClick={() => setView('reset-email')} type="button">Request a new code</button>
                </form>
              )}
            </div>

            <p className="mt-5 text-center text-xs leading-5 text-gray-500">
              Sign in with your PolyU Edu 4.0 account. Credentials are verified securely with
              Supabase Auth.
            </p>
          </div>
        </div>

        <footer className="text-center text-xs text-gray-500">
          © {new Date().getFullYear()} PolyU Education 4.0
        </footer>
      </section>
    </main>
  )
}
