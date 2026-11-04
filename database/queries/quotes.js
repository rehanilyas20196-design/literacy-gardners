const { getDb } = require('../connection');

async function createQuote(quote) {
  const db = getDb();
  const payload = {
    name: quote.name,
    email: quote.email,
    phone: quote.phone ?? null,
    book_title: quote.book_title,
    notes: quote.notes ?? null,
    pages: quote.pages ?? 0,
    editing_level: quote.editing_level ?? null,
    formatting_level: quote.formatting_level ?? null,
    delivery_timeline: quote.delivery_timeline ?? null,
    addons: quote.addons ?? null,
    extra_copies: quote.extra_copies ?? 0,
    estimated_total: quote.estimated_total ?? 0,
    manuscript_file: quote.manuscript_file ?? null,
    front_cover_file: quote.front_cover_file ?? null,
    back_cover_file: quote.back_cover_file ?? null,
    status: quote.status ?? 'pending',
  };
  const { data, error } = await db.from('quotes').insert(payload).select().single();
  if (error) throw error;
  return { id: data.id, ...payload };
}

async function listQuotes(status = null) {
  const db = getDb();
  let query = db.from('quotes').select('*').order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function updateQuoteStatus(id, status) {
  const db = getDb();
  const { error } = await db.from('quotes').update({ status }).eq('id', id);
  if (error) throw error;
  return { id, status };
}

async function deleteQuote(id) {
  const db = getDb();
  const { error } = await db.from('quotes').delete().eq('id', id);
  if (error) throw error;
  return { id, deleted: true };
}

module.exports = { createQuote, listQuotes, updateQuoteStatus, deleteQuote };
