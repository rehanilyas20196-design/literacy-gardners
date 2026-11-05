// API entry point for Vercel serverless deployment.
// Re-exports the Express app from backend/server.js.
// Original req.url is preserved through the catch-all rewrite.
module.exports = require('../backend/server.js');
