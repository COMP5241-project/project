import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/learner/")({
  component: RouteComponent,
});

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
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<number | null>(null);
  const [selectedExperienceLevel, setSelectedExperienceLevel] = useState<
    number | null
  >(null);
  const canStartLearning =
    selectedCourse !== null &&
    selectedFormat !== null &&
    selectedExperienceLevel !== null;

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
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-indigo-600">
            Learner
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Welcome!
          </h1>
          <p className="mt-3 max-w-2xl leading-7 text-slate-600">
            Explore the topics and learning styles that shape your learning
            path.
          </p>
        </header>

        <div className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-lg bg-indigo-50 text-sm font-semibold text-indigo-700">
                  01
                </span>
                <h2 id="courses-heading" className="text-lg font-semibold text-slate-900">Courses</h2>
              </div>
              <span className="text-xs font-medium text-slate-400">Choose one</span>
            </div>
            <div role="radiogroup" aria-labelledby="courses-heading" className="grid gap-3 sm:grid-cols-2">
              {requiredCourses.map((course) => (
                <label
                  key={course.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-sm leading-6 transition ${
                    selectedCourse === course.id
                      ? "border-indigo-500 bg-indigo-50/70 text-slate-800 ring-2 ring-indigo-100"
                      : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200"
                  }`}
                >
                  <input
                    type="radio"
                    name="course"
                    value={course.id}
                    checked={selectedCourse === course.id}
                    onChange={() => {
                      setSelectedCourse(course.id);
                    }}
                    className="mt-1 size-4 shrink-0 accent-indigo-600"
                  />
                  {course.name}
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-lg bg-indigo-50 text-sm font-semibold text-indigo-700">
                  02
                </span>
                <h2 id="presentation-heading" className="text-lg font-semibold text-slate-900">
                  Presentation format
                </h2>
              </div>
              <span className="text-xs font-medium text-slate-400">Choose one</span>
            </div>
            <div role="radiogroup" aria-labelledby="presentation-heading" className="flex flex-wrap gap-2">
              {presentationFormat.map((format) => (
                <label
                  key={format.id}
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition ${
                    selectedFormat === format.id
                      ? "border-indigo-500 bg-indigo-50 text-indigo-800 ring-2 ring-indigo-100"
                      : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200"
                  }`}
                >
                  <input
                    type="radio"
                    name="presentation-format"
                    value={format.id}
                    checked={selectedFormat === format.id}
                    onChange={() => {
                      setSelectedFormat(format.id);
                    }}
                    className="size-4 accent-indigo-600"
                  />
                  {format.name}
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-lg bg-indigo-50 text-sm font-semibold text-indigo-700">
                  03
                </span>
                <h2 id="experience-heading" className="text-lg font-semibold text-slate-900">
                  Experience level
                </h2>
              </div>
              <span className="text-xs font-medium text-slate-400">Choose one</span>
            </div>
            <div role="radiogroup" aria-labelledby="experience-heading" className="flex flex-wrap gap-2">
              {experienceLevel.map((level) => (
                <label
                  key={level.id}
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition ${
                    selectedExperienceLevel === level.id
                      ? "border-indigo-500 bg-indigo-50 text-indigo-800 ring-2 ring-indigo-100"
                      : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200"
                  }`}
                >
                  <input
                    type="radio"
                    name="experience-level"
                    value={level.id}
                    checked={selectedExperienceLevel === level.id}
                    onChange={() => {
                      setSelectedExperienceLevel(level.id);
                    }}
                    className="size-4 accent-indigo-600"
                  />
                  {level.name}
                </label>
              ))}
            </div>
          </section>
          <button
            type="button"
            disabled={!canStartLearning}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:bg-indigo-400 disabled:text-indigo-100 disabled:hover:bg-indigo-400"
          >
            Start Learning <span aria-hidden="true">→</span>
          </button>

          <button
            type="button"
            className="group flex w-full items-center justify-between rounded-2xl border border-indigo-200 bg-white p-6 text-left transition hover:border-indigo-400 hover:bg-indigo-50/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 sm:p-7"
          >
            <span>
              <span className="block text-lg font-semibold text-slate-900">
                Design my own learning path
              </span>
              <span className="mt-1 block text-sm text-slate-600">
                Make a path that fits the way you want to learn.
              </span>
            </span>
            <span
              aria-hidden="true"
              className="ml-4 text-2xl text-indigo-500 transition group-hover:translate-x-1"
            >
              →
            </span>
          </button>
        </div>
      </div>
    </main>
  );
}
