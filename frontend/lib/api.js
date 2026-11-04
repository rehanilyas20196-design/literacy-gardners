const BASE = '/api';
const TOKEN_KEY = 'lg_auth_token';

function getToken() {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  if (typeof localStorage === 'undefined') return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
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
    setToken(null);
    throw new Error('Session expired — please log in again.');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
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
    setToken(null);
    throw new Error('Session expired — please log in again.');
  }

  if (!res.ok) {
    const b = await res.json().catch(() => ({}));
    throw new Error(b.error || `Request failed: ${res.status}`);
  }
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
  getBestSellers: (limit = 4) => request(`/books/best-sellers?limit=${limit}`),
  getCategories: () => request('/books/categories'),
  getTeam: () => request('/team'),
  getCompetitions: () => request('/competitions'),
  submitLead: (lead) => request('/leads', { method: 'POST', body: JSON.stringify(lead) }),
  subscribe: (email) => request('/newsletter', { method: 'POST', body: JSON.stringify({ email }) }),

  // Auth
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => {
    return request('/auth/login', { method: 'POST', body: JSON.stringify(data) }).then((result) => {
      if (result.token) setToken(result.token);
      return result;
    });
  },
  logout: () => {
    setToken(null);
  },
  getMe: () => request('/auth/me'),

  // Admin
  getUsers: () => request('/adminpanelcode/users'),
  deleteUser: (id) => request(`/adminpanelcode/users/${id}`, { method: 'DELETE' }),
  updateUserRole: (id, role) =>
    request(`/adminpanelcode/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  getAuthors: () => request('/adminpanelcode/authors'),
  createAuthor: (data) => request('/adminpanelcode/authors', { method: 'POST', body: JSON.stringify(data) }),
  updateAuthor: (id, data) =>
    request(`/adminpanelcode/authors/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteAuthor: (id) => request(`/adminpanelcode/authors/${id}`, { method: 'DELETE' }),
  getQuotes: (status) => request(`/adminpanelcode/quotes${status ? `?status=${status}` : ''}`),
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
  createAdminBookForm: (formData) =>
    requestForm('/adminpanelcode/books', formData),
  updateAdminBook: (id, data) =>
    request(`/adminpanelcode/books/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  updateAdminBookForm: (id, formData) =>
    requestForm(`/adminpanelcode/books/${id}`, formData, { method: 'PATCH' }),

  // Admin — leads & newsletter
  getLeads: (type) => request(`/adminpanelcode/leads${type ? `?type=${type}` : ''}`),
  deleteLead: (id) => request(`/adminpanelcode/leads/${id}`, { method: 'DELETE' }),
  getNewsletter: () => request('/adminpanelcode/newsletter'),
  deleteSubscriber: (id) => request(`/adminpanelcode/newsletter/${id}`, { method: 'DELETE' }),

  // User book submission
  submitBook: (formData) => requestForm('/books/submit', formData),
};

export { getToken, setToken };
