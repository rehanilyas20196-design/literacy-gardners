'use client';

import { useMemo, useState } from 'react';
import { api } from '@/lib/api';
import {
  Badge,
  ConfirmDialog,
  EmptyState,
  Modal,
  Pagination,
  SearchInput,
  btn,
  exportCsv,
  inputCls,
  toast,
} from '../ui';

const PAGE_SIZE = 10;
const EMPTY_FORM = { name: '', bio: '', role: '' };

export default function AuthorsTab({ authors, setAuthors, books, refreshStats }) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const bookCount = useMemo(() => {
    const map = {};
    (books || []).forEach((b) => {
      const key = (b.author_name || '').trim().toLowerCase();
      if (key) map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [books]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return authors;
    return authors.filter((a) =>
      [a.name, a.role, a.bio].some((v) => String(v || '').toLowerCase().includes(q))
    );
  }, [authors, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  async function addAuthor(e) {
    e.preventDefault();
    setCreating(true);
    setFormError('');
    try {
      const res = await api.createAuthor(form);
      const created = res.author || res;
      setAuthors((prev) => [...prev, created]);
      setForm(EMPTY_FORM);
      setShowAdd(false);
      toast('Author added.');
      refreshStats();
    } catch (err) {
      setFormError(err.message || 'Failed to add author');
    } finally {
      setCreating(false);
    }
  }

  function openEdit(author) {
    setEditing(author);
    setEditForm({ name: author.name || '', bio: author.bio || '', role: author.role || '' });
    setEditError('');
  }

  async function saveEdit(e) {
    e.preventDefault();
    if (!editing) return;
    setSavingEdit(true);
    setEditError('');
    try {
      const res = await api.updateAuthor(editing.id, editForm);
      const updated = res.author || { ...editing, ...editForm };
      setAuthors((prev) => prev.map((a) => (a.id === editing.id ? { ...a, ...updated } : a)));
      setEditing(null);
      toast('Author updated.');
    } catch (err) {
      setEditError(err.message || 'Failed to update author');
    } finally {
      setSavingEdit(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await api.deleteAuthor(deleting.id);
      setAuthors((prev) => prev.filter((a) => a.id !== deleting.id));
      toast('Author deleted.');
      setDeleting(null);
      refreshStats();
    } catch (err) {
      toast(err.message || 'Failed to delete author');
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
          placeholder="Search authors…"
          className="w-full lg:max-w-sm"
        />
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={btn.secondary} onClick={() => setShowAdd((v) => !v)}>
            {showAdd ? 'Close' : '+ Add author'}
          </button>
          <button
            type="button"
            className={btn.secondary}
            onClick={() =>
              exportCsv(
                'authors.csv',
                filtered.map((a) => ({
                  id: a.id,
                  name: a.name,
                  role: a.role,
                  bio: a.bio,
                  created_at: a.created_at,
                }))
              )
            }
          >
            ↓ CSV
          </button>
        </div>
      </div>

      {showAdd && (
        <form onSubmit={addAuthor} className="rounded-2xl border border-border bg-surface p-5">
          <h3 className="mb-4 font-display text-lg font-bold text-ink">Add author</h3>
          {formError && (
            <p className="mb-4 rounded-lg border border-red-100 bg-red-50 px-4 py-2 text-sm text-error">
              {formError}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="field">
              <span className="mb-1 block text-xs font-medium">Name *</span>
              <input
                className={inputCls}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </label>
            <label className="field">
              <span className="mb-1 block text-xs font-medium">Role</span>
              <input
                className={inputCls}
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                placeholder="Author"
              />
            </label>
            <label className="field">
              <span className="mb-1 block text-xs font-medium">Bio</span>
              <input
                className={inputCls}
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                placeholder="Short biography"
              />
            </label>
          </div>
          <button type="submit" className={`${btn.primary} mt-4`} disabled={creating}>
            {creating ? 'Adding…' : 'Add author'}
          </button>
        </form>
      )}

      {rows.length === 0 ? (
        <EmptyState title="No authors found" hint="Add your first author to get started." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-[10px] font-mono uppercase tracking-wider text-ink/45">
                <th className="px-4 py-3 font-semibold text-ink">ID</th>
                <th className="px-4 py-3 font-semibold text-ink">Name</th>
                <th className="px-4 py-3 font-semibold text-ink">Role</th>
                <th className="px-4 py-3 font-semibold text-ink">Bio</th>
                <th className="px-4 py-3 font-semibold text-ink">Books</th>
                <th className="px-4 py-3 text-right font-semibold text-ink">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} className="border-b border-border/50 transition-colors last:border-0 hover:bg-muted/50">
                  <td className="px-4 py-3.5 font-mono text-xs text-ink/50">{a.id}</td>
                  <td className="px-4 py-3.5 text-sm font-medium text-ink">{a.name}</td>
                  <td className="px-4 py-3.5">
                    {a.role ? <Badge>{a.role}</Badge> : <span className="text-ink/30">—</span>}
                  </td>
                  <td className="max-w-[260px] px-4 py-3.5">
                    <span className="block truncate text-sm text-ink/55" title={a.bio || ''}>
                      {a.bio || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-xs text-ink/60">
                    {bookCount[(a.name || '').trim().toLowerCase()] || 0}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-right">
                    <button type="button" className={`${btn.linkPrimary} mr-3`} onClick={() => openEdit(a)}>
                      Edit
                    </button>
                    <button type="button" className={btn.linkDanger} onClick={() => setDeleting(a)}>
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
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Edit author"
        description={editing ? `#${editing.id} · ${editing.name}` : undefined}
        width="max-w-lg"
      >
        <form onSubmit={saveEdit} className="space-y-4">
          {editError && (
            <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-2 text-sm text-error">{editError}</p>
          )}
          <label className="field block">
            <span className="mb-1 block text-xs font-medium">Name *</span>
            <input
              className={inputCls}
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              required
            />
          </label>
          <label className="field block">
            <span className="mb-1 block text-xs font-medium">Role</span>
            <input
              className={inputCls}
              value={editForm.role}
              onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
            />
          </label>
          <label className="field block">
            <span className="mb-1 block text-xs font-medium">Bio</span>
            <textarea
              className={inputCls}
              rows={4}
              value={editForm.bio}
              onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
            />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" className={btn.secondary} onClick={() => setEditing(null)}>
              Cancel
            </button>
            <button type="submit" className={btn.primary} disabled={savingEdit}>
              {savingEdit ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="Delete author?"
        message={`"${deleting?.name}" will be permanently removed. Books keep their author name text.`}
        confirmLabel="Delete"
        danger
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
