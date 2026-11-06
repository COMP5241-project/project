import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { z } from "zod";

type AuthMode = "login" | "signup";

const emailSchema = z.object({
  email: z.email("Enter a valid email address"),
});

const authResponseSchema = z.object({
  message: z.string(),
  user: z.object({ email: z.email() }),
});

type EmailFormValues = z.infer<typeof emailSchema>;
type AuthResponse = z.infer<typeof authResponseSchema>;

async function submitEmail(
  endpoint: string,
  values: EmailFormValues,
): Promise<AuthResponse> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });
  const result: unknown = await response.json();

  if (!response.ok) {
    const detail =
      typeof result === "object" &&
      result !== null &&
      "detail" in result &&
      typeof result.detail === "string"
        ? result.detail
        : "Unable to continue. Please try again.";
    throw new Error(detail);
  }

  return authResponseSchema.parse(result);
}

export function EmailAuthForm({ mode }: { mode: AuthMode }) {
  const isSignup = mode === "signup";
  const endpoint = isSignup ? "/api/v1/auth/register" : "/api/v1/auth/login";
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });
  const authMutation = useMutation({
    mutationFn: (values: EmailFormValues) => submitEmail(endpoint, values),
  });

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-10 text-slate-900">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
        <Link
          to="/"
          className="text-sm font-medium text-slate-500 transition hover:text-indigo-700"
        >
          ← Back to home
        </Link>
        <p className="mb-3 mt-9 text-sm font-semibold uppercase tracking-[0.16em] text-indigo-600">
          COMP5241 - GROUP 5
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
          {isSignup ? "Create an account" : "Welcome back"}
        </h1>
        <p className="mt-3 leading-7 text-slate-600">
          Enter your email to {isSignup ? "get started" : "continue"}. Password
          authentication is not part of this demo.
        </p>

        <form
          onSubmit={handleSubmit((values) => authMutation.mutate(values))}
          className="mt-8 space-y-5"
        >
          <div>
            <label
              htmlFor={`${mode}-email`}
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Email address
            </label>
            <input
              id={`${mode}-email`}
              type="email"
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={
                errors.email ? `${mode}-email-error` : undefined
              }
              {...register("email")}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              placeholder="you@example.com"
            />
            {errors.email && (
              <p
                id={`${mode}-email-error`}
                className="mt-2 text-sm text-red-700"
              >
                {errors.email.message}
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={authMutation.isPending}
            className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-wait disabled:opacity-60"
          >
            {authMutation.isPending
              ? "Please wait..."
              : isSignup
                ? "Sign up"
                : "Log in"}
          </button>
        </form>

        {authMutation.isSuccess && (
          <p
            role="status"
            className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            {authMutation.data.message}. You are signed in for this demo.
          </p>
        )}
        {authMutation.isError && (
          <p
            role="alert"
            className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700"
          >
            {authMutation.error.message}
          </p>
        )}

        <p className="mt-7 text-center text-sm text-slate-600">
          {isSignup ? "Already have an account?" : "New here?"}{" "}
          <Link
            to={isSignup ? "/login" : "/signup"}
            className="font-semibold text-indigo-700 hover:text-indigo-800"
          >
            {isSignup ? "Log in" : "Sign up"}
          </Link>
        </p>
      </section>
    </main>
  );
}
