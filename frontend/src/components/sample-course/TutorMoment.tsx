import { Bot, Check, LoaderCircle, Send, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { ApiError, askSampleTutor, type SampleTutorVerdict } from '../../lib/api'

export const MIN_TUTOR_CHARS = 20
export const MAX_TUTOR_CHARS = 300

export type TutorMomentState =
  | { status: 'idle' }
  | { status: 'done'; verdict: SampleTutorVerdict }
  | { status: 'skipped' }
  | { status: 'exhausted' }

interface TutorMomentProps {
  isGuest: boolean
  momentId: string
  remainingUses: number | null
  totalUses: number
  state: TutorMomentState
  task: string
  onDone: (verdict: SampleTutorVerdict) => void
  onExhausted: () => void
  onSkip: () => void
}

function scoreTone(score: number): string {
  if (score >= 75) return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (score >= 45) return 'bg-amber-50 text-amber-700 border-amber-200'
  return 'bg-rose-50 text-rose-700 border-rose-200'
}

/** The one place learners meet the AI tutor: a bounded textarea, a live
 * character counter, and the verdict card with the moment's key points. */
export function TutorMoment({
  isGuest,
  momentId,
  remainingUses,
  totalUses,
  state,
  task,
  onDone,
  onExhausted,
  onSkip,
}: TutorMomentProps) {
  const [answer, setAnswer] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const trimmed = answer.trim()
  const tooShort = trimmed.length < MIN_TUTOR_CHARS
  const tooLong = trimmed.length > MAX_TUTOR_CHARS

  async function submit() {
    if (isSending || tooShort || tooLong) return
    setError(null)
    setIsSending(true)
    try {
      const verdict = await askSampleTutor(momentId, trimmed)
      onDone(verdict)
    } catch (submitError) {
      if (submitError instanceof ApiError && submitError.status === 429) {
        onExhausted()
      } else {
        setError(
          submitError instanceof Error
            ? submitError.message
            : 'The AI tutor is unavailable. Try again in a moment.',
        )
      }
    } finally {
      setIsSending(false)
    }
  }

  if (state.status === 'done') {
    const { verdict } = state
    return (
      <div className="bot-pop rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-4">
          <span className={`flex size-14 shrink-0 items-center justify-center rounded-full border text-lg font-extrabold ${scoreTone(verdict.score)}`}>
            {verdict.score}
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#A21942]">
              <Bot aria-hidden="true" size={14} />
              AI tutor feedback
            </p>
            <p className="mt-1.5 text-sm leading-6 text-gray-700">{verdict.feedback}</p>
          </div>
        </div>
        <div className="mt-4 rounded-lg bg-[#FBF8F6] p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-[#801333]">Key points</p>
          <ul className="mt-2 space-y-1.5">
            {verdict.key_points.map((point) => (
              <li className="flex items-start gap-2 text-sm leading-6 text-gray-700" key={point}>
                <Check aria-hidden="true" className="mt-1.5 shrink-0 text-emerald-600" size={14} strokeWidth={3} />
                {point}
              </li>
            ))}
          </ul>
        </div>
      </div>
    )
  }

  if (state.status === 'skipped') {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-sm leading-6 text-gray-600">
        You skipped this AI tutor moment — no score this time.
        {isGuest ? ' Sign in and replay the course to get feedback here.' : ''}
      </div>
    )
  }

  if (state.status === 'exhausted') {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
        <p className="flex items-center gap-2 text-sm font-bold text-amber-800">
          <Sparkles aria-hidden="true" size={15} />
          You've used all your AI tutor moments
        </p>
        <p className="mt-1.5 text-sm leading-6 text-amber-800">
          {isGuest
            ? 'Sign in to keep practising with fresh feedback on every try — and to save your score.'
            : 'Continue the course — or replay it later to improve this score.'}
        </p>
        {isGuest && (
          <a
            className="mt-3 inline-flex items-center justify-center rounded-md bg-[#A21942] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#801333]"
            href="/login"
          >
            Sign in
          </a>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#A21942]">
          <Bot aria-hidden="true" size={14} />
          AI tutor moment
        </p>
        {remainingUses !== null && (
          <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-semibold text-gray-600">
            {remainingUses} of {totalUses} tutor {totalUses === 1 ? 'use' : 'uses'} left
          </span>
        )}
      </div>
      <p className="mt-3 text-sm font-semibold leading-6 text-gray-800">{task}</p>
      <textarea
        aria-label="Your answer for the AI tutor"
        className="mt-3 min-h-24 w-full resize-y rounded-lg border border-gray-200 p-3 text-sm focus:border-[#A21942] focus:outline-none"
        maxLength={MAX_TUTOR_CHARS + 50}
        onChange={(event) => setAnswer(event.target.value)}
        placeholder="Write 1–2 sentences in your own words…"
        value={answer}
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <p className={`text-xs ${tooLong ? 'font-semibold text-rose-600' : 'text-gray-500'}`}>
          {trimmed.length}/{MAX_TUTOR_CHARS} characters (min {MIN_TUTOR_CHARS})
        </p>
        <div className="flex items-center gap-3">
          <button
            className="text-xs font-medium text-gray-500 transition-colors hover:text-gray-700"
            onClick={onSkip}
            type="button"
          >
            Skip this moment
          </button>
          <button
            className="inline-flex items-center gap-1.5 rounded-md bg-[#A21942] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#801333] disabled:cursor-not-allowed disabled:opacity-40"
            disabled={isSending || tooShort || tooLong}
            onClick={() => void submit()}
            type="button"
          >
            {isSending ? (
              <>
                <LoaderCircle aria-hidden="true" className="animate-spin" size={15} />
                Your AI tutor is reading…
              </>
            ) : (
              <>
                <Send aria-hidden="true" size={14} />
                Ask the AI tutor
              </>
            )}
          </button>
        </div>
      </div>
      {error && (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}