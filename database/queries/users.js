const { getDb } = require('../connection');

async function getUserByEmail(email) {
  const db = getDb();
  const { data, error } = await db
    .from('users')
    .select('*')
    .eq('email', email)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Lookup by name first, then email. Each value goes through a parameterised `.eq()`
// filter — never interpolated into a PostgREST `or(...)` string, which would let a
// crafted login value inject extra filters.
async function getUserByNameOrEmail(identifier) {
  const value = String(identifier || '').trim();
  if (!value || value.length > 254) return null;

  const db = getDb();
  const { data, error } = await db
    .from('users')
    .select('*')
    .eq('name', value)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (data) return data;

  const { data: byEmail, error: emailError } = await db
    .from('users')
    .select('*')
    .eq('email', value.toLowerCase())
    .limit(1)
    .maybeSingle();
  if (emailError) throw emailError;
  return byEmail;
}

async function getUserById(id) {
  const db = getDb();
  const { data, error } = await db.from('users').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

async function createUser({ name, email, passwordHash, role = 'user' }) {
  const allowed = ['user', 'author'];
  const safeRole = allowed.includes(role) ? role : 'user';
  const db = getDb();
  const payload = { name, email, password_hash: passwordHash, role: safeRole };
  const { data, error } = await db.from('users').insert(payload).select().single();
  if (error) throw error;
  return { id: data.id, name, email, role: data.role, created_at: data.created_at };
}

async function updateUserPassword(id, passwordHash) {
  const db = getDb();
  const { error } = await db
    .from('users')
    .update({ password_hash: passwordHash, token_version: 0 })
    .eq('id', id);
  if (error) throw error;
  return true;
}

async function bumpTokenVersion(id) {
  const db = getDb();
  const { data, error } = await db
    .from('users')
    .select('token_version')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  const next = (data?.token_version ?? 0) + 1;
  const { error: updErr } = await db
    .from('users')
    .update({ token_version: next })
    .eq('id', id);
  if (updErr) throw updErr;
  return next;
}

function isUniqueError(err) {
  return Boolean(err && (err.code === '23505' || /duplicate key|unique/i.test(err.message || '')));
}

async function listUsers() {
  const db = getDb();
  const { data, error } = await db
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

module.exports = {
  getUserByEmail,
  getUserByNameOrEmail,
  getUserById,
  createUser,
  updateUserPassword,
  bumpTokenVersion,
  listUsers,
  isUniqueError,
};
