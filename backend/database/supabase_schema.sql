-- ============================================================
-- Literacy Gardeners — Supabase Schema (idempotent / upgrade-safe)
-- Paste into Supabase SQL Editor. Safe to re-run any time.
-- Admin login: username "hinata40" / password "pak@2233"
-- ============================================================

-- ------------------------------------------------------------------
-- 1. USERS (normal login/signup + admin + author roles)
-- ------------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password_hash text not null,
  role text not null default 'user' check (role in ('user', 'admin', 'author')),
  token_version integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.users add column if not exists token_version integer not null default 0;
create index if not exists idx_users_email on public.users(email);
create index if not exists idx_users_role on public.users(role);

-- ------------------------------------------------------------------
-- 2. AUTHORS (book attribution profiles)
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
-- 3. BOOKS (catalog — published + pending approval)
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
  back_image text,
  template text default 'hardcover',
  submitted_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.books add column if not exists back_image text;
create index if not exists idx_books_published on public.books(is_published);
create index if not exists idx_books_category on public.books(category);
create index if not exists idx_books_slug on public.books(slug);
create index if not exists idx_books_best on public.books(is_best_seller, best_seller_rank);
create index if not exists idx_books_submitted_by on public.books(submitted_by);

-- ------------------------------------------------------------------
-- 4. QUOTES / PUBLISHING REQUESTS (Get Published page)
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
-- 5. LEADS (contact form submissions)
-- ------------------------------------------------------------------
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text,
  type text default 'general' check (type in ('general', 'get-published', 'competition', 'workshop', 'author')),
  created_at timestamptz not null default now()
);
alter table public.leads drop constraint if exists leads_type_check;
alter table public.leads add constraint leads_type_check check (type in ('general', 'get-published', 'competition', 'workshop', 'author'));
create index if not exists idx_leads_type on public.leads(type);
create index if not exists idx_leads_created_at on public.leads(created_at desc);

-- ------------------------------------------------------------------
-- 6. NEWSLETTER SUBSCRIBERS
-- ------------------------------------------------------------------
create table if not exists public.newsletter (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------------
-- 7. COMPETITIONS
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

-- ------------------------------------------------------------------
-- 8. TEAM MEMBERS (was missing from earlier schema runs)
-- ------------------------------------------------------------------
create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null,
  bio text,
  initial text not null,
  sort_order integer default 0
);

-- ------------------------------------------------------------------
-- 9. REVIEWS (book ratings — admin moderated)
-- ------------------------------------------------------------------
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  title text,
  body text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  unique (book_id, user_id)
);
create index if not exists idx_reviews_book on public.reviews(book_id, status);

-- ------------------------------------------------------------------
-- 10. ORDERS (COD / bank-transfer checkout)
-- ------------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  name text not null,
  email text not null,
  phone text,
  address text not null,
  notes text,
  items jsonb not null default '[]',
  subtotal numeric not null default 0,
  shipping numeric not null default 0,
  total numeric not null default 0,
  payment_method text not null default 'cod' check (payment_method in ('cod', 'bank_transfer')),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  created_at timestamptz not null default now()
);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_created on public.orders(created_at desc);

-- ------------------------------------------------------------------
-- 11. AUTHOR PROFILES (applications + payment details, admin-only reads)
-- ------------------------------------------------------------------
create table if not exists public.author_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  phone text,
  account_title text,
  account_number text,
  iban text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_author_profiles_status on public.author_profiles(status);

-- ------------------------------------------------------------------
-- 12. PASSWORD RESETS (sha256 token hash, 30 min, single-use)
-- ------------------------------------------------------------------
create table if not exists public.password_resets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_resets_user on public.password_resets(user_id);

-- ============================================================
-- ROW LEVEL SECURITY — service-role only (no public/anon access)
-- ============================================================
alter table public.users enable row level security;
alter table public.books enable row level security;
alter table public.authors enable row level security;
alter table public.quotes enable row level security;
alter table public.leads enable row level security;
alter table public.newsletter enable row level security;
alter table public.competitions enable row level security;
alter table public.team_members enable row level security;
alter table public.reviews enable row level security;
alter table public.orders enable row level security;
alter table public.author_profiles enable row level security;
alter table public.password_resets enable row level security;

-- Drop the earlier permissive policies (they allowed anonymous access).
-- With RLS enabled and NO policies, only the backend service role can touch data.
drop policy if exists "Users are viewable by everyone" on public.users;
drop policy if exists "Users can update own profile" on public.users;
drop policy if exists "Published books are viewable by everyone" on public.books;
drop policy if exists "Admins manage all books" on public.books;
drop policy if exists "Users can insert their own book submissions" on public.books;
drop policy if exists "Anyone can insert quotes" on public.quotes;
drop policy if exists "Admins manage all quotes" on public.quotes;
drop policy if exists "Authors are viewable by everyone" on public.authors;
drop policy if exists "Admins manage authors" on public.authors;
drop policy if exists "Anyone can insert leads" on public.leads;
drop policy if exists "Admins manage leads" on public.leads;
drop policy if exists "Anyone can subscribe" on public.newsletter;
drop policy if exists "Admins manage newsletter" on public.newsletter;
drop policy if exists "Competitions are viewable by everyone" on public.competitions;
drop policy if exists "Admins manage competitions" on public.competitions;

