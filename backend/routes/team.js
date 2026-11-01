const { Router } = require('express');
const db = require('../../database');

const router = Router();

router.get('/', (_req, res) => {
  res.json(db.listTeam());
});

router.get('/authors', (_req, res) => {
  res.json(db.listAuthors());
});

router.post('/', (req, res) => {
  const m = req.body || {};
  if (!m.name || !m.role || !m.initial) {
    return res.status(400).json({ error: 'name, role and initial are required' });
  }
  res.status(201).json(db.createTeamMember(m));
});

module.exports = router;
