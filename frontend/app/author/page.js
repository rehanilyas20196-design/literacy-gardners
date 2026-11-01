'use client';

import { useState } from 'react';
import Link from 'next/link';

function Field({ label, hint, error, ...props }) {
  return (
    <label className="block">
      <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-ink/50">{label}</span>
      {hint && (
        <span className="block text-xs text-ink/45 mt-0.5 normal-case font-sans tracking-normal leading-relaxed">
          {hint}
        </span>
      )}
      <input
        {...props}
        className={`mt-1.5 w-full rounded-full border bg-surface px-[18px] py-[11px] text-sm outline-none focus:border-ink transition-colors ${
          error ? 'border-error' : 'border-border'
        }`}
      />
    </label>
  );
}

function PasswordField({ label, hint, value, onChange, autoComplete }) {
  const [show, setShow] = useState(false);
  return (
    <label className="block">
      <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-ink/50">{label}</span>
      {hint && (
        <span className="block text-xs text-ink/45 mt-0.5 normal-case font-sans tracking-normal leading-relaxed">
          {hint}
        </span>
      )}
      <span className="relative block mt-1.5">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          className="w-full rounded-full border border-border bg-surface px-[18px] pr-14 py-[11px] text-sm outline-none focus:border-ink transition-colors"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-[10px] tracking-[0.06em] uppercase text-ink/45 hover:text-ink transition-colors"
        >
          {show ? 'Hide' : 'Show'}
        </button>
      </span>
    </label>
  );
}

const EMPTY_REG = {
  first: '', last: '', email: '', phone: '', username: '', password: '',
  accountTitle: '', accountNumber: '', iban: '', agree: false
};

