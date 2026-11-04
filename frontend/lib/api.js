const BASE = '/api';
const TOKEN_KEY = 'lg_auth_token';

function getToken() {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem(TOKEN_KEY) || window.localStorage.getItem(TOKEN_KEY);
}

function setToken(token, persist = true) {
  if (typeof window === 'undefined') return;
  if (token) {
    if (persist) window.localStorage.setItem(TOKEN_KEY, token);
    else window.sessionStorage.setItem(TOKEN_KEY, token);
  } else {
    window.localStorage.removeItem(TOKEN_KEY);
    window.sessionStorage.removeItem(TOKEN_KEY);
  }
}

async function parseError(res) {
  const body = await res.json().catch(() => ({}));
  const err = new Error(body.error || `Request failed: ${res.status}`);
  err.status = res.status;
  err.details = body.details;
  return err;
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    headers,
    ...options,
  });

  if (res.status === 401) {
    // Only wipe the session if this request actually presented a token —
    // a failed login must not clear a valid session.
    if (token) setToken(null);
    const err = await parseError(res);
    if (token && /authorization|token/i.test(err.message)) {
      err.message = 'Session expired — please log in again.';
    }
    throw err;
  }

  if (!res.ok) throw await parseError(res);
  return res.json();
}

async function requestForm(path, body, options = {}) {
  const token = getToken();
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    headers,
    method: options.method || 'POST',
    body,
  });

  if (res.status === 401) {
    if (token) setToken(null);
    const err = await parseError(res);
    if (token && /authorization|token/i.test(err.message)) {
      err.message = 'Session expired — please log in again.';
    }
    throw err;
  }

  if (!res.ok) throw await parseError(res);
  return res.json();
}