-- ============================================================
-- STORAGE BUCKETS
-- public  uploads     → book covers (public URLs used by the site)
-- private manuscripts → quote files (admin-only signed links)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values ('manuscripts', 'manuscripts', false)
on conflict (id) do update set public = false;

-- ============================================================
-- SEED DATA
-- ============================================================

-- Admin account: username "hinata40" / password "pak@2233"
-- First upgrade any earlier weak "admin" row, then insert if absent.
update public.users
set name = 'hinata40',
    email = 'hinata40@literacygardeners.com',
    password_hash = '$2b$12$RungenWRKwKknHx86wlZSO71ePvcwCjDkz.QjS.tN16j3XCl5zJQu',
    role = 'admin'
where email = 'admin@literacygardeners.com'
   or (role = 'admin' and name = 'admin' and email <> 'hinata40@literacygardeners.com');

insert into public.users (name, email, password_hash, role)
values ('hinata40', 'hinata40@literacygardeners.com',
        '$2b$12$RungenWRKwKknHx86wlZSO71ePvcwCjDkz.QjS.tN16j3XCl5zJQu', 'admin')
on conflict (email) do nothing;

-- Authors (team attribution + book authors, deduped by name)
insert into public.authors (name, bio, role)
select v.name, v.bio, v.role
from (values
  ('Aarohi Sen', 'Published novelist and mentor-in-chief. Leads curriculum, curation, and the publishing pipeline.', 'Co-Founder · Published Author'),
  ('Rohan Mehta', 'Award-winning editor shaping young manuscripts into polished books.', 'Co-Founder · Editor'),
  ('Sana Qureshi', 'Poet and educator running workshops and competitions across schools.', 'Head of Workshops'),
  ('Vivaan Roy', 'Coordinates cover design, formatting, and distribution for every winning story.', 'Publishing Lead'),
  ('Kabir Anand', 'Epic fantasy writer, student champion.', 'Author'),
  ('Ishita Banerjee', 'YA fiction debuting through our program.', 'Author'),
  ('Meera Kapoor', 'Essayist and diary-keeper.', 'Author'),
  ('Zoya Rahman', 'Mystery writer, school competition winner.', 'Author'),
  ('Aarav Nair', 'Young sci-fi voice with a big future.', 'Author'),
  ('Ananya Das', 'Nature poet and gardener of words.', 'Author'),
  ('LG Press Collective', 'Collective of competition winners.', 'Anthology')
) as v(name, bio, role)
where not exists (select 1 from public.authors a where a.name = v.name);

-- Team members
insert into public.team_members (name, role, bio, initial, sort_order)
select v.name, v.role, v.bio, v.initial, v.sort_order
from (values
  ('Aarohi Sen', 'Co-Founder · Published Author', 'Published novelist and mentor-in-chief. Leads curriculum, curation, and the publishing pipeline for all young authors.', 'A', 1),
  ('Rohan Mehta', 'Co-Founder · Editor', 'Award-winning editor shaping young manuscripts into polished books ready for print and digital release.', 'R', 2),
  ('Sana Qureshi', 'Head of Workshops', 'Poet and educator running our writing workshops and competitions across schools and public platforms.', 'S', 3),
  ('Vivaan Roy', 'Publishing Lead', 'Coordinates cover design, formatting, and distribution so every winning story finds its readers.', 'V', 4)
) as v(name, role, bio, initial, sort_order)
where not exists (select 1 from public.team_members t where t.name = v.name);

-- Competitions
insert into public.competitions (name, scope, topic, status, entry_fee, starts_at, ends_at)
select v.name, v.scope, v.topic, v.status, v.entry_fee, v.starts_at::timestamptz, v.ends_at::timestamptz
from (values
  ('Spring Words Open', 'public', 'Home', 'open', 2.0, '2026-03-01', '2026-04-30'),
  ('Inter-Class Flash', 'intra-class', 'A door that should stay shut', 'closed', 1.0, '2026-01-10', '2026-01-31'),
  ('Monsoon Anthology Call', 'public', 'Rain', 'upcoming', 2.5, '2026-06-01', '2026-07-15')
) as v(name, scope, topic, status, entry_fee, starts_at, ends_at)
where not exists (select 1 from public.competitions c where c.name = v.name);

