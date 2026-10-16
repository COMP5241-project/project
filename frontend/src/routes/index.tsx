import { createFileRoute } from '@tanstack/react-router'
import {
  Activity,
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Blocks,
  Bot,
  BrainCircuit,
  Check,
  ChevronRight,
  CirclePlay,
  Code2,
  Compass,
  GraduationCap,
  Lightbulb,
  Menu,
  MousePointer2,
  Network,
  PanelTop,
  Play,
  Sparkles,
  Terminal,
  Users,
  WandSparkles,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { resolveSignedInRole, type DashboardRole } from '../lib/session'

export const Route = createFileRoute('/')({
  component: HomePage,
  // Resolve the signed-in role before first paint so the navbar never
  // flashes the signed-out buttons for an authenticated user.
  loader: async () => ({ signedInRole: await resolveSignedInRole() }),
})

interface NavLink {
  label: string
  href: string
}

interface FeatureCardProps {
  icon: LucideIcon
  eyebrow: string
  title: string
  description: string
  accent: string
  visual: React.ReactNode
}

interface FluencyDimension {
  number: string
  name: string
  description: string
  icon: LucideIcon
}

const navLinks: NavLink[] = [
  { label: 'Features', href: '#features' },
  { label: 'For Non-CS', href: '#audiences' },
  { label: 'For CS Majors', href: '#audiences' },
  { label: 'AI Fluency', href: '#fluency' },
  { label: 'Instructors', href: '#instructors' },
]

const fluencyDimensions: FluencyDimension[] = [
  {
    number: '01',
    name: 'Delegation',
    description: 'Know what to hand off to AI—and what needs your human touch.',
    icon: MousePointer2,
  },
  {
    number: '02',
    name: 'Description',
    description: 'Give clear goals, context, constraints, and a process to follow.',
    icon: PanelTop,
  },
  {
    number: '03',
    name: 'Discernment',
    description: 'Question, evaluate, and improve what AI gives you back.',
    icon: BrainCircuit,
  },
  {
    number: '04',
    name: 'Diligence',
    description: 'Verify the work, document your process, and own the outcome.',
    icon: Check,
  },
]

function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeAudience, setActiveAudience] = useState<'non-cs' | 'cs'>('non-cs')
  const [demoOpen, setDemoOpen] = useState(false)
  const { signedInRole } = Route.useLoaderData()

  return (
    <div className="min-h-screen overflow-hidden bg-white text-[#262626]">
      <Navbar
        mobileMenuOpen={mobileMenuOpen}
        onMenuToggle={() => setMobileMenuOpen((open) => !open)}
        onNavigate={() => setMobileMenuOpen(false)}
        signedInRole={signedInRole}
      />
      <main>
        <Hero onDemoOpen={() => setDemoOpen(true)} />
        <AudienceSection
          activeAudience={activeAudience}
          onAudienceChange={setActiveAudience}
        />
        <FeaturesGrid />
        <AIFluencySection />
        <InteractivePreview />
        <CTASection />
      </main>
      <Footer />
      {demoOpen && <DemoDialog onClose={() => setDemoOpen(false)} />}
    </div>
  )
}

interface NavbarProps {
  mobileMenuOpen: boolean
  onMenuToggle: () => void
  onNavigate: () => void
  signedInRole: DashboardRole | null
}

