import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/instructor/')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8 text-slate-900 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-4xl">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-indigo-700"
        >
          <span aria-hidden="true">←</span> Back to home
        </Link>

        <section className="mt-10 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="h-2 bg-emerald-500" />
          <div className="p-7 sm:p-12">
            <span className="grid size-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-6 stroke-current" strokeWidth="1.8">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
                <path d="m9 10 2 2 4-4" />
              </svg>
            </span>
            <p className="mb-3 mt-8 text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">Instructor</p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Hello, instructor.
            </h1>
            <p className="mt-4 max-w-xl leading-7 text-slate-600">
              Welcome to your learning platform workspace.
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
