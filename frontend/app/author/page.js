'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, getToken } from '@/lib/api';

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
  first: '', last: '', email: '', phone: '', password: '',
  accountTitle: '', accountNumber: '', iban: '', agree: false
};

const GENRES = ['Fantasy', 'Mystery', 'Poetry', 'Anthology', 'Science Fiction', 'Young Adult Fiction', 'Memoir'];

const EMPTY_SUB = {
  title: '', author_name: '', category: 'Fantasy', pages: '', price: '', description: ''
};

export default function AuthorPage() {
  const router = useRouter();
  const [tab, setTab] = useState('register');
  const [reg, setReg] = useState(EMPTY_REG);
  const [regErr, setRegErr] = useState('');
  const [regOk, setRegOk] = useState('');
  const [regBusy, setRegBusy] = useState(false);
  const [login, setLogin] = useState({ email: '', password: '' });
  const [loginErr, setLoginErr] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);

  // Signed-in author + their submissions
  const [me, setMe] = useState(null);
  const [myBooks, setMyBooks] = useState([]);
  const [sub, setSub] = useState(EMPTY_SUB);
  const [coverFile, setCoverFile] = useState(null);
  const [subErr, setSubErr] = useState('');
  const [subOk, setSubOk] = useState('');
  const [subBusy, setSubBusy] = useState(false);

  useEffect(() => {
    if (!getToken()) return undefined;
    let alive = true;
    api.getMe()
      .then((r) => {
        if (alive) setMe(r.user);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!me || tab !== 'submit') return undefined;
    let alive = true;
    api.getMyBooks()
      .then((rows) => {
        if (alive) setMyBooks(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [me, tab]);

  const setSubField = (k) => (e) => setSub((prev) => ({ ...prev, [k]: e.target.value }));

  const set = (k) => (e) =>
    setReg((prev) => ({ ...prev, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  async function submitRegister(e) {
    e.preventDefault();
    setRegErr('');
    setRegOk('');
    if (!reg.first.trim() || !reg.last.trim()) return setRegErr('Please enter your first and last name.');
    if (!reg.email.includes('@')) return setRegErr('Please enter a valid account email.');
    if (!/^[0-9+\-\s()]{7,}$/.test(reg.phone.trim())) return setRegErr('Please enter a valid phone number.');
    if (reg.password.length < 8) return setRegErr('Password must be at least 8 characters.');
    if (!reg.accountTitle.trim() || !reg.accountNumber.trim())
      return setRegErr('Please complete your payment account details.');
    if (!reg.agree) return setRegErr('Please agree to the Terms of Service and Privacy Policy.');
    setRegBusy(true);
    try {
      await api.registerAuthor({
        name: `${reg.first.trim()} ${reg.last.trim()}`,
        email: reg.email.trim(),
        password: reg.password,
        phone: reg.phone.trim(),
        account_title: reg.accountTitle.trim(),
        account_number: reg.accountNumber.trim(),
        iban: reg.iban.trim() || null,
      });
      setReg(EMPTY_REG);
      setRegOk('Application received — your author perks activate once an admin approves your account.');
      setLogin((p) => ({ ...p, email: reg.email.trim() }));
      setSub((p) => ({ ...p, author_name: `${reg.first.trim()} ${reg.last.trim()}`.trim() }));
    } catch (err) {
      setRegErr(err.message || 'Registration failed');
    } finally {
      setRegBusy(false);
    }
  }

  async function submitLogin(e) {
    e.preventDefault();
    setLoginErr('');
    if (!login.email.trim()) return setLoginErr('Please enter your email address.');
    if (!login.password) return setLoginErr('Please enter your password.');
    setLoginBusy(true);
    try {
      const result = await api.login({ email: login.email.trim(), password: login.password });
      const role = result?.user?.role;
      if (role === 'author' || role === 'admin') {
        window.dispatchEvent(
          new CustomEvent('lg-toast', { detail: `Welcome back, ${result.user.name}!` })
        );
        if (role === 'admin') {
          router.push('/adminpanelcode');
          return;
        }
        setMe(result.user);
        setSub((p) => ({ ...p, author_name: p.author_name || result.user.name || '' }));
        setTab('submit');
        return;
      }
      // Logged in, but not an approved author — do not leave them in a confusing state
      api.logout();
      setLoginErr('This account has not been approved as an author yet. Check back once your application is reviewed.');
    } catch (err) {
      setLoginErr(err.message || 'Login failed');
    } finally {
      setLoginBusy(false);
    }
  }

  async function submitBook(e) {
    e.preventDefault();
    setSubErr('');
    setSubOk('');
    if (!sub.title.trim()) return setSubErr('Please enter your book title.');
    if (!sub.author_name.trim()) return setSubErr('Please enter the author name to print on the cover.');
    if (sub.pages !== '' && !(Number(sub.pages) >= 1)) return setSubErr('Pages must be a positive number.');
    if (sub.price !== '' && !(Number(sub.price) >= 0)) return setSubErr('Price must be a number.');
    setSubBusy(true);
    try {
      let image = null;
      if (coverFile) {
        if (!/^image\/(jpeg|png|webp)$/.test(coverFile.type))
          throw new Error('Cover must be a JPG, PNG, or WebP image.');
        if (coverFile.size > 8 * 1024 * 1024) throw new Error('Cover image must be under 8MB.');
        const up = await api.uploadFile(coverFile, 'cover');
        image = up.url || null;
      }
      await api.submitBook({
        title: sub.title.trim(),
        author_name: sub.author_name.trim(),
        category: sub.category,
        description: sub.description.trim() || undefined,
        pages: sub.pages !== '' ? Number(sub.pages) : undefined,
        price: sub.price !== '' ? Number(sub.price) : undefined,
        image,
      });
      setSub((p) => ({ ...EMPTY_SUB, author_name: p.author_name }));
      setCoverFile(null);
      e.target.reset();
      setSubOk('Submitted! An admin reviews every manuscript before it appears in the store.');
      const rows = await api.getMyBooks();
      setMyBooks(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setSubErr(err.message || 'Submission failed');
    } finally {
      setSubBusy(false);
    }
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
                className={`rounded-md px-5 py-2 text-sm font-medium transition-colors ${
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
                className={`rounded-md px-5 py-2 text-sm font-medium transition-colors ${
                  tab === 'login' ? 'bg-ink text-white' : 'text-ink/60 hover:text-ink'
                }`}
              >
                Author Sign In
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'submit'}
                onClick={() => setTab('submit')}
                className={`rounded-md px-5 py-2 text-sm font-medium transition-colors ${
                  tab === 'submit' ? 'bg-ink text-white' : 'text-ink/60 hover:text-ink'
                }`}
              >
                Submit a Book
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
                <PasswordField label="Password" hint="At least 8 characters — used for logging in." value={reg.password} onChange={set('password')} autoComplete="new-password" />

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

                {regOk && (
                  <div role="status" className="rounded-lg border border-primary/40 bg-primary/5 px-4 py-3 space-y-2">
                    <p className="text-sm text-ink/80">{regOk}</p>
                    <button
                      type="button"
                      onClick={() => setTab('login')}
                      className="text-sm font-semibold text-primary hover:underline"
                    >
                      Sign in now →
                    </button>
                  </div>
                )}
                {regErr && <p role="alert" className="text-sm text-error">{regErr}</p>}

                <button
                  type="submit"
                  disabled={regBusy}
                  className={`w-full rounded-md text-sm font-medium px-[18px] py-[12px] transition-colors ${
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
          ) : tab === 'login' ? (
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
                  <Link
                    href="/forgot-password"
                    className="text-ink/55 hover:text-primary transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>

                {loginErr && <p role="alert" className="text-sm text-error">{loginErr}</p>}

                <button
                  type="submit"
                  disabled={loginBusy}
                  className={`w-full rounded-md text-sm font-medium px-[18px] py-[12px] transition-colors ${
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
          ) : (
            <>
              <p className="mt-6 text-center font-mono text-[11px] tracking-[0.1em] uppercase text-primary">Manuscript</p>
              <h1 className="mt-2 text-center font-display text-3xl md:text-4xl font-bold tracking-tight">
                Submit a book
              </h1>

              {!me ? (
                <div className="mt-7 rounded-lg border border-border bg-muted/50 p-6 text-center space-y-3">
                  <p className="text-sm leading-relaxed text-ink/70">
                    Sign in to your author account to submit a manuscript and track its review status.
                  </p>
                  <button
                    type="button"
                    onClick={() => setTab('login')}
                    className="rounded-md bg-ink text-white text-sm font-medium px-[18px] py-[10px] hover:bg-primary transition-colors"
                  >
                    Author sign in
                  </button>
                </div>
              ) : (
                <>
                  <p className="mt-3 text-center text-sm text-ink/60">
                    Signed in as <span className="font-medium text-ink">{me.name}</span>. Every submission is
                    reviewed by an editor before publication.
                  </p>

                  <form onSubmit={submitBook} className="mt-7 space-y-4" noValidate>
                    <Field
                      label="Book Title"
                      placeholder="The Paper Kingdom"
                      value={sub.title}
                      onChange={setSubField('title')}
                    />
                    <Field
                      label="Author Name"
                      hint="Exactly as it should appear on the cover."
                      placeholder="Zoya Rahman"
                      value={sub.author_name}
                      onChange={setSubField('author_name')}
                    />
                    <label className="block">
                      <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-ink/50">Genre</span>
                      <select
                        value={sub.category}
                        onChange={setSubField('category')}
                        className="mt-1.5 w-full rounded-full border border-border bg-surface px-[18px] py-[11px] text-sm outline-none focus:border-ink cursor-pointer"
                      >
                        {GENRES.map((g) => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </label>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <Field
                        label="Pages"
                        placeholder="180"
                        inputMode="numeric"
                        value={sub.pages}
                        onChange={setSubField('pages')}
                      />
                      <Field
                        label="Retail Price (PKR)"
                        placeholder="1499"
                        inputMode="decimal"
                        value={sub.price}
                        onChange={setSubField('price')}
                      />
                    </div>
                    <label className="block">
                      <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-ink/50">
                        Synopsis
                      </span>
                      <textarea
                        rows={4}
                        value={sub.description}
                        onChange={setSubField('description')}
                        placeholder="What is your book about?"
                        className="mt-1.5 w-full rounded-lg border border-border bg-surface px-[18px] py-[11px] text-sm outline-none focus:border-ink transition-colors resize-y"
                      />
                    </label>
                    <label className="block">
                      <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-ink/50">
                        Cover Image
                      </span>
                      <span className="block text-xs text-ink/45 mt-0.5 leading-relaxed">
                        JPG, PNG or WebP, up to 8MB. Optional — our designers can create one for you.
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(ev) => setCoverFile(ev.target.files?.[0] || null)}
                        className="mt-1.5 block w-full text-sm text-ink/65 file:mr-3 file:rounded-md file:border-0 file:bg-ink file:text-white file:text-sm file:font-medium file:px-4 file:py-[9px] file:cursor-pointer"
                      />
                    </label>

                    {subOk && (
                      <p role="status" className="rounded-lg border border-primary/40 bg-primary/5 px-4 py-3 text-sm text-ink/80">
                        {subOk}
                      </p>
                    )}
                    {subErr && <p role="alert" className="text-sm text-error">{subErr}</p>}

                    <button
                      type="submit"
                      disabled={subBusy}
                      className={`w-full rounded-md text-sm font-medium px-[18px] py-[12px] transition-colors ${
                        subBusy ? 'bg-muted text-ink/40 cursor-wait' : 'bg-ink text-white hover:bg-primary'
                      }`}
                    >
                      {subBusy ? 'Submitting…' : 'Submit for review'}
                    </button>
                  </form>

                  <div className="mt-9 border-t border-border pt-6">
                    <p className="font-mono text-[11px] tracking-[0.08em] uppercase text-ink/50 mb-3">
                      Your submissions
                    </p>
                    {myBooks.length === 0 ? (
                      <p className="text-sm text-ink/50">Nothing submitted yet.</p>
                    ) : (
                      <ul className="space-y-2.5">
                        {myBooks.map((b) => (
                          <li
                            key={b.id}
                            className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3"
                          >
                            <span className="min-w-0">
                              <span className="block text-sm font-medium truncate">{b.title}</span>
                              <span className="block text-xs text-ink/50">{b.category}</span>
                            </span>
                            <span
                              className={`shrink-0 font-mono text-[10px] tracking-[0.06em] uppercase rounded-full px-2.5 py-1 ${
                                b.is_published ? 'bg-primary/10 text-primary' : 'bg-muted text-ink/55'
                              }`}
                            >
                              {b.is_published ? 'Published' : 'Pending review'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <p className="mt-6 text-center text-sm text-ink/50">
                    <Link href="/books" className="font-medium text-ink hover:text-primary transition-colors">
                      Browse published books
                    </Link>
                  </p>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
