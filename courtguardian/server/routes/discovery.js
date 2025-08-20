const express = require('express');
const { Pool } = require('pg');
const googlePlacesService = require('../services/googlePlacesService');
const { ALLOWED_SPORTS } = require('../constants');
const authenticateToken = require('../middleware/auth');
const { requireAdmin, requireModerator } = require('../middleware/adminAuth');

const router = express.Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Geocode an address to coordinates
router.post('/geocode', async (req, res) => {
  const { address } = req.body;

  if (!address || !address.trim()) {
    return res.status(400).json({ error: 'Address is required' });
  }

  try {
    const result = await googlePlacesService.geocodeAddress(address.trim());
    res.json(result);
  } catch (error) {
    console.error('Geocoding error:', error);
    res.status(500).json({ 
      error: 'Failed to geocode address',
      message: error.message 
    });
  }
});

// Reverse geocode coordinates to address
router.post('/reverse-geocode', async (req, res) => {
  const { latitude, longitude } = req.body;

  if (!latitude || !longitude) {
    return res.status(400).json({ error: 'Latitude and longitude are required' });
  }

  if (isNaN(parseFloat(latitude)) || isNaN(parseFloat(longitude))) {
    return res.status(400).json({ error: 'Invalid coordinates provided' });
  }

  try {
    const result = await googlePlacesService.reverseGeocode(parseFloat(latitude), parseFloat(longitude));
    res.json(result);
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    res.status(500).json({ 
      error: 'Failed to reverse geocode coordinates',
      message: error.message 
    });
  }
});

// Admin-only: Discover courts in an area and save to database
router.post('/admin/discover', authenticateToken, requireAdmin, async (req, res) => {
  const { latitude, longitude, radius = 5000, sportType } = req.body;

  // Validation
  if (!latitude || !longitude) {
    return res.status(400).json({ error: 'Latitude and longitude are required' });
  }

  if (!sportType || !ALLOWED_SPORTS.includes(sportType)) {
    return res.status(400).json({ error: 'Valid sport type is required' });
  }

  if (radius > 50000) { // Limit to 50km
    return res.status(400).json({ error: 'Radius cannot exceed 50km' });
  }

  try {
    // Check if we've already searched this area recently
    const existingSearch = await checkExistingSearch(latitude, longitude, radius, sportType);
    if (existingSearch && existingSearch.last_searched_at > new Date(Date.now() - 24 * 60 * 60 * 1000)) {
      // Return existing courts if searched within last 24 hours
      const existingCourts = await getExistingCourts(latitude, longitude, radius, sportType);
      return res.json({
        courts: existingCourts,
        fromCache: true,
        searchArea: existingSearch
      });
    }

    // Record the search area
    await recordSearchArea(latitude, longitude, radius, sportType);

    // Search for courts using Google Places
    console.log(`🔍 Starting Google Places search for ${sportType} courts at ${latitude}, ${longitude} within ${radius}m`);
    const discoveredCourts = await googlePlacesService.searchCourts(latitude, longitude, radius, sportType);
    console.log(`📊 Google Places returned ${discoveredCourts.length} courts`);

    // Process and save discovered courts
    const savedCourts = [];
    let newCourts = 0;
    let duplicates = 0;

    console.log(`💾 Processing ${discoveredCourts.length} discovered courts for database saving...`);
    for (const [index, courtData] of discoveredCourts.entries()) {
      try {
        console.log(`📝 Saving court ${index + 1}/${discoveredCourts.length}: ${courtData.name}`);
        const savedCourt = await saveDiscoveredCourt(courtData, req.user.id);
        if (savedCourt.isNew) {
          newCourts++;
          console.log(`✅ Saved new court: ${courtData.name}`);
        } else {
          duplicates++;
          console.log(`🔄 Found existing court: ${courtData.name}`);
        }
        savedCourts.push(savedCourt.court);
      } catch (error) {
        console.error(`❌ Error saving court ${courtData.name}:`, error);
        continue;
      }
    }
    console.log(`🏁 Database processing complete: ${savedCourts.length} courts saved (${newCourts} new, ${duplicates} duplicates)`);

    // Update search area status
    await updateSearchArea(latitude, longitude, radius, sportType, savedCourts.length);

    res.json({
      courts: savedCourts,
      stats: {
        total: savedCourts.length,
        new: newCourts,
        duplicates,
        searchRadius: radius
      },
      fromCache: false
    });

  } catch (error) {
    console.error('Court discovery error:', error);
    console.error('Error stack:', error.stack);
    
    // Update search area status to failed
    try {
      await updateSearchArea(latitude, longitude, radius, sportType, 0);
    } catch (updateError) {
      console.error('Failed to update search area:', updateError);
    }
    
    // Return more specific error messages
    let errorMessage = 'Failed to discover courts';
    if (error.message.includes('API key')) {
      errorMessage = 'Google Places API configuration error';
    } else if (error.message.includes('quota')) {
      errorMessage = 'API quota exceeded. Please try again later';
    } else if (error.message.includes('network')) {
      errorMessage = 'Network error. Please check your connection';
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        stack: error.stack
      } : undefined 
    });
  }
});

