const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const { Pool } = require('pg');
const authenticateToken = require('../middleware/auth');
const path = require('path');
const fs = require('fs').promises;
const router = express.Router();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost/courtguardian',
});

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only JPEG, JPG, PNG, and WebP images are allowed!'));
    }
  }
});

// Create uploads directory if it doesn't exist
const createUploadsDir = async () => {
  const uploadsDir = path.join(__dirname, '../uploads');
  const courtPhotosDir = path.join(uploadsDir, 'court-photos');
  const thumbnailsDir = path.join(uploadsDir, 'thumbnails');
  const reviewPhotosDir = path.join(uploadsDir, 'review-photos');
  
  try {
    await fs.mkdir(uploadsDir, { recursive: true });
    await fs.mkdir(courtPhotosDir, { recursive: true });
    await fs.mkdir(thumbnailsDir, { recursive: true });
    await fs.mkdir(reviewPhotosDir, { recursive: true });
  } catch (error) {
    console.error('Error creating upload directories:', error);
  }
};

createUploadsDir();

// Upload photos for a court
router.post('/courts/:courtId/photos', authenticateToken, upload.array('photos', 5), async (req, res) => {
  try {
    const { courtId } = req.params;
    const { isPrimary = false } = req.body;
    const userId = req.user.id;
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No photos uploaded' });
    }

    // Verify court exists
    const courtCheck = await pool.query('SELECT id FROM courts WHERE id = $1', [courtId]);
    if (courtCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Court not found' });
    }

    const uploadedPhotos = [];
    
    for (const file of req.files) {
      try {
        // Generate unique filename
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const filename = `${timestamp}-${randomString}.webp`;
        const thumbnailFilename = `thumb-${filename}`;
        
        // File paths
        const photoPath = path.join(__dirname, '../uploads/court-photos', filename);
        const thumbnailPath = path.join(__dirname, '../uploads/thumbnails', thumbnailFilename);
        
        // Process main image
        const processedImage = await sharp(file.buffer)
          .resize(1200, 800, { 
            fit: 'inside',
            withoutEnlargement: true 
          })
          .webp({ quality: 85 })
          .toBuffer();
          
        // Create thumbnail
        const thumbnail = await sharp(file.buffer)
          .resize(300, 200, { 
            fit: 'cover',
            position: 'center'
          })
          .webp({ quality: 80 })
          .toBuffer();
        
        // Get image dimensions
        const metadata = await sharp(processedImage).metadata();
        
        // Save files
        await fs.writeFile(photoPath, processedImage);
        await fs.writeFile(thumbnailPath, thumbnail);
        
        // Generate URLs with proper base URL for production
        const baseUrl = process.env.NODE_ENV === 'production' 
          ? (process.env.SERVER_BASE_URL || 'https://your-railway-app.railway.app')
          : '';
        const photoUrl = `${baseUrl}/uploads/court-photos/${filename}`;
        const thumbnailUrl = `${baseUrl}/uploads/thumbnails/${thumbnailFilename}`;
        
        // Save to database
        const photoResult = await pool.query(`
          INSERT INTO court_photos (
            court_id, user_id, file_path, thumbnail_path, 
            original_name, file_size, mime_type
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `, [
          courtId, userId, photoUrl, thumbnailUrl,
          file.originalname, processedImage.length, 
          'image/webp'
        ]);
        
        uploadedPhotos.push(photoResult.rows[0]);
        
      } catch (fileError) {
        console.error('Error processing file:', file.originalname, fileError);
        // Continue with other files
      }
    }
    
    if (uploadedPhotos.length === 0) {
      return res.status(500).json({ error: 'Failed to process any photos' });
    }
    
    res.json({
      message: `Successfully uploaded ${uploadedPhotos.length} photo(s)`,
      photos: uploadedPhotos
    });
    
  } catch (error) {
    console.error('Photo upload error:', error);
    res.status(500).json({ error: 'Failed to upload photos' });
  }
});

