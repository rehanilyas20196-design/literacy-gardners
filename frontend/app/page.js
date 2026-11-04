'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import BookShowcase3D from '@/components/BookShowcase3D';
import ProductCard from '@/components/ProductCard';
import Reveal from '@/components/Reveal';

const FALLBACK = [
  {
    id: 1,
    title: 'Death Before Breakfast',
    slug: 'death-before-breakfast',
    author_name: 'George Bellairs',
    category: 'Mystery & Crime',
    image: '/images/animationimages/3.jfif',
    template: 'hardcover',
    cover_class: 'c1',
    ornament: '◈',
    pages: 284,
    rating: 4.9,
    year: 2026,
    copies_sold: 9400,
    price: 1500,
    sale_price: null,
    stock_status: 'in_stock',
    badge: 'Bestseller',
    is_best_seller: 1,
    best_seller_rank: 1,
    description: 'A gripping, atmospheric mystery unfolding in the misty morning streets of Paris.'
  },
  {
    id: 2,
    title: 'The Beauty Within',
    slug: 'the-beauty-within',
    author_name: 'Samantha Donald',
    category: 'Poetry & Reflection',
    image: '/images/animationimages/5.png',
    template: 'paperback',
    cover_class: 'c4',
    ornament: '❀',
    pages: 148,
    rating: 5.0,
    year: 2026,
    copies_sold: 8100,
    price: 1299,
    sale_price: null,
    stock_status: 'in_stock',
    badge: 'Editor’s Choice',
    is_best_seller: 1,
    best_seller_rank: 2,
    description: 'A delicate yet fierce anthology of contemporary verse exploring grace and identity.'
  },
  {
    id: 3,
    title: 'Of Witches and Cows',
    slug: 'of-witches-and-cows',
    author_name: 'L.R. Bakker',
    category: 'Fantasy Adventure',
    image: '/images/animationimages/6.jfif',
    template: 'spiral',
    cover_class: 'c3',
    ornament: '✿',
    pages: 310,
    rating: 4.8,
    year: 2025,
    copies_sold: 7200,
    price: 1499,
    sale_price: null,
    stock_status: 'in_stock',
    badge: 'Trending',
    is_best_seller: 1,
    best_seller_rank: 3,
    description: 'A whimsical and spellbinding highland fantasy where ancient folklore and arcane secrets collide.'
  },
  {
    id: 4,
    title: 'The Raven King',
    slug: 'the-raven-king',
    author_name: 'Maggie Stiefvater',
    category: 'YA Fantasy',
    image: '/images/animationimages/7.jfif',
    template: 'hardcover',
    cover_class: 'c2',
    ornament: '✦',
    pages: 368,
    rating: 5.0,
    year: 2026,
    copies_sold: 7600,
    price: 1799,
    sale_price: 1499,
    stock_status: 'in_stock',
    badge: 'Sale!',
    is_best_seller: 1,
    best_seller_rank: 4,
    description: 'The breathtaking culmination of destiny, slumbering kings, and fiercely loyal young friends.'
  },
  {
    id: 5,
    title: 'Who Am I?',
    slug: 'who-am-i',
    author_name: 'Michelle Rice-Gauvreau',
    category: 'Memoir & True Story',
    image: '/images/animationimages/9.jpg',
    template: 'hardcover',
    cover_class: 'c5',
    ornament: '○',
    pages: 232,
    rating: 4.9,
    year: 2025,
    copies_sold: 6800,
    price: 1650,
    sale_price: null,
    stock_status: 'in_stock',
    badge: 'Award Winner',
    is_best_seller: 1,
    best_seller_rank: 5,
    description: 'A moving and resilient true story of tracing ancestral roots and discovering healing.'
  },
  {
    id: 6,
    title: 'Create Your Own Business',
    slug: 'create-your-own-business',
    author_name: 'James Murdor',
    category: 'Leadership & Guide',
    image: '/images/animationimages/10.jpg',
    template: 'paperback',
    cover_class: 'c6',
    ornament: '✧',
    pages: 196,
    rating: 4.9,
    year: 2026,
    copies_sold: 5400,
    price: 1850,
    sale_price: null,
    stock_status: 'in_stock',
    badge: 'Must Read',
    is_best_seller: 1,
    best_seller_rank: 6,
    description: 'A clear, inspiring blueprint empowering ambitious youth to turn visionary ideas into enterprises.'
  }
];

const STEPS = [
  { n: '01', title: 'Learn', text: 'Guided lessons and workshops led by published authors.' },
  { n: '02', title: 'Compete', text: 'Intra-class, intra-school and public writing competitions.' },
  { n: '03', title: 'Create', text: 'We handle editing, cover design and formatting for you.' },
  { n: '04', title: 'Publish', text: 'Your work goes to print as anthologies and more formats.' }
];

