const books = require('./queries/books');
const team = require('./queries/team');
const leads = require('./queries/leads');
const { getDb } = require('./connection');

module.exports = { ...books, ...team, ...leads, getDb };
