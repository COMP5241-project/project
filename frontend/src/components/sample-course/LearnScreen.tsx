import { ArrowRight, BookOpen, Check, Lightbulb, X } from 'lucide-react'
import { useState } from 'react'
import { submitSampleAnswer, type SampleQuizQuestion, type SampleSlide } from '../../lib/api'

export interface QuizResult {
  choice: number
  correct: boolean
  correctIndex: number
  explanation: string
}

interface LearnScreenProps {
  slides: SampleSlide[]
  quiz: SampleQuizQuestion[]
  results: Record<string, QuizResult>
  onAnswer: (questionId: string, result: QuizResult) => void
  onContinue: () => void
}

export function LearnScreen({ slides, quiz, results, onAnswer, onContinue }: LearnScreenProps) {
  const allAnswered = quiz.every((question) => results[question.id])
  const correctCount = quiz.filter((question) => results[question.id]?.correct).length

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#A21942]">
          <BookOpen aria-hidden="true" size={14} />
          Module 2 · See it, then try it
        </p>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          Five quick slides distilled from the full COMP5241 course, then a 3-question check.
        </p>
        <div className="mt-5 space-y-4">
          {slides.map((slide, slideIndex) => (
            <article className="rounded-xl border border-gray-200 bg-[#F8F9FA] p-5" key={slide.id}>
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-base font-bold text-[#262626]">{slide.title}</h3>
                <span className="shrink-0 font-mono text-[10px] text-gray-400">{String(slideIndex + 1).padStart(2, '0')}</span>
              </div>
              <ul className="mt-3 space-y-2">
                {slide.bullets.map((bullet) => (
                  <li className="flex items-start gap-2 text-sm leading-6 text-gray-700" key={bullet}>
                    <span aria-hidden="true" className="mt-2.5 size-1.5 shrink-0 rounded-full bg-[#A21942]" />
                    {bullet}
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {slide.steps.map((step, stepIndex) => (
                  <span className="flex items-center gap-2" key={step}>
                    {stepIndex > 0 && <ArrowRight aria-hidden="true" className="text-[#A21942]" size={13} />}
                    <span className="rounded-md border border-[#A21942]/30 bg-white px-2.5 py-1 text-xs font-semibold text-[#801333]">
                      {step}
                    </span>
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#A21942]">
          <Lightbulb aria-hidden="true" size={14} />
          Check yourself
        </p>
        <p className="mt-2 text-xs text-gray-500">
          {Object.keys(results).length} of {quiz.length} answered · {correctCount} correct
        </p>
        <div className="mt-5 space-y-6">
          {quiz.map((question, questionIndex) => (
            <QuizQuestionCard
              index={questionIndex}
              key={question.id}
              onAnswer={onAnswer}
              question={question}
              result={results[question.id]}
            />
          ))}
        </div>
      </div>

      <button
        className="inline-flex items-center gap-2 rounded-lg bg-[#A21942] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#801333] disabled:cursor-not-allowed disabled:opacity-40"
        disabled={!allAnswered}
        onClick={onContinue}
        type="button"
      >
        Continue to the prompt lab <ArrowRight aria-hidden="true" size={16} />
      </button>
    </div>
  )
}

interface QuizQuestionCardProps {
  index: number
  question: SampleQuizQuestion
  result?: QuizResult
  onAnswer: (questionId: string, result: QuizResult) => void
}

function QuizQuestionCard({ index, question, result, onAnswer }: QuizQuestionCardProps) {
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function choose(optionIndex: number) {
    if (result || checking) return
    setChecking(true)
    setError(null)
    try {
      const checked = await submitSampleAnswer(question.id, String(optionIndex))
      if (checked.type === 'quiz') {
        onAnswer(question.id, {
          choice: optionIndex,
          correct: checked.correct,
          correctIndex: checked.correct_index,
          explanation: checked.explanation,
        })
      }
    } catch (checkError) {
      setError(checkError instanceof Error ? checkError.message : 'Unable to check that answer. Try again.')
    } finally {
      setChecking(false)
    }
  }

  return (
    <article>
      <h4 className="text-sm font-bold leading-6 text-gray-800">
        <span className="text-[#A21942]">Q{index + 1}.</span> {question.question}
      </h4>
      <div className="mt-3 space-y-2">
        {question.options.map((option, optionIndex) => {
          const chosen = result?.choice === optionIndex
          const isCorrectOption = result && optionIndex === result.correctIndex
          return (
            <button
              className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left text-sm leading-6 transition-colors ${
                result
                  ? isCorrectOption
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                    : chosen
                      ? 'border-red-400 bg-red-50 text-red-900'
                      : 'border-gray-200 bg-gray-50 text-gray-500'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-[#A21942]/50 hover:bg-[#FBF8F6]'
              }`}
              disabled={Boolean(result) || checking}
              key={`${question.id}-${optionIndex}`}
              onClick={() => void choose(optionIndex)}
              type="button"
            >
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-bold text-gray-600">
                {String.fromCharCode(65 + optionIndex)}
              </span>
              {option}
              {result && isCorrectOption && <Check aria-hidden="true" className="ml-auto mt-1 shrink-0 text-emerald-600" size={15} strokeWidth={3} />}
              {result && chosen && !isCorrectOption && <X aria-hidden="true" className="ml-auto mt-1 shrink-0 text-red-500" size={15} strokeWidth={3} />}
            </button>
          )
        })}
      </div>
      {checking && <p className="mt-2 text-xs text-gray-500">Checking…</p>}
      {result && (
        <p className={`mt-3 rounded-lg p-3.5 text-sm leading-6 ${result.correct ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-900'}`} role="status">
          <strong>{result.correct ? 'Correct.' : 'Not quite.'}</strong> {result.explanation}
        </p>
      )}
      {error && <p className="mt-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p>}
    </article>
  )
}