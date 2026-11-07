import { z } from "zod";

const courseSchema = z.object({
  id: z.uuid(),
  title: z.string(),
});

const createdCourseSchema = courseSchema.extend({
  description: z.string().nullable(),
  status: z.enum(["draft", "published"]),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Course = z.infer<typeof courseSchema>;
export type CreatedCourse = z.infer<typeof createdCourseSchema>;
export const courseListQueryKey = ["courses"] as const;
export const createdCourseListQueryKey = ["courses", "mine"] as const;

async function getErrorMessage(response: Response, fallback: string) {
  const body: unknown = await response.json().catch(() => null);
  if (
    typeof body === "object" &&
    body !== null &&
    "detail" in body &&
    typeof body.detail === "string"
  ) {
    return body.detail;
  }
  return fallback;
}

export async function fetchCourses(signal?: AbortSignal): Promise<Course[]> {
  const response = await fetch("/api/v1/courses", {
    credentials: "same-origin",
    signal,
  });
  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Unable to load available courses."),
    );
  }
  return z.array(courseSchema).parse(await response.json());
}

export async function fetchMyCourses(
  signal?: AbortSignal,
): Promise<CreatedCourse[]> {
  const response = await fetch("/api/v1/courses/mine", {
    credentials: "same-origin",
    signal,
  });
  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Unable to load your courses."),
    );
  }
  return z.array(createdCourseSchema).parse(await response.json());
}

export async function toggleCourseStatus(
  courseId: string,
): Promise<CreatedCourse> {
  const response = await fetch(`/api/v1/courses/${courseId}/status`, {
    method: "PATCH",
    credentials: "same-origin",
  });
  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Unable to update the course status."),
    );
  }
  return createdCourseSchema.parse(await response.json());
}
