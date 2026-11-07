const { getDb } = require('../connection');

async function listReviews(bookId) {
  const db = getDb();
  const { data, error } = await db
    .from('reviews')
    .select('*, users(name)')
    .eq('book_id', bookId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((r) => ({
    ...r,
    user_name: r.users ? r.users.name : 'Reader',
    users: undefined,
  }));
}

async function listAllReviews(status = null) {
  const db = getDb();
  let query = db
    .from('reviews')
    .select('*, books(title), users(name)')
    .order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((r) => ({
    ...r,
    book_title: r.books ? r.books.title : null,
    user_name: r.users ? r.users.name : null,
    books: undefined,
    users: undefined,
  }));
}

async function createReview({ bookId, userId, rating, title, body }) {
  const db = getDb();
  const payload = {
    book_id: bookId,
    user_id: userId,
    rating: Math.max(1, Math.min(5, Number(rating) || 5)),
    title: title ?? null,
    body: body ?? null,
    status: 'pending',
  };
  const { data, error } = await db
    .from('reviews')
    .upsert(payload, { onConflict: 'book_id,user_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function moderateReview(id, status) {
  const db = getDb();
  const { data, error } = await db
    .from('reviews')
    .update({ status })
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function deleteReview(id) {
  const db = getDb();
  const { error } = await db.from('reviews').delete().eq('id', id);
  if (error) throw error;
  return { id, deleted: true };
}

async function getReviewForUser(bookId, userId) {
  const db = getDb();
  const { data, error } = await db
    .from('reviews')
    .select('*')
    .eq('book_id', bookId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function getApprovedReviewStats(bookId) {
  const db = getDb();
  const { data, error } = await db
    .from('reviews')
    .select('rating')
    .eq('book_id', bookId)
    .eq('status', 'approved');
  if (error) throw error;
  const rows = data || [];
  if (!rows.length) return { count: 0, average: null };
  const sum = rows.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
  return { count: rows.length, average: Math.round((sum / rows.length) * 10) / 10 };
}

module.exports = {
  listReviews,
  listAllReviews,
  createReview,
  moderateReview,
  deleteReview,
  getReviewForUser,
  getApprovedReviewStats,
};
