const crypto = require('crypto');
const { Router } = require('express');
const { createUser, authenticateUser, getUserPublic, getUserById } = require('../utils/auth');
const { generateToken, authMiddleware, adminMiddleware } = require('../middleware/auth');
const {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateRegisterAuthor,
} = require('../middleware/validate');
const { bumpTokenVersion, updateUserPassword } = require('../../database/queries/users');
const { createResetToken, consumeResetToken } = require('../../database/queries/passwordResets');
const { createAuthorApplication } = require('../../database/queries/authorProfiles');
const { sendPasswordReset } = require('../utils/email');

const router = Router();

function signToken(user) {
  return generateToken({ id: user.id, email: user.email, role: user.role, tv: user.token_version ?? 0 });
}

// Role is NEVER taken from the request body — whitelist at the call site.
router.post('/register', validateRegister, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const user = await createUser({ name, email, password, role: 'user' });
    const token = signToken({ ...user, token_version: 0 });
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
    const token = signToken(user);
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

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await getUserPublic(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ ok: true, user });
  } catch {
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

// Invalidates every issued token for this user
router.post('/logout-all', authMiddleware, async (req, res) => {
  try {
    await bumpTokenVersion(req.user.id);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Author account registration — creates a regular user + pending payout profile.
// Role stays 'user' until an admin approves the application.
router.post('/register-author', validateRegisterAuthor, async (req, res) => {
  try {
    const { name, email, password, phone, account_title, account_number, iban } = req.body;
    const user = await createUser({ name, email, password, role: 'user' });
    await createAuthorApplication({
      userId: user.id,
      phone,
      account_title,
      account_number,
      iban: iban ?? null,
    });
    const token = signToken({ ...user, token_version: 0 });
    return res.status(201).json({
      ok: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      token,
      message: 'Application submitted — pending admin approval',
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    return res.status(500).json({ error: 'Author registration failed' });
  }
});

router.post('/forgot-password', validateForgotPassword, async (req, res) => {
  try {
    const { getUserByEmail } = require('../../database/queries/users');
    const user = await getUserByEmail(req.body.email);
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      await createResetToken({ userId: user.id, tokenHash });
      try {
        await sendPasswordReset(user.email, token);
      } catch (emailErr) {
        // Email delivery failure must not leak whether the email exists
        console.error('forgot-password email send failed:', emailErr.message);
      }
    }
    // Always the same response — never reveal whether the email exists
    return res.json({ ok: true, message: 'If that email is registered, a reset link was sent' });
  } catch (err) {
    console.error('forgot-password failed:', err);
    return res.status(500).json({ error: 'Failed to process request' });
  }
});

router.post('/reset-password', validateResetPassword, async (req, res) => {
  try {
    const { token, password } = req.body;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const reset = await consumeResetToken(tokenHash);
    if (!reset) {
      return res.status(400).json({ error: 'Reset link is invalid or expired' });
    }
    const { hashPassword } = require('../utils/auth');
    const passwordHash = await hashPassword(password);
    await updateUserPassword(reset.user_id, passwordHash);
    const user = await getUserById(reset.user_id);
    return res.json({
      ok: true,
      message: 'Password updated',
      user: user ? { id: user.id, name: user.name, email: user.email, role: user.role } : undefined,
    });
  } catch (err) {
    console.error('reset-password failed:', err);
    return res.status(500).json({ error: 'Failed to reset password' });
  }
});

module.exports = router;
