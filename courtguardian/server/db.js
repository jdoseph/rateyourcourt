// Legacy db.js - now uses the new database abstraction layer
const db = require('./config/database');

// Export the pool for backward compatibility with existing code
module.exports = db.pool;
