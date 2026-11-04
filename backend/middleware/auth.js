const jwt = require('jsonwebtoken');
const { getUserById } = require('../../database/queries/users');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
}

async function loadRequestUser(token) {
  const decoded = verifyToken(token);
  const user = await getUserById(decoded.id);
  if (!user) {
    const err = new Error('Invalid token');
    err.code = 'NO_USER';
    throw err;
  }
  if ((decoded.tv ?? null) !== (user.token_version ?? 0)) {
    const err = new Error('Token invalidated');
    err.code = 'STALE_TOKEN';
    throw err;
  }
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token required' });
  }

  const token = authHeader.slice(7);

  try {
    req.user = await loadRequestUser(token);
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    if (err.name === 'JsonWebTokenError' || err.code === 'NO_USER' || err.code === 'STALE_TOKEN') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    return res.status(500).json({ error: 'Authentication error' });
  }
}

function adminMiddleware(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

function authorMiddleware(req, res, next) {
  if (!req.user || (req.user.role !== 'author' && req.user.role !== 'admin')) {
    return res.status(403).json({ error: 'Author access required' });
  }
  next();
}

async function optionalAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  try {
    req.user = await loadRequestUser(authHeader.slice(7));
  } catch {
    // ignore — continue without user
  }
  next();
}

module.exports = {
  authMiddleware,
  adminMiddleware,
  authorMiddleware,
  optionalAuthMiddleware,
  generateToken,
  verifyToken,
  JWT_SECRET,
};
