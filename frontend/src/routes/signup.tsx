import { Link, createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  postAuth,
  type AuthCredentials,
  type RegisterResponse,
} from "@/lib/auth";

export const Route = createFileRoute("/signup")({
  component: RouteComponent,
});

const signupSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Enter a password."),
});

function RouteComponent() {
  const mutation = useMutation({
    mutationFn: (credentials: AuthCredentials) =>
      postAuth<RegisterResponse>("/api/auth/register", credentials),
  });
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AuthCredentials>({
    resolver: zodResolver(signupSchema),
  });

  function onSubmit(credentials: AuthCredentials) {
    mutation.mutate(credentials);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="text-3xl font-bold text-slate-900">Create an account</h1>
        <p className="mt-2 text-slate-600">Sign up to get started.</p>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label
              className="mb-1 block text-sm font-medium text-slate-700"
              htmlFor="email"
            >
              Email
            </label>
            <input
              autoComplete="email"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              id="email"
              type="email"
              {...register("email")}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600" role="alert">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label
              className="mb-1 block text-sm font-medium text-slate-700"
              htmlFor="password"
            >
              Password
            </label>
            <input
              autoComplete="new-password"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              id="password"
              type="password"
              {...register("password")}
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600" role="alert">
                {errors.password.message}
              </p>
            )}
          </div>

          {mutation.isError && (
            <p className="text-sm text-red-600" role="alert">
              {mutation.error.message}
            </p>
          )}
          {mutation.isSuccess && (
            <p className="text-sm text-green-700" role="status">
              {mutation.data.confirmation_required
                ? "Account created. Check your email to confirm your account."
                : "Your account has been created."}
            </p>
          )}

          <button
            className="w-full rounded-lg bg-blue-700 px-4 py-2.5 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={mutation.isPending}
            type="submit"
          >
            {mutation.isPending ? "Creating account..." : "Sign up"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link
            className="font-semibold text-blue-700 hover:underline"
            to="/login"
          >
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
