const { getDb } = require('./connection');

function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function seedIfEmpty() {
  const db = getDb();
  const count = db.prepare('SELECT COUNT(*) AS n FROM books').get().n;
  if (count > 0) return false;

  db.exec('BEGIN');
  try {
    const insAuthor = db.prepare('INSERT INTO authors (name, bio, role) VALUES (?, ?, ?)');
    const a1 = Number(insAuthor.run('Aarohi Sen', 'Published novelist and mentor-in-chief.', 'Co-Founder').lastInsertRowid);
    const a2 = Number(insAuthor.run('Kabir Anand', 'Epic fantasy writer, student champion.', 'Author').lastInsertRowid);
    const a3 = Number(insAuthor.run('Ishita Banerjee', 'YA fiction debuting through our program.', 'Author').lastInsertRowid);
    const a4 = Number(insAuthor.run('Meera Kapoor', 'Essayist and diary-keeper.', 'Author').lastInsertRowid);
    const a5 = Number(insAuthor.run('Zoya Rahman', 'Mystery writer, school competition winner.', 'Author').lastInsertRowid);
    const a6 = Number(insAuthor.run('Aarav Nair', 'Young sci-fi voice with a big future.', 'Author').lastInsertRowid);
    const a7 = Number(insAuthor.run('Ananya Das', 'Nature poet and gardener of words.', 'Author').lastInsertRowid);
    const a8 = Number(insAuthor.run('LG Press Collective', 'Collective of competition winners.', 'Anthology').lastInsertRowid);

    const insBook = db.prepare(
      `INSERT INTO books (title, slug, author_id, author_name, category, description, cover_class, ornament,
        pages, rating, year, copies_sold, price, sale_price, stock_status, badge, is_best_seller, best_seller_rank, image, template, is_published)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
    );
    const rows = [
      ['Death Before Breakfast', a5, 'George Bellairs', 'Mystery & Crime',
        'A gripping, atmospheric mystery unfolding in the misty morning streets of Paris. When dawn breaks over the Seine, an unexpected shadow reveals a decades-old puzzle.',
        'c1', '◈', 284, 4.9, 2026, 9400, 1500, null, 'in_stock', 'Bestseller', 1, 1, '/images/animationimages/3.jfif', 'hardcover'],
      ['The Beauty Within', a7, 'Samantha Donald', 'Poetry & Reflection',
        'A delicate yet fierce anthology of contemporary verse exploring grace, identity, vulnerability, and the courage to blossom from within.',
        'c4', '❀', 148, 5.0, 2026, 8100, 1299, null, 'in_stock', 'Editor’s Choice', 1, 2, '/images/animationimages/5.png', 'paperback'],
      ['Of Witches and Cows', a2, 'L.R. Bakker', 'Fantasy Adventure',
        'A whimsical and spellbinding highland fantasy where ancient folklore, arcane secrets, and an extraordinary highland guardian collide.',
        'c3', '✿', 310, 4.8, 2025, 7200, 1499, null, 'in_stock', 'Trending', 1, 3, '/images/animationimages/6.jfif', 'spiral'],
      ['The Raven King', a2, 'Maggie Stiefvater', 'YA Fantasy',
        'The breathtaking culmination of destiny, slumbering kings, and fiercely loyal young friends seeking ancient magic just beneath the surface of the ordinary.',
        'c2', '✦', 368, 5.0, 2026, 7600, 1799, 1499, 'in_stock', 'Sale!', 1, 4, '/images/animationimages/7.jfif', 'hardcover'],
      ['Who Am I?', a1, 'Michelle Rice-Gauvreau', 'Memoir & True Story',
        'A moving and resilient true story of tracing ancestral roots, overcoming adversity, and discovering healing and identity through the written word.',
        'c5', '○', 232, 4.9, 2025, 6800, 1650, null, 'in_stock', 'Award Winner', 1, 5, '/images/animationimages/9.jpg', 'hardcover'],
      ['Create Your Own Business', a6, 'James Murdor', 'Leadership & Guide',
        'A clear, inspiring, and actionable blueprint empowering ambitious youth to turn visionary ideas into sustainable, thriving creative enterprises.',
        'c6', '✧', 196, 4.9, 2026, 5400, 1850, null, 'in_stock', 'Must Read', 1, 6, '/images/animationimages/10.jpg', 'paperback'],
      ['Seeds of the Untold', a8, 'Collective · LG Press', 'Anthology',
        'Twenty-four young voices. One anthology. The sharpest entries from a year of open competitions, mentored and published end-to-end.',
        'c7', '❀', 220, 4.9, 2026, 5400, 1499, null, 'in_stock', 'New Release', 0, null, '/images/animationimages/10.jpg', 'paperback'],
      ['The Paper Kingdom', a2, 'Kabir Anand', 'Fantasy',
        'In a world where stories are currency, a young scribe must save a kingdom built entirely from words.',
        'c8', '♛', 318, 4.9, 2024, 11000, 1799, 1499, 'in_stock', 'Sale!', 0, null, '/images/animationimages/6.jfif', 'spiral']
    ];
    for (const r of rows) {
      const title = r[0];
      insBook.run(title, slugify(title), ...r.slice(1));
    }

    const insTeam = db.prepare(
      'INSERT INTO team_members (name, role, bio, initial, sort_order) VALUES (?, ?, ?, ?, ?)'
    );
    insTeam.run('Aarohi Sen', 'Co-Founder · Published Author',
      'Published novelist and mentor-in-chief. Leads curriculum, curation, and the publishing pipeline for all young authors.', 'A', 1);
    insTeam.run('Rohan Mehta', 'Co-Founder · Editor',
      'Award-winning editor shaping young manuscripts into polished books ready for print and digital release.', 'R', 2);
    insTeam.run('Sana Qureshi', 'Head of Workshops',
      'Poet and educator running our writing workshops and competitions across schools and public platforms.', 'S', 3);
    insTeam.run('Vivaan Roy', 'Publishing Lead',
      'Coordinates cover design, formatting, and distribution so every winning story finds its readers.', 'V', 4);

    const insComp = db.prepare(
      'INSERT INTO competitions (name, scope, topic, status, entry_fee, starts_at, ends_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    insComp.run('Spring Words Open', 'public', 'Home', 'open', 2.0, '2026-03-01', '2026-04-30');
    insComp.run('Inter-Class Flash', 'intra-class', 'A door that should stay shut', 'closed', 1.0, '2026-01-10', '2026-01-31');
    insComp.run('Monsoon Anthology Call', 'public', 'Rain', 'upcoming', 2.5, '2026-06-01', '2026-07-15');

    db.exec('COMMIT');
    return true;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

function ensureColumns() {
  const db = getDb();
  const cols = db.prepare('PRAGMA table_info(books)').all().map((c) => c.name);
  if (!cols.includes('slug')) {
    db.exec("ALTER TABLE books ADD COLUMN slug TEXT");
  }
  if (!cols.includes('sale_price')) {
    db.exec('ALTER TABLE books ADD COLUMN sale_price REAL');
  }
  if (!cols.includes('stock_status')) {
    db.exec("ALTER TABLE books ADD COLUMN stock_status TEXT DEFAULT 'in_stock'");
  }
  db.prepare(
    `UPDATE books SET slug = LOWER(REPLACE(REPLACE(REPLACE(title, '''', ''), ' ', '-'), '’', ''))
     WHERE slug IS NULL`
  ).run();
}

module.exports = { seedIfEmpty, ensureColumns, slugify };
