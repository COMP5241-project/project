import type { KeyboardEvent, ReactNode } from 'react'

/**
 * "Spotter" — the magnifying-glass hint buddy for the Spot the
 * Hallucination game.
 *
 * Presentation layer only: all hint/feedback content is passed in as
 * props (sourced from the backend challenge bank), so the figure never
 * leaks answers. All motion is applied to wrapper <div> nodes, never to
 * the <svg> itself (see
 * .agents/skills/vercel-react-best-practices/rules/rendering-animate-svg-wrapper.md),
 * and the static SVG shell is hoisted to module level (see
 * .agents/skills/vercel-react-best-practices/rules/rendering-hoist-jsx.md).
 */
export type SpotterMood = 'idle' | 'thinking' | 'hint' | 'celebrate' | 'shrug'

export interface SpotterBubble {
  /** Small eyebrow line above the content, e.g. "Stuck? Hints are free." */
  title?: string
  content: ReactNode
  /** Optional clickable line inside the bubble, e.g. "Want some hints?" */
  ctaLabel?: string
  onCta?: () => void
}

export interface SpotterCharacterProps {
  mood: SpotterMood
  /** When set, a thinking bubble is rendered above the character. */
  bubble?: SpotterBubble
  /**
   * Tapping the character triggers the same action as the bubble CTA
   * (ask for a hint / escalate to the strong hint). Omit it when there
   * is nothing left to reveal.
   */
  onCharacterClick?: () => void
  className?: string
}

// One-shot mood reactions. The constant idle float ("spotter-bob") lives on
// the OUTER wrapper in the component body, so the character keeps floating
// even while a reaction (wiggle / celebrate / shrug) plays.
const WRAPPER_ANIMATION: Record<SpotterMood, string> = {
  idle: '',
  thinking: 'spotter-wiggle',
  hint: 'spotter-wiggle',
  celebrate: 'spotter-celebrate',
  shrug: 'spotter-shrug',
}

/* Hoisted static shell — created once at module load, not per render. */
const SPOTTER_SHELL = (
  <>
    {/* handle */}
    <line
      x1="80"
      y1="76"
      x2="102"
      y2="98"
      stroke="#801333"
      strokeWidth="14"
      strokeLinecap="round"
    />
    {/* stubby feet */}
    <ellipse cx="36" cy="92" rx="8" ry="5" fill="#801333" />
    <ellipse cx="60" cy="94" rx="8" ry="5" fill="#801333" />
    {/* lens */}
    <circle cx="52" cy="48" r="30" fill="#EAF4FB" />
    <circle cx="52" cy="48" r="34" fill="none" stroke="#A21942" strokeWidth="7" />
    {/* glass highlight */}
    <ellipse
      cx="38"
      cy="34"
      rx="9"
      ry="5"
      fill="#FFFFFF"
      opacity="0.65"
      transform="rotate(-32 38 34)"
    />
    {/* blush */}
    <ellipse cx="30" cy="55" rx="4" ry="2.5" fill="#F3A9BE" opacity="0.8" />
    <ellipse cx="74" cy="55" rx="4" ry="2.5" fill="#F3A9BE" opacity="0.8" />
  </>
)

const EYES: Record<SpotterMood, ReactNode> = {
  idle: (
    <>
      <circle cx="42" cy="44" r="4.5" fill="#262626" />
      <circle cx="62" cy="44" r="4.5" fill="#262626" />
      <circle cx="43.6" cy="42.4" r="1.4" fill="#FFFFFF" />
      <circle cx="63.6" cy="42.4" r="1.4" fill="#FFFFFF" />
    </>
  ),
  thinking: (
    <>
      {/* eyes glance up-left while pondering */}
      <circle cx="40" cy="41" r="4.5" fill="#262626" />
      <circle cx="60" cy="41" r="4.5" fill="#262626" />
      <circle cx="41.6" cy="39.4" r="1.4" fill="#FFFFFF" />
      <circle cx="61.6" cy="39.4" r="1.4" fill="#FFFFFF" />
    </>
  ),
  hint: (
    <>
      {/* wide eyes — "aha!" */}
      <circle cx="42" cy="44" r="5.5" fill="#262626" />
      <circle cx="62" cy="44" r="5.5" fill="#262626" />
      <circle cx="44" cy="42" r="1.8" fill="#FFFFFF" />
      <circle cx="64" cy="42" r="1.8" fill="#FFFFFF" />
    </>
  ),
  celebrate: (
    <>
      <path
        d="M35 45 Q42 38 49 45"
        stroke="#262626"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M55 45 Q62 38 69 45"
        stroke="#262626"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
    </>
  ),
  shrug: (
    <>
      <circle cx="42" cy="44" r="4.5" fill="#262626" />
      <circle cx="62" cy="44" r="4.5" fill="#262626" />
      {/* raised eyebrows */}
      <path
        d="M36 33 Q42 30 48 33"
        stroke="#262626"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M56 32 Q62 28 68 32"
        stroke="#262626"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
    </>
  ),
}

