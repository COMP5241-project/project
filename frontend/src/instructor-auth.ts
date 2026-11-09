import {
  ApiError,
  getCurrentProfile,
  logout,
} from './lib/api'

const mainElement = document.querySelector<HTMLElement>('main')
const authStatusElement = document.querySelector<HTMLElement>('#auth-status')
const logoutButtonElement = document.querySelector<HTMLButtonElement>('#logout-button')
const logoutFeedbackElement = document.querySelector<HTMLElement>('#logout-feedback')

if (!mainElement || !authStatusElement || !logoutButtonElement || !logoutFeedbackElement) {
  throw new Error('The instructor page is missing required authentication elements.')
}

const main = mainElement
const authStatus = authStatusElement
const logoutButton = logoutButtonElement
const logoutFeedback = logoutFeedbackElement

// The SPA uses hash routing, so full-page navigation must target the hash
// routes (/#/login, /#/student) — the bare paths /login and /student do not
// exist as files on the static host and would 404.
const LOGIN_URL = '/#/login'
const STUDENT_URL = '/#/student'

function showAuthError(message: string): void {
  authStatus.textContent = message
  authStatus.hidden = false
}

async function initializeInstructorPage(): Promise<void> {
  try {
    const { profile } = await getCurrentProfile()
    if (profile.role !== 'instructor') {
      window.location.replace(profile.role === 'student' ? STUDENT_URL : LOGIN_URL)
      return
    }
    authStatus.hidden = true
    main.hidden = false
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      window.location.replace(LOGIN_URL)
      return
    }
    showAuthError(
      error instanceof Error
        ? `Unable to verify instructor access: ${error.message}`
        : 'Unable to verify instructor access. Please try again.',
    )
  }
}

logoutButton.addEventListener('click', async () => {
  logoutButton.disabled = true
  logoutFeedback.textContent = ''
  logoutFeedback.classList.add('hidden')
  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(
        () => reject(new Error('Timed out while saving instructor materials. Try signing out again.')),
        10_000,
      )
      window.dispatchEvent(new CustomEvent('instructor-workspace-save', {
        detail: {
          resolve: () => {
            window.clearTimeout(timeout)
            resolve()
          },
          reject: (error: unknown) => {
            window.clearTimeout(timeout)
            reject(error)
          },
        },
      }))
    })
    await logout()
    window.location.assign(LOGIN_URL)
  } catch (error) {
    // The backend invalidates the local session and clears the cookie before
    // it confirms the global Supabase revocation, so a completed sign-out can
    // still come back as a 503 with signed_out (or a 401 if the session
    // already expired). In both cases the user is definitely signed out — go
    // to the login page instead of staying on the now-unusable studio.
    if (error instanceof ApiError && (error.signedOut || error.status === 401)) {
      window.location.assign(LOGIN_URL)
      return
    }
    logoutFeedback.textContent =
      error instanceof Error ? error.message : 'Unable to sign out. Please try again.'
    logoutFeedback.classList.remove('hidden')
    logoutButton.disabled = false
  }
})

void initializeInstructorPage()
