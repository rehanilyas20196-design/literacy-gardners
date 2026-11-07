'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Badge, PageLoader, btn, toast } from './ui';
import DashboardTab from './tabs/DashboardTab';
import UsersTab from './tabs/UsersTab';
import AuthorsTab from './tabs/AuthorsTab';
import QuotesTab from './tabs/QuotesTab';
import BooksTab from './tabs/BooksTab';
import LeadsTab from './tabs/LeadsTab';
import NewsletterTab from './tabs/NewsletterTab';
import ReviewsTab from './tabs/ReviewsTab';
import OrdersTab from './tabs/OrdersTab';
import ApplicationsTab from './tabs/ApplicationsTab';

const NAV = [
  {
    section: 'Overview',
    items: [{ id: 'dashboard', label: 'Dashboard', icon: '📊' }],
  },
  {
    section: 'Content',
    items: [
      { id: 'books', label: 'Books', icon: '📚', badge: 'pendingBooks' },
      { id: 'authors', label: 'Authors', icon: '✍️' },
      { id: 'quotes', label: 'Quote requests', icon: '💬', badge: 'pendingQuotes' },
      { id: 'reviews', label: 'Reviews', icon: '⭐', badge: 'pendingReviews' },
    ],
  },
  {
    section: 'People',
    items: [
      { id: 'users', label: 'Users', icon: '👥' },
      {
        id: 'applications',
        label: 'Author applications',
        icon: '🖊️',
        badge: 'pendingApplications',
      },
      { id: 'leads', label: 'Messages', icon: '✉️', badge: 'leads' },
      { id: 'newsletter', label: 'Newsletter', icon: '🔔' },
    ],
  },
  {
    section: 'Sales',
    items: [{ id: 'orders', label: 'Orders', icon: '🧾', badge: 'pendingOrders' }],
  },
];

const TITLES = {
  dashboard: ['Dashboard', 'Everything happening across your publishing club'],
  books: ['Books', 'Manage the catalog, approvals and pricing'],
  authors: ['Authors', 'The writers behind your catalog'],
  quotes: ['Quote requests', 'Publishing quotes submitted by clients'],
  users: ['Users', 'Accounts with access to the site'],
  leads: ['Messages', 'Contact form submissions'],
  newsletter: ['Newsletter', 'Subscribers to your mailing list'],
  reviews: ['Reviews', 'Moderate reader reviews before they appear on book pages'],
  orders: ['Orders', 'Checkout orders — cash on delivery'],
  applications: ['Author applications', 'Approve authors and review their payout details'],
};

const EMPTY = {
  stats: null,
  users: [],
  authors: [],
  quotes: [],
  books: [],
  leads: [],
  subscribers: [],
  reviews: [],
  orders: [],
  applications: [],
};

