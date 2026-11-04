-- ============================================================
-- Literacy Gardeners — Complete Database Queries (All-in-One)
-- ============================================================
-- Tables: users, authors, books, leads, quotes, newsletter, competitions
-- Includes seed data + runnable queries for Supabase SQL Editor
-- ============================================================

-- ------------------------------------------------------------------
-- 1. USERS TABLE (Normal + Admin + Author login/signup)
-- ------------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password_hash text not null,
  role text not null default 'user' check (role in ('user', 'admin', 'author')),
  created_at timestamptz not null default now()
);

create index if not exists idx_users_email on public.users(email);
create index if not exists idx_users_role on public.users(role);

-- ------------------------------------------------------------------
-- 2. AUTHORS TABLE (Author profiles)
-- ------------------------------------------------------------------
create table if not exists public.authors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  bio text,
  role text,
  user_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_authors_name on public.authors(name);

-- ------------------------------------------------------------------
-- 3. BOOKS TABLE
-- ------------------------------------------------------------------
create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  author_id uuid references public.authors(id) on delete set null,
  author_name text not null,
  category text not null,
  description text,
  cover_class text default 'c1',
  ornament text default '❀',
  pages integer default 200,
  rating real default 4.5,
  year integer default 2026,
  copies_sold integer default 0,
  price real default 1499,
  sale_price real,
  stock_status text default 'in_stock',
  badge text,
  is_best_seller integer default 0,
  best_seller_rank integer,
  is_published integer default 0 check (is_published in (0, 1)),
  image text,
  template text default 'hardcover',
  submitted_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_books_published on public.books(is_published);
create index if not exists idx_books_category on public.books(category);
create index if not exists idx_books_slug on public.books(slug);
create index if not exists idx_books_best on public.books(is_best_seller, best_seller_rank);
create index if not exists idx_books_submitted_by on public.books(submitted_by);

-- ------------------------------------------------------------------
-- 4. LEADS TABLE (Contact Form)
-- ------------------------------------------------------------------
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text,
  type text default 'general' check (type in ('general', 'get-published', 'competition', 'workshop')),
  created_at timestamptz not null default now()
);

create index if not exists idx_leads_type on public.leads(type);
create index if not exists idx_leads_created_at on public.leads(created_at desc);

-- ------------------------------------------------------------------
-- 5. QUOTES TABLE (Get Published Form)
-- ------------------------------------------------------------------
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  book_title text not null,
  notes text,
  pages integer default 0,
  editing_level text,
  formatting_level text,
  delivery_timeline text,
  addons text,
  extra_copies integer default 0,
  estimated_total real,
  manuscript_file text,
  front_cover_file text,
  back_cover_file text,
  status text default 'pending' check (status in ('pending', 'reviewed', 'sent')),
  created_at timestamptz not null default now()
);

create index if not exists idx_quotes_status on public.quotes(status);
create index if not exists idx_quotes_email on public.quotes(email);

