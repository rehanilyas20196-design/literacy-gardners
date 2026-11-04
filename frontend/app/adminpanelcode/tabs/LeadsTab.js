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
  formatDate,
  toast,
} from '../ui';

const TYPES = ['general', 'get-published', 'competition', 'workshop'];

const TYPE_TONE = {
  general: 'neutral',
  'get-published': 'primary',
  competition: 'info',
  workshop: 'warning',
};

const PAGE_SIZE = 10;

export default function LeadsTab({ leads, setLeads, refreshStats }) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const counts = useMemo(() => {
    const c = { all: leads.length };
    TYPES.forEach((t) => { c[t] = leads.filter((l) => l.type === t).length; });
    return c;
  }, [leads]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((l) => {
      if (type !== 'all' && l.type !== type) return false;
      if (!q) return true;
      return [l.name, l.email, l.message, l.type].some((v) =>
        String(v || '').toLowerCase().includes(q)
      );
    });
  }, [leads, query, type]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await api.deleteLead(deleting.id);
      setLeads((prev) => prev.filter((l) => l.id !== deleting.id));
      toast('Message deleted.');
      setDeleting(null);
      refreshStats();
    } catch (err) {
      toast(err.message || 'Failed to delete');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SearchInput
          value={query}
          onChange={(v) => { setQuery(v); setPage(1); }}
          placeholder="Search by name, email or message…"
          className="w-full lg:max-w-sm"
        />
        <div className="flex flex-wrap items-center gap-2">
          <FilterChips
            value={type}
            onChange={(v) => { setType(v); setPage(1); }}
            options={[
              { value: 'all', label: 'All', count: counts.all },
              ...TYPES.map((t) => ({
                value: t,
                label: t === 'get-published' ? 'Get Published' : t.charAt(0).toUpperCase() + t.slice(1),
                count: counts[t],
              })),
            ]}
          />
          <button
            type="button"
            className={btn.secondary}
            onClick={() =>
              exportCsv(
                'leads.csv',
                filtered.map((l) => ({
                  id: l.id,
                  name: l.name,
                  email: l.email,
                  type: l.type,
                  message: l.message,
                  created_at: l.created_at,
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
          title={leads.length === 0 ? 'No messages yet' : 'No messages match your filters'}
          hint="Contact form submissions land here."
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-[10px] font-mono uppercase tracking-wider text-ink/45">
                <th className="px-4 py-3 font-semibold text-ink">From</th>
                <th className="px-4 py-3 font-semibold text-ink">Type</th>
                <th className="px-4 py-3 font-semibold text-ink">Message</th>
                <th className="px-4 py-3 font-semibold text-ink">Received</th>
                <th className="px-4 py-3 font-semibold text-ink" />
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.id} className="border-b border-border/50 transition-colors last:border-0 hover:bg-muted/50">
                  <td className="px-4 py-3.5">
                    <div className="text-sm font-medium text-ink">{l.name}</div>
                    <a
                      href={`mailto:${l.email}`}
                      className="text-xs text-ink/50 hover:text-primary hover:underline"
                    >
                      {l.email}
                    </a>
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge tone={TYPE_TONE[l.type] || 'neutral'}>
                      {(l.type || 'general').replace('-', ' ')}
                    </Badge>
                  </td>
                  <td className="max-w-[280px] px-4 py-3.5">
                    <button
                      type="button"
                      onClick={() => setViewing(l)}
                      className="block w-full truncate text-left text-sm text-ink/60 hover:text-ink"
                      title="Click to read the full message"
                    >
                      {l.message || '—'}
                    </button>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 font-mono text-[11px] text-ink/50">
                    {formatDate(l.created_at)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-right">
                    <button type="button" className={`${btn.linkPrimary} mr-3`} onClick={() => setViewing(l)}>
                      View
                    </button>
                    <button type="button" className={btn.linkDanger} onClick={() => setDeleting(l)}>
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
        title="Message"
        description={viewing ? `From ${viewing.name} · ${viewing.email}` : undefined}
        width="max-w-lg"
      >
        {viewing && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge tone={TYPE_TONE[viewing.type] || 'neutral'}>
                {(viewing.type || 'general').replace('-', ' ')}
              </Badge>
              <Badge>{formatDate(viewing.created_at)}</Badge>
            </div>
            <p className="whitespace-pre-wrap rounded-xl border border-border bg-muted/50 p-4 text-sm leading-relaxed text-ink/80">
              {viewing.message || 'No message body.'}
            </p>
            <div className="flex flex-wrap gap-2">
              <a href={`mailto:${viewing.email}?subject=Re: your message to Literacy Gardeners`} className={btn.primary}>
                Reply by email
              </a>
              <button type="button" className={btn.secondary} onClick={() => setViewing(null)}>
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="Delete message?"
        message={`This will permanently remove the message from ${deleting?.name} (${deleting?.email}).`}
        confirmLabel="Delete"
        danger
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