export default function AdminClient() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [tab, setTab] = useState('dashboard');
  const [intent, setIntent] = useState(null);
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const patch = useCallback((key, value) => {
    setData((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Functional variant — updater always receives the *current* value, never a stale closure
  const update = useCallback((key, updater) => {
    setData((prev) => ({
      ...prev,
      [key]: typeof updater === 'function' ? updater(prev[key]) : updater,
    }));
  }, []);

  const refreshStats = useCallback(() => {
    api
      .getStats()
      .then((res) => patch('stats', res.stats))
      .catch(() => {});
  }, [patch]);

  const loadAll = useCallback(async () => {
    setError('');
    const settle = (promise) =>
      promise.then((data) => ({ ok: true, data })).catch((error) => ({ ok: false, error }));
    const [s, u, a, q, b, l, n, r, o, ap] = await Promise.all([
      settle(api.getStats()),
      settle(api.getUsers()),
      settle(api.getAuthors()),
      settle(api.getQuotes()),
      settle(api.getAllBooks()),
      settle(api.getLeads()),
      settle(api.getNewsletter()),
      settle(api.getReviews()),
      settle(api.getOrders()),
      settle(api.getAuthorApplications()),
    ]);
    const results = [s, u, a, q, b, l, n, r, o, ap];
    if (results.every((res) => !res.ok)) {
      throw results[0].error || new Error('Failed to load admin data');
    }
    const failed = results.filter((res) => !res.ok).length;
    if (failed > 0) {
      toast(`Some admin data could not be loaded (${failed} of ${results.length} requests failed).`);
    }
    setData({
      stats: s.ok ? s.data.stats : null,
      users: u.ok ? u.data.users : [],
      authors: a.ok ? a.data.authors : [],
      quotes: q.ok ? q.data.quotes : [],
      books: b.ok ? b.data.books : [],
      leads: l.ok ? l.data.leads : [],
      subscribers: n.ok ? n.data.subscribers : [],
      reviews: r.ok ? r.data.reviews : [],
      orders: o.ok ? o.data.orders : [],
      applications: ap.ok ? ap.data.applications : [],
    });
  }, []);

  useEffect(() => {
    let alive = true;
    api
      .getMe()
      .then((res) => {
        if (!alive) return;
        if (!res.user || res.user.role !== 'admin') {
          router.push('/adminpanelcode/login');
          return;
        }
        setMe(res.user);
        return loadAll()
          .catch((err) => {
            if (alive) setError(err.message || 'Failed to load admin data');
          })
          .finally(() => {
            if (alive) setLoading(false);
          });
      })
      .catch(() => {
        if (alive) router.push('/adminpanelcode/login');
      });
    return () => {
      alive = false;
    };
  }, [loadAll, router]);

  const navigate = useCallback((nextTab, nextIntent = null) => {
    setTab(nextTab);
    setIntent(nextIntent);
    setMobileNavOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const logout = useCallback(() => {
    setSigningOut(true);
    api.logout();
    router.push('/adminpanelcode/login');
  }, [router]);

  const badgeValue = useCallback(
    (key) => {
      if (!data.stats) return 0;
      return data.stats[key] ?? 0;
    },
    [data.stats]
  );

  const [title, subtitle] = TITLES[tab] || TITLES.dashboard;

  const navGroups = useMemo(() => NAV, []);

  if (loading) return <PageLoader />;

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-6">
        <div className="max-w-md rounded-2xl border border-border bg-surface p-8 text-center">
          <div className="font-display text-3xl font-bold text-ink">Something went wrong</div>
          <p className="mt-2 text-sm text-ink/60">{error}</p>
          <div className="mt-5 flex justify-center gap-2">
            <button type="button" className={btn.primary} onClick={() => { setLoading(true); loadAll().finally(() => setLoading(false)); }}>
              Try again
            </button>
            <button type="button" className={btn.secondary} onClick={logout}>
              Back to login
            </button>
          </div>
        </div>
      </div>
    );
  }

  const stats = data.stats;

  const desktopNav = (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
      {navGroups.map((group) => (
        <div key={group.section}>
          <div className="px-3 pb-2 font-mono text-[10px] uppercase tracking-wider text-ink/35">
            {group.section}
          </div>
          <ul className="space-y-1">
            {group.items.map((item) => {
              const active = tab === item.id;
              const count = item.badge ? badgeValue(item.badge) : 0;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => navigate(item.id)}
                    aria-current={active ? 'page' : undefined}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                      active
                        ? 'bg-primary/10 text-primary'
                        : 'text-ink/65 hover:bg-muted hover:text-ink'
                    }`}
                  >
                    <span aria-hidden="true">{item.icon}</span>
                    <span className="flex-1">{item.label}</span>
                    {count > 0 && (
                      <span
                        className={`min-w-[20px] rounded-full px-1.5 py-0.5 text-center font-mono text-[10px] ${
                          active ? 'bg-primary text-white' : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const mobileNav = (
    <div className="flex gap-1.5 overflow-x-auto border-b border-border bg-surface px-4 py-2.5 lg:hidden">
      {navGroups.flatMap((g) => g.items).map((item) => {
        const active = tab === item.id;
        const count = item.badge ? badgeValue(item.badge) : 0;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => navigate(item.id)}
            className={`flex flex-shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              active
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-border text-ink/55 hover:text-ink'
            }`}
          >
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
            {count > 0 && (
              <span className="rounded-full bg-amber-100 px-1.5 font-mono text-[10px] text-amber-700">
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-muted">
      {/* Admin top bar — sits directly beneath the site navbar */}
      <div className="sticky top-16 z-[90] border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-3 px-4 sm:px-6">
          <button
            type="button"
            className="rounded-lg border border-border px-2.5 py-1.5 text-sm text-ink/60 hover:bg-muted lg:hidden"
            onClick={() => setMobileNavOpen((v) => !v)}
            aria-label="Toggle navigation"
            aria-expanded={mobileNavOpen}
          >
            ☰
          </button>
          <Link href="/adminpanelcode" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-sm font-bold text-white">
              L
            </div>
            <span className="hidden font-display font-bold tracking-tight text-ink sm:block">
              Literacy Gardeners
            </span>
            <span className="hidden font-mono text-[10px] uppercase tracking-wider text-ink/40 md:block">
              Admin
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            {stats && (
              <div className="hidden items-center gap-2 xl:flex">
                <Badge tone="neutral">{stats.users} users</Badge>
                <Badge tone="neutral">{stats.books} books</Badge>
                <Badge tone={stats.pendingBooks > 0 ? 'warning' : 'neutral'}>
                  {stats.pendingBooks} pending
                </Badge>
              </div>
            )}
            <div className="hidden text-right sm:block">
              <div className="text-xs font-medium leading-tight text-ink">{me?.name}</div>
              <div className="font-mono text-[10px] leading-tight text-ink/40">{me?.email}</div>
            </div>
            <div className="grid h-8 w-8 place-items-center rounded-full bg-ink text-xs font-bold text-white">
              {(me?.name || 'A').charAt(0).toUpperCase()}
            </div>
            <button type="button" className={btn.secondary} onClick={logout} disabled={signingOut}>
              Sign out
            </button>
          </div>
        </div>
        {mobileNavOpen && (
          <div className="border-t border-border px-4 py-3 lg:hidden">
            <div className="grid grid-cols-2 gap-2">
              {navGroups.flatMap((g) => g.items).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(item.id)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                    tab === item.id
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border text-ink/65 hover:bg-muted'
                  }`}
                >
                  <span aria-hidden="true">{item.icon}</span>
                  <span className="flex-1">{item.label}</span>
                  {item.badge && badgeValue(item.badge) > 0 && (
                    <span className="rounded-full bg-amber-100 px-1.5 font-mono text-[10px] text-amber-700">
                      {badgeValue(item.badge)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mx-auto flex max-w-[1400px] flex-col lg:flex-row">
        {/* Sidebar (desktop) */}
        <aside className="sticky top-[120px] hidden h-[calc(100vh-120px)] w-60 flex-shrink-0 flex-col border-r border-border bg-surface lg:flex">
          {desktopNav}
          <div className="border-t border-border px-5 py-4">
            <div className="font-mono text-[10px] uppercase tracking-wider text-ink/35">Signed in as</div>
            <div className="mt-1 truncate text-sm font-medium text-ink">{me?.email}</div>
            <div className="mt-0.5 text-[11px] text-ink/45">Administrator</div>
          </div>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1">
          <div className="px-4 pb-4 pt-6 sm:px-6 lg:hidden">{mobileNav}</div>
          <div className="px-4 pb-16 pt-6 sm:px-6 lg:px-8">
            <header className="mb-6">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h1 className="font-display text-3xl font-bold tracking-tight text-ink">{title}</h1>
                  <p className="mt-1 text-sm text-ink/50">{subtitle}</p>
                </div>
                <button
                  type="button"
                  className={btn.secondary}
                  onClick={() => {
                    loadAll()
                      .then(() => toast('Data refreshed.'))
                      .catch(() => toast('Refresh failed.'));
                  }}
                >
                  ↻ Refresh
                </button>
              </div>
            </header>

            {tab === 'dashboard' && <DashboardTab stats={stats} onNavigate={navigate} />}
            {tab === 'users' && (
              <UsersTab
                users={data.users}
                setUsers={(v) => update('users', v)}
                me={me}
                refreshStats={refreshStats}
              />
            )}
            {tab === 'authors' && (
              <AuthorsTab
                authors={data.authors}
                setAuthors={(v) => update('authors', v)}
                books={data.books}
                refreshStats={refreshStats}
              />
            )}
            {tab === 'quotes' && (
              <QuotesTab
                quotes={data.quotes}
                setQuotes={(v) => update('quotes', v)}
                refreshStats={refreshStats}
              />
            )}
            {tab === 'books' && (
              <BooksTab
                books={data.books}
                setBooks={(v) => update('books', v)}
                refreshStats={refreshStats}
                intent={intent}
                clearIntent={() => setIntent(null)}
              />
            )}
            {tab === 'leads' && (
              <LeadsTab
                leads={data.leads}
                setLeads={(v) => update('leads', v)}
                refreshStats={refreshStats}
              />
            )}
            {tab === 'newsletter' && (
              <NewsletterTab
                subscribers={data.subscribers}
                setSubscribers={(v) => update('subscribers', v)}
                refreshStats={refreshStats}
              />
            )}
            {tab === 'reviews' && (
              <ReviewsTab
                reviews={data.reviews}
                setReviews={(v) => update('reviews', v)}
                refreshStats={refreshStats}
              />
            )}
            {tab === 'orders' && (
              <OrdersTab
                orders={data.orders}
                setOrders={(v) => update('orders', v)}
                refreshStats={refreshStats}
              />
            )}
            {tab === 'applications' && (
              <ApplicationsTab
                applications={data.applications}
                setApplications={(v) => update('applications', v)}
                refreshStats={refreshStats}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
