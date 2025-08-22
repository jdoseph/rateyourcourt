const Queue = require('bull');
const { Pool } = require('pg');
const googlePlacesService = require('../services/googlePlacesService');
const { ALLOWED_SPORTS } = require('../constants');

// Initialize PostgreSQL pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Create Bull queue for court discovery jobs
// Configure Redis connection for Bull queue
let redisConfig;
if (process.env.REDIS_URL) {
  // Use Redis URL for Bull queue
  console.log('🔧 Using REDIS_URL for Bull queue connection');
  redisConfig = process.env.REDIS_URL;
} else {
  // Fallback to individual config
  console.log('🔧 Using individual Redis config for Bull queue');
  redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined
  };
}

const courtDiscoveryQueue = new Queue('court discovery', {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 50, // Keep last 50 completed jobs
    removeOnFail: 20, // Keep last 20 failed jobs
  }
});

// Job processor for court discovery
courtDiscoveryQueue.process('discover-popular-area', async (job) => {
  const { latitude, longitude, radius, sportType, priority = 'normal' } = job.data;
  
  console.log(`🔍 Processing discovery job for ${sportType} courts at ${latitude}, ${longitude} (radius: ${radius}m)`);
  
  try {
    // Update job progress
    await job.progress(10);
    
    // Check if we've already searched this area recently (within 7 days)
    const existingSearch = await checkRecentSearch(latitude, longitude, radius, sportType);
    if (existingSearch) {
      console.log(`⏭️ Skipping recent search area: ${latitude}, ${longitude}`);
      await job.progress(100);
      return {
        status: 'skipped',
        reason: 'recently_searched',
        last_searched: existingSearch.last_discovered,
        courts_found: existingSearch.total_found || 0
      };
    }
    
    await job.progress(25);
    
    // Record the search area as in progress
    await recordSearchArea(latitude, longitude, radius, sportType);
    
    await job.progress(40);
    
    // Search for courts using Google Places API
    console.log(`🔍 Starting Google Places search for ${sportType} courts...`);
    const discoveredCourts = await googlePlacesService.searchCourts(latitude, longitude, radius, sportType);
    console.log(`📊 Google Places returned ${discoveredCourts.length} courts`);
    
    await job.progress(60);
    
    // Process and save discovered courts
    const savedCourts = [];
    let newCourts = 0;
    let duplicates = 0;
    const systemUserId = '00000000-0000-0000-0000-000000000000'; // System user ID for background jobs
    
    console.log(`💾 Processing ${discoveredCourts.length} discovered courts for database saving...`);
    for (const [index, courtData] of discoveredCourts.entries()) {
      try {
        console.log(`📝 Saving court ${index + 1}/${discoveredCourts.length}: ${courtData.name}`);
        const savedCourt = await saveDiscoveredCourt(courtData, systemUserId);
        if (savedCourt.isNew) {
          newCourts++;
          console.log(`✅ Saved new court: ${courtData.name}`);
        } else {
          duplicates++;
          console.log(`🔄 Found existing court: ${courtData.name}`);
        }
        savedCourts.push(savedCourt.court);
        
        // Update progress incrementally
        const progress = 60 + Math.round((index + 1) / discoveredCourts.length * 30);
        await job.progress(progress);
      } catch (error) {
        console.error(`❌ Error saving court ${courtData.name}:`, error);
        continue;
      }
    }
    
    console.log(`🏁 Background job complete: ${savedCourts.length} courts processed (${newCourts} new, ${duplicates} duplicates)`);
    
    // Update search area status
    await updateSearchArea(latitude, longitude, radius, sportType, savedCourts.length);
    
    await job.progress(100);
    
    return {
      status: 'completed',
      courts_processed: savedCourts.length,
      new_courts: newCourts,
      duplicates: duplicates,
      search_area: { latitude, longitude, radius, sportType }
    };
    
  } catch (error) {
    console.error('❌ Background discovery job failed:', error);
    
    // Update search area status to failed
    try {
      await updateSearchArea(latitude, longitude, radius, sportType, 0);
    } catch (updateError) {
      console.error('Failed to update search area status:', updateError);
    }
    
    throw error; // Re-throw to mark job as failed
  }
});

// Helper functions (reusing logic from discovery.js)

async function checkRecentSearch(latitude, longitude, radius, sportType) {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT * FROM discovery_areas 
      WHERE latitude = $1 
      AND longitude = $2 
      AND radius = $3 
      AND sport_type = $4
      AND last_discovered > NOW() - INTERVAL '7 days'
      ORDER BY last_discovered DESC 
      LIMIT 1
    `, [latitude, longitude, radius, sportType]);
    
    return result.rows[0] || null;
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

// Job event listeners for monitoring
courtDiscoveryQueue.on('completed', (job, result) => {
  console.log(`✅ Discovery job ${job.id} completed:`, result);
});

courtDiscoveryQueue.on('failed', (job, err) => {
  console.error(`❌ Discovery job ${job.id} failed:`, err.message);
});

courtDiscoveryQueue.on('stalled', (job) => {
  console.warn(`⚠️ Discovery job ${job.id} stalled`);
});

module.exports = {
  courtDiscoveryQueue,
  
  // Helper function to add jobs to the queue
  async addDiscoveryJob(latitude, longitude, radius = 5000, sportType = 'Tennis', priority = 'normal') {
    const jobData = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      radius: parseInt(radius),
      sportType,
      priority
    };
    
    const jobOptions = {
      priority: priority === 'high' ? 1 : priority === 'low' ? 10 : 5,
      delay: priority === 'low' ? 60000 : 0, // Low priority jobs wait 1 minute
    };
    
    const job = await courtDiscoveryQueue.add('discover-popular-area', jobData, jobOptions);
    console.log(`📋 Added discovery job ${job.id} for ${sportType} courts at ${latitude}, ${longitude}`);
    
    return job;
  }
};