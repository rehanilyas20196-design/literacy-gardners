const path = require('path');
const crypto = require('crypto');
const { Router } = require('express');
const multer = require('multer');
const { uploadBuffer } = require('../utils/storage');

const router = Router();

const COVER_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
};
const DOC_TYPES = {
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const kind = req.query.kind || req.body?.kind;
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (kind === 'manuscript') {
      const extOk = ['.pdf', '.doc', '.docx'].includes(ext);
      if (!extOk) {
        return cb(new Error('Manuscript must be a PDF, DOC, or DOCX file'), false);
      }
      return cb(null, true);
    }
    // covers / generic images
    const extOk = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
    if (!extOk) {
      return cb(new Error('Cover must be a JPG, PNG, or WebP image'), false);
    }
    return cb(null, true);
  },
});

function safeBase(filename) {
  return path
    .basename(filename || 'file')
    .replace(/[^a-zA-Z0-9.\-]/g, '_')
    .replace(/^\.+/, '')
    .slice(0, 80);
}

// POST /api/uploads?kind=cover|manuscript — multipart form field: "file"
router.post('/', (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      const status = err.name === 'MulterError' && err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      return res.status(status).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided (field name must be "file")' });
    }
    try {
      const kind = String(req.query.kind || req.body?.kind || 'cover');
      const isManuscript = kind === 'manuscript';
      const bucket = isManuscript ? 'manuscripts' : 'uploads';
      const subdir = isManuscript ? 'manuscripts' : 'covers';
      const unique = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${safeBase(req.file.originalname)}`;
      const objectPath = `${subdir}/${unique}`;
      const result = await uploadBuffer({
        bucket,
        path: objectPath,
        buffer: req.file.buffer,
        contentType: req.file.mimetype,
      });
      return res.status(201).json({
        ok: true,
        bucket,
        path: result.path,
        // public covers get an immediately usable URL; manuscripts stay private
        url: result.publicUrl,
        kind,
      });
    } catch (e) {
      console.error('upload failed:', e);
      return res.status(e.status || 500).json({ error: e.message || 'Upload failed' });
    }
  });
});

module.exports = router;
