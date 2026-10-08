import { supabase } from './supabase'

export type DashboardRole = 'student' | 'instructor'

/**
 * Module-level cache of the signed-in user's role for the current SPA
 * session. `undefined` means "not resolved yet", `null` means "resolved:
 * signed out (or no usable role)".
 */
let cachedRole: DashboardRole | null | undefined
let inFlight: Promise<DashboardRole | null> | null = null

/** Read the cached role synchronously, if it has been resolved already. */
export function getCachedSignedInRole(): DashboardRole | null | undefined {
  return cachedRole
}

/**
 * Warm or invalidate the cache from code paths that already know the
 * signed-in role (login flow, dashboard profile load, sign-out).
 */
export function setCachedSignedInRole(role: DashboardRole | null): void {
  cachedRole = role
}

function isDashboardRole(value: unknown): value is DashboardRole {
  return value === 'student' || value === 'instructor'
}

/**
 * Resolve the signed-in user's role: read the cached Supabase session from
 * storage (no network round-trip), then the user's `profiles` row. Returns
 * `null` when Supabase is not configured, no session exists, or the role is
 * missing/unsupported. Results are cached and concurrent calls are
 * deduplicated, so repeated navigation within the SPA resolves instantly.
 */
export function resolveSignedInRole(): Promise<DashboardRole | null> {
  if (cachedRole !== undefined) {
    return Promise.resolve(cachedRole)
  }
  if (inFlight) {
    return inFlight
  }

  const pending = (async (): Promise<DashboardRole | null> => {
    try {
      if (!supabase) return null

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      const user = sessionData.session?.user
      if (sessionError || !user) return null

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      if (profileError || !isDashboardRole(profile.role)) return null

      return profile.role
    } catch {
      return null
    } finally {
      inFlight = null
    }
  })()

  inFlight = pending
  void pending.then((role) => {
    cachedRole = role
  })
  return pending
}
