import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { fetchLearningSession } from "@/lib/learningSessions";

export const Route = createFileRoute("/learner/session/$id")({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  const sessionQuery = useQuery({
    queryKey: ["learning-session", id],
    queryFn: ({ signal }) => fetchLearningSession(id, signal),
    retry: false,
  });

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8 text-slate-900 sm:px-8 sm:py-12">
      <article className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <Link
          to="/learner"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-indigo-700"
        >
          <span aria-hidden="true">←</span> Back to learning choices
        </Link>
        {sessionQuery.isError ? (
          <p role="alert" className="mt-6 text-red-700">
            {sessionQuery.error.message}
          </p>
        ) : sessionQuery.data ? (
          sessionQuery.data.status === "ready" &&
          sessionQuery.data.content ? (
            <MarkdownRenderer
              content={sessionQuery.data.content}
              className="mt-8"
            />
          ) : (
            <p role="status" className="mt-6 text-slate-600">
              This lesson is not ready yet.
            </p>
          )
        ) : (
          <p role="status" className="mt-6 text-slate-600">
            {sessionQuery.isPending
              ? "Loading your lesson..."
              : "This lesson is unavailable."}
          </p>
        )}
      </article>
    </main>
  );
}
