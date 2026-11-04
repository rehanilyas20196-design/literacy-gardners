const { Router } = require('express');
const db = require('../../database');
const { validateLead, validateNewsletter, handleValidationErrors } = require('../middleware/validate');

const router = Router();

// Public: list competitions
router.get('/competitions', (req, res) => {
  const { status } = req.query;
  res.json(db.listCompetitions(status || null));
});

// Public: submit a lead (contact form)
router.post('/leads', validateLead, (req, res) => {
  const lead = req.body;
  const created = db.createLead(lead);
  res.status(201).json(created);
});

// Lead listing/deletion requires admin — see routes/admin.js
// (/api/adminpanelcode/leads)

// Public: subscribe to newsletter
router.post('/newsletter', validateNewsletter, (req, res) => {
  const { email } = req.body;
  const result = db.subscribeNewsletter(email);
  res.status(result.inserted ? 201 : 200).json({ ok: true, ...result });
});

module.exports = router;
