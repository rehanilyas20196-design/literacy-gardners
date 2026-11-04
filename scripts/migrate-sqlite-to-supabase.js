// One-time migration: SQLite (database/literacy.db) → Supabase.
// Run AFTER database/supabase_schema.sql has been applied in the SQL Editor.
//   node scripts/migrate-sqlite-to-supabase.js          (apply)
//   node scripts/migrate-sqlite-to-supabase.js --dry    (report only)
//
// Dedupes the duplicated rows in the SQLite file and links books to authors
// by name. Idempotent: existing rows (matched on natural keys) are skipped.

const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');
const { createClient } = require('@supabase/supabase-js');

const DRY = process.argv.includes('--dry');
const DB_PATH = path.join(__dirname, '..', 'database', 'literacy.db');

// Credentials come from the environment only — never hardcode them here.
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env'), quiet: true });

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — set them in backend/.env');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function readAll(db, sql) {
  return db.prepare(sql).all().map((row) => ({ ...row }));
}

function log(...args) {
  console.log(...args);
}

async function insertMissing(table, rows, matchColumns) {
  const { data: existing, error: findErr } = await supabase
    .from(table)
    .select(matchColumns.join(','));
  if (findErr) throw new Error(`${table} lookup failed: ${findErr.message}`);
  const keyOf = (obj) => matchColumns.map((c) => String(obj[c] ?? '')).join('\u0001');
  const seen = new Set((existing || []).map(keyOf));
  let inserted = 0;
  let skipped = 0;
  for (const row of rows) {
    const key = keyOf(row);
    if (seen.has(key)) {
      skipped += 1;
      continue;
    }
    if (DRY) {
      inserted += 1;
      seen.add(key);
      continue;
    }
    const { error } = await supabase.from(table).insert(row);
    if (error) throw new Error(`${table} insert failed: ${error.message} [${matchColumns.join('+')}]`);
    seen.add(key);
    inserted += 1;
  }
  return { inserted, skipped };
}

