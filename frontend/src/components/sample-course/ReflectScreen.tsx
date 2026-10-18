import { ArrowRight, PenLine } from 'lucide-react'
import type { SampleReflection, SampleTutorVerdict } from '../../lib/api'
import { TutorMoment, type TutorMomentState } from './TutorMoment'

interface ReflectScreenProps {
  reflection: SampleReflection
  isGuest: boolean
  remainingUses: number | null
  totalUses: number
  state: TutorMomentState
  onDone: (verdict: SampleTutorVerdict) => void
  onExhausted: () => void
  onSkip: () => void
  onContinue: () => void
}

export function ReflectScreen({
  reflection,
  isGuest,
  remainingUses,
  totalUses,
  state,
  onDone,
  onExhausted,
  onSkip,
  onContinue,
}: ReflectScreenProps) {
  const finished = state.status === 'done' || state.status === 'skipped' || state.status === 'exhausted'

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#A21942]">
          <PenLine aria-hidden="true" size={14} />
          Module 5 · Reflect
        </p>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          You simulated a kickoff, checked AI output like a reviewer, compared prompts, and broke a
          bot. One last thing before your score:
        </p>
      </div>

      <TutorMoment
        isGuest={isGuest}
        momentId={reflection.id}
        onDone={onDone}
        onExhausted={onExhausted}
        onSkip={onSkip}
        remainingUses={remainingUses}
        state={state}
        task={reflection.prompt}
        totalUses={totalUses}
      />

      <button
        className="inline-flex items-center gap-2 rounded-lg bg-[#A21942] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#801333] disabled:cursor-not-allowed disabled:opacity-40"
        disabled={!finished}
        onClick={onContinue}
        type="button"
      >
        See my score <ArrowRight aria-hidden="true" size={16} />
      </button>
    </div>
  )
}