const MOUTHS: Record<SpotterMood, ReactNode> = {
  idle: (
    <path
      d="M44 57 Q52 63 60 57"
      stroke="#262626"
      strokeWidth="3"
      fill="none"
      strokeLinecap="round"
    />
  ),
  thinking: <ellipse cx="52" cy="59" rx="3.5" ry="4.5" fill="#262626" />,
  hint: (
    <path
      d="M43 56 Q52 65 61 56"
      stroke="#262626"
      strokeWidth="3"
      fill="none"
      strokeLinecap="round"
    />
  ),
  celebrate: <path d="M41 55 Q52 70 63 55 Z" fill="#801333" />,
  shrug: <line x1="45" y1="59" x2="59" y2="59" stroke="#262626" strokeWidth="3" strokeLinecap="round" />,
}

function SpotterFigure({ mood }: { mood: SpotterMood }) {
  return (
    <svg aria-hidden="true" className="h-20 w-auto" viewBox="0 0 120 132">
      {SPOTTER_SHELL}
      {EYES[mood]}
      {MOUTHS[mood]}
    </svg>
  )
}

export function SpotterCharacter({
  mood,
  bubble,
  onCharacterClick,
  className,
}: SpotterCharacterProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!onCharacterClick) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onCharacterClick()
    }
  }

  return (
    <div className={`flex flex-col items-center ${className ?? ''}`}>
      {bubble ? (
        <div
          aria-live="polite"
          className="bubble-in relative mb-1.5 w-full max-w-60 rounded-lg border border-gray-200 bg-white p-3.5 text-left shadow-sm"
        >
          {/* Re-keyed on content change so the bubble pops in again when
              the hint level / feedback changes. */}
          <div key={`${bubble.title ?? ''}|${bubble.ctaLabel ?? ''}`}>
            {bubble.title ? (
              <p className="text-xs font-semibold text-[#A21942]">{bubble.title}</p>
            ) : null}
            <div className="mt-0.5 text-xs leading-5 text-gray-700">{bubble.content}</div>
            {bubble.ctaLabel && bubble.onCta ? (
              <button
                className="mt-1.5 text-xs font-semibold text-[#A21942] underline-offset-2 hover:underline"
                onClick={bubble.onCta}
                type="button"
              >
                {bubble.ctaLabel}
              </button>
            ) : null}
          </div>
          <span
            aria-hidden="true"
            className="absolute -bottom-1.5 left-1/2 size-3 -translate-x-1/2 rotate-45 rounded-[2px] border-b border-r border-gray-200 bg-white"
          />
        </div>
      ) : null}

      <div
        aria-hidden={onCharacterClick ? undefined : true}
        aria-label={onCharacterClick ? 'Spotter — your hint buddy. Tap for a hint.' : undefined}
        className={
          onCharacterClick
            ? 'cursor-pointer rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A21942]'
            : ''
        }
        onClick={onCharacterClick}
        onKeyDown={onCharacterClick ? handleKeyDown : undefined}
        role={onCharacterClick ? 'button' : undefined}
        tabIndex={onCharacterClick ? 0 : undefined}
      >
        {/* Outer div: constant float (spotter-bob, infinite) — the same
            idle hover the intro/summary screens show. Inner div: one-shot
            mood reaction. The nested transforms compose, so Spotter keeps
            floating while it reacts. */}
        <div className="spotter-bob">
          <div className={WRAPPER_ANIMATION[mood]}>
            <SpotterFigure mood={mood} />
          </div>
        </div>
      </div>
    </div>
  )
}
