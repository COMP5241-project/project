import { Check, CircleAlert, Compass, FileCode2, Play, Sparkles, Terminal } from 'lucide-react'
import { useState } from 'react'
import { completeAssessment, type CurrentProfile } from '../lib/api'

interface CsValidationAssessmentProps {
  onComplete: (profile: CurrentProfile) => void
}

type AssessmentStep = 'hello' | 'gitignore'
type CheckResult = 'passed' | 'failed' | 'skipped'

function hasApiHeader(code: string): boolean {
  const activeCode = code.split('\n').filter((line) => !line.trimStart().startsWith('#')).join('\n')
  return /(["'])(?:authorization|x-api-key)\1\s*:/i.test(activeCode)
    || /\bheaders\s*\[\s*(["'])(?:authorization|x-api-key)\1\s*\]\s*=/i.test(activeCode)
}

function resultLabel(result: CheckResult | null): string {
  if (result === 'passed') return 'Skill demonstrated'
  if (result === 'failed') return 'Foundation focus'
  if (result === 'skipped') return 'Skipped'
  return 'Not attempted'
}

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
  const [helloResult, setHelloResult] = useState<CheckResult | null>(null)
  const [gitignoreResult, setGitignoreResult] = useState<CheckResult | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [savedProfile, setSavedProfile] = useState<CurrentProfile | null>(null)

  async function saveAssessment(csQualified: boolean) {
    if (isSaving || savedProfile) return
    setIsSaving(true)
    setFeedback(null)
    try {
      const profile = await completeAssessment(csQualified)
      setSavedProfile(profile)
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Unable to save your assessment result.')
    } finally {
      setIsSaving(false)
    }
  }

  function runHelloCheck() {
    setHelloResult(hasApiHeader(pythonCode) ? 'passed' : 'failed')
    setFeedback(null)
    setStep('gitignore')
  }

  function skipHelloCheck() {
    setHelloResult('skipped')
    setFeedback(null)
    setStep('gitignore')
  }

  async function runGitignoreCheck() {
    const passed = gitignoreRules.includes('.env')
    setGitignoreResult(passed ? 'passed' : 'failed')
    await saveAssessment(helloResult === 'passed' && passed)
  }

  async function skipGitignoreCheck() {
    setGitignoreResult('skipped')
    await saveAssessment(false)
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
        Complete the practical checks to unlock your student learning track.
      </p>

      {!savedProfile && (
        <>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className={`rounded-md border p-4 ${helloResult === 'passed' ? 'border-emerald-200 bg-emerald-50' : helloResult !== null ? 'border-gray-200 bg-gray-50' : 'border-[#A21942] bg-red-50 text-[#A21942]'}`}>
          <div className="flex items-center gap-2 text-sm font-semibold text-[#262626]">
            {helloResult === 'passed' ? <Check className="text-emerald-600" size={16} /> : <Terminal className="text-[#A21942]" size={16} />}
            1. Fix API Request
          </div>
          <p className="mt-1 text-xs text-gray-600">{helloResult === null ? 'Fix the missing authentication header.' : resultLabel(helloResult)}</p>
        </div>
        <div className={`rounded-md border p-4 ${gitignoreResult === 'passed' ? 'border-emerald-200 bg-emerald-50' : step === 'gitignore' ? 'border-[#A21942] bg-red-50 text-[#A21942]' : 'border-gray-200 bg-gray-50 text-gray-500'}`}>
          <div className="flex items-center gap-2 text-sm font-semibold text-[#262626]">
            {gitignoreResult === 'passed' ? <Check className="text-emerald-600" size={16} /> : <FileCode2 className="text-[#A21942]" size={16} />}
            2. Protect API Secrets
          </div>
          <p className="mt-1 text-xs text-gray-600">Add the environment file to .gitignore.</p>
        </div>
      </div>

      {step === 'hello' && (
        <div className="mt-6">
          <p className="mb-3 text-sm leading-6 text-gray-600">This Python snippet is missing the authentication header. Fix the code to pass the API key correctly.</p>
          <label className="mb-1.5 block text-sm font-medium text-[#262626]" htmlFor="python-validation-code">Python code</label>
          <textarea className="h-32 w-full rounded-md bg-[#262626] p-4 font-mono text-sm text-gray-100 outline-none focus:ring-2 focus:ring-[#A21942]" id="python-validation-code" onChange={(event) => setPythonCode(event.target.value)} spellCheck={false} value={pythonCode} />
          <button className="mt-3 inline-flex items-center gap-2 rounded-md bg-[#A21942] px-4 py-2 text-sm font-semibold text-white hover:bg-[#801333] disabled:opacity-70" disabled={isSaving} onClick={runHelloCheck} type="button">
            <Play aria-hidden="true" size={15} /> Run code
          </button>
        </div>
      )}

      {step === 'gitignore' && (
        <div className="mt-6">
          <p className="mb-3 text-sm leading-6 text-gray-600">Prevent API key leakage. Add the standard environment variable file to this .gitignore before committing.</p>
          <label className="mb-1.5 block text-sm font-medium text-[#262626]" htmlFor="gitignore-validation-code">.gitignore</label>
          <textarea className="h-32 w-full rounded-md bg-[#262626] p-4 font-mono text-sm text-gray-100 outline-none focus:ring-2 focus:ring-[#A21942]" id="gitignore-validation-code" onChange={(event) => setGitignoreRules(event.target.value)} spellCheck={false} value={gitignoreRules} />
          <button className="mt-3 inline-flex items-center gap-2 rounded-md bg-[#A21942] px-4 py-2 text-sm font-semibold text-white hover:bg-[#801333] disabled:opacity-70" disabled={isSaving} onClick={runGitignoreCheck} type="button">
            <FileCode2 aria-hidden="true" size={15} /> Check .gitignore
          </button>
        </div>
      )}

      {step === 'hello' && (
        <button className="mt-3 inline-flex items-center rounded-md border border-gray-300 px-4 py-2 text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-70" disabled={isSaving} onClick={skipHelloCheck} type="button">
          Skip step 1
        </button>
      )}

      {step === 'gitignore' && (
        <button className="mt-3 inline-flex items-center rounded-md border border-gray-300 px-4 py-2 text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-70" disabled={isSaving} onClick={skipGitignoreCheck} type="button">
          Skip step 2
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
        <div className="mt-6 space-y-5">
          <div className="relative overflow-hidden rounded-xl border border-[#A21942]/20 bg-[#A21942]/5 p-6 shadow-sm">
            <div className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-[#A21942]/10" />
            <div className="relative flex items-start gap-4">
              <span className="motion-safe:animate-pulse flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[#A21942] text-white shadow-sm">
                {savedProfile.profile.cs_qualified
                  ? <Sparkles aria-hidden="true" size={28} />
                  : <Compass aria-hidden="true" size={28} />}
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#A21942]">
                  Assessment result · Your learning path is ready
                </p>
                <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-[#262626]">
                  {savedProfile.profile.cs_qualified ? 'CS Major Track' : 'Non-CS Major Track'}
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-gray-600">
                  {savedProfile.profile.cs_qualified
                    ? 'Your results show a strong starting point for the CS Major Track. Keep building with the next set of challenges.'
                    : 'This is a starting point, not a failure. Your Non-CS Major Track is designed to build confidence step by step.'}
                </p>
              </div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-[#262626]">1. Fix API Request</p>
              <p className="mt-1 text-xs font-semibold text-[#A21942]">
                {resultLabel(helloResult)}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-[#262626]">2. Protect API Secrets</p>
              <p className="mt-1 text-xs font-semibold text-[#A21942]">
                {resultLabel(gitignoreResult)}
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold text-[#A21942] uppercase tracking-wider mb-3">Why these checks matter:</h3>
            <ul className="space-y-4 text-sm text-gray-600">
              <li><strong className="text-[#262626]">API Authentication:</strong> Secure headers such as Authorization or x-api-key keep credentials out of URLs, where they could be logged or intercepted.</li>
              <li><strong className="text-[#262626]">Git Security:</strong> Keeping `.env` files out of version control prevents credentials from being exposed in repositories and protects connected services from unauthorized use.</li>
              <li><strong className="text-[#262626]">Why this matters for learning software development:</strong> These habits build the foundation for writing software that is secure, maintainable, and safe to share with teammates and users.</li>
            </ul>
          </div>
          <button className="mt-8 w-full rounded-md bg-[#A21942] px-4 py-3 font-bold text-white transition-colors hover:bg-[#801333]" onClick={finishAssessment} type="button">
            {savedProfile.profile.cs_qualified ? 'Continue to learning track' : 'Continue to The App Factory'}
          </button>
        </div>
      )}
    </div>
  )
}
