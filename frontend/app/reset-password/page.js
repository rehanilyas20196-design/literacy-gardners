'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

function ResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      await api.resetPassword(token, password);
      router.push('/login?reset=1');
    } catch (err) {
      setError(err.message || 'Reset failed');
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <div className="text-center space-y-4">
        <p role="alert" className="text-sm text-error">
          This reset link is missing its token. Request a new one.
        </p>
        <Link
          href="/forgot-password"
          className="inline-block rounded-md bg-ink px-6 py-3 text-sm font-medium text-white hover:bg-primary transition-colors"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
      <label className="block text-left">
        <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-ink/50">New password</span>
        <span className="relative block mt-1.5">
          <input
            type={showPw ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            autoComplete="new-password"
            className="w-full rounded-full border border-border bg-surface px-[18px] pr-14 py-[11px] text-sm outline-none focus:border-ink transition-colors"
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-[10px] tracking-[0.06em] uppercase text-ink/45 hover:text-ink transition-colors"
          >
            {showPw ? 'Hide' : 'Show'}
          </button>
        </span>
      </label>

      <label className="block text-left">
        <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-ink/50">Confirm password</span>
        <input
          type={showPw ? 'text' : 'password'}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repeat it"
          autoComplete="new-password"
          className="mt-1.5 w-full rounded-full border border-border bg-surface px-[18px] py-[11px] text-sm outline-none focus:border-ink transition-colors"
        />
      </label>

      {error && (
        <p role="alert" className="text-sm text-error text-left">{error}</p>
      )}

      <button
        type="submit"
        disabled={busy}
        className={`w-full rounded-md text-sm font-medium px-[18px] py-[12px] transition-colors ${
          busy ? 'bg-muted text-ink/40 cursor-wait' : 'bg-ink text-white hover:bg-primary'
        }`}
      >
        {busy ? 'Updating…' : 'Set new password'}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/Book Loader.svg"
          alt=""
          aria-hidden="true"
          className="mx-auto h-24 w-24 select-none"
        />
        <p className="mt-6 font-mono text-[11px] tracking-[0.1em] uppercase text-primary">Members</p>
        <h1 className="mt-2 font-display text-4xl font-bold tracking-tight">Set a new password</h1>
        <p className="mt-3 text-sm text-ink/60">
          Choose a strong password you haven&apos;t used before.
        </p>
        <Suspense fallback={<p className="mt-8 text-sm text-ink/50">Loading…</p>}>
          <ResetForm />
        </Suspense>
        <p className="mt-8 text-sm text-ink/60">
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
