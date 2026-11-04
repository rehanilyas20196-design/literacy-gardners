const { getDb } = require('../connection');

async function createAuthorApplication({ userId, phone, account_title, account_number, iban }) {
  const db = getDb();
  const payload = {
    user_id: userId,
    phone: phone ?? null,
    account_title: account_title ?? null,
    account_number: account_number ?? null,
    iban: iban ?? null,
    status: 'pending',
  };
  const { data, error } = await db.from('author_profiles').insert(payload).select().single();
  if (error) throw error;
  return data;
}

async function getAuthorProfile(userId) {
  const db = getDb();
  const { data, error } = await db
    .from('author_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function listAuthorApplications(status = null) {
  const db = getDb();
  let query = db
    .from('author_profiles')
    .select('*, users(name, email, role, created_at)')
    .order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((p) => ({
    ...p,
    user_name: p.users ? p.users.name : null,
    user_email: p.users ? p.users.email : null,
    user_role: p.users ? p.users.role : null,
    users: undefined,
  }));
}

async function decideAuthorApplication(id, status) {
  const db = getDb();
  const { data, error } = await db
    .from('author_profiles')
    .update({ status, decided_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw error;
  if (data && status === 'approved') {
    const { error: roleErr } = await db
      .from('users')
      .update({ role: 'author' })
      .eq('id', data.user_id);
    if (roleErr) throw roleErr;
  }
  return data;
}

module.exports = {
  createAuthorApplication,
  getAuthorProfile,
  listAuthorApplications,
  decideAuthorApplication,
};
