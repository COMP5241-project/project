import { Link, Navigate, createFileRoute } from '@tanstack/react-router'
import { NonCSIntroduction } from '../components/NonCSIntroduction'
import { useProfile } from '../lib/useProfile'

export const Route = createFileRoute('/student_/introduction 2')({
  component: NonCSIntroductionPage,
})

function NonCSIntroductionPage() {
  const state = useProfile()
  if (state.status === 'loading') {
    return <p className="p-8 text-[#262626]" role="status">Checking your session…</p>
  }
  if (state.status === 'unauthenticated') {
    return <p className="p-8 text-[#262626]">Your session has expired. <Link className="font-semibold text-[#A21942] underline" to="/login">Sign in</Link> to continue.</p>
  }
  if (state.status === 'error') {
    return <p className="p-8 text-[#262626]" role="alert">{state.message}</p>
  }
  if (state.profile.role !== 'student' || !state.profile.assessment_completed || state.profile.cs_qualified || state.profile.non_cs_introduction_completed) {
    return <Navigate to="/student" replace />
  }
  return <NonCSIntroduction signOut={state.signOut} signOutError={state.signOutError} isSigningOut={state.isSigningOut} />
}
