const { Router } = require('express');
const db = require('../../database');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const {
  validateBook,
  validateBookId,
  validateBookSlug,
  validateReview,
  handleValidationErrors,
} = require('../middleware/validate');

const router = Router();

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Public: list books (combined q + category + sort filters)
router.get(
  '/',
  wrap(async (req, res) => {
    const { category, q, sort } = req.query;
    if (q) {
      const results = await db.searchBooks(String(q), {
        category: category || null,
        sort: sort || 'newest',
      });
      return res.json(results);
    }
    const books = await db.listBooks({ category: category || null, sort: sort || 'newest' });
    res.json(books);
  })
);

// Protected: the logged-in user's own submissions
router.get(
  '/mine',
  authMiddleware,
  wrap(async (req, res) => {
    const books = await db.listBooksByUser(req.user.id);
    res.json(books);
  })
);

// Public: best sellers
router.get(
  '/best-sellers',
  wrap(async (req, res) => {
    const limit = Number(req.query.limit) || 4;
    res.json(await db.getBestSellers(limit));
  })
);

// Public: categories
router.get(
  '/categories',
  wrap(async (_req, res) => {
    res.json(await db.getCategories());
  })
);

// Public: book by slug
router.get(
  '/slug/:slug',
  validateBookSlug,
  wrap(async (req, res) => {
    const book = await db.getBookBySlug(String(req.params.slug));
    if (!book) return res.status(404).json({ error: 'Book not found' });
    res.json(book);
  })
);

// Public: book by id
router.get(
  '/:id',
  validateBookId,
  wrap(async (req, res) => {
    const book = await db.getBookById(req.params.id);
    if (!book) return res.status(404).json({ error: 'Book not found' });
    res.json(book);
  })
);

// Public: approved reviews + rating stats
router.get(
  '/:id/reviews',
  validateBookId,
  wrap(async (req, res) => {
    const [reviews, stats] = await Promise.all([
      db.listReviews(req.params.id),
      db.getApprovedReviewStats(req.params.id),
    ]);
    res.json({ reviews, stats });
  })
);

// Protected: the caller's own review for this book (any status)
router.get(
  '/:id/reviews/mine',
  authMiddleware,
  validateBookId,
  wrap(async (req, res) => {
    const review = await db.getReviewForUser(req.params.id, req.user.id);
    res.json({ review: review || null });
  })
);

// Protected: create or update own review (admin-moderated)
router.post(
  '/:id/reviews',
  authMiddleware,
  validateReview,
  wrap(async (req, res) => {
    const review = await db.createReview({
      bookId: req.params.id,
      userId: req.user.id,
      rating: req.body.rating,
      title: req.body.title,
      body: req.body.body,
    });
    res.status(201).json({ ok: true, review });
  })
);

// Protected: submit a book for admin approval (any logged-in user)
router.post(
  '/submit',
  authMiddleware,
  validateBook,
  wrap(async (req, res) => {
    try {
      const book = await db.submitBook(req.body, req.user.id);
      res.status(201).json(book);
    } catch (err) {
      if (db.isUniqueError(err)) {
        return res.status(409).json({ error: 'A book with this slug already exists' });
      }
      throw err;
    }
  })
);

// Admin only: create a published book
router.post(
  '/',
  authMiddleware,
  adminMiddleware,
  validateBook,
  wrap(async (req, res) => {
    try {
      const book = await db.createBook(req.body);
      res.status(201).json(book);
    } catch (err) {
      if (db.isUniqueError(err)) {
        return res.status(409).json({ error: 'A book with this slug already exists' });
      }
      throw err;
    }
  })
);

module.exports = router;