// Get courts in an area (existing + discovered)
router.get('/courts', async (req, res) => {
  const { latitude, longitude, radius = 5000, sportType } = req.query;

  if (!latitude || !longitude) {
    return res.status(400).json({ error: 'Latitude and longitude are required' });
  }

  try {
    const courts = await getExistingCourts(parseFloat(latitude), parseFloat(longitude), parseInt(radius), sportType);
    res.json({ courts });
  } catch (error) {
    console.error('Error fetching courts:', error);
    res.status(500).json({ error: 'Failed to fetch courts' });
  }
});

// Get discovery statistics for an area
router.get('/stats', async (req, res) => {
  const { latitude, longitude, radius = 5000 } = req.query;

  if (!latitude || !longitude) {
    return res.status(400).json({ error: 'Latitude and longitude are required' });
  }

  try {
    const stats = await getDiscoveryStats(parseFloat(latitude), parseFloat(longitude), parseInt(radius));
    res.json(stats);
  } catch (error) {
    console.error('Error fetching discovery stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Helper functions

async function checkExistingSearch(latitude, longitude, radius, sportType) {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT * FROM discovery_areas 
      WHERE latitude = $1 
      AND longitude = $2 
      AND radius = $3 
      AND sport_type = $4
      ORDER BY last_discovered DESC 
      LIMIT 1
    `, [latitude, longitude, radius, sportType]);
    
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

async function getExistingCourts(latitude, longitude, radius, sportType) {
  const client = await pool.connect();
  try {
    let query = `
      SELECT *, 
        (6371000 * acos(cos(radians($1)) * cos(radians(latitude)) * 
        cos(radians(longitude) - radians($2)) + sin(radians($1)) * 
        sin(radians(latitude)))) AS distance
      FROM courts 
      WHERE latitude IS NOT NULL 
      AND longitude IS NOT NULL
      AND verification_status != 'rejected'
      AND (6371000 * acos(cos(radians($1)) * cos(radians(latitude)) * 
          cos(radians(longitude) - radians($2)) + sin(radians($1)) * 
          sin(radians(latitude)))) <= $3
    `;
    
    const params = [latitude, longitude, radius];
    
    if (sportType && ALLOWED_SPORTS.includes(sportType)) {
      query += ' AND sport_type = $4';
      params.push(sportType);
    }
    
    query += ' ORDER BY distance';
    
    const result = await client.query(query, params);
    return result.rows;
  } finally {
    client.release();
  }
}

async function recordSearchArea(latitude, longitude, radius, sportType) {
  const client = await pool.connect();
  try {
    await client.query(`
      INSERT INTO discovery_areas (latitude, longitude, radius, sport_type, last_discovered)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      ON CONFLICT (latitude, longitude, radius, sport_type)
      DO UPDATE SET last_discovered = CURRENT_TIMESTAMP
    `, [latitude, longitude, radius, sportType]);
  } finally {
    client.release();
  }
}

async function updateSearchArea(latitude, longitude, radius, sportType, courtsFound) {
  const client = await pool.connect();
  try {
    await client.query(`
      UPDATE discovery_areas 
      SET total_found = $5, last_discovered = CURRENT_TIMESTAMP
      WHERE latitude = $1 AND longitude = $2 AND radius = $3 AND sport_type = $4
    `, [latitude, longitude, radius, sportType, courtsFound]);
  } finally {
    client.release();
  }
}

async function saveDiscoveredCourt(courtData, createdBy) {
  const client = await pool.connect();
  try {
    // Check if court already exists by Google Place ID
    if (courtData.google_place_id) {
      const existing = await client.query(
        'SELECT id FROM courts WHERE google_place_id = $1',
        [courtData.google_place_id]
      );
      
      if (existing.rows.length > 0) {
        // Update existing court with new information
        const result = await client.query(`
          UPDATE courts SET
            google_rating = COALESCE($2, google_rating),
            google_total_ratings = COALESCE($3, google_total_ratings),
            phone_number = COALESCE($4, phone_number),
            website_url = COALESCE($5, website_url),
            opening_hours = COALESCE($6, opening_hours),
            price_level = COALESCE($7, price_level),
            photos = COALESCE($8, photos),
            updated_at = CURRENT_TIMESTAMP
          WHERE google_place_id = $1
          RETURNING *
        `, [
          courtData.google_place_id,
          courtData.google_rating,
          courtData.google_total_ratings,
          courtData.phone_number,
          courtData.website_url,
          JSON.stringify(courtData.opening_hours),
          courtData.price_level,
          JSON.stringify(courtData.photos)
        ]);
        
        return { court: result.rows[0], isNew: false };
      }
    }

    // Check for potential duplicates by name and location
    const duplicateCheck = await client.query(`
      SELECT id FROM courts 
      WHERE LOWER(name) = LOWER($1) 
      AND latitude IS NOT NULL 
      AND longitude IS NOT NULL
      AND (6371000 * acos(cos(radians($2)) * cos(radians(latitude)) * 
          cos(radians(longitude) - radians($3)) + sin(radians($2)) * 
          sin(radians(latitude)))) <= 100
    `, [courtData.name, courtData.latitude, courtData.longitude]);

    if (duplicateCheck.rows.length > 0) {
      return { court: duplicateCheck.rows[0], isNew: false };
    }

    // Insert new court
    const result = await client.query(`
      INSERT INTO courts (
        name, sport_type, address, surface_type, lighting, court_count,
        lat, lng, latitude, longitude, google_place_id, google_rating, google_total_ratings,
        phone_number, website_url, opening_hours, price_level, photos,
        verification_status, discovery_source, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      courtData.name,
      courtData.sport_type,
      courtData.address,
      courtData.surface_type,
      courtData.lighting,
      courtData.court_count,
      courtData.latitude, // for lat column
      courtData.longitude, // for lng column  
      courtData.latitude, // for latitude column
      courtData.longitude, // for longitude column
      courtData.google_place_id,
      courtData.google_rating,
      courtData.google_total_ratings,
      courtData.phone_number,
      courtData.website_url,
      JSON.stringify(courtData.opening_hours),
      courtData.price_level,
      JSON.stringify(courtData.photos),
      courtData.verification_status,
      courtData.discovery_source,
      createdBy
    ]);

    return { court: result.rows[0], isNew: true };
  } finally {
    client.release();
  }
}

async function getDiscoveryStats(latitude, longitude, radius) {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT 
        sport_type,
        COUNT(*) as court_count,
        COUNT(CASE WHEN verification_status = 'verified' THEN 1 END) as verified_count,
        COUNT(CASE WHEN discovery_source = 'google_places' THEN 1 END) as discovered_count
      FROM courts 
      WHERE latitude IS NOT NULL 
      AND longitude IS NOT NULL
      AND (6371000 * acos(cos(radians($1)) * cos(radians(latitude)) * 
          cos(radians(longitude) - radians($2)) + sin(radians($1)) * 
          sin(radians(latitude)))) <= $3
      GROUP BY sport_type
    `, [latitude, longitude, radius]);
    
    return result.rows;
  } finally {
    client.release();
  }
}

// Admin: Get all court suggestions
router.get('/admin/suggestions', authenticateToken, requireModerator, async (req, res) => {
  const { status = 'pending', limit = 20, offset = 0 } = req.query;

  try {
    const suggestions = await getCourtSuggestions(status, parseInt(limit), parseInt(offset));
    const total = await getCourtSuggestionsCount(status);
    
    res.json({ 
      suggestions,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Error fetching court suggestions:', error);
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
});

// Admin: Review court suggestion (approve/reject)
router.patch('/admin/suggestions/:id', authenticateToken, requireModerator, async (req, res) => {
  const { id } = req.params;
  const { status, adminNotes, createCourt = false } = req.body;

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Status must be approved or rejected' });
  }

  try {
    // Get the suggestion first
    const suggestion = await getCourtSuggestionById(parseInt(id));
    if (!suggestion) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }

    // Update suggestion status
    const updatedSuggestion = await reviewCourtSuggestion(
      parseInt(id),
      status,
      adminNotes,
      req.moderator.id
    );

    // If approved and createCourt is true, create the actual court
    let newCourt = null;
    if (status === 'approved' && createCourt) {
      newCourt = await createCourtFromSuggestion(suggestion);
    }

    res.json({ 
      suggestion: updatedSuggestion,
      court: newCourt,
      message: `Suggestion ${status} successfully`
    });
  } catch (error) {
    console.error('Error reviewing court suggestion:', error);
    res.status(500).json({ error: 'Failed to review suggestion' });
  }
});

// Admin: Get suggestion details
router.get('/admin/suggestions/:id', authenticateToken, requireModerator, async (req, res) => {
  const { id } = req.params;

  try {
    const suggestion = await getCourtSuggestionById(parseInt(id));
    
    if (!suggestion) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }
    
    res.json({ suggestion });
  } catch (error) {
    console.error('Error fetching suggestion details:', error);
    res.status(500).json({ error: 'Failed to fetch suggestion details' });
  }
});

// Admin helper functions for suggestions

async function getCourtSuggestions(status, limit, offset) {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT cs.*, 
             u.username as suggested_by_username,
             u.email as suggested_by_email,
             admin.username as reviewed_by_username
      FROM court_suggestions cs
      JOIN users u ON cs.suggested_by = u.id
      LEFT JOIN users admin ON cs.reviewed_by = admin.id
      WHERE cs.status = $1
      ORDER BY cs.created_at DESC
      LIMIT $2 OFFSET $3
    `, [status, limit, offset]);
    
    return result.rows;
  } finally {
    client.release();
  }
}

