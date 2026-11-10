import { Check, CircleAlert, FileCode2, Play, Terminal } from 'lucide-react'
import { useState } from 'react'
import { completeAssessment, type CurrentProfile } from '../lib/api'

interface CsValidationAssessmentProps {
  onComplete: (profile: CurrentProfile) => void
}

type AssessmentStep = 'hello' | 'gitignore'

export function CsValidationAssessment({ onComplete }: CsValidationAssessmentProps) {
  const [step, setStep] = useState<AssessmentStep>('hello')
  const [pythonCode, setPythonCode] = useState(`import requests
API_KEY = "sk-12345"
# Fix the headers below
response = requests.get("https://api.edugen.com/data", headers=API_KEY)`)
  const [gitignoreRules, setGitignoreRules] = useState(`node_modules/
*.log
.DS_Store
# Add environment variables below
`)
  const [helloPassed, setHelloPassed] = useState(false)
  const [gitignorePassed, setGitignorePassed] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [savedProfile, setSavedProfile] = useState<CurrentProfile | null>(null)

  async function saveSuccessfulAssessment() {
    if (isSaving || savedProfile) return
    setIsSaving(true)
    setFeedback(null)
    try {
      const profile = await completeAssessment(true)
      setSavedProfile(profile)
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Unable to save your assessment result.')
    } finally {
      setIsSaving(false)
    }
  }

  async function runHelloCheck() {
    const passed = pythonCode.includes('{"Authorization":') || pythonCode.includes('{"x-api-key":')
    setHelloPassed(passed)
    if (passed) {
      await saveSuccessfulAssessment()
      return
    }
    setFeedback('Fix the headers so the API key is sent as Authorization or x-api-key.')
  }

  function skipHelloCheck() {
    setStep('gitignore')
    setFeedback(null)
  }

  async function runGitignoreCheck() {
    const passed = gitignoreRules.includes('.env')
    setGitignorePassed(passed)
    if (!passed) {
      setFeedback('Error: API keys are still exposed. Hide your environment files.')
      return
    }
    await saveSuccessfulAssessment()
  }

  async function finishAssessment() {
    if (!savedProfile || isSaving) return
    onComplete(savedProfile)
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <span className="inline-flex size-12 items-center justify-center rounded-xl bg-[#A21942]/10 text-[#A21942]">
        <Terminal aria-hidden="true" size={24} />
      </span>
      <p className="mt-6 text-sm font-semibold text-[#A21942]">Two-step CS validation</p>
      <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-[#262626]">
        Show us how you work
      </h1>
      <p className="mt-3 text-sm leading-6 text-gray-600">
        Complete both practical checks to unlock your student learning track.
      </p>

      {!savedProfile && (
        <>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className={`rounded-md border p-4 ${helloPassed ? 'border-emerald-200 bg-emerald-50' : 'border-[#A21942] bg-red-50 text-[#A21942]'}`}>
          <div className="flex items-center gap-2 text-sm font-semibold text-[#262626]">
            {helloPassed ? <Check className="text-emerald-600" size={16} /> : <Terminal className="text-[#A21942]" size={16} />}
            1. Fix API Request
          </div>
          <p className="mt-1 text-xs text-gray-600">Fix the missing authentication header.</p>
        </div>
        <div className={`rounded-md border p-4 ${gitignorePassed ? 'border-emerald-200 bg-emerald-50' : step === 'gitignore' ? 'border-[#A21942] bg-red-50 text-[#A21942]' : 'border-gray-200 bg-gray-50 text-gray-500'}`}>
          <div className="flex items-center gap-2 text-sm font-semibold text-[#262626]">
            {gitignorePassed ? <Check className="text-emerald-600" size={16} /> : <FileCode2 className="text-[#A21942]" size={16} />}
            2. Protect API Secrets
          </div>
          <p className="mt-1 text-xs text-gray-600">Add the environment file to .gitignore.</p>
        </div>
      </div>

      {step === 'hello' && !helloPassed && (
        <div className="mt-6">
          <p className="mb-3 text-sm leading-6 text-gray-600">This Python snippet is missing the authentication header. Fix the code to pass the API key correctly.</p>
          <label className="mb-1.5 block text-sm font-medium text-[#262626]" htmlFor="python-validation-code">Python code</label>
          <textarea className="h-32 w-full rounded-md bg-[#262626] p-4 font-mono text-sm text-gray-100 outline-none focus:ring-2 focus:ring-[#A21942]" id="python-validation-code" onChange={(event) => setPythonCode(event.target.value)} spellCheck={false} value={pythonCode} />
          <button className="mt-3 inline-flex items-center gap-2 rounded-md bg-[#A21942] px-4 py-2 text-sm font-semibold text-white hover:bg-[#801333]" onClick={runHelloCheck} type="button">
            <Play aria-hidden="true" size={15} /> Run code
          </button>
        </div>
      )}

      {step === 'gitignore' && !gitignorePassed && (
        <div className="mt-6">
          <p className="mb-3 text-sm leading-6 text-gray-600">Prevent API key leakage. Add the standard environment variable file to this .gitignore before committing.</p>
          <label className="mb-1.5 block text-sm font-medium text-[#262626]" htmlFor="gitignore-validation-code">.gitignore</label>
          <textarea className="h-32 w-full rounded-md bg-[#262626] p-4 font-mono text-sm text-gray-100 outline-none focus:ring-2 focus:ring-[#A21942]" id="gitignore-validation-code" onChange={(event) => setGitignoreRules(event.target.value)} spellCheck={false} value={gitignoreRules} />
          <button className="mt-3 inline-flex items-center gap-2 rounded-md bg-[#A21942] px-4 py-2 text-sm font-semibold text-white hover:bg-[#801333]" onClick={runGitignoreCheck} type="button">
            <FileCode2 aria-hidden="true" size={15} /> Check .gitignore
          </button>
        </div>
      )}

      {step === 'hello' && !helloPassed && (
        <button className="mt-3 inline-flex items-center rounded-md border border-gray-300 px-4 py-2 text-gray-600 transition-colors hover:bg-gray-50" onClick={skipHelloCheck} type="button">
          Skip step 1
        </button>
      )}

      {feedback && (
        <p className={`mt-4 inline-flex items-center gap-2 rounded-md border px-4 py-3 text-sm ${feedback.includes('passed') ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`} role="status">
          {feedback.includes('passed') ? <Check size={16} /> : <CircleAlert size={16} />}
          {feedback}
        </p>
      )}
        </>
      )}

      {savedProfile && (
        <div className="mt-6 bg-slate-50 border border-gray-200 rounded-lg p-5">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <Check aria-hidden="true" size={20} />
            </span>
            <div>
              <h2 className="text-xl font-bold text-[#262626]">Diagnostic Complete</h2>
              <p className="mt-1 text-sm text-gray-600">CS Major Track has been assigned to your profile.</p>
            </div>
          </div>
          <div className="mt-6 bg-slate-50 border border-gray-200 rounded-lg p-5">
            <h3 className="text-sm font-bold text-[#A21942] uppercase tracking-wider mb-3">Why these checks matter:</h3>
            <ul className="space-y-4 text-sm text-gray-600">
              <li><strong className="text-[#262626]">API Authentication:</strong> Passing API keys via secure headers (like Authorization or x-api-key) rather than plaintext URLs prevents your credentials from being intercepted or logged by network nodes.</li>
              <li><strong className="text-[#262626]">Git Security:</strong> Committing `.env` files to public repositories is the #1 cause of leaked credentials, resulting in compromised databases and massive unauthorized cloud billing charges. Always utilize `.gitignore`.</li>
            </ul>
          </div>
          <button className="mt-8 w-full rounded-md bg-[#A21942] px-4 py-3 font-bold text-white transition-colors hover:bg-[#801333]" onClick={finishAssessment} type="button">
            Continue to learning track
          </button>
        </div>
      )}
    </div>
  )
}
