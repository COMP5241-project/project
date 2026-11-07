import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
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

const MAX_LEARNING_PROMPT_LENGTH = 50000;

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
  const [title, setTitle] = useState(course.title);
  const [description, setDescription] = useState(course.description ?? "");
  const [learningPrompt, setLearningPrompt] = useState(course.learning_prompt);
  const [saveMessage, setSaveMessage] = useState("");
  const saveMutation = useMutation({
    mutationFn: updateMyCourse,
    onSuccess: (updatedCourse) => {
      onSave(updatedCourse);
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

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saveMutation.isPending) return;
    setSaveMessage("");
    saveMutation.mutate({
      id: courseId,
      title,
      description,
      learning_prompt: learningPrompt,
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
                    value={title}
                    onChange={(event) => {
                      setTitle(event.target.value);
                      setSaveMessage("");
                    }}
                    maxLength={200}
                    required
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
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
                    value={description}
                    onChange={(event) => {
                      setDescription(event.target.value);
                      setSaveMessage("");
                    }}
                    maxLength={2000}
                    rows={6}
                    className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-xs leading-5 text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
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
            aria-label="Resize course details and learning plan panels"
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
            id="learning-plan"
          >
            <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="shrink-0 border-b border-slate-100 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Course content
                </p>
                <h2 className="mt-1 text-base font-semibold text-slate-950">
                  Learning plan
                </h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Edit the Markdown prompt used to generate this course.
                </p>
              </div>
              <div className="flex min-h-0 flex-1 flex-col gap-2 p-4">
                <label htmlFor="edit-learning-prompt" className="sr-only">
                  Learning plan Markdown
                </label>
                <div className="course-learning-editor min-h-0 flex-1">
                  <CKEditor
                    id="edit-learning-prompt"
                    editor={ClassicEditor}
                    config={editorConfig}
                    data={learningPrompt}
                    onChange={(_event, editor) => {
                      setLearningPrompt(editor.getData());
                      setSaveMessage("");
                    }}
                  />
                </div>
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
            </section>
          </Panel>

          <Separator
            aria-label="Resize learning plan and preview panels"
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
            id="course-preview"
          >
            <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="shrink-0 border-b border-slate-100 px-4 py-4">
                <div className="flex items-center gap-2">
                  <span className="grid size-7 place-items-center rounded-lg bg-amber-50 text-amber-700">
                    <FileText aria-hidden="true" className="size-3.5" />
                  </span>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Preview
                  </p>
                </div>
                <h2 className="mt-2 text-base font-semibold text-slate-950">
                  {title || "Untitled course"}
                </h2>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-4">
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
              <form
                onSubmit={handleSave}
                className="shrink-0 space-y-3 border-t border-slate-100 p-4"
              >
                {saveMutation.isError && (
                  <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                    {saveMutation.error.message}
                  </p>
                )}
                {saveMessage && (
                  <p role="status" className="text-xs font-medium text-emerald-700">
                    <Check aria-hidden="true" className="mr-1 inline size-3.5" />
                    {saveMessage}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={
                    !title.trim() ||
                    !learningPrompt.trim() ||
                    learningPrompt.length > MAX_LEARNING_PROMPT_LENGTH ||
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
                  {saveMutation.isPending ? "Saving..." : "Save changes"}
                </button>
              </form>
            </aside>
          </Panel>
          </Group>
        </div>
  );
}
