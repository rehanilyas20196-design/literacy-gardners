'use client';

import Link from 'next/link';
import { useState } from 'react';
import { api } from '@/lib/api';

export default function Footer() {
  const [email, setEmail] = useState('');

  async function subscribe(e) {
    e.preventDefault();
    if (!email.includes('@')) return;
    try {
      await api.subscribe(email);
      setEmail('');
      window.dispatchEvent(new CustomEvent('lg-toast', { detail: 'Welcome to the garden — check your inbox.' }));
    } catch {
      window.dispatchEvent(new CustomEvent('lg-toast', { detail: 'Could not subscribe — try again.' }));
    }
  }

  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5">
              <img src="/website logo.png" alt="Literacy Gardeners" className="w-10 h-10 select-none" />
              <span className="text-[15px] font-semibold text-ink">Literacy Gardeners</span>
            </Link>
            <p className="mt-4 text-sm text-ink/60 leading-relaxed max-w-xs">
              A youth-led club of published writers mentoring the authors of tomorrow. Learn. Compete. Get published.
            </p>
            <form onSubmit={subscribe} className="mt-5 flex gap-2">
              <input
                type="email"
                required
                placeholder="Your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 min-w-0 rounded-full border border-border bg-surface px-[18px] py-[10px] text-sm outline-none focus:border-ink transition-colors"
              />
              <button
                type="submit"
                className="rounded-md bg-ink text-white text-sm font-medium px-[18px] py-[10px] hover:bg-primary transition-colors shrink-0"
              >
                Join
              </button>
            </form>
          </div>

          <div>
            <h5 className="text-sm font-semibold text-ink mb-4">Explore</h5>
            <ul className="space-y-2.5">
              <li><Link href="/books" className="text-sm text-ink/60 hover:text-ink transition-colors">All Books</Link></li>
              <li><Link href="/books?sort=rating" className="text-sm text-ink/60 hover:text-ink transition-colors">Best Sellers</Link></li>
              <li><Link href="/about" className="text-sm text-ink/60 hover:text-ink transition-colors">About</Link></li>
              <li><Link href="/team" className="text-sm text-ink/60 hover:text-ink transition-colors">Our Team</Link></li>
            </ul>
          </div>

          <div>
            <h5 className="text-sm font-semibold text-ink mb-4">Get Involved</h5>
            <ul className="space-y-2.5">
              <li><Link href="/get-published" className="text-sm text-ink/60 hover:text-ink transition-colors">Get Published</Link></li>
              <li><Link href="/faqs" className="text-sm text-ink/60 hover:text-ink transition-colors">FAQs</Link></li>
              <li><Link href="/contact" className="text-sm text-ink/60 hover:text-ink transition-colors">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h5 className="text-sm font-semibold text-ink mb-4">Contact</h5>
            <ul className="space-y-2.5">
              <li><a href="mailto:hello@literacygardeners.com" className="text-sm text-ink/60 hover:text-ink transition-colors">hello@literacygardeners.com</a></li>
              <li><a href="tel:+920000000000" className="text-sm text-ink/60 hover:text-ink transition-colors">+92 00000 00000</a></li>
              <li><a href="#" className="text-sm text-ink/60 hover:text-ink transition-colors">Instagram</a></li>
              <li><a href="#" className="text-sm text-ink/60 hover:text-ink transition-colors">LinkedIn</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-border flex flex-wrap justify-between gap-3 text-xs text-ink/45 font-mono tracking-[0.04em]">
          <span>© 2026 Literacy Gardeners</span>
          <span>Built for young authors</span>
        </div>
      </div>
    </footer>
  );
}
