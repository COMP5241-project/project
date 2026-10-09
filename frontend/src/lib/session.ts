import { ApiError, getCurrentProfile, type DashboardRole } from './api'

export type { DashboardRole } from './api'

/**
 * Module-level cache of the signed-in user's role for the current SPA
 * session. `undefined` means "not resolved yet", `null` means "resolved:
 * signed out (or no usable role)".
 */
let cachedRole: DashboardRole | null | undefined
let inFlight: Promise<DashboardRole | null> | null = null
let generation = 0
let cachedAt = 0

/** Read the cached role synchronously, if it has been resolved already. */
export function getCachedSignedInRole(): DashboardRole | null | undefined {
  return cachedRole
}

/**
 * Warm or invalidate the cache from code paths that already know the
 * signed-in role (login flow, dashboard profile load, sign-out).
 */
export function setCachedSignedInRole(role: DashboardRole | null): void {
  generation += 1
  inFlight = null
  cachedRole = role
  cachedAt = Date.now()
}

export function resetCachedSignedInRole(): void {
  generation += 1
  inFlight = null
  cachedRole = undefined
}

export function resolveSignedInRole(): Promise<DashboardRole | null> {
  if (cachedRole !== undefined && Date.now() - cachedAt < 30_000) {
    return Promise.resolve(cachedRole)
  }
  if (inFlight) {
    return inFlight
  }

  const requestGeneration = generation
  const pending = (async (): Promise<DashboardRole | null> => {
    try {
      const { profile } = await getCurrentProfile()
      if (generation === requestGeneration) {
        cachedRole = profile.role
        cachedAt = Date.now()
      }
      return cachedRole ?? null
    } catch (error) {
      if (generation !== requestGeneration) return cachedRole ?? null
      if (error instanceof ApiError && error.status === 401) {
        cachedRole = null
        cachedAt = Date.now()
      } else {
        cachedRole = undefined
      }
      return cachedRole ?? null
    } finally {
      if (generation === requestGeneration) inFlight = null
    }
  })()

  inFlight = pending
  return pending
}
