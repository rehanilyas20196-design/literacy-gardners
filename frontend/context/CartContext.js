'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';

const CartContext = createContext(null);

function load(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(load('lg-cart', []));
    setWishlist(load('lg-wishlist', []));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem('lg-cart', JSON.stringify(items));
  }, [items, hydrated]);

  useEffect(() => {
    if (hydrated) localStorage.setItem('lg-wishlist', JSON.stringify(wishlist));
  }, [wishlist, hydrated]);

  const addItem = useCallback((book, qty = 1) => {
    setItems((prev) => {
      const id = book.id;
      const existing = prev.find((i) => i.id === id);
      if (existing) {
        return prev.map((i) => (i.id === id ? { ...i, qty: i.qty + qty } : i));
      }
      return [
        ...prev,
        {
          id: book.id,
          slug: book.slug,
          title: book.title,
          author_name: book.author_name,
          price: book.sale_price ?? book.price,
          listPrice: book.price,
          cover_class: book.cover_class,
          ornament: book.ornament,
          qty
        }
      ];
    });
    setDrawerOpen(true);
  }, []);

  const removeItem = useCallback((id) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const setQty = useCallback((id, qty) => {
    setItems((prev) =>
      qty <= 0 ? prev.filter((i) => i.id !== id) : prev.map((i) => (i.id === id ? { ...i, qty } : i))
    );
  }, []);

  const toggleWishlist = useCallback((id) => {
    setWishlist((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const count = items.reduce((s, i) => s + i.qty, 0);
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);

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
        hydrated
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
