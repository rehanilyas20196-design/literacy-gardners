const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../../database');
const { validateQuote } = require('../middleware/validate');

// Create upload directories
const manuscriptDir = path.join(__dirname, '..', '..', 'uploads', 'manuscripts');
const coverDir = path.join(__dirname, '..', '..', 'uploads', 'covers');
fs.mkdirSync(manuscriptDir, { recursive: true });
fs.mkdirSync(coverDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'manuscript') {
      cb(null, manuscriptDir);
    } else {
      cb(null, coverDir);
    }
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-]/g, '_');
    const unique = `${Date.now()}-${safeName}`;
    cb(null, unique);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'manuscript') {
      const allowed = ['.pdf', '.doc', '.docx'];
      const ext = path.extname(file.originalname).toLowerCase();
      if (!allowed.includes(ext)) {
        return cb(new Error('Manuscript: Only PDF, DOC, or DOCX files are allowed'), false);
      }
      cb(null, true);
    } else if (file.fieldname === 'front_cover' || file.fieldname === 'back_cover') {
      const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
      const ext = path.extname(file.originalname).toLowerCase();
      if (!allowed.includes(ext)) {
        return cb(new Error('Cover: Only JPG, PNG, or WebP images are allowed'), false);
      }
      cb(null, true);
    } else {
      cb(new Error('Unexpected file field'), false);
    }
  },
});

const router = Router();

router.post('/quotes', upload.fields([
  { name: 'manuscript', maxCount: 1 },
  { name: 'front_cover', maxCount: 1 },
  { name: 'back_cover', maxCount: 1 },
]), validateQuote, (req, res) => {
  try {
    const files = req.files || {};
    const manuscriptFile = files.manuscript ? files.manuscript[0] : null;
    const frontCoverFile = files.front_cover ? files.front_cover[0] : null;
    const backCoverFile = files.back_cover ? files.back_cover[0] : null;

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
      manuscript_file: manuscriptFile ? `/uploads/manuscripts/${manuscriptFile.filename}` : null,
      front_cover_file: frontCoverFile ? `/uploads/covers/${frontCoverFile.filename}` : null,
      back_cover_file: backCoverFile ? `/uploads/covers/${backCoverFile.filename}` : null,
    };
    const created = db.createQuote(quote);
    res.status(201).json(created);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    throw err;
  }
});

// Admin quote routes (list / status update / delete) live in routes/admin.js
// behind authMiddleware + adminMiddleware — do not re-declare them here:
// this router is mounted first and would shadow the protected versions.

module.exports = router;
