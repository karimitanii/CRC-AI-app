'use client';

import { FormEvent, useState } from 'react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: 'Login failed' }));
        throw new Error(body.error || 'Login failed');
      }

      window.location.href = '/chat';
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,_rgba(238,0,0,0.22),_transparent_55%),radial-gradient(circle_at_bottom_left,_rgba(238,0,0,0.14),_transparent_50%),linear-gradient(180deg,_#07090c_0%,_#0f1217_100%)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:28px_28px]" />

      <section className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)]/92 p-8 shadow-[0_24px_64px_rgba(0,0,0,0.6)] backdrop-blur">
        <p className="mb-2 text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">ClusterOps</p>
        <h1 className="mb-2 text-3xl font-semibold text-white">Assistant Console</h1>
        <p className="mb-7 text-sm text-[var(--color-muted)]">
          Sign in with the demo operator account.
        </p>

        {error ? (
          <p className="mb-4 rounded-md border border-red-900/60 bg-red-950/50 px-3 py-2 text-sm text-red-200">{error}</p>
        ) : null}

        <form className="space-y-4" onSubmit={onSubmit}>
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wide text-[var(--color-muted)]">Username</span>
            <input
              value={username}
              onChange={event => setUsername(event.target.value)}
              placeholder="user1"
              className="h-11 w-full rounded-lg border border-[var(--color-border)] bg-black/35 px-3 text-sm outline-none transition focus:border-[var(--color-accent)]"
              autoComplete="username"
              required
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wide text-[var(--color-muted)]">Password</span>
            <input
              value={password}
              onChange={event => setPassword(event.target.value)}
              type="password"
              placeholder="12345"
              className="h-11 w-full rounded-lg border border-[var(--color-border)] bg-black/35 px-3 text-sm outline-none transition focus:border-[var(--color-accent)]"
              autoComplete="current-password"
              required
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="h-11 w-full rounded-lg border border-[var(--color-accent)] bg-[var(--color-accent)] font-semibold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? 'Signing in...' : 'Login'}
          </button>
        </form>
      </section>
    </main>
  );
}
