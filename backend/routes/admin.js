const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../../database');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { validateBook } = require('../middleware/validate');
const { listUsers, getUserById } = require('../utils/auth');

const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'books');
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-]/g, '_');
    const unique = `${Date.now()}-${safeName}`;
    cb(null, unique);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) {
      return cb(new Error('Only image files are allowed'), false);
    }
    cb(null, true);
  },
});

const router = Router();

// All admin routes require auth + admin role
router.use(authMiddleware);
router.use(adminMiddleware);

// ---- Stats ----
router.get('/adminpanelcode/stats', (_req, res) => {
  const users = listUsers();
  const books = db.listAllBooks();
  const quotes = db.listQuotes();
  const leads = db.listLeads();
  const newsletter = db.listNewsletter();

  const revenue = books.reduce(
    (sum, b) => sum + (Number(b.price) || 0) * (Number(b.copies_sold) || 0),
    0
  );

  const categoryCounts = {};
  books.forEach((b) => {
    const c = b.category || 'Uncategorized';
    categoryCounts[c] = (categoryCounts[c] || 0) + 1;
  });

  const topBooks = [...books]
    .sort((a, b) => (Number(b.copies_sold) || 0) - (Number(a.copies_sold) || 0))
    .slice(0, 5)
    .map((b) => ({
      id: b.id,
      title: b.title,
      image: b.image,
      price: b.price,
      copies_sold: Number(b.copies_sold) || 0,
      is_published: b.is_published,
    }));

  const recentActivity = [
    ...users.slice(0, 4).map((u) => ({
      type: 'user',
      label: `${u.name} joined`,
      detail: u.email,
      at: u.created_at,
    })),
    ...books.slice(0, 4).map((b) => ({
      type: 'book',
      label: `"${b.title}" ${b.is_published ? 'published' : 'submitted for review'}`,
      detail: b.author_name,
      at: b.created_at,
    })),
    ...quotes.slice(0, 4).map((q) => ({
      type: 'quote',
      label: `Quote request from ${q.name}`,
      detail: q.book_title,
      at: q.created_at,
    })),
    ...leads.slice(0, 4).map((l) => ({
      type: 'lead',
      label: `${l.name} sent a message`,
      detail: l.type,
      at: l.created_at,
    })),
    ...newsletter.slice(0, 4).map((n) => ({
      type: 'newsletter',
      label: `${n.email} subscribed`,
      detail: 'newsletter',
      at: n.created_at,
    })),
  ]
    .filter((x) => x.at)
    .sort((a, b) => String(b.at).localeCompare(String(a.at)))
    .slice(0, 8);

  const stats = {
    users: users.length,
    admins: users.filter((u) => u.role === 'admin').length,
    authors: db.listAuthors().length,
    books: books.length,
    publishedBooks: books.filter((b) => b.is_published).length,
    pendingBooks: books.filter((b) => !b.is_published).length,
    quotes: quotes.length,
    pendingQuotes: quotes.filter((q) => q.status === 'pending').length,
    leads: leads.length,
    newsletter: newsletter.length,
    revenue,
    categoryCounts,
    topBooks,
    recentActivity,
  };
  res.json({ ok: true, stats });
});

// ---- Users ----
router.get('/adminpanelcode/users', (_req, res) => {
  res.json({ ok: true, users: listUsers() });
});

router.patch('/adminpanelcode/users/:id/role', (req, res) => {
  const id = Number(req.params.id);
  const { role } = req.body || {};
  if (role !== 'admin' && role !== 'user') {
    return res.status(400).json({ error: "role must be 'admin' or 'user'" });
  }
  if (Number(req.user.id) === id && role !== 'admin') {
    return res.status(400).json({ error: 'You cannot demote your own account' });
  }
  const dbConn = require('../../database/connection').getDb();
  const info = dbConn.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
  if (!info.changes) return res.status(404).json({ error: 'User not found' });
  res.json({ ok: true, user: getUserById(id) });
});

router.delete('/adminpanelcode/users/:id', (req, res) => {
  const id = Number(req.params.id);
  if (Number(req.user.id) === id) {
    return res.status(400).json({ error: 'You cannot delete your own account' });
  }
  const dbConn = require('../../database/connection').getDb();
  const target = dbConn.prepare('SELECT id, role FROM users WHERE id = ?').get(id);
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (target.role === 'admin') {
    return res.status(403).json({ error: 'Admin accounts cannot be deleted — demote them first' });
  }
  dbConn.prepare('DELETE FROM users WHERE id = ?').run(id);
  res.json({ ok: true, id, deleted: true });
});

// ---- Authors ----
router.get('/adminpanelcode/authors', (_req, res) => {
  res.json({ ok: true, authors: db.listAuthors() });
});

