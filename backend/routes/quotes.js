const { Router } = require('express');
const db = require('../../database');
const { validateQuote } = require('../middleware/validate');

const router = Router();

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Public: submit a publishing request.
// Files are uploaded first via POST /api/uploads; this endpoint stores their URLs.
router.post(
  '/quotes',
  validateQuote,
  wrap(async (req, res) => {
    const quote = {
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone || null,
      book_title: req.body.book_title,
      notes: req.body.notes || null,
      pages: Number(req.body.pages) || 0,
      editing_level: req.body.editing_level || null,
      formatting_level: req.body.formatting_level || null,
      delivery_timeline: req.body.delivery_timeline || null,
      addons: req.body.addons || null,
      extra_copies: Number(req.body.extra_copies) || 0,
      estimated_total: Number(req.body.estimated_total) || 0,
      manuscript_file: req.body.manuscript_file || null,
      front_cover_file: req.body.front_cover_file || null,
      back_cover_file: req.body.back_cover_file || null,
    };
    const created = await db.createQuote(quote);
    res.status(201).json(created);
  })
);

// Admin quote routes (list / status update / delete) live in routes/admin.js
// behind authMiddleware + adminMiddleware — do not re-declare them here:
// this router is mounted first and would shadow the protected versions.

module.exports = router;
