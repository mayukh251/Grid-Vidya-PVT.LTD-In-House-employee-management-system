"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("employee@gridvidya.local");
  const [password, setPassword] = useState("Pass@123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { message?: string }
          | null;
        setError(payload?.message ?? "Unable to sign in");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-sm space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-white/45">Welcome back</p>
        <h2 className="mt-2 font-[var(--font-display)] text-4xl uppercase text-white">Sign In</h2>
      </div>

      <form className="space-y-4" onSubmit={onSubmit}>
        <label className="block space-y-2 text-sm text-white/75">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-white outline-none ring-indigo-400/40 placeholder:text-white/35 focus:ring"
            placeholder="you@company.com"
            required
          />
        </label>

        <label className="block space-y-2 text-sm text-white/75">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-white outline-none ring-indigo-400/40 placeholder:text-white/35 focus:ring"
            placeholder="Enter password"
            required
          />
        </label>

        {error ? (
          <p className="rounded-xl border border-rose-300/35 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#f06757] via-[#ef6c5f] to-[#6574ff] text-sm font-medium text-white shadow-[0_10px_30px_rgba(239,107,95,0.38)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
          Continue
        </button>
      </form>
    </div>
  );
}


