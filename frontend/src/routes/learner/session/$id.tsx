import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import {
  fetchLearningSession,
  type LearningSession,
} from "@/lib/learningSessions";

export const Route = createFileRoute("/learner/session/$id")({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  const [result, setResult] = useState<
    | { id: string; session: LearningSession }
    | { id: string; error: string }
    | null
  >(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchLearningSession(id, controller.signal)
      .then((session) => setResult({ id, session }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setResult({
            id,
            error:
              error instanceof Error
                ? error.message
                : "Unable to load this lesson.",
          });
        }
      });
    return () => controller.abort();
  }, [id]);

  const currentResult = result?.id === id ? result : null;

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8 text-slate-900 sm:px-8 sm:py-12">
      <article className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <Link
          to="/learner"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-indigo-700"
        >
          <span aria-hidden="true">←</span> Back to learning choices
        </Link>
        {currentResult && "error" in currentResult ? (
          <p role="alert" className="mt-6 text-red-700">
            {currentResult.error}
          </p>
        ) : currentResult ? (
          currentResult.session.status === "ready" &&
          currentResult.session.content ? (
            <MarkdownRenderer
              content={currentResult.session.content}
              className="mt-8"
            />
          ) : (
            <p role="status" className="mt-6 text-slate-600">
              This lesson is not ready yet.
            </p>
          )
        ) : (
          <p role="status" className="mt-6 text-slate-600">
            Loading your lesson...
          </p>
        )}
      </article>
    </main>
  );
}
