'use client';

import { useMemo, useState } from 'react';
import { api } from '@/lib/api';
import {
  Badge,
  EmptyState,
  FilterChips,
  Modal,
  Pagination,
  SearchInput,
  btn,
  exportCsv,
  fmtPKR,
  formatDate,
  inputCls,
  toast,
} from '../ui';

const STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
const PAGE_SIZE = 10;

const STATUS_TONE = {
  pending: 'warning',
  confirmed: 'info',
  shipped: 'primary',
  delivered: 'success',
  cancelled: 'danger',
};

const PAYMENT_LABEL = { cod: 'Cash on delivery', bank_transfer: 'Bank transfer' };

export default function OrdersTab({ orders, setOrders, refreshStats }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState(null);

  const counts = useMemo(() => {
    const c = { all: orders.length };
    STATUSES.forEach((s) => {
      c[s] = orders.filter((o) => o.status === s).length;
    });
    return c;
  }, [orders]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((o) => {
      if (!o) return false;
      if (status !== 'all' && o.status !== status) return false;
      if (!q) return true;
      return [o.id, o.name, o.email, o.phone, o.address].some((v) =>
        String(v || '').toLowerCase().includes(q)
      );
    });
  }, [orders, query, status]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const revenue = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  function changeStatus(id, next) {
    const previous = orders.find((o) => o.id === id)?.status;
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: next } : o)));
    if (viewing && viewing.id === id) setViewing((v) => ({ ...v, status: next }));
    api
      .updateOrderStatus(id, next)
      .then(() => {
        toast('Order status updated.');
        refreshStats();
      })
      .catch((err) => {
        setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: previous } : o)));
        if (viewing && viewing.id === id) setViewing((v) => ({ ...v, status: previous }));
        toast(err.message || 'Failed to update order');
      });
  }

  const itemCount = (order) =>
    (order.items || []).reduce((sum, i) => sum + (Number(i.qty) || 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SearchInput
          value={query}
          onChange={(v) => {
            setQuery(v);
            setPage(1);
          }}
          placeholder="Search name, email, phone or order ID…"
          className="w-full lg:max-w-sm"
        />
        <div className="flex flex-wrap items-center gap-2">
          <FilterChips
            value={status}
            onChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
            options={[
              { value: 'all', label: 'All', count: counts.all },
              ...STATUSES.map((s) => ({
                value: s,
                label: s.charAt(0).toUpperCase() + s.slice(1),
                count: counts[s],
              })),
            ]}
          />
          <button
            type="button"
            className={btn.secondary}
            onClick={() =>
              exportCsv(
                'orders.csv',
                filtered.map((o) => ({
                  id: o.id,
                  name: o.name,
                  email: o.email,
                  phone: o.phone,
                  address: o.address,
                  items: itemCount(o),
                  subtotal: o.subtotal,
                  shipping: o.shipping,
                  total: o.total,
                  payment_method: o.payment_method,
                  status: o.status,
                  created_at: o.created_at,
                }))
              )
            }
          >
            ↓ CSV
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface px-4 py-3 text-xs text-ink/60">
        <span className="font-mono uppercase tracking-wider text-ink/40">Recorded revenue</span>{' '}
        <span className="ml-2 font-semibold text-ink">{fmtPKR(revenue)}</span>
        <span className="ml-2 text-ink/40">(excludes cancelled orders)</span>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title={orders.length === 0 ? 'No orders yet' : 'No orders match your filters'}
          hint="Checkout orders (cash on delivery) appear here."
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-border font-mono text-[10px] uppercase tracking-wider text-ink/45">
                <th className="px-4 py-3 font-semibold text-ink">Order</th>
                <th className="px-4 py-3 font-semibold text-ink">Customer</th>
                <th className="px-4 py-3 font-semibold text-ink">Items</th>
                <th className="px-4 py-3 font-semibold text-ink">Total</th>
                <th className="px-4 py-3 font-semibold text-ink">Payment</th>
                <th className="px-4 py-3 font-semibold text-ink">Placed</th>
                <th className="px-4 py-3 font-semibold text-ink">Status</th>
                <th className="px-4 py-3 text-right font-semibold text-ink">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr
                  key={o.id}
                  className="border-b border-border/50 transition-colors last:border-0 hover:bg-muted/50"
                >
                  <td className="px-4 py-3.5 font-mono text-xs text-ink/50">
                    {String(o.id).slice(0, 8)}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="text-sm font-medium text-ink">{o.name}</div>
                    <div className="text-xs text-ink/50">{o.email}</div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-sm text-ink/70">
                    {itemCount(o)} book{itemCount(o) === 1 ? '' : 's'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-sm font-semibold text-ink">
                    {fmtPKR(o.total)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-xs text-ink/60">
                    {PAYMENT_LABEL[o.payment_method] || o.payment_method}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 font-mono text-[11px] text-ink/50">
                    {formatDate(o.created_at)}
                  </td>
                  <td className="px-4 py-3.5">
                    <select
                      value={o.status || 'pending'}
                      onChange={(e) => changeStatus(o.id, e.target.value)}
                      aria-label="Order status"
                      className="rounded-lg border border-border bg-surface px-2 py-1 text-xs font-medium text-ink outline-none focus:border-primary"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-right">
                    <button
                      type="button"
                      className={btn.linkPrimary}
                      onClick={() => setViewing(o)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 pb-4">
            <Pagination page={current} pageCount={pageCount} onChange={setPage} />
          </div>
        </div>
      )}

      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title="Order details"
        description={viewing ? `#${viewing.id} · placed ${formatDate(viewing.created_at)}` : undefined}
        width="max-w-2xl"
      >
        {viewing && (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <Badge tone={STATUS_TONE[viewing.status] || 'neutral'}>{viewing.status}</Badge>
              <Badge>{PAYMENT_LABEL[viewing.payment_method] || viewing.payment_method}</Badge>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Detail label="Customer" value={viewing.name} />
              <Detail label="Email">
                <a href={`mailto:${viewing.email}`} className="text-primary hover:underline">
                  {viewing.email}
                </a>
              </Detail>
              <Detail label="Phone" value={viewing.phone || '—'} />
              <Detail label="Payment" value={PAYMENT_LABEL[viewing.payment_method] || viewing.payment_method} />
            </div>

            <div>
              <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-ink/45">
                Delivery address
              </div>
              <p className="whitespace-pre-wrap rounded-xl border border-border bg-muted/50 p-3.5 text-sm leading-relaxed text-ink/75">
                {viewing.address}
              </p>
            </div>

            {viewing.notes && (
              <div>
                <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-ink/45">Notes</div>
                <p className="whitespace-pre-wrap text-sm text-ink/70">{viewing.notes}</p>
              </div>
            )}

            <div>
              <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-ink/45">Items</div>
              <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
                {(viewing.items || []).map((item, idx) => (
                  <li key={`${item.slug}-${idx}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                    <span className="min-w-0 truncate text-ink/75">
                      {item.title} <span className="text-ink/40">× {item.qty}</span>
                    </span>
                    <span className="shrink-0 font-medium">
                      {fmtPKR((Number(item.price) || 0) * (Number(item.qty) || 0))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-1.5 border-t border-border pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-ink/55">Subtotal</span>
                <span>{fmtPKR(viewing.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink/55">Shipping</span>
                <span>{Number(viewing.shipping) ? fmtPKR(viewing.shipping) : 'Free'}</span>
              </div>
              <div className="flex justify-between pt-1.5 text-base font-semibold">
                <span>Total</span>
                <span>{fmtPKR(viewing.total)}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <label className="flex items-center gap-2 text-sm font-medium text-ink">
                Status
                <select
                  value={viewing.status || 'pending'}
                  onChange={(e) => changeStatus(viewing.id, e.target.value)}
                  className={`${inputCls} w-auto py-1.5`}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" className={btn.secondary} onClick={() => setViewing(null)}>
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Detail({ label, value, children }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-wider text-ink/45">{label}</div>
      <div className="mt-0.5 text-sm text-ink/80">{children || value}</div>
    </div>
  );
}
