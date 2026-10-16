import { Link, createFileRoute } from '@tanstack/react-router'
import {
  ArrowRight,
  Bot,
  Bug,
  Check,
  CircleAlert,
  CircleCheck,
  GraduationCap,
  House,
  Lightbulb,
  LoaderCircle,
  LogOut,
  MousePointerClick,
  Sparkles,
  Star,
  type LucideIcon,
} from 'lucide-react'
import {
  startTransition,
  useEffect,
  useRef,
  useState,
  ViewTransition,
  type ReactNode,
} from 'react'
import {
  getHallucinationChallenges,
  judgeHallucinationCritique,
  saveHallucinationResult,
  type HallucinationChallenge,
  type JudgeVerdict,
} from '../lib/api'
import { useProfile } from '../lib/useProfile'
import {
  SpotterCharacter,
  type SpotterBubble,
  type SpotterMood,
} from '../components/SpotterCharacter'

export const Route = createFileRoute('/student_/hallucination-game')({
  component: HallucinationGamePage,
})

const MIN_CRITIQUE_LENGTH = 20

type GamePhase = 'intro' | 'playing' | 'verdict' | 'summary'

interface ChallengeResult {
  challengeId: string
  score: number
  rating: JudgeVerdict['rating']
  lineTappedCorrectly: boolean
}

function badgeForScore(score: number): { stars: number; label: string } {
  if (score >= 75) return { stars: 3, label: 'Eagle Eye' }
  if (score >= 45) return { stars: 2, label: 'Hallucination Hunter' }
  return { stars: 1, label: 'Trainee Spotter' }
}

