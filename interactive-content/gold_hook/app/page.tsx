import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  Pickaxe,
  XCircle,
} from "lucide-react";

export default function WarmupPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-7xl items-center justify-center px-4 py-8">
      <section
        aria-labelledby="welcome-title"
        className="w-full max-w-3xl overflow-hidden rounded-lg border border-line bg-white shadow-sm"
      >
        <header className="flex items-center justify-between gap-3 bg-polyu px-5 py-4">
          <div className="flex items-center gap-3">
            <GraduationCap className="h-6 w-6 text-white" aria-hidden />
            <span className="text-sm font-semibold tracking-wide text-white">
              COMP 5241
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-md bg-white/15 px-3 py-1.5">
            <Pickaxe className="h-4 w-4 text-white" aria-hidden />
            <span className="text-sm font-semibold text-white">
              Gold Rush Hook
            </span>
          </div>
        </header>

        <div className="p-6 sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-polyu">
            Your course warm-up
          </p>
          <h1
            id="welcome-title"
            className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl"
          >
            Welcome to COMP 5241!
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-700 sm:text-lg">
            Before you take a deep dive into the course material, enjoy this
            game to get a feel for the dos and don’ts of the Software
            Development Life Cycle (SDLC). Hook good practices for marks, and
            steer clear of costly shortcuts.
          </p>

          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            <article className="rounded-lg border border-line bg-page p-5">
              <div className="flex items-center gap-2">
                <CheckCircle2
                  className="h-5 w-5 text-ok-dark"
                  aria-hidden
                />
                <h2 className="font-semibold text-ink">Hook the DO’s</h2>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-gray-700">
                Look for practices like understanding requirements, reviewing
                code, and testing your work.
              </p>
            </article>
            <article className="rounded-lg border border-line bg-page p-5">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-polyu" aria-hidden />
                <h2 className="font-semibold text-ink">Dodge the DON’Ts</h2>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-gray-700">
                Avoid pitfalls like skipping tests, hardcoding secrets, and
                ignoring requirements.
              </p>
            </article>
          </div>

          <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <Link
              href="/play"
              className="btn-primary flex min-h-[44px] w-full items-center justify-center gap-2 sm:w-auto"
            >
              <Pickaxe className="h-4 w-4" aria-hidden />
              Play the warm-up game
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <p className="text-sm text-gray-600">
              Ready to mine some SDLC wisdom?
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
