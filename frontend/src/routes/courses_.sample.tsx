import { createFileRoute } from '@tanstack/react-router'
import { GraduationCap, House, LoaderCircle, RotateCcw, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  getSampleCourseContent,
  saveSampleCourseResult,
  type SampleCourseContent,
  type SampleTutorVerdict,
} from '../lib/api'
import { resolveSignedInRole } from '../lib/session'
import { BreakTheBotScreen, type BotReaction } from '../components/sample-course/BreakTheBotScreen'
import { LearnScreen, type QuizResult } from '../components/sample-course/LearnScreen'
import { PromptCompareScreen } from '../components/sample-course/PromptCompareScreen'
import { ReflectScreen } from '../components/sample-course/ReflectScreen'
import { SimulationScreen, type DecisionResult } from '../components/sample-course/SimulationScreen'
import { SummaryScreen, type CourseScores } from '../components/sample-course/SummaryScreen'
import type { TutorMomentState } from '../components/sample-course/TutorMoment'
import { WelcomeScreen } from '../components/sample-course/WelcomeScreen'

export const Route = createFileRoute('/courses_/sample')({
  component: SampleCoursePage,
  // Resolve the signed-in role before first paint: guests, students, and
  // instructors all play this public course, but the wording and the
  // save-to-account step depend on who is watching.
  loader: async () => ({ signedInRole: await resolveSignedInRole() }),
})

const STORAGE_KEY = 'sample-course-progress-v1'
const SCREEN_LABELS = ['Welcome', 'Simulate', 'Learn', 'Prompt', 'Break it', 'Reflect', 'Score']

interface SavedProgress {
  screen: number
  sim: Record<string, DecisionResult>
  quiz: Record<string, QuizResult>
  botTried: Record<string, BotReaction>
  botFlaws: string[]
  tutor: Record<string, TutorMomentState>
  remainingUses: number | null
}

function readSavedProgress(): Partial<SavedProgress> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Partial<SavedProgress>
    if (typeof parsed !== 'object' || parsed === null) return {}
    return parsed
  } catch {
    return {}
  }
}

