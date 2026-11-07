import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  createLearningSession,
  fetchLearningSessions,
  learningSessionListQueryKey,
} from "@/lib/learningSessions";

const courseTopics = {
  softwareEngineering: "software-engineering-fundamentals",
  aiCodingAgents: "ai-coding-agents",
  softwareDevelopmentSoftSkills: "software-development-soft-skills",
} as const;

const requiredCourses = [
  {
    id: courseTopics.softwareEngineering,
    name: "Fundamentals of software engineering and software development",
  },
  {
    id: courseTopics.aiCodingAgents,
    name: "Effective use of AI coding agents in software development",
  },
  {
    id: courseTopics.softwareDevelopmentSoftSkills,
    name: "Soft skills and product skills used in software development",
  },
] as const;

const presentationFormats = {
  textAndImages: "text-and-images",
  interactiveSimulations: "interactive-simulations",
  interactiveRolePlayActivities: "interactive-role-play-activities",
  games: "games",
  animations: "animations",
  slidesBased: "slides-based",
  onlineCoding: "online-coding",
} as const;

const presentationFormat = [
  {
    name: "Text and Images",
    value: presentationFormats.textAndImages,
    enabled: true,
  },
  {
    name: "Interactive Simulations",
    value: presentationFormats.interactiveSimulations,
    enabled: false,
  },
  {
    name: "Interactive Role-Play Activities",
    value: presentationFormats.interactiveRolePlayActivities,
    enabled: false,
  },
  {
    name: "Games",
    value: presentationFormats.games,
    enabled: false,
  },
  {
    name: "Animations",
    value: presentationFormats.animations,
    enabled: false,
  },
  {
    name: "Slides Based",
    value: presentationFormats.slidesBased,
    enabled: false,
  },
  {
    name: "Online Coding",
    value: presentationFormats.onlineCoding,
    enabled: false,
  },
] as const;

const experienceLevels = {
  beginner: "beginner",
  intermediate: "intermediate",
} as const;

const experienceLevel = [
  {
    name: "Beginner",
    value: experienceLevels.beginner,
  },
  {
    name: "Intermediate",
    value: experienceLevels.intermediate,
  },
] as const;

const learningChoicesSchema = z.object({
  course_topic: z.enum(courseTopics),
  presentation_format: z.enum(presentationFormats),
  experience_level: z.enum(experienceLevels),
});

function shouldDisableCreateSession(
  isPending: boolean,
  selectedCourse?: string,
  selectedFormat?: string,
  selectedExperienceLevel?: string,
) {
  return (
    isPending ||
    !selectedCourse ||
    !selectedFormat ||
    !selectedExperienceLevel
  );
}

