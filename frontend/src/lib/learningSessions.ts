import { z } from "zod";

const createdSessionSchema = z.object({
  id: z.uuid(),
  status: z.literal("ready"),
});

const learningSessionSummarySchema = z.object({
  id: z.uuid(),
  course_topic: z.string(),
  presentation_format: z.string(),
  experience_level: z.string(),
  status: z.enum(["generating", "ready", "failed"]),
  created_at: z.string(),
});

export const learningSessionSchema = z.object({
  id: z.uuid(),
  course_topic: z.string(),
  presentation_format: z.string(),
  experience_level: z.string(),
  learner_background: z.string().nullable(),
  learning_goal: z.string().nullable(),
  status: z.enum(["generating", "ready", "failed"]),
  content: z.string().nullable(),
});

export type LearningSession = z.infer<typeof learningSessionSchema>;
export type LearningSessionSummary = z.infer<
  typeof learningSessionSummarySchema
>;
export const learningSessionListQueryKey = ["learning-sessions"] as const;

type LearningSessionChoices = {
  course_topic: string;
  presentation_format: string;
  experience_level: string;
};

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

export async function createLearningSession(choices: LearningSessionChoices) {
  const response = await fetch("/api/v1/learning-sessions", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(choices),
  });
  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Unable to generate your lesson."),
    );
  }
  return createdSessionSchema.parse(await response.json());
}

export async function fetchLearningSessions(signal?: AbortSignal) {
  const response = await fetch("/api/v1/learning-sessions", {
    credentials: "same-origin",
    signal,
  });
  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Unable to load your learning sessions."),
    );
  }
  return z.array(learningSessionSummarySchema).parse(await response.json());
}

export async function fetchLearningSession(id: string, signal?: AbortSignal) {
  const response = await fetch(
    `/api/v1/learning-sessions/${encodeURIComponent(id)}`,
    { credentials: "same-origin", signal },
  );
  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Unable to load this lesson."),
    );
  }
  return learningSessionSchema.parse(await response.json());
}
