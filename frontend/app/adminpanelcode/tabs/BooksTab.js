'use client';

import { useEffect, useMemo, useState } from 'react';
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
  inputCls,
  toast,
} from '../ui';

const PAGE_SIZE = 8;
const COVER_CLASSES = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8'];
const TEMPLATES = ['hardcover', 'paperback', 'spiral'];

const EMPTY_FORM = {
  title: '',
  slug: '',
  author_name: '',
  author_id: '',
  category: '',
  description: '',
  cover_class: 'c1',
  ornament: '❀',
  pages: '200',
  rating: '4.5',
  year: '2026',
  copies_sold: '0',
  price: '1499',
  sale_price: '',
  stock_status: 'in_stock',
  badge: '',
  is_best_seller: 'false',
  best_seller_rank: '',
  is_published: 'true',
  template: 'hardcover',
};

function toFormState(book) {
  return {
    title: book.title ?? '',
    slug: book.slug ?? '',
    author_name: book.author_name ?? '',
    author_id: book.author_id ?? '',
    category: book.category ?? '',
    description: book.description ?? '',
    cover_class: book.cover_class ?? 'c1',
    ornament: book.ornament ?? '❀',
    pages: String(book.pages ?? 200),
    rating: String(book.rating ?? 4.5),
    year: String(book.year ?? 2026),
    copies_sold: String(book.copies_sold ?? 0),
    price: String(book.price ?? 1499),
    sale_price: book.sale_price != null ? String(book.sale_price) : '',
    stock_status: book.stock_status ?? 'in_stock',
    badge: book.badge ?? '',
    is_best_seller: book.is_best_seller ? 'true' : 'false',
    best_seller_rank: book.best_seller_rank != null ? String(book.best_seller_rank) : '',
    is_published: book.is_published ? 'true' : 'false',
    template: book.template ?? 'hardcover',
  };
}

function buildFormData(form, frontFile, backFile, isEdit) {
  const fd = new FormData();
  fd.append('title', form.title);
  if (!isEdit && form.slug) fd.append('slug', form.slug);
  fd.append('author_name', form.author_name);
  if (form.author_id) fd.append('author_id', form.author_id);
  fd.append('category', form.category);
  fd.append('description', form.description);
  fd.append('cover_class', form.cover_class);
  fd.append('ornament', form.ornament);
  fd.append('pages', form.pages);
  fd.append('rating', form.rating);
  fd.append('year', form.year);
  fd.append('copies_sold', form.copies_sold);
  fd.append('price', form.price);
  fd.append('sale_price', form.sale_price || '');
  fd.append('stock_status', form.stock_status);
  fd.append('badge', form.badge || '');
  fd.append('is_best_seller', form.is_best_seller);
  if (form.best_seller_rank) fd.append('best_seller_rank', form.best_seller_rank);
  fd.append('is_published', form.is_published);
  fd.append('template', form.template);
  if (frontFile) fd.append('image', frontFile);
  if (backFile) fd.append('back_image', backFile);
  return fd;
}

