import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import {
  Autoformat,
  BlockQuote,
  Bold,
  ClassicEditor,
  Essentials,
  Heading,
  Italic,
  Link as LinkPlugin,
  List,
  Markdown,
  Paragraph,
  type EditorConfig,
} from "ckeditor5";
import {
  ArrowLeft,
  Check,
  FileText,
  GripVertical,
  LoaderCircle,
  Save,
  Send,
  Sparkles,
} from "lucide-react";
import { Group, Panel, Separator } from "react-resizable-panels";

import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import {
  createdCourseListQueryKey,
  fetchMyCourse,
  updateMyCourse,
  type CourseDetail,
  type CreatedCourse,
} from "@/lib/courses";
import {
  sendLearningPathDesignMessage,
  type DesignChatMessage,
  type SourceMaterial,
} from "@/lib/learningPathDesign";

const welcomeMessage: DesignChatMessage = {
  role: "assistant",
  content:
    "I can help refine this learning plan. Tell me what you'd like to change, add, or focus on, and I'll update the draft for you.",
};

const MAX_LEARNING_PROMPT_LENGTH = 50000;

const courseEditSchema = z.object({
  title: z
    .string()
    .max(200, "Course title must be 200 characters or fewer.")
    .refine((value) => value.trim().length > 0, "Enter a course title."),
  description: z
    .string()
    .max(2000, "Description must be 2,000 characters or fewer."),
  learning_prompt: z
    .string()
    .max(
      MAX_LEARNING_PROMPT_LENGTH,
      `Learning plan must be ${MAX_LEARNING_PROMPT_LENGTH.toLocaleString()} characters or fewer.`,
    )
    .refine((value) => value.trim().length > 0, "Learning plan cannot be empty."),
});

type CourseEditValues = z.infer<typeof courseEditSchema>;

const editorConfig: EditorConfig = {
  licenseKey: "GPL",
  plugins: [
    Autoformat,
    Essentials,
    Paragraph,
    Heading,
    Bold,
    Italic,
    LinkPlugin,
    List,
    BlockQuote,
    Markdown,
  ],
  heading: {
    options: [
      {
        model: "paragraph",
        title: "Paragraph",
        class: "ck-heading_paragraph",
      },
      {
        model: "heading1",
        view: "h1",
        title: "Heading 1",
        class: "ck-heading_heading1",
      },
      {
        model: "heading2",
        view: "h2",
        title: "Heading 2",
        class: "ck-heading_heading2",
      },
      {
        model: "heading3",
        view: "h3",
        title: "Heading 3",
        class: "ck-heading_heading3",
      },
    ],
  },
  toolbar: [
    "heading",
    "|",
    "bold",
    "italic",
    "link",
    "bulletedList",
    "numberedList",
    "blockQuote",
    "|",
    "undo",
    "redo",
  ],
};

export const Route = createFileRoute("/design/$courseId")({
  component: RouteComponent,
});

function RouteComponent() {
  const { courseId } = Route.useParams();
  const queryClient = useQueryClient();
  const courseQuery = useQuery({
    queryKey: [...createdCourseListQueryKey, courseId],
    queryFn: ({ signal }) => fetchMyCourse(courseId, signal),
    retry: false,
  });

  return (
    <main className="flex min-h-screen flex-col bg-[#f7f8fb] px-3 py-3 text-slate-900 sm:px-5 sm:py-4">
      <header className="mb-3 flex shrink-0 items-center gap-3 px-1">
        <Link
          to="/design"
          aria-label="Back to your courses"
          className="grid size-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:text-indigo-700"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
        </Link>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-tight text-slate-950">
            Edit course
          </p>
          <p className="hidden text-xs text-slate-500 sm:block">
            Update your course details and learning plan
          </p>
        </div>
      </header>

      {courseQuery.isPending ? (
        <p
          role="status"
          className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500"
        >
          Loading course...
        </p>
      ) : courseQuery.isError ? (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700"
        >
          {courseQuery.error.message}
        </p>
      ) : (
        <CourseEditor
          key={courseId}
          course={courseQuery.data}
          onSave={(updatedCourse) => {
            queryClient.setQueryData(
              [...createdCourseListQueryKey, courseId],
              updatedCourse,
            );
            queryClient.setQueryData(
              createdCourseListQueryKey,
              (courses: CreatedCourse[] | undefined) =>
                courses?.map((item) =>
                  item.id === updatedCourse.id
                    ? {
                        ...item,
                        title: updatedCourse.title,
                        description: updatedCourse.description,
                        status: updatedCourse.status,
                        created_at: updatedCourse.created_at,
                        updated_at: updatedCourse.updated_at,
                      }
                    : item,
                ),
            );
            void queryClient.invalidateQueries({
              queryKey: createdCourseListQueryKey,
            });
          }}
        />
      )}
    </main>
  );
}

