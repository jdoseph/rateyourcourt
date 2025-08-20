const express = require('express');
const { 
  findUserById, 
  updateUserAvatarColors, 
  updateUserPassword, 
  updateUserNotificationSettings, 
  updateUserPrivacySettings, 
  deleteUser 
} = require('../models/user');
const { 
  getUserReviews, 
  getReviewByIdAndUser, 
  updateReview, 
  deleteReview 
} = require('../models/review');
const { 
  getUserSavedCourts, 
  saveCourtForUser, 
  removeSavedCourt, 
  isCourtSavedByUser 
} = require('../models/savedCourt');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user avatar colors
router.put('/avatar-colors', authenticateToken, async (req, res) => {
  try {
    const { start, end } = req.body;
    
    // Validate color format (basic hex color validation)
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!start || !end || !hexColorRegex.test(start) || !hexColorRegex.test(end)) {
      return res.status(400).json({ error: 'Invalid color format. Please provide valid hex colors.' });
    }

    const avatarColors = { start, end };
    const updatedUser = await updateUserAvatarColors(req.user.id, avatarColors);
    
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ 
      message: 'Avatar colors updated successfully',
      user: updatedUser 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user password
router.put('/password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    const updatedUser = await updateUserPassword(req.user.id, currentPassword, newPassword);
    
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ 
      message: 'Password updated successfully',
      user: updatedUser 
    });
  } catch (err) {
    if (err.message === 'Current password is incorrect') {
      return res.status(400).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update notification settings
router.put('/notification-settings', authenticateToken, async (req, res) => {
  try {
    const settings = req.body;
    
    const updatedUser = await updateUserNotificationSettings(req.user.id, settings);
    
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ 
      message: 'Notification settings updated successfully',
      user: updatedUser 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update privacy settings
router.put('/privacy-settings', authenticateToken, async (req, res) => {
  try {
    const settings = req.body;
    
    const updatedUser = await updateUserPrivacySettings(req.user.id, settings);
    
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ 
      message: 'Privacy settings updated successfully',
      user: updatedUser 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete user account
router.delete('/account', authenticateToken, async (req, res) => {
  try {
    const deletedUser = await deleteUser(req.user.id);
    
    if (!deletedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ 
      message: 'Account deleted successfully' 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's reviews
router.get('/reviews', authenticateToken, async (req, res) => {
  try {
    const reviews = await getUserReviews(req.user.id);
    res.json({ reviews });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update a review
router.put('/reviews/:reviewId', authenticateToken, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const reviewId = parseInt(req.params.reviewId);
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }
    
    // First check if review exists and belongs to user
    const existingReview = await getReviewByIdAndUser(reviewId, req.user.id);
    if (!existingReview) {
      return res.status(404).json({ error: 'Review not found or not authorized' });
    }
    
    const updatedReview = await updateReview(reviewId, req.user.id, { rating, comment });
    
    if (!updatedReview) {
      return res.status(404).json({ error: 'Review not found or not authorized' });
    }
    
    res.json({ 
      message: 'Review updated successfully',
      review: updatedReview 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a review
router.delete('/reviews/:reviewId', authenticateToken, async (req, res) => {
  try {
    const reviewId = parseInt(req.params.reviewId);
    
    const deletedReview = await deleteReview(reviewId, req.user.id);
    
    if (!deletedReview) {
      return res.status(404).json({ error: 'Review not found or not authorized' });
    }
    
    res.json({ 
      message: 'Review deleted successfully' 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's saved courts
router.get('/saved-courts', authenticateToken, async (req, res) => {
  try {
    const savedCourts = await getUserSavedCourts(req.user.id);
    res.json({ savedCourts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Save a court
router.post('/saved-courts/:courtId', authenticateToken, async (req, res) => {
  try {
    const courtId = req.params.courtId;
    
    const savedCourt = await saveCourtForUser(req.user.id, courtId);
    
    res.status(201).json({ 
      message: 'Court saved successfully',
      savedCourt 
    });
  } catch (err) {
    if (err.message === 'Court is already saved') {
      return res.status(400).json({ error: err.message });
    }
    if (err.message === 'Court not found') {
      return res.status(404).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove a saved court
router.delete('/saved-courts/:courtId', authenticateToken, async (req, res) => {
  try {
    const courtId = req.params.courtId;
    
    const removedCourt = await removeSavedCourt(req.user.id, courtId);
    
    if (!removedCourt) {
      return res.status(404).json({ error: 'Saved court not found' });
    }
    
    res.json({ 
      message: 'Court removed from saved list successfully' 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Check if a court is saved by user
router.get('/saved-courts/:courtId/status', authenticateToken, async (req, res) => {
  try {
    const courtId = req.params.courtId;
    
    const isSaved = await isCourtSavedByUser(req.user.id, courtId);
    
    res.json({ isSaved });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;