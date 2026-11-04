const { getDb } = require('../connection');

function createQuote(quote) {
  const db = getDb();
  const info = db
    .prepare(
      `INSERT INTO quotes (name, email, phone, book_title, notes, pages, editing_level, formatting_level,
         delivery_timeline, addons, extra_copies, estimated_total, manuscript_file, front_cover_file, back_cover_file)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      quote.name,
      quote.email,
      quote.phone ?? null,
      quote.book_title,
      quote.notes ?? null,
      quote.pages ?? 0,
      quote.editing_level ?? null,
      quote.formatting_level ?? null,
      quote.delivery_timeline ?? null,
      quote.addons ?? null,
      quote.extra_copies ?? 0,
      quote.estimated_total ?? 0,
      quote.manuscript_file ?? null,
      quote.front_cover_file ?? null,
      quote.back_cover_file ?? null
    );
  return { id: Number(info.lastInsertRowid), ...quote };
}

function listQuotes(status = null) {
  const db = getDb();
  if (status) {
    return db.prepare('SELECT * FROM quotes WHERE status = ? ORDER BY created_at DESC').all(status);
  }
  return db.prepare('SELECT * FROM quotes ORDER BY created_at DESC').all();
}

function updateQuoteStatus(id, status) {
  const db = getDb();
  db.prepare('UPDATE quotes SET status = ? WHERE id = ?').run(status, id);
  return { id: Number(id), status };
}

module.exports = { createQuote, listQuotes, updateQuoteStatus };
