const path = require('path');
const crypto = require('crypto');
const { Router } = require('express');
const multer = require('multer');
const db = require('../database');
const { getDb } = require('../database/connection');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { validateBook, validateStatus } = require('../middleware/validate');
const { listUsers, getUserPublic, getUserById } = require('../utils/auth');
const { uploadBuffer, createSignedReadUrl, publicUrlFor } = require('../utils/storage');
const { assertSafeUpload } = require('../utils/uploadGuard');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (!allowed.includes(ext)) {
      return cb(new Error('Only image files are allowed'), false);
    }
    cb(null, true);
  },
});

const router = Router();

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// All admin routes require auth + admin role
router.use(authMiddleware);
router.use(adminMiddleware);

// ---- Stats ----
router.get(
  '/stats',
  wrap(async (_req, res) => {
    const [
      users,
      books,
      quotes,
      leads,
      newsletter,
      authors,
      allReviews,
      orders,
      applications,
    ] = await Promise.all([
      listUsers(),
      db.listAllBooks(),
      db.listQuotes(),
      db.listLeads(),
      db.listNewsletter(),
      db.listAuthors(),
      db.listAllReviews(),
      db.listOrders(),
      db.listAuthorApplications(),
    ]);

    const revenue = books.reduce(
      (sum, b) => sum + (Number(b.price) || 0) * (Number(b.copies_sold) || 0),
      0
    );
    const orderRevenue = orders
      .filter((o) => o.status !== 'cancelled')
      .reduce((sum, o) => sum + (Number(o.total) || 0), 0);

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
      authors: authors.length,
      books: books.length,
      publishedBooks: books.filter((b) => b.is_published).length,
      pendingBooks: books.filter((b) => !b.is_published).length,
      quotes: quotes.length,
      pendingQuotes: quotes.filter((q) => q.status === 'pending').length,
      leads: leads.length,
      newsletter: newsletter.length,
      orders: orders.length,
      pendingOrders: orders.filter((o) => o.status === 'pending').length,
      reviews: allReviews.length,
      pendingReviews: allReviews.filter((r) => r.status === 'pending').length,
      authorApplications: applications.length,
      pendingApplications: applications.filter((a) => a.status === 'pending').length,
      revenue,
      orderRevenue,
      categoryCounts,
      topBooks,
      recentActivity,
    };
    res.json({ ok: true, stats });
  })
);

// ---- Users ----
router.get(
  '/users',
  wrap(async (_req, res) => {
    res.json({ ok: true, users: await listUsers() });
  })
);

router.patch(
  '/users/:id/role',
  wrap(async (req, res) => {
    const id = req.params.id;
    const { role } = req.body || {};
    if (role !== 'admin' && role !== 'user' && role !== 'author') {
      return res.status(400).json({ error: "role must be 'admin', 'author' or 'user'" });
    }
    if (req.user.id === id && role !== 'admin') {
      return res.status(400).json({ error: 'You cannot demote your own account' });
    }
    const database = getDb();
    const { data, error } = await database
      .from('users')
      .update({ role })
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'User not found' });
    const safe = await getUserPublic(id);
    res.json({ ok: true, user: safe });
  })
);

router.delete(
  '/users/:id',
  wrap(async (req, res) => {
    const id = req.params.id;
    if (req.user.id === id) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }
    const target = await getUserById(id);
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (target.role === 'admin') {
      return res.status(403).json({ error: 'Admin accounts cannot be deleted — demote them first' });
    }
    const database = getDb();
    const { error } = await database.from('users').delete().eq('id', id);
    if (error) throw error;
    res.json({ ok: true, id, deleted: true });
  })
);

// ---- Authors (attribution profiles) ----
router.get(
  '/authors',
  wrap(async (_req, res) => {
    res.json({ ok: true, authors: await db.listAuthors() });
  })
);

