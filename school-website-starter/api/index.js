const app = require('../backend/server.js');

// Vercel serverless handler — Express app handles all routing internally
module.exports = (req, res) => app(req, res);
