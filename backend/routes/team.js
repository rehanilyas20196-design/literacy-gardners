const { Router } = require('express');
const db = require('../../database');
const { authMiddleware } = require('../middleware/auth');
const {
  validateTeamMember,
  validateBook,
  validateLead,
  validateNewsletter,
  handleValidationErrors,
} = require('../middleware/validate');

const router = Router();

// Public: list team members
router.get('/', (_req, res) => {
  res.json(db.listTeam());
});

// Public: list authors
router.get('/authors', (_req, res) => {
  res.json(db.listAuthors());
});

// Protected: create team member (admin only)
router.post('/', authMiddleware, validateTeamMember, (req, res) => {
  const m = req.body;
  const created = db.createTeamMember(m);
  res.status(201).json(created);
});

module.exports = router;
