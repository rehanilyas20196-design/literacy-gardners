const { Router } = require('express');
const db = require('../../database');

const router = Router();

router.get('/', (req, res) => {
  const { category, q, sort } = req.query;
  if (q) return res.json(db.searchBooks(String(q)));
  res.json(db.listBooks({ category: category || null, sort: sort || 'newest' }));
});

router.get('/best-sellers', (req, res) => {
  const limit = Number(req.query.limit) || 4;
  res.json(db.getBestSellers(limit));
});

router.get('/categories', (_req, res) => {
  res.json(db.getCategories());
});

router.get('/slug/:slug', (req, res) => {
  const book = db.getBookBySlug(String(req.params.slug));
  if (!book) return res.status(404).json({ error: 'Book not found' });
  res.json(book);
});

router.get('/:id', (req, res) => {
  const book = db.getBookById(Number(req.params.id));
  if (!book) return res.status(404).json({ error: 'Book not found' });
  res.json(book);
});

router.post('/', (req, res) => {
  const b = req.body || {};
  if (!b.title || !b.author_name || !b.category) {
    return res.status(400).json({ error: 'title, author_name and category are required' });
  }
  const book = db.createBook(b);
  res.status(201).json(book);
});

module.exports = router;
