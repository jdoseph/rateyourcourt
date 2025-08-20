const pool = require('../db');

// Middleware to check if user is admin
const requireAdmin = async (req, res, next) => {
  try {
    // Check if user is authenticated first
    if (!req.user || !req.user.id) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Please log in to access this resource'
      });
    }

    // Get user details from database to check role
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT id, username, email, role FROM users WHERE id = $1',
        [req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ 
          error: 'User not found',
          message: 'Your account could not be verified'
        });
      }

      const user = result.rows[0];

      // Check if user has admin role
      if (user.role !== 'admin') {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          message: 'Admin access required for this operation',
          userRole: user.role
        });
      }

      // Add full user info to request
      req.admin = user;
      next();

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Admin authentication error:', error);
    res.status(500).json({ 
      error: 'Authentication error',
      message: 'Unable to verify admin permissions'
    });
  }
};

// Middleware to check if user is admin OR moderator
const requireModerator = async (req, res, next) => {
  try {
    // Check if user is authenticated first
    if (!req.user || !req.user.id) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Please log in to access this resource'
      });
    }

    // Get user details from database to check role
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT id, username, email, role FROM users WHERE id = $1',
        [req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ 
          error: 'User not found',
          message: 'Your account could not be verified'
        });
      }

      const user = result.rows[0];

      // Check if user has admin or moderator role
      if (!['admin', 'moderator'].includes(user.role)) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          message: 'Moderator or admin access required for this operation',
          userRole: user.role
        });
      }

      // Add full user info to request
      req.moderator = user;
      next();

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Moderator authentication error:', error);
    res.status(500).json({ 
      error: 'Authentication error',
      message: 'Unable to verify moderator permissions'
    });
  }
};

module.exports = {
  requireAdmin,
  requireModerator
};