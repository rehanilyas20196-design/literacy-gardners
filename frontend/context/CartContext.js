'use client';

import { createContext, useCallback, useContext, useState, useSyncExternalStore } from 'react';

const CartContext = createContext(null);

const CART_KEY = 'lg-cart';
const WISHLIST_KEY = 'lg-wishlist';

// The cart lives in a tiny external store backed by localStorage.
// useSyncExternalStore gives us a hydration-safe read: the server (and the
// hydration pass) sees an empty cart, then React re-reads the real snapshot
// immediately after subscribing — no setState-inside-an-effect.
const EMPTY_SNAPSHOT = { items: [], wishlist: [], hydrated: false };

let snapshot = EMPTY_SNAPSHOT;
let initialized = false;
const listeners = new Set();

function readList(key) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function ensureInitialized() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  snapshot = {
    items: readList(CART_KEY),
    wishlist: readList(WISHLIST_KEY),
    hydrated: true,
  };
}

function subscribe(listener) {
  ensureInitialized();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  ensureInitialized();
  return snapshot;
}

function getServerSnapshot() {
  return EMPTY_SNAPSHOT;
}

function commit(next) {
  snapshot = { ...snapshot, ...next, hydrated: true };
  try {
    if (next.items) window.localStorage.setItem(CART_KEY, JSON.stringify(next.items));
    if (next.wishlist) window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(next.wishlist));
  } catch {
    // storage full/blocked — keep the in-memory cart working
  }
  listeners.forEach((listener) => listener());
}

export function CartProvider({ children }) {
  const { items, wishlist, hydrated } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );
  const [drawerOpen, setDrawerOpen] = useState(false);

  const addItem = useCallback((book, qty = 1) => {
    const id = book.id;
    const existing = snapshot.items.find((i) => i.id === id);
    if (existing) {
      commit({
        items: snapshot.items.map((i) =>
          i.id === id ? { ...i, qty: (Number(i.qty) || 0) + qty } : i
        ),
      });
    } else {
      commit({
        items: [
          ...snapshot.items,
          {
            id,
            slug: book.slug,
            title: book.title,
            author_name: book.author_name,
            price: Number(book.sale_price ?? book.price) || 0,
            listPrice: Number(book.price) || 0,
            cover_class: book.cover_class,
            ornament: book.ornament,
            qty,
          },
        ],
      });
    }
    setDrawerOpen(true);
  }, []);

  const removeItem = useCallback((id) => {
    commit({ items: snapshot.items.filter((i) => i.id !== id) });
  }, []);

  const setQty = useCallback((id, qty) => {
    const nextQty = Number(qty) || 0;
    commit({
      items:
        nextQty <= 0
          ? snapshot.items.filter((i) => i.id !== id)
          : snapshot.items.map((i) => (i.id === id ? { ...i, qty: nextQty } : i)),
    });
  }, []);

  const toggleWishlist = useCallback((id) => {
    commit({
      wishlist: snapshot.wishlist.includes(id)
        ? snapshot.wishlist.filter((x) => x !== id)
        : [...snapshot.wishlist, id],
    });
  }, []);

  const clearCart = useCallback(() => commit({ items: [] }), []);

  const count = items.reduce((sum, i) => sum + (Number(i.qty) || 0), 0);
  const subtotal = items.reduce(
    (sum, i) => sum + (Number(i.price) || 0) * (Number(i.qty) || 0),
    0
  );

  return (
    <CartContext.Provider
      value={{
        items,
        wishlist,
        drawerOpen,
        setDrawerOpen,
        addItem,
        removeItem,
        setQty,
        toggleWishlist,
        clearCart,
        count,
        subtotal,
        hydrated,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
