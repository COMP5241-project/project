import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";

type AuthMode = "login" | "signup";

type AuthResponse = {
  message: string;
  user: { email: string };
};

export function EmailAuthForm({ mode }: { mode: AuthMode }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSignup = mode === "signup";
  const endpoint = isSignup ? "/api/v1/auth/register" : "/api/v1/auth/login";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = (await response.json()) as AuthResponse & {
        detail?: string;
      };

      if (!response.ok) {
        throw new Error(result.detail ?? "Unable to continue. Please try again.");
      }

      setMessage(`${result.message}. You are signed in for this demo.`);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to reach the server. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

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

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
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
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              placeholder="you@example.com"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-wait disabled:opacity-60"
          >
            {isSubmitting
              ? "Please wait..."
              : isSignup
                ? "Sign up"
                : "Log in"}
          </button>
        </form>

        {message && (
          <p role="status" className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
            {message}
          </p>
        )}
        {error && (
          <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            {error}
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
