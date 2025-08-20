const { Pool } = require('pg');
const { supabase } = require('./supabase');

// Database configuration that works with both local PostgreSQL and Supabase
let pool;

if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  // Production: Use Supabase connection
  const supabaseDbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
  pool = new Pool({
    connectionString: supabaseDbUrl,
    ssl: {
      rejectUnauthorized: false
    }
  });
  console.log('🚀 Connected to Supabase PostgreSQL database');
} else {
  // Development: Use local PostgreSQL
  pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  console.log('🔧 Connected to local PostgreSQL database');
}

// Database query wrapper that provides consistent interface
const db = {
  query: async (text, params) => {
    const client = await pool.connect();
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
    }
  },
  
  // Supabase-specific methods for when we need real-time features
  supabase: supabase,
  
  // Connection pool for direct access
  pool: pool
};

module.exports = db;