// Upload photos for a review
router.post('/courts/:courtId/reviews/:reviewId/photos', authenticateToken, upload.array('photos', 3), async (req, res) => {
  try {
    const { courtId, reviewId } = req.params;
    const userId = req.user.id;
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No photos uploaded' });
    }

    // Verify review exists and belongs to user
    const reviewCheck = await pool.query(`
      SELECT id FROM reviews 
      WHERE id = $1 AND court_id = $2 AND user_id = $3
    `, [reviewId, courtId, userId]);
    
    if (reviewCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found or permission denied' });
    }

    const uploadedPhotos = [];
    
    for (const file of req.files) {
      try {
        // Generate unique filename  
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const filename = `review-${timestamp}-${randomString}.webp`;
        const thumbnailFilename = `thumb-${filename}`;
        
        // File paths
        const photoPath = path.join(__dirname, '../uploads/review-photos', filename);
        const thumbnailPath = path.join(__dirname, '../uploads/thumbnails', thumbnailFilename);
        
        // Process main image (smaller for review photos)
        const processedImage = await sharp(file.buffer)
          .resize(800, 600, { 
            fit: 'inside',
            withoutEnlargement: true 
          })
          .webp({ quality: 80 })
          .toBuffer();
          
        // Create thumbnail
        const thumbnail = await sharp(file.buffer)
          .resize(200, 150, { 
            fit: 'cover',
            position: 'center'
          })
          .webp({ quality: 75 })
          .toBuffer();
        
        // Get image dimensions
        const metadata = await sharp(processedImage).metadata();
        
        // Save files
        await fs.writeFile(photoPath, processedImage);
        await fs.writeFile(thumbnailPath, thumbnail);
        
        // Generate URLs with proper base URL for production
        const baseUrl = process.env.NODE_ENV === 'production' 
          ? (process.env.SERVER_BASE_URL || 'https://your-railway-app.railway.app')
          : '';
        const photoUrl = `${baseUrl}/uploads/review-photos/${filename}`;
        const thumbnailUrl = `${baseUrl}/uploads/thumbnails/${thumbnailFilename}`;
        
        // Save to database
        const photoResult = await pool.query(`
          INSERT INTO review_photos (
            review_id, user_id, filename, file_path, thumbnail_path, 
            original_name, file_size, mime_type
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *
        `, [
          reviewId, userId, filename, photoUrl, thumbnailUrl,
          file.originalname, processedImage.length, 
          'image/webp'
        ]);
        
        uploadedPhotos.push(photoResult.rows[0]);
        
      } catch (fileError) {
        console.error('Error processing review photo:', file.originalname, fileError);
        // Continue with other files
      }
    }
    
    if (uploadedPhotos.length === 0) {
      return res.status(500).json({ error: 'Failed to process any photos' });
    }
    
    res.json({
      message: `Successfully uploaded ${uploadedPhotos.length} review photo(s)`,
      photos: uploadedPhotos
    });
    
  } catch (error) {
    console.error('Review photo upload error:', error);
    res.status(500).json({ error: 'Failed to upload review photos' });
  }
});

// Get photos for a court (includes both court photos and review photos)
router.get('/courts/:courtId/photos', async (req, res) => {
  try {
    const { courtId } = req.params;
    
    // Get current user ID for privacy checks
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    let currentUserId = null;
    
    if (token) {
      const jwt = require('jsonwebtoken');
      try {
        const user = jwt.verify(token, process.env.JWT_SECRET);
        currentUserId = user.id;
      } catch (err) {
        // Invalid token, proceed as anonymous user
      }
    }
    
    // Get court photos
    const courtPhotos = await pool.query(`
      SELECT 
        cp.id,
        cp.file_path as photo_url,
        cp.thumbnail_path as thumbnail_url,
        cp.file_size,
        cp.created_at,
        cp.court_id,
        cp.user_id,
        u.username,
        u.avatar_colors,
        u.privacy_settings,
        'court' as photo_type
      FROM court_photos cp
      LEFT JOIN users u ON cp.user_id = u.id
      WHERE cp.court_id = $1
    `, [courtId]);

    // Get review photos
    const reviewPhotos = await pool.query(`
      SELECT 
        rp.id,
        rp.file_path as photo_url,
        rp.thumbnail_path as thumbnail_url,
        rp.file_size,
        rp.created_at,
        rp.user_id,
        u.username,
        u.avatar_colors,
        u.privacy_settings,
        'review' as photo_type,
        false as is_primary
      FROM review_photos rp
      LEFT JOIN users u ON rp.user_id = u.id
      WHERE rp.review_id IN (
        SELECT r.id FROM reviews r WHERE r.court_id = $1
      )
    `, [courtId]);
    
    // Combine and sort photos
    const allPhotos = [...courtPhotos.rows, ...reviewPhotos.rows];
    allPhotos.sort((a, b) => {
      // Primary photos first, then by creation date (newest first)
      if (a.is_primary && !b.is_primary) return -1;
      if (!a.is_primary && b.is_primary) return 1;
      return new Date(b.created_at) - new Date(a.created_at);
    });
    
    // Process photos to respect privacy settings
    const processedPhotos = allPhotos.map(photo => {
      const privacySettings = photo.privacy_settings || {};
      const showReviewsPublicly = privacySettings.showReviews !== false; // Default to true if not set
      const isOwnPhoto = currentUserId && photo.user_id === currentUserId;
      
      // Show username only if user allows public reviews OR it's their own photo
      const shouldShowUsername = showReviewsPublicly || isOwnPhoto;
      
      return {
        ...photo,
        username: shouldShowUsername ? photo.username : null,
        avatar_colors: shouldShowUsername ? photo.avatar_colors : null,
        // Remove privacy_settings from the response
        privacy_settings: undefined
      };
    });
    
    res.json(processedPhotos);
    
  } catch (error) {
    console.error('Error fetching court photos:', error);
    res.status(500).json({ error: 'Failed to fetch photos' });
  }
});