router.patch('/adminpanelcode/authors/:id', (req, res) => {
  const id = Number(req.params.id);
  const dbConn = require('../../database/connection').getDb();
  const existing = dbConn.prepare('SELECT * FROM authors WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Author not found' });

  const { name, bio, role } = req.body || {};
  if (name !== undefined && !String(name).trim()) {
    return res.status(400).json({ error: 'name cannot be empty' });
  }
  const updated = {
    name: name !== undefined ? String(name).trim() : existing.name,
    bio: bio !== undefined ? bio : existing.bio,
    role: role !== undefined ? role : existing.role,
  };
  dbConn
    .prepare('UPDATE authors SET name = ?, bio = ?, role = ? WHERE id = ?')
    .run(updated.name, updated.bio ?? null, updated.role ?? null, id);
  res.json({ ok: true, author: dbConn.prepare('SELECT * FROM authors WHERE id = ?').get(id) });
});

router.post('/adminpanelcode/authors', (req, res) => {
  const { name, bio, role } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name is required' });
  const dbConn = require('../../database/connection').getDb();
  const info = dbConn
    .prepare('INSERT INTO authors (name, bio, role) VALUES (?, ?, ?)')
    .run(name, bio ?? null, role ?? null);
  res.status(201).json({ ok: true, id: Number(info.lastInsertRowid), name, bio, role });
});

router.delete('/adminpanelcode/authors/:id', (req, res) => {
  const id = Number(req.params.id);
  const dbConn = require('../../database/connection').getDb();
  dbConn.prepare('DELETE FROM authors WHERE id = ?').run(id);
  res.json({ ok: true, id, deleted: true });
});

// ---- Quotes ----
router.get('/adminpanelcode/quotes', (req, res) => {
  const { status } = req.query;
  res.json({ ok: true, quotes: db.listQuotes(status || null) });
});

router.patch('/adminpanelcode/quotes/:id', (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'status is required' });
  const updated = db.updateQuoteStatus(Number(req.params.id), status);
  res.json({ ok: true, quote: updated });
});

router.delete('/adminpanelcode/quotes/:id', (req, res) => {
  const id = Number(req.params.id);
  const dbConn = require('../../database/connection').getDb();
  const info = dbConn.prepare('DELETE FROM quotes WHERE id = ?').run(id);
  if (!info.changes) return res.status(404).json({ error: 'Quote not found' });
  res.json({ ok: true, id, deleted: true });
});

// ---- Leads (contact form submissions) ----
router.get('/adminpanelcode/leads', (req, res) => {
  res.json({ ok: true, leads: db.listLeads(req.query.type || null) });
});

router.delete('/adminpanelcode/leads/:id', (req, res) => {
  const id = Number(req.params.id);
  const dbConn = require('../../database/connection').getDb();
  const info = dbConn.prepare('DELETE FROM leads WHERE id = ?').run(id);
  if (!info.changes) return res.status(404).json({ error: 'Lead not found' });
  res.json({ ok: true, id, deleted: true });
});

// ---- Newsletter subscribers ----
router.get('/adminpanelcode/newsletter', (_req, res) => {
  res.json({ ok: true, subscribers: db.listNewsletter() });
});

router.delete('/adminpanelcode/newsletter/:id', (req, res) => {
  const id = Number(req.params.id);
  const dbConn = require('../../database/connection').getDb();
  const info = dbConn.prepare('DELETE FROM newsletter WHERE id = ?').run(id);
  if (!info.changes) return res.status(404).json({ error: 'Subscriber not found' });
  res.json({ ok: true, id, deleted: true });
});

// ---- Books (Admin) ----
router.get('/adminpanelcode/books', (_req, res) => {
  res.json({ ok: true, books: db.listAllBooks() });
});

// Approve a pending book
router.patch('/adminpanelcode/books/:id/approve', (req, res) => {
  const book = db.approveBook(Number(req.params.id));
  if (!book) return res.status(404).json({ error: 'Book not found' });
  res.json({ ok: true, book });
});

// Reject/unpublish a book
router.patch('/adminpanelcode/books/:id/reject', (req, res) => {
  const book = db.rejectBook(Number(req.params.id));
  if (!book) return res.status(404).json({ error: 'Book not found' });
  res.json({ ok: true, book });
});

// Delete a book
router.delete('/adminpanelcode/books/:id', (req, res) => {
  const result = db.deleteBook(Number(req.params.id));
  res.json({ ok: true, ...result });
});

