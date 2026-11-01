import Link from 'next/link';
import Reveal from '@/components/Reveal';

export const metadata = { title: 'About Us — Literacy Gardeners' };

const STATS = [
  { value: '120+', label: 'Young authors mentored' },
  { value: '35+', label: 'Books published' },
  { value: '15+', label: 'Competitions hosted' },
  { value: 'Student-priced', label: 'Lowest-cost path to print' }
];

const BELIEFS = [
  { n: '01', t: 'Every young voice deserves to be read.', d: 'We publish based on merit, not on who can pay the most.' },
  { n: '02', t: 'Mentorship matters more than gatekeeping.', d: 'Established writers guide new ones from first draft to finished book.' },
  { n: '03', t: 'Publishing should not require wealth.', d: 'Our fees are built for students, not corporate budgets.' },
  { n: '04', t: 'Competitions should build careers, not just prizes.', d: 'Top entries go to anthologies and real print formats.' }
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
      {/* Hero */}
      <section className="mb-20 text-center">
        <Reveal>
          <p className="font-mono text-[11px] tracking-[0.1em] uppercase text-primary mb-3 inline-block">
            About Us
          </p>
          <h1 className="font-display text-[40px] md:text-[56px] font-bold tracking-tight leading-[1.1] text-ink mb-6 max-w-3xl mx-auto">
            A youth-led club with a publishing house inside it.
          </h1>
          <p className="text-lg md:text-xl leading-relaxed text-ink/65 max-w-xl mx-auto">
            Literacy Gardeners is made by well-published and established writers for new aspiring writers.
            Our mission is guardianship — not just lessons, but a real path to see your work in print.
          </p>
        </Reveal>

        <Reveal delay={100}>
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 border border-border rounded-2xl p-8 md:p-12 bg-surface">
            {STATS.map((s, i) => (
              <div key={s.label} className="stat border-r border-border/50 last:border-0">
                <div className="value">{s.value}</div>
                <div className="label">{s.label}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* What we believe */}
      <section className="mb-20">
        <div className="section-header">
          <Reveal>
            <span className="kicker">Our beliefs</span>
          </Reveal>
          <Reveal delay={60}>
            <h2>What we believe</h2>
          </Reveal>
          <Reveal delay={120}>
            <p>
              We are ourselves a publishing company. Students get the roadmap of publishing, and top
              competition entries go all the way to anthologies and other formats. Writers only have to do
              their favorite thing: write.
            </p>
          </Reveal>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {BELIEFS.map((b, i) => (
            <Reveal key={b.n} delay={i * 80}>
              <div className="card p-6">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-ink text-white grid place-items-center font-display text-xs font-bold">
                    {b.n}
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold text-ink leading-tight">{b.t}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink/65">{b.d}</p>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Mission card */}
      <section className="mb-20">
        <Reveal>
          <div className="card p-8 md:p-12 grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="font-display text-3xl md:text-[40px] font-bold tracking-tight text-ink mb-4">
                Since our audience is mostly students
              </h2>
              <p className="text-lg leading-relaxed text-ink/65 mb-6">
                every service is priced for them. Our charges are the lowest compared to competitors —
                a model designed so the most deserving authors get published more.
              </p>
              <ul className="space-y-3 text-sm text-ink/60">
                <li className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">✓</span>
                  Workshops priced for students
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">✓</span>
                  Winners publish at no extra cost beyond entry fee
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">✓</span>
                  Editing, cover design, and distribution handled
                </li>
              </ul>
            </div>
            <div className="hidden md:block">
              <div className="relative h-48 w-48 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 animate-pulse">
                <span className="text-[60px] font-display font-bold text-ink/10 select-none">LG</span>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* CTA */}
      <section className="border-t border-border pt-16">
        <div className="text-center">
          <Reveal>
            <p className="font-mono text-[11px] tracking-[0.1em] uppercase text-primary mb-3 inline-block">
              Ready to start?
            </p>
            <h2 className="font-display text-3xl md:text-[40px] font-bold tracking-tight text-ink mb-6 max-w-xl mx-auto">
              Join the club of published writers.
            </h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/get-published"
                className="btn-primary"
              >
                Get Published
              </Link>
              <Link
                href="/team"
                className="btn-outline"
              >
                Meet the team
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
