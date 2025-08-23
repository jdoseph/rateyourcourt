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

// Check for Railway-specific Redis URLs (in order of preference)
const redisUrl = process.env.REDIS_PUBLIC_URL || process.env.REDIS_URL;

if (redisUrl) {
  console.log('🔧 Using Redis URL for Bull queue connection');
  
  // Check if URL contains railway.internal (won't work externally)
  if (redisUrl.includes('railway.internal')) {
    console.log('🚨 Railway internal DNS detected - this will likely fail');
    console.log('💡 Try using REDIS_PUBLIC_URL instead of REDIS_URL in Railway');
    
    // For now, disable Redis and use fallback
    console.log('⚠️ Disabling Redis due to railway.internal DNS issue');
    redisConfig = null;
  } else {
    console.log('✅ Using Redis URL:', redisUrl);
    redisConfig = redisUrl;
  }
} else {
  console.log('⚠️ No Redis URL found - using localhost fallback for development');
  redisConfig = {
    host: 'localhost',
    port: 6379
  };
}

// Create queue with connection timeout and error handling
let courtDiscoveryQueue;
let queueReady = false;

// Only create queue if we have a valid Redis config
if (redisConfig) {
  try {
    courtDiscoveryQueue = new Queue('court discovery', {
      redis: redisConfig,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 50,
        removeOnFail: 20,
      }
    });

  // Connection event handlers
  courtDiscoveryQueue.on('ready', () => {
    console.log('✅ Bull queue ready and connected to Redis');
    queueReady = true;
  });

  courtDiscoveryQueue.on('error', (error) => {
    console.error('❌ Bull queue Redis error:', error.message);
    queueReady = false;
  });

  courtDiscoveryQueue.on('waiting', (jobId) => {
    console.log(`⏳ Job ${jobId} is waiting`);
  });

  courtDiscoveryQueue.on('active', (job) => {
    console.log(`🔄 Job ${job.id} started processing`);
  });

  // Test connection after a short delay
  setTimeout(async () => {
    try {
      await Promise.race([
        courtDiscoveryQueue.getWaiting(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Connection test timeout')), 5000))
      ]);
      console.log('✅ Bull queue connection test passed');
    } catch (error) {
      console.warn('⚠️ Bull queue connection test failed:', error.message);
      queueReady = false;
    }
  }, 2000);

  } catch (error) {
    console.error('❌ Failed to initialize Bull queue:', error.message);
    queueReady = false;
    courtDiscoveryQueue = null;
  }
} else {
  console.warn('⚠️ Redis disabled - using fallback job system');
  queueReady = false;
}

// Create a dummy queue object to prevent errors if queue is not initialized
if (!courtDiscoveryQueue) {
  console.warn('⚠️ Creating mock queue object - Redis not available');
  courtDiscoveryQueue = {
    getWaiting: () => Promise.resolve([]),
    getActive: () => Promise.resolve([]),
    getCompleted: () => Promise.resolve([]),
    getFailed: () => Promise.resolve([]),
    getDelayed: () => Promise.resolve([]),
    getJob: () => Promise.resolve(null),
    clean: () => Promise.resolve(0),
    add: () => Promise.resolve({ id: `mock-${Date.now()}` }),
    process: () => {},
    on: () => {}
  };
} else if (courtDiscoveryQueue.add) {
  console.log('✅ Real Bull queue initialized and available for jobs');
}

// Job processor for court discovery (only if queue is properly initialized)
if (courtDiscoveryQueue && typeof courtDiscoveryQueue.process === 'function') {
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
} else {
  console.warn('⚠️ Bull queue not properly initialized - job processing disabled');
}

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
      delay: priority === 'low' ? 60000 : 0,
    };
    
    // Check if we have a real queue (not the mock fallback)
    if (!courtDiscoveryQueue || typeof courtDiscoveryQueue.add !== 'function' || courtDiscoveryQueue.add.toString().includes('mock')) {
      console.warn('⚠️ Using mock queue - Redis not available');
      return {
        id: `mock-${Date.now()}`,
        data: jobData,
        opts: jobOptions
      };
    }
    
    try {
      console.log(`🔄 Attempting to add discovery job to queue...`);
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Job creation timeout')), 5000);
      });
      
      const createJobPromise = courtDiscoveryQueue.add('discover-popular-area', jobData, jobOptions);
      const job = await Promise.race([createJobPromise, timeoutPromise]);
      
      console.log(`📋 Successfully added discovery job ${job.id} for ${sportType} courts at ${latitude}, ${longitude}`);
      return job;
    } catch (error) {
      console.error(`❌ Failed to add discovery job: ${error.message}`);
      
      // Return mock job on any failure
      console.warn('🔄 Falling back to mock job due to error');
      return {
        id: `mock-${Date.now()}`,
        data: jobData,
        opts: jobOptions
      };
    }
  },

  // Helper to check if queue is ready
  isQueueReady() {
    return queueReady && courtDiscoveryQueue;
  }
};