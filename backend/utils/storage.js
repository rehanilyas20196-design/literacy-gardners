const { getDb } = require('../database/connection');

const PUBLIC_BUCKET = 'uploads';

function publicUrlFor(bucket, path) {
  const base = process.env.SUPABASE_URL;
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}

async function uploadBuffer({ bucket, path, buffer, contentType, upsert = false }) {
  const db = getDb();
  const { error } = await db.storage
    .from(bucket)
    .upload(path, buffer, { contentType, upsert, cacheControl: '3600' });
  if (error) {
    const err = new Error(error.message || 'Storage upload failed');
    err.status = 502;
    throw err;
  }
  return {
    bucket,
    path,
    publicUrl: bucket === PUBLIC_BUCKET ? publicUrlFor(bucket, path) : null,
  };
}

async function removeObjects(bucket, paths) {
  if (!paths || !paths.length) return { removed: 0 };
  const db = getDb();
  const { error } = await db.storage.from(bucket).remove(paths);
  if (error) throw error;
  return { removed: paths.length };
}

async function createSignedReadUrl(bucket, path, expiresIn = 3600) {
  const db = getDb();
  const { data, error } = await db.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) {
    const err = new Error(error.message || 'Could not create signed URL');
    err.status = 502;
    throw err;
  }
  return { url: data.signedUrl, expiresIn };
}

module.exports = { uploadBuffer, removeObjects, createSignedReadUrl, publicUrlFor, PUBLIC_BUCKET };
