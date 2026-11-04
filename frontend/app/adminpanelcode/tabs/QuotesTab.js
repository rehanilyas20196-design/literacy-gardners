'use client';

import { useMemo, useState } from 'react';
import { api } from '@/lib/api';
import {
  Badge,
  ConfirmDialog,
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

const STATUSES = ['pending', 'reviewed', 'sent'];
const PAGE_SIZE = 10;

const STATUS_TONE = { pending: 'danger', reviewed: 'info', sent: 'success' };

export default function QuotesTab({ quotes, setQuotes, refreshStats }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const counts = useMemo(() => {
    const c = { all: quotes.length };
    STATUSES.forEach((s) => { c[s] = quotes.filter((q) => q.status === s).length; });
    return c;
  }, [quotes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return quotes.filter((item) => {
      if (!item) return false;
      if (status !== 'all' && item.status !== status) return false;
      if (!q) return true;
      return [item.name, item.email, item.book_title, item.phone, item.notes].some((v) =>
        String(v || '').toLowerCase().includes(q)
      );
    });
  }, [quotes, query, status]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  function changeStatus(id, next) {
    const previous = quotes.find((q) => q.id === id)?.status;
    setQuotes((prev) => prev.map((q) => (q.id === id ? { ...q, status: next } : q)));
    if (viewing && viewing.id === id) setViewing((v) => ({ ...v, status: next }));
    api
      .updateQuoteStatus(id, next)
      .then(() => toast('Quote status updated.'))
      .catch((err) => {
        setQuotes((prev) =>
          prev.map((q) => (q.id === id ? { ...q, status: previous } : q))
        );
        toast(err.message || 'Failed to update status');
      });
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await api.deleteQuote(deleting.id);
      setQuotes((prev) => prev.filter((q) => q.id !== deleting.id));
      if (viewing?.id === deleting.id) setViewing(null);
      toast('Quote deleted.');
      setDeleting(null);
      refreshStats();
    } catch (err) {
      toast(err.message || 'Failed to delete quote');
    } finally {
      setBusy(false);
    }
  }

  const fileLink = (href, label) =>
    href ? (
      <a href={href} download className={`${btn.linkPrimary} mr-3`}>
        {label}
      </a>
    ) : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SearchInput
          value={query}
          onChange={(v) => { setQuery(v); setPage(1); }}
          placeholder="Search name, email or book title…"
          className="w-full lg:max-w-sm"
        />
        <div className="flex flex-wrap items-center gap-2">
          <FilterChips
            value={status}
            onChange={(v) => { setStatus(v); setPage(1); }}
            options={[
              { value: 'all', label: 'All', count: counts.all },
              ...STATUSES.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1), count: counts[s] })),
            ]}
          />
          <button
            type="button"
            className={btn.secondary}
            onClick={() =>
              exportCsv(
                'quote-requests.csv',
                filtered.map((q) => ({
                  id: q.id,
                  name: q.name,
                  email: q.email,
                  phone: q.phone,
                  book_title: q.book_title,
                  pages: q.pages,
                  editing_level: q.editing_level,
                  formatting_level: q.formatting_level,
                  delivery_timeline: q.delivery_timeline,
                  addons: q.addons,
                  extra_copies: q.extra_copies,
                  estimated_total: q.estimated_total,
                  status: q.status,
                  created_at: q.created_at,
                }))
              )
            }
          >
            ↓ CSV
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title={quotes.length === 0 ? 'No quote requests yet' : 'No quotes match your filters'}
          hint="Publishing quote requests from the site appear here."
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-[10px] font-mono uppercase tracking-wider text-ink/45">
                <th className="px-4 py-3 font-semibold text-ink">ID</th>
                <th className="px-4 py-3 font-semibold text-ink">Client</th>
                <th className="px-4 py-3 font-semibold text-ink">Book</th>
                <th className="px-4 py-3 font-semibold text-ink">Estimate</th>
                <th className="px-4 py-3 font-semibold text-ink">Received</th>
                <th className="px-4 py-3 font-semibold text-ink">Status</th>
                <th className="px-4 py-3 font-semibold text-ink">Files</th>
                <th className="px-4 py-3 text-right font-semibold text-ink">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((q) => (
                <tr key={q.id} className="border-b border-border/50 transition-colors last:border-0 hover:bg-muted/50">
                  <td className="px-4 py-3.5 font-mono text-xs text-ink/50">{q.id}</td>
                  <td className="px-4 py-3.5">
                    <div className="text-sm font-medium text-ink">{q.name}</div>
                    <div className="text-xs text-ink/50">{q.email}</div>
                  </td>
                  <td className="max-w-[180px] px-4 py-3.5">
                    <div className="truncate text-sm text-ink/70" title={q.book_title}>
                      {q.book_title}
                    </div>
                    <div className="font-mono text-[10px] text-ink/40">{q.pages || 0} pages</div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-sm font-medium text-ink">
                    {q.estimated_total ? fmtPKR(q.estimated_total) : '—'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 font-mono text-[11px] text-ink/50">
                    {formatDate(q.created_at)}
                  </td>
                  <td className="px-4 py-3.5">
                    <select
                      value={q.status || 'pending'}
                      onChange={(e) => changeStatus(q.id, e.target.value)}
                      aria-label="Quote status"
                      className="rounded-lg border border-border bg-surface px-2 py-1 text-xs font-medium text-ink outline-none focus:border-primary"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5">
                    <Badge tone={STATUS_TONE[q.status] || 'neutral'}>
                      {[q.manuscript_file, q.front_cover_file, q.back_cover_file].filter(Boolean).length} attached
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-right">
                    <button type="button" className={`${btn.linkPrimary} mr-3`} onClick={() => setViewing(q)}>
                      View
                    </button>
                    <button type="button" className={btn.linkDanger} onClick={() => setDeleting(q)}>
                      Delete
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
        title="Quote request"
        description={viewing ? `#${viewing.id} · received ${formatDate(viewing.created_at)}` : undefined}
        width="max-w-2xl"
      >
        {viewing && (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Detail label="Client" value={viewing.name} />
              <Detail label="Email">
                <a href={`mailto:${viewing.email}`} className="text-primary hover:underline">
                  {viewing.email}
                </a>
              </Detail>
              <Detail label="Phone" value={viewing.phone || '—'} />
              <Detail label="Book title" value={viewing.book_title} />
              <Detail label="Pages" value={viewing.pages ?? '—'} />
              <Detail label="Estimated total" value={viewing.estimated_total ? fmtPKR(viewing.estimated_total) : '—'} />
              <Detail label="Editing level" value={viewing.editing_level || '—'} />
              <Detail label="Formatting level" value={viewing.formatting_level || '—'} />
              <Detail label="Delivery timeline" value={viewing.delivery_timeline || '—'} />
              <Detail label="Extra copies" value={viewing.extra_copies ?? 0} />
            </div>

            {viewing.addons && (
              <div>
                <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-ink/45">Add-ons</div>
                <p className="text-sm text-ink/70">{viewing.addons}</p>
              </div>
            )}

            <div>
              <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-ink/45">Notes</div>
              <p className="whitespace-pre-wrap rounded-xl border border-border bg-muted/50 p-3.5 text-sm leading-relaxed text-ink/75">
                {viewing.notes || 'No notes provided.'}
              </p>
            </div>

            <div>
              <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-ink/45">Attachments</div>
              <div className="flex flex-wrap items-center">
                {fileLink(viewing.manuscript_file, '↓ Manuscript')}
                {fileLink(viewing.front_cover_file, '↓ Front cover')}
                {fileLink(viewing.back_cover_file, '↓ Back cover')}
                {!viewing.manuscript_file && !viewing.front_cover_file && !viewing.back_cover_file && (
                  <span className="text-sm text-ink/40">No files attached.</span>
                )}
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
              <div className="flex gap-2">
                <button type="button" className={btn.secondary} onClick={() => setViewing(null)}>
                  Close
                </button>
                <a
                  href={`mailto:${viewing.email}?subject=Your publishing quote from Literacy Gardeners`}
                  className={btn.primary}
                >
                  Reply to client
                </a>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="Delete quote request?"
        message={`The request from ${deleting?.name} for "${deleting?.book_title}" and its attachments will be removed.`}
        confirmLabel="Delete"
        danger
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
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
