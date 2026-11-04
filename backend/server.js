const express = require('express');
const path = require('path');
const { seedIfEmpty } = require('../database/seed');

const { securityMiddleware } = require('./middleware/security');
const { authMiddleware, adminMiddleware, optionalAuthMiddleware } = require('./middleware/auth');

const booksRouter = require('./routes/books');
const teamRouter = require('./routes/team');
const leadsRouter = require('./routes/leads');
const authRouter = require('./routes/auth');
const quotesRouter = require('./routes/quotes');
const adminRouter = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 4000;

// Security middleware stack: CORS, helmet headers, rate limiting, body sanitization
securityMiddleware(app);

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'literacy-gardeners' }));

// Public routes (no auth required)
app.use('/api/auth', authRouter);
app.use('/api/books', booksRouter);
app.use('/api/team', teamRouter);
app.use('/api', leadsRouter);
app.use('/api', quotesRouter);
app.use('/api', adminRouter);

// Static file serving for uploaded manuscripts and book images
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Seed database on startup
seedIfEmpty();

// Global error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  if (err.status) {
    return res.status(err.status).json({ error: err.message });
  }
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
