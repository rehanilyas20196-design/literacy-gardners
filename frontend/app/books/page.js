'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import ProductCard from '@/components/ProductCard';
import Reveal from '@/components/Reveal';

const FALLBACK_CATS = ['All', 'Fantasy', 'Mystery', 'Poetry', 'Anthology', 'Science Fiction', 'Young Adult Fiction', 'Memoir'];

const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'rating', label: 'Top rated' },
  { value: 'popular', label: 'Most popular' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'title', label: 'Title A–Z' }
];

function BooksInner() {
  const searchParams = useSearchParams();
  const [books, setBooks] = useState([]);
  const [cats, setCats] = useState(FALLBACK_CATS);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState(searchParams.get('category') || 'All');
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest');
  const [q, setQ] = useState('');

  // Filters live in the URL, so re-navigating to /books?category=… on the same
  // route must re-apply them (the initial state alone only runs once).
  const urlCategory = searchParams.get('category') || 'All';
  const urlSort = searchParams.get('sort') || 'newest';
  const urlKey = `${urlCategory}|${urlSort}`;
  const [lastUrlKey, setLastUrlKey] = useState(urlKey);
  if (urlKey !== lastUrlKey) {
    setLastUrlKey(urlKey);
    if (urlCategory !== category) setCategory(urlCategory);
    if (urlSort !== sort) setSort(urlSort);
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { sort };
      if (category && category !== 'All') params.category = category;
      if (q.trim()) params.q = q.trim();
      const data = await api.getBooks(params);
      setBooks(data);
    } catch {
      setBooks([]);
    } finally {
      setLoading(false);
    }
  }, [category, sort, q]);

  useEffect(() => {
    const t = setTimeout(load, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  useEffect(() => {
    api.getCategories().then((c) => {
      if (c?.length) setCats(['All', ...c]);
    }).catch(() => {});
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-6 py-14">
      <Reveal>
        <p className="font-mono text-[11px] tracking-[0.1em] uppercase text-primary mb-3">Publications</p>
        <h1 className="font-display text-4xl md:text-[45px] font-bold tracking-tight">All Books</h1>
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
          aria-label="Sort books"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {cats.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={`rounded-md border px-4 py-1.5 text-sm font-medium transition-colors ${
              category === c
                ? 'bg-ink text-white border-ink'
                : 'bg-surface text-ink/70 border-border hover:border-ink'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-16 text-center font-mono text-sm text-ink/40">Loading books…</p>
      ) : books.length === 0 ? (
        <p className="mt-16 text-center text-ink/50">No books match your filters.</p>
      ) : (
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {books.map((b, i) => (
            <Reveal key={b.id} delay={(i % 4) * 60}>
              <ProductCard book={b} />
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BooksPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center font-mono text-sm text-ink/40">Loading…</div>}>
      <BooksInner />
    </Suspense>
  );
}
