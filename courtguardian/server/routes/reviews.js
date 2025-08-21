const express = require('express');
const pool = require('../db');
const authenticateToken = require('../middleware/auth');

const router = express.Router({ mergeParams: true }); // to access courtId from parent route

// Optional authentication middleware that doesn't fail if no token is provided
const optionalAuthenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    req.user = null;
    return next();
  }
  
  const jwt = require('jsonwebtoken');
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      req.user = null;
    } else {
      req.user = user;
    }
    next();
  });
};

// GET reviews for a court
router.get('/', optionalAuthenticateToken, async (req, res) => {
  const courtId = req.params.courtId;
  const currentUserId = req.user ? req.user.id : null;

  try {
    // Get reviews
    const reviewResult = await pool.query(
      `SELECT r.id, r.rating, r.comment, r.created_at, r.user_id,
              u.username, u.avatar_colors, u.privacy_settings
       FROM reviews r JOIN users u ON r.user_id = u.id
       WHERE court_id = $1 ORDER BY r.created_at DESC`,
      [courtId]
    );

    // Get review photos for all reviews
    const reviewIds = reviewResult.rows.map(review => review.id);
    let reviewPhotos = [];
    
    if (reviewIds.length > 0) {
      const photosResult = await pool.query(
        `SELECT rp.id, rp.review_id, rp.file_path as photo_url, rp.thumbnail_path as thumbnail_url, rp.created_at
         FROM review_photos rp
         WHERE rp.review_id = ANY($1)
         ORDER BY rp.created_at ASC`,
        [reviewIds]
      );
      reviewPhotos = photosResult.rows;
    }

    // Process results to respect privacy settings and include photos
    const processedReviews = reviewResult.rows.map(review => {
      const privacySettings = review.privacy_settings || {};
      // Use showReviews setting to determine if user wants their avatar visible in reviews
      const showReviewsPublicly = privacySettings.showReviews !== false; // Default to true if not set
      const isOwnReview = currentUserId && review.user_id === currentUserId;
      
      // Get photos for this review
      const photos = reviewPhotos.filter(photo => photo.review_id === review.id);
      
      return {
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        created_at: review.created_at,
        username: review.username,
        // Show avatar colors if user allows reviews to be shown publicly OR if it's their own review
        avatar_colors: (showReviewsPublicly || isOwnReview) ? review.avatar_colors : null,
        show_avatar: showReviewsPublicly || isOwnReview,
        is_own_review: isOwnReview,
        photos: photos
      };
    });

    res.json(processedReviews);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST review (protected)
router.post('/', authenticateToken, async (req, res) => {
  const courtId = req.params.courtId;
  const userId = req.user.id;
  const { rating, comment } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  }

const existingReview = await pool.query(
    `SELECT * FROM reviews WHERE court_id = $1 AND user_id = $2`,
    [courtId, userId]
  );
  
  if (existingReview.rows.length > 0) {
    return res.status(400).json({ error: 'You have already reviewed this court' });
  }

  try { 
    const result = await pool.query(
      `INSERT INTO reviews (court_id, user_id, rating, comment)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [courtId, userId, rating, comment]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT review (edit) - only by the review author
router.put('/:reviewId', authenticateToken, async (req, res) => {
  const courtId = req.params.courtId;
  const reviewId = req.params.reviewId;
  const userId = req.user.id;
  const { rating, comment } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  }

  try {
    // Check if review exists and belongs to user
    const existingReview = await pool.query(
      `SELECT * FROM reviews WHERE id = $1 AND court_id = $2 AND user_id = $3`,
      [reviewId, courtId, userId]
    );
    
    if (existingReview.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found or permission denied' });
    }

    // Update the review
    const result = await pool.query(
      `UPDATE reviews SET rating = $1, comment = $2
       WHERE id = $3 AND court_id = $4 AND user_id = $5 
       RETURNING *`,
      [rating, comment, reviewId, courtId, userId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE review - only by the review author or admin
router.delete('/:reviewId', authenticateToken, async (req, res) => {
  const courtId = req.params.courtId;
  const reviewId = req.params.reviewId;
  const userId = req.user.id;
  const userRole = req.user.role;

  try {
    // Check if review exists and user has permission
    const existingReview = await pool.query(
      `SELECT * FROM reviews WHERE id = $1 AND court_id = $2 AND (user_id = $3 OR $4 = 'admin')`,
      [reviewId, courtId, userId, userRole]
    );
    
    if (existingReview.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found or permission denied' });
    }

    // Delete associated review photos first (cascade should handle this, but let's be explicit)
    await pool.query(
      'DELETE FROM review_photos WHERE review_id = $1',
      [reviewId]
    );

    // Delete the review
    await pool.query(
      'DELETE FROM reviews WHERE id = $1',
      [reviewId]
    );

    res.json({ message: 'Review deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE individual review photo - only by the review author or admin
router.delete('/:reviewId/photos/:photoId', authenticateToken, async (req, res) => {
  const courtId = req.params.courtId;
  const reviewId = req.params.reviewId;
  const photoId = req.params.photoId;
  const userId = req.user.id;
  const userRole = req.user.role;

  try {
    // Check if review exists and user has permission
    const reviewCheck = await pool.query(
      `SELECT * FROM reviews WHERE id = $1 AND court_id = $2 AND (user_id = $3 OR $4 = 'admin')`,
      [reviewId, courtId, userId, userRole]
    );
    
    if (reviewCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found or permission denied' });
    }

    // Get photo info for file deletion
    const photoCheck = await pool.query(
      'SELECT * FROM review_photos WHERE id = $1 AND review_id = $2',
      [photoId, reviewId]
    );

    if (photoCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    const photo = photoCheck.rows[0];

    // Delete files from filesystem
    const fs = require('fs').promises;
    const path = require('path');
    
    try {
      const photoPath = path.join(__dirname, '..', photo.file_path);
      const thumbnailPath = path.join(__dirname, '..', photo.thumbnail_path);
      
      await fs.unlink(photoPath).catch(() => {}); // Ignore if file doesn't exist
      await fs.unlink(thumbnailPath).catch(() => {}); // Ignore if file doesn't exist
    } catch (fileError) {
      console.error('Error deleting files:', fileError);
    }

    // Delete from database
    await pool.query(
      'DELETE FROM review_photos WHERE id = $1',
      [photoId]
    );

    res.json({ message: 'Photo deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
