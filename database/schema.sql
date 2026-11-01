-- Literacy Gardeners — schema
CREATE TABLE IF NOT EXISTS authors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  bio TEXT,
  role TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS books (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT UNIQUE,
  author_id INTEGER REFERENCES authors(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  cover_class TEXT NOT NULL DEFAULT 'c1',
  ornament TEXT DEFAULT '❀',
  pages INTEGER DEFAULT 200,
  rating REAL DEFAULT 4.5,
  year INTEGER DEFAULT 2026,
  copies_sold INTEGER DEFAULT 0,
  price REAL DEFAULT 1499,
  sale_price REAL,
  stock_status TEXT DEFAULT 'in_stock',
  badge TEXT,
  is_best_seller INTEGER DEFAULT 0,
  best_seller_rank INTEGER,
  is_published INTEGER DEFAULT 1,
  image TEXT,
  template TEXT DEFAULT 'hardcover',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS team_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  bio TEXT,
  initial TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS competitions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('intra-class','intra-school','public')),
  topic TEXT,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming','open','closed','published')),
  entry_fee REAL DEFAULT 0,
  starts_at TEXT,
  ends_at TEXT
);

CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT,
  type TEXT DEFAULT 'general' CHECK (type IN ('general','get-published','competition','workshop')),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS newsletter (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_books_best ON books(is_best_seller, best_seller_rank);
CREATE INDEX IF NOT EXISTS idx_books_category ON books(category);
CREATE INDEX IF NOT EXISTS idx_books_slug ON books(slug);
CREATE INDEX IF NOT EXISTS idx_leads_type ON leads(type);
