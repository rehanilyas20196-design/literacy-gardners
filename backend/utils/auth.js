const bcrypt = require('bcryptjs');
const { getDb } = require('../../database/connection');

function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

async function createUser({ name, email, password, role = 'user' }) {
  const existing = getDb()
    .prepare('SELECT id FROM users WHERE email = ?')
    .get(email);
  if (existing) {
    const err = new Error('Email already registered');
    err.status = 409;
    throw err;
  }

  const passwordHash = await hashPassword(password);
  const info = getDb()
    .prepare(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)'
    )
    .run(name, email, passwordHash, role);

  return {
    id: Number(info.lastInsertRowid),
    name,
    email,
    role,
  };
}

async function authenticateUser(login, password) {
  const user = getDb()
    .prepare('SELECT * FROM users WHERE email = ? OR name = ?')
    .get(login, login);
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
  };
}

function listUsers() {
  return getDb()
    .prepare('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC')
    .all();
}

function getUserById(id) {
  return getDb().prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?').get(id);
}

module.exports = { hashPassword, comparePassword, createUser, authenticateUser, listUsers, getUserById };
