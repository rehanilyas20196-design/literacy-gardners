'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, getToken } from '@/lib/api';
import { formatPKR } from '@/lib/covers';
import { useCart } from '@/context/CartContext';
import { StarRating } from '@/components/ProductCard';
import Book3D, { templateForBook } from '@/components/Book3D';

const BOOK_INFO = [
  ['Page Count', '92'],
  ['Paper Colour', 'Cream'],
  ['Paper Weight', '70gsm'],
  ['Book Size', 'A5'],
  ['Book Category', 'Single Title'],
  ['Binding Type', 'Perfect Bound'],
  ['Cover Type', 'Paperback'],
  ['Language(s)', 'English'],
  ['Author Count', '1'],
  ['ISBN', '978-627-7968-15-1'],
  ['Publication Date', '26-09-2026'],
  ['Publisher', 'Literacy Gardeners']
];

function Stars({ n, className = '' }) {
  const full = Math.round(Number(n) || 0);
  return (
    <span className={`text-primary tracking-tight ${className}`} aria-label={`${full} out of 5 stars`}>
      {'★'.repeat(full)}
      {'☆'.repeat(Math.max(0, 5 - full))}
    </span>
  );
}

export default function BookDetailPage({ params }) {
  const { slug } = use(params);
  const [book, setBook] = useState(null);
  const [related, setRelated] = useState([]);
  const [err, setErr] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewStats, setReviewStats] = useState(null);
  const [myReview, setMyReview] = useState(null);
  const [canReview, setCanReview] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [fTitle, setFTitle] = useState('');
  const [fText, setFText] = useState('');
  const [fRating, setFRating] = useState(5);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewNotice, setReviewNotice] = useState('');
  const { addItem, wishlist, toggleWishlist } = useCart();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const b = await api.getBookBySlug(slug);
        if (!alive) return;
        setBook(b);

        api
          .getBookReviews(b.id)
          .then((data) => {
            if (!alive) return;
            setReviews(data.reviews || []);
            setReviewStats(data.stats || null);
          })
          .catch(() => {});

        if (getToken()) {
          setCanReview(true);
          api
            .getMyReview(b.id)
            .then((res) => {
              if (alive) setMyReview(res.review || null);
            })
            .catch(() => {});
        }

        const all = await api.getBooks({ category: b.category });
        if (alive) setRelated(all.filter((x) => x.id !== b.id).slice(0, 4));
      } catch {
        if (alive) setErr(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [slug]);

  if (err) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-24 text-center">
        <h1 className="font-display text-3xl font-bold">Book not found</h1>
        <Link href="/books" className="mt-4 inline-block text-sm font-medium hover:text-primary">
          ← Back to all books
        </Link>
      </div>
    );
  }

  if (!book) {
    return <div className="py-24 text-center font-mono text-sm text-ink/40">Loading…</div>;
  }

  const soldOut = book.stock_status === 'sold_out';
  const wished = wishlist.includes(book.id);
  const ratingAverage = Number(reviewStats?.average ?? book.rating ?? 0) || 0;

  async function submitReview(e) {
    e.preventDefault();
    setReviewError('');
    setReviewNotice('');
    if (!fText.trim()) {
      setReviewError('Please write your review before submitting.');
      return;
    }
    setReviewBusy(true);
    try {
      const res = await api.postReview(book.id, {
        rating: fRating,
        title: fTitle.trim() || null,
        body: fText.trim(),
      });
      setMyReview(res.review || null);
      setReviewNotice(
        'Thanks! Your review is awaiting moderation and will appear here once approved.'
      );
      setFTitle('');
      setFText('');
      setFRating(5);
      setShowForm(false);
      window.dispatchEvent(new CustomEvent('lg-toast', { detail: 'Review submitted for approval.' }));
    } catch (err) {
      setReviewError(err.message || 'Could not submit your review');
    } finally {
      setReviewBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <nav className="text-sm text-ink/50 mb-8" aria-label="Breadcrumb">
        <Link href="/books" className="hover:text-ink">Books</Link>
        <span className="mx-2">/</span>
        <span className="text-ink">{book.title}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-12 items-start">
        <div className="border border-border rounded-lg overflow-hidden bg-muted aspect-[3/4] max-w-md">
          <Book3D
            template={templateForBook(book)}
            book={book}
            height="100%"
            autoRotate
            interactive
          />
        </div>

        <div>
          {book.badge && (
            <span
              className={`inline-block text-[11px] font-semibold px-2.5 py-1 rounded-full mb-4 ${
                soldOut ? 'bg-ink text-white' : book.sale_price != null ? 'bg-primary text-white' : 'bg-secondary text-ink'
              }`}
            >
              {soldOut ? 'Sold out' : book.badge}
            </span>
          )}
          <p className="text-sm text-ink/50 font-medium">{book.author_name}</p>
          <h1 className="mt-2 font-display text-3xl md:text-[37px] font-bold tracking-tight leading-tight">
            {book.title}
          </h1>
          <div className="mt-3">
            <StarRating rating={book.rating} />
          </div>

          <div className="mt-6 flex items-baseline gap-3">
            <span className="text-2xl font-semibold">{formatPKR(book.sale_price ?? book.price)}</span>
            {book.sale_price != null && (
              <span className="text-base text-ink/40 line-through">{formatPKR(book.price)}</span>
            )}
          </div>

          <p className="mt-6 text-[16px] leading-relaxed text-ink/65">{book.description}</p>

          <section className="mt-8 border border-border rounded-lg overflow-hidden">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink/50 bg-muted px-5 py-4 border-b border-border">
              Book Information
            </h2>
            <dl className="divide-y divide-border">
              {BOOK_INFO.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-4 px-5 py-3">
                  <dt className="text-sm text-ink/55">{k}</dt>
                  <dd className="text-sm font-semibold text-right">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={soldOut}
              onClick={() => addItem(book)}
              className={`rounded-md text-sm font-medium px-[18px] py-[12px] transition-colors ${
                soldOut
                  ? 'bg-muted text-ink/40 cursor-not-allowed'
                  : 'bg-ink text-white hover:bg-primary'
              }`}
            >
              {soldOut ? 'Sold out' : 'Add to Cart'}
            </button>
            <button
              type="button"
              onClick={() => toggleWishlist(book.id)}
              className={`rounded-md border text-sm font-medium px-[18px] py-[12px] transition-colors ${
                wished ? 'bg-primary border-primary text-white' : 'bg-surface border-border hover:border-ink'
              }`}
            >
              {wished ? '♥ Wishlisted' : '♡ Wishlist'}
            </button>
            <Link
              href="/get-published"
              className="rounded-md bg-secondary text-ink text-sm font-medium px-[18px] py-[12px] hover:bg-secondary/70 transition-colors"
            >
              Get Published
            </Link>
          </div>
        </div>
      </div>

      {/* REVIEWS */}
      <section className="mt-20 pt-12 border-t border-border">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] tracking-[0.1em] uppercase text-primary mb-3">What readers say</p>
            <h2 className="font-display text-2xl font-bold tracking-tight">Reader Reviews</h2>
            <div className="mt-2 flex items-center gap-2 text-sm text-ink/60">
              <Stars n={reviewStats?.average ?? book.rating} />
              <span className="font-mono text-xs">
                {ratingAverage.toFixed(2)} · {reviewStats?.count ?? reviews.length} review
                {(reviewStats?.count ?? reviews.length) === 1 ? '' : 's'}
              </span>
            </div>
          </div>
          {canReview ? (
            <button
              type="button"
              onClick={() => setShowForm((v) => !v)}
              className="rounded-md bg-ink text-white text-sm font-medium px-[18px] py-[12px] hover:bg-primary transition-colors"
              aria-expanded={showForm}
            >
              {myReview ? 'Edit your review' : 'Write a review'}
            </button>
          ) : (
            <Link
              href="/login"
              className="rounded-md border border-border bg-surface text-sm font-medium px-[18px] py-[12px] hover:border-ink transition-colors"
            >
              Sign in to review
            </Link>
          )}
        </div>

        {myReview && (
          <p className="mt-4 text-sm text-ink/60">
            Your review is{' '}
            <span className="font-semibold text-ink">{myReview.status}</span>
            {myReview.status === 'approved' ? ' and visible below.' : ' — it appears here once an admin approves it.'}
          </p>
        )}
        {reviewNotice && (
          <p role="status" className="mt-4 text-sm text-primary">{reviewNotice}</p>
        )}

        {showForm && canReview && (
          <form onSubmit={submitReview} className="mt-6 border border-border rounded-lg bg-muted p-5 grid gap-3 sm:grid-cols-2">
            <input
              type="text"
              value={fTitle}
              onChange={(e) => setFTitle(e.target.value)}
              placeholder="Review title (optional)"
              className="rounded-full border border-border bg-surface px-[18px] py-[10px] text-sm outline-none focus:border-ink transition-colors"
            />
            <div className="flex items-center gap-1 sm:justify-end" role="radiogroup" aria-label="Your rating">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={fRating === s}
                  onClick={() => setFRating(s)}
                  className={`text-xl leading-none transition-colors ${s <= fRating ? 'text-primary' : 'text-ink/25 hover:text-ink/50'}`}
                  aria-label={`${s} star${s > 1 ? 's' : ''}`}
                >
                  ★
                </button>
              ))}
            </div>
            <textarea
              value={fText}
              onChange={(e) => setFText(e.target.value)}
              placeholder="Share your thoughts about this book…"
              required
              rows={4}
              className="sm:col-span-2 rounded-lg border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-ink transition-colors resize-y"
            />
            {reviewError && (
              <p role="alert" className="sm:col-span-2 text-sm text-error">{reviewError}</p>
            )}
            <div className="sm:col-span-2 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={reviewBusy}
                className={`rounded-md text-sm font-medium px-[18px] py-[10px] transition-colors ${
                  reviewBusy ? 'bg-muted text-ink/40 cursor-wait' : 'bg-ink text-white hover:bg-primary'
                }`}
              >
                {reviewBusy ? 'Submitting…' : 'Submit review'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-md border border-border bg-surface text-sm font-medium px-[18px] py-[10px] hover:border-ink transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {reviewError && !showForm && (
          <p role="alert" className="mt-4 text-sm text-error">{reviewError}</p>
        )}

        {reviews.length === 0 ? (
          <p className="mt-8 rounded-lg border border-border bg-muted/50 px-5 py-8 text-center text-sm text-ink/50">
            No approved reviews yet — be the first to share your thoughts.
          </p>
        ) : (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {reviews.map((r) => (
              <article key={r.id} className="border border-border rounded-lg bg-surface p-5">
                <div className="flex items-center justify-between gap-3">
                  <Stars n={r.rating} className="text-base" />
                  <span className="font-mono text-[11px] text-ink/40">
                    {new Date(r.created_at).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                {r.title && <p className="mt-3 text-sm font-semibold text-ink">{r.title}</p>}
                <p className="mt-2 text-sm leading-relaxed text-ink/70">{r.body}</p>
                <p className="mt-4 pt-3 border-t border-border/70 text-sm font-semibold">
                  {r.user_name || 'Reader'}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      {related.length > 0 && (
        <section className="mt-20 pt-12 border-t border-border">
          <h2 className="font-display text-2xl font-bold tracking-tight mb-8">More in {book.category}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {related.map((r) => (
              <RelatedCard key={r.id} book={r} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function RelatedCard({ book }) {
  const { addItem } = useCart();

  return (
    <article className="border border-border rounded-lg overflow-hidden bg-surface group">
      <Link href={`/books/${book.slug}`} className="block aspect-[3/4] bg-muted overflow-hidden">
        <div className="w-full h-full transition-transform duration-300 group-hover:scale-[1.03]">
          <Book3D
            template={templateForBook(book)}
            book={book}
            height="100%"
            autoRotate
            interactive={false}
          />
        </div>
      </Link>
      <div className="p-4">
        <p className="text-xs text-ink/50">{book.author_name}</p>
        <h3 className="mt-1 text-sm font-semibold">
          <Link href={`/books/${book.slug}`} className="hover:text-primary transition-colors">{book.title}</Link>
        </h3>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm font-semibold">{formatPKR(book.sale_price ?? book.price)}</span>
          <button
            type="button"
            onClick={() => addItem(book)}
            className="rounded-md bg-ink text-white text-xs font-medium px-3 py-1.5 hover:bg-primary transition-colors"
          >
            Add
          </button>
        </div>
      </div>
    </article>
  );
}
