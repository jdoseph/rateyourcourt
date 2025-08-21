const pool = require('../db');

// Get all saved courts for a user with court details and average ratings
async function getUserSavedCourts(userId) {
  const result = await pool.query(
    `SELECT 
       sc.id as saved_id,
       sc.created_at,
       c.id,
       c.name,
       c.address,
       c.sport_types,
       c.surface_type,
       c.court_count,
       c.lighting,
       COALESCE(ROUND(AVG(r.rating)::numeric, 1), 0) as average_rating,
       COUNT(r.id) as review_count
     FROM saved_courts sc
     JOIN courts c ON sc.court_id = c.id
     LEFT JOIN reviews r ON c.id = r.court_id
     WHERE sc.user_id = $1
     GROUP BY sc.id, sc.created_at, c.id, c.name, c.address, c.sport_types, c.surface_type, c.court_count, c.lighting
     ORDER BY sc.created_at DESC`,
    [userId]
  );
  return result.rows;
}

// Save a court for a user
async function saveCourtForUser(userId, courtId) {
  try {
    const result = await pool.query(
      `INSERT INTO saved_courts (user_id, court_id) 
       VALUES ($1, $2) 
       RETURNING id, created_at`,
      [userId, courtId]
    );
    return result.rows[0];
  } catch (error) {
    if (error.code === '23505') { // Unique constraint violation
      throw new Error('Court is already saved');
    }
    if (error.code === '23503') { // Foreign key constraint violation
      throw new Error('Court not found');
    }
    throw error;
  }
}

// Remove a saved court for a user
async function removeSavedCourt(userId, courtId) {
  const result = await pool.query(
    `DELETE FROM saved_courts 
     WHERE user_id = $1 AND court_id = $2 
     RETURNING id`,
    [userId, courtId]
  );
  return result.rows[0];
}

// Check if a court is saved by a user
async function isCourtSavedByUser(userId, courtId) {
  const result = await pool.query(
    `SELECT id FROM saved_courts 
     WHERE user_id = $1 AND court_id = $2`,
    [userId, courtId]
  );
  return result.rows.length > 0;
}

module.exports = {
  getUserSavedCourts,
  saveCourtForUser,
  removeSavedCourt,
  isCourtSavedByUser,
};