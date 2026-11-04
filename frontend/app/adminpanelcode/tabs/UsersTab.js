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
  exportCsv,
  formatDate,
  toast,
} from '../ui';

const PAGE_SIZE = 10;

export default function UsersTab({ users, setUsers, me, refreshStats }) {
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('all');
  const [page, setPage] = useState(1);
  const [confirm, setConfirm] = useState(null); // {action:'delete'|'role', user, nextRole}
  const [busy, setBusy] = useState(false);

  const counts = useMemo(
    () => ({
      all: users.length,
      admin: users.filter((u) => u.role === 'admin').length,
      user: users.filter((u) => u.role !== 'admin').length,
    }),
    [users]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (role !== 'all' && u.role !== role) return false;
      if (!q) return true;
      return [u.name, u.email, u.role].some((v) => String(v || '').toLowerCase().includes(q));
    });
  }, [users, query, role]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  async function runConfirm() {
    if (!confirm) return;
    const { action, user, nextRole } = confirm;
    setBusy(true);
    try {
      if (action === 'delete') {
        await api.deleteUser(user.id);
        setUsers((prev) => prev.filter((u) => u.id !== user.id));
        toast('User deleted.');
      } else {
        const res = await api.updateUserRole(user.id, nextRole);
        const updated = res.user || { ...user, role: nextRole };
        setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, ...updated } : u)));
        toast(`Role updated to ${nextRole}.`);
      }
      setConfirm(null);
      refreshStats();
    } catch (err) {
      toast(err.message || 'Action failed');
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
          placeholder="Search by name or email…"
          className="w-full lg:max-w-sm"
        />
        <div className="flex flex-wrap items-center gap-2">
          <FilterChips
            value={role}
            onChange={(v) => { setRole(v); setPage(1); }}
            options={[
              { value: 'all', label: 'All', count: counts.all },
              { value: 'admin', label: 'Admins', count: counts.admin },
              { value: 'user', label: 'Users', count: counts.user },
            ]}
          />
          <button
            type="button"
            className={btn.secondary}
            onClick={() =>
              exportCsv(
                'users.csv',
                filtered.map((u) => ({
                  id: u.id,
                  name: u.name,
                  email: u.email,
                  role: u.role,
                  created_at: u.created_at,
                }))
              )
            }
          >
            ↓ CSV
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No users match your filters" />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-[10px] font-mono uppercase tracking-wider text-ink/45">
                <th className="px-4 py-3 font-semibold text-ink">ID</th>
                <th className="px-4 py-3 font-semibold text-ink">Name</th>
                <th className="px-4 py-3 font-semibold text-ink">Email</th>
                <th className="px-4 py-3 font-semibold text-ink">Role</th>
                <th className="px-4 py-3 font-semibold text-ink">Joined</th>
                <th className="px-4 py-3 text-right font-semibold text-ink">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => {
                const isSelf = me && u.id === me.id;
                const isAdmin = u.role === 'admin';
                return (
                  <tr key={u.id} className="border-b border-border/50 transition-colors last:border-0 hover:bg-muted/50">
                    <td className="px-4 py-3.5 font-mono text-xs text-ink/50">{u.id}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-ink">{u.name}</span>
                        {isSelf && <Badge tone="primary">You</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-ink/60">{u.email}</td>
                    <td className="px-4 py-3.5">
                      <Badge tone={isAdmin ? 'primary' : 'neutral'}>{u.role}</Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 font-mono text-[11px] text-ink/50">
                      {formatDate(u.created_at)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-right">
                      {!isSelf && (
                        <button
                          type="button"
                          className={`${btn.linkPrimary} mr-3`}
                          onClick={() =>
                            setConfirm({
                              action: 'role',
                              user: u,
                              nextRole: isAdmin ? 'user' : 'admin',
                            })
                          }
                        >
                          {isAdmin ? 'Demote' : 'Promote'}
                        </button>
                      )}
                      <button
                        type="button"
                        className={btn.linkDanger}
                        disabled={isSelf || isAdmin}
                        title={
                          isSelf
                            ? 'You cannot delete your own account'
                            : isAdmin
                            ? 'Demote admin accounts first'
                            : 'Delete user'
                        }
                        onClick={() => setConfirm({ action: 'delete', user: u })}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="px-4 pb-4">
            <Pagination page={current} pageCount={pageCount} onChange={setPage} />
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.action === 'delete' ? 'Delete user?' : 'Change role?'}
        message={
          confirm?.action === 'delete'
            ? `${confirm?.user?.name} (${confirm?.user?.email}) will be permanently removed.`
            : `Change ${confirm?.user?.name} to ${confirm?.nextRole === 'admin' ? 'an administrator' : 'a regular user'}?`
        }
        confirmLabel={confirm?.action === 'delete' ? 'Delete' : 'Change role'}
        danger={confirm?.action === 'delete'}
        busy={busy}
        onConfirm={runConfirm}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
