'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    setBusy(true);
    try {
      await api.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

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
        <h1 className="mt-2 font-display text-4xl font-bold tracking-tight">Forgot password</h1>

        {sent ? (
          <div className="mt-6 space-y-4">
            <p className="text-sm leading-relaxed text-ink/70">
              If that email is registered with us, a password reset link is on its way.
              The link expires in 30 minutes.
            </p>
            <Link
              href="/login"
              className="inline-block rounded-md bg-ink px-6 py-3 text-sm font-medium text-white hover:bg-primary transition-colors"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <p className="mt-3 text-sm text-ink/60">
              Enter your email and we&apos;ll send you a link to set a new password.
            </p>
            <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
              <label className="block text-left">
                <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-ink/50">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
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
                  busy
                    ? 'bg-muted text-ink/40 cursor-wait'
                    : 'bg-ink text-white hover:bg-primary'
                }`}
              >
                {busy ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          </>
        )}

        <p className="mt-8 text-sm text-ink/60">
          Remembered it?{' '}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
