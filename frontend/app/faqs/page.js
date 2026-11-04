'use client';

import { useMemo, useState } from 'react';
import Reveal from '@/components/Reveal';

const FAQS = [
  {
    id: 'join',
    category: 'Getting Started',
    q: 'Who can join Literacy Gardeners?',
    a: 'Any young aspiring writer. Most of our students are school and college students, but we welcome anyone under 25 who wants to learn and publish.'
  },
  {
    id: 'started',
    category: 'Getting Started',
    q: 'How do I get started?',
    a: 'Hit Get Published, send us a short note about your writing, and we will guide you through the next step — workshop, competition, or direct mentorship.'
  },
  {
    id: 'competitions',
    category: 'Competitions',
    q: 'How do competitions work?',
    a: 'We run intra-class, intra-school, and public competitions. We handle topic selection, editing, cover design, and publishing for top entries. Selected participants pay only the entry fee.'
  },
  {
    id: 'cost',
    category: 'Publishing',
    q: 'What does it cost to get published?',
    a: 'Our charges are the lowest compared to competitors. Workshop fees are priced for students, and competition winners publish at no extra cost beyond the entry fee.'
  },
  {
    id: 'teachers',
    category: 'Workshops',
    q: 'Who teaches the workshops?',
    a: 'Published authors and writers with mastery of the craft. The club is co-founded and run by a published author herself.'
  },
  {
    id: 'formats',
    category: 'Publishing',
    q: 'What formats do you publish in?',
    a: 'Print anthologies, individual paperbacks, and digital editions. Format depends on the project and what suits the work best.'
  }
];

const CATEGORIES = ['All', ...Array.from(new Set(FAQS.map((f) => f.category)))];

export default function FAQsPage() {
  const [open, setOpen] = useState(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return FAQS.filter((f) => {
      const matchCat = activeCategory === 'All' || f.category === activeCategory;
      const matchTerm = f.q.toLowerCase().includes(term) || f.a.toLowerCase().includes(term);
      return matchCat && matchTerm;
    });
  }, [search, activeCategory]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-16 md:py-24">
      <section className="mb-16 text-center">
        <Reveal>
          <p className="font-mono text-[11px] tracking-[0.1em] uppercase text-primary mb-3 inline-block">FAQs</p>
          <h1 className="font-display text-[40px] md:text-[56px] font-bold tracking-tight leading-[1.1] text-ink mb-6 max-w-3xl mx-auto">
            Questions, answered.
          </h1>
          <p className="text-lg md:text-xl leading-relaxed text-ink/65 max-w-xl mx-auto">
            Everything you need to know about joining, competing, and getting published with Literacy Gardeners.
          </p>
        </Reveal>

        <Reveal delay={100}>
          <div className="mt-10 flex flex-wrap justify-center gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`rounded-md px-4 py-1.5 text-xs font-medium transition-all ${
                  activeCategory === cat
                    ? 'bg-ink text-white'
                    : 'bg-surface text-ink/60 border border-border hover:bg-muted hover:text-ink'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </Reveal>
      </section>

      <section>
        <Reveal delay={150}>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-ink/30">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search questions…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-surface text-sm text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            />
          </div>
        </Reveal>

        {filtered.length === 0 ? (
          <div className="mt-12 py-16 text-center border border-border rounded-2xl bg-muted">
            <p className="text-ink/50 text-lg">No questions match your search or filter.</p>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setActiveCategory('All');
              }}
              className="mt-4 text-sm text-primary underline underline-offset-4 hover:text-ink"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div className="mt-12 border-t border-border">
            {filtered.map((f) => (
              <div key={f.id} className="border-b border-border last:border-0">
                <button
                  type="button"
                  className="w-full flex items-center justify-between gap-4 py-6 text-left transition-all"
                  onClick={() => setOpen(open === f.id ? null : f.id)}
                  aria-expanded={open === f.id}
                >
                  <div className="flex-1">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-primary/70 block mb-1">
                      {f.category}
                    </span>
                    <span className="text-base font-medium text-ink">{f.q}</span>
                  </div>
                  <span
                    className={`text-primary text-lg shrink-0 transition-transform duration-200 ${
                      open === f.id ? 'rotate-45' : ''
                    }`}
                  >
                    +
                  </span>
                </button>
                <div className={`acc-panel ${open === f.id ? 'open' : ''}`}>
                  <div className="pt-4 pb-6">
                    <p className="text-sm leading-relaxed text-ink/65">{f.a}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
