'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function submit(e) {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (!email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (!agree) {
      setError('Please agree to the terms to continue.');
      return;
    }
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      window.dispatchEvent(
        new CustomEvent('lg-toast', { detail: `Welcome to Literacy Gardeners, ${name.trim().split(' ')[0]}!` })
      );
    }, 700);
  }

  return (
    <div className="min-h-[calc(100vh-64px)] grid lg:grid-cols-2">
      {/* LEFT — FORM */}
      <div className="flex items-center justify-center px-6 py-12 lg:py-14 order-1 lg:order-none">
        <div className="w-full max-w-sm">
          {/* Loader animation above the form */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/Book Loader.svg"
            alt=""
            aria-hidden="true"
            className="mx-auto h-28 w-28 select-none"
          />

          <p className="mt-6 text-center font-mono text-[11px] tracking-[0.1em] uppercase text-primary">Join the club</p>
          <h1 className="mt-2 text-center font-display text-4xl font-bold tracking-tight">Create your account</h1>
          <p className="mt-3 text-center text-sm text-ink/60">
            Start your journey from first draft to a finished book.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
            <label className="block">
              <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-ink/50">Full name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                autoComplete="name"
                className="mt-1.5 w-full rounded-full border border-border bg-surface px-[18px] py-[11px] text-sm outline-none focus:border-ink transition-colors"
              />
            </label>

            <label className="block">
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

            <label className="block">
              <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-ink/50">Password</span>
              <span className="relative block mt-1.5">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
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

            <label className="flex items-start gap-2.5 text-sm text-ink/65 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                className="accent-primary w-4 h-4 mt-0.5"
              />
              <span>
                I agree to the club&apos;s guidelines and privacy policy.
              </span>
            </label>

            {error && (
              <p role="alert" className="text-sm text-error">{error}</p>
            )}

            <button
              type="submit"
              disabled={busy}
              className={`w-full rounded-full text-sm font-medium px-[18px] py-[12px] transition-colors ${
                busy
                  ? 'bg-muted text-ink/40 cursor-wait'
                  : 'bg-ink text-white hover:bg-primary'
              }`}
            >
              {busy ? 'Creating account…' : 'Sign Up'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-border text-center text-sm text-ink/60">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Sign in
            </Link>
          </div>
          <p className="mt-3 text-center text-sm text-ink/50">
            Just browsing?{' '}
            <Link href="/publications" className="font-medium text-ink hover:text-primary transition-colors">
              View publications →
            </Link>
          </p>
        </div>
      </div>

      {/* RIGHT — IMAGE */}
      <div className="relative order-2 lg:order-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/signup-page-img.png"
          alt="Young writers at work"
          className="lg:absolute lg:inset-0 w-full h-44 lg:h-full object-cover"
        />
        <div className="hidden lg:block absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/25 to-ink/5" />
        <div className="hidden lg:flex relative h-full flex-col justify-end p-10 xl:p-12">
          <p className="font-mono text-[11px] tracking-[0.1em] uppercase text-white/60 mb-4">Literacy Gardeners</p>
          <p className="font-display text-3xl xl:text-[38px] leading-tight font-bold text-white max-w-md">
            Your first chapter starts here.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-white/70 max-w-sm">
            Create a free account to save titles, enter competitions and follow your book from draft to print.
          </p>
        </div>
      </div>
    </div>
  );
}
