const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/auth');
const { requireAdmin, requireModerator } = require('../middleware/adminAuth');

// Get verification data for a specific court
router.get('/court/:courtId', async (req, res) => {
  try {
    const { courtId } = req.params;
    
    // Get court data with verification info
    const courtQuery = `
      SELECT 
        id, name, address, sport_type, surface_type, court_count, 
        lighting, phone_number, website_url, opening_hours, 
        verification_status, verification_count, last_verified_at,
        google_rating, google_total_ratings
      FROM courts 
      WHERE id = $1
    `;
    
    const courtResult = await pool.query(courtQuery, [courtId]);
    
    if (courtResult.rows.length === 0) {
      return res.status(404).json({ error: 'Court not found' });
    }
    
    const court = courtResult.rows[0];
    
    // Get recent verifications for this court
    const verificationsQuery = `
      SELECT 
        cv.id, cv.field_name, cv.current_value as old_value, cv.proposed_value as new_value, 
        cv.status, cv.evidence as notes, cv.created_at,
        u.username as contributor_name
      FROM court_verifications cv
      LEFT JOIN users u ON cv.user_id = u.id
      WHERE cv.court_id = $1
      ORDER BY cv.created_at DESC
      LIMIT 10
    `;
    
    const verificationsResult = await pool.query(verificationsQuery, [courtId]);
    
    // Identify missing or questionable data fields
    const missingFields = [];
    const fieldChecks = [
      { field: 'surface_type', value: court.surface_type },
      { field: 'court_count', value: court.court_count },
      { field: 'lighting', value: court.lighting },
      { field: 'phone_number', value: court.phone_number },
      { field: 'website_url', value: court.website_url },
      { field: 'opening_hours', value: court.opening_hours }
    ];
    
    fieldChecks.forEach(({ field, value }) => {
      if (value === null || value === undefined || value === '' || value === '?') {
        missingFields.push(field);
      }
    });
    
    res.json({
      court,
      recentVerifications: verificationsResult.rows,
      missingFields,
      needsVerification: missingFields.length > 0 || court.verification_status === 'pending'
    });
    
  } catch (error) {
    console.error('Error fetching court verification data:', error);
    res.status(500).json({ error: 'Failed to fetch verification data' });
  }
});

// Submit a new verification/correction for a court field
router.post('/submit', authenticateToken, async (req, res) => {
  try {
    const {
      courtId,
      fieldName,
      oldValue,
      newValue,
      verificationType, // 'correction', 'confirmation', 'addition'
      notes
    } = req.body;
    
    // Validate required fields
    if (!courtId || !fieldName || !newValue || !verificationType) {
      return res.status(400).json({ 
        error: 'Missing required fields: courtId, fieldName, newValue, verificationType' 
      });
    }
    
    // Validate verification type
    const validTypes = ['correction', 'confirmation', 'addition'];
    if (!validTypes.includes(verificationType)) {
      return res.status(400).json({ 
        error: 'Invalid verification type. Must be: correction, confirmation, or addition' 
      });
    }
    
    // Validate field name
    const validFields = [
      'surface_type', 'court_count', 'lighting', 'phone_number', 
      'website_url', 'opening_hours', 'address', 'name'
    ];
    if (!validFields.includes(fieldName)) {
      return res.status(400).json({ 
        error: `Invalid field name. Valid fields: ${validFields.join(', ')}` 
      });
    }
    
    // Check if court exists
    const courtCheck = await pool.query('SELECT id FROM courts WHERE id = $1', [courtId]);
    if (courtCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Court not found' });
    }
    
    // Check for duplicate submissions (same user, same field, within last 24 hours)
    const duplicateCheck = await pool.query(`
      SELECT id FROM court_verifications 
      WHERE court_id = $1 AND user_id = $2 AND field_name = $3 
        AND created_at > NOW() - INTERVAL '24 hours'
        AND status = 'pending'
    `, [courtId, req.user.id, fieldName]);
    
    if (duplicateCheck.rows.length > 0) {
      return res.status(400).json({ 
        error: 'You have already submitted a verification for this field in the last 24 hours' 
      });
    }
    
    // Insert verification record
    const insertQuery = `
      INSERT INTO court_verifications 
      (court_id, user_id, field_name, current_value, proposed_value, evidence)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, created_at
    `;
    
    const result = await pool.query(insertQuery, [
      courtId, req.user.id, fieldName, oldValue, newValue, notes
    ]);
    
    res.status(201).json({
      message: 'Verification submitted successfully',
      verificationId: result.rows[0].id,
      submittedAt: result.rows[0].created_at
    });
    
  } catch (error) {
    console.error('Error submitting verification:', error);
    res.status(500).json({ error: 'Failed to submit verification' });
  }
});

