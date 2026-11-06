import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900 sm:px-10 sm:py-16">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl flex-col sm:min-h-[calc(100vh-8rem)]">
        <a href="/" className="flex items-center gap-3 self-start text-sm font-semibold tracking-wide text-slate-700">
          <span className="grid size-9 place-items-center rounded-xl bg-indigo-600 text-sm font-bold text-white">L</span>
          LEARNING PLATFORM
        </a>

        <section className="my-auto py-16">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">
            COMP5241 · GROUP 5
          </p>
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-6xl">
            A better way to learn, one step at a time.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
            Welcome to the learning platform. Choose how you’d like to continue.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <Link
              to="/learner"
              className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              <span className="mb-8 grid size-11 place-items-center rounded-xl bg-indigo-50 text-indigo-700">
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-5 stroke-current" strokeWidth="1.8">
                  <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z" />
                  <path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20M8 7h8M8 10h6" />
                </svg>
              </span>
              <span className="flex items-center justify-between">
                <span>
                  <span className="block text-lg font-semibold text-slate-900">I’m a learner</span>
                  <span className="mt-1 block text-sm text-slate-500">Explore learning paths</span>
                </span>
                <span aria-hidden="true" className="text-xl text-slate-400 transition group-hover:translate-x-1 group-hover:text-indigo-600">→</span>
              </span>
            </Link>

            <Link
              to="/instructor"
              className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              <span className="mb-8 grid size-11 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-5 stroke-current" strokeWidth="1.8">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
                  <path d="m9 10 2 2 4-4" />
                </svg>
              </span>
              <span className="flex items-center justify-between">
                <span>
                  <span className="block text-lg font-semibold text-slate-900">I’m an instructor</span>
                  <span className="mt-1 block text-sm text-slate-500">Continue to your workspace</span>
                </span>
                <span aria-hidden="true" className="text-xl text-slate-400 transition group-hover:translate-x-1 group-hover:text-indigo-600">→</span>
              </span>
            </Link>
          </div>
        </section>

        <footer className="border-t border-slate-200 py-5 text-sm text-slate-500">
          Learning, made more intentional.
        </footer>
      </div>
    </main>
  );
}
