import { Link, Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import type { AppRouterContext } from "@/main";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { ArrowLeft, BookOpen } from "lucide-react";

export const Route = createRootRouteWithContext<AppRouterContext>()({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ({ error }) => (
    <div>
      <h1>Error</h1>
      <pre>{error instanceof Error ? error.message : "An unknown error occurred."}</pre>
    </div>
  ),
});

function NotFoundComponent() {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-slate-50 px-5 py-10 text-slate-900 sm:px-8 sm:py-14">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 -top-40 size-96 rounded-full bg-indigo-100/70 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-48 -left-32 size-96 rounded-full bg-violet-100/60 blur-3xl"
      />

      <section className="relative w-full max-w-4xl rounded-3xl border border-slate-200/80 bg-white/95 p-7 shadow-xl shadow-slate-200/60 backdrop-blur sm:p-10 lg:p-12">
        <header className="flex items-center gap-3 border-b border-slate-100 pb-6 sm:pb-8">
          <span className="grid size-10 place-items-center rounded-xl bg-indigo-50 text-indigo-700">
            <BookOpen aria-hidden="true" className="size-5" strokeWidth={1.8} />
          </span>
          <span className="text-sm font-semibold tracking-wide text-slate-700 sm:text-base">
            COMP5241 <span className="text-slate-400">·</span> GROUP 5
          </span>
        </header>

        <div className="grid items-center gap-10 pt-8 sm:pt-10 md:grid-cols-[1.2fr_0.8fr] md:gap-12">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600 sm:text-sm">
              Page not found <span className="text-slate-300">/</span> 404
            </p>
            <h1 className="mt-4 max-w-lg text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
              Looks like you’re off the learning path.
            </h1>
            <p className="mt-4 max-w-md text-base leading-7 text-slate-600">
              We can’t find the page you requested. The link may be outdated,
              or the page may have moved.
            </p>

            <Link
              to="/"
              className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
              Back to home
            </Link>
          </div>

          <div
            aria-hidden="true"
            className="relative grid min-h-48 place-items-center overflow-hidden rounded-2xl border border-indigo-100 bg-indigo-50/70 sm:min-h-56"
          >
            <div className="absolute size-40 rounded-full border border-indigo-200/80 sm:size-48" />
            <div className="absolute size-28 rounded-full border border-indigo-200/80 sm:size-36" />
            <span className="relative text-7xl font-bold tracking-[-0.08em] text-indigo-200 sm:text-8xl">
              404
            </span>
            <span className="absolute bottom-4 right-5 rounded-full bg-white px-3 py-1 text-xs font-semibold tracking-wide text-indigo-700 shadow-sm">
              LOST IN TRANSIT
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}

function RootComponent() {
  return (
    <div>
      <Outlet />
      <ReactQueryDevtools />
      <TanStackRouterDevtools />
    </div>
  );
}