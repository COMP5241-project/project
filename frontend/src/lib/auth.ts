export interface AuthCredentials {
  email: string;
  password: string;
}

export interface RegisterResponse {
  message: string;
  email: string;
  confirmation_required: boolean;
}

export interface LoginResponse {
  message: string;
  email: string;
  access_token: string;
  token_type: string;
}

export async function postAuth<T>(
  path: "/api/auth/login" | "/api/auth/register",
  credentials: AuthCredentials,
): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });
  const body: unknown = await response.json();

  if (!response.ok) {
    const detail =
      typeof body === "object" &&
      body !== null &&
      "detail" in body &&
      typeof body.detail === "string"
        ? body.detail
        : "Authentication request failed. Please try again.";
    throw new Error(detail);
  }

  return body as T;
}
