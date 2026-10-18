import { ArrowRight, Sparkles, ThumbsDown, ThumbsUp } from 'lucide-react'
import type { SamplePromptCompare, SampleTutorVerdict } from '../../lib/api'
import { TutorMoment, type TutorMomentState } from './TutorMoment'
import { WhipScene } from './WhipScene'

interface PromptCompareScreenProps {
  promptCompare: SamplePromptCompare
  isGuest: boolean
  remainingUses: number | null
  totalUses: number
  state: TutorMomentState
  onDone: (verdict: SampleTutorVerdict) => void
  onExhausted: () => void
  onSkip: () => void
  onContinue: () => void
}

export function PromptCompareScreen({
  promptCompare,
  isGuest,
  remainingUses,
  totalUses,
  state,
  onDone,
  onExhausted,
  onSkip,
  onContinue,
}: PromptCompareScreenProps) {
  const finished = state.status === 'done' || state.status === 'skipped' || state.status === 'exhausted'

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#A21942]">
          <Sparkles aria-hidden="true" size={14} />
          Module 3 · Talk to it well
        </p>
        <p className="mt-3 text-sm leading-7 text-gray-700">{promptCompare.story}</p>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-5">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-rose-700">
              <ThumbsDown aria-hidden="true" size={13} />
              The vague prompt
            </p>
            <p className="mt-3 rounded-lg border border-rose-200 bg-white p-3 font-mono text-xs leading-5 text-gray-700">
              {promptCompare.vague_prompt}
            </p>
            <div className="mt-3">
              <WhipScene variant="vague" />
            </div>
            <p className="mt-3 text-sm leading-6 text-rose-900">{promptCompare.vague_outcome}</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-5">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-emerald-700">
              <ThumbsUp aria-hidden="true" size={13} />
              The precise prompt
            </p>
            <p className="mt-3 rounded-lg border border-emerald-200 bg-white p-3 font-mono text-xs leading-5 text-gray-700">
              {promptCompare.precise_prompt}
            </p>
            <div className="mt-3">
              <WhipScene variant="precise" />
            </div>
            <p className="mt-3 text-sm leading-6 text-emerald-900">{promptCompare.precise_outcome}</p>
          </div>
        </div>
      </div>

      <TutorMoment
        isGuest={isGuest}
        momentId={promptCompare.id}
        onDone={onDone}
        onExhausted={onExhausted}
        onSkip={onSkip}
        remainingUses={remainingUses}
        state={state}
        task={promptCompare.task}
        totalUses={totalUses}
      />

      <button
        className="inline-flex items-center gap-2 rounded-lg bg-[#A21942] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#801333] disabled:cursor-not-allowed disabled:opacity-40"
        disabled={!finished}
        onClick={onContinue}
        type="button"
      >
        Continue to the mini-game <ArrowRight aria-hidden="true" size={16} />
      </button>
    </div>
  )
}