'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api, getToken } from '@/lib/api';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Verify any stored token instead of blindly blocking the login form —
    // a stale token used to lock users out forever.
    let alive = true;
    (async () => {
      if (new URLSearchParams(window.location.search).get('reset') === '1') {
        setNotice('Password updated — sign in with your new password.');
      }
      if (getToken()) {
        try {
          await api.getMe();
          if (alive) router.replace('/');
          return;
        } catch {
          // invalid/expired token — api.js already cleared it; show the form
        }
      }
      if (alive) setChecked(true);
    })();
    return () => {
      alive = false;
    };
  }, [router]);

  async function submit(e) {
    e.preventDefault();
    setError('');
    const identifier = email.trim();
    if (!identifier) {
      setError('Please enter your email or username.');
      return;
    }
    if (identifier.includes('@') && !identifier.includes('.')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }
    setBusy(true);
    try {
      await api.login({ email: identifier, password }, remember);
      router.push('/');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  if (!checked) return null;

  return (
    <div className="min-h-[calc(100vh-64px)] grid lg:grid-cols-2">
      {/* LEFT — IMAGE */}
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/login-page-img.png"
          alt="Stack of classic books"
          className="lg:absolute lg:inset-0 w-full h-44 lg:h-full object-cover"
        />
        <div className="hidden lg:block absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/25 to-ink/5" />
        <div className="hidden lg:flex relative h-full flex-col justify-end p-10 xl:p-12">
          <p className="font-mono text-[11px] tracking-[0.1em] uppercase text-white/60 mb-4">Literacy Gardeners</p>
          <p className="font-display text-3xl xl:text-[38px] leading-tight font-bold text-white max-w-md">
            Every great author was once a reader.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-white/70 max-w-sm">
            Sign in to track your orders, wishlist and competition entries — and keep growing your shelf.
          </p>
        </div>
      </div>

      {/* RIGHT — FORM */}
      <div className="flex items-center justify-center px-6 py-12 lg:py-14">
        <div className="w-full max-w-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/Book Loader.svg"
            alt=""
            aria-hidden="true"
            className="mx-auto h-28 w-28 select-none"
          />

          <p className="mt-6 text-center font-mono text-[11px] tracking-[0.1em] uppercase text-primary">Members</p>
          <h1 className="mt-2 text-center font-display text-4xl font-bold tracking-tight">Welcome back</h1>
          <p className="mt-3 text-center text-sm text-ink/60">
            Sign in to your Literacy Gardeners account.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
            <label className="block">
              <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-ink/50">Email or username</span>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com or username"
                autoComplete="username"
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
                  placeholder="••••••••"
                  autoComplete="current-password"
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

            <div className="flex items-center justify-between gap-3 text-sm">
              <label className="inline-flex items-center gap-2 text-ink/65 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="accent-primary w-4 h-4"
                />
                Remember me
              </label>
              <Link
                href="/forgot-password"
                className="text-ink/55 hover:text-primary transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            {notice && (
              <p role="status" className="text-sm text-primary">{notice}</p>
            )}

            {error && (
              <p role="alert" className="text-sm text-error">{error}</p>
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
              {busy ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-border text-center text-sm text-ink/60">
            New to Literacy Gardeners?{' '}
            <Link href="/signup" className="font-semibold text-primary hover:underline">
              Create an account
            </Link>
            <span className="mx-2 text-ink/30">·</span>
            <Link href="/get-published" className="font-medium text-ink hover:text-primary transition-colors">
              Get Published
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
    </div>
  );
}
