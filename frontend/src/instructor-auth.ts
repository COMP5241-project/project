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

function showAuthError(message: string): void {
  authStatus.textContent = message
  authStatus.hidden = false
}

async function initializeInstructorPage(): Promise<void> {
  try {
    const { profile } = await getCurrentProfile()
    if (profile.role !== 'instructor') {
      window.location.replace(profile.role === 'student' ? '/student' : '/login')
      return
    }
    authStatus.hidden = true
    main.hidden = false
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      window.location.replace('/login')
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
    window.location.assign('/login')
  } catch (error) {
    logoutFeedback.textContent =
      error instanceof Error ? error.message : 'Unable to sign out. Please try again.'
    logoutFeedback.classList.remove('hidden')
    logoutButton.disabled = false
  }
})

void initializeInstructorPage()
