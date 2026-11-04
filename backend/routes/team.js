const { Router } = require('express');
const db = require('../../database');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { validateTeamMember } = require('../middleware/validate');

const router = Router();

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Public: list team members
router.get(
  '/',
  wrap(async (_req, res) => {
    res.json(await db.listTeam());
  })
);

// Public: list authors
router.get(
  '/authors',
  wrap(async (_req, res) => {
    res.json(await db.listAuthors());
  })
);

// Admin only: create team member
router.post(
  '/',
  authMiddleware,
  adminMiddleware,
  validateTeamMember,
  wrap(async (req, res) => {
    const m = req.body;
    const created = await db.createTeamMember(m);
    res.status(201).json(created);
  })
);

// Admin only: delete team member
router.delete(
  '/:id',
  authMiddleware,
  adminMiddleware,
  wrap(async (req, res) => {
    const result = await db.deleteTeamMember(req.params.id);
    res.json(result);
  })
);

module.exports = router;
