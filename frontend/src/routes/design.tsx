import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, RotateCcw, Send, Sparkles } from "lucide-react";

import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import {
  type DesignChatMessage,
  sendLearningPathDesignMessage,
} from "@/lib/learningPathDesign";
import { fetchCurrentProfile } from "@/lib/profile";

const welcomeMessage: DesignChatMessage = {
  role: "assistant",
  content:
    "Hi! I can help you shape a learning path around your interests and goals. **What would you like to learn, and what would you like to be able to do?**",
};

const exampleTopics = [
  "Learn Python for data analysis",
  "Prepare for a product manager interview",
  "Understand how AI coding agents work",
];

export const Route = createFileRoute("/design")({
  component: RouteComponent,
});

function RouteComponent() {
  const profileQuery = useQuery({
    queryKey: ["profile", "me"],
    queryFn: fetchCurrentProfile,
    retry: false,
  });
  const [messages, setMessages] = useState<DesignChatMessage[]>([
    welcomeMessage,
  ]);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  async function requestReply(conversation: DesignChatMessage[]) {
    setIsSending(true);
    setError(null);
    try {
      const response = await sendLearningPathDesignMessage(conversation.slice(-30));
      setMessages([
        ...conversation,
        { role: "assistant", content: response.message },
      ]);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to contact the learning path designer.",
      );
    } finally {
      setIsSending(false);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || isSending || !profileQuery.data) return;

    const conversation = [...messages, { role: "user" as const, content }];
    setMessages(conversation);
    setDraft("");
    void requestReply(conversation);
  }

  function startOver() {
    setMessages([welcomeMessage]);
    setDraft("");
    setError(null);
  }

  const latestMessage = messages.at(-1);
  const canRetry =
    error !== null && latestMessage?.role === "user" && profileQuery.data;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-8 sm:py-10">
      <div className="mx-auto flex h-[calc(100dvh-3rem)] min-h-[32rem] max-w-5xl flex-col sm:h-[calc(100dvh-5rem)] sm:min-h-[36rem]">
        <header className="mb-6 flex items-center justify-between gap-4">
          <Link
            to="/learner"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-indigo-700"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to learning
          </Link>
          <button
            type="button"
            onClick={startOver}
            disabled={isSending}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-indigo-700 disabled:cursor-wait disabled:opacity-50"
          >
            <RotateCcw aria-hidden="true" className="size-4" />
            Start over
          </button>
        </header>

        <section className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-5 sm:px-8">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-indigo-50 text-indigo-700">
                <Sparkles aria-hidden="true" className="size-5" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">
                  Learning path designer
                </p>
                <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
                  Let’s design your learning path
                </h1>
              </div>
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Tell the AI what you want to learn. Refine the goal and path
              together, one conversation at a time.
            </p>
          </div>

          <div
            aria-live="polite"
            aria-label="Conversation"
            className="min-h-0 flex-1 space-y-5 overflow-y-auto bg-slate-50/70 px-4 py-6 sm:px-8"
          >
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <article
                  className={`max-w-[90%] rounded-2xl px-4 py-3 sm:max-w-[80%] ${
                    message.role === "user"
                      ? "rounded-br-md bg-indigo-600 text-white"
                      : "rounded-bl-md border border-slate-200 bg-white text-slate-800 shadow-sm"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <MarkdownRenderer
                      content={message.content}
                      className="text-sm [&_h1]:text-xl [&_h2]:text-lg [&_h3]:text-base [&_p]:leading-6 [&_p]:text-slate-700 [&_strong]:text-slate-900 [&_ul]:space-y-1"
                    />
                  ) : (
                    <p className="whitespace-pre-wrap text-sm leading-6">
                      {message.content}
                    </p>
                  )}
                  {index === 0 && messages.length === 1 && profileQuery.data && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {exampleTopics.map((topic) => (
                        <button
                          key={topic}
                          type="button"
                          onClick={() => setDraft(topic)}
                          className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-left text-xs font-medium text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100"
                        >
                          {topic}
                        </button>
                      ))}
                    </div>
                  )}
                </article>
              </div>
            ))}

            {isSending && (
              <div role="status" className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
                  Thinking through your learning path…
                </div>
              </div>
            )}
            {error && (
              <div
                role="alert"
                className="mx-auto flex max-w-xl flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
              >
                <span>{error}</span>
                {canRetry && (
                  <button
                    type="button"
                    onClick={() => void requestReply(messages)}
                    disabled={isSending}
                    className="font-semibold underline underline-offset-2"
                  >
                    Try again
                  </button>
                )}
              </div>
            )}
            <div ref={endOfMessagesRef} />
          </div>

          <div className="border-t border-slate-200 bg-white p-4 sm:px-8 sm:py-5">
            {profileQuery.isPending ? (
              <p role="status" className="text-sm text-slate-500">
                Checking your sign-in…
              </p>
            ) : profileQuery.isError ? (
              <p role="alert" className="text-sm text-red-700">
                Unable to check your sign-in. Please refresh to try again.
              </p>
            ) : profileQuery.data === null ? (
              <p className="text-sm text-slate-600">
                <Link
                  to="/login"
                  className="font-semibold text-indigo-700 hover:text-indigo-800"
                >
                  Log in
                </Link>{" "}
                to chat with the learning path designer.
              </p>
            ) : (
              <form onSubmit={handleSubmit}>
                <label htmlFor="design-message" className="sr-only">
                  Your message
                </label>
                <div className="flex items-end gap-3 rounded-2xl border border-slate-300 bg-white p-2 transition focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100">
                  <textarea
                    id="design-message"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        event.currentTarget.form?.requestSubmit();
                      }
                    }}
                    maxLength={4000}
                    rows={2}
                    placeholder="Share a topic, goal, or change you’d like to make…"
                    disabled={isSending}
                    className="max-h-40 min-h-12 flex-1 resize-y bg-transparent px-2 py-2 text-sm leading-6 text-slate-900 outline-none placeholder:text-slate-400 disabled:opacity-60"
                  />
                  <button
                    type="submit"
                    disabled={!draft.trim() || isSending}
                    aria-label="Send message"
                    className="grid size-10 shrink-0 place-items-center rounded-xl bg-indigo-600 text-white transition hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                  >
                    <Send aria-hidden="true" className="size-4" />
                  </button>
                </div>
                <p className="mt-2 px-1 text-xs text-slate-400">
                  Enter to send · Shift + Enter for a new line
                </p>
              </form>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
