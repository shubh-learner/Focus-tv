"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function TvLoginForm() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/tv");
    router.refresh();
  }

  // D-pad up/down moves between fields; Enter submits natively.
  function handleKeyDown(event: React.KeyboardEvent<HTMLFormElement>) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const fields = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>("input, button")
    );
    const index = fields.indexOf(document.activeElement as HTMLElement);
    if (index === -1) return;
    event.preventDefault();
    const offset = event.key === "ArrowDown" ? 1 : -1;
    fields[(index + offset + fields.length) % fields.length].focus();
  }

  return (
    <form
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
      className="relative w-full max-w-md rounded-3xl border border-white/15 bg-white/10 p-8 shadow-2xl backdrop-blur-2xl"
    >
      <h1 className="mb-1 text-3xl font-medium tracking-tight">Focus</h1>
      <p className="mb-8 text-base text-white/60">Sign in to watch on this TV.</p>

      {error && <p className="mb-4 text-sm text-red-300">{error}</p>}

      <label className="mb-2 block text-sm text-white/60" htmlFor="tv-email">
        Email
      </label>
      <input
        id="tv-email"
        type="email"
        autoComplete="email"
        autoFocus
        data-focusable
        data-autofocus
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        className="mb-4 w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-lg text-white outline-none placeholder:text-white/30 focus:border-white/40 focus:ring-2 focus:ring-white/30"
        placeholder="you@example.com"
        required
      />

      <label className="mb-2 block text-sm text-white/60" htmlFor="tv-password">
        Password
      </label>
      <input
        id="tv-password"
        type="password"
        autoComplete="current-password"
        data-focusable
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        className="mb-8 w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-lg text-white outline-none placeholder:text-white/30 focus:border-white/40 focus:ring-2 focus:ring-white/30"
        placeholder="Password"
        required
      />

      <button
        type="submit"
        data-focusable
        disabled={loading}
        className="w-full rounded-2xl bg-white/90 py-3 text-lg font-medium text-black transition duration-[220ms] focus:scale-[1.06] focus:outline-none focus:ring-2 focus:ring-white/70 disabled:opacity-50"
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
