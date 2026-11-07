const { Router } = require('express');
const db = require('../database');
const { validateLead, validateNewsletter } = require('../middleware/validate');

const router = Router();

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Public: list competitions
router.get(
  '/competitions',
  wrap(async (req, res) => {
    const { status } = req.query;
    res.json(await db.listCompetitions(status || null));
  })
);

// Public: submit a lead (contact form)
router.post(
  '/leads',
  validateLead,
  wrap(async (req, res) => {
    const lead = req.body;
    const created = await db.createLead(lead);
    res.status(201).json(created);
  })
);

// Lead listing/deletion requires admin — see routes/admin.js
// (/api/adminpanelcode/leads)

// Public: subscribe to newsletter
router.post(
  '/newsletter',
  validateNewsletter,
  wrap(async (req, res) => {
    const { email } = req.body;
    const result = await db.subscribeNewsletter(email);
    res.status(result.inserted ? 201 : 200).json({ ok: true, ...result });
  })
);

module.exports = router;
