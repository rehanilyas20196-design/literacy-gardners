'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import Reveal from '@/components/Reveal';

export default function GetPublishedPage() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [state, setState] = useState('idle');
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setState('sending');
    setError('');
    try {
      await api.submitLead({ ...form, type: 'get-published' });
      setState('sent');
      setForm({ name: '', email: '', message: '' });
      window.dispatchEvent(new CustomEvent('lg-toast', { detail: 'Application received — we will email you soon.' }));
    } catch (err) {
      setState('error');
      setError(err.message || 'Something went wrong');
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-16 grid md:grid-cols-2 gap-14">
      <Reveal>
        <span className="inline-block bg-primary text-white font-display text-lg px-3 py-1.5 -rotate-1 select-none">
          Your voice deserves to bloom
        </span>
        <h1 className="mt-8 font-display text-4xl md:text-[45px] font-bold tracking-tight leading-[1.15]">
          Ready to see your name on a book?
        </h1>
        <p className="mt-5 text-ink/65 leading-relaxed max-w-md">
          Tell us a little about your writing. We will guide you into a workshop, competition, or direct
          mentorship — whichever fits where you are right now.
        </p>
        <ul className="mt-8 space-y-3 text-sm text-ink/65">
          <li className="flex gap-3"><span className="text-primary font-mono text-xs">→</span>Workshops led by published authors</li>
          <li className="flex gap-3"><span className="text-primary font-mono text-xs">→</span>Competitions with full publishing support</li>
          <li className="flex gap-3"><span className="text-primary font-mono text-xs">→</span>Student-friendly pricing</li>
        </ul>
      </Reveal>

      <Reveal delay={120}>
        <form onSubmit={submit} className="border border-border rounded-lg p-6 md:p-8 space-y-4">
          <div>
            <label htmlFor="gp-name" className="block text-sm font-medium mb-2">Your name</label>
            <input
              id="gp-name"
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-full border border-border bg-surface px-[18px] py-[12px] text-sm outline-none focus:border-ink transition-colors"
            />
          </div>
          <div>
            <label htmlFor="gp-email" className="block text-sm font-medium mb-2">Email</label>
            <input
              id="gp-email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-full border border-border bg-surface px-[18px] py-[12px] text-sm outline-none focus:border-ink transition-colors"
            />
          </div>
          <div>
            <label htmlFor="gp-msg" className="block text-sm font-medium mb-2">About your writing</label>
            <textarea
              id="gp-msg"
              rows={5}
              placeholder="What do you write? What are you working on?"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className="w-full rounded-2xl border border-border bg-surface px-[18px] py-[14px] text-sm outline-none focus:border-ink transition-colors resize-y"
            />
          </div>
          <button
            type="submit"
            disabled={state === 'sending'}
            className="w-full rounded-full bg-ink text-white text-sm font-medium py-3 hover:bg-primary transition-colors disabled:opacity-50"
          >
            {state === 'sending' ? 'Sending…' : 'Apply to get published'}
          </button>
          {state === 'sent' && <p className="text-sm text-center text-ink/60">Application sent ✓</p>}
          {state === 'error' && <p className="text-sm text-center text-error">{error}</p>}
        </form>
      </Reveal>
    </div>
  );
}