const STATS = [
  { value: '120+', label: 'Young authors mentored' },
  { value: '35+', label: 'Books published' },
  { value: '15+', label: 'Competitions hosted' },
  { value: '₨', label: 'Lowest-cost path to print' }
];

const TRUST = ['City School', 'Beaconhouse', 'LUMS Soc', 'Writers Guild', 'Indus Press', 'Young Pen'];

const COLORS = [
  { accent: '#9f1239', spine: '#4c0519' },
  { accent: '#1d4ed8', spine: '#172554' },
  { accent: '#0284c7', spine: '#082f49' },
  { accent: '#4f46e5', spine: '#1e1b4b' },
  { accent: '#d97706', spine: '#451a03' },
  { accent: '#334155', spine: '#0f172a' },
];

// Only these cover images actually exist in /public/images/animationimages —
// the old `idx % 8 + 3` formula produced 404s for 4/8.
const FALLBACK_IMAGES = [
  '/images/animationimages/3.jfif',
  '/images/animationimages/5.png',
  '/images/animationimages/6.jfif',
  '/images/animationimages/7.jfif',
  '/images/animationimages/9.jpg',
  '/images/animationimages/10.jpg',
];

function mapToShowcase(book, idx) {
  const c = COLORS[idx % COLORS.length];
  return {
    id: book.id,
    title: book.title,
    author: book.author_name,
    role: book.badge || 'Young Author',
    category: book.category,
    badge: book.badge || 'New',
    year: String(book.year ?? ''),
    pages: book.pages,
    rating: book.rating,
    description: book.description,
    image: book.image || FALLBACK_IMAGES[idx % FALLBACK_IMAGES.length],
    accentColor: c.accent,
    spineColor: c.spine,
    slug: book.slug,
  };
}

