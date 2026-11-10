import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, ArrowRight, BookOpen, CircleCheck, GraduationCap, LoaderCircle, Shapes, XCircle } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  fetchStudentCourse,
  reportCourseProgress,
  submitCourseAnswer,
  type StudentAnswerResult,
  type StudentCourse,
  type StudentQuizQuestion,
  type StudentSlide,
} from '../lib/api'
import { useProfile } from '../lib/useProfile'

export const Route = createFileRoute('/courses_/$id')({
  component: CoursePlayerPage,
})

const SLIDE_WIDTH = 1280
const SLIDE_HEIGHT = 720

function CoursePlayerPage() {
  const state = useProfile()
  const { id } = Route.useParams()

  let content: ReactNode
  if (state.status === 'loading') {
    content = (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-gray-200 bg-white p-10 text-center shadow-sm">
        <LoaderCircle aria-hidden="true" className="animate-spin text-[#A21942]" size={28} />
        <p className="text-sm text-gray-600">Checking your session…</p>
      </div>
    )
  } else if (state.status === 'unauthenticated') {
    content = (
      <NoticeCard
        action={
          <Link className="font-semibold text-[#A21942] hover:underline" to="/login">
            Back to sign in
          </Link>
        }
        message="You are not signed in, or your session has expired."
        title="Session required"
      />
    )
  } else if (state.status === 'error') {
    content = <NoticeCard message={state.message} title="Something went wrong" />
  } else if (state.profile.role !== 'student') {
    content = (
      <NoticeCard
        message={`You are signed in as ${state.email}, but this area is for students.`}
        title="Student area"
      />
    )
  } else {
    content = <CoursePlayer courseId={id} />
  }

  return (
    <main className="flex min-h-screen flex-col bg-[#F8F9FA]">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
          <Link aria-label="PolyU Edu 4.0 home" className="inline-flex items-center gap-2.5" to="/">
            <span className="flex size-9 items-center justify-center rounded-lg bg-[#A21942] text-white">
              <GraduationCap aria-hidden="true" size={20} />
            </span>
            <span className="text-sm font-extrabold tracking-tight text-[#262626]">
              PolyU <span className="text-[#A21942]">Edu 4.0</span>
            </span>
          </Link>
          <Link
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
            to="/student"
          >
            <BookOpen aria-hidden="true" size={15} />
            My courses
          </Link>
        </div>
      </header>
      <div className="flex flex-1 items-start justify-center px-4 py-10">
        <div className="w-full max-w-5xl">{content}</div>
      </div>
    </main>
  )
}

function NoticeCard({ action, message, title }: { action?: ReactNode; message: string; title: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <h1 className="text-2xl font-extrabold tracking-tight text-[#262626]">{title}</h1>
      <p className="mt-3 text-sm leading-6 text-gray-600">{message}</p>
      {action ? <p className="mt-5">{action}</p> : null}
    </div>
  )
}