async function main() {
  if (!fs.existsSync(DB_PATH)) {
    console.error(`SQLite file not found: ${DB_PATH}`);
    process.exit(1);
  }

  const db = new DatabaseSync(DB_PATH, { readOnly: true });

  const users = readAll(db, 'SELECT * FROM users');
  const authors = readAll(db, 'SELECT * FROM authors ORDER BY id');
  const books = readAll(db, 'SELECT * FROM books');
  const team = readAll(db, 'SELECT * FROM team_members');
  const comps = readAll(db, 'SELECT * FROM competitions');
  const quotes = readAll(db, 'SELECT * FROM quotes');
  const leads = readAll(db, 'SELECT * FROM leads');
  const news = readAll(db, 'SELECT * FROM newsletter');
  db.close();

  log(`SQLite read: users=${users.length} authors=${authors.length} books=${books.length} team=${team.length} comps=${comps.length} quotes=${quotes.length} leads=${leads.length} newsletter=${news.length}`);
  if (DRY) log('--- DRY RUN (no writes) ---');

  // 1. Users (keep existing password hashes so local logins still work).
  // The legacy admin row is converted by the schema SQL (→ hinata40) — skip it here
  // so we don't re-create the weak account.
  const LEGACY_ADMIN = 'admin@literacygardeners.com';
  const userRows = users
    .filter((r) => r.email !== LEGACY_ADMIN)
    .map((r) => ({
      name: r.name,
      email: r.email,
      password_hash: r.password_hash,
      role: r.role || 'user',
      created_at: r.created_at,
    }));
  const u = await insertMissing('users', userRows, ['email']);
  log(`users: inserted=${u.inserted} skipped=${u.skipped} (legacy admin excluded: ${users.length - userRows.length})`);

  // 2. Authors — dedupe the doubled rows by name, remember old→new id map
  const idMap = new Map();
  const uniqueAuthors = [];
  const seen = new Set();
  for (const a of authors) {
    if (seen.has(a.name)) continue;
    seen.add(a.name);
    uniqueAuthors.push(a);
  }
  const { data: afterAuthors } = await supabase.from('authors').select('id, name');
  const existingByName = new Map((afterAuthors || []).map((a) => [a.name, a.id]));
  let authorsInserted = 0;
  for (const a of uniqueAuthors) {
    const already = existingByName.get(a.name);
    if (already) {
      idMap.set(a.id, already);
      continue;
    }
    if (DRY) {
      authorsInserted += 1;
      idMap.set(a.id, `dry-${a.id}`);
      continue;
    }
    const { data, error } = await supabase
      .from('authors')
      .insert({ name: a.name, bio: a.bio ?? null, role: a.role ?? null })
      .select()
      .single();
    if (error) throw new Error(`authors insert failed: ${error.message}`);
    idMap.set(a.id, data.id);
    existingByName.set(a.name, data.id);
    authorsInserted += 1;
  }
  log(`authors: unique=${uniqueAuthors.length} inserted=${authorsInserted} (deduped ${authors.length - uniqueAuthors.length} duplicates)`);

  // 3. Books — insert missing slugs; link author_id by name
  const { data: bookRows } = await supabase.from('books').select('id, slug, author_id');
  const bookBySlug = new Map((bookRows || []).map((b) => [b.slug, b]));
  let booksInserted = 0;
  let booksLinked = 0;
  for (const b of books) {
    const row = bookBySlug.get(b.slug);
    const authorId = b.author_id != null ? idMap.get(b.author_id) ?? null : null;
    if (!row) {
      if (DRY) {
        booksInserted += 1;
        continue;
      }
      const { error } = await supabase.from('books').insert({
        title: b.title,
        slug: b.slug,
        author_id: authorId,
        author_name: b.author_name,
        category: b.category,
        description: b.description,
        cover_class: b.cover_class,
        ornament: b.ornament,
        pages: b.pages,
        rating: b.rating,
        year: b.year,
        copies_sold: b.copies_sold,
        price: b.price,
        sale_price: b.sale_price ?? null,
        stock_status: b.stock_status,
        badge: b.badge ?? null,
        is_best_seller: b.is_best_seller ? 1 : 0,
        best_seller_rank: b.best_seller_rank ?? null,
        is_published: b.is_published ? 1 : 0,
        image: b.image,
        back_image: b.back_image ?? null,
        template: b.template || 'hardcover',
        submitted_by: null,
      });
      if (error) throw new Error(`books insert (${b.slug}) failed: ${error.message}`);
      booksInserted += 1;
    } else if (!row.author_id && authorId) {
      if (DRY) {
        booksLinked += 1;
        continue;
      }
      const { error } = await supabase.from('books').update({ author_id: authorId }).eq('id', row.id);
      if (error) throw new Error(`books link (${b.slug}) failed: ${error.message}`);
      booksLinked += 1;
    }
  }
  log(`books: inserted=${booksInserted} linked_author=${booksLinked}`);

  // 4. Team members (deduped by name)
  const t = await insertMissing(
    'team_members',
    team.map((r) => ({
      name: r.name,
      role: r.role,
      bio: r.bio ?? null,
      initial: r.initial,
      sort_order: r.sort_order ?? 0,
    })),
    ['name'],
    (r) => r
  );
  log(`team: inserted=${t.inserted} skipped=${t.skipped} (deduped ${team.length - t.skipped - t.inserted} in-file duplicates)`);

  // 5. Competitions (deduped by name)
  const c = await insertMissing(
    'competitions',
    comps.map((r) => ({
      name: r.name,
      scope: r.scope,
      topic: r.topic ?? null,
      status: r.status,
      entry_fee: r.entry_fee ?? 0,
      starts_at: r.starts_at,
      ends_at: r.ends_at,
    })),
    ['name'],
    (r) => r
  );
  log(`competitions: inserted=${c.inserted} skipped=${c.skipped}`);

  // 6. Quotes (match on email + book_title)
  const q = await insertMissing(
    'quotes',
    quotes.map((r) => ({
      name: r.name,
      email: r.email,
      phone: r.phone ?? null,
      book_title: r.book_title,
      notes: r.notes ?? null,
      pages: r.pages ?? 0,
      editing_level: r.editing_level ?? null,
      formatting_level: r.formatting_level ?? null,
      delivery_timeline: r.delivery_timeline ?? null,
      addons: r.addons ?? null,
      extra_copies: r.extra_copies ?? 0,
      estimated_total: r.estimated_total ?? 0,
      // SQLite never stored cover files — null them (broken local paths)
      manuscript_file: r.manuscript_file || null,
      front_cover_file: null,
      back_cover_file: null,
      status: r.status || 'pending',
      created_at: r.created_at,
    })),
    ['email', 'book_title'],
    (r) => r
  );
  log(`quotes: inserted=${q.inserted} skipped=${q.skipped}`);

  // 7. Leads (match on email + message)
  const l = await insertMissing(
    'leads',
    leads.map((r) => ({
      name: r.name,
      email: r.email,
      message: r.message ?? null,
      type: r.type || 'general',
      created_at: r.created_at,
    })),
    ['email', 'message'],
    (r) => r
  );
  log(`leads: inserted=${l.inserted} skipped=${l.skipped}`);

  // 8. Newsletter
  const n = await insertMissing(
    'newsletter',
    news.map((r) => ({ email: r.email, created_at: r.created_at })),
    ['email'],
    (r) => r
  );
  log(`newsletter: inserted=${n.inserted} skipped=${n.skipped}`);

  log(DRY ? '--- DRY RUN complete (nothing written) ---' : 'Migration complete.');
}

main().catch((err) => {
  console.error('MIGRATION FAILED:', err.message || err);
  process.exit(1);
});
