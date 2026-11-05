// End-to-end smoke test against a running local API (default http://localhost:4000).
// Run AFTER database/supabase_schema.sql is applied:
//   node scripts/migrate-sqlite-to-supabase.js
//   node backend/server.js   (in another terminal)
//   node scripts/smoke.js

const BASE = process.env.API_BASE || 'http://localhost:4000';

let pass = 0;
let fail = 0;
const failures = [];

async function call(method, path, { body, token, headers = {}, raw = false } = {}) {
  const opts = { method, headers: { ...headers } };
  if (token) opts.headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) {
    if (body instanceof FormData) {
      opts.body = body;
    } else {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
  }
  const res = await fetch(`${BASE}${path}`, opts);
  let data = null;
  if (raw) return res;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data, headers: res.headers };
}

function check(name, cond, detail = '') {
  if (cond) {
    pass += 1;
    console.log(`  ok   ${name}`);
  } else {
    fail += 1;
    failures.push(`${name} ${detail}`);
    console.log(`  FAIL ${name} ${detail}`);
  }
}

function tinyPng() {
  // 1x1 transparent PNG
  return Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  );
}

async function main() {
  console.log(`Smoke testing ${BASE}\n`);

  // -- Health & basics --
  console.log('Basics');
  const health = await call('GET', '/api/health');
  check('health', health.status === 200 && health.data.ok === true, `status=${health.status}`);
  const missing = await call('GET', '/api/definitely-not-a-route');
  check('404 unknown route', missing.status === 404, `status=${missing.status}`);

  // -- Catalog --
  console.log('\nCatalog');
  const books = await call('GET', '/api/books');
  check('list books', books.status === 200 && Array.isArray(books.data) && books.data.length >= 8, `status=${books.status} n=${books.data && books.data.length}`);
  const allPublished = Array.isArray(books.data) && books.data.every((b) => b.is_published === 1);
  check('all listed books published', allPublished);
  const sorted = await call('GET', '/api/books?sort=price_asc');
  const prices = (sorted.data || []).map((b) => Number(b.sale_price ?? b.price));
  check('sort=price_asc', prices.length > 1 && prices.every((p, i) => i === 0 || prices[i - 1] <= p), JSON.stringify(prices));
  const searched = await call('GET', '/api/books?q=witches&sort=rating');
  check('search q=witches', searched.status === 200 && searched.data.length >= 1, `n=${searched.data && searched.data.length}`);
  const cats = await call('GET', '/api/books/categories');
  check('categories', cats.status === 200 && Array.isArray(cats.data) && cats.data.length >= 3, JSON.stringify(cats.data));
  const best = await call('GET', '/api/books/best-sellers');
  check('best sellers', best.status === 200 && best.data.length >= 3, `n=${best.data && best.data.length}`);
  const bySlug = await call('GET', '/api/books/slug/death-before-breakfast');
  check('book by slug', bySlug.status === 200 && bySlug.data.title === 'Death Before Breakfast');
  const byId = await call('GET', `/api/books/${bySlug.data.id}`);
  check('book by id', byId.status === 200 && byId.data.id === bySlug.data.id);
  const badId = await call('GET', '/api/books/not-a-uuid');
  check('invalid book id → 400', badId.status === 400, `status=${badId.status}`);

  // -- Team / competitions / newsletter / leads --
  console.log('\nPublic content');
  const team = await call('GET', '/api/team');
  check('team', team.status === 200 && team.data.length >= 4, `n=${team.data && team.data.length}`);
  const authors = await call('GET', '/api/team/authors');
  check('authors', authors.status === 200 && authors.data.length >= 8, `n=${authors.data && authors.data.length}`);
  const comps = await call('GET', '/api/competitions');
  check('competitions', comps.status === 200 && comps.data.length >= 3, `n=${comps.data && comps.data.length}`);
  const nlEmail = `smoke-${Date.now()}@example.com`;
  const nl = await call('POST', '/api/newsletter', { body: { email: nlEmail } });
  check('newsletter subscribe', nl.status === 201 && nl.data.inserted === true, `status=${nl.status}`);
  const nl2 = await call('POST', '/api/newsletter', { body: { email: nlEmail } });
  check('newsletter duplicate tolerated', nl2.status === 200 && nl2.data.inserted === false, `status=${nl2.status}`);
  const lead = await call('POST', '/api/leads', {
    body: { name: 'Smoke Tester', email: 'smoke@example.com', message: 'hello', type: 'general' },
  });
  check('lead submit', lead.status === 201, `status=${lead.status}`);

  // -- Auth --
  console.log('\nAuth');
  const stamp = Date.now();
  const userEmail = `smoke-user-${stamp}@example.com`;
  const reg = await call('POST', '/api/auth/register', {
    body: { name: `SmokeUser${stamp}`, email: userEmail, password: 'smoketest123', role: 'admin' },
  });
  check('register (role ignored)', reg.status === 201 && reg.data.user.role === 'user', `status=${reg.status} role=${reg.data && reg.data.user && reg.data.user.role}`);
  const userToken = reg.data && reg.data.token;
  check('register returns token', Boolean(userToken));
  const dup = await call('POST', '/api/auth/register', {
    body: { name: 'Dup', email: userEmail, password: 'smoketest123' },
  });
  check('duplicate register → 409', dup.status === 409, `status=${dup.status}`);
  const weak = await call('POST', '/api/auth/register', {
    body: { name: 'Weak', email: `weak-${stamp}@example.com`, password: 'short' },
  });
  check('weak password → 400', weak.status === 400, `status=${weak.status}`);
  const login = await call('POST', '/api/auth/login', { body: { email: userEmail, password: 'smoketest123' } });
  check('login', login.status === 200 && Boolean(login.data.token), `status=${login.status}`);
  const badLogin = await call('POST', '/api/auth/login', { body: { email: userEmail, password: 'wrong' } });
  check('bad login → 401', badLogin.status === 401, `status=${badLogin.status}`);
  const me = await call('GET', '/api/auth/me', { token: userToken });
  check('me', me.status === 200 && me.data.user.email === userEmail, `status=${me.status}`);
  const noAuth = await call('GET', '/api/auth/me');
  check('me without token → 401', noAuth.status === 401, `status=${noAuth.status}`);
  const forgot = await call('POST', '/api/auth/forgot-password', { body: { email: userEmail } });
  check('forgot-password (generic ok)', forgot.status === 200 && forgot.data.ok === true, `status=${forgot.status}`);
  const forgotUnknown = await call('POST', '/api/auth/forgot-password', { body: { email: 'nobody-here@example.com' } });
  check('forgot-password unknown email (no leak)', forgotUnknown.status === 200, `status=${forgotUnknown.status}`);

  // Author registration
  const authorEmail = `smoke-author-${stamp}@example.com`;
  const authorReg = await call('POST', '/api/auth/register-author', {
    body: {
      name: `SmokeAuthor${stamp}`,
      email: authorEmail,
      password: 'smoketest123',
      phone: '+1234567890',
      account_title: 'Smoke Author',
      account_number: '12345678',
      iban: 'GB00TEST00000000000000',
    },
  });
  check('register-author', authorReg.status === 201 && authorReg.data.user.role === 'user', `status=${authorReg.status} role=${authorReg.data && authorReg.data.user && authorReg.data.user.role}`);

  // -- Admin --
  console.log('\nAdmin');
  const adminLogin = await call('POST', '/api/auth/login', { body: { email: 'hinata40', password: 'pak@2233' } });
  check('admin login (name)', adminLogin.status === 200 && adminLogin.data.user.role === 'admin', `status=${adminLogin.status} role=${adminLogin.data && adminLogin.data.user && adminLogin.data.user.role}`);
  const adminToken = adminLogin.data && adminLogin.data.token;
  const adminByEmail = await call('POST', '/api/auth/login', { body: { email: 'hinata40@literacygardeners.com', password: 'pak@2233' } });
  check('admin login (email)', adminByEmail.status === 200, `status=${adminByEmail.status}`);

  const statsNoAuth = await call('GET', '/api/adminpanelcode/stats');
  check('stats without token → 401', statsNoAuth.status === 401, `status=${statsNoAuth.status}`);
  const statsUser = await call('GET', '/api/adminpanelcode/stats', { token: userToken });
  check('stats as user → 403', statsUser.status === 403, `status=${statsUser.status}`);
  const stats = await call('GET', '/api/adminpanelcode/stats', { token: adminToken });
  check('stats as admin', stats.status === 200 && stats.data.stats.books >= 8, `status=${stats.status}`);

  // -- Book publishing security --
  console.log('\nBook publishing');
  const anonPost = await call('POST', '/api/books', {
    body: { title: 'X', author_name: 'Y', category: 'Z' },
  });
  check('POST /api/books anon → 401', anonPost.status === 401, `status=${anonPost.status}`);
  const userPost = await call('POST', '/api/books', {
    token: userToken,
    body: { title: 'Hacker Book', author_name: 'Evil', category: 'Test' },
  });
  check('POST /api/books as user → 403', userPost.status === 403, `status=${userPost.status}`);

  // User submission flow
  const sub = await call('POST', '/api/books/submit', {
    token: userToken,
    body: {
      title: `Smoke Submitted ${stamp}`,
      author_name: 'Smoke Tester',
      category: 'Test',
      description: 'A book submitted during smoke testing.',
      price: 999,
    },
  });
  check('submit book', sub.status === 201 && sub.data.is_published === 0, `status=${sub.status} pub=${sub.data && sub.data.is_published}`);
  const mine = await call('GET', '/api/books/mine', { token: userToken });
  check('GET /books/mine', mine.status === 200 && mine.data.some((b) => b.id === sub.data.id), `status=${mine.status}`);

  const approve = await call('PATCH', `/api/adminpanelcode/books/${sub.data.id}/approve`, { token: adminToken });
  check('admin approve', approve.status === 200 && approve.data.book.is_published === 1, `status=${approve.status}`);
  const afterApprove = await call('GET', `/api/books/${sub.data.id}`);
  check('approved book is public', afterApprove.status === 200, `status=${afterApprove.status}`);

  // Admin direct create
  const adminBook = await call('POST', '/api/adminpanelcode/books', {
    token: adminToken,
    body: {
      title: `Smoke Admin Book ${stamp}`,
      author_name: 'Smoke Tester',
      category: 'Test',
      price: 500,
      is_published: 'false',
    },
  });
  check('admin create book', adminBook.status === 201, `status=${adminBook.status} ${JSON.stringify(adminBook.data)}`);

  // -- Reviews --
  console.log('\nReviews');
  const bookId = bySlug.data.id;
  const revEmpty = await call('GET', `/api/books/${bookId}/reviews`);
  check('list reviews', revEmpty.status === 200 && Array.isArray(revEmpty.data.reviews), `status=${revEmpty.status}`);
  const rev = await call('POST', `/api/books/${bookId}/reviews`, {
    token: userToken,
    body: { rating: 5, title: 'Loved it', body: 'A wonderful smoke-test read.' },
  });
  check('create review', rev.status === 201 && rev.data.review.status === 'pending', `status=${rev.status}`);
  const revMine = await call('GET', `/api/books/${bookId}/reviews/mine`, { token: userToken });
  check('my review', revMine.status === 200 && revMine.data.review && revMine.data.review.rating === 5, `status=${revMine.status}`);
  const revApprovedBefore = await call('GET', `/api/books/${bookId}/reviews`);
  check('pending review not public', !revApprovedBefore.data.reviews.some((r) => r.id === rev.data.review.id));
  const revList = await call('GET', '/api/adminpanelcode/reviews?status=pending', { token: adminToken });
  check('admin pending reviews', revList.status === 200 && revList.data.reviews.some((r) => r.id === rev.data.review.id), `status=${revList.status}`);
  const revOk = await call('PATCH', `/api/adminpanelcode/reviews/${rev.data.review.id}`, {
    token: adminToken,
    body: { status: 'approved' },
  });
  check('admin approve review', revOk.status === 200, `status=${revOk.status}`);
  const revAfter = await call('GET', `/api/books/${bookId}/reviews`);
  check('approved review is public', revAfter.data.reviews.some((r) => r.id === rev.data.review.id) && revAfter.data.stats.count >= 1, JSON.stringify(revAfter.data.stats));

  // -- Uploads --
  console.log('\nUploads');
  const fd = new FormData();
  fd.append('file', new Blob([tinyPng()], { type: 'image/png' }), 'pixel.png');
  const up = await call('POST', '/api/uploads?kind=cover', { body: fd });
  check('cover upload', up.status === 201 && typeof up.data.url === 'string' && up.data.url.startsWith('http'), `status=${up.status} ${JSON.stringify(up.data)}`);
  const fdBad = new FormData();
  fdBad.append('file', new Blob(['not a doc'], { type: 'text/plain' }), 'evil.txt');
  const upBad = await call('POST', '/api/uploads?kind=manuscript', { body: fdBad });
  check('bad manuscript ext → 400', upBad.status === 400, `status=${upBad.status}`);

  // -- Quotes --
  console.log('\nQuotes');
  const quote = await call('POST', '/api/quotes', {
    body: {
      name: 'Smoke Quoter',
      email: 'smoke-quoter@example.com',
      book_title: `Smoke Book ${stamp}`,
      pages: 100,
      estimated_total: 5000,
      manuscript_file: up.status === 201 ? null : null,
      front_cover_file: up.status === 201 ? up.data.path : null,
    },
  });
  check('submit quote', quote.status === 201, `status=${quote.status} ${JSON.stringify(quote.data)}`);
  const quotesAdmin = await call('GET', '/api/adminpanelcode/quotes', { token: adminToken });
  check('admin quotes', quotesAdmin.status === 200 && quotesAdmin.data.quotes.some((q) => q.id === quote.data.id), `status=${quotesAdmin.status}`);
  const quoteFiles = await call('GET', `/api/adminpanelcode/quotes/${quote.data.id}/files`, { token: adminToken });
  check('quote files endpoint', quoteFiles.status === 200 && quoteFiles.data.files.front_cover_url, `status=${quoteFiles.status} ${JSON.stringify(quoteFiles.data)}`);
  const qPatch = await call('PATCH', `/api/adminpanelcode/quotes/${quote.data.id}`, {
    token: adminToken,
    body: { status: 'reviewed' },
  });
  check('quote status update', qPatch.status === 200, `status=${qPatch.status}`);

  // -- Orders --
  console.log('\nOrders');
  const order = await call('POST', '/api/orders', {
    body: {
      name: 'Smoke Buyer',
      email: 'smoke-buyer@example.com',
      address: '1 Test Street',
      items: [{ slug: 'death-before-breakfast', qty: 2, price: 1 }],
      subtotal: 2,
      shipping: 0,
      total: 2,
      payment_method: 'cod',
    },
  });
  const expectedTotal = Number(order.data && order.data.order && order.data.order.subtotal);
  check('create order (server-priced)', order.status === 201 && expectedTotal > 100, `status=${order.status} subtotal=${expectedTotal} (client sent 2)`);
  const badOrder = await call('POST', '/api/orders', {
    body: {
      name: 'X',
      email: 'x@example.com',
      address: 'Y',
      items: [{ slug: 'death-before-breakfast', qty: 1, price: 1 }],
      subtotal: 1,
      shipping: 0,
      total: 1,
      payment_method: 'crypto',
    },
  });
  check('invalid payment method → 400', badOrder.status === 400, `status=${badOrder.status}`);
  const myOrders = await call('GET', '/api/orders/mine', { token: userToken });
  check('orders/mine as user', myOrders.status === 200 && Array.isArray(myOrders.data), `status=${myOrders.status}`);

  // -- Author application approval --
  console.log('\nAuthor approval');
  const apps = await call('GET', '/api/adminpanelcode/author-applications?status=pending', { token: adminToken });
  check('pending applications listed', apps.status === 200 && apps.data.applications.some((a) => a.user_email === authorEmail), `status=${apps.status}`);
  const app = apps.data.applications.find((a) => a.user_email === authorEmail);
  if (app) {
    const decided = await call('PATCH', `/api/adminpanelcode/author-applications/${app.id}`, {
      token: adminToken,
      body: { status: 'approved' },
    });
    check('approve application', decided.status === 200, `status=${decided.status}`);
    const authorLogin = await call('POST', '/api/auth/login', { body: { email: authorEmail, password: 'smoketest123' } });
    check('user is now author role', authorLogin.status === 200 && authorLogin.data.user.role === 'author', `role=${authorLogin.data && authorLogin.data.user && authorLogin.data.user.role}`);
  } else {
    check('approve application', false, 'application not found');
  }

  // -- Team write protection --
  console.log('\nWrite protection');
  const teamPostUser = await call('POST', '/api/team', {
    token: userToken,
    body: { name: 'Eve', role: 'Hacker', initial: 'E' },
  });
  check('POST /team as user → 403', teamPostUser.status === 403, `status=${teamPostUser.status}`);
  const teamPostAnon = await call('POST', '/api/team', { body: { name: 'Eve', role: 'X', initial: 'E' } });
  check('POST /team anon → 401', teamPostAnon.status === 401, `status=${teamPostAnon.status}`);

  // -- CORS --
  console.log('\nSecurity headers');
  const corsRes = await call('GET', '/api/books', { headers: { Origin: 'https://evil.example' }, raw: true });
  check('blocked origin → no CORS header, no 500', corsRes.status === 200 && !corsRes.headers.get('access-control-allow-origin'), `status=${corsRes.status} acao=${corsRes.headers.get('access-control-allow-origin')}`);
  const allowedOrigin = process.env.ALLOWED_ORIGIN || 'http://localhost:3000';
  const okCors = await call('GET', '/api/books', { headers: { Origin: allowedOrigin }, raw: true });
  check('allowed origin gets CORS', okCors.headers.get('access-control-allow-origin') === allowedOrigin, `acao=${okCors.headers.get('access-control-allow-origin')}`);

  // -- Logout-all invalidates tokens --
  console.log('\nToken invalidation');
  const logoutAll = await call('POST', '/api/auth/logout-all', { token: userToken });
  check('logout-all', logoutAll.status === 200, `status=${logoutAll.status}`);
  const staleMe = await call('GET', '/api/auth/me', { token: userToken });
  check('stale token rejected', staleMe.status === 401, `status=${staleMe.status}`);

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail) {
    console.log('Failures:');
    failures.forEach((f) => console.log(`  - ${f}`));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('SMOKE CRASHED:', err);
  process.exit(1);
});
