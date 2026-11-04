'use client';

import { useMemo, useState } from 'react';
import { api } from '@/lib/api';
import {
  Badge,
  ConfirmDialog,
  EmptyState,
  FilterChips,
  Pagination,
  SearchInput,
  btn,
  formatDate,
  toast,
} from '../ui';

const STATUSES = ['pending', 'approved', 'rejected'];
const PAGE_SIZE = 10;

const STATUS_TONE = { pending: 'warning', approved: 'success', rejected: 'danger' };

function Stars({ n }) {
  const full = Math.max(0, Math.min(5, Math.round(Number(n) || 0)));
  return (
    <span className="text-primary tracking-tight" aria-label={`${full} out of 5 stars`}>
      {'★'.repeat(full)}
      {'☆'.repeat(5 - full)}
    </span>
  );
}

export default function ReviewsTab({ reviews, setReviews, refreshStats }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const counts = useMemo(() => {
    const c = { all: reviews.length };
    STATUSES.forEach((s) => {
      c[s] = reviews.filter((r) => r.status === s).length;
    });
    return c;
  }, [reviews]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reviews.filter((r) => {
      if (!r) return false;
      if (status !== 'all' && r.status !== status) return false;
      if (!q) return true;
      return [r.book_title, r.user_name, r.title, r.body].some((v) =>
        String(v || '').toLowerCase().includes(q)
      );
    });
  }, [reviews, query, status]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  function changeStatus(id, next) {
    const previous = reviews.find((r) => r.id === id)?.status;
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, status: next } : r)));
    api
      .updateReviewStatus(id, next)
      .then(() => toast(next === 'approved' ? 'Review approved.' : `Review marked ${next}.`))
      .catch((err) => {
        setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, status: previous } : r)));
        toast(err.message || 'Failed to update review');
      });
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await api.deleteReview(deleting.id);
      setReviews((prev) => prev.filter((r) => r.id !== deleting.id));
      toast('Review deleted.');
      setDeleting(null);
      refreshStats();
    } catch (err) {
      toast(err.message || 'Failed to delete review');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SearchInput
          value={query}
          onChange={(v) => {
            setQuery(v);
            setPage(1);
          }}
          placeholder="Search book, reader or review text…"
          className="w-full lg:max-w-sm"
        />
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
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title={reviews.length === 0 ? 'No reviews yet' : 'No reviews match your filters'}
          hint="Reader reviews submitted on book pages appear here for moderation."
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-border font-mono text-[10px] uppercase tracking-wider text-ink/45">
                <th className="px-4 py-3 font-semibold text-ink">Book</th>
                <th className="px-4 py-3 font-semibold text-ink">Reader</th>
                <th className="px-4 py-3 font-semibold text-ink">Rating</th>
                <th className="px-4 py-3 font-semibold text-ink">Review</th>
                <th className="px-4 py-3 font-semibold text-ink">Received</th>
                <th className="px-4 py-3 font-semibold text-ink">Status</th>
                <th className="px-4 py-3 text-right font-semibold text-ink">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-border/50 transition-colors last:border-0 hover:bg-muted/50"
                >
                  <td className="max-w-[180px] px-4 py-3.5">
                    <div className="truncate text-sm font-medium text-ink" title={r.book_title || ''}>
                      {r.book_title || 'Unknown book'}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-ink/70">{r.user_name || 'Reader'}</td>
                  <td className="whitespace-nowrap px-4 py-3.5">
                    <Stars n={r.rating} />
                  </td>
                  <td className="max-w-[280px] px-4 py-3.5">
                    {r.title && <div className="truncate text-sm font-medium text-ink">{r.title}</div>}
                    <div className="line-clamp-2 text-xs text-ink/55">{r.body || '—'}</div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 font-mono text-[11px] text-ink/50">
                    {formatDate(r.created_at)}
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge tone={STATUS_TONE[r.status] || 'neutral'}>{r.status || 'pending'}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-right">
                    {r.status !== 'approved' && (
                      <button
                        type="button"
                        className={`${btn.linkPrimary} mr-3`}
                        onClick={() => changeStatus(r.id, 'approved')}
                      >
                        Approve
                      </button>
                    )}
                    {r.status !== 'rejected' && (
                      <button
                        type="button"
                        className={`${btn.link} mr-3`}
                        onClick={() => changeStatus(r.id, 'rejected')}
                      >
                        Reject
                      </button>
                    )}
                    <button type="button" className={btn.linkDanger} onClick={() => setDeleting(r)}>
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

      <ConfirmDialog
        open={!!deleting}
        title="Delete review?"
        message={`The review for "${deleting?.book_title || 'this book'}" by ${deleting?.user_name || 'this reader'} will be permanently removed.`}
        confirmLabel="Delete"
        danger
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
