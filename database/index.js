const books = require('./queries/books');
const team = require('./queries/team');
const leads = require('./queries/leads');
const quotes = require('./queries/quotes');
const reviews = require('./queries/reviews');
const orders = require('./queries/orders');
const authorProfiles = require('./queries/authorProfiles');
const passwordResets = require('./queries/passwordResets');
const users = require('./queries/users');
const { getDb } = require('./connection');

module.exports = {
  ...books,
  ...team,
  ...leads,
  ...quotes,
  ...reviews,
  ...orders,
  ...authorProfiles,
  ...passwordResets,
  ...users,
  getDb,
};
