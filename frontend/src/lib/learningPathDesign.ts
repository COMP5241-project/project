import { z } from "zod";

const designChatResponseSchema = z.object({
  message: z.string().min(1),
});

export type DesignChatMessage = {
  role: "user" | "assistant";
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
) {
  const response = await fetch("/api/v1/learning-path-design/chat", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }
  return designChatResponseSchema.parse(await response.json());
}
