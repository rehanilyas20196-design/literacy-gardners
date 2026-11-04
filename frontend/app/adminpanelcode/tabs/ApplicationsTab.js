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
  formatDate,
  toast,
} from '../ui';

const STATUSES = ['pending', 'approved', 'rejected'];
const PAGE_SIZE = 10;

const STATUS_TONE = { pending: 'warning', approved: 'success', rejected: 'danger' };

export default function ApplicationsTab({ applications, setApplications, refreshStats }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState(null);

  const counts = useMemo(() => {
    const c = { all: applications.length };
    STATUSES.forEach((s) => {
      c[s] = applications.filter((a) => a.status === s).length;
    });
    return c;
  }, [applications]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return applications.filter((a) => {
      if (!a) return false;
      if (status !== 'all' && a.status !== status) return false;
      if (!q) return true;
      return [a.user_name, a.user_email, a.phone, a.account_title, a.account_number, a.iban].some((v) =>
        String(v || '').toLowerCase().includes(q)
      );
    });
  }, [applications, query, status]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  function decide(id, next) {
    const previous = applications.find((a) => a.id === id)?.status;
    setApplications((prev) => prev.map((a) => (a.id === id ? { ...a, status: next } : a)));
    if (viewing && viewing.id === id) setViewing((v) => ({ ...v, status: next }));
    api
      .decideAuthorApplication(id, next)
      .then(() => {
        toast(next === 'approved' ? 'Author approved — role updated.' : 'Application rejected.');
        refreshStats();
      })
      .catch((err) => {
        setApplications((prev) => prev.map((a) => (a.id === id ? { ...a, status: previous } : a)));
        if (viewing && viewing.id === id) setViewing((v) => ({ ...v, status: previous }));
        toast(err.message || 'Failed to update application');
      });
  }

  const maskAccount = (value) => {
    const str = String(value || '');
    if (!str) return '—';
    return str.length <= 4 ? str : `${'•'.repeat(Math.max(0, str.length - 4))}${str.slice(-4)}`;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SearchInput
          value={query}
          onChange={(v) => {
            setQuery(v);
            setPage(1);
          }}
          placeholder="Search name, email or account title…"
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
                'author-applications.csv',
                filtered.map((a) => ({
                  id: a.id,
                  name: a.user_name,
                  email: a.user_email,
                  phone: a.phone,
                  account_title: a.account_title,
                  account_number: a.account_number,
                  iban: a.iban,
                  status: a.status,
                  created_at: a.created_at,
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
          title={applications.length === 0 ? 'No author applications yet' : 'No applications match your filters'}
          hint="Author registrations from the Get Published / author page appear here."
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-border font-mono text-[10px] uppercase tracking-wider text-ink/45">
                <th className="px-4 py-3 font-semibold text-ink">Applicant</th>
                <th className="px-4 py-3 font-semibold text-ink">Phone</th>
                <th className="px-4 py-3 font-semibold text-ink">Payout account</th>
                <th className="px-4 py-3 font-semibold text-ink">Applied</th>
                <th className="px-4 py-3 font-semibold text-ink">Status</th>
                <th className="px-4 py-3 text-right font-semibold text-ink">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr
                  key={a.id}
                  className="border-b border-border/50 transition-colors last:border-0 hover:bg-muted/50"
                >
                  <td className="px-4 py-3.5">
                    <div className="text-sm font-medium text-ink">{a.user_name || 'Unknown'}</div>
                    <div className="text-xs text-ink/50">{a.user_email || '—'}</div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-sm text-ink/70">{a.phone || '—'}</td>
                  <td className="px-4 py-3.5">
                    <div className="text-sm text-ink/70">{a.account_title || '—'}</div>
                    <div className="font-mono text-[11px] text-ink/45">{maskAccount(a.account_number)}</div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 font-mono text-[11px] text-ink/50">
                    {formatDate(a.created_at)}
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge tone={STATUS_TONE[a.status] || 'neutral'}>{a.status || 'pending'}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-right">
                    <button
                      type="button"
                      className={`${btn.linkPrimary} mr-3`}
                      onClick={() => setViewing(a)}
                    >
                      Review
                    </button>
                    {a.status !== 'approved' && (
                      <button
                        type="button"
                        className={`${btn.link} mr-3`}
                        onClick={() => decide(a.id, 'approved')}
                      >
                        Approve
                      </button>
                    )}
                    {a.status !== 'rejected' && (
                      <button
                        type="button"
                        className={btn.linkDanger}
                        onClick={() => decide(a.id, 'rejected')}
                      >
                        Reject
                      </button>
                    )}
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
        title="Author application"
        description={viewing ? `${viewing.user_name || 'Applicant'} · ${formatDate(viewing.created_at)}` : undefined}
        width="max-w-xl"
      >
        {viewing && (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <Badge tone={STATUS_TONE[viewing.status] || 'neutral'}>{viewing.status}</Badge>
              {viewing.user_role && <Badge tone="neutral">role: {viewing.user_role}</Badge>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Detail label="Name" value={viewing.user_name || '—'} />
              <Detail label="Email">
                <a href={`mailto:${viewing.user_email}`} className="text-primary hover:underline">
                  {viewing.user_email || '—'}
                </a>
              </Detail>
              <Detail label="Phone" value={viewing.phone || '—'} />
              <Detail label="Preferred bank" value="ABHI Microfinance Bank" />
              <Detail label="Account title" value={viewing.account_title || '—'} />
              <Detail label="Account number" value={viewing.account_number || '—'} />
              <Detail label="IBAN" value={viewing.iban || '—'} />
              <Detail label="Decided" value={viewing.decided_at ? formatDate(viewing.decided_at) : '—'} />
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800">
              Approving marks the application approved and promotes the account to the{' '}
              <span className="font-semibold">author</span> role. Payout details are only used by the
              admin team.
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <span className="text-xs text-ink/45">Decision can be changed later.</span>
              <div className="flex gap-2">
                <button type="button" className={btn.secondary} onClick={() => setViewing(null)}>
                  Close
                </button>
                {viewing.status !== 'approved' && (
                  <button type="button" className={btn.primary} onClick={() => decide(viewing.id, 'approved')}>
                    Approve author
                  </button>
                )}
                {viewing.status === 'approved' && (
                  <button type="button" className={btn.danger} onClick={() => decide(viewing.id, 'rejected')}>
                    Revoke approval
                  </button>
                )}
              </div>
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
      <div className="mt-0.5 break-words text-sm text-ink/80">{children || value}</div>
    </div>
  );
}
