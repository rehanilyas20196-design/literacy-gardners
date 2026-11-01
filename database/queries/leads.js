const { getDb } = require('../connection');

function listCompetitions(status = null) {
  const db = getDb();
  if (status) {
    return db.prepare('SELECT * FROM competitions WHERE status = ? ORDER BY starts_at DESC').all(status);
  }
  return db.prepare('SELECT * FROM competitions ORDER BY starts_at DESC').all();
}

function createLead(lead) {
  const db = getDb();
  const info = db
    .prepare('INSERT INTO leads (name, email, message, type) VALUES (?, ?, ?, ?)')
    .run(lead.name, lead.email, lead.message ?? null, lead.type ?? 'general');
  return { id: Number(info.lastInsertRowid), ...lead };
}

function listLeads(type = null) {
  const db = getDb();
  if (type) {
    return db.prepare('SELECT * FROM leads WHERE type = ? ORDER BY created_at DESC').all(type);
  }
  return db.prepare('SELECT * FROM leads ORDER BY created_at DESC').all();
}

function subscribeNewsletter(email) {
  const db = getDb();
  const info = db.prepare('INSERT OR IGNORE INTO newsletter (email) VALUES (?)').run(email);
  return { inserted: Number(info.changes) > 0, email };
}

function listNewsletter() {
  const db = getDb();
  return db.prepare('SELECT * FROM newsletter ORDER BY created_at DESC').all();
}

module.exports = {
  listCompetitions,
  createLead,
  listLeads,
  subscribeNewsletter,
  listNewsletter
};
