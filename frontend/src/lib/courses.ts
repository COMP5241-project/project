import { z } from "zod";

const courseSchema = z.object({
  id: z.uuid(),
  course_topic: z.string(),
  title: z.string(),
});

export type Course = z.infer<typeof courseSchema>;
export const courseListQueryKey = ["courses"] as const;

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
