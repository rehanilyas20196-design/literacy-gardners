'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import Reveal from '@/components/Reveal';

const FALLBACK = [
  { id: 1, name: 'Aarohi Sen', role: 'Co-Founder · Published Author', initial: 'A', bio: 'Published novelist and mentor-in-chief. Leads curriculum, curation, and the publishing pipeline.' },
  { id: 2, name: 'Rohan Mehta', role: 'Co-Founder · Editor', initial: 'R', bio: 'Award-winning editor shaping young manuscripts into polished books.' },
  { id: 3, name: 'Sana Qureshi', role: 'Head of Workshops', initial: 'S', bio: 'Poet and educator running workshops and competitions across schools.' },
  { id: 4, name: 'Vivaan Roy', role: 'Publishing Lead', initial: 'V', bio: 'Coordinates cover design, formatting, and distribution for every winning story.' }
];

export default function TeamPage() {
  const [team, setTeam] = useState(FALLBACK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api.getTeam().then((t) => {
      if (!alive) return;
      if (t?.length) setTeam(t);
      setLoading(false);
    }).catch(() => {
      if (!alive) return;
      setLoading(false);
    });
    return () => { alive = false; };
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
      <section className="mb-20 text-center">
        <Reveal>
          <p className="font-mono text-[11px] tracking-[0.1em] uppercase text-primary mb-3 inline-block">Our people</p>
          <h1 className="font-display text-[40px] md:text-[56px] font-bold tracking-tight leading-[1.1] text-ink mb-6 max-w-3xl mx-auto">
            The People Behind Literacy Gardeners
          </h1>
          <p className="text-lg md:text-xl leading-relaxed text-ink/65 max-w-xl mx-auto">
            Established writers and published authors building the bridge for the next generation.
          </p>
        </Reveal>
      </section>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-7 h-7 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        </div>
      ) : (
        <>
          <div className="mb-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {team.map((m, i) => (
              <Reveal key={m.id} delay={i * 70} as="article" className="group">
                <div className="card p-6 flex flex-col h-full">
                  <div className="relative mb-4">
                    <div className="w-20 h-20 mx-auto rounded-full bg-ink text-white grid place-items-center font-display text-3xl font-bold shadow-lg shadow-ink/10 group-hover:shadow-ink/20 transition-shadow duration-300">
                      {m.initial || String(m.name || '?').charAt(0)}
                    </div>
                    <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 inline-block px-2 py-0.5 rounded-full bg-primary text-white text-[10px] font-mono font-semibold tracking-wider uppercase opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      {String(m.role || 'Team').split('·')[0].trim()}
                    </span>
                  </div>
                  <h2 className="text-base font-semibold text-ink text-center leading-tight">{m.name}</h2>
                  <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.08em] text-primary text-center">{m.role}</p>
                  <p className="mt-3 text-sm leading-relaxed text-ink/60 text-center flex-1">{m.bio}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <section className="border-t border-border pt-16 text-center">
            <Reveal>
              <h2 className="font-display text-3xl md:text-[40px] font-bold tracking-tight text-ink mb-6">
                Built by writers, for the next generation.
              </h2>
              <p className="text-lg leading-relaxed text-ink/65 max-w-xl mx-auto mb-10">
                Every team member is a published author who has walked the path from first draft to printed
                book — and now mentors others through it.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/about"
                  className="btn-outline"
                >
                  About us
                </Link>
                <Link
                  href="/get-published"
                  className="btn-primary"
                >
                  Get Published
                </Link>
              </div>
            </Reveal>
          </section>
        </>
      )}
    </div>
  );
}