-- Books (full catalog — idempotent on slug)
insert into public.books (
  title, slug, author_name, category, description, cover_class, ornament,
  pages, rating, year, copies_sold, price, sale_price, stock_status, badge,
  is_best_seller, best_seller_rank, is_published, image, template
) values
  ('Death Before Breakfast', 'death-before-breakfast', 'George Bellairs', 'Mystery & Crime',
   'A gripping, atmospheric mystery unfolding in the misty morning streets of Paris. When dawn breaks over the Seine, an unexpected shadow reveals a decades-old puzzle.',
   'c1', '◈', 284, 4.9, 2026, 9400, 1500, null, 'in_stock', 'Bestseller',
   1, 1, 1, '/images/animationimages/3.jfif', 'hardcover'),
  ('The Beauty Within', 'the-beauty-within', 'Samantha Donald', 'Poetry & Reflection',
   'A delicate yet fierce anthology of contemporary verse exploring grace, identity, vulnerability, and the courage to blossom from within.',
   'c4', '❀', 148, 5.0, 2026, 8100, 1299, null, 'in_stock', 'Editor’s Choice',
   1, 2, 1, '/images/animationimages/5.png', 'paperback'),
  ('Of Witches and Cows', 'of-witches-and-cows', 'L.R. Bakker', 'Fantasy Adventure',
   'A whimsical and spellbinding highland fantasy where ancient folklore, arcane secrets, and an extraordinary highland guardian collide.',
   'c3', '✿', 310, 4.8, 2025, 7200, 1499, null, 'in_stock', 'Trending',
   1, 3, 1, '/images/animationimages/6.jfif', 'spiral'),
  ('The Raven King', 'the-raven-king', 'Maggie Stiefvater', 'YA Fantasy',
   'The breathtaking culmination of destiny, slumbering kings, and fiercely loyal young friends seeking ancient magic just beneath the surface of the ordinary.',
   'c2', '✦', 368, 5.0, 2026, 7600, 1799, 1499, 'in_stock', 'Sale!',
   1, 4, 1, '/images/animationimages/7.jfif', 'hardcover'),
  ('Who Am I?', 'who-am-i', 'Michelle Rice-Gauvreau', 'Memoir & True Story',
   'A moving and resilient true story of tracing ancestral roots, overcoming adversity, and discovering healing and identity through the written word.',
   'c5', '○', 232, 4.9, 2025, 6800, 1650, null, 'in_stock', 'Award Winner',
   1, 5, 1, '/images/animationimages/9.jpg', 'hardcover'),
  ('Create Your Own Business', 'create-your-own-business', 'James Murdor', 'Leadership & Guide',
   'A clear, inspiring, and actionable blueprint empowering ambitious youth to turn visionary ideas into sustainable, thriving creative enterprises.',
   'c6', '✧', 196, 4.9, 2026, 5400, 1850, null, 'in_stock', 'Must Read',
   1, 6, 1, '/images/animationimages/10.jpg', 'paperback'),
  ('Seeds of the Untold', 'seeds-of-the-untold', 'Collective · LG Press', 'Anthology',
   'Twenty-four young voices. One anthology. The sharpest entries from a year of open competitions, mentored and published end-to-end.',
   'c7', '❀', 220, 4.9, 2026, 5400, 1499, null, 'in_stock', 'New Release',
   0, null, 1, '/images/animationimages/10.jpg', 'paperback'),
  ('The Paper Kingdom', 'the-paper-kingdom', 'Kabir Anand', 'Fantasy',
   'In a world where stories are currency, a young scribe must save a kingdom built entirely from words.',
   'c8', '♛', 318, 4.9, 2024, 11000, 1799, 1499, 'in_stock', 'Sale!',
   0, null, 1, '/images/animationimages/6.jfif', 'spiral')
on conflict (slug) do nothing;

-- ============================================================
-- LOGIN RATE LIMITING (shared across serverless instances)
-- Vercel runs many parallel copies of the API, so an in-memory
-- counter is per-instance. rate_limit_hit() counts in Postgres
-- instead; the backend falls back to memory until this exists.
-- ============================================================
create table if not exists public.rate_limits (
  key text primary key,
  count integer not null default 1,
  window_start timestamptz not null default now()
);

-- Keys contain client IPs + attempted emails: no policies => only the
-- SECURITY DEFINER function below (and the service role) can read them.
alter table public.rate_limits enable row level security;

create or replace function public.rate_limit_hit(p_key text, p_window_seconds integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.rate_limits%rowtype;
  v_now timestamptz := now();
  v_window integer := least(greatest(coalesce(p_window_seconds, 900), 10), 86400);
begin
  insert into public.rate_limits as rl (key, count, window_start)
  values (left(p_key, 300), 1, v_now)
  on conflict (key) do update set
    count = case when rl.window_start <= v_now - make_interval(secs => v_window)
                 then 1 else rl.count + 1 end,
    window_start = case when rl.window_start <= v_now - make_interval(secs => v_window)
                        then v_now else rl.window_start end
  returning rl.* into v_row;

  -- table only holds login keys; drop rows whose window closed long ago
  delete from public.rate_limits where window_start < v_now - interval '1 day';

  return jsonb_build_object(
    'count', v_row.count,
    'reset_at', v_row.window_start + make_interval(secs => v_window)
  );
end;
$$;

revoke execute on function public.rate_limit_hit(text, integer) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, integer) to service_role;

-- ============================================================
-- END
-- ============================================================
