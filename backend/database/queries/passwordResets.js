const { getDb } = require('../connection');

async function createResetToken({ userId, tokenHash, ttlMs = 30 * 60 * 1000 }) {
  const db = getDb();
  const expiresAt = new Date(Date.now() + ttlMs).toISOString();
  const { data, error } = await db
    .from('password_resets')
    .insert({ user_id: userId, token_hash: tokenHash, expires_at: expiresAt })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function consumeResetToken(tokenHash) {
  const db = getDb();
  const { data, error } = await db
    .from('password_resets')
    .select('*')
    .eq('token_hash', tokenHash)
    .is('used_at', null)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) return null;
  const { data: used, error: useErr } = await db
    .from('password_resets')
    .update({ used_at: new Date().toISOString() })
    .eq('id', data.id)
    .select()
    .single();
  if (useErr) throw useErr;
  return used;
}

module.exports = { createResetToken, consumeResetToken };
