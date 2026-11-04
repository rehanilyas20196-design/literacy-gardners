const { Router } = require('express');
const db = require('../../database');
const { authMiddleware } = require('../middleware/auth');
const {
  validateBook,
  validateBookId,
  validateBookSlug,
  handleValidationErrors,
} = require('../middleware/validate');

const router = Router();

// Public: list books (with optional category/q/sort filters)
router.get('/', (req, res) => {
  const { category, q, sort } = req.query;
  if (q) return res.json(db.searchBooks(String(q)));
  res.json(db.listBooks({ category: category || null, sort: sort || 'newest' }));
});

// Public: best sellers
router.get('/best-sellers', (req, res) => {
  const limit = Number(req.query.limit) || 4;
  res.json(db.getBestSellers(limit));
});

// Public: categories
router.get('/categories', (_req, res) => {
  res.json(db.getCategories());
});

// Public: book by slug
router.get('/slug/:slug', validateBookSlug, (req, res) => {
  const book = db.getBookBySlug(String(req.params.slug));
  if (!book) return res.status(404).json({ error: 'Book not found' });
  res.json(book);
});

// Public: book by id
router.get('/:id', validateBookId, (req, res) => {
  const book = db.getBookById(Number(req.params.id));
  if (!book) return res.status(404).json({ error: 'Book not found' });
  res.json(book);
});

// Protected: create book (admin only)
router.post('/', authMiddleware, validateBook, (req, res) => {
  const b = req.body;
  try {
    const book = db.createBook(b);
    res.status(201).json(book);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'A book with this slug already exists' });
    }
    throw err;
  }
});

module.exports = router;
