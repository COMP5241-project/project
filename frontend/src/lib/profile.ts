import { z } from "zod";

const profileSchema = z.object({
  email: z.email(),
});

export const profileQueryKey = ["profile", "me"] as const;

export async function fetchCurrentProfile() {
  const response = await fetch("/api/v1/profile/me", {
    credentials: "same-origin",
  });

  if (response.status === 401) {
    return null;
  }
  if (!response.ok) {
    throw new Error("Unable to load your profile.");
  }

  return profileSchema.parse(await response.json());
}
