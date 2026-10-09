import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useRouter } from '@tanstack/react-router'
import { ApiError, getCurrentProfile, logout, type Profile } from './api'
import { setCachedSignedInRole } from './session'

export type { Profile } from './api'

export type ProfileState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'error'; message: string }
  | { status: 'ready'; email: string; profile: Profile }

export function useProfile() {
  const [state, setState] = useState<ProfileState>({ status: 'loading' })
  const [signOutError, setSignOutError] = useState<string | null>(null)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const navigate = useNavigate()
  const router = useRouter()

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const data = await getCurrentProfile()
        if (cancelled) return
        setCachedSignedInRole(data.profile.role)
        setState({ status: 'ready', ...data })
      } catch (error) {
        if (cancelled) return
        if (error instanceof ApiError && error.status === 401) {
          setCachedSignedInRole(null)
          setState({ status: 'unauthenticated' })
          void router.invalidate()
        } else {
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : 'Unable to load your profile.',
          })
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [router])

  const signOut = useCallback(async () => {
    if (isSigningOut) return
    setIsSigningOut(true)
    setSignOutError(null)
    try {
      await logout()
      setCachedSignedInRole(null)
      await router.invalidate()
      await navigate({ to: '/login' })
    } catch (error) {
      if (error instanceof ApiError && error.signedOut) {
        setCachedSignedInRole(null)
        setState({ status: 'unauthenticated' })
        void router.invalidate()
      }
      setSignOutError(error instanceof Error ? error.message : 'Unable to sign out. Try again.')
    } finally {
      setIsSigningOut(false)
    }
  }, [isSigningOut, navigate, router])

  return { ...state, signOut, signOutError, isSigningOut }
}
