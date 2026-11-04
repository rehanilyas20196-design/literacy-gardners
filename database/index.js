const books = require('./queries/books');
const team = require('./queries/team');
const leads = require('./queries/leads');
const quotes = require('./queries/quotes');
const { getDb } = require('./connection');

module.exports = { ...books, ...team, ...leads, ...quotes, getDb };