function useCourseContent(courseId: string) {
  const [course, setCourse] = useState<StudentCourse | null>(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    // All state updates happen in promise callbacks — never synchronously
    // inside the effect (react-hooks/set-state-in-effect).
    fetchStudentCourse(courseId)
      .then((data) => {
        if (!cancelled) {
          setCourse(data)
          setIsLoading(false)
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load this course.')
          setIsLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [courseId, attempt])

  const retry = useCallback(() => {
    setCourse(null)
    setError('')
    setIsLoading(true)
    setAttempt((current) => current + 1)
  }, [])

  return { course, error, isLoading, retry }
}

function CoursePlayer({ courseId }: { courseId: string }) {
  const { course, error, isLoading, retry } = useCourseContent(courseId)
  const [phase, setPhase] = useState<'content' | 'summary'>('content')
  const [score, setScore] = useState<{ correct: number; total: number } | null>(null)
  const startReported = useRef(false)

  useEffect(() => {
    if (course && !startReported.current) {
      startReported.current = true
      void reportCourseProgress(course.id, 'start').catch(() => undefined)
    }
  }, [course])

  function finish(result?: { correct: number; total: number }) {
    if (result) setScore(result)
    void reportCourseProgress(courseId, 'complete').catch(() => undefined)
    setPhase('summary')
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-gray-200 bg-white p-10 text-center shadow-sm">
        <LoaderCircle aria-hidden="true" className="animate-spin text-[#A21942]" size={28} />
        <p className="text-sm text-gray-600">Loading your course…</p>
      </div>
    )
  }
  if (error || !course) {
    return (
      <NoticeCard
        action={
          <button className="font-semibold text-[#A21942] hover:underline" onClick={retry} type="button">
            Try again
          </button>
        }
        message={error || 'This course is not available.'}
        title="Course unavailable"
      />
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-[#A21942]">
          {course.content.type === 'slides' ? 'Slide deck' : 'Quiz'}
        </p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#262626]">{course.title}</h1>
      </div>
      {phase === 'summary' ? (
        <SummaryPanel
          onBackToCourse={() => setPhase('content')}
          score={score}
          title={course.title}
          type={course.content.type}
        />
      ) : course.content.type === 'slides' ? (
        <SlidesView slides={course.content.content} onFinish={() => finish()} />
      ) : (
        <QuizView courseId={course.id} onFinish={finish} questions={course.content.questions} />
      )}
    </div>
  )
}

function SummaryPanel({
  onBackToCourse,
  score,
  title,
  type,
}: {
  onBackToCourse: () => void
  score: { correct: number; total: number } | null
  title: string
  type: 'slides' | 'quiz'
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
      <CircleCheck className="mx-auto text-emerald-500" size={44} />
      <h2 className="mt-4 text-xl font-bold text-[#262626]">Course complete</h2>
      <p className="mt-2 text-sm text-gray-600">
        {type === 'quiz' && score
          ? `You answered ${score.correct} of ${score.total} question${score.total === 1 ? '' : 's'} correctly in ${title}.`
          : `You finished ${title}.`}
      </p>
      <div className="mt-6 flex items-center justify-center gap-3">
        <Link
          className="inline-flex items-center gap-1.5 rounded-md bg-[#A21942] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#801333]"
          to="/student"
        >
          Back to my courses
        </Link>
        {type === 'quiz' && (
          <button
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
            onClick={onBackToCourse}
            type="button"
          >
            Review answers
          </button>
        )}
      </div>
    </div>
  )
}

/** Read-only 16:9 slide canvas with prev/next navigation (mirrors the studio stage). */
function SlidesView({ slides, onFinish }: { slides: StudentSlide[]; onFinish: () => void }) {
  const [index, setIndex] = useState(0)
  const [scale, setScale] = useState(1)
  const viewportRef = useRef<HTMLDivElement>(null)
  const slide = slides[index]

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    const measure = () => setScale(viewport.clientWidth / SLIDE_WIDTH)
    const observer = new ResizeObserver(measure)
    observer.observe(viewport)
    measure()
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target
      if (
        target instanceof HTMLElement &&
        (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable)
      ) return
      if (['ArrowRight', 'ArrowDown', 'Enter', ' '].includes(event.key)) {
        event.preventDefault()
        setIndex((current) => Math.min(slides.length - 1, current + 1))
      } else if (['ArrowLeft', 'ArrowUp'].includes(event.key)) {
        event.preventDefault()
        setIndex((current) => Math.max(0, current - 1))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [slides.length])

  if (!slide) {
    return (
      <p className="rounded-lg border border-gray-200 bg-white p-10 text-center text-sm text-gray-500 shadow-sm">
        This deck has no slides yet.
      </p>
    )
  }
  const theme = resolveTheme(slide.theme)
  const isLast = index === slides.length - 1

  return (
    <div className="space-y-3">
      <div ref={viewportRef} className="overflow-hidden rounded-lg border border-gray-200 bg-slate-100 p-3 sm:p-6">
        <div style={{ height: SLIDE_HEIGHT * scale }}>
          <article
            className="flex flex-col overflow-hidden rounded-md border border-gray-200 shadow-lg"
            style={{
              width: SLIDE_WIDTH,
              height: SLIDE_HEIGHT,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              backgroundColor: theme.background,
              color: theme.textColor,
            }}
          >
            <div className="flex h-full flex-col justify-between p-16">
              <h2 className="text-5xl font-bold leading-tight">{slide.title}</h2>
              <div className="grid min-h-0 flex-1 grid-cols-2 items-center gap-12 pt-5">
                <ul className="space-y-2 overflow-auto text-2xl">
                  {slide.bullets.map((bullet, bulletIndex) => (
                    <li className="list-disc pl-5" key={bulletIndex}>{bullet}</li>
                  ))}
                </ul>
                <div
                  className="flex max-h-full flex-col items-center justify-center gap-5 overflow-auto rounded-xl border-2 border-dashed p-6 text-center"
                  style={{
                    borderColor: theme.accentColor,
                    backgroundColor: theme.cardBackground,
                    color: theme.textColor,
                  }}
                >
                  {slide.visual.kind === 'photo' && slide.imageData ? (
                    <img
                      alt={slide.visual.description}
                      className="max-h-full max-w-full rounded-lg object-contain"
                      src={slide.imageData}
                    />
                  ) : (
                    <>
                      <Shapes aria-hidden="true" size={28} style={{ color: theme.accentColor }} />
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        {slide.visual.steps.map((step, stepIndex) => (
                          <span className="flex items-center gap-2" key={stepIndex}>
                            {stepIndex > 0 && (
                              <ArrowRight aria-hidden="true" size={16} style={{ color: theme.accentColor }} />
                            )}
                            <span
                              className="rounded-lg border px-3 py-2 text-sm font-semibold"
                              style={{ borderColor: theme.accentColor }}
                            >
                              {step}
                            </span>
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <button
          className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={index === 0}
          onClick={() => setIndex((current) => Math.max(0, current - 1))}
          type="button"
        >
          <ArrowLeft aria-hidden="true" size={15} /> Previous
        </button>
        <p className="text-sm text-gray-500">
          Slide {index + 1} of {slides.length}
        </p>
        {isLast ? (
          <button
            className="inline-flex items-center gap-1.5 rounded-md bg-[#A21942] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#801333]"
            onClick={onFinish}
            type="button"
          >
            Finish course <ArrowRight aria-hidden="true" size={15} />
          </button>
        ) : (
          <button
            className="inline-flex items-center gap-1.5 rounded-md bg-[#A21942] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#801333]"
            onClick={() => setIndex((current) => Math.min(slides.length - 1, current + 1))}
            type="button"
          >
            Next <ArrowRight aria-hidden="true" size={15} />
          </button>
        )}
      </div>
    </div>
  )
}

interface QuestionState {
  selected: number | null
  result: StudentAnswerResult | null
  checking: boolean
}

/** Quiz player: answers are checked and recorded server-side, one question at a time. */
function QuizView({
  courseId,
  onFinish,
  questions,
}: {
  courseId: string
  onFinish: (result: { correct: number; total: number }) => void
  questions: StudentQuizQuestion[]
}) {
  const [answers, setAnswers] = useState<Record<string, QuestionState>>(() =>
    Object.fromEntries(questions.map((question) => [question.id, { selected: null, result: null, checking: false }])),
  )
  const [checkError, setCheckError] = useState('')

  const answeredCount = Object.values(answers).filter((answer) => answer.result !== null).length
  const correctCount = Object.values(answers).filter((answer) => answer.result?.correct).length
  const allAnswered = questions.length > 0 && answeredCount === questions.length

  async function checkAnswer(question: StudentQuizQuestion) {
    const current = answers[question.id]
    if (current.selected === null || current.checking || current.result) return
    setCheckError('')
    setAnswers((previous) => ({ ...previous, [question.id]: { ...previous[question.id], checking: true } }))
    try {
      const result = await submitCourseAnswer(courseId, question.id, current.selected)
      setAnswers((previous) => ({ ...previous, [question.id]: { ...previous[question.id], result, checking: false } }))
    } catch (submitError) {
      setCheckError(submitError instanceof Error ? submitError.message : 'Unable to check that answer.')
      setAnswers((previous) => ({ ...previous, [question.id]: { ...previous[question.id], checking: false } }))
    }
  }

  return (
    <div className="space-y-4">
      {checkError && (
        <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
          {checkError}
        </p>
      )}
      {questions.map((question, questionIndex) => {
        const answer = answers[question.id]
        return (
          <article className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm" key={question.id}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold uppercase tracking-wide text-[#A21942]">Question {questionIndex + 1}</span>
              {answer.result && (
                answer.result.correct ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    <CircleCheck size={13} /> Correct
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                    <XCircle size={13} /> Incorrect
                  </span>
                )
              )}
            </div>
            <h3 className="mt-2 text-lg font-semibold text-[#262626]">{question.question}</h3>
            <div className="mt-4 space-y-2">
              {question.options.map((option, optionIndex) => {
                const isSelected = answer.selected === optionIndex
                const isRevealedCorrect = answer.result !== null && optionIndex === answer.result.correct_index
                return (
                  <label
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition-colors ${
                      isRevealedCorrect
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                        : isSelected && answer.result && !answer.result.correct
                          ? 'border-red-400 bg-red-50 text-red-900'
                          : isSelected
                            ? 'border-[#A21942] bg-[#A21942]/5 text-[#262626]'
                            : 'border-gray-200 text-[#262626] hover:border-gray-300'
                    } ${answer.result ? 'cursor-default' : ''}`}
                    key={optionIndex}
                  >
                    <input
                      checked={isSelected}
                      disabled={answer.result !== null}
                      name={`course-answer-${question.id}`}
                      onChange={() =>
                        setAnswers((previous) => ({
                          ...previous,
                          [question.id]: { ...previous[question.id], selected: optionIndex },
                        }))
                      }
                      type="radio"
                    />
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-bold text-gray-600">
                      {String.fromCharCode(65 + optionIndex)}
                    </span>
                    <span>{option}</span>
                  </label>
                )
              })}
            </div>
            {answer.result && (
              <p className="mt-3 rounded-md bg-slate-50 p-3 text-sm text-gray-700" role="status">
                {answer.result.explanation ? (
                  <>
                    <strong>{answer.result.correct ? 'Correct.' : 'Not quite.'} </strong>
                    {answer.result.explanation}
                  </>
                ) : (
                  <strong>
                    {answer.result.correct
                      ? 'Correct.'
                      : `Not quite. The correct answer is ${String.fromCharCode(65 + answer.result.correct_index)}.`}
                  </strong>
                )}
              </p>
            )}
            {!answer.result && (
              <button
                className="mt-4 rounded-md bg-[#A21942] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#801333] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={answer.selected === null || answer.checking}
                onClick={() => void checkAnswer(question)}
                type="button"
              >
                {answer.checking ? 'Checking…' : 'Check answer'}
              </button>
            )}
          </article>
        )
      })}
      <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-gray-600">
          {answeredCount} of {questions.length} answered · {correctCount} correct so far
        </p>
        <button
          className="inline-flex items-center gap-1.5 rounded-md bg-[#A21942] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#801333] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!allAnswered}
          onClick={() => onFinish({ correct: correctCount, total: questions.length })}
          type="button"
        >
          Finish course <ArrowRight aria-hidden="true" size={15} />
        </button>
      </div>
    </div>
  )
}

function resolveTheme(theme?: StudentSlide['theme']): {
  background: string
  textColor: string
  accentColor: string
  cardBackground: string
} {
  const fallback = { background: '#ffffff', textColor: '#0f172a', accentColor: '#A21942', cardBackground: '#F8FAFC' }
  const valid = (value: string | undefined, defaultColor: string) =>
    value && typeof CSS !== 'undefined' && CSS.supports('color', value) ? value : defaultColor
  return {
    background: valid(theme?.background, fallback.background),
    textColor: valid(theme?.textColor, fallback.textColor),
    accentColor: valid(theme?.accentColor, fallback.accentColor),
    cardBackground: valid(theme?.cardBackground, fallback.cardBackground),
  }
}