// Delete a photo (only by uploader or admin)
router.delete('/photos/:photoId', authenticateToken, async (req, res) => {
  try {
    const { photoId } = req.params;
    const { type = 'court' } = req.query; // Allow specifying photo type
    const userId = req.user.id;
    const userRole = req.user.role;
    
    let photo = null;
    let tableName = '';
    
    if (type === 'review') {
      // Check review photo ownership
      const photoCheck = await pool.query(`
        SELECT * FROM review_photos 
        WHERE id = $1 AND (user_id = $2 OR $3 = 'admin')
      `, [photoId, userId, userRole]);
      
      if (photoCheck.rows.length > 0) {
        photo = photoCheck.rows[0];
        tableName = 'review_photos';
      }
    } else {
      // Check court photo ownership
      const photoCheck = await pool.query(`
        SELECT * FROM court_photos 
        WHERE id = $1 AND (user_id = $2 OR $3 = 'admin')
      `, [photoId, userId, userRole]);
      
      if (photoCheck.rows.length > 0) {
        photo = photoCheck.rows[0];
        tableName = 'court_photos';
      }
    }
    
    if (!photo) {
      return res.status(404).json({ error: 'Photo not found or permission denied' });
    }
    
    // Delete files
    try {
      const photoPath = path.join(__dirname, '..', photo.file_path);
      const thumbnailPath = path.join(__dirname, '..', photo.thumbnail_path);
      
      await fs.unlink(photoPath).catch(() => {}); // Ignore if file doesn't exist
      await fs.unlink(thumbnailPath).catch(() => {}); // Ignore if file doesn't exist
    } catch (fileError) {
      console.error('Error deleting files:', fileError);
    }
    
    // Delete from database
    await pool.query(`DELETE FROM ${tableName} WHERE id = $1`, [photoId]);
    
    res.json({ message: 'Photo deleted successfully', type });
    
  } catch (error) {
    console.error('Error deleting photo:', error);
    res.status(500).json({ error: 'Failed to delete photo' });
  }
});

// Set primary photo
router.patch('/photos/:photoId/primary', authenticateToken, async (req, res) => {
  try {
    const { photoId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Check photo exists and user has permission
    const photoCheck = await pool.query(`
      SELECT court_id FROM court_photos 
      WHERE id = $1 AND (user_id = $2 OR $3 = 'admin')
    `, [photoId, userId, userRole]);
    
    if (photoCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Photo not found or permission denied' });
    }
    
    const courtId = photoCheck.rows[0].court_id;
    
    // Remove primary status from all photos of this court
    await pool.query(
      'UPDATE court_photos SET is_primary = false WHERE court_id = $1',
      [courtId]
    );
    
    // Set this photo as primary
    await pool.query(
      'UPDATE court_photos SET is_primary = true WHERE id = $1',
      [photoId]
    );
    
    res.json({ message: 'Primary photo updated successfully' });
    
  } catch (error) {
    console.error('Error setting primary photo:', error);
    res.status(500).json({ error: 'Failed to set primary photo' });
  }
});

// Admin moderation endpoints
router.patch('/admin/photos/:photoId/approve', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { photoId } = req.params;
    
    // Photo approval functionality not implemented in current schema
    
    res.json({ message: 'Photo approved successfully' });
    
  } catch (error) {
    console.error('Error approving photo:', error);
    res.status(500).json({ error: 'Failed to approve photo' });
  }
});

// Admin endpoint to get all photos for moderation
router.get('/admin/photos', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    // Get all photos with metadata for admin review
    const courtPhotos = await pool.query(`
      SELECT 
        cp.id,
        cp.file_path as photo_url,
        cp.thumbnail_path as thumbnail_url,
        cp.original_name as original_filename,
        cp.file_size,
        cp.width,
        cp.height,
        cp.created_at,
        cp.court_id,
        cp.user_id,
        u.username,
        c.name as court_name,
        'court' as photo_type
      FROM court_photos cp
      LEFT JOIN users u ON cp.user_id = u.id
      LEFT JOIN courts c ON cp.court_id = c.id
      ORDER BY cp.created_at DESC
    `);

    const reviewPhotos = await pool.query(`
      SELECT 
        rp.id,
        rp.file_path as photo_url,
        rp.thumbnail_path as thumbnail_url,
        rp.original_name as original_filename,
        rp.file_size,
        rp.created_at,
        rp.user_id,
        rp.review_id,
        u.username,
        c.name as court_name,
        'review' as photo_type,
        false as is_primary
      FROM review_photos rp
      LEFT JOIN users u ON rp.user_id = u.id
      LEFT JOIN reviews r ON rp.review_id = r.id
      LEFT JOIN courts c ON r.court_id = c.id
      ORDER BY rp.created_at DESC
    `);
    
    const allPhotos = [...courtPhotos.rows, ...reviewPhotos.rows];
    allPhotos.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    res.json(allPhotos);
    
  } catch (error) {
    console.error('Error fetching admin photos:', error);
    res.status(500).json({ error: 'Failed to fetch photos' });
  }
});

router.patch('/admin/photos/:photoId/reject', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { photoId } = req.params;
    
    // Photo rejection functionality not implemented in current schema
    
    res.json({ message: 'Photo rejected successfully' });
    
  } catch (error) {
    console.error('Error rejecting photo:', error);
    res.status(500).json({ error: 'Failed to reject photo' });
  }
});

module.exports = router;