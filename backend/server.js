require('dotenv').config({ quiet: true });

const express = require('express');
const { securityMiddleware } = require('./middleware/security');

const booksRouter = require('./routes/books');
const teamRouter = require('./routes/team');
const leadsRouter = require('./routes/leads');
const authRouter = require('./routes/auth');
const quotesRouter = require('./routes/quotes');
const adminRouter = require('./routes/admin');
const uploadsRouter = require('./routes/uploads');
const ordersRouter = require('./routes/orders');

const app = express();
const PORT = process.env.PORT || 4000;

// Behind Vercel's proxy — required for express-rate-limit to see real IPs
if (process.env.VERCEL) {
  app.set('trust proxy', 1);
}

// Security middleware stack: CORS, helmet headers, rate limiting, body sanitization
securityMiddleware(app);

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'literacy-gardeners' }));

// Routes (scoped — unmatched paths fall through to the 404 handler)
app.use('/api/auth', authRouter);
app.use('/api/books', booksRouter);
app.use('/api/team', teamRouter);
app.use('/api', leadsRouter);
app.use('/api', quotesRouter);
app.use('/api/adminpanelcode', adminRouter);
app.use('/api/uploads', uploadsRouter);
app.use('/api/orders', ordersRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler (must be last)
app.use((err, _req, res, _next) => {
  if (err.name === 'MulterError') {
    const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({ error: err.message });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body too large' });
  }
  if (err.status) {
    return res.status(err.status).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// Vercel serverless functions export the app instead of listening
module.exports = app;

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`API running on http://localhost:${PORT}`);
  });
}
