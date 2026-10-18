import { ArrowRight, Bot, Compass, Gamepad2, MonitorPlay, Sparkles } from 'lucide-react'
import type { SampleCourseContent } from '../../lib/api'

interface WelcomeScreenProps {
  content: SampleCourseContent
  isGuest: boolean
  isInstructor: boolean
  onStart: () => void
}

const MODULES = [
  {
    icon: Compass,
    name: 'Map the problem',
    detail: 'Simulation · make the key calls before any code exists',
  },
  {
    icon: MonitorPlay,
    name: 'See it, then try it',
    detail: '5 quick slides + a 3-question quiz with instant feedback',
  },
  {
    icon: Sparkles,
    name: 'Talk to it well',
    detail: 'Compare two real prompts — then explain yours to the AI tutor',
  },
  {
    icon: Gamepad2,
    name: 'Break the Bot',
    detail: 'Live mini-game · find the flaws before the students do',
  },
]

export function WelcomeScreen({ content, isGuest, isInstructor, onStart }: WelcomeScreenProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#A21942]/15 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#801333]">
          <Gamepad2 aria-hidden="true" size={13} />
          Sample mini-course · {content.minutes}
        </span>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-[#262626] sm:text-3xl">
          {content.title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">{content.tagline}</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {MODULES.map(({ icon: Icon, name, detail }) => (
            <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-[#F8F9FA] p-4" key={name}>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#A21942]/10 text-[#A21942]">
                <Icon aria-hidden="true" size={17} />
              </span>
              <div>
                <p className="text-sm font-bold text-gray-800">{name}</p>
                <p className="mt-0.5 text-xs leading-5 text-gray-500">{detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-5">
        <Bot aria-hidden="true" className="mt-0.5 shrink-0 text-emerald-700" size={18} />
        <p className="text-sm leading-6 text-emerald-900">
          {isInstructor
            ? 'You are previewing this course exactly as students see it. Your tutor tries are generous, but nothing is saved to a student record.'
            : isGuest
              ? `This sample includes ${content.tutor_moments} AI tutor moments — short answers the AI reads and scores. No account needed: your progress lives in this browser, and you can sign in at the end to save your result.`
              : 'This sample includes AI tutor moments that read and score your short answers. Your final result is saved to your account when you finish.'}
        </p>
      </div>

      <button
        className="inline-flex items-center gap-2 rounded-lg bg-[#A21942] px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#801333]"
        onClick={onStart}
        type="button"
      >
        Start the course <ArrowRight aria-hidden="true" size={16} />
      </button>
    </div>
  )
}