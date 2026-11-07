import { createFileRoute, Link } from '@tanstack/react-router'
import { BookCheck } from 'lucide-react'

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
              <BookCheck aria-hidden="true" className="size-6" strokeWidth={1.8} />
            </span>
            <p className="mb-3 mt-8 text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">Instructor</p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Hello, instructor.
            </h1>
            <p className="mt-4 max-w-xl leading-7 text-slate-600">
              Welcome to your workspace.
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
