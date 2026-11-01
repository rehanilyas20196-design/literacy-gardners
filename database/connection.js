const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');

let db = null;

function getDb() {
  if (db) return db;
  const file = process.env.DB_FILE || path.join(__dirname, 'literacy.db');
  db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);
  try {
    const { ensureColumns } = require('./seed');
    ensureColumns();
  } catch {
    /* seed may not be loaded in query-only contexts */
  }
  return db;
}

module.exports = { getDb };
