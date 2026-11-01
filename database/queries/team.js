const { getDb } = require('../connection');

function listTeam() {
  const db = getDb();
  return db.prepare('SELECT * FROM team_members ORDER BY sort_order ASC').all();
}

function listAuthors() {
  const db = getDb();
  return db.prepare('SELECT * FROM authors ORDER BY name ASC').all();
}

function createTeamMember(member) {
  const db = getDb();
  const info = db
    .prepare('INSERT INTO team_members (name, role, bio, initial, sort_order) VALUES (?, ?, ?, ?, ?)')
    .run(member.name, member.role, member.bio ?? null, member.initial, member.sort_order ?? 0);
  return { id: Number(info.lastInsertRowid), ...member };
}

module.exports = { listTeam, listAuthors, createTeamMember };
