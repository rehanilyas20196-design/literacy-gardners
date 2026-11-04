'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import Reveal from '@/components/Reveal';

const INFO = [
  {
    label: 'Email',
    value: 'hello@literacygardeners.com',
    href: 'mailto:hello@literacygardeners.com',
    icon: '@'
  },
  {
    label: 'Phone',
    value: '+92 00000 00000',
    href: 'tel:+920000000000',
    icon: '☎'
  },
  {
    label: 'Hours',
    value: 'Mon–Sat, 10am–6pm PKT',
    icon: '⌚'
  },
  {
    label: 'Location',
    value: 'Karachi, Pakistan',
    icon: '📍'
  }
];

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [state, setState] = useState('idle');
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setState('sending');
    setError('');
    try {
      await api.submitLead({ ...form, type: 'general' });
      setState('sent');
      setForm({ name: '', email: '', message: '' });
      window.dispatchEvent(new CustomEvent('lg-toast', { detail: 'Message sent — we will reply soon.' }));
    } catch (err) {
      setState('error');
      setError(err.message || 'Something went wrong');
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-16 md:py-24 grid lg:grid-cols-2 gap-14 lg:gap-16">
      {/* Info side */}
      <Reveal>
        <div className="space-y-8">
          <div>
            <p className="font-mono text-[11px] tracking-[0.1em] uppercase text-primary mb-3 block">Contact</p>
            <h1 className="font-display text-[40px] md:text-[56px] font-bold tracking-tight leading-[1.1] text-ink mb-6">
              Say hello.
            </h1>
            <p className="text-lg leading-relaxed text-ink/65">
              Questions about workshops, competitions, or publishing? Send us a note and we will get back within a
              couple of days.
            </p>
          </div>

          <div className="space-y-5">
            {INFO.map((c) => (
              <div key={c.label} className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-display text-xl">
                  {c.icon}
                </div>
                <div>
                  <span className="font-mono text-[11px] uppercase tracking-wider text-ink/45 block">{c.label}</span>
                  {c.href ? (
                    <a href={c.href} className="text-base text-ink hover:text-primary transition-colors">
                      {c.value}
                    </a>
                  ) : (
                    <span className="text-base text-ink">{c.value}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      {/* Form side */}
      <Reveal delay={100}>
        <div className="card p-6 md:p-10">
          {state === 'sent' ? (
            <div className="text-center py-10">
              <div className="w-12 h-12 rounded-full bg-green-50 text-green-600 flex items-center justify-center mx-auto mb-4 font-bold text-xl">
                ✓
              </div>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-ink mb-3">Message sent</h2>
              <p className="text-ink/60 max-w-sm mx-auto">
                Thanks for reaching out. We will reply within a couple of days.
              </p>
              <button
                type="button"
                onClick={() => setState('idle')}
                className="mt-6 inline-flex items-center gap-2 text-sm text-primary underline underline-offset-4 hover:text-ink transition-colors"
              >
                Send another message →
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-5">
                <div className="field">
                  <label htmlFor="name">Full name</label>
                  <input
                    id="name"
                    type="text"
                    required
                    autoComplete="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
                <div className="field">
                  <label htmlFor="email">Email address</label>
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
              </div>
              <div className="field">
                <label htmlFor="message">Message</label>
                <textarea
                  id="message"
                  rows={5}
                  required
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-y"
                />
              </div>
              {error && (
                <p className="text-sm text-error bg-red-50 px-4 py-2 rounded-lg border border-red-100">{error}</p>
              )}
              <button
                type="submit"
                disabled={state === 'sending'}
                className="w-full rounded-md bg-ink text-white text-sm font-medium py-3.5 hover:bg-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {state === 'sending' ? 'Sending…' : 'Send message'}
              </button>
            </form>
          )}
        </div>
      </Reveal>
    </div>
  );
}
