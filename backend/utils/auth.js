const bcrypt = require('bcryptjs');
const {
  getUserByEmail,
  getUserByNameOrEmail,
  getUserById,
  createUser: insertUser,
  listUsers: queryUsers,
  isUniqueError,
} = require('../database/queries/users');

function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

async function createUser({ name, email, password, role = 'user' }) {
  const normalizedEmail = String(email).trim().toLowerCase();
  const existing = await getUserByEmail(normalizedEmail);
  if (existing) {
    const err = new Error('Email already registered');
    err.status = 409;
    throw err;
  }

  const passwordHash = await hashPassword(password);
  try {
    return await insertUser({
      name: String(name).trim(),
      email: normalizedEmail,
      passwordHash,
      role,
    });
  } catch (err) {
    if (isUniqueError(err)) {
      const conflict = new Error('Email already registered');
      conflict.status = 409;
      throw conflict;
    }
    throw err;
  }
}

async function authenticateUser(login, password) {
  const identifier = String(login).trim();
  let user = null;
  if (identifier.includes('@')) {
    user = await getUserByEmail(identifier.toLowerCase());
  }
  if (!user) {
    user = await getUserByNameOrEmail(identifier);
  }
  if (!user) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }

  const valid = await comparePassword(password, user.password_hash);
  if (!valid) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    token_version: user.token_version ?? 0,
  };
}

async function listUsers() {
  return queryUsers();
}

async function getUserPublic(id) {
  const user = await getUserById(id);
  if (!user) return null;
  const { id: uid, name, email, role, created_at } = user;
  return { id: uid, name, email, role, created_at };
}

module.exports = {
  hashPassword,
  comparePassword,
  createUser,
  authenticateUser,
  listUsers,
  getUserPublic,
  getUserById,
};