export const Route = createFileRoute("/learner/")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const sessionsQuery = useQuery({
    queryKey: learningSessionListQueryKey,
    queryFn: ({ signal }) => fetchLearningSessions(signal),
    retry: false,
  });
  const {
    handleSubmit,
    register,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(learningChoicesSchema),
  });
  const selectedCourse = watch("course_topic");
  const selectedFormat = watch("presentation_format");
  const selectedExperienceLevel = watch("experience_level");
  const createSessionMutation = useMutation({
    mutationFn: createLearningSession,
    onSuccess: async (session) => {
      await queryClient.invalidateQueries({
        queryKey: learningSessionListQueryKey,
      });
      await navigate({
        to: "/learner/session/$id",
        params: { id: session.id },
      });
    },
  });

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

        <section
          aria-labelledby="previous-sessions-heading"
          className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="mb-4">
            <h2
              id="previous-sessions-heading"
              className="text-lg font-semibold text-slate-900"
            >
              Your learning sessions
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Pick up where you left off with a previous lesson.
            </p>
          </div>
          {sessionsQuery.isPending ? (
            <p role="status" className="text-sm text-slate-500">
              Loading your sessions...
            </p>
          ) : sessionsQuery.isError ? (
            <p role="alert" className="text-sm text-red-700">
              {sessionsQuery.error.message}
            </p>
          ) : sessionsQuery.data.length === 0 ? (
            <p className="text-sm text-slate-500">
              Your lessons will appear here after you start learning.
            </p>
          ) : (
            <ul className="space-y-3">
              {sessionsQuery.data.map((session) => {
                const courseName =
                  requiredCourses.find(
                    (course) => course.id === session.course_topic,
                  )?.name ?? session.course_topic;
                const formatName =
                  presentationFormat.find(
                    (format) => format.value === session.presentation_format,
                  )?.name ?? session.presentation_format;
                const createdAt = new Date(session.created_at);

                return (
                  <li key={session.id}>
                    <Link
                      to="/learner/session/$id"
                      params={{ id: session.id }}
                      className="block rounded-xl border border-slate-200 p-4 transition hover:border-indigo-300 hover:bg-indigo-50/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                    >
                      <span className="flex flex-wrap items-start justify-between gap-2">
                        <span className="font-medium text-slate-900">
                          {courseName}
                        </span>
                        <span className="text-xs font-medium capitalize text-slate-500">
                          {session.status}
                        </span>
                      </span>
                      <span className="mt-1 block text-sm text-slate-600">
                        {formatName} · {session.experience_level}
                      </span>
                      <time
                        dateTime={session.created_at}
                        className="mt-2 block text-xs text-slate-500"
                      >
                        {createdAt.toLocaleString()}
                      </time>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <form
          onSubmit={handleSubmit((values) => createSessionMutation.mutate(values))}
          className="space-y-4"
        >
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-lg bg-indigo-50 text-sm font-semibold text-indigo-700">
                  01
                </span>
                <h2
                  id="courses-heading"
                  className="text-lg font-semibold text-slate-900"
                >
                  Courses
                </h2>
              </div>
              <span className="text-xs font-medium text-slate-400">
                Choose one
              </span>
            </div>
            <div
              role="radiogroup"
              aria-labelledby="courses-heading"
              aria-describedby={errors.course_topic ? "course-error" : undefined}
              className="grid gap-3 sm:grid-cols-2"
            >
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
                    value={course.id}
                    {...register("course_topic")}
                    className="mt-1 size-4 shrink-0 accent-indigo-600"
                  />
                  {course.name}
                </label>
              ))}
            </div>
            {errors.course_topic && (
              <p id="course-error" className="mt-3 text-sm text-red-700">
                {errors.course_topic.message}
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-lg bg-indigo-50 text-sm font-semibold text-indigo-700">
                  02
                </span>
                <h2
                  id="presentation-heading"
                  className="text-lg font-semibold text-slate-900"
                >
                  Presentation format
                </h2>
              </div>
              <span className="text-xs font-medium text-slate-400">
                Choose one
              </span>
            </div>
            <div
              role="radiogroup"
              aria-labelledby="presentation-heading"
              aria-describedby={
                errors.presentation_format ? "format-error" : undefined
              }
              className="flex flex-wrap gap-2"
            >
              {presentationFormat.map((format) => (
                <label
                  key={format.value}
                  className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition ${
                    !format.enabled
                      ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                      : selectedFormat === format.value
                      ? "border-indigo-500 bg-indigo-50 text-indigo-800 ring-2 ring-indigo-100"
                      : "cursor-pointer border-slate-200 bg-white text-slate-600 hover:border-indigo-200"
                  }`}
                >
                  <input
                    type="radio"
                    value={format.value}
                    {...register("presentation_format")}
                    disabled={!format.enabled}
                    className="size-4 accent-indigo-600"
                  />
                  {format.name}
                  {!format.enabled && (
                    <span className="text-xs">(Coming soon)</span>
                  )}
                </label>
              ))}
            </div>
            {errors.presentation_format && (
              <p id="format-error" className="mt-3 text-sm text-red-700">
                {errors.presentation_format.message}
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-lg bg-indigo-50 text-sm font-semibold text-indigo-700">
                  03
                </span>
                <h2
                  id="experience-heading"
                  className="text-lg font-semibold text-slate-900"
                >
                  Experience level
                </h2>
              </div>
              <span className="text-xs font-medium text-slate-400">
                Choose one
              </span>
            </div>
            <div
              role="radiogroup"
              aria-labelledby="experience-heading"
              aria-describedby={
                errors.experience_level ? "experience-error" : undefined
              }
              className="flex flex-wrap gap-2"
            >
              {experienceLevel.map((level) => (
                <label
                  key={level.value}
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition ${
                    selectedExperienceLevel === level.value
                      ? "border-indigo-500 bg-indigo-50 text-indigo-800 ring-2 ring-indigo-100"
                      : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200"
                  }`}
                >
                  <input
                    type="radio"
                    value={level.value}
                    {...register("experience_level")}
                    className="size-4 accent-indigo-600"
                  />
                  {level.name}
                </label>
              ))}
            </div>
            {errors.experience_level && (
              <p id="experience-error" className="mt-3 text-sm text-red-700">
                {errors.experience_level.message}
              </p>
            )}
          </section>
          <button
            type="submit"
            disabled={shouldDisableCreateSession(
              createSessionMutation.isPending,
              selectedCourse,
              selectedFormat,
              selectedExperienceLevel,
            )}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600 disabled:hover:bg-gray-300"
          >
            {createSessionMutation.isPending
              ? "Generating lesson..."
              : "Start Learning"}{" "}
            {!createSessionMutation.isPending && (
              <span aria-hidden="true">→</span>
            )}
          </button>
          {createSessionMutation.isError && (
            <p role="alert" className="text-sm font-medium text-red-700">
              {createSessionMutation.error.message}
            </p>
          )}

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
        </form>
      </div>
    </main>
  );
}