function SampleCoursePage() {
  const { signedInRole } = Route.useLoaderData()
  const isGuest = signedInRole === null
  const isStudent = signedInRole === 'student'

  const [content, setContent] = useState<SampleCourseContent | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const [saved] = useState(readSavedProgress)
  const [screen, setScreen] = useState(Math.min(Math.max(saved.screen ?? 0, 0), SCREEN_LABELS.length - 1))
  const [sim, setSim] = useState<Record<string, DecisionResult>>(saved.sim ?? {})
  const [quiz, setQuiz] = useState<Record<string, QuizResult>>(saved.quiz ?? {})
  const [botTried, setBotTried] = useState<Record<string, BotReaction>>(saved.botTried ?? {})
  const [botFlaws, setBotFlaws] = useState<string[]>(saved.botFlaws ?? [])
  const [tutor, setTutor] = useState<Record<string, TutorMomentState>>(saved.tutor ?? {})
  const [guestUsesLeft, setGuestUsesLeft] = useState<number | null>(saved.remainingUses ?? null)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const saveStarted = useRef(false)

  const loadContent = useCallback(() => {
    // All state updates happen in promise callbacks — never synchronously
    // inside the mounting effect (react-hooks/set-state-in-effect).
    getSampleCourseContent()
      .then(setContent)
      .catch((error: unknown) => {
        setLoadError(error instanceof Error ? error.message : 'Unable to load the sample course.')
      })
      .finally(() => setIsLoading(false))
  }, [])

  function retryLoad() {
    setIsLoading(true)
    setLoadError(null)
    loadContent()
  }

  useEffect(() => {
    loadContent()
  }, [loadContent])

  // Persist progress locally (step + answers only, never personal data) so
  // a refresh never loses a learner's place.
  useEffect(() => {
    if (!content) return
    const data: SavedProgress = { screen, sim, quiz, botTried, botFlaws, tutor, remainingUses: guestUsesLeft }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      // Storage full or blocked — progress simply won't survive a refresh.
    }
  }, [content, screen, sim, quiz, botTried, botFlaws, tutor, guestUsesLeft])

  function startOver() {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Ignore storage failures on reset.
    }
    setScreen(0)
    setSim({})
    setQuiz({})
    setBotTried({})
    setBotFlaws([])
    setTutor({})
    setGuestUsesLeft(null)
    setSaveState('idle')
    saveStarted.current = false
  }

  function handleSimAnswer(decisionId: string, result: DecisionResult) {
    setSim((previous) => ({ ...previous, [decisionId]: result }))
  }

  function handleQuizAnswer(questionId: string, result: QuizResult) {
    setQuiz((previous) => ({ ...previous, [questionId]: result }))
  }

  function handleBotTry(inputId: string, reaction: BotReaction) {
    setBotTried((previous) => ({ ...previous, [inputId]: reaction }))
    if (reaction.kind === 'flaw') {
      setBotFlaws((previous) => (previous.includes(inputId) ? previous : [...previous, inputId]))
    }
  }

  function tutorDone(momentId: string, verdict: SampleTutorVerdict) {
    setTutor((previous) => ({ ...previous, [momentId]: { status: 'done', verdict } }))
    if (isGuest) setGuestUsesLeft(verdict.remaining_uses)
  }

  function tutorExhausted(momentId: string) {
    setTutor((previous) => ({ ...previous, [momentId]: { status: 'exhausted' } }))
    if (isGuest) setGuestUsesLeft(0)
  }

  function tutorSkipped(momentId: string) {
    setTutor((previous) => ({ ...previous, [momentId]: { status: 'skipped' } }))
  }

  const scores: CourseScores = useMemo(() => {
    const decisions = content?.decisions ?? []
    const questions = content?.quiz ?? []
    const flawsTotal = content?.bot.flaws_total ?? 1
    const percent = (correct: number, total: number) => (total === 0 ? 0 : Math.round((correct / total) * 100))
    const simScore = percent(Object.values(sim).filter((result) => result.correct).length, decisions.length)
    const quizScore = percent(Object.values(quiz).filter((result) => result.correct).length, questions.length)
    const botScore = percent(botFlaws.length, flawsTotal)
    const promptCompareState = tutor['prompt-compare']
    const reflectionState = tutor['reflection']
    const promptCompareScore = promptCompareState?.status === 'done' ? promptCompareState.verdict.score : null
    const reflectionScore = reflectionState?.status === 'done' ? reflectionState.verdict.score : null
    const parts = [
      simScore,
      quizScore,
      botScore,
      ...(promptCompareScore !== null ? [promptCompareScore] : []),
      ...(reflectionScore !== null ? [reflectionScore] : []),
    ]
    const overall = parts.length === 0 ? 0 : Math.round(parts.reduce((sum, part) => sum + part, 0) / parts.length)
    return { simulation: simScore, quiz: quizScore, bot: botScore, promptCompare: promptCompareScore, reflection: reflectionScore, overall }
  }, [content, sim, quiz, botFlaws, tutor])

  // Students' results are saved once, fire-and-forget, the first time they
  // reach the score screen (ref-guarded against StrictMode double effects).
  useEffect(() => {
    if (screen !== SCREEN_LABELS.length - 1 || !isStudent || saveStarted.current) return
    saveStarted.current = true
    setSaveState('saving')
    saveSampleCourseResult({
      overall_score: scores.overall,
      simulation_score: scores.simulation,
      quiz_score: scores.quiz,
      bot_score: scores.bot,
      prompt_compare_score: scores.promptCompare,
      reflection_score: scores.reflection,
    })
      .then(() => setSaveState('saved'))
      .catch(() => setSaveState('error'))
  }, [screen, isStudent, scores])

  const totalUses = content?.tutor_moments ?? 2
  const remainingUses = isGuest ? guestUsesLeft ?? totalUses : null

  if (isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#F8F9FA] px-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <LoaderCircle aria-hidden="true" className="animate-spin text-[#A21942]" size={28} />
          <p className="text-sm text-gray-600">Loading the sample course…</p>
        </div>
      </main>
    )
  }

  if (loadError || !content) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#F8F9FA] px-4">
        <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-bold text-[#262626]">The sample course is unavailable</h1>
          <p className="mt-2 text-sm leading-6 text-gray-600">{loadError ?? 'Unable to load the sample course.'}</p>
          <div className="mt-5 flex justify-center gap-3">
            <button
              className="rounded-md bg-[#A21942] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#801333]"
              onClick={retryLoad}
              type="button"
            >
              Try again
            </button>
            <a className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50" href="/">
              Back to home
            </a>
          </div>
        </div>
      </main>
    )
  }

  const activeScreen = (() => {
    switch (screen) {
      case 0:
        return (
          <WelcomeScreen
            content={content}
            isGuest={isGuest}
            isInstructor={signedInRole === 'instructor'}
            onStart={() => setScreen(1)}
          />
        )
      case 1:
        return (
          <SimulationScreen
            decisions={content.decisions}
            onAnswer={handleSimAnswer}
            onContinue={() => setScreen(2)}
            results={sim}
          />
        )
      case 2:
        return (
          <LearnScreen
            onAnswer={handleQuizAnswer}
            onContinue={() => setScreen(3)}
            quiz={content.quiz}
            results={quiz}
            slides={content.slides}
          />
        )
      case 3:
        return (
          <PromptCompareScreen
            isGuest={isGuest}
            onContinue={() => setScreen(4)}
            onDone={(verdict) => tutorDone(content.prompt_compare.id, verdict)}
            onExhausted={() => tutorExhausted(content.prompt_compare.id)}
            onSkip={() => tutorSkipped(content.prompt_compare.id)}
            promptCompare={content.prompt_compare}
            remainingUses={remainingUses}
            state={tutor[content.prompt_compare.id] ?? { status: 'idle' }}
            totalUses={totalUses}
          />
        )
      case 4:
        return (
          <BreakTheBotScreen
            bot={content.bot}
            flaws={botFlaws}
            onContinue={() => setScreen(5)}
            onTry={handleBotTry}
            tried={botTried}
          />
        )
      case 5:
        return (
          <ReflectScreen
            isGuest={isGuest}
            onContinue={() => setScreen(6)}
            onDone={(verdict) => tutorDone(content.reflection.id, verdict)}
            onExhausted={() => tutorExhausted(content.reflection.id)}
            onSkip={() => tutorSkipped(content.reflection.id)}
            reflection={content.reflection}
            remainingUses={remainingUses}
            state={tutor[content.reflection.id] ?? { status: 'idle' }}
            totalUses={totalUses}
          />
        )
      default:
        return (
          <SummaryScreen
            isGuest={isGuest}
            isStudent={isStudent}
            onStartOver={startOver}
            saveState={saveState}
            scores={scores}
          />
        )
    }
  })()

  return (
    <main className="flex min-h-screen flex-col bg-[#F8F9FA]">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
          <a aria-label="PolyU Edu 4.0 home" className="inline-flex items-center gap-2.5" href="/">
            <span className="flex size-8 items-center justify-center rounded-lg bg-[#A21942] text-white">
              <GraduationCap aria-hidden="true" size={18} />
            </span>
            <span className="text-sm font-extrabold tracking-tight text-[#262626]">
              PolyU <span className="text-[#A21942]">Edu 4.0</span>
            </span>
          </a>
          <div className="flex items-center gap-2.5">
            {remainingUses !== null && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#A21942]/20 bg-[#FBF8F6] px-3 py-1.5 text-[11px] font-bold text-[#801333]">
                <Sparkles aria-hidden="true" size={12} />
                {remainingUses} AI tutor {remainingUses === 1 ? 'use' : 'uses'} left
              </span>
            )}
            {screen > 0 && (
              <button
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
                onClick={startOver}
                type="button"
              >
                <RotateCcw aria-hidden="true" size={13} />
                Start over
              </button>
            )}
            <a
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
              href="/"
            >
              <House aria-hidden="true" size={13} />
              Home
            </a>
          </div>
        </div>
        <div className="mx-auto w-full max-w-4xl px-4 pb-3">
          <ol className="flex items-center gap-1.5" aria-label="Course progress">
            {SCREEN_LABELS.map((label, index) => (
              <li className="flex flex-1 flex-col gap-1" key={label}>
                <span
                  className={`h-1.5 rounded-full transition-colors ${
                    index < screen ? 'bg-[#A21942]' : index === screen ? 'bg-[#A21942]/60' : 'bg-gray-200'
                  }`}
                />
                <span className={`hidden text-[10px] font-semibold sm:block ${index === screen ? 'text-[#A21942]' : 'text-gray-400'}`}>
                  {label}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </header>

      <div className="flex flex-1 justify-center px-4 py-8 sm:py-10">
        <div className="w-full max-w-3xl">{activeScreen}</div>
      </div>

      <footer className="pb-6 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} PolyU Education 4.0 · Sample mini-course preview
      </footer>
    </main>
  )
}