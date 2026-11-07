const path = require('path');
const crypto = require('crypto');
const { Router } = require('express');
const multer = require('multer');
const { uploadBuffer, removeObjects, publicUrlFor, PUBLIC_BUCKET } = require('../utils/storage');
const { assertSafeUpload } = require('../utils/uploadGuard');
const { getDb } = require('../../database/connection');

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

const COVER_EXT = ['.jpg', '.jpeg', '.png', '.webp'];
const DOC_EXT = ['.pdf', '.doc', '.docx'];
const EXT_MIME = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const kind = req.query.kind || req.body?.kind;
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (kind === 'manuscript') {
      const extOk = DOC_EXT.includes(ext);
      if (!extOk) {
        return cb(new Error('Manuscript must be a PDF, DOC, or DOCX file'), false);
      }
      return cb(null, true);
    }
    // covers / generic images
    const extOk = COVER_EXT.includes(ext);
    if (!extOk) {
      return cb(new Error('Cover must be a JPG, PNG, or WebP image'), false);
    }
    return cb(null, true);
  },
});

function safeBase(filename) {
  const base = path
    .basename(String(filename ?? 'file'))
    .replace(/[^a-zA-Z0-9.\-]/g, '_')
    .replace(/^\.+/, '');
  const clean = base || 'file';
  if (clean.length <= 80) return clean;
  // Keep the extension when truncating so type checks still pass.
  const ext = path.extname(clean).slice(0, 12);
  return clean.slice(0, Math.max(1, 80 - ext.length)) + ext;
}

function kindOf(value) {
  return String(value || 'cover') === 'manuscript' ? 'manuscript' : 'cover';
}

function kindError(kind) {
  return kind === 'manuscript'
    ? 'Manuscript must be a PDF, DOC, or DOCX file'
    : 'Cover must be a JPG, PNG, or WebP image';
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
      // Verify the bytes, not the client-declared extension/MIME type
      assertSafeUpload(req.file, isManuscript ? 'manuscript' : 'image');
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

// POST /api/uploads/sign { kind, filename } — returns a short-lived signed URL
// the browser uses to PUT the file straight to Supabase Storage. The bytes never
// pass through this API, so Vercel's ~4.5MB request-body limit does not apply
// (manuscripts are allowed up to 25MB).
router.post('/sign', async (req, res) => {
  try {
    const kind = kindOf(req.body?.kind);
    const filename = safeBase(req.body?.filename);
    const ext = path.extname(filename).toLowerCase();
    const allowed = kind === 'manuscript' ? DOC_EXT : COVER_EXT;
    if (!allowed.includes(ext)) {
      return res.status(400).json({ error: kindError(kind) });
    }
    const bucket = kind === 'manuscript' ? 'manuscripts' : PUBLIC_BUCKET;
    const subdir = kind === 'manuscript' ? 'manuscripts' : 'covers';
    const objectPath = `${subdir}/${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${filename}`;

    const { data, error } = await getDb().storage.from(bucket).createSignedUploadUrl(objectPath);
    if (error || !data?.signedUrl) {
      console.error('sign upload failed:', error);
      return res.status(502).json({ error: 'Could not start upload' });
    }
    return res.status(201).json({
      ok: true,
      bucket,
      path: objectPath,
      signedUrl: data.signedUrl,
      kind,
      maxBytes: kind === 'manuscript' ? 25 * 1024 * 1024 : 10 * 1024 * 1024,
    });
  } catch (e) {
    console.error('sign upload failed:', e);
    return res.status(e.status || 500).json({ error: e.message || 'Could not start upload' });
  }
});

// POST /api/uploads/confirm { kind, filename, bucket, path } — the browser calls
// this after the PUT succeeds. The server downloads the object it just received
// and verifies the bytes really are the declared type (magic numbers) before
// handing back the same response shape as the multipart route.
router.post('/confirm', async (req, res) => {
  try {
    const kind = kindOf(req.body?.kind);
    const filename = safeBase(req.body?.filename);
    const bucket = req.body?.bucket;
    const objectPath = req.body?.path;
    const ext = path.extname(filename).toLowerCase();
    const allowed = kind === 'manuscript' ? DOC_EXT : COVER_EXT;
    const wantBucket = kind === 'manuscript' ? 'manuscripts' : PUBLIC_BUCKET;
    const subdir = kind === 'manuscript' ? 'manuscripts' : 'covers';

    if (!allowed.includes(ext)) return res.status(400).json({ error: kindError(kind) });
    if (bucket !== wantBucket) return res.status(400).json({ error: 'Invalid upload target' });
    const segments = typeof objectPath === 'string' ? objectPath.split('/') : [];
    const pathOk =
      typeof objectPath === 'string' &&
      objectPath.length <= 250 &&
      segments[0] === subdir &&
      segments.length === 2 &&
      segments.every((seg) => seg !== '' && seg !== '.' && seg !== '..' && /^[A-Za-z0-9._-]+$/.test(seg));
    if (!pathOk) return res.status(400).json({ error: 'Invalid upload path' });

    const db = getDb();
    const { data, error } = await db.storage.from(bucket).download(objectPath);
    if (error || !data) {
      console.error('confirm upload failed:', error);
      return res.status(404).json({ error: 'Uploaded file not found' });
    }
    const buffer = Buffer.from(await data.arrayBuffer());
    try {
      assertSafeUpload(
        { buffer, originalname: filename, mimetype: EXT_MIME[ext] },
        kind === 'manuscript' ? 'manuscript' : 'image'
      );
    } catch (e) {
      await removeObjects(bucket, [objectPath]).catch(() => {});
      return res.status(400).json({ error: e.message });
    }
    return res.status(201).json({
      ok: true,
      bucket,
      path: objectPath,
      // public covers get an immediately usable URL; manuscripts stay private
      url: bucket === PUBLIC_BUCKET ? publicUrlFor(bucket, objectPath) : null,
      kind,
    });
  } catch (e) {
    console.error('confirm upload failed:', e);
    return res.status(e.status || 500).json({ error: e.message || 'Upload failed' });
  }
});

module.exports = router;
