const { getDb } = require('../connection');

async function listCompetitions(status = null) {
  const db = getDb();
  let query = db.from('competitions').select('*').order('starts_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function createLead(lead) {
  const db = getDb();
  const payload = {
    name: lead.name,
    email: lead.email,
    message: lead.message ?? null,
    type: lead.type ?? 'general',
  };
  const { data, error } = await db.from('leads').insert(payload).select().single();
  if (error) throw error;
  return { id: data.id, ...payload };
}

async function listLeads(type = null) {
  const db = getDb();
  let query = db.from('leads').select('*').order('created_at', { ascending: false });
  if (type) query = query.eq('type', type);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function subscribeNewsletter(email) {
  const db = getDb();
  const { data, error } = await db
    .from('newsletter')
    .insert({ email })
    .select()
    .maybeSingle();
  if (error) {
    if (error.code === '23505' || /duplicate/i.test(error.message || '')) {
      return { inserted: false, email };
    }
    throw error;
  }
  return { inserted: Boolean(data), email };
}

async function listNewsletter() {
  const db = getDb();
  const { data, error } = await db
    .from('newsletter')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

module.exports = {
  listCompetitions,
  createLead,
  listLeads,
  subscribeNewsletter,
  listNewsletter,
};