function CourseEditor({
  course,
  onSave,
}: {
  course: CourseDetail;
  onSave: (course: CourseDetail) => void;
}) {
  const { courseId } = Route.useParams();
  const [isCompact, setIsCompact] = useState(false);
  const [planEditorRevision, setPlanEditorRevision] = useState(0);
  const [saveMessage, setSaveMessage] = useState("");
  const [messages, setMessages] = useState<DesignChatMessage[]>([
    welcomeMessage,
  ]);
  const [messageDraft, setMessageDraft] = useState("");
  const [chatError, setChatError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [planView, setPlanView] = useState<"edit" | "preview">("edit");
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const {
    control,
    register,
    setValue,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<CourseEditValues>({
    resolver: zodResolver(courseEditSchema),
    defaultValues: {
      title: course.title,
      description: course.description ?? "",
      learning_prompt: course.learning_prompt,
    },
  });
  const title = useWatch({ control, name: "title" });
  const learningPrompt = useWatch({ control, name: "learning_prompt" });
  const saveMutation = useMutation({
    mutationFn: updateMyCourse,
    onSuccess: (updatedCourse) => {
      onSave(updatedCourse);
      reset({
        title: updatedCourse.title,
        description: updatedCourse.description ?? "",
        learning_prompt: updatedCourse.learning_prompt,
      });
      setSaveMessage("Course saved.");
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

  function getCurrentPlanMaterials(): SourceMaterial[] {
    const materials: SourceMaterial[] = [];
    for (let offset = 0; offset < learningPrompt.length; offset += 10000) {
      materials.push({
        name: `Current learning plan (part ${materials.length + 1})`,
        content: learningPrompt.slice(offset, offset + 10000),
      });
    }
    return materials;
  }

  async function requestReply(conversation: DesignChatMessage[]) {
    if (learningPrompt.length > MAX_LEARNING_PROMPT_LENGTH) {
      setChatError(
        `Shorten the learning plan to ${MAX_LEARNING_PROMPT_LENGTH.toLocaleString()} characters or less before asking for a refinement.`,
      );
      return;
    }

    setIsSending(true);
    setChatError(null);
    try {
      const requestMessages = conversation.slice(-30);
      const latestMessage = requestMessages.at(-1);
      if (latestMessage?.role === "user" && learningPrompt.trim()) {
        requestMessages[requestMessages.length - 1] = {
          ...latestMessage,
          content: `Use the provided existing learning plan as your starting point. Apply this requested refinement:\n\n${latestMessage.content}`,
        };
      }
      const response = await sendLearningPathDesignMessage(
        requestMessages,
        getCurrentPlanMaterials(),
      );
      if (response.learning_prompt_draft.length > MAX_LEARNING_PROMPT_LENGTH) {
        throw new Error(
          "The refined learning plan exceeds 50,000 characters. Ask for a shorter plan and try again.",
        );
      }
      setMessages([
        ...conversation,
        { role: "assistant", content: response.message },
      ]);
      setValue("learning_prompt", response.learning_prompt_draft, {
        shouldDirty: true,
        shouldValidate: true,
      });
      setPlanEditorRevision((revision) => revision + 1);
      setSaveMessage("");
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

  function handleChatSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = messageDraft.trim();
    if (!content || isSending) return;
    const conversation = [...messages, { role: "user" as const, content }];
    setMessages(conversation);
    setMessageDraft("");
    void requestReply(conversation);
  }

  function handleSave(values: CourseEditValues) {
    if (saveMutation.isPending) return;
    setSaveMessage("");
    saveMutation.mutate({
      id: courseId,
      ...values,
    });
  }

  return (
    <div
      className={`min-h-0 flex-none ${isCompact ? "h-[1200px]" : "h-[calc(100dvh-5rem)]"}`}
    >
      <Group
        orientation={isCompact ? "vertical" : "horizontal"}
        className="h-full min-h-0"
        id="course-edit-workspace"
      >
        <Panel
          defaultSize={isCompact ? "33%" : "25%"}
          minSize={isCompact ? "25%" : "18%"}
          className="min-h-0"
          id="course-details"
        >
          <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Workspace
              </p>
              <h1 className="mt-1 text-base font-semibold text-slate-950">
                Course details
              </h1>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Edit the title and description shown to learners.
              </p>
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
              <div>
                <label
                  htmlFor="edit-course-title"
                  className="mb-1.5 block text-[11px] font-semibold text-slate-600"
                >
                  Course title
                </label>
                <input
                  id="edit-course-title"
                  {...register("title", {
                    onChange: () => setSaveMessage(""),
                  })}
                  disabled={isSending || saveMutation.isPending}
                  aria-invalid={Boolean(errors.title)}
                  aria-describedby={errors.title ? "edit-course-title-error" : undefined}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
                {errors.title && (
                  <p
                    id="edit-course-title-error"
                    role="alert"
                    className="mt-1 text-[11px] text-red-700"
                  >
                    {errors.title.message}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="edit-course-description"
                  className="mb-1.5 block text-[11px] font-semibold text-slate-600"
                >
                  Description
                </label>
                <textarea
                  id="edit-course-description"
                  {...register("description", {
                    onChange: () => setSaveMessage(""),
                  })}
                  disabled={isSending || saveMutation.isPending}
                  aria-invalid={Boolean(errors.description)}
                  aria-describedby={
                    errors.description ? "edit-course-description-error" : undefined
                  }
                  rows={6}
                  className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-xs leading-5 text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
                {errors.description && (
                  <p
                    id="edit-course-description-error"
                    role="alert"
                    className="mt-1 text-[11px] text-red-700"
                  >
                    {errors.description.message}
                  </p>
                )}
              </div>
              <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                <span className="font-semibold text-slate-700">Status:</span>{" "}
                {course.status}
              </div>
            </div>
            <div className="border-t border-slate-100 px-4 py-3 text-[11px] text-slate-400">
              Created {new Date(course.created_at).toLocaleDateString()}
            </div>
          </aside>
        </Panel>

        <Separator
          aria-label="Resize course details and conversation panels"
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
                    Refine this plan through conversation
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
                    {index === 0 && messages.length === 1 && (
                      <div className="mt-4 flex flex-col items-start gap-2">
                        {[
                          "Make this plan more beginner-friendly",
                          "Add more hands-on practice",
                          "Shorten the plan",
                        ].map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => setMessageDraft(suggestion)}
                            className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-left text-[11px] font-medium text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100"
                          >
                            {suggestion}
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
                    Updating your learning plan…
                  </span>
                </div>
              )}
              {chatError && (
                <div
                  role="alert"
                  className="ml-8 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-800"
                >
                  <p>{chatError}</p>
                  {messages.at(-1)?.role === "user" && (
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
              <form onSubmit={handleChatSubmit}>
                <label htmlFor="edit-design-message" className="sr-only">
                  Message the learning designer
                </label>
                <div className="flex items-end gap-2 rounded-xl border border-slate-200 bg-white p-2 transition focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100">
                  <textarea
                    id="edit-design-message"
                    value={messageDraft}
                    onChange={(event) => setMessageDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        event.currentTarget.form?.requestSubmit();
                      }
                    }}
                    maxLength={3900}
                    rows={2}
                    placeholder="How would you like to refine the plan?"
                    disabled={isSending || saveMutation.isPending}
                    className="max-h-32 min-h-11 flex-1 resize-y bg-transparent px-2 py-1.5 text-xs leading-5 text-slate-900 outline-none placeholder:text-slate-400 disabled:opacity-60"
                  />
                  <button
                    type="submit"
                    disabled={
                      !messageDraft.trim() ||
                      isSending ||
                      saveMutation.isPending
                    }
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
            <div className="shrink-0 border-b border-slate-100 px-4 py-4">
              <div className="flex items-center gap-2">
                <span className="grid size-7 place-items-center rounded-lg bg-amber-50 text-amber-700">
                  <FileText aria-hidden="true" className="size-3.5" />
                </span>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Course content
                </p>
              </div>
              <h2 className="mt-2 text-base font-semibold text-slate-950">
                Learning plan
              </h2>
              <div
                aria-label="Learning plan view"
                className="mt-3 flex rounded-lg bg-slate-100 p-1"
              >
                {(["edit", "preview"] as const).map((view) => (
                  <button
                    key={view}
                    type="button"
                    aria-pressed={planView === view}
                    onClick={() => setPlanView(view)}
                    className={`flex-1 rounded-md px-2 py-1.5 text-[11px] font-medium capitalize transition ${
                      planView === view
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {view}
                  </button>
                ))}
              </div>
            </div>
            {planView === "edit" ? (
              <div className="flex min-h-0 flex-1 flex-col gap-2 p-4">
                <label htmlFor="edit-learning-prompt" className="sr-only">
                  Learning plan Markdown
                </label>
                <div className="course-learning-editor min-h-0 flex-1">
                  <CKEditor
                    key={planEditorRevision}
                    id="edit-learning-prompt"
                    editor={ClassicEditor}
                    config={editorConfig}
                    data={learningPrompt}
                    disabled={isSending || saveMutation.isPending}
                    aria-label="Learning plan Markdown"
                    aria-invalid={Boolean(errors.learning_prompt)}
                    aria-describedby={
                      errors.learning_prompt
                        ? "edit-learning-prompt-error"
                        : undefined
                    }
                    onChange={(_event, editor) => {
                      setValue("learning_prompt", editor.getData(), {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                      setSaveMessage("");
                    }}
                  />
                </div>
                {errors.learning_prompt && (
                  <p
                    id="edit-learning-prompt-error"
                    role="alert"
                    className="text-[11px] text-red-700"
                  >
                    {errors.learning_prompt.message}
                  </p>
                )}
                <p
                  aria-live="polite"
                  className={`shrink-0 text-right text-[10px] ${
                    learningPrompt.length > MAX_LEARNING_PROMPT_LENGTH
                      ? "text-red-700"
                      : "text-slate-400"
                  }`}
                >
                  {learningPrompt.length.toLocaleString()} /{" "}
                  {MAX_LEARNING_PROMPT_LENGTH.toLocaleString()} characters
                </p>
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-950">
                  {title || "Untitled course"}
                </h3>
                {learningPrompt ? (
                  <MarkdownRenderer
                    content={learningPrompt}
                    className="text-xs leading-6 text-slate-700 [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm [&_p]:my-2 [&_ul]:my-2"
                  />
                ) : (
                  <p className="text-xs text-slate-400">
                    Your learning plan preview will appear here.
                  </p>
                )}
              </div>
            )}
            <form
              noValidate
              onSubmit={handleSubmit(handleSave)}
              className="shrink-0 space-y-3 border-t border-slate-100 p-4"
            >
              {saveMutation.isError && (
                <p
                  role="alert"
                  className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700"
                >
                  {saveMutation.error.message}
                </p>
              )}
              {saveMessage && (
                <p
                  role="status"
                  className="text-xs font-medium text-emerald-700"
                >
                  <Check aria-hidden="true" className="mr-1 inline size-3.5" />
                  {saveMessage}
                </p>
              )}
              <button
                type="submit"
                disabled={
                  isSending ||
                  saveMutation.isPending
                }
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
              >
                {saveMutation.isPending ? (
                  <LoaderCircle
                    aria-hidden="true"
                    className="size-3.5 animate-spin"
                  />
                ) : (
                  <Save aria-hidden="true" className="size-3.5" />
                )}
                {saveMutation.isPending
                  ? "Saving..."
                  : saveMessage
                    ? "Saved"
                    : "Save changes"}
              </button>
            </form>
          </aside>
        </Panel>
      </Group>
    </div>
  );
}
