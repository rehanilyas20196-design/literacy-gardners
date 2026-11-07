// API entry point for Vercel serverless deployment (Root Directory = backend).
// Re-exports the Express app from server.js; the catch-all rewrite in
// vercel.json sends every request here with the original path intact.
module.exports = require('../server.js');
