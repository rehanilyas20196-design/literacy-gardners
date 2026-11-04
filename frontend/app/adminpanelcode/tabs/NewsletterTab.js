'use client';

import { useMemo, useState } from 'react';
import { api } from '@/lib/api';
import {
  Badge,
  ConfirmDialog,
  EmptyState,
  Pagination,
  SearchInput,
  btn,
  exportCsv,
  formatDate,
  toast,
} from '../ui';

const PAGE_SIZE = 12;

export default function NewsletterTab({ subscribers, setSubscribers, refreshStats }) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return subscribers;
    return subscribers.filter((s) => String(s.email || '').toLowerCase().includes(q));
  }, [subscribers, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await api.deleteSubscriber(deleting.id);
      setSubscribers((prev) => prev.filter((s) => s.id !== deleting.id));
      toast('Subscriber removed.');
      setDeleting(null);
      refreshStats();
    } catch (err) {
      toast(err.message || 'Failed to remove subscriber');
    } finally {
      setBusy(false);
    }
  }

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(filtered.map((s) => s.email).join(', '));
      setCopied(true);
      toast(`${filtered.length} email${filtered.length === 1 ? '' : 's'} copied.`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast('Clipboard not available.');
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SearchInput
          value={query}
          onChange={(v) => { setQuery(v); setPage(1); }}
          placeholder="Search subscribers…"
          className="w-full lg:max-w-sm"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="primary">{filtered.length} subscriber{filtered.length === 1 ? '' : 's'}</Badge>
          <button type="button" className={btn.secondary} onClick={copyAll} disabled={filtered.length === 0}>
            {copied ? '✓ Copied' : '⧉ Copy emails'}
          </button>
          <button
            type="button"
            className={btn.secondary}
            disabled={filtered.length === 0}
            onClick={() =>
              exportCsv(
                'newsletter-subscribers.csv',
                filtered.map((s) => ({ id: s.id, email: s.email, subscribed_at: s.created_at }))
              )
            }
          >
            ↓ CSV
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title={subscribers.length === 0 ? 'No subscribers yet' : 'No subscribers match your search'}
          hint="Newsletter signups from the site appear here."
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-[10px] font-mono uppercase tracking-wider text-ink/45">
                <th className="px-4 py-3 font-semibold text-ink">ID</th>
                <th className="px-4 py-3 font-semibold text-ink">Email</th>
                <th className="px-4 py-3 font-semibold text-ink">Subscribed</th>
                <th className="px-4 py-3 font-semibold text-ink" />
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className="border-b border-border/50 transition-colors last:border-0 hover:bg-muted/50">
                  <td className="px-4 py-3.5 font-mono text-xs text-ink/50">{s.id}</td>
                  <td className="px-4 py-3.5">
                    <a href={`mailto:${s.email}`} className="text-sm font-medium text-ink hover:text-primary hover:underline">
                      {s.email}
                    </a>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 font-mono text-[11px] text-ink/50">
                    {formatDate(s.created_at)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-right">
                    <button type="button" className={btn.linkDanger} onClick={() => setDeleting(s)}>
                      Remove
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
        title="Remove subscriber?"
        message={`${deleting?.email} will be unsubscribed from the newsletter.`}
        confirmLabel="Remove"
        danger
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