export default function AuthorPage() {
  const [tab, setTab] = useState('register');
  const [reg, setReg] = useState(EMPTY_REG);
  const [regErr, setRegErr] = useState('');
  const [regBusy, setRegBusy] = useState(false);
  const [login, setLogin] = useState({ email: '', password: '' });
  const [loginErr, setLoginErr] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);

  const set = (k) => (e) =>
    setReg((prev) => ({ ...prev, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  function submitRegister(e) {
    e.preventDefault();
    setRegErr('');
    if (!reg.first.trim() || !reg.last.trim()) return setRegErr('Please enter your first and last name.');
    if (!reg.email.includes('@')) return setRegErr('Please enter a valid account email.');
    if (!/^[0-9+\-\s()]{7,}$/.test(reg.phone.trim())) return setRegErr('Please enter a valid phone number.');
    if (!/^[a-zA-Z0-9._]{3,30}$/.test(reg.username.trim())) return setRegErr('Username must be 3–30 characters (letters, numbers, dot, underscore).');
    if (reg.password.length < 6) return setRegErr('Password must be at least 6 characters.');
    if (!reg.accountTitle.trim() || !reg.accountNumber.trim() || !reg.iban.trim())
      return setRegErr('Please complete your payment account details.');
    if (!reg.agree) return setRegErr('Please agree to the Terms of Service and Privacy Policy.');
    setRegBusy(true);
    setTimeout(() => {
      setRegBusy(false);
      setReg(EMPTY_REG);
      window.dispatchEvent(
        new CustomEvent('lg-toast', { detail: "Author application received — we'll email you once approved." })
      );
    }, 800);
  }

  function submitLogin(e) {
    e.preventDefault();
    setLoginErr('');
    if (!login.email.includes('@')) return setLoginErr('Please enter a valid email address.');
    if (login.password.length < 6) return setLoginErr('Password must be at least 6 characters.');
    setLoginBusy(true);
    setTimeout(() => {
      setLoginBusy(false);
      window.dispatchEvent(
        new CustomEvent('lg-toast', { detail: `Welcome back, ${login.email.split('@')[0]}!` })
      );
    }, 700);
  }

  return (
    <div className="min-h-[calc(100vh-64px)] grid lg:grid-cols-2">
      {/* LEFT — IMAGE */}
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/signup-page-img.png"
          alt="Shelf of classic books"
          className="lg:absolute lg:inset-0 w-full h-44 lg:h-full object-cover"
        />
        <div className="hidden lg:block absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/25 to-ink/5" />
        <div className="hidden lg:flex relative h-full flex-col justify-end p-10 xl:p-12">
          <p className="font-mono text-[11px] tracking-[0.1em] uppercase text-white/60 mb-4">For Authors</p>
          <p className="font-display text-3xl xl:text-[38px] leading-tight font-bold text-white max-w-md">
            Turn your manuscript into a published book.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-white/70 max-w-sm">
            Register as an author to enter competitions, earn referral commissions on anthology sales and get
            published — with the club handling every step of production.
          </p>
        </div>
      </div>

      {/* RIGHT — FORM */}
      <div className="flex items-start justify-center px-6 py-12 lg:py-14">
        <div className="w-full max-w-md">
          {/* Loader animation */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/Book Loader.svg"
            alt=""
            aria-hidden="true"
            className="mx-auto h-24 w-24 select-none"
          />

          {/* TABS — register + login on one page */}
          <div className="mt-6 flex justify-center">
            <div className="inline-flex rounded-full border border-border bg-surface p-1" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'register'}
                onClick={() => setTab('register')}
                className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                  tab === 'register' ? 'bg-ink text-white' : 'text-ink/60 hover:text-ink'
                }`}
              >
                Register as Author
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'login'}
                onClick={() => setTab('login')}
                className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                  tab === 'login' ? 'bg-ink text-white' : 'text-ink/60 hover:text-ink'
                }`}
              >
                Author Sign In
              </button>
            </div>
          </div>

          {tab === 'register' ? (
            <>
              <p className="mt-6 text-center font-mono text-[11px] tracking-[0.1em] uppercase text-primary">Join the club</p>
              <h1 className="mt-2 text-center font-display text-3xl md:text-4xl font-bold tracking-tight">
                Register as Author
              </h1>
              <p className="mt-3 text-center text-sm leading-relaxed text-ink/60 max-w-sm mx-auto">
                Your account must be approved before earning referrals. You&apos;ll be notified by email once approved.
              </p>

              <form onSubmit={submitRegister} className="mt-7 space-y-4" noValidate>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="First Name" hint="Your first name." placeholder="Zoya" value={reg.first} onChange={set('first')} autoComplete="given-name" />
                  <Field label="Last Name" hint="Your last name." placeholder="Rahman" value={reg.last} onChange={set('last')} autoComplete="family-name" />
                </div>

                <Field label="Account Email" hint="Your primary email, used for logging in." type="email" placeholder="you@example.com" value={reg.email} onChange={set('email')} autoComplete="email" />
                <Field label="Your Phone Number" hint="You will be contacted on this number in case of any issues during payouts." type="tel" placeholder="+92 300 0000000" value={reg.phone} onChange={set('phone')} autoComplete="tel" />
                <Field
                  label="Username (must be same as your Instagram username)"
                  hint="This will also be your coupon code for anthology sales."
                  placeholder="your_instagram_handle"
                  value={reg.username}
                  onChange={set('username')}
                  autoComplete="username"
                />
                <PasswordField label="Password" hint="Your primary password, used for logging in." value={reg.password} onChange={set('password')} autoComplete="new-password" />

                {/* PAYMENT */}
                <div className="border border-border rounded-lg p-4 sm:p-5 space-y-4 bg-muted/50">
                  <p className="font-mono text-[11px] tracking-[0.08em] uppercase text-ink/50">Preferred Payment Method</p>
                  <label className="block">
                    <span className="sr-only">Preferred Payment Method</span>
                    <select
                      defaultValue="abhi"
                      className="w-full rounded-full border border-border bg-surface px-[18px] py-[11px] text-sm outline-none focus:border-ink cursor-pointer"
                    >
                      <option value="abhi">ABHI Microfinance Bank</option>
                    </select>
                  </label>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="Account Title" placeholder="Account holder name" value={reg.accountTitle} onChange={set('accountTitle')} />
                    <Field label="Account Number" placeholder="0000 0000 0000" inputMode="numeric" value={reg.accountNumber} onChange={set('accountNumber')} />
                  </div>
                  <Field label="IBAN" placeholder="PK00 ABCD 0000 0000 0000 0000" value={reg.iban} onChange={set('iban')} />
                </div>

                <label className="flex items-start gap-2.5 text-sm text-ink/65 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={reg.agree}
                    onChange={set('agree')}
                    className="accent-primary w-4 h-4 mt-0.5"
                  />
                  <span>
                    I agree to our <span className="underline decoration-ink/30">Terms of Service</span> and{' '}
                    <span className="underline decoration-ink/30">Privacy Policy</span>.
                  </span>
                </label>

                {regErr && <p role="alert" className="text-sm text-error">{regErr}</p>}

                <button
                  type="submit"
                  disabled={regBusy}
                  className={`w-full rounded-full text-sm font-medium px-[18px] py-[12px] transition-colors ${
                    regBusy ? 'bg-muted text-ink/40 cursor-wait' : 'bg-ink text-white hover:bg-primary'
                  }`}
                >
                  {regBusy ? 'Submitting…' : 'Register as Author'}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-ink/50">
                Already an author?{' '}
                <button
                  type="button"
                  onClick={() => setTab('login')}
                  className="font-semibold text-primary hover:underline"
                >
                  Sign in
                </button>
                <span className="mx-2 text-ink/30">·</span>
                <Link href="/login" className="font-medium text-ink hover:text-primary transition-colors">
                  Member login
                </Link>
              </p>
            </>
          ) : (
            <>
              <p className="mt-6 text-center font-mono text-[11px] tracking-[0.1em] uppercase text-primary">Authors</p>
              <h1 className="mt-2 text-center font-display text-3xl md:text-4xl font-bold tracking-tight">
                Welcome back
              </h1>
              <p className="mt-3 text-center text-sm text-ink/60">
                Sign in to your author account to track referrals and submissions.
              </p>

              <form onSubmit={submitLogin} className="mt-7 space-y-4" noValidate>
                <Field label="Account Email" type="email" placeholder="you@example.com" value={login.email} onChange={(e) => setLogin((p) => ({ ...p, email: e.target.value }))} autoComplete="email" />
                <PasswordField label="Password" value={login.password} onChange={(e) => setLogin((p) => ({ ...p, password: e.target.value }))} autoComplete="current-password" />

                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-ink/45 text-xs">Referral earnings unlock after approval.</span>
                  <button
                    type="button"
                    onClick={() =>
                      window.dispatchEvent(new CustomEvent('lg-toast', { detail: 'Password reset coming soon.' }))
                    }
                    className="text-ink/55 hover:text-primary transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>

                {loginErr && <p role="alert" className="text-sm text-error">{loginErr}</p>}

                <button
                  type="submit"
                  disabled={loginBusy}
                  className={`w-full rounded-full text-sm font-medium px-[18px] py-[12px] transition-colors ${
                    loginBusy ? 'bg-muted text-ink/40 cursor-wait' : 'bg-ink text-white hover:bg-primary'
                  }`}
                >
                  {loginBusy ? 'Signing in…' : 'Author Sign In'}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-ink/50">
                New author?{' '}
                <button
                  type="button"
                  onClick={() => setTab('register')}
                  className="font-semibold text-primary hover:underline"
                >
                  Register as Author
                </button>
                <span className="mx-2 text-ink/30">·</span>
                <Link href="/login" className="font-medium text-ink hover:text-primary transition-colors">
                  Member login
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
