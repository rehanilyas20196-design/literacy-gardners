'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useCart } from '@/context/CartContext';
import { api, getToken } from '@/lib/api';

const BOOKS_DROP = [
  { href: '/publications', label: 'All Publications' },
  { href: '/publications?sort=rating', label: 'Best Sellers' },
  { href: '/publications?category=Fantasy', label: 'Fantasy' },
  { href: '/publications?category=Mystery', label: 'Mystery' },
  { href: '/publications?category=Poetry', label: 'Poetry' },
  { href: '/publications?category=Anthology', label: 'Anthologies' }
];

const CLUB_DROP = [
  { href: '/about', label: 'About Us' },
  { href: '/team', label: 'Our Team' },
  { href: '/faqs', label: 'FAQs' },
  { href: '/contact', label: 'Contact' }
];

function Dropdown({ label, items, open, setOpen }) {
  const ref = useRef(null);
  const pathname = usePathname();

  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [setOpen]);

  return (
    <div ref={ref} className={`nav-dropdown relative ${open ? 'open' : ''} pb-3`}>
      <button
        type="button"
        className="flex items-center gap-1 text-sm font-medium text-ink hover:text-primary transition-colors px-1 py-2"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="true"
      >
        {label}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div className="nav-dropdown-panel" role="menu">
        {items.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            role="menuitem"
            onClick={() => setOpen(false)}
            className={pathname === it.href ? 'bg-muted' : ''}
          >
            {it.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDrop, setOpenDrop] = useState(null);
  const [mobileAcc, setMobileAcc] = useState(null);
  const [userDrop, setUserDrop] = useState(false);
  const userRef = useRef(null);
  const { count, setDrawerOpen, hydrated } = useCart();
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (token) {
      api.getMe()
        .then((res) => {
          setUser(res.user);
          setChecking(false);
        })
        .catch(() => {
          setChecking(false);
        });
    } else {
      setChecking(false);
    }
  }, []);

  const handleLogout = () => {
    api.logout();
    setUser(null);
    setUserDrop(false);
    router.push('/');
  };

  useEffect(() => {
    function onDoc(e) {
      if (userDrop && userRef.current && !userRef.current.contains(e.target)) setUserDrop(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [userDrop]);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 12);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setOpenDrop(null);
  }, [pathname]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') {
        setOpenDrop(null);
        setMobileOpen(false);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <header
      className={`sticky top-0 z-[100] transition-colors duration-200 ${
        scrolled ? 'bg-surface border-b border-border' : 'bg-transparent border-b border-transparent'
      }`}
    >
      <nav className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <img src="/website logo.png" alt="Literacy Gardeners" className="w-10 h-10 select-none" />
          <span className="leading-tight">
            <span className="block text-[15px] font-semibold tracking-tight text-ink">Literacy Gardeners</span>
            <span className="block font-mono text-[10px] tracking-[0.08em] text-ink/50 uppercase">Grow · Write · Publish</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-7">
          <Dropdown
            label="Publication"
            items={BOOKS_DROP}
            open={openDrop === 'books'}
            setOpen={(v) => setOpenDrop(v ? 'books' : null)}
          />
          <Dropdown
            label="Club"
            items={CLUB_DROP}
            open={openDrop === 'club'}
            setOpen={(v) => setOpenDrop(v ? 'club' : null)}
          />
          <Link href="/get-published" className="text-sm font-medium text-ink hover:text-primary transition-colors">
            Get Published
          </Link>
        </div>

        <div className="hidden md:flex items-center gap-3">
          {checking ? null : user ? (
            <div ref={userRef} className="relative group">
              <button
                onClick={() => setUserDrop((v) => !v)}
                aria-label="Account"
                aria-haspopup="true"
                className="flex items-center justify-center w-8 h-8 rounded-full bg-ink text-white text-xs font-bold"
              >
                {(user.name || user.email || 'U').charAt(0).toUpperCase()}
              </button>
              {userDrop && (
                <div className="absolute right-0 mt-2 w-48 bg-surface border border-border rounded-xl shadow-lg py-2 z-50">
                  <div className="px-4 py-2 border-b border-border/50">
                    <p className="text-xs font-medium text-ink">{user.name || 'Account'}</p>
                    <p className="text-[10px] text-ink/50 truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-between px-4 py-2 text-sm text-error hover:bg-red-50 transition-colors"
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="text-sm font-medium text-ink hover:text-primary transition-colors"
            >
              Sign in
            </Link>
          )}
          <Link
            href="/get-published"
            className="inline-flex items-center rounded-md bg-ink text-white text-sm font-medium px-[18px] py-[10px] hover:bg-primary transition-colors"
          >
            Get Started
          </Link>
          <button
            type="button"
            aria-label="Open cart"
            onClick={() => setDrawerOpen(true)}
            className="relative w-9 h-9 grid place-items-center rounded-full hover:bg-muted transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M6 6h15l-1.5 9h-12z" strokeLinejoin="round" />
              <path d="M6 6L5 3H2" strokeLinecap="round" />
              <circle cx="9" cy="20" r="1" fill="currentColor" />
              <circle cx="18" cy="20" r="1" fill="currentColor" />
            </svg>
            {hydrated && count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-primary text-white text-[10px] font-semibold grid place-items-center">
                {count}
              </span>
            )}
          </button>
        </div>

        <div className="flex md:hidden items-center gap-1">
          <button
            type="button"
            aria-label="Open cart"
            onClick={() => setDrawerOpen(true)}
            className="relative w-9 h-9 grid place-items-center"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M6 6h15l-1.5 9h-12z" strokeLinejoin="round" />
              <path d="M6 6L5 3H2" strokeLinecap="round" />
              <circle cx="9" cy="20" r="1" fill="currentColor" />
              <circle cx="18" cy="20" r="1" fill="currentColor" />
            </svg>
            {hydrated && count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-primary text-white text-[10px] font-semibold grid place-items-center">
                {count}
              </span>
            )}
          </button>
          <button
            type="button"
            aria-label="Menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(!mobileOpen)}
            className="w-9 h-9 grid place-items-center"
          >
            <span className="sr-only">Menu</span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              {mobileOpen ? (
                <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
              ) : (
                <>
                  <path d="M3 6h14" strokeLinecap="round" />
                  <path d="M3 10h14" strokeLinecap="round" />
                  <path d="M3 14h14" strokeLinecap="round" />
                </>
              )}
            </svg>
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-surface">
          <div className="px-6 py-3">
            <button
              type="button"
              className="w-full flex items-center justify-between py-3 text-sm font-medium"
              onClick={() => setMobileAcc(mobileAcc === 'books' ? null : 'books')}
              aria-expanded={mobileAcc === 'books'}
            >
              Publication
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
            <div className={`acc-panel ${mobileAcc === 'books' ? 'open' : ''}`}>
              <div>
                <div className="pl-3 pb-2 border-l border-border ml-1">
                  {BOOKS_DROP.map((it) => (
                    <Link key={it.href} href={it.href} className="block py-2 text-sm text-ink/75">
                      {it.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              className="w-full flex items-center justify-between py-3 text-sm font-medium"
              onClick={() => setMobileAcc(mobileAcc === 'club' ? null : 'club')}
              aria-expanded={mobileAcc === 'club'}
            >
              Club
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
            <div className={`acc-panel ${mobileAcc === 'club' ? 'open' : ''}`}>
              <div>
                <div className="pl-3 pb-2 border-l border-border ml-1">
                  {CLUB_DROP.map((it) => (
                    <Link key={it.href} href={it.href} className="block py-2 text-sm text-ink/75">
                      {it.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {checking ? null : user ? (
              <button
                onClick={handleLogout}
                className="block py-3 text-sm font-medium border-t border-border text-error"
              >
                Log out
              </button>
            ) : (
              <Link href="/login" className="block py-3 text-sm font-medium border-t border-border">
                Sign in
              </Link>
            )}
            <Link href="/get-published" className="block py-3 text-sm font-medium border-t border-border">
              Get Published
            </Link>
            <Link
              href="/get-published"
              className="mt-2 mb-4 inline-flex w-full justify-center rounded-md bg-ink text-white text-sm font-medium px-[18px] py-[12px]"
            >
              Get Started
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
