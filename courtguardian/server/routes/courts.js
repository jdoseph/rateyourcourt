const express = require('express');
const router = express.Router();
const pool = require('../db'); // your pg pool
const authenticateToken = require('../middleware/auth'); // your JWT middleware
const { ALLOWED_SPORTS } = require('../constants');

// POST /api/courts  (protected)
router.post('/', authenticateToken, async (req, res) => {
  const { name, address, lat, lng, surface_type, lighting, court_count, sport_types } = req.body;
  const created_by = req.user.id; // also move here to catch scope

  try {
    if (!name || lat == null || lng == null || !sport_types || !Array.isArray(sport_types)) {
      return res.status(400).json({ error: 'name, lat, lng, sport_types (array) are required' });
    }
    
    // Validate all sport types
    for (const sport of sport_types) {
      if (!ALLOWED_SPORTS.includes(String(sport))) {
        return res.status(400).json({ error: `Invalid sport type: ${sport}` });
      }
    }

    const result = await pool.query(
      `INSERT INTO public.courts
      (name, address, lat, lng, surface_type, lighting, court_count, sport_types, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
      [
        name,
        address || null,
        Number(lat),
        Number(lng),
        surface_type || null,
        lighting === true || lighting === 'true',
        court_count ? Number(court_count) : null,
        sport_types,
        created_by
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('POST /api/courts error:', err);
    console.log('Inserting court:', {
      name, address, lat, lng, surface_type, lighting, court_count, sport_types, created_by
    });    
    res.status(500).json({ error: 'Server error' });
  }
});


// Search courts by location and filters (public endpoint)
router.get('/search', async (req, res) => {
  const { latitude, longitude, radius = 5000, sportType, searchTerm } = req.query;

  if (!latitude || !longitude) {
    return res.status(400).json({ error: 'Latitude and longitude are required' });
  }

  try {
    const courts = await searchExistingCourts(
      parseFloat(latitude), 
      parseFloat(longitude), 
      parseInt(radius), 
      sportType,
      searchTerm
    );
    
    res.json({ 
      courts,
      stats: {
        total: courts.length,
        searchRadius: parseInt(radius)
      }
    });
  } catch (error) {
    console.error('Error searching courts:', error);
    res.status(500).json({ error: 'Failed to search courts' });
  }
});

// GET /api/courts?sport_type=pickleball&searchTerm=text (supports search)
router.get('/', async (req, res) => {
  const startTime = Date.now();
  try {
    const { sport_type, searchTerm, limit = 100 } = req.query;

    const baseSql = `
      SELECT c.*,
             COALESCE(AVG(r.rating),0) as average_rating,
             COUNT(r.id) as review_count
      FROM courts c
      LEFT JOIN reviews r ON c.id = r.court_id
    `;

    let whereConditions = [];
    const params = [];
    let paramIndex = 1;

    // Sport type filter
    if (sport_type) {
      whereConditions.push(`$${paramIndex} = ANY(c.sport_types)`);
      params.push(sport_type);
      paramIndex++;
    }

    // Search term filter (using same logic as search endpoint)
    if (searchTerm) {
      const searchWords = searchTerm.toLowerCase().split(/\s+/).filter(word => word.length > 0);
      if (searchWords.length > 0) {
        const searchConditions = searchWords.map((word, index) => {
          const paramNum = paramIndex + index;
          return `(LOWER(c.name) LIKE LOWER($${paramNum}) OR LOWER(c.address) LIKE LOWER($${paramNum}))`;
        }).join(' AND ');
        
        whereConditions.push(`(${searchConditions})`);
        
        // Add each word as a parameter with wildcards
        searchWords.forEach(word => {
          params.push(`%${word}%`);
        });
        paramIndex += searchWords.length;
      }
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    const groupOrder = `GROUP BY c.id ORDER BY c.name LIMIT ${parseInt(limit)}`;

    const fullQuery = [baseSql, whereClause, groupOrder].join(' ');
    console.log('Executing courts query:', fullQuery, 'with params:', params);
    const result = await pool.query(fullQuery, params);
    const executionTime = Date.now() - startTime;
    console.log(`Courts query completed in ${executionTime}ms, returned ${result.rows.length} rows`);
    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/courts error:', err);
    console.error('Error details:', err.message);
    console.error('Stack trace:', err.stack);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});


// Suggest a new court (requires authentication)
router.post('/suggest', authenticateToken, async (req, res) => {
  const { name, address, sportType, latitude, longitude, description, contactInfo } = req.body;

  // Validation
  if (!name || !address || !sportType) {
    return res.status(400).json({ 
      error: 'Name, address, and sport type are required' 
    });
  }

  if (!ALLOWED_SPORTS.includes(sportType)) {
    return res.status(400).json({ error: 'Invalid sport type' });
  }

  try {
    const suggestion = await createCourtSuggestion({
      name,
      address,
      sportType,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      description,
      contactInfo,
      suggestedBy: req.user.id
    });

    res.status(201).json({ 
      message: 'Court suggestion submitted successfully',
      suggestion 
    });
  } catch (error) {
    console.error('Error creating court suggestion:', error);
    res.status(500).json({ error: 'Failed to submit court suggestion' });
  }
});

// Get user's court suggestions (requires authentication)
router.get('/suggestions/my', authenticateToken, async (req, res) => {
  try {
    const suggestions = await getUserSuggestions(req.user.id);
    res.json({ suggestions });
  } catch (error) {
    console.error('Error fetching user suggestions:', error);
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
});

// Helper functions

async function searchExistingCourts(latitude, longitude, radius, sportType, searchTerm) {
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
      AND verification_status IN ('verified', 'pending')
      AND (6371000 * acos(cos(radians($1)) * cos(radians(latitude)) * 
          cos(radians(longitude) - radians($2)) + sin(radians($1)) * 
          sin(radians(latitude)))) <= $3
    `;
    
    const params = [latitude, longitude, radius];
    let paramIndex = 4;
    
    if (sportType && ALLOWED_SPORTS.includes(sportType)) {
      // Use sport_types array
      query += ` AND $${paramIndex} = ANY(sport_types)`;
      params.push(sportType);
      paramIndex++;
    }
    
    if (searchTerm) {
      // Split search term into words for more flexible matching
      const searchWords = searchTerm.toLowerCase().split(/\s+/).filter(word => word.length > 0);
      if (searchWords.length > 0) {
        const searchConditions = searchWords.map((word, index) => {
          const paramNum = paramIndex + index;
          return `(LOWER(name) LIKE LOWER($${paramNum}) OR LOWER(address) LIKE LOWER($${paramNum}))`;
        }).join(' AND ');
        
        query += ` AND (${searchConditions})`;
        
        // Add each word as a parameter with wildcards
        searchWords.forEach(word => {
          params.push(`%${word}%`);
        });
      }
    }
    
    query += ' ORDER BY distance LIMIT 50';
    
    const result = await client.query(query, params);
    return result.rows;
  } finally {
    client.release();
  }
}

async function createCourtSuggestion(suggestionData) {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      INSERT INTO court_suggestions (
        name, address, sport_type, latitude, longitude, 
        description, contact_info, suggested_by, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      suggestionData.name,
      suggestionData.address,
      suggestionData.sportType,
      suggestionData.latitude,
      suggestionData.longitude,
      suggestionData.description,
      suggestionData.contactInfo,
      suggestionData.suggestedBy
    ]);
    
    return result.rows[0];
  } finally {
    client.release();
  }
}

async function getUserSuggestions(userId) {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT * FROM court_suggestions 
      WHERE suggested_by = $1 
      ORDER BY created_at DESC
    `, [userId]);
    
    return result.rows;
  } finally {
    client.release();
  }
}

// GET /api/courts/:id (must be last to avoid conflicts)
router.get('/:id', async (req, res) => {
  const id = req.params.id;
  
  // Validate UUID format (basic check)
  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    return res.status(400).json({ error: 'Invalid court id' });
  }

  try {
    const courtResult = await pool.query(
      `SELECT c.*, 
              COALESCE(AVG(r.rating), 0) AS average_rating, 
              COUNT(r.id) AS review_count
       FROM courts c
       LEFT JOIN reviews r ON c.id = r.court_id
       WHERE c.id = $1
       GROUP BY c.id`,
      [id]
    );

    if (courtResult.rows.length === 0)
      return res.status(404).json({ error: 'Court not found' });

    res.json(courtResult.rows[0]);
  } catch (err) {
    console.error('GET /api/courts/:id error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mount reviews routes as nested routes
const reviewsRoutes = require('./reviews');
router.use('/:courtId/reviews', reviewsRoutes);

module.exports = router;