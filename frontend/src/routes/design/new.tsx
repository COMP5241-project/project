import {
  useEffect,
  useRef,
  useState,
  type SubmitEvent,
  type ChangeEvent,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  FileText,
  GripVertical,
  LoaderCircle,
  Paperclip,
  Plus,
  RotateCcw,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { Group, Panel, Separator } from "react-resizable-panels";

import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import {
  createLearningPath,
  type DesignChatMessage,
  type SourceMaterial,
  sendLearningPathDesignMessage,
} from "@/lib/learningPathDesign";
import { learningSessionListQueryKey } from "@/lib/learningSessions";
import { fetchCurrentProfile } from "@/lib/profile";

const welcomeMessage: DesignChatMessage = {
  role: "assistant",
  content:
    "Hi! I’m your learning designer. Tell me what you want to learn and what you hope to do with it. We’ll shape a practical path together.",
};

const exampleTopics = [
  "Learn Python for data analysis",
  "Prepare for a product manager interview",
  "Understand how AI coding agents work",
];

const MAX_SOURCE_FILES = 5;
const MAX_SOURCE_CHARACTERS = 10000;

export const Route = createFileRoute("/design/new")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const profileQuery = useQuery({
    queryKey: ["profile", "me"],
    queryFn: fetchCurrentProfile,
    retry: false,
  });
  const [messages, setMessages] = useState<DesignChatMessage[]>([
    welcomeMessage,
  ]);
  const [messageDraft, setMessageDraft] = useState("");
  const [learningPromptDraft, setLearningPromptDraft] = useState("");
  const [courseTitle, setCourseTitle] = useState("");
  const [sourceMaterials, setSourceMaterials] = useState<SourceMaterial[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [isCompact, setIsCompact] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const canChat = profileQuery.data !== null && profileQuery.data !== undefined;

  const createMutation = useMutation({
    mutationFn: createLearningPath,
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({
        queryKey: learningSessionListQueryKey,
      });
      await navigate({
        to: "/learner/session/$id",
        params: { id: created.session_id },
      });
    },
    onError: (error) => {
      setCreateError(
        error instanceof Error
          ? error.message
          : "Unable to create your learning path.",
      );
    },
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 640px)");
    const updateCompactMode = () => setIsCompact(mediaQuery.matches);
    updateCompactMode();
    mediaQuery.addEventListener("change", updateCompactMode);
    return () => mediaQuery.removeEventListener("change", updateCompactMode);
  }, []);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  async function requestReply(conversation: DesignChatMessage[]) {
    setIsSending(true);
    setChatError(null);
    try {
      const response = await sendLearningPathDesignMessage(
        conversation.slice(-30),
        sourceMaterials,
      );
      setMessages([
        ...conversation,
        { role: "assistant", content: response.message },
      ]);
      setLearningPromptDraft(response.learning_prompt_draft);
      if (!courseTitle.trim()) {
        const heading = response.learning_prompt_draft.match(/^#\s+(.+)$/m);
        if (heading) setCourseTitle(heading[1].trim());
      }
    } catch (requestError) {
      setChatError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to contact the learning path designer.",
      );
    } finally {
      setIsSending(false);
    }
  }

  function handleChatSubmit(event: SubmitEvent) {
    event.preventDefault();
    const content = messageDraft.trim();
    if (!content || isSending || !canChat) return;

    const conversation = [...messages, { role: "user" as const, content }];
    setMessages(conversation);
    setMessageDraft("");
    void requestReply(conversation);
  }

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    setUploadError(null);
    if (!files.length) return;

    if (sourceMaterials.length + files.length > MAX_SOURCE_FILES) {
      setUploadError(`Add up to ${MAX_SOURCE_FILES} source files.`);
      return;
    }

    const loadedMaterials: SourceMaterial[] = [];
    for (const file of files) {
      const isSupported =
        /\.(txt|md|csv)$/i.test(file.name) ||
        ["text/plain", "text/markdown", "text/csv"].includes(file.type);
      if (!isSupported) {
        setUploadError(`${file.name}: upload a TXT, Markdown, or CSV file.`);
        return;
      }
      if (file.size > MAX_SOURCE_CHARACTERS) {
        setUploadError(
          `${file.name} is too large. Keep each file under 10 KB.`,
        );
        return;
      }
      try {
        loadedMaterials.push({ name: file.name, content: await file.text() });
      } catch {
        setUploadError(`Unable to read ${file.name}. Please try another file.`);
        return;
      }
    }

    const totalCharacters =
      sourceMaterials.reduce(
        (total, material) => total + material.content.length,
        0,
      ) +
      loadedMaterials.reduce(
        (total, material) => total + material.content.length,
        0,
      );
    if (totalCharacters > 50000) {
      setUploadError("Source materials must total 50,000 characters or less.");
      return;
    }
    setSourceMaterials((current) => [...current, ...loadedMaterials]);
  }

  function removeSourceMaterial(indexToRemove: number) {
    setSourceMaterials((current) =>
      current.filter((_, index) => index !== indexToRemove),
    );
  }

  function startOver() {
    if (isSending || createMutation.isPending) return;
    setMessages([welcomeMessage]);
    setMessageDraft("");
    setLearningPromptDraft("");
    setCourseTitle("");
    setSourceMaterials([]);
    setUploadError(null);
    setChatError(null);
    setCreateError(null);
  }

  function handleCreate(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = courseTitle.trim();
    const prompt = learningPromptDraft.trim();
    if (!title || !prompt || createMutation.isPending) return;
    setCreateError(null);
    createMutation.mutate({ title, learning_prompt: prompt });
  }

  const canRetry =
    chatError !== null && messages.at(-1)?.role === "user" && canChat;

  return (
    <main className="flex min-h-screen flex-col bg-[#f7f8fb] px-3 py-3 text-slate-900 sm:px-5 sm:py-4">
      <header className="mb-3 flex shrink-0 items-center justify-between gap-3 px-1">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            to="/learner"
            aria-label="Back to learning"
            className="grid size-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:text-indigo-700"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
          </Link>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight text-slate-950">
              Learning path studio
            </p>
            <p className="hidden text-xs text-slate-500 sm:block">
              Create a plan that fits the way you want to learn
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={startOver}
          disabled={isSending || createMutation.isPending}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-500 transition hover:bg-white hover:text-slate-900 disabled:opacity-50"
        >
          <RotateCcw aria-hidden="true" className="size-3.5" />
          Start over
        </button>
      </header>

      <Group
        orientation={isCompact ? "vertical" : "horizontal"}
        className={`min-h-0 flex-1 ${isCompact ? "min-h-[1500px]" : "h-[calc(100dvh-5rem)]"}`}
        id="learning-path-workspace"
      >
        <Panel
          defaultSize={isCompact ? "33%" : "25%"}
          minSize={isCompact ? "25%" : "18%"}
          className="min-h-0"
          id="sources"
        >
          <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Workspace
              </p>
              <h1 className="mt-1 text-base font-semibold text-slate-950">
                Your materials
              </h1>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Add notes or references to ground your learning plan.
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xs font-semibold text-slate-700">
                  Source files
                </h2>
                <span className="text-[11px] text-slate-400">
                  {sourceMaterials.length}/{MAX_SOURCE_FILES}
                </span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.csv,text/plain,text/markdown,text/csv"
                multiple
                className="sr-only"
                aria-label="Upload source materials"
                onChange={(event) => void handleUpload(event)}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={sourceMaterials.length >= MAX_SOURCE_FILES}
                className="flex w-full flex-col items-center rounded-xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-6 text-center transition hover:border-indigo-300 hover:bg-indigo-50/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="mb-2 grid size-9 place-items-center rounded-lg bg-white text-indigo-600 shadow-sm">
                  <Paperclip aria-hidden="true" className="size-4" />
                </span>
                <span className="text-xs font-semibold text-slate-700">
                  Add source materials
                </span>
                <span className="mt-1 text-[11px] text-slate-400">
                  TXT, Markdown, or CSV · up to 10 KB each
                </span>
              </button>
              {uploadError && (
                <p role="alert" className="mt-2 text-xs leading-5 text-red-700">
                  {uploadError}
                </p>
              )}

              {sourceMaterials.length > 0 ? (
                <ul className="mt-3 space-y-2" aria-label="Uploaded materials">
                  {sourceMaterials.map((material, index) => (
                    <li
                      key={`${material.name}-${index}`}
                      className="flex items-center gap-2 rounded-lg border border-slate-100 px-2.5 py-2"
                    >
                      <FileText
                        aria-hidden="true"
                        className="size-4 shrink-0 text-indigo-500"
                      />
                      <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700">
                        {material.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeSourceMaterial(index)}
                        aria-label={`Remove ${material.name}`}
                        className="grid size-6 shrink-0 place-items-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <X aria-hidden="true" className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2.5 text-xs leading-5 text-slate-500">
                  Your files stay in this workspace and are shared with the
                  designer when you send a message.
                </p>
              )}

              <div className="mt-7 border-t border-slate-100 pt-4">
                <h2 className="text-xs font-semibold text-slate-700">
                  A good place to start
                </h2>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Share a subject, a goal, and anything you already know. You
                  can refine the plan as it takes shape.
                </p>
              </div>
            </div>

            <div className="border-t border-slate-100 px-4 py-3">
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                {sourceMaterials.length
                  ? `${sourceMaterials.length} source${sourceMaterials.length === 1 ? "" : "s"} ready`
                  : "No sources added yet"}
              </div>
            </div>
          </aside>
        </Panel>

        <Separator
          aria-label="Resize materials and conversation panels"
          className={`group relative z-10 flex shrink-0 items-center justify-center bg-transparent outline-none after:absolute after:rounded-full after:bg-slate-200 after:transition-colors hover:after:bg-indigo-300 focus-visible:after:bg-indigo-500 data-[separator]:cursor-col-resize ${isCompact ? "h-3 w-full cursor-row-resize after:h-px after:w-10" : "w-3 cursor-col-resize after:h-10 after:w-px"}`}
        >
          <GripVertical
            aria-hidden="true"
            className={`size-3 text-slate-300 group-hover:text-indigo-400 ${isCompact ? "rotate-90" : ""}`}
          />
        </Separator>

        <Panel
          defaultSize={isCompact ? "34%" : "44%"}
          minSize={isCompact ? "25%" : "30%"}
          className="min-h-0"
          id="conversation"
        >
          <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Sparkles aria-hidden="true" className="size-4" />
                </span>
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold text-slate-900">
                    Learning designer
                  </h2>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Shape the plan through conversation
                  </p>
                </div>
              </div>
              <span className="hidden shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-medium text-emerald-700 sm:inline-flex">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                Ready
              </span>
            </div>

            <div
              aria-live="polite"
              aria-label="Conversation"
              className="min-h-0 flex-1 space-y-5 overflow-y-auto bg-[#fafbfe] px-4 py-5 sm:px-5"
            >
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {message.role === "assistant" && (
                    <span className="mr-2 mt-1 grid size-6 shrink-0 place-items-center rounded-lg bg-indigo-100 text-indigo-700">
                      <Sparkles aria-hidden="true" className="size-3" />
                    </span>
                  )}
                  <article
                    className={`max-w-[88%] rounded-2xl px-3.5 py-3 ${
                      message.role === "user"
                        ? "rounded-br-md bg-indigo-600 text-white"
                        : "rounded-bl-md border border-slate-200 bg-white text-slate-800 shadow-sm"
                    }`}
                  >
                    {message.role === "assistant" ? (
                      <MarkdownRenderer
                        content={message.content}
                        className="text-[13px] [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm [&_p]:leading-6 [&_p]:text-slate-700 [&_strong]:text-slate-900 [&_ul]:space-y-1"
                      />
                    ) : (
                      <p className="whitespace-pre-wrap text-[13px] leading-6">
                        {message.content}
                      </p>
                    )}
                    {index === 0 && messages.length === 1 && canChat && (
                      <div className="mt-4 flex flex-col items-start gap-2">
                        {exampleTopics.map((topic) => (
                          <button
                            key={topic}
                            type="button"
                            onClick={() => setMessageDraft(topic)}
                            className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-left text-[11px] font-medium text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100"
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
                <div role="status" className="flex items-center gap-2 pl-8">
                  <LoaderCircle
                    aria-hidden="true"
                    className="size-3.5 animate-spin text-indigo-500"
                  />
                  <span className="text-xs text-slate-500">
                    Updating your learning path…
                  </span>
                </div>
              )}
              {chatError && (
                <div
                  role="alert"
                  className="ml-8 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-800"
                >
                  <p>{chatError}</p>
                  {canRetry && (
                    <button
                      type="button"
                      onClick={() => void requestReply(messages)}
                      className="mt-1 font-semibold underline underline-offset-2"
                    >
                      Try again
                    </button>
                  )}
                </div>
              )}
              <div ref={endOfMessagesRef} />
            </div>

            <div className="shrink-0 border-t border-slate-100 bg-white p-3 sm:p-4">
              {profileQuery.isPending ? (
                <p role="status" className="text-xs text-slate-500">
                  Checking your sign-in…
                </p>
              ) : profileQuery.isError ? (
                <p role="alert" className="text-xs text-red-700">
                  Unable to check your sign-in. Please refresh to try again.
                </p>
              ) : !canChat ? (
                <p className="text-xs text-slate-600">
                  <Link
                    to="/login"
                    className="font-semibold text-indigo-700 hover:text-indigo-800"
                  >
                    Log in
                  </Link>{" "}
                  to chat with the learning designer.
                </p>
              ) : (
                <form
                  onSubmit={(ev) => {
                    handleChatSubmit(ev);
                  }}
                >
                  <label htmlFor="design-message" className="sr-only">
                    Message the learning designer
                  </label>
                  <div className="flex items-end gap-2 rounded-xl border border-slate-200 bg-white p-2 transition focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100">
                    <textarea
                      id="design-message"
                      value={messageDraft}
                      onChange={(event) => setMessageDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          event.currentTarget.form?.requestSubmit();
                        }
                      }}
                      maxLength={4000}
                      rows={2}
                      placeholder="Tell me what you want to learn…"
                      disabled={isSending}
                      className="max-h-32 min-h-11 flex-1 resize-y bg-transparent px-2 py-1.5 text-xs leading-5 text-slate-900 outline-none placeholder:text-slate-400 disabled:opacity-60"
                    />
                    <button
                      type="submit"
                      disabled={!messageDraft.trim() || isSending}
                      aria-label="Send message"
                      className="grid size-9 shrink-0 place-items-center rounded-lg bg-indigo-600 text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                    >
                      <Send aria-hidden="true" className="size-3.5" />
                    </button>
                  </div>
                  <p className="mt-2 px-1 text-[10px] text-slate-400">
                    Enter to send · Shift + Enter for a new line
                  </p>
                </form>
              )}
            </div>
          </section>
        </Panel>

        <Separator
          aria-label="Resize conversation and learning plan panels"
          className={`group relative z-10 flex shrink-0 items-center justify-center bg-transparent outline-none after:absolute after:rounded-full after:bg-slate-200 after:transition-colors hover:after:bg-indigo-300 focus-visible:after:bg-indigo-500 ${isCompact ? "h-3 w-full cursor-row-resize after:h-px after:w-10" : "w-3 cursor-col-resize after:h-10 after:w-px"}`}
        >
          <GripVertical
            aria-hidden="true"
            className={`size-3 text-slate-300 group-hover:text-indigo-400 ${isCompact ? "rotate-90" : ""}`}
          />
        </Separator>

        <Panel
          defaultSize={isCompact ? "33%" : "31%"}
          minSize={isCompact ? "25%" : "23%"}
          className="min-h-0"
          id="learning-plan"
        >
          <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-4 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="grid size-7 place-items-center rounded-lg bg-amber-50 text-amber-700">
                    <FileText aria-hidden="true" className="size-3.5" />
                  </span>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Live draft
                  </p>
                </div>
                <h2 className="mt-2 text-base font-semibold text-slate-950">
                  Learning plan
                </h2>
              </div>
              {learningPromptDraft && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700">
                  <Check aria-hidden="true" className="size-3" />
                  Updated
                </span>
              )}
            </div>

            <form
              onSubmit={handleCreate}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
                <label
                  htmlFor="course-title"
                  className="block text-[11px] font-semibold text-slate-600"
                >
                  Course name
                </label>
                <input
                  id="course-title"
                  value={courseTitle}
                  onChange={(event) => setCourseTitle(event.target.value)}
                  maxLength={200}
                  placeholder="Your learning path"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="learning-prompt"
                    className="text-[11px] font-semibold text-slate-600"
                  >
                    Prompt and plan
                  </label>
                  <span className="text-[10px] text-slate-400">
                    Editable Markdown
                  </span>
                </div>
                <textarea
                  id="learning-prompt"
                  value={learningPromptDraft}
                  onChange={(event) =>
                    setLearningPromptDraft(event.target.value)
                  }
                  maxLength={50000}
                  placeholder="Your learning path will take shape here as you chat with the designer."
                  className="min-h-64 w-full flex-1 resize-y rounded-lg border border-slate-200 bg-[#fcfcfd] px-3 py-3 font-mono text-[11px] leading-5 text-slate-700 outline-none transition placeholder:font-sans placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
                <p className="text-[10px] leading-4 text-slate-400">
                  Review and edit the plan before creating your course.
                </p>
              </div>

              <div className="shrink-0 border-t border-slate-100 bg-white p-4">
                {createError && (
                  <p
                    role="alert"
                    className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700"
                  >
                    {createError}
                  </p>
                )}
                {profileQuery.data === null ? (
                  <Link
                    to="/login"
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-indigo-700"
                  >
                    Log in to create
                  </Link>
                ) : (
                  <button
                    type="submit"
                    disabled={
                      !canChat ||
                      !courseTitle.trim() ||
                      !learningPromptDraft.trim() ||
                      createMutation.isPending
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                  >
                    {createMutation.isPending ? (
                      <LoaderCircle
                        aria-hidden="true"
                        className="size-3.5 animate-spin"
                      />
                    ) : (
                      <Plus aria-hidden="true" className="size-3.5" />
                    )}
                    {createMutation.isPending
                      ? "Creating your course…"
                      : "Create course & session"}
                  </button>
                )}
                <p className="mt-2 text-center text-[10px] text-slate-400">
                  {profileQuery.data === null
                    ? "Sign in to save your learning path"
                    : "Creates a course, prompt, and learning session"}
                </p>
              </div>
            </form>
          </aside>
        </Panel>
      </Group>
    </main>
  );
}