async function getCourtSuggestionsCount(status) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT COUNT(*) FROM court_suggestions WHERE status = $1',
      [status]
    );
    return parseInt(result.rows[0].count);
  } finally {
    client.release();
  }
}

async function getCourtSuggestionById(id) {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT cs.*, 
             u.username as suggested_by_username,
             u.email as suggested_by_email,
             admin.username as reviewed_by_username
      FROM court_suggestions cs
      JOIN users u ON cs.suggested_by = u.id
      LEFT JOIN users admin ON cs.reviewed_by = admin.id
      WHERE cs.id = $1
    `, [id]);
    
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

async function reviewCourtSuggestion(id, status, adminNotes, reviewedBy) {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      UPDATE court_suggestions 
      SET status = $2, admin_notes = $3, reviewed_by = $4, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [id, status, adminNotes, reviewedBy]);
    
    return result.rows[0];
  } finally {
    client.release();
  }
}

async function createCourtFromSuggestion(suggestion) {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      INSERT INTO courts (
        name, sport_type, address, latitude, longitude,
        lat, lng, verification_status, discovery_source,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', 'user_suggestion', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      suggestion.name,
      suggestion.sport_type,
      suggestion.address,
      suggestion.latitude,
      suggestion.longitude,
      suggestion.latitude, // for lat column
      suggestion.longitude  // for lng column
    ]);
    
    return result.rows[0];
  } finally {
    client.release();
  }
}

module.exports = router;