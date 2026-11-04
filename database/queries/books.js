const { getDb } = require('../connection');

const SORTS = {
  newest: 'created_at DESC',
  rating: 'rating DESC',
  price_asc: 'COALESCE(sale_price, price) ASC',
  price_desc: 'COALESCE(sale_price, price) DESC',
  popular: 'copies_sold DESC',
  title: 'title ASC'
};

function listBooks({ category = null, sort = 'newest', limit = 60 } = {}) {
  const db = getDb();
  const orderBy = SORTS[sort] || SORTS.newest;
  if (category && category !== 'all') {
    return db
      .prepare(
        `SELECT * FROM books WHERE is_published = 1 AND category = ? ORDER BY ${orderBy} LIMIT ?`
      )
      .all(category, limit);
  }
  return db
    .prepare(`SELECT * FROM books WHERE is_published = 1 ORDER BY ${orderBy} LIMIT ?`)
    .all(limit);
}

function getBookById(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM books WHERE id = ? AND is_published = 1').get(id);
}

function getBookBySlug(slug) {
  const db = getDb();
  return db.prepare('SELECT * FROM books WHERE slug = ? AND is_published = 1').get(slug);
}

function getBestSellers(limit = 4) {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM books
       WHERE is_published = 1 AND is_best_seller = 1
       ORDER BY best_seller_rank ASC LIMIT ?`
    )
    .all(limit);
}

function getCategories() {
  const db = getDb();
  return db
    .prepare('SELECT DISTINCT category FROM books WHERE is_published = 1 ORDER BY category')
    .all()
    .map((r) => r.category);
}

function createBook(book) {
  const db = getDb();
  const slug =
    book.slug ||
    String(book.title)
      .toLowerCase()
      .replace(/['’]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  const info = db
    .prepare(
      `INSERT INTO books (title, slug, author_id, author_name, category, description, cover_class,
         ornament, pages, rating, year, copies_sold, price, sale_price, stock_status, badge,
         is_best_seller, best_seller_rank, is_published, image, back_image, template)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        book.title,
        slug,
        book.author_id ?? null,
        book.author_name,
        book.category,
        book.description ?? null,
        book.cover_class ?? 'c1',
        book.ornament ?? '❀',
        book.pages ?? 200,
        book.rating ?? 4.5,
        book.year ?? 2026,
        book.copies_sold ?? 0,
        book.price ?? 1499,
        book.sale_price ?? null,
        book.stock_status ?? 'in_stock',
        book.badge ?? null,
        book.is_best_seller ? 1 : 0,
        book.best_seller_rank ?? null,
        book.is_published === false ? 0 : 1,
        book.image ?? null,
        book.back_image ?? null,
        book.template ?? 'hardcover'
      );
  return { id: Number(info.lastInsertRowid), slug, ...book };
}

function searchBooks(q) {
  const db = getDb();
  const like = `%${q}%`;
  return db
    .prepare(
      `SELECT * FROM books
       WHERE is_published = 1 AND (title LIKE ? OR author_name LIKE ? OR category LIKE ?)
       ORDER BY rating DESC LIMIT 25`
    )
    .all(like, like, like);
}

// Admin: list all books including pending
function listAllBooks({ category = null, sort = 'newest', limit = 100 } = {}) {
  const db = getDb();
  const orderBy = SORTS[sort] || SORTS.newest;
  if (category && category !== 'all') {
    return db
      .prepare(
        `SELECT * FROM books WHERE category = ? ORDER BY ${orderBy} LIMIT ?`
      )
      .all(category, limit);
  }
  return db.prepare(`SELECT * FROM books ORDER BY ${orderBy} LIMIT ?`).all(limit);
}

// Admin: get book by id without published filter
function getBookByIdAdmin(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM books WHERE id = ?').get(id);
}

// Admin: approve a book
function approveBook(id) {
  const db = getDb();
  db.prepare('UPDATE books SET is_published = 1 WHERE id = ?').run(id);
  return getBookByIdAdmin(id);
}

// Admin: reject/unpublish a book
function rejectBook(id) {
  const db = getDb();
  db.prepare('UPDATE books SET is_published = 0 WHERE id = ?').run(id);
  return getBookByIdAdmin(id);
}

// Admin: delete a book
function deleteBook(id) {
  const db = getDb();
  db.prepare('DELETE FROM books WHERE id = ?').run(id);
  return { id: Number(id), deleted: true };
}

// User: submit a book as pending
function submitBook(book) {
  const db = getDb();
  const slug =
    book.slug ||
    String(book.title)
      .toLowerCase()
      .replace(/['’]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  const info = db
    .prepare(
      `INSERT INTO books (title, slug, author_id, author_name, category, description, cover_class,
         ornament, pages, rating, year, copies_sold, price, sale_price, stock_status, badge,
         is_best_seller, best_seller_rank, is_published, image, back_image, template)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'hardcover')`
      )
      .run(
        book.title,
        slug,
        book.author_id ?? null,
        book.author_name,
        book.category,
        book.description ?? null,
        book.cover_class ?? 'c1',
        book.ornament ?? '❀',
        book.pages ?? 200,
        book.rating ?? 4.5,
        book.year ?? 2026,
        book.copies_sold ?? 0,
        book.price ?? 1499,
        book.sale_price ?? null,
        book.stock_status ?? 'in_stock',
        book.badge ?? null,
        book.is_best_seller ? 1 : 0,
        book.best_seller_rank ?? null,
        book.image ?? null,
        book.back_image ?? null
      );
  return { id: Number(info.lastInsertRowid), slug, ...book, is_published: 0 };
}

module.exports = {
  listBooks,
  getBookById,
  getBookBySlug,
  getBestSellers,
  getCategories,
  createBook,
  searchBooks,
  listAllBooks,
  getBookByIdAdmin,
  approveBook,
  rejectBook,
  deleteBook,
  submitBook
};
