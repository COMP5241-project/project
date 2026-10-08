import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { isSupabaseConfigured, supabase } from './supabase'

export interface Profile {
  id: string
  email: string | null
  role: string
  cs_qualified: boolean
  assessment_completed: boolean
}

export type ProfileState =
  | { status: 'loading' }
  | { status: 'not-configured' }
  | { status: 'unauthenticated' }
  | { status: 'error'; message: string }
  | { status: 'ready'; email: string; profile: Profile }

/**
 * Loads the signed-in Supabase user together with their `profiles` row and
 * exposes a helper to sign out. Used by the role-specific dashboard pages so
 * they also work on direct navigation or page refresh.
 */
export function useProfile() {
  const [state, setState] = useState<ProfileState>({ status: 'loading' })
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!supabase) {
        setState({ status: 'not-configured' })
        return
      }

      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (cancelled) return
      if (authError || !authData.user) {
        setState({ status: 'unauthenticated' })
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, role, cs_qualified, assessment_completed')
        .eq('id', authData.user.id)
        .single()
      if (cancelled) return

      if (profileError) {
        setState({
          status: 'error',
          message:
            profileError.code === 'PGRST116'
              ? 'Your account profile could not be found. Contact the system administrator.'
              : `Unable to load your profile: ${profileError.message}`,
        })
        return
      }

      setState({
        status: 'ready',
        email: authData.user.email ?? profile.email ?? 'unknown user',
        profile: profile as Profile,
      })
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    await navigate({ to: '/login' })
  }, [navigate])

  return { ...state, isSupabaseConfigured, signOut }
}