export default function HomePage() {
  const [best, setBest] = useState([]);
  const [showcaseBooks, setShowcaseBooks] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const bs = await api.getBestSellers(6);
        if (!alive) return;
        setBest(bs.length ? bs : FALLBACK);
        const all = await api.getBooks();
        if (!alive) return;
        setShowcaseBooks(all.map(mapToShowcase));
      } catch {
        if (!alive) return;
        setBest(FALLBACK);
        setShowcaseBooks(FALLBACK.map(mapToShowcase));
      } finally {
        if (alive) setLoaded(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <>
      {/* HERO */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 pt-20 pb-16 md:pt-28 md:pb-20 text-center">
          <Reveal>
            <span className="inline-block bg-primary text-white font-display text-lg md:text-[22px] leading-none px-3 py-1.5 -rotate-1 select-none">
              Publishing House
            </span>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="mt-8 font-display text-[40px] leading-[1.12] md:text-[56px] md:leading-[1.08] font-bold tracking-tight max-w-3xl mx-auto">
              Your voice deserves to&nbsp;bloom.
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-6 text-lg md:text-xl leading-relaxed text-ink/65 max-w-xl mx-auto font-normal">
              Literacy Gardeners is a youth-led club of published writers mentoring aspiring authors —
              from first draft to a finished book.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/get-published"
                className="inline-flex items-center rounded-md bg-ink text-white text-sm font-medium px-[18px] py-[12px] hover:bg-primary transition-colors"
              >
                Get Published
              </Link>
              <Link
                href="/books"
                className="inline-flex items-center rounded-md bg-secondary text-ink text-sm font-medium px-[18px] py-[12px] hover:bg-secondary/70 transition-colors"
              >
                Browse Books
              </Link>
              <Link
                href="/author"
                className="inline-flex items-center rounded-md bg-primary text-white text-sm font-medium px-[18px] py-[12px] hover:bg-ink transition-colors"
              >
                Register as Author
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* LOGO STRIP */}
      <section className="border-b border-border bg-muted">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <p className="text-center font-mono text-[11px] tracking-[0.1em] uppercase text-ink/40 mb-6">
            Trusted by schools &amp; young authors
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {TRUST.map((t) => (
              <span key={t} className="text-sm font-semibold text-ink/35 tracking-tight select-none">
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* BOOKS BY OUR YOUNG AUTHORS - 3D INTERACTIVE SHOWCASE */}
      <section id="books" className="border-b border-border bg-gradient-to-b from-surface via-muted/30 to-surface">
        <div className="mx-auto max-w-6xl px-6 pt-16 pb-8 text-center">
          <Reveal>
            <p className="font-mono text-[11px] tracking-[0.1em] uppercase text-primary mb-3">
              The Library · Published Titles
            </p>
            <h2 className="font-display text-3xl md:text-[40px] font-bold tracking-tight">
              Books by our young authors
            </h2>
            <p className="mt-4 text-ink/65 max-w-xl mx-auto text-base">
              Explore original published titles by talented young writers in our mentorship program.
              Drag or swipe to spin the 3D gallery, or select any title to inspect in 360°.
            </p>
          </Reveal>
        </div>

        <div className="mx-auto max-w-6xl px-6 pb-16">
          <BookShowcase3D
            books={showcaseBooks.length > 0 ? showcaseBooks : FALLBACK.map((b, i) => ({
              ...b,
              accentColor: COLORS[i % COLORS.length].accent,
              spineColor: COLORS[i % COLORS.length].spine,
            }))}
            height={560}
          />
        </div>
      </section>

      {/* WHAT WE DO */}
      <section id="what-we-do" className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-20 grid md:grid-cols-2 gap-14 items-start">
          <Reveal>
            <p className="font-mono text-[11px] tracking-[0.1em] uppercase text-primary mb-3">About the club</p>
            <h2 className="font-display text-3xl md:text-[37px] font-bold tracking-tight">What We Do?</h2>
            <div className="mt-6 space-y-4 text-[16px] leading-relaxed text-ink/65">
              <p>
                <strong className="text-ink font-semibold">Literacy Gardeners</strong> is a youth-led club made by
                well-published and established writers for new aspiring writers. We help young authors with{' '}
                <strong className="text-ink font-semibold">guardianship</strong> — lessons on how to write, and a
                real path to publish.
              </p>
              <p>
                We ourselves are a <strong className="text-ink font-semibold">publishing company</strong>. We conduct{' '}
                <strong className="text-ink font-semibold">competitions</strong> where we handle everything from topic
                selection to getting top work published in anthologies — so writers only have to do their favorite
                thing: write.
              </p>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className="border border-border rounded-lg p-8 bg-muted">
              <h3 className="text-xl font-medium">Our mission</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink/65">
                Bridge the gap between raw talent and published success — with mentorship, opportunity, and a
                community that believes every young voice deserves to be read.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {['Youth-Led', 'Publishing', 'Guardianship', 'Anthologies', 'Workshops', 'Competitions'].map((t) => (
                  <span key={t} className="rounded-full bg-surface border border-border px-3 py-1.5 text-xs font-medium">
                    {t}
                  </span>
                ))}
              </div>
              <p className="mt-6 pt-5 border-t border-border text-sm text-ink/60">
                Selected competition participants pay <strong className="text-ink">nothing beyond the entry fee</strong> —
                we cover the entire publishing process.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* STEPS */}
      <section className="border-b border-border bg-muted">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <Reveal>
            <p className="font-mono text-[11px] tracking-[0.1em] uppercase text-primary mb-3 text-center">How it works</p>
            <h2 className="font-display text-3xl md:text-[37px] font-bold tracking-tight text-center">
              Zero friction. Real books.
            </h2>
          </Reveal>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 80}>
                <div className="border border-border rounded-lg bg-surface p-6 h-full">
                  <span className="font-mono text-xs text-primary tracking-[0.08em]">{s.n}</span>
                  <h3 className="mt-3 text-lg font-medium">{s.title}</h3>
                  <p className="mt-2 text-sm text-ink/60 leading-relaxed">{s.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-16 grid grid-cols-2 lg:grid-cols-4 gap-8">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 60} className="text-center">
              <div className="font-display text-4xl md:text-5xl font-bold">{s.value}</div>
              <div className="mt-2 text-sm text-ink/55">{s.label}</div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* BEST SELLERS */}
      <section id="bestsellers" className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
              <div>
                <p className="font-mono text-[11px] tracking-[0.1em] uppercase text-primary mb-3">Reader favorites</p>
                <h2 className="font-display text-3xl md:text-[37px] font-bold tracking-tight">
                  Best Selling Books
                </h2>
                <p className="mt-2 text-sm text-ink/55 font-mono tracking-[0.04em]">(Last 30 days)</p>
              </div>
              <Link
                href="/books"
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                View all →
              </Link>
            </div>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {best.map((b, i) => (
              <Reveal key={b.id} delay={i * 70}>
                <ProductCard book={b} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-20 text-center">
          <Reveal>
            <span className="inline-block bg-primary text-white font-display text-lg px-3 py-1.5 -rotate-1 select-none">
              Start writing
            </span>
            <h2 className="mt-8 font-display text-3xl md:text-[45px] font-bold tracking-tight max-w-2xl mx-auto leading-[1.15]">
              Ready to see your name on a book?
            </h2>
            <p className="mt-5 text-ink/60 max-w-lg mx-auto">
              Join Literacy Gardeners. Learn from published authors, enter competitions, and walk the path from
              draft to published — at a price built for students.
            </p>
            <div className="mt-8">
              <Link
                href="/get-published"
                className="inline-flex items-center rounded-md bg-ink text-white text-sm font-medium px-[18px] py-[12px] hover:bg-primary transition-colors"
              >
                Get Published Now
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