-- ------------------------------------------------------------------
-- 6. NEWSLETTER TABLE
-- ------------------------------------------------------------------
create table if not exists public.newsletter (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------------
-- 7. COMPETITIONS TABLE
-- ------------------------------------------------------------------
create table if not exists public.competitions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  scope text not null check (scope in ('intra-class', 'intra-school', 'public')),
  topic text,
  status text default 'upcoming' check (status in ('upcoming', 'open', 'closed', 'published')),
  entry_fee real default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY (Supabase)
-- ============================================================
alter table public.users enable row level security;
alter table public.books enable row level security;
alter table public.authors enable row level security;
alter table public.quotes enable row level security;
alter table public.leads enable row level security;
alter table public.newsletter enable row level security;
alter table public.competitions enable row level security;

drop policy if exists "Users viewable by everyone" on public.users;
create policy "Users viewable by everyone" on public.users for select using (true);
drop policy if exists "Users update own profile" on public.users;
create policy "Users update own profile" on public.users for update using (auth.uid() = id);

drop policy if exists "Published books viewable by everyone" on public.books;
create policy "Published books viewable by everyone" on public.books for select using (is_published = 1);
drop policy if exists "Admins manage all books" on public.books;
create policy "Admins manage all books" on public.books for all using (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);
drop policy if exists "Users insert own book submissions" on public.books;
create policy "Users insert own book submissions" on public.books for insert with check (auth.uid() = submitted_by);

drop policy if exists "Authors viewable by everyone" on public.authors;
create policy "Authors viewable by everyone" on public.authors for select using (true);
drop policy if exists "Admins manage authors" on public.authors;
create policy "Admins manage authors" on public.authors for all using (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);

drop policy if exists "Anyone insert quotes" on public.quotes;
create policy "Anyone insert quotes" on public.quotes for insert with check (true);
drop policy if exists "Admins manage quotes" on public.quotes;
create policy "Admins manage quotes" on public.quotes for all using (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);

drop policy if exists "Anyone insert leads" on public.leads;
create policy "Anyone insert leads" on public.leads for insert with check (true);
drop policy if exists "Admins manage leads" on public.leads;
create policy "Admins manage leads" on public.leads for all using (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);

drop policy if exists "Anyone subscribe newsletter" on public.newsletter;
create policy "Anyone subscribe newsletter" on public.newsletter for insert with check (true);
drop policy if exists "Admins manage newsletter" on public.newsletter;
create policy "Admins manage newsletter" on public.newsletter for all using (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);

drop policy if exists "Competitions viewable by everyone" on public.competitions;
create policy "Competitions viewable by everyone" on public.competitions for select using (true);
drop policy if exists "Admins manage competitions" on public.competitions;
create policy "Admins manage competitions" on public.competitions for all using (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);

-- ============================================================
-- SEED DATA — Default Admin Account
-- Username: admin | Password: admin
-- ============================================================
insert into public.users (name, email, password_hash, role)
values (
  'admin',
  'admin@literacygardeners.com',
  '$2b$12$LDHL5oIweY0uT/BfX3LgB.KoqZr56Mq3WuvkbzevAmS1.xauXsjVK',
  'admin'
)
on conflict (email) do nothing;

-- Sample authors
insert into public.authors (name, bio, role) values
  ('Aarohi Sen', 'Published novelist and mentor-in-chief.', 'Co-Founder · Published Author'),
  ('Rohan Mehta', 'Award-winning editor shaping young manuscripts.', 'Co-Founder · Editor'),
  ('Sana Qureshi', 'Poet and educator running workshops.', 'Head of Workshops'),
  ('Vivaan Roy', 'Publishing lead for cover design and distribution.', 'Publishing Lead')
on conflict do nothing;

-- Sample published books (shown in 3D showcase)
insert into public.books (
  title, slug, author_name, category, description, cover_class, ornament,
  pages, rating, year, copies_sold, price, sale_price, stock_status, badge,
  is_best_seller, best_seller_rank, is_published, image, template
) values
  ('Death Before Breakfast', 'death-before-breakfast', 'George Bellairs', 'Mystery & Crime',
   'A gripping, atmospheric mystery unfolding in the misty morning streets of Paris.',
   'c1', '◈', 284, 4.9, 2026, 9400, 1500, null, 'in_stock', 'Bestseller',
   1, 1, 1, '/images/animationimages/3.jfif', 'hardcover'),
  ('The Beauty Within', 'the-beauty-within', 'Samantha Donald', 'Poetry & Reflection',
   'A delicate yet fierce anthology of contemporary verse exploring grace and identity.',
   'c4', '❀', 148, 5.0, 2026, 8100, 1299, null, 'in_stock', 'Editor’s Choice',
   1, 2, 1, '/images/animationimages/5.png', 'paperback'),
  ('Of Witches and Cows', 'of-witches-and-cows', 'L.R. Bakker', 'Fantasy Adventure',
   'A whimsical highland fantasy where ancient folklore and arcane secrets collide.',
   'c3', '✿', 310, 4.8, 2025, 7200, 1499, null, 'in_stock', 'Trending',
   1, 3, 1, '/images/animationimages/6.jfif', 'spiral'),
  ('The Raven King', 'the-raven-king', 'Maggie Stiefvater', 'YA Fantasy',
   'The breathtaking culmination of destiny and fiercely loyal young friends.',
   'c2', '✦', 368, 5.0, 2026, 7600, 1799, 1499, 'in_stock', 'Sale!',
   1, 4, 1, '/images/animationimages/7.jfif', 'hardcover'),
  ('Who Am I?', 'who-am-i', 'Michelle Rice-Gauvreau', 'Memoir & True Story',
   'A moving true story of tracing ancestral roots and discovering healing.',
   'c5', '○', 232, 4.9, 2025, 6800, 1650, null, 'in_stock', 'Award Winner',
   1, 5, 1, '/images/animationimages/9.jpg', 'hardcover'),
  ('Create Your Own Business', 'create-your-own-business', 'James Murdor', 'Leadership & Guide',
   'A clear blueprint empowering ambitious youth to turn visionary ideas into enterprises.',
   'c6', '✧', 196, 4.9, 2026, 5400, 1850, null, 'in_stock', 'Must Read',
   1, 6, 1, '/images/animationimages/10.jpg', 'paperback')
on conflict (slug) do nothing;

-- ============================================================
-- RUNNABLE QUERIES (copy individual blocks into Supabase SQL Editor)
-- ============================================================

-- ------------------------------------------------------------------
-- DASHBOARD STATS
-- ------------------------------------------------------------------
select
  (select count(*) from public.users) as total_users,
  (select count(*) from public.users where role = 'admin') as total_admins,
  (select count(*) from public.authors) as total_authors,
  (select count(*) from public.books) as total_books,
  (select count(*) from public.books where is_published = 0) as pending_books,
  (select count(*) from public.quotes) as total_quotes,
  (select count(*) from public.quotes where status = 'pending') as pending_quotes,
  (select count(*) from public.leads) as total_leads;

-- ------------------------------------------------------------------
-- LIST ALL PUBLISHED BOOKS (3D showcase / buy pages)
-- ------------------------------------------------------------------
select * from public.books
where is_published = 1
order by created_at desc
limit 60;

-- ------------------------------------------------------------------
-- LIST ALL BOOKS INCLUDING PENDING (admin panel)
-- ------------------------------------------------------------------
select * from public.books order by created_at desc;

-- ------------------------------------------------------------------
-- LIST ALL AUTHORS
-- ------------------------------------------------------------------
select * from public.authors order by name;

-- ------------------------------------------------------------------
-- LIST ALL USERS
-- ------------------------------------------------------------------
select id, name, email, role, created_at from public.users order by created_at desc;

-- ------------------------------------------------------------------
-- LIST ALL QUOTES
-- ------------------------------------------------------------------
select * from public.quotes order by created_at desc;

-- ------------------------------------------------------------------
-- LIST ALL LEADS (contact form)
-- ------------------------------------------------------------------
select * from public.leads order by created_at desc;

-- ------------------------------------------------------------------
-- LIST ALL CATEGORIES
-- ------------------------------------------------------------------
select distinct category from public.books where is_published = 1 order by category;

-- ------------------------------------------------------------------
-- GET BEST SELLERS
-- ------------------------------------------------------------------
select * from public.books
where is_published = 1 and is_best_seller = 1
order by best_seller_rank asc
limit 4;

-- ============================================================
-- NOTE: The following queries require actual UUID values.
-- Replace 'some-uuid-here' with a real UUID from your database.
-- They cannot be run as-is in Supabase SQL Editor.
-- ============================================================

-- Get book by ID: select * from public.books where id = '<actual-book-uuid>';
-- Get user by ID: select id, name, email, role from public.users where id = '<actual-user-uuid>';
-- Approve book: update public.books set is_published = 1, updated_at = now() where id = '<actual-book-uuid>';
-- Reject book: update public.books set is_published = 0, updated_at = now() where id = '<actual-book-uuid>';
-- Delete book: delete from public.books where id = '<actual-book-uuid>' returning id;
-- Update quote status: update public.quotes set status = 'reviewed' where id = '<actual-quote-uuid>';
-- Delete quote: delete from public.quotes where id = '<actual-quote-uuid>' returning id;
-- Delete user: delete from public.users where id = '<actual-user-uuid>' returning id;
-- Delete author: delete from public.authors where id = '<actual-author-uuid>' returning id;
-- Delete lead: delete from public.leads where id = '<actual-lead-uuid>' returning id;

-- ============================================================
-- END OF ALL QUERIES
-- ============================================================
