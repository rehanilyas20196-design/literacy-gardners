'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { api, getToken } from '@/lib/api';
import { formatPKR } from '@/lib/covers';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clearCart, hydrated } = useCart();

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
    payment: 'cod',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [placed, setPlaced] = useState(null);

  // Prefill from the signed-in account when available (guests can still order)
  useEffect(() => {
    if (!getToken()) return;
    let alive = true;
    api
      .getMe()
      .then((res) => {
        if (!alive || !res?.user) return;
        setForm((f) => ({
          ...f,
          name: f.name || res.user.name || '',
          email: f.email || res.user.email || '',
        }));
      })
      .catch(() => {
        // not signed in — guest checkout
      });
    return () => {
      alive = false;
    };
  }, []);

  const shipping = 0;
  const total = subtotal + shipping;

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) return setError('Please enter your name.');
    if (!form.email.trim() || !form.email.includes('@')) return setError('Please enter a valid email.');
    if (!form.address.trim()) return setError('Please enter a delivery address.');
    if (!items.length) return setError('Your cart is empty.');
    setBusy(true);
    try {
      const order = await api.createOrder({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        address: form.address.trim(),
        notes: form.notes.trim() || null,
        items: items.map((i) => ({ slug: i.slug, qty: i.qty, price: i.price })),
        subtotal,
        shipping,
        total,
        payment_method: form.payment,
      });
      clearCart();
      setPlaced(order.order);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.message || 'Could not place the order');
    } finally {
      setBusy(false);
    }
  }

  if (placed) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 grid place-items-center text-3xl text-primary">
          ✓
        </div>
        <h1 className="mt-6 font-display text-4xl font-bold tracking-tight">Order placed</h1>
        <p className="mt-3 text-ink/60">
          Thanks, {placed.name} — we&apos;ll email <span className="font-medium text-ink">{placed.email}</span>{' '}
          when your order is confirmed.
        </p>
        <div className="mt-8 card p-6 text-left space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-ink/50">Order ID</span>
            <span className="font-mono">{placed.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink/50">Items</span>
            <span className="font-medium">
              {placed.items.reduce((s, i) => s + i.qty, 0)} × books
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink/50">Total</span>
            <span className="font-semibold">{formatPKR(placed.total)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink/50">Payment</span>
            <span className="font-medium uppercase">{placed.payment_method === 'bank_transfer' ? 'Bank transfer' : 'Cash on delivery'}</span>
          </div>
        </div>
        {placed.payment_method === 'bank_transfer' && (
          <div className="mt-4 card p-6 text-left text-sm text-ink/70 space-y-2">
            <p className="font-semibold text-ink">Bank transfer instructions</p>
            <p>
              Transfer {formatPKR(placed.total)} to the Literacy Gardeners account mentioned in your
              confirmation email, using your order ID ({placed.id.slice(0, 8)}) as the reference.
              We&apos;ll ship once the payment lands.
            </p>
          </div>
        )}
        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
          <Link
            href="/publications"
            className="rounded-md bg-ink px-6 py-3 text-sm font-medium text-white hover:bg-primary transition-colors"
          >
            Keep browsing
          </Link>
          <Link
            href="/"
            className="rounded-md border border-border px-6 py-3 text-sm font-medium hover:bg-muted transition-colors"
          >
            Back home
          </Link>
        </div>
      </div>
    );
  }

  if (hydrated && items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="font-display text-4xl font-bold tracking-tight">Your cart is empty</h1>
        <p className="mt-3 text-ink/60">Add a few books before checking out.</p>
        <Link
          href="/publications"
          className="mt-8 inline-block rounded-md bg-ink px-6 py-3 text-sm font-medium text-white hover:bg-primary transition-colors"
        >
          Browse publications
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <p className="font-mono text-[11px] tracking-[0.1em] uppercase text-primary">Checkout</p>
      <h1 className="mt-2 font-display text-4xl font-bold tracking-tight">Complete your order</h1>

      <form onSubmit={submit} className="mt-10 grid lg:grid-cols-[1fr_360px] gap-10" noValidate>
        <div className="space-y-6">
          <div className="card p-6 space-y-4">
            <h2 className="font-display text-xl font-bold">Contact & delivery</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-ink/50">Full name *</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  autoComplete="name"
                  className="mt-1.5 w-full rounded-full border border-border bg-surface px-[18px] py-[11px] text-sm outline-none focus:border-ink transition-colors"
                />
              </label>
              <label className="block">
                <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-ink/50">Email *</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  autoComplete="email"
                  className="mt-1.5 w-full rounded-full border border-border bg-surface px-[18px] py-[11px] text-sm outline-none focus:border-ink transition-colors"
                />
              </label>
            </div>
            <label className="block">
              <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-ink/50">Phone (optional)</span>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                autoComplete="tel"
                className="mt-1.5 w-full rounded-full border border-border bg-surface px-[18px] py-[11px] text-sm outline-none focus:border-ink transition-colors"
              />
            </label>
            <label className="block">
              <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-ink/50">Delivery address *</span>
              <textarea
                rows={3}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                autoComplete="street-address"
                placeholder="House, street, city, postal code"
                className="mt-1.5 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-ink transition-colors resize-y"
              />
            </label>
            <label className="block">
              <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-ink/50">Order notes (optional)</span>
              <textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Gift message, delivery instructions…"
                className="mt-1.5 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-ink transition-colors resize-y"
              />
            </label>
          </div>

          <div className="card p-6 space-y-4">
            <h2 className="font-display text-xl font-bold">Payment method</h2>
            {[
              {
                id: 'cod',
                title: 'Cash on delivery',
                note: 'Pay when your books arrive. Available nationwide.',
              },
              {
                id: 'bank_transfer',
                title: 'Bank transfer',
                note: 'Account details arrive with your order confirmation email.',
              },
            ].map((opt) => (
              <label key={opt.id} className="cursor-pointer block">
                <input
                  type="radio"
                  name="payment"
                  checked={form.payment === opt.id}
                  onChange={() => setForm({ ...form, payment: opt.id })}
                  className="sr-only peer"
                />
                <div
                  className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${
                    form.payment === opt.id ? 'border-primary bg-primary/5' : 'border-border hover:border-ink/30'
                  }`}
                >
                  <div
                    className={`w-5 h-5 mt-0.5 rounded-full border-2 shrink-0 ${
                      form.payment === opt.id ? 'bg-primary border-primary' : 'border-border'
                    }`}
                  />
                  <div>
                    <span className="block text-sm font-medium text-ink">{opt.title}</span>
                    <span className="text-xs text-ink/50">{opt.note}</span>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Order summary */}
        <aside className="lg:sticky lg:top-24 h-fit card p-6 space-y-4">
          <h2 className="font-display text-xl font-bold">Order summary</h2>
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.id} className="flex justify-between gap-3 text-sm">
                <span className="text-ink/70 line-clamp-1">
                  {item.title} <span className="text-ink/40">× {item.qty}</span>
                </span>
                <span className="font-medium shrink-0">
                  {formatPKR((Number(item.price) || 0) * (Number(item.qty) || 0))}
                </span>
              </li>
            ))}
          </ul>
          <div className="border-t border-border pt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-ink/60">Subtotal</span>
              <span>{formatPKR(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink/60">Shipping</span>
              <span className="text-green-600 font-medium">Free</span>
            </div>
            <div className="flex justify-between text-base font-semibold pt-2 border-t border-border">
              <span>Total</span>
              <span>{formatPKR(total)}</span>
            </div>
          </div>

          {error && (
            <p role="alert" className="text-sm text-error bg-red-50 px-4 py-2 rounded-lg border border-red-100">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || !hydrated}
            className={`w-full rounded-md text-sm font-medium px-[18px] py-[12px] transition-colors ${
              busy ? 'bg-muted text-ink/40 cursor-wait' : 'bg-ink text-white hover:bg-primary'
            }`}
          >
            {busy ? 'Placing order…' : 'Place order'}
          </button>
          <p className="text-xs text-ink/45 text-center leading-relaxed">
            Prices are confirmed by our team before shipping. No card details are collected on this site.
          </p>
          <button
            type="button"
            onClick={() => router.back()}
            className="w-full text-xs text-ink/45 hover:text-ink transition-colors"
          >
            ← Keep shopping
          </button>
        </aside>
      </form>
    </div>
  );
}
