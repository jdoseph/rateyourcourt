const pool = require('../db');

// Get all reviews by a user
async function getUserReviews(userId) {
  const result = await pool.query(
    `SELECT r.id, r.rating, r.comment, r.created_at, r.court_id,
            c.name as court_name, c.sport_types
     FROM reviews r 
     JOIN courts c ON r.court_id = c.id
     WHERE r.user_id = $1 
     ORDER BY r.created_at DESC`,
    [userId]
  );
  return result.rows;
}

// Get a specific review by ID and user ID (for authorization)
async function getReviewByIdAndUser(reviewId, userId) {
  const result = await pool.query(
    `SELECT r.id, r.rating, r.comment, r.created_at, r.court_id,
            c.name as court_name, c.sport_types
     FROM reviews r 
     JOIN courts c ON r.court_id = c.id
     WHERE r.id = $1 AND r.user_id = $2`,
    [reviewId, userId]
  );
  return result.rows[0];
}

// Update a review
async function updateReview(reviewId, userId, { rating, comment }) {
  const result = await pool.query(
    `UPDATE reviews 
     SET rating = $1, comment = $2 
     WHERE id = $3 AND user_id = $4 
     RETURNING id, rating, comment, created_at, court_id`,
    [rating, comment, reviewId, userId]
  );
  return result.rows[0];
}

// Delete a review
async function deleteReview(reviewId, userId) {
  const result = await pool.query(
    `DELETE FROM reviews 
     WHERE id = $1 AND user_id = $2 
     RETURNING id`,
    [reviewId, userId]
  );
  return result.rows[0];
}

module.exports = {
  getUserReviews,
  getReviewByIdAndUser,
  updateReview,
  deleteReview,
};