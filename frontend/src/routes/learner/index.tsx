import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/learner/')({
  component: RouteComponent,
})

const requiredCourses = [
  {
    id: 1,
    name: "Fundamentals of software engineering and software development",
  },
  {
    id: 2,
    name: "Effective use of AI coding agents in software development",
  },
  {
    id: 3,
    name: "Soft skills and product skills used in software development",
  },
  {
    id: 4,
    name: "Others",
  },
];

const presentationFormat = [
  {
    id: 1,
    name: "Text and Images",
  },
  {
    id: 2,
    name: "Interactive Simulations",
  },
  {
    id: 3,
    name: "Interactive Role-Play Activities",
  },
  {
    id: 4,
    name: "Games",
  },
  {
    id: 5,
    name: "Animations",
  },
  {
    id: 6,
    name: "Slides Based",
  },
  {
    id: 7,
    name: "Online Coding",
  },
];

const experienceLevel = [
  {
    id: 1,
    name: "Non Computer Science Background",
  },
  {
    id: 2,
    name: "Computer Science Background",
  },
];

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

        <header className="mb-8 mt-10">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-indigo-600">Learner</p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Welcome!
          </h1>
          <p className="mt-3 max-w-2xl leading-7 text-slate-600">
            Explore the topics and learning styles that shape your learning path.
          </p>
        </header>

        <div className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-lg bg-indigo-50 text-sm font-semibold text-indigo-700">01</span>
              <h2 className="text-lg font-semibold text-slate-900">Courses</h2>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {requiredCourses.map((course) => (
                <li key={course.id} className="flex gap-3 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                  <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-indigo-500" />
                  {course.name}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-lg bg-indigo-50 text-sm font-semibold text-indigo-700">02</span>
              <h2 className="text-lg font-semibold text-slate-900">Presentation format</h2>
            </div>
            <ul className="flex flex-wrap gap-2">
              {presentationFormat.map((format) => (
                <li key={format.id} className="rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-600">
                  {format.name}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-lg bg-indigo-50 text-sm font-semibold text-indigo-700">03</span>
              <h2 className="text-lg font-semibold text-slate-900">Experience level</h2>
            </div>
            <ul className="flex flex-wrap gap-2">
              {experienceLevel.map((level) => (
                <li key={level.id} className="rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-600">
                  {level.name}
                </li>
              ))}
            </ul>
          </section>

          <section className="flex flex-col gap-4 rounded-2xl bg-indigo-600 p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-7">
            <div>
              <h2 className="text-lg font-semibold">Design my own learning path</h2>
              <p className="mt-1 text-sm text-indigo-100">Make a path that fits the way you want to learn.</p>
            </div>
            <span aria-hidden="true" className="hidden text-2xl text-indigo-200 sm:block">→</span>
          </section>
        </div>
      </div>
    </main>
  )
}
