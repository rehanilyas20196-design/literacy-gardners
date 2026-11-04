'use client';

import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { formatPKR } from '@/lib/covers';
import Book3D, { templateForBook } from '@/components/Book3D';

export function StarRating({ rating }) {
  const value = Number(rating);
  const safe = Number.isFinite(value) ? Math.min(5, Math.max(0, value)) : 0;
  const full = Math.floor(safe);
  return (
    <span className="inline-flex items-center gap-1 text-xs text-ink/60" aria-label={`${safe} out of 5`}>
      <span className="text-primary tracking-tight" aria-hidden="true">
        {'★'.repeat(full)}
        {'☆'.repeat(Math.max(0, 5 - full))}
      </span>
      <span className="font-mono text-[11px]">{safe.toFixed(2)}</span>
    </span>
  );
}

export default function ProductCard({ book }) {
  const { addItem, wishlist, toggleWishlist } = useCart();
  const wished = wishlist.includes(book?.id);
  const soldOut = book.stock_status === 'sold_out';
  const onSale = book.sale_price != null;

  return (
    <article className="group border border-border rounded-lg bg-surface overflow-hidden flex flex-col">
      <div className="relative">
        {book.badge && (
          <span
            className={`absolute top-3 left-3 z-10 text-[11px] font-semibold px-2.5 py-1 rounded-full ${
              soldOut
                ? 'bg-ink text-white'
                : onSale || book.badge === 'Sale!'
                  ? 'bg-primary text-white'
                  : 'bg-secondary text-ink'
            }`}
          >
            {soldOut ? 'Sold out' : book.badge}
          </span>
        )}
        <button
          type="button"
          aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
          onClick={() => toggleWishlist(book.id)}
          className={`absolute top-3 right-3 z-10 w-8 h-8 grid place-items-center rounded-full border transition-colors ${
            wished ? 'bg-primary border-primary text-white' : 'bg-surface border-border text-ink/50 hover:text-ink'
          }`}
        >
          {wished ? '♥' : '♡'}
        </button>
        <Link href={`/books/${book.slug}`} className="block aspect-[3/4] bg-muted overflow-hidden">
          <div className="w-full h-full transition-transform duration-300 group-hover:scale-[1.03]">
            <Book3D
              template={book.template || templateForBook(book)}
              book={book}
              frontImage={book.image || book.cover_image}
              height="100%"
              autoRotate
              interactive={false}
            />
          </div>
        </Link>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <p className="text-xs text-ink/50 font-medium">{book.author_name}</p>
        <h3 className="mt-1 text-[15px] font-semibold leading-snug">
          <Link href={`/books/${book.slug}`} className="hover:text-primary transition-colors">
            {book.title}
          </Link>
        </h3>
        <div className="mt-2">
          <StarRating rating={book.rating} />
        </div>
        <div className="mt-3 flex items-center justify-between gap-2 pt-3 border-t border-border/70">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold">{formatPKR(book.sale_price ?? book.price)}</span>
            {onSale && (
              <span className="text-xs text-ink/40 line-through">{formatPKR(book.price)}</span>
            )}
          </div>
          <button
            type="button"
            disabled={soldOut}
            onClick={() => addItem(book)}
            className={`rounded-full text-xs font-medium px-3.5 py-2 transition-colors ${
              soldOut
                ? 'bg-muted text-ink/40 cursor-not-allowed'
                : 'bg-ink text-white hover:bg-primary'
            }`}
          >
            {soldOut ? 'Sold out' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </article>
  );
}
