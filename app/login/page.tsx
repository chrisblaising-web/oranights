"use client";

import {
  FormEvent,
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectPath = useMemo(() => {
    const redirect =
      searchParams.get("redirect");

    if (
      redirect &&
      redirect.startsWith("/") &&
      !redirect.startsWith("//")
    ) {
      return redirect;
    }

    return "/dashboard";
  }, [searchParams]);

  const supabase = useMemo(() => {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const supabaseAnonKey =
      process.env
        .NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (
      !supabaseUrl ||
      !supabaseAnonKey
    ) {
      throw new Error(
        "Missing Supabase environment variables."
      );
    }

    return createBrowserClient(
      supabaseUrl,
      supabaseAnonKey
    );
  }, []);

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [
    checkingSession,
    setCheckingSession,
  ] = useState(true);

  const [status, setStatus] =
    useState("");

  useEffect(() => {
    async function checkSession() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        router.replace(redirectPath);
        router.refresh();
        return;
      }

      setCheckingSession(false);
    }

    void checkSession();
  }, [
    redirectPath,
    router,
    supabase,
  ]);

  async function handleLogin(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setStatus("");

    const cleanEmail = email
      .trim()
      .toLowerCase();

    if (!cleanEmail) {
      setStatus(
        "Enter your email address."
      );
      return;
    }

    if (!password) {
      setStatus(
        "Enter your password."
      );
      return;
    }

    setLoading(true);

    try {
      const {
        data,
        error,
      } =
        await supabase.auth.signInWithPassword(
          {
            email: cleanEmail,
            password,
          }
        );

      if (error) {
        throw new Error(
          error.message
        );
      }

      if (
        !data.user ||
        !data.session
      ) {
        throw new Error(
          "The login session could not be created."
        );
      }

      router.replace(redirectPath);
      router.refresh();
    } catch (error) {
      console.error(
        "Login error:",
        error
      );

      setStatus(
        error instanceof Error
          ? error.message
          : "Login failed."
      );
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black px-5 text-white">
        <div className="text-sm text-zinc-400">
          Checking session...
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-5 py-10 text-white">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-950 p-7 shadow-2xl md:p-10">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-2xl font-bold text-black">
            O
          </div>

          <h1 className="mt-6 text-3xl font-bold">
            4lavie
          </h1>

          <p className="mt-2 text-sm text-zinc-400">
            Sign in to manage guests,
            forms, and SMS campaigns.
          </p>
        </div>

        {status && (
          <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {status}
          </div>
        )}

        <form
          onSubmit={(event) =>
            void handleLogin(event)
          }
          className="mt-8 space-y-5"
        >
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-zinc-300"
            >
              Email
            </label>

            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value
                )
              }
              placeholder="you@example.com"
              disabled={loading}
              className="w-full rounded-xl border border-white/10 bg-black p-4 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-zinc-300"
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value
                )
              }
              placeholder="Enter your password"
              disabled={loading}
              className="w-full rounded-xl border border-white/10 bg-black p-4 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-white px-6 py-4 font-bold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Signing in..."
              : "Sign In"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs leading-5 text-zinc-600">
          This login is for authorized
          CRM users only.
        </p>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-black px-5 text-white">
          <div className="text-sm text-zinc-400">
            Loading login...
          </div>
        </main>
      }
    >
      <LoginContent />
    </Suspense>
  );
}