const BASE = '/api';

async function request(path, options) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
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
  subscribe: (email) => request('/newsletter', { method: 'POST', body: JSON.stringify({ email }) })
};
