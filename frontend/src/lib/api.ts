export type DashboardRole = 'student' | 'instructor'

export interface Profile {
  id: string
  email: string | null
  role: DashboardRole
  cs_qualified: boolean
  assessment_completed: boolean
}

export interface CurrentProfile {
  email: string
  profile: Profile
}

interface ErrorResponse {
  error?: { code?: string; message?: string; signed_out?: boolean }
}

export class ApiError extends Error {
  readonly status: number
  readonly signedOut: boolean

  constructor(
    message: string,
    status: number,
    signedOut = false,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.signedOut = signedOut
  }
}

async function request<T>(path: string, body?: object): Promise<T | undefined> {
  let response: Response
  try {
    response = await fetch(`/api${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError('Unable to connect to the sign-in service. Check your connection and try again.', 0)
  }
  if (!response.ok) {
    const data = await response.json().catch(() => null) as ErrorResponse | null
    throw new ApiError(
      data?.error?.message ?? 'The sign-in service is unavailable. Try again later.',
      response.status,
      data?.error?.signed_out === true,
    )
  }
  if (response.status === 204) return undefined
  return response.json() as Promise<T>
}

export async function getCurrentProfile(): Promise<CurrentProfile> {
  const data = await request<CurrentProfile>('/me')
  if (!data) throw new ApiError('Unable to load your profile.', 503)
  return data
}

export async function login(email: string, password: string): Promise<CurrentProfile> {
  const data = await request<CurrentProfile>('/auth/login', { email, password })
  if (!data) throw new ApiError('Sign-in failed. Try again.', 503)
  return data
}

export async function logout(): Promise<void> {
  await request('/auth/logout', {})
}