// Get pending verifications for admin review
router.get('/admin/pending', authenticateToken, requireModerator, async (req, res) => {
  try {
    let result;
    try {
      const query = `
        SELECT 
          cv.id, cv.court_id, cv.field_name, cv.current_value as old_value, cv.proposed_value as new_value,
          cv.evidence as notes, cv.created_at,
          c.name as court_name, c.address as court_address,
          u.username as contributor_name, u.email as contributor_email
        FROM court_verifications cv
        JOIN courts c ON cv.court_id = c.id
        LEFT JOIN users u ON cv.user_id = u.id
        WHERE cv.status = 'pending'
        ORDER BY cv.created_at ASC
      `;
      result = await pool.query(query);
    } catch (error) {
      console.log('court_verifications table not found, returning empty results');
      result = { rows: [] };
    }
    
    res.json({
      pendingVerifications: result.rows,
      count: result.rows.length
    });
    
  } catch (error) {
    console.error('Error fetching pending verifications:', error);
    res.status(500).json({ error: 'Failed to fetch pending verifications' });
  }
});

// Approve or reject a verification (admin only)
router.patch('/admin/:verificationId', authenticateToken, requireModerator, async (req, res) => {
  try {
    const { verificationId } = req.params;
    const { action, adminNotes } = req.body; // action: 'approve' or 'reject'
    
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Action must be "approve" or "reject"' });
    }
    
    // Get verification details
    const verificationQuery = `
      SELECT cv.*, c.name as court_name
      FROM court_verifications cv
      JOIN courts c ON cv.court_id = c.id
      WHERE cv.id = $1 AND cv.status = 'pending'
    `;
    
    const verificationResult = await pool.query(verificationQuery, [verificationId]);
    
    if (verificationResult.rows.length === 0) {
      return res.status(404).json({ error: 'Verification not found or already processed' });
    }
    
    const verification = verificationResult.rows[0];
    
    // Start transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Update verification status
      const newStatus = action === 'approve' ? 'approved' : 'rejected';
      await client.query(`
        UPDATE court_verifications 
        SET status = $1, reviewed_at = CURRENT_TIMESTAMP, reviewed_by = $2, notes = COALESCE($3, notes)
        WHERE id = $4
      `, [newStatus, req.user.id, adminNotes, verificationId]);
      
      // If approved, update the court record
      if (action === 'approve') {
        let updateQuery;
        let updateValues;
        
        // Handle different field types
        if (verification.field_name === 'court_count') {
          updateQuery = `UPDATE courts SET ${verification.field_name} = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`;
          updateValues = [parseInt(verification.new_value), verification.court_id];
        } else if (verification.field_name === 'lighting') {
          updateQuery = `UPDATE courts SET ${verification.field_name} = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`;
          updateValues = [verification.new_value === 'true' || verification.new_value === true, verification.court_id];
        } else if (verification.field_name === 'opening_hours') {
          updateQuery = `UPDATE courts SET ${verification.field_name} = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`;
          updateValues = [JSON.parse(verification.new_value), verification.court_id];
        } else {
          updateQuery = `UPDATE courts SET ${verification.field_name} = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`;
          updateValues = [verification.new_value, verification.court_id];
        }
        
        await client.query(updateQuery, updateValues);
        
        // Update verification count and last verified date
        await client.query(`
          UPDATE courts 
          SET verification_count = verification_count + 1, 
              last_verified_at = CURRENT_TIMESTAMP,
              verification_status = 'verified'
          WHERE id = $1
        `, [verification.court_id]);
      }
      
      await client.query('COMMIT');
      
      res.json({
        message: `Verification ${action}d successfully`,
        courtName: verification.court_name,
        fieldName: verification.field_name,
        newValue: verification.new_value
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error processing verification:', error);
    res.status(500).json({ error: 'Failed to process verification' });
  }
});

// Get verification statistics
router.get('/stats', async (req, res) => {
  try {
    // Try to get verification stats, fallback to defaults if table doesn't exist
    let statsResult;
    try {
      const statsQuery = `
        SELECT 
          COUNT(*) as total_verifications,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
          COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
          COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count,
          COUNT(DISTINCT court_id) as courts_with_verifications,
          COUNT(DISTINCT user_id) as contributing_users
        FROM court_verifications
      `;
      statsResult = await pool.query(statsQuery);
    } catch (error) {
      console.log('court_verifications table not found, using defaults');
      statsResult = { rows: [{ 
        total_verifications: '0',
        pending_count: '0', 
        approved_count: '0',
        rejected_count: '0',
        courts_with_verifications: '0',
        contributing_users: '0'
      }] };
    }
    
    // Get courts needing verification (limit for performance)
    let needingVerificationResult;
    try {
      const courtsNeedingVerificationQuery = `
        SELECT COUNT(*) as courts_needing_verification
        FROM courts 
        WHERE surface_type IS NULL 
           OR court_count IS NULL 
           OR lighting IS NULL
        LIMIT 1000
      `;
      needingVerificationResult = await pool.query(courtsNeedingVerificationQuery);
    } catch (error) {
      console.log('Error querying courts, using defaults');
      needingVerificationResult = { rows: [{ courts_needing_verification: '0' }] };
    }
    
    res.json({
      ...statsResult.rows[0],
      courts_needing_verification: needingVerificationResult.rows[0].courts_needing_verification
    });
    
  } catch (error) {
    console.error('Error fetching verification stats:', error);
    res.status(500).json({ error: 'Failed to fetch verification statistics' });
  }
});

module.exports = router;