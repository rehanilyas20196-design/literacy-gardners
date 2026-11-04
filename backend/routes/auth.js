const { Router } = require('express');
const { createUser, authenticateUser, getUserById } = require('../utils/auth');
const { generateToken, authMiddleware } = require('../middleware/auth');
const { validateRegister, validateLogin } = require('../middleware/validate');

const router = Router();

router.post('/register', validateRegister, async (req, res) => {
  try {
    const user = await createUser(req.body);
    const token = generateToken({ id: user.id, email: user.email, role: user.role });
    return res.status(201).json({
      ok: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      token,
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    return res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', validateLogin, async (req, res) => {
  try {
    const user = await authenticateUser(req.body.email, req.body.password);
    const token = generateToken({ id: user.id, email: user.email, role: user.role });
    return res.json({
      ok: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      token,
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    return res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', authMiddleware, (req, res) => {
  const user = getUserById(Number(req.user.id));
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ ok: true, user });
});

module.exports = router;
