import { ArrowRight, Bug, Gamepad2, LoaderCircle } from 'lucide-react'
import { useRef, useState } from 'react'
import { submitSampleAnswer, type SampleBotGame } from '../../lib/api'

export interface BotReaction {
  kind: 'success' | 'near_miss' | 'flaw'
  reaction: string
  lesson: string | null
}

interface BreakTheBotScreenProps {
  bot: SampleBotGame
  tried: Record<string, BotReaction>
  flaws: string[]
  onTry: (inputId: string, reaction: BotReaction) => void
  onContinue: () => void
}

const CONFETTI_COLORS = ['#A21942', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6', '#F43F5E']

function botFace(kind: BotReaction['kind'] | 'idle' | 'working'): { face: string; ring: string } {
  switch (kind) {
    case 'success':
      return { face: '\u{1F604}', ring: 'border-emerald-400 bg-emerald-50' }
    case 'near_miss':
      return { face: '\u{1F928}', ring: 'border-amber-400 bg-amber-50' }
    case 'flaw':
      return { face: '\u{1F635}', ring: 'border-red-400 bg-red-50' }
    case 'working':
      return { face: '\u{1F916}', ring: 'border-blue-300 bg-blue-50' }
    default:
      return { face: '\u{1F642}', ring: 'border-gray-200 bg-[#FBF8F6]' }
  }
}

export function BreakTheBotScreen({ bot, tried, flaws, onTry, onContinue }: BreakTheBotScreenProps) {
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const timers = useRef<number[]>([])

  const triedIds = Object.keys(tried)
  const attemptsLeft = bot.attempts - triedIds.length
  const lastTriedId = triedIds[triedIds.length - 1]
  const lastReaction = lastTriedId ? tried[lastTriedId] : undefined
  const won = flaws.length >= bot.flaws_total
  const outOfAttempts = attemptsLeft <= 0 && !won
  const mood: BotReaction['kind'] | 'idle' | 'working' = pendingId ? 'working' : lastReaction?.kind ?? 'idle'
  const { face, ring } = botFace(mood)
  const crashed = mood === 'flaw'

  async function feed(inputId: string) {
    if (tried[inputId] || pendingId || won || outOfAttempts) return
    setPendingId(inputId)
    setError(null)
    try {
      const checked = await submitSampleAnswer(bot.moment_id, inputId)
      if (checked.type !== 'bot') return
      const reaction: BotReaction = { kind: checked.kind, reaction: checked.reaction, lesson: checked.lesson }
      // Small theatrical pause so the bot feels alive, then reveal.
      const timer = window.setTimeout(() => {
        onTry(inputId, reaction)
        setPendingId(null)
      }, 650)
      timers.current.push(timer)
    } catch (feedError) {
      setError(feedError instanceof Error ? feedError.message : 'WOKbot is unreachable. Try again.')
      setPendingId(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#A21942]">
          <Gamepad2 aria-hidden="true" size={14} />
          Module 4 · {bot.title}
        </p>
        <p className="mt-3 text-sm leading-6 text-gray-600">{bot.intro}</p>

        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Flaws found</span>
            <span className="flex items-center gap-1.5" aria-label={`${flaws.length} of ${bot.flaws_total} flaws found`}>
              {Array.from({ length: bot.flaws_total }, (_, i) => (
                <span
                  className={`grid size-7 place-items-center rounded-md border text-sm ${
                    i < flaws.length ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50 text-gray-300'
                  }`}
                  key={i}
                >
                  {i < flaws.length ? '\u{1F4A5}' : '\u{25A2}'}
                </span>
              ))}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Attempts left</span>
            <span className="flex items-center gap-1" aria-label={`${attemptsLeft} attempts left`}>
              {Array.from({ length: bot.attempts }, (_, i) => (
                <span
                  className={`size-2.5 rounded-full ${i < attemptsLeft ? 'bg-[#A21942]' : 'bg-gray-200'}`}
                  key={i}
                />
              ))}
            </span>
          </div>
        </div>

        <div className="relative mt-6 overflow-hidden rounded-2xl border-4 border-[#A21942] bg-[#262626] p-6 sm:p-8">
          <p className="text-center font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-white/60">
            WOKbot · Canteen pre-order unit
          </p>
          <div className="mt-4 flex flex-col items-center">
            <div className={crashed ? 'bot-shake' : mood === 'idle' ? 'bot-float' : ''}>
              <span className={`grid size-24 place-items-center rounded-full border-4 text-5xl transition-colors ${ring}`}>
                {pendingId
                  ? <LoaderCircle aria-hidden="true" className="animate-spin text-[#A21942]" size={34} />
                  : face}
              </span>
            </div>
            {crashed && (
              <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-16 -translate-x-1/2">
                <span className="bot-smoke inline-block text-2xl">{'\u{1F4A8}'}</span>
                <span className="bot-smoke inline-block text-xl" style={{ animationDelay: '0.25s' }}>{'\u{1F4A8}'}</span>
              </span>
            )}
            {crashed && (
              <span aria-hidden="true" className="bot-glitch pointer-events-none absolute inset-x-0 top-0 h-full bg-red-500/10" />
            )}
            <div
              className="bubble-in mt-4 w-full max-w-md rounded-xl border border-gray-200 bg-white p-4 text-center text-sm leading-6 text-gray-800 shadow-sm"
              key={lastTriedId ?? 'idle'}
              role="status"
            >
              {pendingId
                ? 'Processing your order…'
                : lastReaction
                  ? lastReaction.reaction
                  : 'Beep boop! Ready to take your order. Pick an input from the tray.'}
            </div>
            {lastReaction?.lesson && (
              <p className="bot-pop mt-3 flex w-full max-w-md items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-left text-xs leading-5 text-red-800">
                <Bug aria-hidden="true" className="mt-0.5 shrink-0" size={14} />
                <span><strong>Flaw found!</strong> {lastReaction.lesson}</span>
              </p>
            )}
          </div>
        </div>

        {(won || outOfAttempts) && (
          <div className="bot-pop relative mt-5 overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50 p-5">
            {won && (
              <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0">
                {Array.from({ length: 14 }, (_, i) => (
                  <span
                    className="bot-confetti absolute top-0 inline-block size-2 rounded-sm"
                    key={i}
                    style={{
                      left: `${(i * 7.3 + 4) % 100}%`,
                      backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                      animationDelay: `${(i % 7) * 0.12}s`,
                    }}
                  />
                ))}
              </span>
            )}
            <p className="text-base font-extrabold text-emerald-900">
              {won ? bot.win_title : 'Out of attempts — but you still found trouble.'}
            </p>
            <p className="mt-1 text-sm leading-6 text-emerald-900">
              {won ? bot.win_message : `You found ${flaws.length} of ${bot.flaws_total} flaws. Every flaw caught is a win for future users.`}
            </p>
            <ul className="mt-3 space-y-1.5">
              {bot.lesson_lines.map((line) => (
                <li className="flex items-start gap-2 text-sm leading-6 text-emerald-900" key={line}>
                  <span aria-hidden="true" className="mt-2.5 size-1.5 shrink-0 rounded-full bg-emerald-600" />
                  {line}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs font-medium text-emerald-800">{bot.teaser}</p>
          </div>
        )}

        <div className="mt-6">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Input tray — feed WOKbot</p>
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
            {bot.inputs.map((input) => {
              const result = tried[input.id]
              const isPending = pendingId === input.id
              return (
                <button
                  className={`flex items-center gap-2.5 rounded-lg border p-3 text-left text-sm leading-5 transition-colors ${
                    result
                      ? result.kind === 'flaw'
                        ? 'border-red-300 bg-red-50 text-red-900'
                        : result.kind === 'near_miss'
                          ? 'border-amber-300 bg-amber-50 text-amber-900'
                          : 'border-emerald-300 bg-emerald-50 text-emerald-900'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-[#A21942]/50 hover:bg-[#FBF8F6]'
                  } disabled:cursor-not-allowed`}
                  disabled={Boolean(result) || Boolean(pendingId) || won || outOfAttempts}
                  key={input.id}
                  onClick={() => void feed(input.id)}
                  type="button"
                >
                  <span aria-hidden="true" className="text-lg">{input.emoji}</span>
                  <span className="min-w-0 flex-1">{input.label}</span>
                  {result && (
                    <span className="shrink-0 text-sm">
                      {result.kind === 'flaw' ? '\u{1F4A5}' : result.kind === 'near_miss' ? '\u{1F928}' : '✅'}
                    </span>
                  )}
                  {isPending && <LoaderCircle aria-hidden="true" className="shrink-0 animate-spin text-[#A21942]" size={14} />}
                </button>
              )
            })}
          </div>
          {error && (
            <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p>
          )}
        </div>
      </div>

      <button
        className="inline-flex items-center gap-2 rounded-lg bg-[#A21942] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#801333] disabled:cursor-not-allowed disabled:opacity-40"
        disabled={!won && !outOfAttempts}
        onClick={onContinue}
        type="button"
      >
        Continue to the reflection <ArrowRight aria-hidden="true" size={16} />
      </button>
    </div>
  )
}