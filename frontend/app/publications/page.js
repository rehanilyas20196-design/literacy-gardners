'use client';

import { useEffect, useState, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { formatPKR } from '@/lib/covers';
import ProductCard from '@/components/ProductCard';
import Reveal from '@/components/Reveal';

const FALLBACK_CATS = ['Fantasy', 'Mystery', 'Poetry', 'Anthology', 'Science Fiction', 'Young Adult Fiction', 'Memoir'];

const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'rating', label: 'Top rated' },
  { value: 'popular', label: 'Most popular' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'title', label: 'Title A–Z' }
];

const FORMATS = ['Paperback', 'Hardcover', 'eBook'];
const TAGS = [...FORMATS, 'Bestseller', 'On Sale'];

function effectivePrice(b) {
  return Number(b.sale_price ?? b.price ?? 0);
}

function tagsFor(book) {
  const tags = [FORMATS[(book.id || 0) % FORMATS.length]];
  if (book.is_best_seller) tags.push('Bestseller');
  if (book.sale_price) tags.push('On Sale');
  return tags;
}

function SectionTitle({ children }) {
  return (
    <p className="font-mono text-[11px] tracking-[0.1em] uppercase text-ink/50 mb-3">{children}</p>
  );
}

function PublicationsInner() {
  const searchParams = useSearchParams();
  const [allBooks, setAllBooks] = useState([]);
  const [cats, setCats] = useState(FALLBACK_CATS);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState(searchParams.get('category') || 'All');
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest');
  const [q, setQ] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [rawPriceRange, setRawPriceRange] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await api.getBooks({});
        if (alive) setAllBooks(Array.isArray(data) ? data : []);
      } catch {
        if (alive) setAllBooks([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    api.getCategories().then((c) => {
      if (alive && c?.length) setCats(c.filter((x) => x !== 'All'));
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const bounds = useMemo(() => {
    if (!allBooks.length) return { min: 990, max: 2190 };
    const prices = allBooks.map(effectivePrice);
    return { min: Math.floor(Math.min(...prices) / 10) * 10, max: Math.ceil(Math.max(...prices) / 10) * 10 };
  }, [allBooks]);

  const priceRange = useMemo(
    () => rawPriceRange ?? [bounds.min, bounds.max],
    [rawPriceRange, bounds.min, bounds.max]
  );

  const counts = useMemo(() => {
    const map = { All: allBooks.length };
    for (const c of cats) map[c] = 0;
    for (const b of allBooks) map[b.category] = (map[b.category] || 0) + 1;
    return map;
  }, [allBooks, cats]);

  const filtered = useMemo(() => {
    let list = allBooks;
    const term = q.trim().toLowerCase();
    if (term) {
      list = list.filter((b) =>
        [b.title, b.author_name, b.category, b.description].some((v) => String(v || '').toLowerCase().includes(term))
      );
    }
    if (category && category !== 'All') list = list.filter((b) => b.category === category);
    if (priceRange) {
      const [lo, hi] = priceRange;
      list = list.filter((b) => {
        const p = effectivePrice(b);
        return p >= lo && p <= hi;
      });
    }
    if (selectedTags.length) {
      list = list.filter((b) => {
        const t = tagsFor(b);
        return selectedTags.some((tag) => t.includes(tag));
      });
    }
    const sorted = [...list];
    switch (sort) {
      case 'rating': sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0)); break;
      case 'popular': sorted.sort((a, b) => (b.copies_sold || 0) - (a.copies_sold || 0)); break;
      case 'price_asc': sorted.sort((a, b) => effectivePrice(a) - effectivePrice(b)); break;
      case 'price_desc': sorted.sort((a, b) => effectivePrice(b) - effectivePrice(a)); break;
      case 'title': sorted.sort((a, b) => String(a.title).localeCompare(String(b.title))); break;
      default: sorted.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0) || (b.id || 0) - (a.id || 0));
    }
    return sorted;
  }, [allBooks, q, category, priceRange, selectedTags, sort]);

  const toggleTag = useCallback((tag) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }, []);

  const onMin = (e) => {
    const v = Math.min(Number(e.target.value), priceRange[1] - 10);
    setRawPriceRange([v, priceRange[1]]);
  };
  const onMax = (e) => {
    const v = Math.max(Number(e.target.value), priceRange[0] + 10);
    setRawPriceRange([priceRange[0], v]);
  };
  const pct = {
    lo: ((priceRange[0] - bounds.min) / (bounds.max - bounds.min || 1)) * 100,
    hi: ((priceRange[1] - bounds.min) / (bounds.max - bounds.min || 1)) * 100
  };

  const catList = ['All', ...cats];
  const resetAll = () => {
    setCategory('All');
    setSelectedTags([]);
    setRawPriceRange(null);
    setQ('');
  };

  const sidebar = (
    <aside className="lg:w-64 lg:shrink-0">
      <div className="lg:sticky lg:top-24 space-y-8">
        <div>
          <SectionTitle>Categories</SectionTitle>
          <ul className="space-y-1">
            {catList.map((c) => (
              <li key={c}>
                <button
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`w-full flex items-center justify-between gap-3 py-1.5 text-sm transition-colors ${
                    category === c ? 'text-primary font-semibold' : 'text-ink/70 hover:text-ink'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${category === c ? 'bg-primary' : 'bg-transparent'}`}
                      aria-hidden="true"
                    />
                    {c === 'All' ? 'Publications' : c === 'Anthology' ? 'Anthologies' : c}
                  </span>
                  <span className="font-mono text-xs text-ink/40">({counts[c] ?? 0})</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <SectionTitle>Filter By</SectionTitle>
          <div className="px-1">
            <div className="relative h-10 mt-2">
              <div className="absolute top-4 left-0 right-0 h-1 bg-border rounded-full" />
              <div
                className="absolute top-4 h-1 bg-primary rounded-full"
                style={{ left: `${pct.lo}%`, right: `${100 - pct.hi}%` }}
              />
              <input
                type="range"
                min={bounds.min}
                max={bounds.max}
                step={10}
                value={priceRange ? priceRange[0] : bounds.min}
                onChange={onMin}
                aria-label="Minimum price"
                className="price-range-input absolute top-0 left-0 w-full h-10 appearance-none bg-transparent pointer-events-none"
              />
              <input
                type="range"
                min={bounds.min}
                max={bounds.max}
                step={10}
                value={priceRange ? priceRange[1] : bounds.max}
                onChange={onMax}
                aria-label="Maximum price"
                className="price-range-input absolute top-0 left-0 w-full h-10 appearance-none bg-transparent pointer-events-none"
              />
            </div>
            <p className="mt-3 text-sm text-ink/70">
              Price: <span className="text-ink font-medium">{formatPKR(priceRange ? priceRange[0] : bounds.min)}</span>
              <span className="mx-1.5 text-ink/40">—</span>
              <span className="text-ink font-medium">{formatPKR(priceRange ? priceRange[1] : bounds.max)}</span>
            </p>
          </div>
        </div>

        <div>
          <SectionTitle>Product Tags</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                  selectedTags.includes(tag)
                    ? 'bg-ink text-white border-ink'
                    : 'bg-surface text-ink/70 border-border hover:border-ink'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={resetAll}
          className="text-sm font-medium text-primary hover:underline"
        >
          Clear all filters
        </button>
      </div>
    </aside>
  );

  return (
    <div className="mx-auto max-w-6xl px-6 py-14">
      <Reveal>
        <p className="font-mono text-[11px] tracking-[0.1em] uppercase text-primary mb-3">Publications</p>
        <h1 className="font-display text-4xl md:text-[45px] font-bold tracking-tight">All Publications</h1>
        <p className="mt-3 text-ink/60 max-w-lg">
          Every title here was mentored, edited, and published with Literacy Gardeners.
        </p>
      </Reveal>

      <div className="mt-10 flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Search title, author, genre…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="rounded-full border border-border bg-surface px-[18px] py-[10px] text-sm outline-none focus:border-ink transition-colors w-full sm:w-72"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="rounded-full border border-border bg-surface px-[18px] py-[10px] text-sm outline-none focus:border-ink cursor-pointer"
          aria-label="Sort publications"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden rounded-full border border-ink bg-ink text-white px-[18px] py-[10px] text-sm font-medium"
          aria-expanded={sidebarOpen}
        >
          {sidebarOpen ? 'Hide filters' : 'Filters'}
        </button>
        <span className="ml-auto font-mono text-xs text-ink/50" aria-live="polite">
          {loading ? '…' : `${filtered.length} result${filtered.length === 1 ? '' : 's'}`}
        </span>
      </div>

      <div className="mt-8 flex items-start gap-10">
        <div className={`${sidebarOpen ? 'block' : 'hidden'} lg:block w-full lg:w-auto`}>
          {sidebar}
        </div>

        <div className="flex-1 min-w-0">
          {loading ? (
            <p className="mt-16 text-center font-mono text-sm text-ink/40">Loading publications…</p>
          ) : filtered.length === 0 ? (
            <p className="mt-16 text-center text-ink/50">No books match your filters.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {filtered.map((b, i) => (
                <Reveal key={b.id} delay={(i % 3) * 60}>
                  <ProductCard book={b} />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PublicationsPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center font-mono text-sm text-ink/40">Loading…</div>}>
      <PublicationsInner />
    </Suspense>
  );
}
