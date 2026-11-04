const { getDb } = require('../connection');

const SORTS = {
  newest: (a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')),
  rating: (a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0),
  price_asc: (a, b) => effPrice(a) - effPrice(b),
  price_desc: (a, b) => effPrice(b) - effPrice(a),
  popular: (a, b) => (Number(b.copies_sold) || 0) - (Number(a.copies_sold) || 0),
  title: (a, b) => String(a.title || '').localeCompare(String(b.title || '')),
};

function effPrice(b) {
  const v = b.sale_price != null ? b.sale_price : b.price;
  return Number(v) || 0;
}

function applySort(rows, sort) {
  const cmp = SORTS[sort] || SORTS.newest;
  return [...rows].sort(cmp);
}

function safeLike(q) {
  return String(q).replace(/[,%_()\\]/g, ' ').replace(/\s+/g, ' ').trim();
}

async function listBooks({ category = null, sort = 'newest', limit = 60 } = {}) {
  const db = getDb();
  let query = db.from('books').select('*').eq('is_published', 1);
  if (category && category !== 'all') query = query.eq('category', category);
  const { data, error } = await query;
  if (error) throw error;
  return applySort(data || [], sort).slice(0, limit);
}

async function getBookById(id) {
  const db = getDb();
  const { data, error } = await db
    .from('books')
    .select('*')
    .eq('id', id)
    .eq('is_published', 1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function getBookBySlug(slug) {
  const db = getDb();
  const { data, error } = await db
    .from('books')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', 1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function getBestSellers(limit = 4) {
  const db = getDb();
  const { data, error } = await db
    .from('books')
    .select('*')
    .eq('is_published', 1)
    .eq('is_best_seller', 1)
    .order('best_seller_rank', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

async function getCategories() {
  const db = getDb();
  const { data, error } = await db.from('books').select('category').eq('is_published', 1);
  if (error) throw error;
  const set = new Set((data || []).map((r) => r.category).filter(Boolean));
  return [...set].sort();
}

function slugify(title) {
  return String(title)
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function bookInsertPayload(book, { submittedBy = null, isPublished = null } = {}) {
  return {
    title: book.title,
    slug: book.slug || slugify(book.title),
    author_id: book.author_id ?? null,
    author_name: book.author_name,
    category: book.category,
    description: book.description ?? null,
    cover_class: book.cover_class ?? 'c1',
    ornament: book.ornament ?? '❀',
    pages: book.pages ?? 200,
    rating: book.rating ?? 4.5,
    year: book.year ?? 2026,
    copies_sold: book.copies_sold ?? 0,
    price: book.price ?? 1499,
    sale_price: book.sale_price ?? null,
    stock_status: book.stock_status ?? 'in_stock',
    badge: book.badge ?? null,
    is_best_seller: book.is_best_seller ? 1 : 0,
    best_seller_rank: book.best_seller_rank ?? null,
    is_published: isPublished != null ? isPublished : book.is_published === false || book.is_published === 0 ? 0 : 1,
    image: book.image ?? null,
    back_image: book.back_image ?? null,
    template: book.template ?? 'hardcover',
    submitted_by: submittedBy,
  };
}

async function createBook(book) {
  const db = getDb();
  const payload = bookInsertPayload(book);
  const { data, error } = await db.from('books').insert(payload).select().single();
  if (error) throw error;
  return { ...payload, id: data.id };
}

async function submitBook(book, submittedBy = null) {
  const db = getDb();
  const payload = bookInsertPayload(book, { submittedBy, isPublished: 0 });
  payload.badge = book.badge || 'Pending Review';
  payload.copies_sold = 0;
  const { data, error } = await db.from('books').insert(payload).select().single();
  if (error) throw error;
  return { ...payload, id: data.id, is_published: 0 };
}

async function searchBooks(q, { category = null, sort = 'newest', limit = 25 } = {}) {
  const db = getDb();
  const term = safeLike(q);
  if (!term) return [];
  let query = db
    .from('books')
    .select('*')
    .eq('is_published', 1)
    .or(`title.ilike.%${term}%,author_name.ilike.%${term}%,category.ilike.%${term}%`);
  if (category && category !== 'all') query = query.eq('category', category);
  const { data, error } = await query;
  if (error) throw error;
  return applySort(data || [], sort).slice(0, limit);
}

async function listAllBooks({ category = null, sort = 'newest', limit = 100 } = {}) {
  const db = getDb();
  let query = db.from('books').select('*');
  if (category && category !== 'all') query = query.eq('category', category);
  const { data, error } = await query;
  if (error) throw error;
  return applySort(data || [], sort).slice(0, limit);
}

async function getBookByIdAdmin(id) {
  const db = getDb();
  const { data, error } = await db.from('books').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

async function listBooksByUser(userId) {
  const db = getDb();
  const { data, error } = await db
    .from('books')
    .select('*')
    .eq('submitted_by', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function updateBook(id, fields) {
  const db = getDb();
  const { data, error } = await db
    .from('books')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function approveBook(id) {
  return updateBook(id, { is_published: 1 });
}

async function rejectBook(id) {
  return updateBook(id, { is_published: 0 });
}

async function deleteBook(id) {
  const db = getDb();
  const { error } = await db.from('books').delete().eq('id', id);
  if (error) throw error;
  return { id, deleted: true };
}

function isUniqueError(err) {
  return Boolean(err && (err.code === '23505' || /duplicate key|unique/i.test(err.message || '')));
}

module.exports = {
  listBooks,
  getBookById,
  getBookBySlug,
  getBestSellers,
  getCategories,
  createBook,
  submitBook,
  searchBooks,
  listAllBooks,
  getBookByIdAdmin,
  listBooksByUser,
  updateBook,
  approveBook,
  rejectBook,
  deleteBook,
  slugify,
  isUniqueError,
};