function HallucinationGamePage() {
  const state = useProfile()

  let content: ReactNode
  if (state.status === 'loading') {
    content = (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-gray-200 bg-white p-10 text-center shadow-sm">
        <LoaderCircle aria-hidden="true" className="motion-safe:animate-spin text-[#A21942]" size={28} />
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
        action={
          state.profile.role === 'instructor' ? (
            <a className="font-semibold text-[#A21942] hover:underline" href="/instructor.html">
              Go to the Instructor Studio
            </a>
          ) : undefined
        }
        message={`You are signed in as ${state.email}, but your account role is “${state.profile.role}”. This game is for students.`}
        title="Student area"
      />
    )
  } else {
    content = <Game csQualified={state.profile.cs_qualified} />
  }

  return (
    <main className="flex min-h-screen flex-col bg-[#F8F9FA]">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4">
          <Link aria-label="PolyU Edu 4.0 home" className="inline-flex items-center gap-2.5" to="/">
            <span className="flex size-9 items-center justify-center rounded-lg bg-[#A21942] text-white">
              <GraduationCap aria-hidden="true" size={20} />
            </span>
            <span className="text-sm font-extrabold tracking-tight text-[#262626]">
              PolyU <span className="text-[#A21942]">Edu 4.0</span>
            </span>
          </Link>
          <div className="flex items-center gap-2.5">
            <Link
              className="inline-flex items-center gap-1.5 rounded-md bg-[#A21942] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[#801333]"
              to="/student"
            >
              <House aria-hidden="true" size={15} />
              Learning Hub
            </Link>
            {state.status === 'ready' && (
              <button
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
                onClick={() => void state.signOut()}
                type="button"
              >
                <LogOut aria-hidden="true" size={15} />
                Sign out
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 justify-center px-4 py-10 sm:py-12">
        <div className="w-full max-w-4xl">{content}</div>
      </div>

      <footer className="pb-6 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} PolyU Education 4.0
      </footer>
    </main>
  )
}

/** Fire-and-forget persistence — a save failure never blocks gameplay. */
async function saveResult(
  challengeId: string,
  score: number,
  critique: string,
  feedback: string,
): Promise<void> {
  try {
    await saveHallucinationResult({
      challenge_id: challengeId,
      score,
      critique,
      feedback,
    })
  } catch {
    console.warn('Could not save hallucination game result.')
  }
}

interface GameProps {
  csQualified: boolean
}

function Game({ csQualified }: GameProps) {
  const [challenges, setChallenges] = useState<HallucinationChallenge[] | null>(null)
  const [challengesError, setChallengesError] = useState<string | null>(null)
  const [phase, setPhase] = useState<GamePhase>('intro')
  const [challengeIndex, setChallengeIndex] = useState(0)
  const [selectedLine, setSelectedLine] = useState<number | null>(null)
  const [critique, setCritique] = useState('')
  const [mildHintShown, setMildHintShown] = useState(false)
  const [strongHintShown, setStrongHintShown] = useState(false)
  const [isJudging, setIsJudging] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [judgeError, setJudgeError] = useState<string | null>(null)
  const [verdict, setVerdict] = useState<JudgeVerdict | null>(null)
  const [lineTappedCorrectly, setLineTappedCorrectly] = useState(false)
  const [results, setResults] = useState<ChallengeResult[]>([])

  useEffect(() => {
    let cancelled = false
    getHallucinationChallenges()
      .then((bank) => {
        if (!cancelled) setChallenges(bank)
      })
      .catch((error) => {
        if (!cancelled)
          setChallengesError(error instanceof Error ? error.message : 'Unable to load the game.')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const challenge = challenges?.[challengeIndex]

  function beginChallenge(index: number) {
    // Wrapped in startTransition so the <ViewTransition> around the phase
    // content can animate the outgoing and incoming screens.
    startTransition(() => {
      setChallengeIndex(index)
      setSelectedLine(null)
      setCritique('')
      setMildHintShown(false)
      setStrongHintShown(false)
      setFormError(null)
      setJudgeError(null)
      setVerdict(null)
      setPhase('playing')
    })
  }

  function handleNext() {
    if (challenges && challengeIndex + 1 < challenges.length) {
      beginChallenge(challengeIndex + 1)
    } else {
      startTransition(() => setPhase('summary'))
    }
  }

  function restartGame() {
    setResults([])
    beginChallenge(0)
  }

  async function handleSubmit() {
    if (isJudging) return
    if (!challenge) return
    if (selectedLine === null) {
      setFormError('First, tap the line that looks suspicious.')
      return
    }
    if (critique.trim().length < MIN_CRITIQUE_LENGTH) {
      setFormError(`Tell your AI tutor a little more — at least ${MIN_CRITIQUE_LENGTH} characters.`)
      return
    }
    setFormError(null)
    setJudgeError(null)
    setIsJudging(true)
    try {
      // The backend checks the tapped line against the hidden flaw and
      // returns the revealed line in the verdict.
      const judged = await judgeHallucinationCritique(challenge.id, critique.trim(), selectedLine)
      setLineTappedCorrectly(selectedLine === judged.flaw_line)
      setVerdict(judged)
      setResults((previous) => [
        ...previous,
        {
          challengeId: challenge.id,
          score: judged.score,
          rating: judged.rating,
          lineTappedCorrectly: selectedLine === judged.flaw_line,
        },
      ])
      startTransition(() => setPhase('verdict'))
      void saveResult(challenge.id, judged.score, critique.trim(), judged.feedback)
    } catch (error) {
      setJudgeError(
        error instanceof Error
          ? error.message
          : 'The AI tutor could not grade your critique. Please try again.',
      )
    } finally {
      setIsJudging(false)
    }
  }

  if (!challenge) {
    if (challengesError) {
      return (
        <NoticeCard
          action={
            <button
              className="inline-flex items-center gap-1.5 rounded-md bg-[#A21942] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#801333]"
              onClick={() => window.location.reload()}
              type="button"
            >
              Try again
            </button>
          }
          message={challengesError}
          title="Unable to load the game"
        />
      )
    }
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-gray-200 bg-white p-10 text-center shadow-sm">
        <LoaderCircle aria-hidden="true" className="motion-safe:animate-spin text-[#A21942]" size={28} />
        <p className="text-sm text-gray-600">Loading the game…</p>
      </div>
    )
  }

  const screen =
    phase === 'intro' ? (
      <IntroScreen challengeCount={challenges.length} onStart={() => beginChallenge(0)} />
    ) : phase === 'verdict' && verdict ? (
      <VerdictScreen
        challenge={challenge}
        isLast={challengeIndex + 1 >= challenges.length}
        lineTappedCorrectly={lineTappedCorrectly}
        onNext={handleNext}
        tappedLine={selectedLine ?? verdict.flaw_line}
        verdict={verdict}
      />
    ) : phase === 'summary' ? (
      <SummaryScreen
        challenges={challenges}
        csQualified={csQualified}
        onPlayAgain={restartGame}
        results={results}
      />
    ) : (
      <ChallengeScreen
        challenge={challenge}
        challenges={challenges}
        critique={critique}
        formError={formError}
        isJudging={isJudging}
        judgeError={judgeError}
        mildHintShown={mildHintShown}
        onCritiqueChange={(value) => {
          setCritique(value)
          setFormError(null)
        }}
        onShowMildHint={() => setMildHintShown(true)}
        onShowStrongHint={() => setStrongHintShown(true)}
        onSelectLine={(line) => {
          setSelectedLine(line)
          setFormError(null)
        }}
        onSubmit={() => void handleSubmit()}
        selectedLine={selectedLine}
        strongHintShown={strongHintShown}
      />
    )

  // key={phase}-{challengeIndex} forces a fresh enter/exit cycle on every
  // screen change — the game's "scene switch".
  return (
    <ViewTransition
      default="none"
      enter="phase-in"
      exit="phase-out"
      key={`${phase}-${challengeIndex}`}
    >
      {screen}
    </ViewTransition>
  )
}


interface IntroScreenProps {
  challengeCount: number
  onStart: () => void
}

function IntroScreen({ challengeCount, onStart }: IntroScreenProps) {
  return (
    <div className="mx-auto w-full max-w-3xl rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <span className="inline-flex size-12 items-center justify-center rounded-xl bg-[#A21942]/10 text-[#A21942]">
          <Bug aria-hidden="true" size={24} />
        </span>
        <div className="w-24 shrink-0">
          <SpotterCharacter mood="idle" />
        </div>
      </div>
      <p className="mt-6 text-sm font-semibold text-[#A21942]">
        Discernment training · 4D AI Fluency
      </p>
      <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-[#262626]">
        Spot the Hallucination
      </h1>
      <p className="mt-3 text-sm leading-6 text-gray-600">
        Your overconfident AI intern wrote {challengeCount} tiny programs — and each one hides
        exactly one mistake. Tap the suspicious line, explain what is wrong in your own words, and
        your AI tutor will score your detective work. No coding experience needed.
      </p>
      <ul className="mt-5 space-y-3 text-sm text-gray-700">
        <Rule icon={Bot} text="Read a short snippet written by our AI intern." />
        <Rule icon={MousePointerClick} text="Tap the one line that looks suspicious." />
        <Rule icon={Lightbulb} text="Stuck? Hints are free — they never cost points." />
        <Rule icon={Sparkles} text="Your AI tutor grades your critique and reveals the flaw." />
      </ul>
      <button
        className="mt-6 inline-flex items-center gap-1.5 rounded-md bg-[#A21942] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#801333]"
        onClick={onStart}
        type="button"
      >
        Start the challenge <ArrowRight aria-hidden="true" size={15} />
      </button>
    </div>
  )
}


interface ChallengeScreenProps {
  challenge: HallucinationChallenge
  challenges: HallucinationChallenge[]
  critique: string
  formError: string | null
  isJudging: boolean
  judgeError: string | null
  mildHintShown: boolean
  onCritiqueChange: (value: string) => void
  onShowMildHint: () => void
  onShowStrongHint: () => void
  onSelectLine: (line: number) => void
  onSubmit: () => void
  selectedLine: number | null
  strongHintShown: boolean
}

function ChallengeScreen({
  challenge,
  challenges,
  critique,
  formError,
  isJudging,
  judgeError,
  mildHintShown,
  onCritiqueChange,
  onShowMildHint,
  onShowStrongHint,
  onSelectLine,
  onSubmit,
  selectedLine,
  strongHintShown,
}: ChallengeScreenProps) {
  const challengeIndex = challenges.findIndex((item) => item.id === challenge.id)

  // Spotter's "thinking" beat: a short pause so the hint feels earned,
  // not instant.
  const [thinking, setThinking] = useState(false)
  const thinkingTimer = useRef<number | null>(null)
  useEffect(() => {
    return () => {
      if (thinkingTimer.current !== null) window.clearTimeout(thinkingTimer.current)
    }
  }, [])

  function askHint(reveal: () => void) {
    if (thinking) return
    setThinking(true)
    thinkingTimer.current = window.setTimeout(() => {
      reveal()
      setThinking(false)
    }, 450)
  }

  const spotterMood: SpotterMood =
    thinking || isJudging ? 'thinking' : mildHintShown || strongHintShown ? 'hint' : 'idle'

  const spotterBubble: SpotterBubble = thinking
    ? {
        title: 'Hmm…',
        content: (
          <span className="inline-flex items-center gap-2">
            <span className="sr-only">Thinking…</span>
            <span aria-hidden="true" className="inline-flex items-end gap-1">
              <span className="dot-pulse size-1.5 rounded-full bg-[#A21942]" />
              <span
                className="dot-pulse size-1.5 rounded-full bg-[#A21942]"
                style={{ animationDelay: '0.15s' }}
              />
              <span
                className="dot-pulse size-1.5 rounded-full bg-[#A21942]"
                style={{ animationDelay: '0.3s' }}
              />
            </span>
          </span>
        ),
      }
    : strongHintShown
      ? { content: challenge.hint_strong }
      : mildHintShown
        ? {
            content: challenge.hint_mild,
            ctaLabel: 'I\'m still stuck',
            onCta: () => askHint(onShowStrongHint),
          }
        : {
            title: 'Stuck? Hints are free.',
            content: 'Tap me or the bubble to get a nudge — hints never cost points.',
            ctaLabel: 'Want some hints?',
            onCta: () => askHint(onShowMildHint),
          }

  const spotterOnCharacterClick = strongHintShown
    ? undefined
    : mildHintShown
      ? () => askHint(onShowStrongHint)
      : () => askHint(onShowMildHint)

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-2">
          {challenges.map((item, index) => (
            <span
              aria-hidden="true"
              className={`size-2 rounded-full ${
                index < challengeIndex
                  ? 'bg-emerald-500'
                  : index === challengeIndex
                    ? 'bg-[#A21942]'
                    : 'bg-gray-200'
              }`}
              key={item.id}
            />
          ))}
          <span className="ml-2 text-xs font-semibold text-gray-500">
            Challenge {challengeIndex + 1} of {challenges.length}
          </span>
        </div>

        <div className="mt-5 flex items-start justify-between gap-3">
          <h1 className="text-xl font-extrabold tracking-tight text-[#262626]">
            {challenge.emoji} {challenge.title}
          </h1>
          <span className="shrink-0 rounded-full bg-[#FBF1F4] px-3 py-1 text-xs font-semibold text-[#801333]">
            {challenge.category}
          </span>
        </div>
        <p className="mt-2 text-sm leading-6 text-gray-600">{challenge.scenario}</p>

        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-5">
          <div className="relative overflow-hidden rounded-lg border border-gray-200 bg-[#262626] shadow-sm sm:min-w-0 sm:flex-1">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
              <span className="flex items-center gap-2 text-xs font-medium text-gray-300">
                <Bot aria-hidden="true" size={13} />
                AI intern&apos;s code · {challenge.language}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Tap a line
              </span>
            </div>
            <div aria-label="Code snippet — tap the suspicious line" className="p-3" role="group">
              {challenge.code.map((line, index) => {
                const isSelected = selectedLine === index
                return (
                  <button
                    aria-pressed={isSelected}
                    className={`w-full rounded-md px-2 py-1 text-left transition-colors ${
                      isSelected
                        ? 'tap-pulse bg-[#A21942]/25 ring-1 ring-[#A21942]'
                        : 'hover:bg-white/10'
                    }`}
                    key={`${challenge.id}-line-${index}`}
                    onClick={() => onSelectLine(index)}
                    type="button"
                  >
                    <span
                      className="code-line-in flex items-start gap-3 font-mono text-xs leading-6"
                      style={{ animationDelay: `${Math.min(index * 90, 900)}ms` }}
                    >
                      <span
                        className={`w-5 shrink-0 select-none text-right ${
                          isSelected ? 'text-[#F3A9BE]' : 'text-gray-500'
                        }`}
                      >
                        {index + 1}
                      </span>
                      <span className={isSelected ? 'text-white' : 'text-gray-200'}>
                        {line.length === 0 ? '\u00A0' : line}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
            {isJudging ? (
              <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                <div className="scan-sweep absolute inset-x-0 top-0 h-14 bg-emerald-300/15" />
              </div>
            ) : null}
          </div>
          {/* Hint buddy sits beside the code (bottom-right on desktop, just
              under the code on mobile) so a stuck player finds it where they
              are already looking. The wide column gives the thinking bubble
              room to overlap the code card. */}
          <div className="flex w-full items-center justify-center sm:w-56 sm:shrink-0 sm:items-end">
            <SpotterCharacter
              bubble={spotterBubble}
              mood={spotterMood}
              onCharacterClick={spotterOnCharacterClick}
            />
          </div>
        </div>
        <p aria-live="polite" className="mt-2 text-xs text-gray-500">
          {selectedLine === null
            ? 'Tap the line you do not trust, then explain yourself below.'
            : `Line ${selectedLine + 1} selected — now explain why it looks wrong.`}
        </p>

        <div className="mt-4">
          <label className="mb-1.5 block text-sm font-medium text-[#262626]" htmlFor="critique">
            Your critique
          </label>
          <textarea
            className="min-h-28 w-full rounded-md border border-gray-300 bg-white p-3.5 text-sm text-[#262626] outline-none transition placeholder:text-gray-400 focus:border-[#A21942] focus:ring-2 focus:ring-[#A21942]/20"
            id="critique"
            onChange={(event) => onCritiqueChange(event.target.value)}
            placeholder="What looks wrong here, and what could go wrong because of it? Plain language is perfect — no jargon needed."
            value={critique}
          />
          <p className="mt-1 text-xs text-gray-500">
            {critique.trim().length} characters (minimum {MIN_CRITIQUE_LENGTH})
          </p>
        </div>

        {formError && (
          <div
            className="mt-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            role="alert"
          >
            {formError}
          </div>
        )}

        {judgeError && (
          <div
            className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            role="alert"
          >
            {judgeError}
          </div>
        )}

        <button
          className="mt-5 inline-flex items-center gap-2 rounded-md bg-[#A21942] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#801333] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isJudging}
          onClick={onSubmit}
          type="button"
        >
          {isJudging ? (
            <>
              <LoaderCircle aria-hidden="true" className="motion-safe:animate-spin" size={15} />
              Your AI tutor is reading…
            </>
          ) : (
            <>
              Submit to AI tutor <ArrowRight aria-hidden="true" size={15} />
            </>
          )}
        </button>
      </div>
    </div>
  )
}

interface VerdictScreenProps {
  challenge: HallucinationChallenge
  isLast: boolean
  lineTappedCorrectly: boolean
  onNext: () => void
  tappedLine: number
  verdict: JudgeVerdict
}

function VerdictScreen({
  challenge,
  isLast,
  lineTappedCorrectly,
  onNext,
  tappedLine,
  verdict,
}: VerdictScreenProps) {
  const badge = badgeForScore(verdict.score)
  return (
    <div className="mx-auto w-full max-w-3xl rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-sm font-semibold text-[#A21942]">Your AI tutor&apos;s verdict</p>
      <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex items-center gap-1" aria-label={`${badge.stars} of 3 stars`}>
            {[0, 1, 2].map((index) => (
              <span
                className={index < badge.stars ? 'star-pop inline-flex' : 'inline-flex'}
                key={index}
                style={index < badge.stars ? { animationDelay: `${250 + index * 150}ms` } : undefined}
              >
                <Star
                  aria-hidden="true"
                  className={index < badge.stars ? 'text-amber-400' : 'text-gray-200'}
                  fill="currentColor"
                  size={30}
                />
              </span>
            ))}
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#262626]">{badge.label}</h1>
            <p className="text-sm text-gray-500">
              Score {verdict.score}/100 · {challenge.title}
            </p>
          </div>
        </div>
        <div className="w-full shrink-0 sm:w-44">
          <SpotterCharacter
            mood={lineTappedCorrectly ? 'celebrate' : 'shrug'}
            bubble={
              lineTappedCorrectly
                ? { title: 'Nice instincts!', content: 'Sharp eye — the full breakdown is below.' }
                : { title: 'Good try —', content: `The sneaky line was ${verdict.flaw_line + 1}.` }
            }
          />
        </div>
      </div>

      <p
        className={`mt-5 inline-flex items-center gap-2 rounded-md border px-4 py-3 text-sm ${
          lineTappedCorrectly
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : 'shake-x border-amber-200 bg-amber-50 text-amber-800'
        }`}
      >
        {lineTappedCorrectly ? (
          <>
            <CircleCheck aria-hidden="true" size={16} />
            You tapped line {tappedLine + 1} — that was the suspicious one. Nice instincts.
          </>
        ) : (
          <>
            <CircleAlert aria-hidden="true" size={16} />
            You tapped line {tappedLine + 1}. The suspicious line was {verdict.flaw_line + 1}.
          </>
        )}
      </p>

      <p className="mt-4 text-sm leading-6 text-gray-700">{verdict.feedback}</p>

      {verdict.identified.length > 0 && (
        <div className="mt-5">
          <h2 className="text-xs font-bold uppercase tracking-wide text-emerald-700">
            What you caught
          </h2>
          <ul className="mt-2 space-y-2">
            {verdict.identified.map((point) => (
              <li className="flex items-start gap-2 text-sm text-gray-700" key={point}>
                <Check aria-hidden="true" className="mt-0.5 shrink-0 text-emerald-600" size={15} />
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}
      {verdict.missed.length > 0 && (
        <div className="mt-4">
          <h2 className="text-xs font-bold uppercase tracking-wide text-amber-700">
            Worth adding next time
          </h2>
          <ul className="mt-2 space-y-2">
            {verdict.missed.map((point) => (
              <li className="flex items-start gap-2 text-sm text-gray-700" key={point}>
                <CircleAlert
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-amber-500"
                  size={15}
                />
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5 rounded-md border border-gray-200 bg-[#F8F9FA] p-4">
        <h2 className="text-xs font-bold uppercase tracking-wide text-gray-500">The hidden flaw</h2>
        <p className="mt-2 text-sm leading-6 text-gray-700">{verdict.flaw_summary}</p>
      </div>

      <button
        className="mt-6 inline-flex items-center gap-1.5 rounded-md bg-[#A21942] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#801333]"
        onClick={onNext}
        type="button"
      >
        {isLast ? 'See your results' : 'Next challenge'} <ArrowRight aria-hidden="true" size={15} />
      </button>
    </div>
  )
}

interface SummaryScreenProps {
  challenges: HallucinationChallenge[]
  csQualified: boolean
  onPlayAgain: () => void
  results: ChallengeResult[]
}

function SummaryScreen({ challenges, csQualified, onPlayAgain, results }: SummaryScreenProps) {
  const average =
    results.length === 0
      ? 0
      : Math.round(results.reduce((total, result) => total + result.score, 0) / results.length)
  const badge = badgeForScore(average)

  return (
    <div className="mx-auto w-full max-w-3xl rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <span className="inline-flex size-12 items-center justify-center rounded-xl bg-[#A21942]/10 text-[#A21942]">
          <Bug aria-hidden="true" size={24} />
        </span>
        <div className="w-full shrink-0 sm:w-36">
          <SpotterCharacter
            mood="celebrate"
            bubble={{ title: 'Case closed!', content: 'Great detective work, detective.' }}
          />
        </div>
      </div>
      <p className="mt-6 text-sm font-semibold text-[#A21942]">Case closed, detective</p>
      <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-[#262626]">
        You earned the “{badge.label}” badge
      </h1>
      <div className="mt-4 flex items-center gap-3">
        <div className="flex items-center gap-1" aria-label={`${badge.stars} of 3 stars`}>
          {[0, 1, 2].map((index) => (
            <span
              className={index < badge.stars ? 'star-pop inline-flex' : 'inline-flex'}
              key={index}
              style={index < badge.stars ? { animationDelay: `${200 + index * 150}ms` } : undefined}
            >
              <Star
                aria-hidden="true"
                className={index < badge.stars ? 'text-amber-400' : 'text-gray-200'}
                fill="currentColor"
                size={26}
              />
            </span>
          ))}
        </div>
        <p className="text-sm text-gray-600">
          Average score <span className="font-semibold text-[#262626]">{average}/100</span> across{' '}
          {results.length} challenges
        </p>
      </div>

      <ul className="mt-5 divide-y divide-gray-100 rounded-md border border-gray-200">
        {results.map((result) => {
          const challenge = challenges.find((item) => item.id === result.challengeId)
          return (
            <li className="flex items-center justify-between gap-3 px-4 py-3" key={result.challengeId}>
              <span className="flex min-w-0 items-center gap-2 text-sm text-gray-700">
                <span aria-hidden="true">{challenge?.emoji ?? '🐛'}</span>
                <span className="truncate">{challenge?.title ?? result.challengeId}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2 text-xs text-gray-500">
                {result.lineTappedCorrectly && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
                    <Check aria-hidden="true" size={11} />
                    line
                  </span>
                )}
                <span className="font-semibold text-[#262626]">{result.score}/100</span>
              </span>
            </li>
          )
        })}
      </ul>

      <p className="mt-4 inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        <CircleCheck aria-hidden="true" size={16} />
        Your results were saved to your learning profile.
      </p>

      {csQualified && (
        <p className="mt-4 rounded-md border border-dashed border-gray-300 bg-[#F8F9FA] px-4 py-3 text-sm text-gray-600">
          Hungry for a real fight? <span className="font-semibold text-[#262626]">Code Review Boss Battle</span> —
          reject the AI&apos;s flawed pull request. CS track · Coming soon.
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link
          className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[#A21942] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#801333]"
          to="/student"
        >
          Back to Learning Hub <ArrowRight aria-hidden="true" size={15} />
        </Link>
        <button
          className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
          onClick={onPlayAgain}
          type="button"
        >
          Play again
        </button>
      </div>
    </div>
  )
}

function Rule({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-[#FBF1F4] text-[#A21942]">
        <Icon aria-hidden="true" size={14} />
      </span>
      <span>{text}</span>
    </li>
  )
}

function NoticeCard({
  action,
  message,
  title,
}: {
  action?: ReactNode
  message: string
  title: string
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <span className="inline-flex size-12 items-center justify-center rounded-xl bg-[#A21942]/10 text-[#A21942]">
        <CircleAlert aria-hidden="true" size={24} />
      </span>
      <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-[#262626]">{title}</h1>
      <p className="mt-3 text-sm leading-6 text-gray-600">{message}</p>
      {action ? <p className="mt-5">{action}</p> : null}
    </div>
  )
}
