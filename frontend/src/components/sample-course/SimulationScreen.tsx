import { ArrowRight, Check, CircleAlert, Compass, X } from 'lucide-react'
import { useState } from 'react'
import { submitSampleAnswer, type SampleDecision } from '../../lib/api'

export interface DecisionResult {
  choice: string
  correct: boolean
  feedback: string
}

interface SimulationScreenProps {
  decisions: SampleDecision[]
  results: Record<string, DecisionResult>
  onAnswer: (decisionId: string, result: DecisionResult) => void
  onContinue: () => void
}

/** One decision at a time: scenario, options, server-checked feedback. */
export function SimulationScreen({ decisions, results, onAnswer, onContinue }: SimulationScreenProps) {
  const firstUnanswered = decisions.findIndex((decision) => !results[decision.id])
  const [index, setIndex] = useState(firstUnanswered === -1 ? decisions.length - 1 : firstUnanswered)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const allAnswered = decisions.every((decision) => results[decision.id])
  const decision = decisions[index]
  const result = decision ? results[decision.id] : undefined

  async function choose(optionId: string) {
    if (!decision || result || checking) return
    setChecking(true)
    setError(null)
    try {
      const checked = await submitSampleAnswer(decision.id, optionId)
      if (checked.type === 'decision') {
        onAnswer(decision.id, { choice: optionId, correct: checked.correct, feedback: checked.feedback })
      }
    } catch (checkError) {
      setError(checkError instanceof Error ? checkError.message : 'Unable to check that choice. Try again.')
    } finally {
      setChecking(false)
    }
  }

  if (!decision) return null
  const correctCount = decisions.filter((item) => results[item.id]?.correct).length

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#A21942]">
          <Compass aria-hidden="true" size={14} />
          Module 1 · Map the problem
        </p>
        <p className="mt-2 text-xs text-gray-500">
          Decision {index + 1} of {decisions.length} · {correctCount} good call{correctCount === 1 ? '' : 's'} so far
        </p>
        <p className="mt-4 text-sm leading-7 text-gray-700">{decision.scenario}</p>
        <h2 className="mt-4 text-lg font-bold text-[#262626]">{decision.question}</h2>

        <div className="mt-4 space-y-2.5">
          {decision.options.map((option) => {
            const chosen = result?.choice === option.id
            const chosenCorrect = chosen && result.correct
            const revealed = Boolean(result)
            return (
              <button
                className={`flex w-full items-start gap-3 rounded-lg border p-3.5 text-left text-sm leading-6 transition-colors ${
                  chosen
                    ? chosenCorrect
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                      : 'border-red-400 bg-red-50 text-red-900'
                    : revealed
                      ? 'border-gray-200 bg-gray-50 text-gray-500'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-[#A21942]/50 hover:bg-[#FBF8F6]'
                }`}
                disabled={revealed || checking}
                key={option.id}
                onClick={() => void choose(option.id)}
                type="button"
              >
                {revealed && chosen ? (
                  chosenCorrect
                    ? <Check aria-hidden="true" className="mt-1 shrink-0 text-emerald-600" size={16} strokeWidth={3} />
                    : <X aria-hidden="true" className="mt-1 shrink-0 text-red-500" size={16} strokeWidth={3} />
                ) : (
                  <span aria-hidden="true" className="mt-1 size-3.5 shrink-0 rounded-full border-2 border-gray-300" />
                )}
                {option.text}
              </button>
            )
          })}
        </div>

        {checking && <p className="mt-3 text-xs text-gray-500">Checking…</p>}
        {result && (
          <p className={`mt-4 flex items-start gap-2 rounded-lg p-3.5 text-sm leading-6 ${result.correct ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-900'}`} role="status">
            {result.correct
              ? <Check aria-hidden="true" className="mt-1 shrink-0" size={15} strokeWidth={3} />
              : <CircleAlert aria-hidden="true" className="mt-1 shrink-0" size={15} />}
            <span><strong>{result.correct ? 'Good call.' : 'Risky move.'}</strong> {result.feedback}</span>
          </p>
        )}
        {error && (
          <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p>
        )}

        {result && (
          <div className="mt-5 flex justify-end">
            <button
              className="inline-flex items-center gap-1.5 rounded-md bg-[#A21942] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#801333]"
              onClick={() => {
                if (index < decisions.length - 1) setIndex(index + 1)
                else onContinue()
              }}
              type="button"
            >
              {index < decisions.length - 1 ? 'Next decision' : 'Done with the simulation'} <ArrowRight aria-hidden="true" size={14} />
            </button>
          </div>
        )}
      </div>

      <button
        className="inline-flex items-center gap-2 rounded-lg bg-[#A21942] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#801333] disabled:cursor-not-allowed disabled:opacity-40"
        disabled={!allAnswered}
        onClick={onContinue}
        type="button"
      >
        Continue to the mini-lesson <ArrowRight aria-hidden="true" size={16} />
      </button>
    </div>
  )
}