function Navbar({ mobileMenuOpen, onMenuToggle, onNavigate, signedInRole }: NavbarProps) {
  const dashboardHref: '/instructor.html' | '/student' | '/login' =
    signedInRole === 'instructor'
      ? '/instructor.html'
      : signedInRole === 'student'
        ? '/student'
        : '/login'
  const secondaryLabel =
    signedInRole === 'instructor'
      ? 'Instructor Studio'
      : signedInRole === 'student'
        ? 'My Learning Hub'
        : 'Student Login'
  const primaryLabel = signedInRole ? 'Open dashboard' : 'Get started'

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200/80 bg-white/95 backdrop-blur-xl">
      <nav
        aria-label="Main navigation"
        className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8"
      >
        <a
          aria-label="PolyU Education 4.0 home"
          className="flex shrink-0 items-center gap-2.5"
          href="#top"
          onClick={onNavigate}
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-[#A21942] text-white shadow-sm">
            <GraduationCap aria-hidden="true" size={20} strokeWidth={2.2} />
          </span>
          <span className="text-[15px] font-extrabold tracking-[-0.04em] text-[#262626]">
            PolyU <span className="text-[#A21942]">Edu 4.0</span>
          </span>
        </a>

        <div className="hidden items-center gap-7 lg:flex">
          {navLinks.map((link) => (
            <a
              className="text-[13px] font-medium text-gray-600 transition-colors hover:text-[#A21942]"
              href={link.href}
              key={link.label}
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-2.5 sm:flex">
          <a
            className="rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100"
            href={dashboardHref}
          >
            {secondaryLabel}
          </a>
          <a
            className="inline-flex items-center gap-2 rounded-lg bg-[#A21942] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#801333] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A21942]"
            href={dashboardHref}
          >
            {primaryLabel} <ArrowRight aria-hidden="true" size={15} />
          </a>
        </div>

        <button
          aria-expanded={mobileMenuOpen}
          aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          className="inline-flex size-10 items-center justify-center rounded-lg border border-gray-200 text-gray-700 sm:hidden"
          onClick={onMenuToggle}
          type="button"
        >
          {mobileMenuOpen ? <X aria-hidden="true" size={20} /> : <Menu aria-hidden="true" size={20} />}
        </button>
      </nav>
      {mobileMenuOpen && (
        <div className="border-t border-gray-200 bg-white px-5 py-4 shadow-lg sm:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1">
            {navLinks.map((link) => (
              <a
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-[#A21942]"
                href={link.href}
                key={link.label}
                onClick={onNavigate}
              >
                {link.label}
              </a>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2 border-t border-gray-100 pt-3">
              <a
                className="rounded-lg border border-gray-200 px-3 py-2.5 text-center text-sm font-semibold text-gray-700"
                onClick={onNavigate}
                href={dashboardHref}
              >
                {secondaryLabel}
              </a>
              <a
                className="rounded-lg bg-[#A21942] px-3 py-2.5 text-center text-sm font-semibold text-white"
                onClick={onNavigate}
                href={dashboardHref}
              >
                {primaryLabel}
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

interface HeroProps {
  onDemoOpen: () => void
}

function Hero({ onDemoOpen }: HeroProps) {
  return (
    <section className="relative isolate overflow-hidden bg-[#FBF8F6]" id="top">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 -top-48 -z-10 size-[36rem] rounded-full bg-[#A21942]/[0.07] blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-64 left-1/4 -z-10 size-[30rem] rounded-full bg-orange-100/60 blur-3xl"
      />
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 pb-16 pt-14 sm:px-8 sm:pb-20 sm:pt-20 lg:grid-cols-[1.03fr_0.97fr] lg:gap-10 lg:pb-24 lg:pt-24">
        <div className="max-w-2xl">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#A21942]/15 bg-white/80 px-3.5 py-2 text-xs font-semibold text-[#801333] shadow-sm">
            <Sparkles aria-hidden="true" className="text-[#A21942]" size={15} />
            The next chapter of learning starts here
          </div>
          <h1 className="text-[clamp(2.8rem,6vw,4.65rem)] font-extrabold leading-[1.04] tracking-[-0.065em] text-[#262626]">
            Learn to build
            <br />
            with AI. <span className="text-[#A21942]">Think</span>
            <br className="hidden sm:block" /> beyond it.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-gray-600 sm:text-lg sm:leading-8">
            Turn bold ideas into working software—or level up from writing code to
            designing systems and orchestrating AI. Learning that meets you where
            you are, and takes you further.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#A21942] px-5 py-3 text-sm font-bold text-white shadow-[0_8px_20px_-8px_rgba(162,25,66,0.55)] transition-all hover:-translate-y-0.5 hover:bg-[#801333] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A21942]"
              href="#preview"
            >
              Explore mini-courses <ArrowRight aria-hidden="true" size={17} />
            </a>
            <button
              className="inline-flex min-h-12 items-center justify-center gap-2.5 rounded-lg border border-gray-300 bg-white/80 px-5 py-3 text-sm font-semibold text-gray-800 transition-colors hover:border-gray-400 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A21942]"
              onClick={onDemoOpen}
              type="button"
            >
              <CirclePlay aria-hidden="true" className="text-[#A21942]" size={18} />
              Watch 2-min demo
            </button>
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-gray-200/80 pt-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <span className="flex size-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <Check aria-hidden="true" size={14} strokeWidth={2.7} />
              </span>
              AI-powered
            </div>
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <span className="flex size-7 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                <Compass aria-hidden="true" size={14} />
              </span>
              Personalised paths
            </div>
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <span className="flex size-7 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                <Code2 aria-hidden="true" size={14} />
              </span>
              Hands-on sandbox
            </div>
          </div>
        </div>
        <HeroVisual />
      </div>
      <a
        aria-label="Scroll to learning paths"
        className="mx-auto mb-7 hidden w-fit items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-gray-500 transition-colors hover:text-[#A21942] lg:flex"
        href="#audiences"
      >
        Find your learning path <ArrowDown aria-hidden="true" size={14} />
      </a>
    </section>
  )
}

function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[570px]">
      <div
        aria-hidden="true"
        className="absolute -right-7 top-12 -z-10 size-28 rounded-[2rem] border border-[#A21942]/15 bg-[#A21942]/[0.04] rotate-12"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-8 -left-8 -z-10 size-24 rounded-full border border-[#A21942]/15"
      />
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_28px_80px_-32px_rgba(38,38,38,0.3)]">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-[#A21942]/10 text-[#A21942]">
              <Blocks aria-hidden="true" size={16} />
            </span>
            <div>
              <p className="text-xs font-bold text-gray-900">Your learning studio</p>
              <p className="mt-0.5 text-[10px] text-gray-500">A path made for you</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            On track
          </span>
        </div>
        <div className="grid sm:grid-cols-[0.84fr_1.16fr]">
          <div className="border-b border-gray-100 bg-[#FCFAF9] p-5 sm:border-b-0 sm:border-r">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                <Lightbulb aria-hidden="true" size={16} />
              </span>
              <div>
                <p className="text-[11px] font-bold text-gray-900">Your AI tutor</p>
                <p className="text-[10px] text-gray-500">Knows your goals</p>
              </div>
            </div>
            <div className="mt-5 rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm">
              <div className="flex gap-2.5">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-[#A21942] text-white">
                  <Bot aria-hidden="true" size={13} />
                </span>
                <p className="text-[11px] leading-[1.65] text-gray-600">
                  Since you&apos;re new to coding, let&apos;s start with a visual
                  prototype. You can bring your idea to life without getting
                  stuck on syntax.
                </p>
              </div>
              <div className="mt-3 rounded-lg bg-[#FBF8F6] px-3 py-2 text-[10px] font-medium text-[#801333]">
                Your next step: Build a tiny app <ArrowRight aria-hidden="true" className="ml-1 inline" size={11} />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-[10px]">
              <span className="font-semibold text-gray-600">Path progress</span>
              <span className="font-bold text-[#A21942]">3 of 8</span>
            </div>
            <div
              aria-label="Learning path 38 percent complete"
              className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200"
              role="img"
            >
              <div className="h-full w-[38%] rounded-full bg-[#A21942]" />
            </div>
          </div>
          <div className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-gray-900">Continue learning</p>
                <p className="mt-1 text-[10px] text-gray-500">Picked for your goals</p>
              </div>
              <span className="flex size-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                <WandSparkles aria-hidden="true" size={16} />
              </span>
            </div>
            <div className="mt-4 overflow-hidden rounded-xl border border-gray-200">
              <div className="relative flex h-[106px] items-center justify-center overflow-hidden bg-gradient-to-br from-[#A21942] via-[#882440] to-[#42232f]">
                <div aria-hidden="true" className="absolute inset-0 opacity-25">
                  <div className="absolute -right-5 -top-10 size-32 rounded-full border border-white" />
                  <div className="absolute right-4 top-3 size-20 rounded-full border border-white" />
                  <div className="absolute -bottom-12 left-6 size-36 rounded-full border border-white" />
                </div>
                <span className="relative flex size-11 items-center justify-center rounded-full border border-white/30 bg-white/20 text-white backdrop-blur-sm">
                  <Play aria-hidden="true" className="ml-0.5" fill="currentColor" size={16} />
                </span>
                <span className="absolute bottom-2.5 left-3 rounded-md bg-black/25 px-2 py-1 text-[9px] font-medium text-white">
                  MINI-COURSE · 12 MIN
                </span>
              </div>
              <div className="p-3.5">
                <p className="text-xs font-bold leading-5 text-gray-900">
                  From idea to your first app
                </p>
                <div className="mt-2.5 flex items-center justify-between">
                  <span className="text-[10px] text-gray-500">Interactive · Beginner</span>
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-[#A21942]">
                    Pick up where you left off <ChevronRight aria-hidden="true" size={12} />
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5">
              <Activity aria-hidden="true" className="text-emerald-600" size={14} />
              <span className="text-[10px] text-gray-600">
                You&apos;re building momentum—<span className="font-semibold text-gray-800">2 days in a row!</span>
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute -left-5 top-1/3 hidden items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-3.5 py-3 shadow-lg sm:flex">
        <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
          <Code2 aria-hidden="true" size={16} />
        </span>
        <div>
          <p className="text-[10px] font-bold text-gray-900">Your ideas, in motion</p>
          <p className="mt-0.5 text-[9px] text-gray-500">Make something real</p>
        </div>
      </div>
    </div>
  )
}

interface AudienceSectionProps {
  activeAudience: 'non-cs' | 'cs'
  onAudienceChange: (audience: 'non-cs' | 'cs') => void
}

interface AudienceContentProps {
  label: string
  headline: React.ReactNode
  description: string
  bullets: string[]
  icon: LucideIcon
  outcomes: string[]
}

function AudienceSection({
  activeAudience,
  onAudienceChange,
}: AudienceSectionProps) {
  const content: Record<'non-cs' | 'cs', AudienceContentProps> = {
    'non-cs': {
      label: 'Curious mind, big idea?',
      headline: (
        <>
          Your idea deserves
          <br className="hidden sm:block" /> to become <span className="text-[#A21942]">real.</span>
        </>
      ),
      description:
        'You don’t need to learn every line of code before you can make something useful. Start with your idea; we’ll help you turn it into software, one small win at a time.',
      bullets: [
        'Prototype with AI—no syntax deep-dive required',
        'Learn just enough code, exactly when you need it',
        'Build, test, and improve ideas in a safe sandbox',
      ],
      icon: Lightbulb,
      outcomes: ['Start with an idea', 'Learn by making', 'Ship something real'],
    },
    cs: {
      label: 'Already know your way around code?',
      headline: (
        <>
          Move from writing code
          <br className="hidden sm:block" /> to <span className="text-[#A21942]">shaping systems.</span>
        </>
      ),
      description:
        'Syntax is only the starting point. Develop the judgement to frame complex problems, design robust systems, evaluate AI outputs, and direct agentic workflows with confidence.',
      bullets: [
        'Frame ambiguous problems before reaching for a prompt',
        'Architect systems and orchestrate multi-step agents',
        'Review AI output with rigour, not just a quick glance',
      ],
      icon: Network,
      outcomes: ['Frame the problem', 'Design the system', 'Orchestrate agents'],
    },
  }
  const selected = content[activeAudience]
  const AudienceIcon = selected.icon

  return (
    <section className="scroll-mt-20 bg-white py-20 sm:py-24" id="audiences">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#A21942]">
            One platform, your path
          </p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.045em] text-[#262626] sm:text-4xl">
            Wherever you start, keep moving forward.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-gray-600">
            New to building software or ready to lead with AI? Make progress that
            feels relevant from day one.
          </p>
        </div>

        <div className="mt-9 flex justify-center">
          <div
            aria-label="Choose your learning background"
            className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1.5"
            role="tablist"
          >
            <AudienceTab
              active={activeAudience === 'non-cs'}
              id="non-cs-tab"
              onClick={() => onAudienceChange('non-cs')}
              controls="non-cs-panel"
            >
              Non-CS learners
            </AudienceTab>
            <AudienceTab
              active={activeAudience === 'cs'}
              id="cs-tab"
              onClick={() => onAudienceChange('cs')}
              controls="cs-panel"
            >
              CS &amp; developers
            </AudienceTab>
          </div>
        </div>

        <div
          aria-labelledby={`${activeAudience}-tab`}
          className="mt-8 grid overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:grid-cols-[1.1fr_0.9fr]"
          id={`${activeAudience}-panel`}
          role="tabpanel"
          tabIndex={0}
        >
          <div className="p-7 sm:p-10 lg:p-12">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#FBF1F4] px-3 py-1.5 text-xs font-semibold text-[#801333]">
              <AudienceIcon aria-hidden="true" size={14} />
              {selected.label}
            </div>
            <h3 className="mt-5 text-3xl font-extrabold leading-tight tracking-[-0.05em] text-[#262626] sm:text-[2.5rem]">
              {selected.headline}
            </h3>
            <p className="mt-4 max-w-xl text-sm leading-7 text-gray-600 sm:text-base">
              {selected.description}
            </p>
            <ul className="mt-6 space-y-3">
              {selected.bullets.map((bullet) => (
                <li className="flex items-start gap-3 text-sm text-gray-700" key={bullet}>
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <Check aria-hidden="true" size={12} strokeWidth={3} />
                  </span>
                  {bullet}
                </li>
              ))}
            </ul>
            <a
              className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-[#A21942] transition-colors hover:text-[#801333]"
              href="#preview"
            >
              See your learning path <ArrowRight aria-hidden="true" size={16} />
            </a>
          </div>
          <div className="relative flex min-h-[250px] flex-col justify-between overflow-hidden bg-[#FBF8F6] p-7 sm:p-10 lg:p-12">
            <span aria-hidden="true" className="absolute -right-16 -top-24 size-64 rounded-full border border-[#A21942]/10" />
            <span aria-hidden="true" className="absolute -right-2 -top-10 size-44 rounded-full border border-[#A21942]/10" />
            <div className="relative">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-gray-500">
                What you&apos;ll learn to do
              </p>
              <div className="mt-6 space-y-3">
                {selected.outcomes.map((outcome, index) => (
                  <div className="flex items-center gap-3" key={outcome}>
                    <span className="flex size-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-xs font-bold text-[#A21942] shadow-sm">
                      0{index + 1}
                    </span>
                    <span className="text-sm font-semibold text-gray-800">{outcome}</span>
                    <ArrowUpRight aria-hidden="true" className="ml-auto text-gray-400" size={15} />
                  </div>
                ))}
              </div>
            </div>
            <p className="relative mt-8 max-w-sm text-xs leading-5 text-gray-500">
              Your tutor adapts the pace and the next challenge to your background
              and goals.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

interface AudienceTabProps {
  active: boolean
  id: string
  controls: string
  onClick: () => void
  children: React.ReactNode
}

function AudienceTab({
  active,
  id,
  controls,
  onClick,
  children,
}: AudienceTabProps) {
  return (
    <button
      aria-controls={controls}
      aria-selected={active}
      className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition-all sm:px-6 ${
        active
          ? 'bg-white text-[#A21942] shadow-sm ring-1 ring-gray-200'
          : 'text-gray-600 hover:text-gray-900'
      }`}
      id={id}
      onClick={onClick}
      role="tab"
      type="button"
    >
      {children}
    </button>
  )
}

function FeaturesGrid() {
  const features: FeatureCardProps[] = [
    {
      icon: Code2,
      eyebrow: 'LEARN BY DOING',
      title: 'Small lessons. Real momentum.',
      description:
        'Try interactive simulations, mini-games, and a browser-based coding environment. Make, break, and fix things as you learn.',
      accent: 'bg-[#FBF1F4] text-[#A21942]',
      visual: (
        <div className="mt-6 rounded-xl border border-gray-200 bg-[#202124] p-4 font-mono text-[11px] leading-6 text-gray-300">
          <p><span className="text-violet-300">const</span> <span className="text-sky-300">idea</span> = <span className="text-emerald-300">&quot;your next big thing&quot;</span></p>
          <p><span className="text-violet-300">await</span> <span className="text-yellow-200">buildWithAI</span>(idea)</p>
          <p className="mt-1 text-emerald-300">✓ Prototype ready to explore</p>
        </div>
      ),
    },
    {
      icon: BrainCircuit,
      eyebrow: 'MADE PERSONAL',
      title: 'A tutor that gets you.',
      description:
        'Your AI tutor gets to know your background, interests, and goals—then shapes the content and next steps around you.',
      accent: 'bg-violet-50 text-violet-700',
      visual: (
        <div className="mt-6 space-y-2.5">
          <div className="flex items-center gap-2 rounded-lg border border-gray-100 bg-white p-2.5">
            <span className="flex size-6 items-center justify-center rounded-md bg-violet-50 text-violet-600"><Sparkles aria-hidden="true" size={13} /></span>
            <span className="text-[11px] font-medium text-gray-700">Built around your goals</span>
            <Check aria-hidden="true" className="ml-auto text-emerald-600" size={14} />
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-gray-100 bg-white p-2.5">
            <span className="flex size-6 items-center justify-center rounded-md bg-amber-50 text-amber-700"><Compass aria-hidden="true" size={13} /></span>
            <span className="text-[11px] font-medium text-gray-700">Adapts as you progress</span>
            <Check aria-hidden="true" className="ml-auto text-emerald-600" size={14} />
          </div>
        </div>
      ),
    },
    {
      icon: WandSparkles,
      eyebrow: 'FOR EDUCATORS',
      title: 'More time for teaching.',
      description:
        'Create or customise courses with AI or by hand, bring your students in, and see what’s clicking with clear engagement insights.',
      accent: 'bg-amber-50 text-amber-700',
      visual: (
        <div className="mt-6 flex items-end gap-2 rounded-xl border border-gray-200 bg-white px-4 pb-3 pt-4">
          {[38, 56, 44, 76, 60, 90, 68, 100, 74, 86, 64, 94].map((height, index) => (
            <span
              className={`w-full rounded-t-sm ${index === 7 ? 'bg-[#A21942]' : 'bg-[#A21942]/20'}`}
              key={`${height}-${index}`}
              style={{ height: `${height * 0.45}px` }}
            />
          ))}
          <span className="sr-only">Example student engagement activity chart</span>
        </div>
      ),
    },
    {
      icon: BrainCircuit,
      eyebrow: 'AI FLUENCY 4D',
      title: 'Human judgement, built in.',
      description:
        'Practise the four skills that make AI collaboration thoughtful and effective: delegation, description, discernment, and diligence.',
      accent: 'bg-emerald-50 text-emerald-700',
      visual: (
        <div className="mt-6 grid grid-cols-2 gap-2">
          {fluencyDimensions.map(({ number, name }) => (
            <div
              className="flex items-center gap-2 rounded-lg border border-gray-100 bg-white p-2.5"
              key={number}
            >
              <span className="font-mono text-[9px] text-gray-400">{number}</span>
              <span className="text-[10px] font-semibold text-gray-700">{name}</span>
            </div>
          ))}
        </div>
      ),
    },
  ]

  return (
    <section className="scroll-mt-20 bg-[#F8F9FA] py-20 sm:py-24" id="features">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#A21942]">
              A better way to learn
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.045em] text-[#262626] sm:text-4xl">
              Built for the way learning happens now.
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-gray-600 sm:pb-1">
            Active, personal, and practical—tools that help students learn and
            educators focus on what matters.
          </p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {features.map((feature) => (
            <FeatureCard {...feature} key={feature.title} />
          ))}
        </div>
      </div>
    </section>
  )
}

function FeatureCard({
  icon: Icon,
  eyebrow,
  title,
  description,
  accent,
  visual,
}: FeatureCardProps) {
  return (
    <article className="group rounded-2xl border border-gray-200 bg-white p-6 transition-all hover:-translate-y-1 hover:border-gray-300 hover:shadow-lg sm:p-7">
      <span className={`flex size-11 items-center justify-center rounded-xl ${accent}`}>
        <Icon aria-hidden="true" size={21} />
      </span>
      <p className="mt-5 text-[10px] font-bold tracking-[0.15em] text-gray-500">{eyebrow}</p>
      <h3 className="mt-2 text-xl font-bold tracking-[-0.03em] text-gray-900">{title}</h3>
      <p className="mt-2.5 min-h-[72px] text-sm leading-6 text-gray-600">{description}</p>
      {visual}
    </article>
  )
}

function AIFluencySection() {
  return (
    <section className="scroll-mt-20 bg-[#262626] py-20 text-white sm:py-24" id="fluency">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-16">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-white/80">
              <Sparkles aria-hidden="true" className="text-[#F3A9BE]" size={14} />
              The human edge
            </div>
            <h2 className="mt-5 text-3xl font-extrabold leading-tight tracking-[-0.05em] sm:text-4xl">
              Don’t just use AI.
              <br />
              <span className="text-[#F3A9BE]">Get fluent in it.</span>
            </h2>
            <p className="mt-5 max-w-lg text-sm leading-7 text-gray-300 sm:text-base">
              We bring Anthropic&apos;s AI Fluency 4D Framework into hands-on
              learning. Build the human judgement to work with AI thoughtfully,
              effectively, and responsibly.
            </p>
            <a
              className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-white transition-colors hover:text-[#F3A9BE]"
              href="#preview"
            >
              See it in a mini-course <ArrowRight aria-hidden="true" size={16} />
            </a>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {fluencyDimensions.map(({ number, name, description, icon: Icon }) => (
              <article
                className="rounded-xl border border-white/10 bg-white/[0.055] p-5 transition-colors hover:border-white/20 hover:bg-white/[0.08]"
                key={name}
              >
                <div className="flex items-center justify-between">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-[#A21942] text-white">
                    <Icon aria-hidden="true" size={17} />
                  </span>
                  <span className="font-mono text-xs text-white/40">{number}</span>
                </div>
                <h3 className="mt-5 text-lg font-bold">{name}</h3>
                <p className="mt-2 text-sm leading-6 text-gray-300">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function InteractivePreview() {
  return (
    <section className="scroll-mt-20 bg-white py-20 sm:py-24" id="preview">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#A21942]">
            A taste of what’s inside
          </p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.045em] text-[#262626] sm:text-4xl">
            Less watching. More figuring it out.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-gray-600">
            Mini-courses put you in the driver’s seat. Explore a sample learning
            experience and see what learning by doing feels like.
          </p>
        </div>

        <div className="mt-10 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_22px_60px_-35px_rgba(38,38,38,0.3)]">
          <div className="grid lg:grid-cols-[0.88fr_1.12fr]">
            <div className="flex flex-col justify-between bg-[#FBF8F6] p-7 sm:p-10 lg:p-12">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-[#A21942]/15 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#801333]">
                  <Code2 aria-hidden="true" size={13} />
                  Sample mini-course
                </span>
                <h3 className="mt-5 max-w-md text-2xl font-extrabold leading-tight tracking-[-0.04em] text-[#262626] sm:text-3xl">
                  Fundamentals of AI-Assisted Software Engineering
                </h3>
                <p className="mt-4 max-w-md text-sm leading-6 text-gray-600">
                  Go from a fuzzy idea to a working prototype. You’ll learn how
                  to brief AI well, shape the code, and check what it makes.
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  <span className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600">⏱ 25 min</span>
                  <span className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600">Beginner friendly</span>
                  <span className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600">Learn by doing</span>
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">🎮 Live mini-game inside</span>
                </div>
              </div>
              <a
                className="mt-8 inline-flex w-fit items-center gap-2 rounded-lg bg-[#A21942] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[#801333]"
                href="#get-started"
              >
                Explore this course <ArrowRight aria-hidden="true" size={16} />
              </a>
            </div>
            <div className="p-5 sm:p-8 lg:p-10">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                  <p className="text-xs font-bold text-gray-900">Your course, at a glance</p>
                  <p className="mt-1 text-[11px] text-gray-500">An interactive path from idea to app</p>
                </div>
                <span className="flex size-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                  <Activity aria-hidden="true" size={17} />
                </span>
              </div>
              <div className="mt-5 space-y-3">
                <PreviewModule
                  icon={Compass}
                  number="01"
                  title="Map the problem"
                  detail="Simulation · Make the key decisions"
                  tone="bg-blue-50 text-blue-700"
                  active
                />
                <PreviewModule
                  icon={Users}
                  number="02"
                  title="Be the product team"
                  detail="Role-play · Talk through a design trade-off"
                  tone="bg-violet-50 text-violet-700"
                />
                <PreviewModule
                  icon={Play}
                  number="03"
                  title="See it, then try it"
                  detail="Narrated slides · Break down an AI workflow"
                  tone="bg-amber-50 text-amber-700"
                />
                <PreviewModule
                  icon={Terminal}
                  number="04"
                  title="Make it work"
                  detail="Live code editor · Build and test your prototype"
                  tone="bg-emerald-50 text-emerald-700"
                />
              </div>
              <div className="mt-5 flex items-center justify-between rounded-lg bg-gray-50 px-3.5 py-3">
                <span className="flex items-center gap-2 text-[11px] font-medium text-gray-600">
                  <Bot aria-hidden="true" className="text-[#A21942]" size={15} />
                  Your AI tutor is here if you get stuck.
                </span>
                <span className="size-2 rounded-full bg-emerald-500" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

interface PreviewModuleProps {
  icon: LucideIcon
  number: string
  title: string
  detail: string
  tone: string
  active?: boolean
}

function PreviewModule({
  icon: Icon,
  number,
  title,
  detail,
  tone,
  active = false,
}: PreviewModuleProps) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border p-3.5 transition-colors ${
        active ? 'border-[#A21942]/30 bg-[#FBF8F6]' : 'border-gray-100 bg-white'
      }`}
    >
      <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${tone}`}>
        <Icon aria-hidden="true" size={17} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[9px] text-gray-400">{number}</span>
          <p className="truncate text-xs font-bold text-gray-800">{title}</p>
        </div>
        <p className="mt-1 truncate text-[10px] text-gray-500">{detail}</p>
      </div>
      {active ? (
        <span className="rounded-full bg-[#A21942]/10 px-2 py-1 text-[9px] font-bold text-[#A21942]">
          UP NEXT
        </span>
      ) : (
        <ChevronRight aria-hidden="true" className="shrink-0 text-gray-400" size={15} />
      )}
    </div>
  )
}

function CTASection() {
  return (
    <section className="px-5 pb-20 sm:px-8 sm:pb-24" id="get-started">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-2xl bg-[#A21942] px-7 py-12 text-white sm:px-12 sm:py-16 lg:px-16">
        <span aria-hidden="true" className="absolute -right-16 -top-36 size-96 rounded-full border border-white/10" />
        <span aria-hidden="true" className="absolute -right-2 -top-24 size-72 rounded-full border border-white/10" />
        <span aria-hidden="true" className="absolute -bottom-48 right-1/3 size-72 rounded-full bg-white/[0.04]" />
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/75">
              Your next step starts here
            </p>
            <h2 className="mt-3 text-3xl font-extrabold leading-tight tracking-[-0.05em] sm:text-4xl">
              Ready to learn what you can do with AI?
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-white/80 sm:text-base">
              Students: find a mini-course and start building. Instructors:
              make space for a more personal way to learn.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
            <a
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-bold text-[#801333] transition-colors hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              href="#preview"
            >
              I’m a student <ArrowRight aria-hidden="true" size={16} />
            </a>
            <a
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/35 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              href="#instructors"
            >
              I’m an instructor <ArrowRight aria-hidden="true" size={16} />
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="scroll-mt-20 border-t border-gray-200 bg-[#F8F9FA]" id="instructors">
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-12">
        <div className="flex flex-col justify-between gap-8 sm:flex-row">
          <div className="max-w-sm">
            <a aria-label="PolyU Education 4.0 home" className="inline-flex items-center gap-2.5" href="#top">
              <span className="flex size-9 items-center justify-center rounded-xl bg-[#A21942] text-white">
                <GraduationCap aria-hidden="true" size={20} />
              </span>
              <span className="text-sm font-extrabold tracking-[-0.04em] text-[#262626]">
                PolyU <span className="text-[#A21942]">Edu 4.0</span>
              </span>
            </a>
            <p className="mt-4 text-sm leading-6 text-gray-600">
              A student-centred, AI-empowered learning experience from The Hong
              Kong Polytechnic University.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-gray-600">AI-powered learning</span>
              <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-gray-600">Human-centred by design</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-12 gap-y-6 sm:gap-x-16">
            <div>
              <h3 className="text-xs font-bold text-gray-900">Explore</h3>
              <ul className="mt-3 space-y-2.5">
                <li><a className="text-sm text-gray-600 transition-colors hover:text-[#A21942]" href="#features">Features</a></li>
                <li><a className="text-sm text-gray-600 transition-colors hover:text-[#A21942]" href="#preview">Mini-courses</a></li>
                <li><a className="text-sm text-gray-600 transition-colors hover:text-[#A21942]" href="#fluency">AI Fluency</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-900">For you</h3>
              <ul className="mt-3 space-y-2.5">
                <li><a className="text-sm text-gray-600 transition-colors hover:text-[#A21942]" href="#audiences">Students</a></li>
                <li><a className="text-sm text-gray-600 transition-colors hover:text-[#A21942]" href="#instructors">Instructors</a></li>
                <li><a className="text-sm text-gray-600 transition-colors hover:text-[#A21942]" href="#get-started">Get started</a></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-9 flex flex-col gap-3 border-t border-gray-200 pt-5 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} PolyU Education 4.0. All rights reserved.</p>
          <p>Learn with curiosity. Build with care.</p>
        </div>
      </div>
    </footer>
  )
}

interface DemoDialogProps {
  onClose: () => void
}

function DemoDialog({ onClose }: DemoDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  return (
    <dialog
      className="m-auto w-full max-w-none border-0 bg-transparent p-4 backdrop:bg-[#181416]/75 backdrop:backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      onCancel={onClose}
      onClose={onClose}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose()
      }}
      ref={dialogRef}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 sm:px-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#A21942]">A quick look around</p>
            <h2 className="mt-1 text-sm font-bold text-gray-900" id="demo-title">PolyU Education 4.0 in two minutes</h2>
          </div>
          <button
            aria-label="Close demo"
            className="flex size-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={19} />
          </button>
        </div>
        <div className="bg-[#FBF8F6] p-5 sm:p-8">
          <div className="relative flex aspect-video flex-col items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#A21942] via-[#76263d] to-[#262626] text-center text-white">
            <span aria-hidden="true" className="absolute -right-8 -top-20 size-64 rounded-full border border-white/15" />
            <span aria-hidden="true" className="absolute -bottom-32 -left-10 size-72 rounded-full border border-white/15" />
            <span className="relative flex size-14 items-center justify-center rounded-full border border-white/30 bg-white/15 backdrop-blur-sm">
              <Play aria-hidden="true" className="ml-1" fill="currentColor" size={21} />
            </span>
            <p className="relative mt-4 text-sm font-bold">Your learning journey starts with an idea.</p>
            <p className="relative mt-1 text-xs text-white/70">AI-powered learning, built around you.</p>
          </div>
          <p className="mt-4 text-center text-xs leading-5 text-gray-500">
            This preview is a product tour. Explore the mini-courses below to see
            how interactive learning works.
          </p>
          <a
            className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-[#A21942] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[#801333]"
            href="#preview"
            onClick={onClose}
          >
            Explore mini-courses <ArrowRight aria-hidden="true" size={16} />
          </a>
        </div>
      </div>
    </dialog>
  )
}
