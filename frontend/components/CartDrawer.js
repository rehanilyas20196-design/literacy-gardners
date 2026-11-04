'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { formatPKR } from '@/lib/covers';

export default function CartDrawer() {
  const router = useRouter();
  const { items, drawerOpen, setDrawerOpen, removeItem, setQty, subtotal, clearCart, hydrated } = useCart();

  return (
    <>
      <div
        className={`cart-backdrop ${drawerOpen ? 'open' : ''}`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
      />
      <aside
        className={`cart-drawer ${drawerOpen ? 'open' : ''}`}
        role="dialog"
        aria-label="Shopping cart"
        aria-hidden={!drawerOpen}
      >
        <div className="flex items-center justify-between px-5 h-16 border-b border-border shrink-0">
          <h2 className="text-base font-semibold">Cart</h2>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close cart"
            className="w-8 h-8 grid place-items-center rounded-full hover:bg-muted transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!hydrated || items.length === 0 ? (
            <p className="text-sm text-ink/50 mt-8 text-center">Your cart is empty.</p>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => (
                <li key={item.id} className="flex gap-3 border border-border rounded-lg p-3">
                  <div className="w-14 h-20 rounded shrink-0 bg-muted grid place-items-center text-xl">
                    {item.ornament || '📚'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={item.slug ? `/books/${item.slug}` : '/books'}
                      onClick={() => setDrawerOpen(false)}
                      className="text-sm font-semibold leading-snug line-clamp-2 hover:text-primary transition-colors"
                    >
                      {item.title}
                    </Link>
                    <p className="text-xs text-ink/50 mt-0.5">{item.author_name}</p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center border border-border rounded-full">
                        <button
                          type="button"
                          aria-label="Decrease"
                          onClick={() => setQty(item.id, item.qty - 1)}
                          className="w-7 h-7 grid place-items-center text-sm hover:bg-muted rounded-full"
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-xs font-medium">{item.qty}</span>
                        <button
                          type="button"
                          aria-label="Increase"
                          onClick={() => setQty(item.id, item.qty + 1)}
                          className="w-7 h-7 grid place-items-center text-sm hover:bg-muted rounded-full"
                        >
                          +
                        </button>
                      </div>
                      <span className="text-sm font-semibold">
                        {formatPKR((Number(item.price) || 0) * (Number(item.qty) || 0))}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="mt-2 text-xs text-ink/40 hover:text-error transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-border px-5 py-4 space-y-3 shrink-0">
            <div className="flex justify-between text-sm">
              <span className="text-ink/60">Subtotal</span>
              <span className="font-semibold">{formatPKR(subtotal)}</span>
            </div>
            <button
              type="button"
              className="w-full rounded-md bg-ink text-white text-sm font-medium py-3 hover:bg-primary transition-colors"
              onClick={() => {
                setDrawerOpen(false);
                router.push('/checkout');
              }}
            >
              Checkout
            </button>
            <button
              type="button"
              onClick={clearCart}
              className="w-full text-xs text-ink/40 hover:text-error transition-colors"
            >
              Clear cart
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
