import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export type DashboardRole = 'student' | 'instructor'

/**
 * Resolves the signed-in user's role from the cached Supabase session and
 * their `profiles` row. Returns `null` while resolving, when signed out,
 * or when Supabase is not configured.
 */
export function useSignedInRole(): DashboardRole | null {
  const [role, setRole] = useState<DashboardRole | null>(null)

  useEffect(() => {
    let cancelled = false

    async function resolveRole() {
      if (!supabase) return

      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (cancelled || authError || !authData.user) return

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .single()
      if (cancelled || profileError) return

      if (profile.role === 'student' || profile.role === 'instructor') {
        setRole(profile.role as DashboardRole)
      }
    }

    void resolveRole()
    return () => {
      cancelled = true
    }
  }, [])

  return role
}