export const api = {
  getBooks: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.category) qs.set('category', params.category);
    if (params.sort) qs.set('sort', params.sort);
    if (params.q) qs.set('q', params.q);
    const s = qs.toString();
    return request(`/books${s ? `?${s}` : ''}`);
  },
  getBookBySlug: (slug) => request(`/books/slug/${encodeURIComponent(slug)}`),
  getBookById: (id) => request(`/books/${encodeURIComponent(id)}`),
  getBestSellers: (limit = 4) => request(`/books/best-sellers?limit=${limit}`),
  getCategories: () => request('/books/categories'),
  getTeam: () => request('/team'),
  getAuthors: () => request('/team/authors'),
  getCompetitions: () => request('/competitions'),
  submitLead: (lead) => request('/leads', { method: 'POST', body: JSON.stringify(lead) }),
  subscribe: (email) => request('/newsletter', { method: 'POST', body: JSON.stringify({ email }) }),

  // Auth
  register: (data, persist = true) => {
    return request('/auth/register', { method: 'POST', body: JSON.stringify(data) }).then((result) => {
      if (result.token) setToken(result.token, persist);
      return result;
    });
  },
  login: (data, persist = true) => {
    return request('/auth/login', { method: 'POST', body: JSON.stringify(data) }).then((result) => {
      if (result.token) setToken(result.token, persist);
      return result;
    });
  },
  logout: () => {
    setToken(null);
  },
  logoutAll: () => request('/auth/logout-all', { method: 'POST' }),
  getMe: () => request('/auth/me'),
  forgotPassword: (email) =>
    request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (token, password) =>
    request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) }),
  registerAuthor: (data) =>
    request('/auth/register-author', { method: 'POST', body: JSON.stringify(data) }),

  // Books — user submissions (JSON)
  getMyBooks: () => request('/books/mine'),
  submitBook: (data) => request('/books/submit', { method: 'POST', body: JSON.stringify(data) }),

  // Reviews
  getBookReviews: (id) => request(`/books/${encodeURIComponent(id)}/reviews`),
  getMyReview: (id) => request(`/books/${encodeURIComponent(id)}/reviews/mine`),
  postReview: (id, data) =>
    request(`/books/${encodeURIComponent(id)}/reviews`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Publishing request (Get Published)
  submitQuote: (data) => request('/quotes', { method: 'POST', body: JSON.stringify(data) }),

  // File uploads → Supabase Storage
  uploadFile: (file, kind = 'cover') => {
    const fd = new FormData();
    fd.append('file', file);
    return requestForm(`/uploads?kind=${encodeURIComponent(kind)}`, fd);
  },

  // Checkout
  createOrder: (data) => request('/orders', { method: 'POST', body: JSON.stringify(data) }),
  getMyOrders: () => request('/orders/mine'),

  // Admin
  getUsers: () => request('/adminpanelcode/users'),
  deleteUser: (id) => request(`/adminpanelcode/users/${id}`, { method: 'DELETE' }),
  updateUserRole: (id, role) =>
    request(`/adminpanelcode/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  getAdminAuthors: () => request('/adminpanelcode/authors'),
  createAuthor: (data) => request('/adminpanelcode/authors', { method: 'POST', body: JSON.stringify(data) }),
  updateAuthor: (id, data) =>
    request(`/adminpanelcode/authors/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteAuthor: (id) => request(`/adminpanelcode/authors/${id}`, { method: 'DELETE' }),
  getQuotes: (status) => request(`/adminpanelcode/quotes${status ? `?status=${status}` : ''}`),
  getQuoteFiles: (id) => request(`/adminpanelcode/quotes/${encodeURIComponent(id)}/files`),
  updateQuoteStatus: (id, status) =>
    request(`/adminpanelcode/quotes/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deleteQuote: (id) => request(`/adminpanelcode/quotes/${id}`, { method: 'DELETE' }),
  getStats: () => request('/adminpanelcode/stats'),
  getAllBooks: () => request('/adminpanelcode/books'),
  approveBook: (id) => request(`/adminpanelcode/books/${id}/approve`, { method: 'PATCH' }),
  rejectBook: (id) => request(`/adminpanelcode/books/${id}/reject`, { method: 'PATCH' }),
  deleteBook: (id) => request(`/adminpanelcode/books/${id}`, { method: 'DELETE' }),
  createAdminBook: (data) =>
    request('/adminpanelcode/books', { method: 'POST', body: JSON.stringify(data) }),
  createAdminBookForm: (formData) => requestForm('/adminpanelcode/books', formData),
  updateAdminBook: (id, data) =>
    request(`/adminpanelcode/books/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  updateAdminBookForm: (id, formData) =>
    requestForm(`/adminpanelcode/books/${id}`, formData, { method: 'PATCH' }),

  // Admin — leads & newsletter
  getLeads: (type) => request(`/adminpanelcode/leads${type ? `?type=${type}` : ''}`),
  deleteLead: (id) => request(`/adminpanelcode/leads/${id}`, { method: 'DELETE' }),
  getNewsletter: () => request('/adminpanelcode/newsletter'),
  deleteSubscriber: (id) => request(`/adminpanelcode/newsletter/${id}`, { method: 'DELETE' }),

  // Admin — reviews
  getReviews: (status) => request(`/adminpanelcode/reviews${status ? `?status=${status}` : ''}`),
  updateReviewStatus: (id, status) =>
    request(`/adminpanelcode/reviews/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deleteReview: (id) => request(`/adminpanelcode/reviews/${id}`, { method: 'DELETE' }),

  // Admin — orders
  getOrders: (status) => request(`/adminpanelcode/orders${status ? `?status=${status}` : ''}`),
  updateOrderStatus: (id, status) =>
    request(`/adminpanelcode/orders/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // Admin — author applications
  getAuthorApplications: (status) =>
    request(`/adminpanelcode/author-applications${status ? `?status=${status}` : ''}`),
  decideAuthorApplication: (id, status) =>
    request(`/adminpanelcode/author-applications/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
};

export { getToken, setToken };
