import { z } from "zod";

const designChatResponseSchema = z.object({
  message: z.string().min(1),
  learning_prompt_draft: z.string(),
});

const createdLearningPathSchema = z.object({
  course_id: z.uuid(),
  session_id: z.uuid(),
});

export type DesignChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type SourceMaterial = {
  name: string;
  content: string;
};

async function getErrorMessage(response: Response) {
  const body: unknown = await response.json().catch(() => null);
  if (
    typeof body === "object" &&
    body !== null &&
    "detail" in body &&
    typeof body.detail === "string"
  ) {
    return body.detail;
  }
  return "Unable to contact the learning path designer.";
}

export async function sendLearningPathDesignMessage(
  messages: DesignChatMessage[],
  sourceMaterials: SourceMaterial[],
) {
  const response = await fetch("/api/v1/learning-path-design/chat", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, source_materials: sourceMaterials }),
  });
  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }
  return designChatResponseSchema.parse(await response.json());
}

export async function createLearningPath(input: {
  title: string;
  learning_prompt: string;
}) {
  const response = await fetch("/api/v1/learning-path-design/create", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    if (
      typeof body === "object" &&
      body !== null &&
      "detail" in body &&
      typeof body.detail === "string"
    ) {
      throw new Error(body.detail);
    }
    throw new Error("Unable to create your learning path.");
  }
  return createdLearningPathSchema.parse(await response.json());
}
