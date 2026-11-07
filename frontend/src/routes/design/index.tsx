import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import {
  createdCourseListQueryKey,
  fetchMyCourses,
  toggleCourseStatus,
  type CreatedCourse,
} from "@/lib/courses";

export const Route = createFileRoute("/design/")({
  component: RouteComponent,
});

function RouteComponent() {
  const queryClient = useQueryClient();
  const coursesQuery = useQuery({
    queryKey: createdCourseListQueryKey,
    queryFn: ({ signal }) => fetchMyCourses(signal),
    retry: false,
  });
  const statusMutation = useMutation({
    mutationFn: toggleCourseStatus,
    onSuccess: (updatedCourse) => {
      queryClient.setQueryData(
        createdCourseListQueryKey,
        (courses: CreatedCourse[] | undefined) =>
          courses?.map((course) =>
            course.id === updatedCourse.id ? updatedCourse : course,
          ),
      );
    },
  });

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8 text-slate-900 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-indigo-700"
        >
          <span aria-hidden="true">←</span> Back to home
        </Link>

        <header className="mb-8 mt-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-indigo-600">
              Learning designer
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Your courses
            </h1>
            <p className="mt-3 max-w-2xl leading-7 text-slate-600">
              View the courses you have created.
            </p>
          </div>
          <Link
            to="/design/new"
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Create a course
          </Link>
        </header>

        <section
          aria-label="Courses created by you"
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          {statusMutation.isError && (
            <p
              role="alert"
              className="border-b border-red-100 bg-red-50 p-4 text-sm text-red-700"
            >
              {statusMutation.error.message}
            </p>
          )}
          {coursesQuery.isPending ? (
            <p role="status" className="p-6 text-sm text-slate-500">
              Loading your courses...
            </p>
          ) : coursesQuery.isError ? (
            <p role="alert" className="p-6 text-sm text-red-700">
              {coursesQuery.error.message}
            </p>
          ) : coursesQuery.data.length === 0 ? (
            <div className="p-6">
              <p className="font-medium text-slate-900">
                You haven’t created any courses yet.
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Create a course to see it listed here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] table-fixed text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th scope="col" className="w-[18%] px-5 py-4 font-semibold">
                      Title
                    </th>
                    <th scope="col" className="w-[28%] px-5 py-4 font-semibold">
                      Description
                    </th>
                    <th scope="col" className="w-[12%] px-5 py-4 font-semibold">
                      Status
                    </th>
                    <th scope="col" className="w-[21%] px-5 py-4 font-semibold">
                      Created at
                    </th>
                    <th scope="col" className="w-[21%] px-5 py-4 font-semibold">
                      Updated at
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {coursesQuery.data.map((course) => (
                    <tr key={course.id} className="align-top">
                      <td className="break-words px-5 py-4 font-medium text-slate-900">
                        {course.title}
                      </td>
                      <td className="break-words px-5 py-4 leading-6 text-slate-600">
                        {course.description || "—"}
                      </td>
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          disabled={statusMutation.isPending}
                          aria-label={`Change status from ${course.status} to ${course.status === "draft" ? "published" : "draft"}`}
                          onClick={() => statusMutation.mutate(course.id)}
                          className={`inline-flex cursor-pointer rounded-full px-2.5 py-1 text-xs font-medium transition hover:ring-2 hover:ring-offset-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-wait disabled:opacity-60 ${
                            course.status === "published"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {course.status}
                        </button>
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        <time dateTime={course.created_at}>
                          {new Date(course.created_at).toLocaleString()}
                        </time>
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        <time dateTime={course.updated_at}>
                          {new Date(course.updated_at).toLocaleString()}
                        </time>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