export default function BooksTab({ books, setBooks, refreshStats, intent, clearIntent }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [frontFile, setFrontFile] = useState(null);
  const [backFile, setBackFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [confirm, setConfirm] = useState(null); // {action, book}
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (intent === 'new-book') {
      openAdd();
      clearIntent?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intent]);

  const categories = useMemo(
    () => [...new Set(books.map((b) => b.category).filter(Boolean))].sort(),
    [books]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = books.filter((b) => {
      if (status === 'pending' && b.is_published) return false;
      if (status === 'published' && !b.is_published) return false;
      if (category !== 'all' && b.category !== category) return false;
      if (!q) return true;
      return [b.title, b.author_name, b.category, b.badge].some((v) =>
        String(v || '').toLowerCase().includes(q)
      );
    });
    const sorted = [...list];
    if (sort === 'title') sorted.sort((a, b) => String(a.title).localeCompare(String(b.title)));
    else if (sort === 'price_asc')
      sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
    else if (sort === 'price_desc') sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
    else if (sort === 'popular') sorted.sort((a, b) => (b.copies_sold || 0) - (a.copies_sold || 0));
    else if (sort === 'oldest')
      sorted.sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')));
    else sorted.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
    return sorted;
  }, [books, query, status, category, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  function openAdd() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFrontFile(null);
    setBackFile(null);
    setFormError('');
    setFormOpen(true);
  }

  function openEdit(book) {
    setEditing(book);
    setForm(toFormState(book));
    setFrontFile(null);
    setBackFile(null);
    setFormError('');
    setFormOpen(true);
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const fd = buildFormData(form, frontFile, backFile, !!editing);
      let updated;
      if (editing) {
        const res = await api.updateAdminBookForm(editing.id, fd);
        updated = res.book || { ...editing, ...form };
        setBooks((prev) => prev.map((b) => (b.id === editing.id ? { ...b, ...updated } : b)));
        toast('Book updated.');
      } else {
        const res = await api.createAdminBookForm(fd);
        updated = res.book || res;
        setBooks((prev) => [updated, ...prev]);
        toast('Book added.');
      }
      setFormOpen(false);
      refreshStats();
    } catch (err) {
      setFormError(err.message || 'Failed to save book');
    } finally {
      setSaving(false);
    }
  }

  async function runConfirm() {
    if (!confirm) return;
    const { action, book } = confirm;
    setBusy(true);
    try {
      if (action === 'delete') {
        await api.deleteBook(book.id);
        setBooks((prev) => prev.filter((b) => b.id !== book.id));
        toast('Book deleted.');
      } else if (action === 'approve') {
        await api.approveBook(book.id);
        setBooks((prev) => prev.map((b) => (b.id === book.id ? { ...b, is_published: 1 } : b)));
        toast('Book approved & published.');
      } else if (action === 'reject') {
        await api.rejectBook(book.id);
        setBooks((prev) => prev.map((b) => (b.id === book.id ? { ...b, is_published: 0 } : b)));
        toast('Book unpublished.');
      }
      setConfirm(null);
      refreshStats();
    } catch (err) {
      toast(err.message || 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  const counts = {
    all: books.length,
    pending: books.filter((b) => !b.is_published).length,
    published: books.filter((b) => b.is_published).length,
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <SearchInput
            value={query}
            onChange={(v) => { setQuery(v); setPage(1); }}
            placeholder="Search title, author, category…"
            className="w-full sm:w-64"
          />
          <FilterChips
            value={status}
            onChange={(v) => { setStatus(v); setPage(1); }}
            options={[
              { value: 'all', label: 'All', count: counts.all },
              { value: 'pending', label: 'Pending', count: counts.pending },
              { value: 'published', label: 'Published', count: counts.published },
            ]}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            aria-label="Filter by category"
            className="rounded-lg border border-border bg-surface px-2.5 py-2 text-xs font-medium text-ink outline-none focus:border-primary"
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            aria-label="Sort books"
            className="rounded-lg border border-border bg-surface px-2.5 py-2 text-xs font-medium text-ink outline-none focus:border-primary"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="title">Title A–Z</option>
            <option value="price_asc">Price: low → high</option>
            <option value="price_desc">Price: high → low</option>
            <option value="popular">Most sold</option>
          </select>
          <button
            type="button"
            className={btn.secondary}
            onClick={() =>
              exportCsv(
                'books.csv',
                filtered.map((b) => ({
                  id: b.id,
                  title: b.title,
                  author: b.author_name,
                  category: b.category,
                  price: b.price,
                  sale_price: b.sale_price,
                  copies_sold: b.copies_sold,
                  stock_status: b.stock_status,
                  status: b.is_published ? 'published' : 'pending',
                  created_at: b.created_at,
                }))
              )
            }
          >
            ↓ CSV
          </button>
          <button type="button" className={btn.primary} onClick={openAdd}>
            + Add book
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title={books.length === 0 ? 'No books yet' : 'No books match your filters'}
          hint="Add a book or adjust the filters."
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-[10px] font-mono uppercase tracking-wider text-ink/45">
                <th className="px-4 py-3 font-semibold text-ink">Cover</th>
                <th className="px-4 py-3 font-semibold text-ink">Title</th>
                <th className="px-4 py-3 font-semibold text-ink">Author</th>
                <th className="px-4 py-3 font-semibold text-ink">Category</th>
                <th className="px-4 py-3 font-semibold text-ink">Price</th>
                <th className="px-4 py-3 font-semibold text-ink">Sold</th>
                <th className="px-4 py-3 font-semibold text-ink">Status</th>
                <th className="px-4 py-3 text-right font-semibold text-ink">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.id} className="border-b border-border/50 transition-colors last:border-0 hover:bg-muted/50">
                  <td className="px-4 py-3">
                    <div className="h-16 w-12 flex-shrink-0 overflow-hidden rounded border border-border bg-muted">
                      {b.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={b.image} alt={b.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center font-mono text-[8px] text-ink/30">
                          N/A
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="max-w-[220px] px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-sm font-medium text-ink" title={b.title}>
                        {b.title}
                      </span>
                      {b.badge && <Badge tone="warning">{b.badge}</Badge>}
                      {Boolean(b.is_best_seller) && <Badge tone="primary">Best seller</Badge>}
                    </div>
                    <div className="font-mono text-[10px] text-ink/40">{b.pages} pages · {b.rating}★</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-ink/60">{b.author_name}</td>
                  <td className="px-4 py-3 text-sm text-ink/60">{b.category}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="text-sm font-medium text-ink">{fmtPKR(b.price)}</div>
                    {b.sale_price != null && (
                      <div className="font-mono text-[10px] text-primary">sale {fmtPKR(b.sale_price)}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-ink/60">{b.copies_sold || 0}</td>
                  <td className="px-4 py-3">
                    <Badge tone={b.is_published ? 'success' : 'danger'}>
                      {b.is_published ? 'Published' : 'Pending'}
                    </Badge>
                    <div className="mt-1 font-mono text-[10px] text-ink/40">
                      {b.stock_status === 'sold_out' ? 'Sold out' : 'In stock'}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    {b.is_published ? (
                      <button
                        type="button"
                        className={`${btn.linkDanger} mr-3`}
                        onClick={() => setConfirm({ action: 'reject', book: b })}
                      >
                        Unpublish
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={`${btn.linkPrimary} mr-3`}
                        onClick={() => setConfirm({ action: 'approve', book: b })}
                      >
                        Approve
                      </button>
                    )}
                    <button type="button" className={`${btn.linkPrimary} mr-3`} onClick={() => openEdit(b)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className={btn.linkDanger}
                      onClick={() => setConfirm({ action: 'delete', book: b })}
                    >
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
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? `Edit book — ${editing.title}` : 'Add new book'}
        description={editing ? `Book #${editing.id}` : 'Creates a catalog entry you can publish any time.'}
        width="max-w-3xl"
      >
        <form onSubmit={save} className="space-y-4">
          {formError && (
            <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-2 text-sm text-error">{formError}</p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title *" className="sm:col-span-2">
              <input
                className={inputCls}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </Field>
            {!editing && (
              <Field label="Slug (optional)">
                <input
                  className={inputCls}
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="generated from title"
                />
              </Field>
            )}
            <Field label="Author name *">
              <input
                className={inputCls}
                value={form.author_name}
                onChange={(e) => setForm({ ...form, author_name: e.target.value })}
                required
              />
            </Field>
            <Field label="Author ID (optional)">
              <input
                className={inputCls}
                type="number"
                value={form.author_id}
                onChange={(e) => setForm({ ...form, author_id: e.target.value })}
              />
            </Field>
            <Field label="Category *">
              <input
                className={inputCls}
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                required
              />
            </Field>
            <Field label="Description" className="sm:col-span-2">
              <textarea
                className={inputCls}
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </Field>

            <Field label="Price (PKR) *">
              <input
                className={inputCls}
                type="number"
                min="0"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                required
              />
            </Field>
            <Field label="Sale price (PKR)">
              <input
                className={inputCls}
                type="number"
                min="0"
                value={form.sale_price}
                onChange={(e) => setForm({ ...form, sale_price: e.target.value })}
                placeholder="leave empty for none"
              />
            </Field>
            <Field label="Pages">
              <input
                className={inputCls}
                type="number"
                min="1"
                value={form.pages}
                onChange={(e) => setForm({ ...form, pages: e.target.value })}
              />
            </Field>
            <Field label="Rating (0–5)">
              <input
                className={inputCls}
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={form.rating}
                onChange={(e) => setForm({ ...form, rating: e.target.value })}
              />
            </Field>
            <Field label="Year">
              <input
                className={inputCls}
                type="number"
                value={form.year}
                onChange={(e) => setForm({ ...form, year: e.target.value })}
              />
            </Field>
            <Field label="Copies sold">
              <input
                className={inputCls}
                type="number"
                min="0"
                value={form.copies_sold}
                onChange={(e) => setForm({ ...form, copies_sold: e.target.value })}
              />
            </Field>
            <Field label="Stock status">
              <select
                className={inputCls}
                value={form.stock_status}
                onChange={(e) => setForm({ ...form, stock_status: e.target.value })}
              >
                <option value="in_stock">In stock</option>
                <option value="sold_out">Sold out</option>
              </select>
            </Field>
            <Field label="Badge">
              <input
                className={inputCls}
                value={form.badge}
                onChange={(e) => setForm({ ...form, badge: e.target.value })}
                placeholder="e.g. New Release"
              />
            </Field>
            <Field label="Template">
              <select
                className={inputCls}
                value={form.template}
                onChange={(e) => setForm({ ...form, template: e.target.value })}
              >
                {TEMPLATES.map((t) => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </Field>
            <Field label="Cover class">
              <select
                className={inputCls}
                value={form.cover_class}
                onChange={(e) => setForm({ ...form, cover_class: e.target.value })}
              >
                {COVER_CLASSES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Ornament">
              <input
                className={inputCls}
                value={form.ornament}
                onChange={(e) => setForm({ ...form, ornament: e.target.value })}
              />
            </Field>

            <Field label="Front cover image">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFrontFile(e.target.files?.[0] || null)}
                className="w-full rounded-xl border border-border bg-surface px-3 py-1.5 text-xs text-ink outline-none file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-ink"
              />
              {editing?.image && !frontFile && (
                <span className="mt-1 block font-mono text-[10px] text-ink/40">Current cover kept</span>
              )}
            </Field>
            <Field label="Back cover image">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setBackFile(e.target.files?.[0] || null)}
                className="w-full rounded-xl border border-border bg-surface px-3 py-1.5 text-xs text-ink outline-none file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-ink"
              />
              {editing?.back_image && !backFile && (
                <span className="mt-1 block font-mono text-[10px] text-ink/40">Current back cover kept</span>
              )}
            </Field>

            <div className="sm:col-span-2 rounded-xl border border-border bg-muted/50 p-4">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-ink">
                  <input
                    type="checkbox"
                    checked={form.is_published === 'true'}
                    onChange={(e) =>
                      setForm({ ...form, is_published: e.target.checked ? 'true' : 'false' })
                    }
                  />
                  Publish immediately
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-ink">
                  <input
                    type="checkbox"
                    checked={form.is_best_seller === 'true'}
                    onChange={(e) =>
                      setForm({ ...form, is_best_seller: e.target.checked ? 'true' : 'false' })
                    }
                  />
                  Best seller
                </label>
                {form.is_best_seller === 'true' && (
                  <label className="flex items-center gap-2 text-sm text-ink/70">
                    Rank
                    <input
                      type="number"
                      min="1"
                      className="w-20 rounded-lg border border-border bg-surface px-2 py-1 text-sm outline-none focus:border-primary"
                      value={form.best_seller_rank}
                      onChange={(e) => setForm({ ...form, best_seller_rank: e.target.value })}
                    />
                  </label>
                )}
              </div>
              <p className="mt-2 text-xs text-ink/45">
                {form.is_published === 'true'
                  ? 'Visible on the public site right away.'
                  : 'Saved as pending — approve it from the table when ready.'}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <button type="button" className={btn.secondary} onClick={() => setFormOpen(false)}>
              Cancel
            </button>
            <button type="submit" className={btn.primary} disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Add book'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        title={
          confirm?.action === 'delete'
            ? 'Delete book?'
            : confirm?.action === 'approve'
            ? 'Approve & publish?'
            : 'Unpublish book?'
        }
        message={
          confirm?.action === 'delete'
            ? `"${confirm?.book?.title}" will be permanently removed from the catalog.`
            : confirm?.action === 'approve'
            ? `"${confirm?.book?.title}" will become visible on the public site.`
            : `"${confirm?.book?.title}" will be hidden from the public site.`
        }
        confirmLabel={
          confirm?.action === 'delete' ? 'Delete' : confirm?.action === 'approve' ? 'Approve' : 'Unpublish'
        }
        danger={confirm?.action !== 'approve'}
        busy={busy}
        onConfirm={runConfirm}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}

function Field({ label, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium text-ink/70">{label}</span>
      {children}
    </label>
  );
}