router.patch(
  '/authors/:id',
  wrap(async (req, res) => {
    const id = req.params.id;
    const database = getDb();
    const { data: existing, error: findErr } = await database
      .from('authors')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (findErr) throw findErr;
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
    const { data, error } = await database
      .from('authors')
      .update(updated)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    res.json({ ok: true, author: data });
  })
);

router.post(
  '/authors',
  wrap(async (req, res) => {
    const { name, bio, role } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name is required' });
    const database = getDb();
    const { data, error } = await database
      .from('authors')
      .insert({ name, bio: bio ?? null, role: role ?? null })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ ok: true, id: data.id, name: data.name, bio: data.bio, role: data.role });
  })
);

router.delete(
  '/authors/:id',
  wrap(async (req, res) => {
    const database = getDb();
    const { error } = await database.from('authors').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true, id: req.params.id, deleted: true });
  })
);

// ---- Quotes ----
router.get(
  '/quotes',
  wrap(async (req, res) => {
    const { status } = req.query;
    res.json({ ok: true, quotes: await db.listQuotes(status || null) });
  })
);

// Resolve a quote's stored file references to downloadable URLs
router.get(
  '/quotes/:id/files',
  wrap(async (req, res) => {
    const quotes = await db.listQuotes();
    const quote = quotes.find((q) => q.id === req.params.id);
    if (!quote) return res.status(404).json({ error: 'Quote not found' });

    let manuscriptUrl = null;
    if (quote.manuscript_file && quote.manuscript_file.startsWith('manuscripts/')) {
      manuscriptUrl = (await createSignedReadUrl('manuscripts', quote.manuscript_file)).url;
    }

    const coverUrl = (value) => {
      if (!value) return null;
      if (/^https?:\/\//.test(value)) return value;
      if (value.startsWith('covers/')) return publicUrlFor('uploads', value);
      return null;
    };

    res.json({
      ok: true,
      files: {
        manuscript_url: manuscriptUrl,
        front_cover_url: coverUrl(quote.front_cover_file),
        back_cover_url: coverUrl(quote.back_cover_file),
      },
    });
  })
);

router.patch(
  '/quotes/:id',
  wrap(async (req, res) => {
    const { status } = req.body;
    if (!status || !['pending', 'reviewed', 'sent'].includes(status)) {
      return res.status(400).json({ error: "status must be 'pending', 'reviewed' or 'sent'" });
    }
    const updated = await db.updateQuoteStatus(req.params.id, status);
    res.json({ ok: true, quote: updated });
  })
);

router.delete(
  '/quotes/:id',
  wrap(async (req, res) => {
    const result = await db.deleteQuote(req.params.id);
    res.json({ ok: true, ...result });
  })
);

// ---- Leads (contact form submissions) ----
router.get(
  '/leads',
  wrap(async (req, res) => {
    res.json({ ok: true, leads: await db.listLeads(req.query.type || null) });
  })
);

router.delete(
  '/leads/:id',
  wrap(async (req, res) => {
    const database = getDb();
    const { data, error } = await database
      .from('leads')
      .delete()
      .eq('id', req.params.id)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Lead not found' });
    res.json({ ok: true, id: req.params.id, deleted: true });
  })
);

// ---- Newsletter subscribers ----
router.get(
  '/newsletter',
  wrap(async (_req, res) => {
    res.json({ ok: true, subscribers: await db.listNewsletter() });
  })
);

router.delete(
  '/newsletter/:id',
  wrap(async (req, res) => {
    const database = getDb();
    const { data, error } = await database
      .from('newsletter')
      .delete()
      .eq('id', req.params.id)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Subscriber not found' });
    res.json({ ok: true, id: req.params.id, deleted: true });
  })
);

// ---- Books (Admin) ----
router.get(
  '/books',
  wrap(async (_req, res) => {
    res.json({ ok: true, books: await db.listAllBooks() });
  })
);

async function pushBookImages(req) {
  const files = req.files || {};
  let image;
  let backImage;
  // Reject files whose bytes do not match an allowed image type
  if (files.image?.[0]) assertSafeUpload(files.image[0], 'image');
  if (files.back_image?.[0]) assertSafeUpload(files.back_image[0], 'image');
  if (files.image?.[0]) {
    const f = files.image[0];
    const objectPath = `books/${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${path
      .basename(f.originalname)
      .replace(/[^a-zA-Z0-9.\-]/g, '_')}`;
    image = (
      await uploadBuffer({ bucket: 'uploads', path: objectPath, buffer: f.buffer, contentType: f.mimetype })
    ).publicUrl;
  } else if (req.body.image) {
    image = req.body.image;
  }
  if (files.back_image?.[0]) {
    const f = files.back_image[0];
    const objectPath = `books/${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${path
      .basename(f.originalname)
      .replace(/[^a-zA-Z0-9.\-]/g, '_')}`;
    backImage = (
      await uploadBuffer({ bucket: 'uploads', path: objectPath, buffer: f.buffer, contentType: f.mimetype })
    ).publicUrl;
  } else if (req.body.back_image) {
    backImage = req.body.back_image;
  }
  return { image, backImage };
}

function bookBodyToFields(body) {
  return {
    title: body.title,
    slug: body.slug || undefined,
    author_id: body.author_id || null,
    author_name: body.author_name,
    category: body.category,
    description: body.description ?? null,
    cover_class: body.cover_class || 'c1',
    ornament: body.ornament || '❀',
    pages: body.pages ? Number(body.pages) : 200,
    rating: body.rating ? Number(body.rating) : 4.5,
    year: body.year ? Number(body.year) : 2026,
    copies_sold: body.copies_sold ? Number(body.copies_sold) : 0,
    price: body.price ? Number(body.price) : 1499,
    sale_price: body.sale_price ? Number(body.sale_price) : null,
    stock_status: body.stock_status || 'in_stock',
    badge: body.badge || null,
    is_best_seller: body.is_best_seller === 'true' || body.is_best_seller === true ? 1 : 0,
    best_seller_rank: body.best_seller_rank ? Number(body.best_seller_rank) : null,
    is_published: body.is_published === 'false' || body.is_published === false ? 0 : 1,
    template: body.template || 'hardcover',
  };
}

// Create a new book (admin direct add)
router.post(
  '/books',
  upload.fields([{ name: 'image', maxCount: 1 }, { name: 'back_image', maxCount: 1 }]),
  validateBook,
  wrap(async (req, res) => {
    try {
      const { image, backImage } = await pushBookImages(req);
      const payload = {
        ...bookBodyToFields(req.body),
        image: image ?? null,
        back_image: backImage ?? null,
      };
      const created = await db.createBook(payload);
      res.status(201).json({ ok: true, book: created });
    } catch (err) {
      if (db.isUniqueError(err)) {
        return res.status(409).json({ error: 'A book with this slug already exists' });
      }
      throw err;
    }
  })
);

// Approve a pending book
router.patch(
  '/books/:id/approve',
  wrap(async (req, res) => {
    const book = await db.approveBook(req.params.id);
    if (!book) return res.status(404).json({ error: 'Book not found' });
    res.json({ ok: true, book });
  })
);

// Reject/unpublish a book
router.patch(
  '/books/:id/reject',
  wrap(async (req, res) => {
    const book = await db.rejectBook(req.params.id);
    if (!book) return res.status(404).json({ error: 'Book not found' });
    res.json({ ok: true, book });
  })
);

// Delete a book
router.delete(
  '/books/:id',
  wrap(async (req, res) => {
    const result = await db.deleteBook(req.params.id);
    res.json({ ok: true, ...result });
  })
);

// Update a book
router.patch(
  '/books/:id',
  upload.fields([{ name: 'image', maxCount: 1 }, { name: 'back_image', maxCount: 1 }]),
  validateBook,
  wrap(async (req, res) => {
    const id = req.params.id;
    const existing = await db.getBookByIdAdmin(id);
    if (!existing) return res.status(404).json({ error: 'Book not found' });

    const fields = {};
    const body = req.body;
    const setIf = (key, val) => {
      if (val !== undefined) fields[key] = val;
    };

    setIf('title', body.title);
    setIf('author_name', body.author_name);
    setIf('category', body.category);
    setIf('description', body.description);
    setIf('cover_class', body.cover_class);
    setIf('ornament', body.ornament);
    setIf('pages', body.pages ? Number(body.pages) : undefined);
    setIf('rating', body.rating ? Number(body.rating) : undefined);
    setIf('year', body.year ? Number(body.year) : undefined);
    setIf('copies_sold', body.copies_sold ? Number(body.copies_sold) : undefined);
    setIf('price', body.price ? Number(body.price) : undefined);
    setIf(
      'sale_price',
      body.sale_price !== undefined ? (body.sale_price === '' || body.sale_price === null ? null : Number(body.sale_price)) : undefined
    );
    setIf('stock_status', body.stock_status);
    setIf('badge', body.badge);
    setIf(
      'is_best_seller',
      body.is_best_seller !== undefined ? (body.is_best_seller === 'true' || body.is_best_seller === true ? 1 : 0) : undefined
    );
    setIf(
      'best_seller_rank',
      body.best_seller_rank !== undefined ? (body.best_seller_rank === '' || body.best_seller_rank === null ? null : Number(body.best_seller_rank)) : undefined
    );
    setIf(
      'is_published',
      body.is_published !== undefined ? (body.is_published === 'false' || body.is_published === false ? 0 : 1) : undefined
    );
    setIf('template', body.template);

    const { image, backImage } = await pushBookImages(req);
    if (image !== undefined) fields.image = image;
    if (backImage !== undefined) fields.back_image = backImage;

    if (Object.keys(fields).length === 0) {
      return res.json({ ok: true, book: existing });
    }

    const updated = await db.updateBook(id, fields);
    res.json({ ok: true, book: updated });
  })
);

// ---- Reviews (moderation) ----
router.get(
  '/reviews',
  wrap(async (req, res) => {
    const reviews = await db.listAllReviews(req.query.status || null);
    res.json({ ok: true, reviews });
  })
);

router.patch(
  '/reviews/:id',
  validateStatus('status', ['approved', 'rejected', 'pending']),
  wrap(async (req, res) => {
    const review = await db.moderateReview(req.params.id, req.body.status);
    if (!review) return res.status(404).json({ error: 'Review not found' });
    res.json({ ok: true, review });
  })
);

router.delete(
  '/reviews/:id',
  wrap(async (req, res) => {
    const result = await db.deleteReview(req.params.id);
    res.json({ ok: true, ...result });
  })
);

// ---- Orders ----
router.get(
  '/orders',
  wrap(async (req, res) => {
    const orders = await db.listOrders(req.query.status || null);
    res.json({ ok: true, orders });
  })
);

router.patch(
  '/orders/:id',
  validateStatus('status', ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']),
  wrap(async (req, res) => {
    const order = await db.updateOrderStatus(req.params.id, req.body.status);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ ok: true, order });
  })
);

// ---- Author applications (payout profiles) ----
router.get(
  '/author-applications',
  wrap(async (req, res) => {
    const applications = await db.listAuthorApplications(req.query.status || null);
    res.json({ ok: true, applications });
  })
);

router.patch(
  '/author-applications/:id',
  validateStatus('status', ['approved', 'rejected', 'pending']),
  wrap(async (req, res) => {
    const profile = await db.decideAuthorApplication(req.params.id, req.body.status);
    if (!profile) return res.status(404).json({ error: 'Application not found' });
    res.json({ ok: true, application: profile });
  })
);

module.exports = router;
