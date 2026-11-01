const { Router } = require('express');
const db = require('../../database');

const router = Router();

router.get('/competitions', (req, res) => {
  const { status } = req.query;
  res.json(db.listCompetitions(status || null));
});

router.post('/leads', (req, res) => {
  const lead = req.body || {};
  if (!lead.name || !lead.email) {
    return res.status(400).json({ error: 'name and email are required' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) {
    return res.status(400).json({ error: 'invalid email' });
  }
  res.status(201).json(db.createLead(lead));
});

router.get('/leads', (req, res) => {
  res.json(db.listLeads(req.query.type || null));
});

router.post('/newsletter', (req, res) => {
  const { email } = req.body || {};
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'valid email required' });
  }
  const result = db.subscribeNewsletter(email);
  res.status(result.inserted ? 201 : 200).json({ ok: true, ...result });
});

module.exports = router;
