import { ArrowRight, CircleCheck, GraduationCap, House, LoaderCircle, RotateCcw, Trophy } from 'lucide-react'

export interface CourseScores {
  simulation: number
  quiz: number
  bot: number
  promptCompare: number | null
  reflection: number | null
  overall: number
}

interface SummaryScreenProps {
  scores: CourseScores
  isGuest: boolean
  isStudent: boolean
  saveState: 'idle' | 'saving' | 'saved' | 'error'
  onStartOver: () => void
}

function badgeFor(score: number): { emoji: string; label: string } {
  if (score >= 75) return { emoji: '\u{1F680}', label: 'Prototype Pilot' }
  if (score >= 45) return { emoji: '\u{1F9ED}', label: 'Curious Builder' }
  return { emoji: '\u{1F331}', label: 'Brave Beginner' }
}

function ScoreRow({ label, score }: { label: string; score: number | null }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-gray-100 py-2.5 last:border-b-0">
      <p className="text-sm text-gray-600">{label}</p>
      {score === null ? (
        <p className="text-xs font-medium text-gray-400">skipped</p>
      ) : (
        <div className="flex items-center gap-2.5">
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-200">
            <div className="h-full rounded-full bg-[#A21942]" style={{ width: `${score}%` }} />
          </div>
          <p className="w-9 text-right text-sm font-bold tabular-nums text-[#262626]">{score}</p>
        </div>
      )}
    </div>
  )
}

export function SummaryScreen({ scores, isGuest, isStudent, saveState, onStartOver }: SummaryScreenProps) {
  const badge = badgeFor(scores.overall)

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm sm:p-10">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-[#A21942]/10 text-3xl">
          <span aria-hidden="true">{badge.emoji}</span>
        </span>
        <p className="mt-4 flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#A21942]">
          <Trophy aria-hidden="true" size={14} />
          Sample course complete
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#262626]">
          {scores.overall} / 100
        </h1>
        <p className="mt-1 text-sm font-semibold text-gray-600">
          Badge earned: {badge.label}
        </p>

        <div className="mx-auto mt-6 max-w-md rounded-xl border border-gray-200 bg-[#F8F9FA] p-5 text-left">
          <ScoreRow label="Map the problem · simulation" score={scores.simulation} />
          <ScoreRow label="See it, then try it · quiz" score={scores.quiz} />
          <ScoreRow label="Talk to it well · AI tutor" score={scores.promptCompare} />
          <ScoreRow label="Break the Bot · flaw hunt" score={scores.bot} />
          <ScoreRow label="Reflection · AI tutor" score={scores.reflection} />
        </div>

        {isStudent && (
          <p className="mt-5 flex items-center justify-center gap-1.5 text-sm text-gray-600" role="status">
            {saveState === 'saving' && (
              <>
                <LoaderCircle aria-hidden="true" className="animate-spin text-[#A21942]" size={15} />
                Saving your result to your account…
              </>
            )}
            {saveState === 'saved' && (
              <>
                <CircleCheck aria-hidden="true" className="text-emerald-600" size={16} />
                Result saved to your account.
              </>
            )}
            {saveState === 'error' && (
              <>
                <CircleCheck aria-hidden="true" className="text-amber-500" size={16} />
                Could not save to your account — your score stays in this browser.
              </>
            )}
            {saveState === 'idle' && 'Preparing to save your result…'}
          </p>
        )}
      </div>

      <div className={`rounded-lg border p-6 shadow-sm sm:p-8 ${isGuest ? 'border-[#A21942]/20 bg-[#FBF8F6]' : 'border-gray-200 bg-white'}`}>
        {isGuest ? (
          <>
            <h2 className="text-lg font-extrabold text-[#262626]">This was 20% of the story.</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Your score lives only in this browser. Sign in to save results like this one, unlock
              the full COMP5241 track — all five chapters, the complete game library, and unlimited
              AI tutor feedback.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a
                className="inline-flex items-center gap-2 rounded-lg bg-[#A21942] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#801333]"
                href="/login"
              >
                Sign in to keep going <ArrowRight aria-hidden="true" size={16} />
              </a>
              <a
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                href="/"
              >
                Back to home
              </a>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-lg font-extrabold text-[#262626]">Ready for the real thing?</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              {isStudent
                ? 'The full skill tree, the complete Spot the Hallucination game, and your saved results wait in your Learning Hub.'
                : 'Share this link with students, or preview how the finished course will feel in the Instructor Studio.'}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              {isStudent ? (
                <a
                  className="inline-flex items-center gap-2 rounded-lg bg-[#A21942] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#801333]"
                  href="/student"
                >
                  Continue to your Learning Hub <ArrowRight aria-hidden="true" size={16} />
                </a>
              ) : (
                <a
                  className="inline-flex items-center gap-2 rounded-lg bg-[#A21942] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#801333]"
                  href="/instructor.html"
                >
                  <GraduationCap aria-hidden="true" size={16} />
                  Back to the Instructor Studio
                </a>
              )}
              <a
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                href="/"
              >
                <House aria-hidden="true" size={15} />
                Back to home
              </a>
            </div>
          </>
        )}
        <button
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 transition-colors hover:text-[#A21942]"
          onClick={onStartOver}
          type="button"
        >
          <RotateCcw aria-hidden="true" size={13} />
          Play the sample again
        </button>
      </div>
    </div>
  )
}