// Create a new book (admin direct add)
router.post('/adminpanelcode/books', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'back_image', maxCount: 1 }]), validateBook, (req, res) => {
  try {
    const files = req.files || {};
    const frontFile = files.image?.[0];
    const backFile = files.back_image?.[0];
    const book = {
      title: req.body.title,
      slug: req.body.slug || undefined,
      author_id: req.body.author_id ? Number(req.body.author_id) : null,
      author_name: req.body.author_name,
      category: req.body.category,
      description: req.body.description,
      cover_class: req.body.cover_class || 'c1',
      ornament: req.body.ornament || '❀',
      pages: req.body.pages ? Number(req.body.pages) : 200,
      rating: req.body.rating ? Number(req.body.rating) : 4.5,
      year: req.body.year ? Number(req.body.year) : 2026,
      copies_sold: req.body.copies_sold ? Number(req.body.copies_sold) : 0,
      price: req.body.price ? Number(req.body.price) : 1499,
      sale_price: req.body.sale_price ? Number(req.body.sale_price) : null,
      stock_status: req.body.stock_status || 'in_stock',
      badge: req.body.badge || null,
      is_best_seller: req.body.is_best_seller === 'true' || req.body.is_best_seller === true,
      best_seller_rank: req.body.best_seller_rank ? Number(req.body.best_seller_rank) : null,
      is_published: req.body.is_published === 'false' ? false : true,
      image: frontFile ? `/uploads/books/${frontFile.filename}` : req.body.image || null,
      back_image: backFile ? `/uploads/books/${backFile.filename}` : req.body.back_image || null,
      template: req.body.template || 'hardcover',
    };
    const created = db.createBook(book);
    res.status(201).json({ ok: true, book: created });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'A book with this slug already exists' });
    }
    throw err;
  }
});

// Update a book
router.patch('/adminpanelcode/books/:id', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'back_image', maxCount: 1 }]), validateBook, (req, res) => {
  try {
    const id = Number(req.params.id);
    const dbConn = require('../../database/connection').getDb();
    const existing = dbConn.prepare('SELECT * FROM books WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Book not found' });

    const files = req.files || {};
    const frontFile = files.image?.[0];
    const backFile = files.back_image?.[0];
    const image = frontFile ? `/uploads/books/${frontFile.filename}` : existing.image;
    const back_image = backFile ? `/uploads/books/${backFile.filename}` : existing.back_image;
    const fields = [];
    const values = [];
    const setField = (key, val) => {
      if (val !== undefined) {
        fields.push(`${key} = ?`);
        values.push(val);
      }
    };

    setField('title', req.body.title);
    setField('author_name', req.body.author_name);
    setField('category', req.body.category);
    setField('description', req.body.description);
    setField('cover_class', req.body.cover_class);
    setField('ornament', req.body.ornament);
    setField('pages', req.body.pages ? Number(req.body.pages) : undefined);
    setField('rating', req.body.rating ? Number(req.body.rating) : undefined);
    setField('year', req.body.year ? Number(req.body.year) : undefined);
    setField('copies_sold', req.body.copies_sold ? Number(req.body.copies_sold) : undefined);
    setField('price', req.body.price ? Number(req.body.price) : undefined);
    setField('sale_price', req.body.sale_price ? Number(req.body.sale_price) : null);
    setField('stock_status', req.body.stock_status);
    setField('badge', req.body.badge);
    setField('is_best_seller', req.body.is_best_seller !== undefined ? (req.body.is_best_seller === 'true' ? 1 : 0) : undefined);
    setField('best_seller_rank', req.body.best_seller_rank ? Number(req.body.best_seller_rank) : null);
    setField('is_published', req.body.is_published !== undefined ? (req.body.is_published === 'false' ? 0 : 1) : undefined);
    setField('image', image);
    setField('back_image', back_image);
    setField('template', req.body.template);

    if (fields.length === 0) return res.json({ ok: true, book: existing });

    values.push(id);
    dbConn.prepare(`UPDATE books SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    const updated = dbConn.prepare('SELECT * FROM books WHERE id = ?').get(id);
    res.json({ ok: true, book: updated });
  } catch (err) {
    throw err;
  }
});

// ---- User book submission ----
router.post('/books/submit', upload.single('image'), validateBook, (req, res) => {
  try {
    const book = {
      title: req.body.title,
      slug: req.body.slug || undefined,
      author_id: req.body.author_id ? Number(req.body.author_id) : null,
      author_name: req.body.author_name,
      category: req.body.category,
      description: req.body.description,
      cover_class: req.body.cover_class || 'c1',
      ornament: req.body.ornament || '❀',
      pages: req.body.pages ? Number(req.body.pages) : 200,
      rating: req.body.rating ? Number(req.body.rating) : 4.5,
      year: req.body.year ? Number(req.body.year) : 2026,
      copies_sold: 0,
      price: req.body.price ? Number(req.body.price) : 1499,
      sale_price: req.body.sale_price ? Number(req.body.sale_price) : null,
      stock_status: 'in_stock',
      badge: req.body.badge || 'Pending Review',
      is_best_seller: 0,
      best_seller_rank: null,
      is_published: false,
      image: req.file ? `/uploads/books/${req.file.filename}` : null,
      template: 'hardcover',
    };
    const created = db.submitBook(book);
    res.status(201).json({ ok: true, book: created, message: 'Book submitted for review' });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'A book with this slug already exists' });
    }
    throw err;
  }
});

module.exports = router;
