const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
console.log('DB connection string:', process.env.DATABASE_URL);
module.exports = pool;
