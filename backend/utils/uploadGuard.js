const path = require('path');

// Allowed upload kinds → the extension that must accompany each detected type.
const IMAGE_EXTENSIONS = {
  jpeg: ['.jpg', '.jpeg'],
  png: ['.png'],
  webp: ['.webp'],
  gif: ['.gif'],
};
const DOCUMENT_EXTENSIONS = {
  pdf: ['.pdf'],
  zip: ['.docx'], // DOCX is an OOXML zip container
  cfb: ['.doc'], // legacy OLE2 compound file
};

const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const DOCUMENT_MIMES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const SIGNATURES = [
  { kind: 'jpeg', bytes: [0xff, 0xd8, 0xff] },
  { kind: 'png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { kind: 'zip', bytes: [0x50, 0x4b, 0x03, 0x04] },
  { kind: 'cfb', bytes: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] },
];

function hasPrefix(buffer, bytes) {
  if (buffer.length < bytes.length) return false;
  for (let i = 0; i < bytes.length; i += 1) {
    if (buffer[i] !== bytes[i]) return false;
  }
  return true;
}

// Identify a file from its bytes — never from the client-supplied name or MIME type.
function detectFileKind(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;
  for (const { kind, bytes } of SIGNATURES) {
    if (hasPrefix(buffer, bytes)) return kind;
  }
  const ascii = buffer.subarray(0, 12).toString('latin1');
  if (ascii.startsWith('GIF87a') || ascii.startsWith('GIF89a')) return 'gif';
  if (ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP') return 'webp';
  if (ascii.startsWith('%PDF-')) return 'pdf';
  return null;
}

function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

/**
 * Verify an uploaded file is really the type it claims to be.
 * Must run AFTER multer has buffered the file (memoryStorage), e.g. inside the route handler.
 */
function assertSafeUpload(file, kind = 'image') {
  if (!file || !Buffer.isBuffer(file.buffer)) {
    throw badRequest('No file provided');
  }

  const isImage = kind !== 'manuscript';
  const detected = detectFileKind(file.buffer);
  if (!detected) {
    throw badRequest('File content does not match an allowed type');
  }

  const ext = path.extname(file.originalname || '').toLowerCase();
  const mimetype = String(file.mimetype || '').toLowerCase();
  const mimes = isImage ? IMAGE_MIMES : DOCUMENT_MIMES;
  const extensions = isImage ? IMAGE_EXTENSIONS : DOCUMENT_EXTENSIONS;
  const allowedForDetected = extensions[detected];

  if (!mimes.has(mimetype)) {
    throw badRequest(
      isImage
        ? 'Cover must be a JPG, PNG, WebP or GIF image'
        : 'Manuscript must be a PDF, DOC, or DOCX file'
    );
  }
  if (!allowedForDetected || !allowedForDetected.includes(ext)) {
    throw badRequest('File extension does not match its content');
  }

  return detected;
}

module.exports = { assertSafeUpload, detectFileKind };
