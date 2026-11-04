'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { StatCard, Badge, btn, fmtPKR, timeAgo } from '../ui';

const ACTIVITY_ICON = {
  user: '👤',
  book: '📚',
  quote: '💬',
  lead: '✉️',
  newsletter: '🔔',
};

export default function DashboardTab({ stats, onNavigate }) {
  const categoryBars = useMemo(() => {
    const entries = Object.entries(stats?.categoryCounts || {});
    const max = Math.max(1, ...entries.map(([, n]) => n));
    return entries
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count, pct: Math.round((count / max) * 100) }));
  }, [stats]);

  const topBooks = stats?.topBooks || [];
  const maxSold = Math.max(1, ...topBooks.map((b) => b.copies_sold));

  const statCards = [
    { label: 'Total users', value: stats?.users ?? 0, hint: `${stats?.admins ?? 0} admin(s)`, icon: '👥' },
    { label: 'Authors', value: stats?.authors ?? 0, icon: '✍️' },
    {
      label: 'Books',
      value: stats?.books ?? 0,
      hint: `${stats?.publishedBooks ?? 0} published · ${stats?.pendingBooks ?? 0} pending`,
      icon: '📚',
    },
    {
      label: 'Pending quotes',
      value: stats?.pendingQuotes ?? 0,
      hint: `${stats?.quotes ?? 0} total requests`,
      tone: (stats?.pendingQuotes ?? 0) > 0 ? 'danger' : 'default',
      icon: '💬',
    },
    { label: 'Messages', value: stats?.leads ?? 0, hint: 'Contact form leads', icon: '✉️' },
    { label: 'Subscribers', value: stats?.newsletter ?? 0, hint: 'Newsletter signups', icon: '🔔' },
  ];

  const pendingWork = (stats?.pendingBooks ?? 0) + (stats?.pendingQuotes ?? 0);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-ink/45">Estimated catalog revenue</div>
            <div className="mt-1 font-display text-4xl font-bold text-ink">{fmtPKR(stats?.revenue || 0)}</div>
            <div className="mt-1 text-xs text-ink/45">price × copies sold across all books</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btn.primary} onClick={() => onNavigate('books', 'new-book')}>
              + Add book
            </button>
            <button type="button" className={btn.secondary} onClick={() => onNavigate('quotes')}>
              Review quotes{stats?.pendingQuotes ? ` (${stats.pendingQuotes})` : ''}
            </button>
            <button type="button" className={btn.secondary} onClick={() => onNavigate('leads')}>
              View messages
            </button>
          </div>
        </div>
        {pendingWork > 0 && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
            <span aria-hidden="true">⏳</span>
            <span>
              <strong>{pendingWork}</strong> item{pendingWork === 1 ? '' : 's'} waiting for your review.
            </span>
            <button
              type="button"
              className="ml-auto font-medium underline underline-offset-2"
              onClick={() => onNavigate('books')}
            >
              Go to queue →
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {statCards.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-surface p-5">
          <header className="mb-4 flex items-baseline justify-between">
            <h3 className="font-display text-lg font-bold text-ink">Books by category</h3>
            <span className="font-mono text-[10px] uppercase tracking-wider text-ink/40">
              {categoryBars.length} categor{categoryBars.length === 1 ? 'y' : 'ies'}
            </span>
          </header>
          {categoryBars.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink/45">No books to chart yet.</p>
          ) : (
            <ul className="space-y-3">
              {categoryBars.map((c) => (
                <li key={c.name}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-ink/75">{c.name}</span>
                    <span className="font-mono text-ink/45">{c.count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${c.pct}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-surface p-5">
          <header className="mb-4 flex items-baseline justify-between">
            <h3 className="font-display text-lg font-bold text-ink">Top sellers</h3>
            <span className="font-mono text-[10px] uppercase tracking-wider text-ink/40">by copies sold</span>
          </header>
          {topBooks.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink/45">No sales recorded yet.</p>
          ) : (
            <ol className="space-y-3">
              {topBooks.map((b, i) => (
                <li key={b.id} className="flex items-center gap-3">
                  <span className="w-4 font-mono text-xs text-ink/35">{i + 1}</span>
                  <div className="h-10 w-8 flex-shrink-0 overflow-hidden rounded border border-border bg-muted">
                    {b.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={b.image} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium text-ink">{b.title}</span>
                      {!b.is_published && <Badge tone="warning">pending</Badge>}
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-ink transition-all duration-500"
                        style={{ width: `${Math.round((b.copies_sold / maxSold) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className="flex-shrink-0 font-mono text-xs font-medium text-ink/70">
                    {b.copies_sold}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <header className="mb-4 flex items-baseline justify-between">
          <h3 className="font-display text-lg font-bold text-ink">Recent activity</h3>
          <span className="font-mono text-[10px] uppercase tracking-wider text-ink/40">latest events</span>
        </header>
        {(stats?.recentActivity || []).length === 0 ? (
          <p className="py-6 text-center text-sm text-ink/45">Nothing has happened yet.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {(stats.recentActivity || []).map((a, i) => (
              <li key={`${a.type}-${i}`} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <span className="mt-0.5 text-base leading-none" aria-hidden="true">
                  {ACTIVITY_ICON[a.type] || '•'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink/80">{a.label}</p>
                  {a.detail && <p className="truncate text-xs text-ink/45">{a.detail}</p>}
                </div>
                <span className="flex-shrink-0 font-mono text-[10px] text-ink/40">{timeAgo(a.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h3 className="mb-4 font-display text-lg font-bold text-ink">Jump to</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { tab: 'books', label: 'Books', hint: 'Catalog & approvals', icon: '📚' },
            { tab: 'quotes', label: 'Quotes', hint: 'Client requests', icon: '💬' },
            { tab: 'leads', label: 'Messages', hint: 'Contact forms', icon: '✉️' },
            { tab: 'newsletter', label: 'Newsletter', hint: 'Subscribers', icon: '🔔' },
          ].map((item) => (
            <button
              key={item.tab}
              type="button"
              onClick={() => onNavigate(item.tab)}
              className="rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              <div className="text-lg" aria-hidden="true">{item.icon}</div>
              <div className="mt-1.5 text-sm font-semibold text-ink">{item.label}</div>
              <div className="text-xs text-ink/45">{item.hint}</div>
            </button>
          ))}
        </div>
        <p className="mt-4 text-xs text-ink/40">
          Need the public site?{' '}
          <Link href="/" className="text-primary underline underline-offset-2">
            Visit homepage
          </Link>
        </p>
      </section>
    </div>
  );
}
