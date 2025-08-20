const express = require('express');
const router = express.Router();
const pool = require('../db'); // your pg pool
const authenticateToken = require('../middleware/auth'); // your JWT middleware
const { ALLOWED_SPORTS } = require('../constants');

// POST /api/courts  (protected)
router.post('/', authenticateToken, async (req, res) => {
  const { name, address, lat, lng, surface_type, lighting, court_count, sport_type } = req.body;
  const created_by = req.user.id; // also move here to catch scope

  try {
    if (!name || lat == null || lng == null || !sport_type) {
      return res.status(400).json({ error: 'name, lat, lng, sport_type are required' });
    }
    if (!ALLOWED_SPORTS.includes(String(sport_type).toLowerCase())) {
      return res.status(400).json({ error: 'Invalid sport_type' });
    }

    const result = await pool.query(
      `INSERT INTO public.courts
      (name, address, lat, lng, surface_type, lighting, court_count, sport_type, created_by)
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
        sport_type.toLowerCase(),
        created_by
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('POST /api/courts error:', err);
    console.log('Inserting court:', {
      name, address, lat, lng, surface_type, lighting, court_count, sport_type, created_by
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

// GET /api/courts?sport_type=pickleball (legacy endpoint)
router.get('/', async (req, res) => {
  try {
    const { sport_type } = req.query;

    const baseSql = `
      SELECT c.*,
             COALESCE(AVG(r.rating),0) as average_rating,
             COUNT(r.id) as review_count
      FROM courts c
      LEFT JOIN reviews r ON c.id = r.court_id
    `;

    const where = sport_type ? 'WHERE LOWER(c.sport_type) = LOWER($1)' : '';
    const groupOrder = 'GROUP BY c.id ORDER BY c.name';

    const params = sport_type ? [sport_type] : [];

    const result = await pool.query([baseSql, where, groupOrder].join(' '), params);
    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/courts error:', err);
    res.status(500).json({ error: 'Server error' });
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
      query += ` AND LOWER(sport_type) = LOWER($${paramIndex})`;
      params.push(sportType);
      paramIndex++;
    }
    
    if (searchTerm) {
      query += ` AND (
        LOWER(name) LIKE LOWER($${paramIndex}) 
        OR LOWER(address) LIKE LOWER($${paramIndex})
      )`;
      params.push(`%${searchTerm}%`);
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