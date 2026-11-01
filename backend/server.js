const express = require('express');
const cors = require('cors');
const { seedIfEmpty } = require('../database/seed');

const booksRouter = require('./routes/books');
const teamRouter = require('./routes/team');
const leadsRouter = require('./routes/leads');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

seedIfEmpty();

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'literacy-gardeners' }));
app.use('/api/books', booksRouter);
app.use('/api/team', teamRouter);
app.use('/api', leadsRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
